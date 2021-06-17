
//var crypto = require('crypto'); // for making match name/Password

const config = require('./config.js');

const MAX_CONCURRENT_MATCHES = 70; // used when creating match name/password, in order to keep users from having to use a very large match name/password later on

const NONE_VOTE = 0;
const CAPTAIN_VOTE = 1;
const RANDOM_VOTE = 2;
const BALANCED_VOTE = 3;

// team 0 = blue
// team 1 = orange

function Match(playerList, matchId, matchTeamSize, rated) {

    if(!(this instanceof Match)) {
        return new Match(playerList, matchId, matchTeamSize);
    }

    this.players = playerList; // list of players
    this.id = matchId;
    this.timestamp = Date.now(); // match creation timestamp
    this.teams=[[],[]]
    this.captains=[null, null];
    this.votes = {};
    this.playerCancelVotes = {};
    this.balancedVotes = 0;
    this.cancelVotes = 0;
    this.captainVotes = 0;
    this.randomVotes = 0;
    this.teamSize = matchTeamSize;
    this.started = false;
    this.ended = false;
    this.reported = false;
    this.canceled = false;
    this.pickingTeams = false;
    this.name = "";
    this.password = "";
    this.playerPickList = null;
    this.voiceChannels = [null, null];
    this.winningTeam = -1; // for use in querying past match results
    this.timer = null;
    this.rated = rated; // False means Universal queue matches which are "unrated" (match results do not affect MMR). True means rated match within a specific tier
};

Match.prototype.addVoteForBalanced = function addVoteForBalanced(userId) {
    if(userId in this.votes)
        return false;
    this.votes[userId] = BALANCED_VOTE;
    this.balancedVotes++;
    return true;
}

Match.prototype.addVoteForCaptains = function addVoteForCaptains(userId) {
    if(userId in this.votes)
        return false;
    this.votes[userId] = CAPTAIN_VOTE;
    this.captainVotes++;
    return true;

}

Match.prototype.addVoteForRandom = function addVoteForRandom(userId) {
    if(userId in this.votes)
        return false;
    this.votes[userId] = RANDOM_VOTE;
    this.randomVotes++;
    return true;
}

Match.prototype.addVoteToCancel = function addVoteToCancel(userId) {
    if(userId in this.playerCancelVotes)
        return false;
    this.playerCancelVotes[userId] = 1;
    this.cancelVotes++;
    return true;
}

Match.prototype.cancel = function cancel(userId) {
    this.canceled = true;
    if(this.timer !== null) {
        clearTimeout(this.timer);
    }
}

Match.prototype.createBalancedteams = function createBalancedteams(playersByRank) {
    switch(this.teamSize) {
        case config.SIX_MANS_TEAM_SIZE:
            // team 1 is players ranked 0,2,5
            // team 2 is players ranked 1,3,4
            this.teams[0] = [playersByRank[0].player, playersByRank[2].player, playersByRank[5].player];
            this.teams[1] = [playersByRank[1].player, playersByRank[3].player, playersByRank[4].player];
            break;
        case config.FOUR_MANS_TEAM_SIZE:
            // team 1 is players ranked 0,3
            // team 2 is players ranked 1,2
            this.teams[0] = [playersByRank[0].player, playersByRank[3].player];
            this.teams[1] = [playersByRank[1].player, playersByRank[2].player];
            break;
        default:
            // ??? team size
    }
    this.started = true;
}

Match.prototype.createCaptains = function createCaptains(playersByRank) {
    // the top 2 players are captains
    this.captains[0] = playersByRank[0].player;
    this.captains[1] = playersByRank[1].player;
    this.playerPickList = playersByRank.slice(2);

    this.teams[0].push(this.captains[0]);
    this.teams[1].push(this.captains[1]);
}

Match.prototype.createRandomteams = function createRandomteams() {
    var players = this.players.slice();
    var nextTeamId = 0;

    while(players.length !== 0){
        var playerIndex = Math.floor((Math.random() * players.length));
        var player = players[playerIndex];
        players.splice(playerIndex, 1);
        this.teams[nextTeamId].push(player);
        nextTeamId = (nextTeamId + 1) % 2;
    }
    this.started = true;
}

Match.prototype.getVotesString = function getVotesString() {
    return `>>> Votes for balanced: ${this.balancedVotes}
Votes for captains: ${this.captainVotes}
Votes for random: ${this.randomVotes}`;
}

Match.prototype.getHighestVote = function getHighestVote() {
    let highestVote = BALANCED_VOTE;
    if(this.randomVotes > this.balancedVotes) {
        highestVote = RANDOM_VOTE;
        if(this.captainVotes > this.randomVotes)
            highestVote = CAPTAIN_VOTE;
    }
    else if(this.captainVotes > this.balancedVotes)
        highestVote = CAPTAIN_VOTE;

    return highestVote;
};

Match.prototype.getMongoObject = function getMongoObject() {
    // returns object to be stored in mongoDB
    let o = {
        players: [], // list of player IDS
        id: this.id,
        timestamp: this.timestamp,
        teams: [[],[]], // 2-D array of player IDs
        captains: [null, null], // for each value, if not null, then it is captain ID
        votes: this.votes,
        cancelVotes: this.cancelVotes,
        teamSize: this.teamSize,
        reported: this.reported,
        canceled: this.canceled,
        name: this.name,
        password: this.password,
        winningTeam: this.winningTeam,
        rated: this.rated
    };
    for(p of this.players) {
        o.players.push({id:p.id});
    }
    for(p of this.teams[0]) {
        o.teams[0].push({id:p.id});
    }
    for(p of this.teams[1]) {
        o.teams[1].push({id:p.id});
    }
    if(this.captains[0] != null && this.captains[1] != null) {
        o.captains[0] = this.captains[0].id;
        o.captains[1] = this.captains[1].id;
    }
    return o;
}

Match.prototype.isUserInMatch = function isUserInMatch(userId) {
    for(p of this.players) {
        if(p.id == userId)
            return true;
    }
    return false;
};

Match.prototype.isVotingAllowed = function isVotingAllowed() {
    if(this.started || this.pickingTeams)
        return false;
    else
        return true;
};

Match.prototype.start = function start() {
    this.started = true;
    // for using hashed string as name/password
    //var digest = crypto.createHash('md5').update(this.id.toString()).digest('hex').slice(0,6);
    let s = 'man'+(this.id%MAX_CONCURRENT_MATCHES).toString();
    this.name = s;
    this.password = s;
    if(this.timer !== null) {
        clearTimeout(this.timer);
    }
};



module.exports = Match;
