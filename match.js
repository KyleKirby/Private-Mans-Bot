
//var crypto = require('crypto'); // for making match name/Password

const CAPTAIN_VOTE = 1;
const RANDOM_VOTE = 2;

function Match(playerList, matchId, matchTeamSize) {

    if(!(this instanceof Match)) {
        return new Match(playerList, matchId, matchTeamSize);
    }

    this.players = playerList; // list of players
    this.id = matchId;
    this.teams=[[],[]]
    this.captains=[null, null];
    this.votes = {};
    this.randomVotes = 0;
    this.captainVotes = 0;
    this.cancelVotes = 0;
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
};

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

Match.prototype.createCaptains = function createCaptains(userMatchStats) {
    // TODO may need to adjust this if/when player ranking changes
    // try to order players by rank, the top 2 players are captains
    let playersByWinRate = [];
    for(p of this.players) {
        var winRate;
        if(userMatchStats == null || p.id in userMatchStats)
            winRate = userMatchStats[p.id].wins/(userMatchStats[p.id].wins + userMatchStats[p.id].losses);
        else
            winRate = 0;

        let pTuple = {player: p, rate: winRate};

        // now insert the player into the array sorted by win rate
        if(playersByWinRate.length === 0) {
            // base case, array is empty
            playersByWinRate.push(pTuple);
        }
        else {
            var insertedPlayer = false;
            for(var i = 0; i < playersByWinRate.length; i++) {
                if(pTuple.rate > playersByWinRate[i].rate) {
                    playersByWinRate.splice(i, 0, pTuple);
                    insertedPlayer = true;
                    break;
                }
            }
            if(!insertedPlayer)
                playersByWinRate.push(pTuple);
        }
    }



    // all the players have been inserted into playersByWinRate
    // now select the captains (the top 2 players in this match)
    this.captains[0] = playersByWinRate[0].player;
    this.captains[1] = playersByWinRate[1].player;
    this.playerPickList = playersByWinRate.slice(2);

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

Match.prototype.start = function start() {
    this.started = true;
    // for using hashed string as name/password
    //var digest = crypto.createHash('md5').update(this.id.toString()).digest('hex').slice(0,6);
    let s = 'man'+this.id.toString();
    this.name = s;
    this.password = s;
    if(this.timer !== null) {
        clearTimeout(this.timer);
    }
};

Match.prototype.isUserInMatch = function isUserInMatch(userId) {
    for(p of this.players) {
        if(p.id == userId)
            return true;
    }
    return false;
};

module.exports = Match;
