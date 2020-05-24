/*
TODO:

-track more stats?
    -goals?
    -user reporting?

*/

const config = require('./config.js');
const Match = require('./match');
const Player = require('./player');
const rating = require('./rating');

const mongo = require('mongodb');
const fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

// mongo db
var db = null;

function handleExit() {
    if(db != null) {
        db.close();
    }
}

process.on('exit', handleExit);

function handleDataBaseError(dberr, logMessage, exitProcess) {
    console.error(dberr);
    if(exitProcess) {
        try {
            const data = fs.writeFileSync('log.txt', logMessage, { flag: 'a+'});
        }
        catch(err) {
            console.error(err);
        }
        process.exit();
    }
    else {
        try {
            const data = fs.writeFile('log.txt', logMessage, { flag: 'a+'}, (err) => {
                if(err) throw err;
            });
        }
        catch(err) {
            console.error(err);
        }
    }

}

const CAPTAIN_VOTE = 1;
const RANDOM_VOTE = 2;
const BALANCED_VOTE = 3;

var userCommandPrefix = '.';

var queue = []; // standard queue

var queueFour = []; // doubles queue

var queueTwo = []; // solo duel queue

var nextMatchId = 0;
const MAX_MATCH_ID = Number.MAX_SAFE_INTEGER; // match id will wrap to 0 upon reaching this value, so this is also the max concurrent matches
var matches = {}; // map match id to match object
var membersInMatches = {}; // map user id to match id

try{
    const mongoOptions = { useUnifiedTopology: true };
    MongoClient.connect(url, mongoOptions, function(err, mdb) {
      if (err) throw err;
      db = mdb.db('sixMans');

      // load config
      db.collection('config').findOne({}, (err, dbConf) => {
          if(err) {
              handleDataBaseError(err, `Error loading config from mongoDB\n`, false);
          }
          else {
              if(dbConf != null) {
                  // load config
                  if('commandPrefix' in dbConf) {
                      userCommandPrefix = dbConf.commandPrefix;
                  }
                  if('nextMatchId' in dbConf) {
                      nextMatchId = dbConf.nextMatchId;
                  }
              }
              else {
                  // write current config and use that from now on
                  db.collection('config').insertOne({commandPrefix: userCommandPrefix, nextMatchId: nextMatchId}, (err, res) => {
                      if(err) {
                          handleDataBaseError(err, `Error updating config in mongoDB\n`, false);
                      }
                  });
              }
          }
      });
    });
}
catch(err) {
    handleDataBaseError(err, 'Error opening mongo db\n', true);
}



module.exports = {
    handleUserCommand: function(client, msg) {
        if(msg.channel.type === 'dm')
            // for now, ignore commands from DM channel
            return;
        msg.content = msg.content.toLowerCase();
        //msg.channel.send(`received user command '${msg.content}'`);
        let command = msg.content.split(' ')[0]; // let the command be the first word in the user message
        //console.log(`received user command '${s}'`);
        switch(command) {
            case 'b':
            case 'balanced':
            voteForBalancedTeams(msg);
            break;

            case 'c':
            case 'captains':
            voteForCaptains(msg);
            break;

            case 'cancel':
            cancelMatch(msg);
            break;

            case 'clear':
            clearQueue(msg);
            break;

            case 'cf':
            case 'coinflip':
            case 'flip':
            flipCoin(msg);
            break;

            case 'help':
            displayHelp(msg);
            break;

            case 'l':
            case 'leave':
            removeUserFromQueue(msg);
            break;

            case 'lb':
            case 'leaderboard':
            showLeaderboard(msg);
            break;

            case 'matches':
            showMatches(msg);
            break;

            case 'new':
            newCommand(msg);
            break;


            case '1':
            addToSoloDuelQueue(msg);
            break;

            case '2':
            addToDoublesQueue(msg);
            break;

            case '3':
            addToStandardQueue(msg);
            break;

            case 'r':
            case 'random':
            voteForRandomTeams(msg);
            break;

            case 'report':
            reportMatchResult(msg);
            break;

            case 'set':
            setCommand(msg);
            break;

            case 's':
            case 'status':
            showQueueStatus(msg);
            break;

            case 'undo':
            undoMatchResult(msg);
            break;

            default:
            // did not match any supported commands
        }
    }
};

module.exports.getCommandPrefix = function() {
    return userCommandPrefix;
}

function addToDoublesQueue(msg) {
    if(msg.member.id in membersInMatches) {
        // user is already in a match, ignore
        return;
    }
    for (m of queue) {
        if(m.id === msg.member.id)
        {
            // member is already in queue
            return;
        }
    }
    for (m of queueFour) {
        if(m.id === msg.member.id)
        {
            // member is already in queue
            return;
        }
    }
    for (m of queueTwo) {
        if(m.id === msg.member.id)
        {
            // member is already in queue
            return;
        }
    }

    queueFour.push(msg.member);
    var s = `>>> Added <@${msg.member.id}> to the doubles queue.
Users in queue: ${queueFourString()}\n`;

    if(queueFour.length === config.FOUR_MANS_MAX_QUEUE_SIZE) {
        // the queue is filled!
        // now we need to make teams
        createMatch(msg, config.FOUR_MANS_TEAM_SIZE);
        s += `Match is ready to start.
Enter ${userCommandPrefix}b or ${userCommandPrefix}balanced to vote for balanced teams.
Enter ${userCommandPrefix}r or ${userCommandPrefix}random to vote for random teams.
Enter ${userCommandPrefix}c or ${userCommandPrefix}captains to vote to have captains pick teams.
The match will be started with the highest vote if 2 minutes have elapsed without any option reaching 2 votes.`;
    }
    msg.channel.send(s);
}

function addToSoloDuelQueue(msg) {
    if(msg.member.id in membersInMatches) {
        // user is already in a match, ignore
        return;
    }

    for (m of queue) {
        if(m.id === msg.member.id)
        {
            // member is already in queue
            return;
        }
    }
    for (m of queueFour) {
        if(m.id === msg.member.id)
        {
            // member is already in queue
            return;
        }
    }
    for (m of queueTwo) {
        if(m.id === msg.member.id)
        {
            // member is already in queue
            return;
        }
    }

    queueTwo.push(msg.member);
    var s = `>>> Added <@${msg.member.id}> to the solo duel queue.
Users in queue: ${queueTwoString()}\n`;

    if(queueTwo.length === config.TWO_MANS_MAX_QUEUE_SIZE) {
        // the queue is filled!
        let match = createMatch(msg, config.TWO_MANS_TEAM_SIZE);
        s += `Match is ready to start.`;
        msg.channel.send(s);
        match.teams[0].push(match.players[0]);
        match.teams[1].push(match.players[1]);

        startMatch(msg, match);
    }
    else
        msg.channel.send(s);
}

function addToStandardQueue(msg) {
    if(msg.member.id in membersInMatches) {
        // user is already in a match, ignore
        return;
    }
    for (m of queue) {
        if(m.id === msg.member.id)
        {
            // member is already in queue
            return;
        }
    }
    for (m of queueFour) {
        if(m.id === msg.member.id)
        {
            // member is already in queue
            return;
        }
    }
    for (m of queueTwo) {
        if(m.id === msg.member.id)
        {
            // member is already in queue
            return;
        }
    }

    queue.push(msg.member);
    var s = `>>> Added <@${msg.member.id}> to the standard queue.
Users in queue: ${queueString()}\n`;

    if(queue.length === config.SIX_MANS_MAX_QUEUE_SIZE) {
        // the queue is filled!
        // now we need to make teams
        createMatch(msg, config.SIX_MANS_TEAM_SIZE);
        s += `Match is ready to start.
Enter ${userCommandPrefix}b or ${userCommandPrefix}balanced to vote for balanced teams.
Enter ${userCommandPrefix}r or ${userCommandPrefix}random to vote for random teams.
Enter ${userCommandPrefix}c or ${userCommandPrefix}captains to vote to have captains pick teams.
The match will be started with the highest vote if 2 minutes have elapsed without any option reaching 3 votes.`;
    }
    msg.channel.send(s);
}

function cancelMatch(msg) {
    // TODO
    let match = getUserMatch(msg.member.id);
    if(match == null)
        return; // user is not in a match, ignore

    let isMatchCanceled = false;
    if(match.addVoteToCancel(msg.member.id)) {
        let s = `>>> Match ID ${match.id} votes to cancel: ${match.cancelVotes}\n`;
        switch(match.teamSize) {
            case config.SIX_MANS_TEAM_SIZE:
                // require 3 players
                if(match.cancelVotes > config.SIX_MANS_MIN_VOTE_COUNT) {
                    s += "Canceling match.";
                    isMatchCanceled = true;
                }
                break;

            case config.FOUR_MANS_TEAM_SIZE:
                // require 2 players
                if(match.cancelVotes > config.FOUR_MANS_MIN_VOTE_COUNT) {
                    s += "Canceling match.";
                    isMatchCanceled = true;
                }
                break;
            default:
                // 1v1 match, require both players
                if(match.cancelVotes == 2) {
                    s += "Canceling match.";
                    isMatchCanceled = true;
                }
        }
        if(isMatchCanceled) {
            match.cancel();
            endMatch(msg, match);

            // since the match was canceled, the player gained 0 MMR for this match, need update matchRatingChange for this match
            for(p of match.players) {
                let query = {_id: p.id};

                var matchType;
                switch(match.teamSize) {
                    /*
                    case config.SIX_MANS_TEAM_SIZE:
                        matchType = Player.SIX_MANS_PROPERTY;
                        break;
                    */
                    case config.FOUR_MANS_TEAM_SIZE:
                        matchType = Player.FOUR_MANS_PROPERTY;
                        break;

                    case config.TWO_MANS_TEAM_SIZE:
                        matchType = Player.TWO_MANS_PROPERTY;
                        break;
                    default:
                        matchType = Player.SIX_MANS_PROPERTY;
                }

                let update = {};
                update[`stats.${matchType}.matchRatingChange.${match.timestamp}`] = 0;

                db.collection('players').updateOne(query, {$set: update}, (err, res) => {
                    if(err) {
                        handleDataBaseError(err, 'Error updating player in players collection\n', false);
                    }
                });

            }
        }
        msg.channel.send(s);
    }


}

function clearQueue(msg) {
    if(msg.member.roles.cache.has(config.SIX_MANS_ROLE) === false) {
        // user does not have sufficient permissions for this command
        return;
    }
    let args = msg.content.split(' ');
    if(args.length === 1 || (args.length === 2 && args[1] === '3')) {
        // clearing standard queue
        if(queue.length > 0) {
            queue = [];
            msg.channel.send(`>>> Cleared standard queue.`);
        }
        else {
            msg.channel.send(`>>> Standard queue is already empty.`);
        }

    }
    else if(args.length === 2 && args[1] === '2') {
        // clearing doubles queue
        if(queueFour.length > 0) {
            queueFour = [];
            msg.channel.send(`>>> Cleared doubles queue.`);
        }
        else {
            msg.channel.send(`>>> Doubles queue is already empty.`);
        }
    }
    else if(args.length === 2 && args[1] === '1') {
        // clearing solo duel queue
        if(queueTwo.length > 0) {
            queueTwo = [];
            msg.channel.send(`>>> Cleared solo duel queue.`);
        }
        else {
            msg.channel.send(`>>> Solo duel queue is already empty.`);
        }
    }
    else if(args.length === 2 && args[1] === 'all') {
        if(queue.length === 0 && queueFour.length === 0 && queueTwo.length === 0) {
            msg.channel.send(`>>> All queues are already empty.`);
        }
        else {
            let s = '>>> ';
            // clearing standard queue
            if(queue.length > 0) {
                queue = [];
                s += `Cleared standard queue.\n`;
            }
            // clearing doubles queue
            if(queueFour.length > 0) {
                queueFour = [];
                s += `Cleared doubles queue.\n`;
            }
            // clearing solo duel queue
            if(queueTwo.length > 0) {
                queueTwo = [];
                s += `Cleared solo duel queue.\n`;
            }
            msg.channel.send(s);
        }
    }
}

function createMatch(msg, teamSize) {
    var match;
    switch(teamSize) {
        case config.SIX_MANS_TEAM_SIZE:
            match = Match(queue, nextMatchId, teamSize);
            queue = [];
            break;

        case config.FOUR_MANS_TEAM_SIZE:
            match = Match(queueFour, nextMatchId, teamSize);
            queueFour = [];
            break;

        case config.TWO_MANS_TEAM_SIZE:
            match = Match(queueTwo, nextMatchId, teamSize);
            queueTwo = [];
            break;
        default:
            // ??? match type
    }

    for (const user of match.players) {
        membersInMatches[user.id] = match.id;

        // add a document for this player if it does not already exist
        let query = {_id: user.id};
        db.collection('players').findOne(query, (err, result) => {
            if(err) {
                handleDataBaseError(err, `Error finding member ID ${user.id} in players collection\n`, false);
            }
            else {
                if(result == null) {
                    // did not find player in database, need to insert document for that player in the players collection
                    let o = Player.Player(user);
                    db.collection('players').insertOne(o, (err, res) => {
                        if(err) {
                            handleDataBaseError(err, 'Error inserting player\n', false);
                        }
                    });
                }
            }
        });
    }

    matches[match.id] = match;
    nextMatchId = (nextMatchId + 1) % MAX_MATCH_ID;

    // TODO change to findAndModify
    db.collection('config').findOne({}, (err, dbConf) => {
        if(err) {
            handleDataBaseError(err, `Error loading config from mongoDB\n`, false);
        }
        else {
            if(dbConf != null) {
                // need to update config
                db.collection('config').updateOne({}, {$set: {nextMatchId: nextMatchId}}, (err, res) => {
                    if(err) {
                        handleDataBaseError(err, `Error updating config in mongoDB\n`, false);
                    }
                });
            }
        }
    });

    // start 2 minute timer to allow players to vote on teams
    match.timer = setTimeout (() => {
        // handle timeout here
        msg.channel.send(`>>> Voting for Match ID ${match.id} has timed out.`);
        let highestVote = match.getHighestVote();
        switch(highestVote) {
            case RANDOM_VOTE:
                msg.channel.send(`>>> Match ID ${match.id} creating random teams.`);
                startRandomMatch(msg, match);
                break;
            case CAPTAIN_VOTE:
                msg.channel.send(`>>> Match ID ${match.id} creating captains to pick teams.`);
                startCaptainsMatch(msg, match);
                break;
            default:
                // balanced match
                msg.channel.send(`>>> Match ID ${match.id} creating balanced teams.`);
                startBalancedMatch(msg, match);
        }
    }, 120000);
    return match;
}

function displayHelp(msg) {
    msg.channel.send(`Please see help at http://${config.serverIP}:${config.leaderboardPort}/help`).then().catch(console.error);
}

function endMatch(msg, match) {
    match.ended = true;

    if(match.started) {
        // if the match started, then voice channels were created
        msg.client.channels.fetch(config.QUEUE_CHANNEL).then(async queueChan => {
            for(p of match.teams[0]) {
                // move back to queue channel if player is still in team voice channel
                let m = await p.fetch();
                if(m.voice.channelID === match.voiceChannels[0].id)
                    await m.voice.setChannel(queueChan);
            }
            for(p of match.teams[1]) {
                // move back to queue channel if player is still in team voice channel
                let m = await p.fetch();
                if(m.voice.channelID === match.voiceChannels[1].id)
                    await m.voice.setChannel(queueChan);
            }
            msg.guild.channels.resolve(match.voiceChannels[0]).delete().then().catch(console.error);
            msg.guild.channels.resolve(match.voiceChannels[1]).delete().then().catch(console.error);
        })
        .catch(console.error);
    }

    db.collection('matches').insertOne(match.getMongoObject(), (err, res) => {
        if(err) {
            handleDataBaseError(err, 'Error inserting match in match collection\n', false);
        }
    });

    for(p of match.players) {
        let query = {_id: p.id};
        db.collection('players').findOne(query, (err, result) => {
            if(err) {
                handleDataBaseError(err, 'Error finding player in players collection\n', false);
            }
            else {
                if(result != null) {
                    // found player in db
                    var matchType;
                    switch(match.teamSize) {
                        /*
                        case config.SIX_MANS_TEAM_SIZE:
                            matchType = Player.SIX_MANS_PROPERTY;
                            break;
                        */
                        case config.FOUR_MANS_TEAM_SIZE:
                            matchType = Player.FOUR_MANS_PROPERTY;
                            break;

                        case config.TWO_MANS_TEAM_SIZE:
                            matchType = Player.TWO_MANS_PROPERTY;
                            break;
                        default:
                            matchType = Player.SIX_MANS_PROPERTY;
                    }

                    result.stats[matchType].matches[match.timestamp] = match.id; // add match timestamp/ID to player matches

                    let newMatchObject = {};
                    newMatchObject[`stats.${matchType}.matches`] = result.stats[matchType].matches;

                    db.collection('players').updateOne(query, {$set: newMatchObject}, (err, res) => {
                        if(err) {
                            handleDataBaseError(err, 'Error updating player in players collection\n', false);
                        }
                    });
                }
                // take no action here if player was not found (unexpected)
            }
        });
    }

    delete matches[match.id];
    for(player of match.players) {
        delete membersInMatches[player.id];
    }

}

function flipCoin(msg) {
    let coinSides = ['Orange', 'Blue'];

    const result = Math.floor(Math.random() * Math.floor(2)); // 0 or 1 value
    let args = msg.content.split(' ');
    if(args.length === 3) {
        // users may optionally provide additional arguments
        // first argument is the command, the second and third arguments are the two choices to flip between
        coinSides[0] = args[1];
        coinSides[1] = args[2];
    }
    msg.channel.send(`<@${msg.author.id}> ${coinSides[result]}`);

}

function getMemberTeamId(match, memberId) {
    for(let i = 0; i < 2; i++)
        for(m of match.teams[i]) {
            if(m.id === memberId)
                return i;
        }
    return -1; // member not in either team
}

function getNextStatObject(args, argIter) {
    // expecting args in the form of <match type> <wins> <losses>
    // argIter should be at <match type>

    // first make sure there are enough args
    if(args.length < argIter + 3) {
        // not enough args
        return null;
    }

    let stats = {};
    let key = '';


    // first get the match type
    let nextMatchType = args[argIter];
    argIter++;
    switch(nextMatchType) {
        case 'six':
            // need to set six mans stats
            key = 'six';
            break;

        case 'four':
            // need to set four mans stats
            key = 'four';
            break;

        case 'two':
            // need to set two mans stats
            key = 'two';
            break;
        default:
            // unrecognized key
            return null;
    }

    let wins = Number(args[argIter]);
    argIter++;

    let losses = Number(args[argIter]);
    argIter++;

    if(wins.isNaN || losses.isNaN) {
        // invalid input
        return null;
    }

    stats[key] = {wins: wins, losses: losses};

    return stats;
}

function getUserMatch(userId) {
    if(userId in membersInMatches) {
        return matches[membersInMatches[userId]];
    }
    else {
        return null;
    }


}

function messageCaptain(omsg, match, captainIndex) {
    if(match.ended) {
        // must have timed out
        return;
    }
    const filter = m => !(Number(m.content).isNaN);
    const options = {max: 1, time: 60000, errors: ["time"]};

    var playerIndex = 1;
    var s = ">>> Enter the number for the player you want to pick:\n";

    for(var i = 0; i < match.playerPickList.length; i++) {
        s += `${i+1}.  ${match.playerPickList[i].player.displayName}\n`;
    }

    match.captains[captainIndex].send(s).then(dmMessage => {
        dmMessage.channel.awaitMessages(filter, options)
        .then(collected => {
            // process message from user here
            if(collected.size === 0 && !match.ended){
                // did not receive message from captain
                // for now, resend the message...
                messageCaptain(omsg, match, captainIndex);
                return;
            }
            var msg = collected.first();
            var n = Number(msg.content);
            if(n < 1 || n > match.playerPickList.length && !match.ended) {
                // player did not enter a valid number, resend message...
                messageCaptain(omsg, match, captainIndex);
                return;
            }
            else {
                // a valid number was entered
                // add the player to the captain's team
                n--; // decrement so n is 0 based
                match.teams[captainIndex].push(match.playerPickList[n].player);
                // remove the player from the playerPickList
                match.playerPickList.splice(n, 1);
                // message the other captain if needed
                if(match.playerPickList.length > 1) {
                    /*
                    // choose which captain goes next based on game mode
                    if(match.teamSize == config.SIX_MANS_TEAM_SIZE) {
                        // captain 1 gets first pick
                        // captain 0 gets second and third picks
                        messageCaptain(omsg, match, 0);
                    }
                    else {
                        messageCaptain(omsg, match, (captainIndex + 1) % 2);
                    }
                    */
                    // flip flop between captains
                    messageCaptain(omsg, match, (captainIndex + 1) % 2);
                }
                else if(match.playerPickList.length === 1) {
                    // add the last player to the other captain's team
                    match.teams[(captainIndex + 1) % 2].push(match.playerPickList[0].player);
                    startMatch(omsg, match);
                }
                else // no players left
                    startMatch(omsg, match);
            }

        })
        .catch(console.error);
    })
    .catch(console.error);
}

function messageCaptains(msg, match) {
    // restart timer to allow captains to pick teams
    if(match.timer !== null) {
        clearTimeout(match.timer);
    }

    match.timer = setTimeout (() => {
        // handle timeout here
        msg.channel.send(`>>> Match ID ${match.id} has timed out. Canceling match.`);
        match.canceled = true;
        endMatch(msg, match);
    }, 120000);

    match.pickingTeams = true;
    msg.channel.send(`>>> Captains have been chosen.
Captain for team 1: <@${match.captains[0].id}>
Captain for team 2: <@${match.captains[1].id}>
Captains now have 2 minutes to pick teams.`);
    messageCaptain(msg, match, 1);
}

function newCommand(msg) {
    if(msg.member.roles.cache.has(config.SIX_MANS_ROLE) === false) {
        // user does not have sufficient permissions for this command
        return;
    }
    const args = msg.content.split(' '); // let the command be the first word in the user message
    if(args.length != 2) {
        return;
    }
    let arg = args[1];
    switch(arg) {
        case 'season':
            // start new season
            // this means resetting MMR, wins, losses to default value for all players
            db.collection('players').find({}).toArray((err, players) => {
                if(err) {
                    handleDataBaseError(err, 'Error retrieving player stats\n', false);
                    res.send("Could not retrieve player statistics. Please wait a minute and try again. If this problem persists, you may contact hubris#2390 on Discord.");
                }
                else {
                    for(p of players) {
                        let update = {};
                        update[`stats.${matchType}.wins`] = 0;
                        update[`stats.${matchType}.losses`] = 0;
                        update[`stats.${matchType}.rating`] = Player.STARTING_RATING;
                        update[`stats.${matchType}.lastRatingChange`] = 0;

                        const query = {_id: p._id};

                        try {
                            db.collection('players').updateOne(query, {$set: update});
                        }
                        catch (err) {
                            handleDataBaseError(err, 'Error updating player result\n', false);
                        }
                    }
                    msg.channel.send(`Resetting player stats for new season.`);
                }
            });
            break;
    }
}

async function orderPlayersByRank(players, teamSize) {
    var playerList = [];

    // first retrieve player stats
    for(p of players) {
        try{
            let result = await db.collection('players').findOne({_id: p.id});
            if(result == null) {
                // player does not exist in players collection
                let player = Player.Player(p);
                player.player = p;
                playerList.push(player);
            }
            else {
                // found this player in the players collection
                result.player = p;
                playerList.push(result);
            }
        }
        catch (err) {
            handleDataBaseError(err, `Error finding player in players collection\n`, false);
            let player = Player.Player(p);
            player.player = p;
            playerList.push(player);
        }
    }

    switch(teamSize) {
        case config.FOUR_MANS_TEAM_SIZE:
            playerList.sort(rankPlayersFour);
            break;
        case config.TWO_MANS_TEAM_SIZE:
            playerList.sort(rankPlayersTwo);
            break;
        default:
            playerList.sort(rankPlayersSix);
    }

    return playerList;
}

function queueFourString() {
    return userMentionString(queueFour);
}

function queueString() {
    return userMentionString(queue);
}

function queueTwoString() {
    return userMentionString(queueTwo);
}

function rankPlayersFour(p1,p2) {
    const matchType = Player.FOUR_MANS_PROPERTY;
    if (p1.stats[matchType].rating < p2.stats[matchType].rating) {
        return 1;
    }
    else if (p1.stats[matchType].rating > p2.stats[matchType].rating){
        return -1;
    }
    else
        return 0;
}

function rankPlayersSix(p1,p2) {
    const matchType = Player.SIX_MANS_PROPERTY;
    if (p1.stats[matchType].rating < p2.stats[matchType].rating) {
        return 1;
    }
    else if (p1.stats[matchType].rating > p2.stats[matchType].rating){
        return -1;
    }
    else
        return 0;
}

function rankPlayersTwo(p1,p2) {
    const matchType = Player.TWO_MANS_PROPERTY;
    if (p1.stats[matchType].rating < p2.stats[matchType].rating) {
        return 1;
    }
    else if (p1.stats[matchType].rating > p2.stats[matchType].rating){
        return -1;
    }
    else
        return 0;
}

function removeUserFromQueue(msg) {
    // find if the user is in queue, if they are in one them remove them
    let i = 0;
    for (m of queue) {
        if(m.id === msg.member.id)
        {
            // remove this member from the queue
            queue.splice(i, 1);
            var s = `>>> Removed <@${msg.member.id}> from the standard queue.\n`;
            if(queue.length > 0) {
                s += `Users in queue: ${queueString()}`;
            }
            else {
                s += `No users left in queue.`
            }
            msg.channel.send(s);
            return;
        }
        i++;
    }
    i = 0;
    for (m of queueFour) {
        if(m.id === msg.member.id)
        {
            // remove this member from the queue
            queueFour.splice(i, 1);
            var s = `>>> Removed <@${msg.member.id}> from the doubles queue.\n`;
            if(queueFour.length > 0) {
                s += `Users in queue: ${queueFourString()}`;
            }
            else {
                s += `No users left in queue.`
            }
            msg.channel.send(s);
            return;
        }
        i++;
    }
    i = 0;
    for (m of queueTwo) {
        if(m.id === msg.member.id)
        {
            // remove this member from the queue
            queueTwo.splice(i, 1);
            var s = `>>> Removed <@${msg.member.id}> from the solo duel queue.\n`;
            if(queueTwo.length > 0) {
                s += `Users in queue: ${queueTwoString()}`;
            }
            else {
                s += `No users left in queue.`
            }
            msg.channel.send(s);
            return;
        }
        i++;
    }
    // user was not in any queues
}

async function reportMatchResult(msg) {
    // remove match from matches object and remove users from membersInMatches object

    var match = null;
    var matchId = -1;
    var matchType;

    let args = msg.content.split(' ');
    if(args.length === 1) {
        // not enough args
        return;
    }

    var arg = args[1]; // first command parameter may be a match id or it may simply be 'win' or 'loss' if the user is currently in a match
    // check first command parameter
    switch(arg) {
        case 'win':
        case 'loss':
            if (msg.member.id in membersInMatches) {
                // this user is in a match
                matchId = membersInMatches[msg.member.id];
                match = matches[matchId];
            }
            else {
                return;
            }
            break;

        default:
            // check if valid match id
            matchId = Number(arg);
            if(matchId.isNaN) {
                // invalid parameter
                return;
            }

            // valid number, check if this is a valid match id
            if(matchId in matches && matches[matchId].isUserInMatch(msg.member.id)) {
                // this is a valid match id, the match has not be reported yet, and the user is in the match
                match = matches[matchId];
            }
            else {
                // check if there is a second parameter (this is required)
                if(args.length === 3) {
                    arg = args[2];
                }
                else {
                    // insufficient command parameters
                    return;
                }

                let userReportedOutcome = -1;

                const USER_REPORTED_WIN = 0;
                const USER_REPORTED_LOSS = 1;

                switch(arg) {
                    case 'win':
                    case 'w':
                        userReportedOutcome = USER_REPORTED_WIN;
                        break;
                    case 'loss':
                    case 'l':
                        userReportedOutcome = USER_REPORTED_LOSS;
                        break;
                    default:
                        // invalid arg given
                        return;
                }

                // see if this was a previously reported match that had its result undone in mongoDB
                const query = {id: matchId};
                try{
                    db.collection('matches').find(query).toArray(async (err, result) => {
                        if(err) throw err;
                        switch(result.length) {
                            case 0:
                                // did not find any matches
                                msg.channel.send(`>>> Did not find any matches with match ID ${matchId}.`);
                                break;
                            case 1:
                                // found exactly 1 match
                                match = result[0];

                                if(!match.reported && !match.canceled) {
                                    // need to report match results

                                    for (m of match.teams[0]) {
                                        m.displayName = '';
                                    }
                                    for (m of match.teams[1]) {
                                        m.displayName = '';
                                    }

                                    // find which team this user was on
                                    var teamId = getMemberTeamId(match, msg.member.id);
                                    var team0String, team1String;

                                    if(userReportedOutcome === USER_REPORTED_WIN){
                                        // this user's team won the match
                                        if(teamId === 0) {
                                            team0String = 'won';
                                            team1String = 'lost'
                                            match.winningTeam = 0;
                                        }
                                        else {
                                            team0String = 'lost';
                                            team1String = 'won'
                                            match.winningTeam = 1;
                                        }
                                        await reportResult(match);
                                    }
                                    else if(userReportedOutcome === USER_REPORTED_LOSS){
                                        // this user's team lost the match
                                        if(teamId === 0) {
                                            team0String = 'lost';
                                            team1String = 'won'
                                            match.winningTeam = 1;
                                        }
                                        else {
                                            team0String = 'won';
                                            team1String = 'lost'
                                            match.winningTeam = 0;
                                        }
                                        await reportResult(match);
                                    }
                                    else {
                                        msg.channel.send(`>>> Invalid command parameter "${arg}". Valid "report" parameters are "win" or "loss".`);
                                        return;
                                    }

                                    try{
                                        const queryUpdate = {id: match.id, timestamp: match.timestamp};
                                        const newValues = {$set: {winningTeam: match.winningTeam, reported: true}};
                                        db.collection('matches').updateOne(queryUpdate, newValues, (err, res) => {
                                            if(err)
                                                throw err;
                                            else {
                                                msg.channel.send(`>>> Match ID ${matchId} result:
Blue Team ${team0String}: ${userMentionString(match.teams[0])}
Orange Team ${team1String}: ${userMentionString(match.teams[1])}`);
                                            }

                                        });
                                    }
                                    catch(err) {
                                        handleDataBaseError(err, `Error updating match ID ${matchId} in matches collection\n`, false);
                                        msg.channel.send(`>>> An error occured while reporting match ID ${matchId}.`);
                                    }

                                }
                                else {
                                    msg.channel.send(`>>> Match ID ${matchId} has already been reported.`);
                                }
                                break;
                            default:
                                // found multiple matches, TODO
                                // this can be handled by opening a DM with the user and having them select a match
                                // may implement this later
                                msg.channel.send(`>>> Error: found multiple matches for match ID ${matchId}. Tell a developer to fix this.`);
                        }
                    });
                }
                catch(err) {
                    handleDataBaseError(err, `Error finding match ID ${matchId} in matches collection\n`, false);
                    msg.channel.send(`>>> An error occured while searching for match ID ${matchId}.`);
                }
                return;
            }
    }

    if(!match.started || match.reported || match.canceled) {
        // cannot report this match
        return;
    }

    // find which team this user was on
    var teamId = getMemberTeamId(match, msg.member.id);
    var team0String, team1String;

    if(arg === 'win'){
        // this user's team won the match
        if(teamId === 0) {
            team0String = 'won';
            team1String = 'lost'
            match.winningTeam = 0;
        }
        else {
            team0String = 'lost';
            team1String = 'won'
            match.winningTeam = 1;
        }
        await reportResult(match);
    }
    else if(arg === 'loss'){
        // this user's team lost the match
        if(teamId === 0) {
            team0String = 'lost';
            team1String = 'won'
            match.winningTeam = 1;
        }
        else {
            team0String = 'won';
            team1String = 'lost'
            match.winningTeam = 0;
        }
        await reportResult(match);
    }
    else {
        msg.channel.send(`>>> Invalid command parameter "${arg}". Valid "report" parameters are "win" or "loss".`);
        return;
    }
    msg.channel.send(`>>> Match ID ${matchId} result:
Blue Team ${team0String}: ${userMentionString(match.teams[0])}
Orange Team ${team1String}: ${userMentionString(match.teams[1])}`);

    match.reported = true;

    endMatch(msg, match);
}

async function reportResult(match) {
    switch(match.teamSize) {
        /*
        case config.SIX_MANS_TEAM_SIZE:
            matchType = Player.SIX_MANS_PROPERTY;
            break;
        */
        case config.FOUR_MANS_TEAM_SIZE:
            matchType = Player.FOUR_MANS_PROPERTY;
            break;

        case config.TWO_MANS_TEAM_SIZE:
            matchType = Player.TWO_MANS_PROPERTY;
            break;
        default:
            matchType = Player.SIX_MANS_PROPERTY;
    }

    // first, get each player from mongoDB and synchronously await the result since we need to get all the players scores before proceeding
    let teams = [[], []]; // array to contain player data from mongoDB
    for(let i = 0; i < 2; i++) {
        for (m of match.teams[i]) {
            try {
                const query = {_id: m.id};
                const p = await db.collection('players').findOne(query);
                teams[i].push(p);
            }
            catch (err) {
                // should not happen
                handleDataBaseError(err, 'Error retrieving player data\n', false);
                teams[i].push(Player(m)); // push result for new player...
            }
        }
    }
    let avgs = [0, 0];

    // next, get the average MMR of each team
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < match.teamSize; j++) {
            avgs[i] += teams[i][j].stats[matchType].rating;
        }
        avgs[i] /= match.teamSize;
    }

    // next, get the new rating for each player
    for(let i = 0; i < 2; i++) {
        // score is a 0 or 1 value used for calculating each player's new rating
        const a = i, b = (i + 1) % 2;
        let score = rating.loss;
        const winner = (match.winningTeam === i);
        if(winner) {
            score = rating.win;
        }
        for (m of teams[i]) {
            // now get this players new rating
            const d = rating.calculateRatingChange(avgs[i], avgs[b], rating.getK(m.stats[matchType].rating, m.stats[matchType].wins + m.stats[matchType].losses), score); // change in this player's rating
            const newRating = m.stats[matchType].rating + d;

            // we have this players new rating, now update mongoDB with the rating
            let update = {};
            if(winner) {
                update[`stats.${matchType}.wins`] = m.stats[matchType].wins + 1;
                update[`stats.${matchType}.totalWins`] = m.stats[matchType].totalWins + 1;
            }
            else {
                update[`stats.${matchType}.losses`] = m.stats[matchType].losses + 1;
                update[`stats.${matchType}.totalLosses`] = m.stats[matchType].totalLosses + 1;
            }
            update[`stats.${matchType}.rating`] = newRating;
            update[`stats.${matchType}.matchRatingChange.${match.timestamp}`] = d;
            update[`stats.${matchType}.lastRatingChange`] = d;

            const query = {_id: m._id};

            try {
                await db.collection('players').updateOne(query, {$set: update}); // doing this synchronously because we want to return to the calling function after all the player updates are done
            }
            catch (err) {
                handleDataBaseError(err, 'Error updating player result\n', false);
            }
        }
    }
}

function setCommand(msg) {
    if(msg.member.roles.cache.has(config.SIX_MANS_ROLE) === false) {
        // user does not have sufficient permissions for this command
        return;
    }
    let args = msg.content.split(' ');
    let argIter = 1;
    if(args.length < argIter + 1)
        return;

    let arg = args[argIter];
    argIter++;

    switch(arg) {
        case 'prefix':
            // change command prefix
            if(args.length < argIter + 1)
                return;
            userCommandPrefix = args[argIter];

            db.collection('config').findOne({}, (err, dbConf) => {
                if(err) {
                    handleDataBaseError(err, `Error loading config from mongoDB\n`, false);
                }
                else {
                    if(dbConf != null) {
                        // need to update config
                        db.collection('config').updateOne({}, {$set: {commandPrefix: userCommandPrefix}}, (err, res) => {
                            if(err) {
                                handleDataBaseError(err, `Error updating config in mongoDB\n`, false);
                            }
                            else {
                                msg.channel.send(`Updated command prefix to ${userCommandPrefix}`);
                            }
                        });
                    }
                }
            });
            break;
        /* // for now, disabling 'set stats' command
        case 'stats':
            // set player stats

            let needToUpdateStats = false;
            let newStats = {};

            let player = msg.mentions.users.first();
            if(!player) {
                return;
            }
            argIter++;

            while(true) {
                let nextStatSet = getNextStatObject(args, argIter);
                argIter += 3;
                if(nextStatSet == null) {
                    break;
                }
                else {
                    for(let key in nextStatSet) {
                        // copy the stats
                        newStats[key] = nextStatSet[key];
                    }
                    needToUpdateStats = true;
                }
            }


            if(!needToUpdateStats) {
                // invalid command parameters given
                return;
            }


            let member = {displayName: player.username, id: player.id };
            //console.log(`Name: ${player.username} ID: ${playerId} stats: wins ${wins} losses ${losses}`);

            const query = {_id: player.id};

            try{
                db.collection('players').findOne(query, (err, result) => {
                    if(err) throw err;

                    if(result == null) {
                        // there is no document for this player, need to insert a new one with these stats
                        let o = Player.Player(member, newStats);
                        db.collection('players').insertOne(o, (err, res) => {
                            if(err) {
                                handleDataBaseError(err, 'Error inserting player\n', false);
                            }
                            else {
                                msg.channel.send(`Updated <@${player.id}> stats: wins ${wins} losses ${losses}`);
                            }
                        });
                        //console.log(`Name: ${player.username} ,ID <@${playerId}> stats: wins ${wins}, losses ${losses}`);
                    }
                    else {
                        // just need to update this player
                        let updateStats = {};
                        // want to set field in embedded document
                        for(key in newStats) {
                            // key is 'six', 'four', or 'two'
                            updateStats['stats.'+key+'.wins'] = newStats[key].wins;
                            updateStats['stats.'+key+'.losses'] = newStats[key].losses;
                        }
                        const update = {$set: updateStats};
                        db.collection('players').updateOne(query, update, (err, res) => {
                            if(err) {
                                handleDataBaseError(err, 'Error inserting player\n', false);
                            }
                            else {
                                msg.channel.send(`Updated <@${player.id}> stats: wins ${wins} losses ${losses}`);
                            }
                        });
                    }
                });

            }
            catch(err) {
                handleDataBaseError(err, `Error updating player stats\n`, false);
            }


            break;
            */

        default:
            // ignore
    }
}

function showLeaderboard(msg) {
    msg.channel.send(`The leaderboard may be found at http://${config.serverIP}:${config.leaderboardPort}/leaderboard`).then().catch(console.error);
}

function showMatches(msg) {
    var ongoingMatches = '>>> Ongoing matches...\n';
    var numMatches = 0;
    for(var matchId in matches) {
        let match = matches[matchId];
        if(match == null)
            continue;

        if(match.started === false) {
            ongoingMatches += `Match ID ${matchId}
Players ${userMentionString(match.players)}
Match has not yet begun.\n\n`;
        }
        else {
            ongoingMatches += `Match ID ${matchId}
Team 1: ${userMentionString(match.teams[0])}
Team 2: ${userMentionString(match.teams[1])}
Name: ${match.name}
Password: ${match.password}\n\n`;
        }
        numMatches++;
    }
    if(numMatches > 0)
        msg.channel.send(ongoingMatches);
    else
        msg.channel.send('No ongoing matches.');
}

function showQueueStatus(msg) {
    if(queue.length === 0 && queueFour.length === 0 && queueTwo.length === 0) {
        msg.channel.send(`>>> No users in queue.`);
    }
    else {
        var s = '>>> ';
        if(queue.length > 0) {
            s += `Users in standard queue: ${queueString()}\n`;
        }
        if(queueFour.length > 0) {
            s += `Users in doubles queue: ${queueFourString()}\n`;
        }
        if(queueTwo.length > 0) {
            s += `Users in solo duel queue: ${queueTwoString()}\n`;
        }
        msg.channel.send(s);
    }

}

async function startBalancedMatch(msg, match) {
    match.createBalancedteams(await orderPlayersByRank(match.players, match.teamSize));
    startMatch(msg, match);
}

async function startCaptainsMatch(msg, match) {
    match.createCaptains(await orderPlayersByRank(match.players, match.teamSize));
    messageCaptains(msg, match);
}

function startRandomMatch(msg, match) {
    match.createRandomteams();
    startMatch(msg, match);
}

const teamNames = ["Blue Team", "Orange Team"];

async function startMatch(msg, match) {
    match.start();

    const MAX_VOICE_CHANNEL_ID = 69;

    const playersByRank = await orderPlayersByRank(match.players, match.teamSize); // have the highest ranked player create the private match

    const matchCreator = playersByRank[0].player;

    const picksThirdGameIndex = Math.floor(Math.random() * Math.floor(2)); // 0 or 1 value determining who gets to pick the region for game 3

    let matchMsg = `>>> Match ID ${match.id}; teams have been created.
Blue Team: ${userMentionString(match.teams[0])}
Orange Team: ${userMentionString(match.teams[1])}

Matches are Best out of 3.
Blue Team will pick the region for game 1.
Orange Team will pick the region for game 2.
${teamNames[picksThirdGameIndex]} will pick the region for game 3.

<@${matchCreator.id}> will create the private match.
Name: ${match.name}
Password: ${match.password}`;
    msg.channel.send(matchMsg);

    for(p of match.players) {
        p.send(matchMsg).then().catch(console.error);
    }

    const options = {type: 'voice', parent: config.SIX_MANS_CATAGORY, userLimit: match.teamSize, reason: 'Needed for private man match'};


    // now create voice channels for this match
    msg.guild.channels.create(`Blue ${match.id % MAX_VOICE_CHANNEL_ID}`, options)
    .then(chan1 => {
        match.voiceChannels[0] = chan1;
        msg.guild.channels.create(`Orange ${match.id % MAX_VOICE_CHANNEL_ID}`, options)
        .then(chan2 => {
            match.voiceChannels[1] = chan2;
            for(p of match.teams[0]) {
                // move to team 1 voice chat
                p.fetch()
                .then((member) => {
                    if(member.voice.channelID != undefined) {
                        // if the user is in voice chat
                        member.voice.setChannel(msg.guild.channels.resolve(match.voiceChannels[0])).then().catch(console.error);
                    }
                })
                .catch(console.error);
            }
            for(p of match.teams[1]) {
                // move to team 2 voice chat
                p.fetch()
                .then((member) => {
                    if(member.voice.channelID != undefined) {
                        // if the user is in voice chat
                        member.voice.setChannel(msg.guild.channels.resolve(match.voiceChannels[1])).then().catch(console.error);
                    }
                })
                .catch(console.error);
            };
        })
        .catch(console.error);})
    .catch(console.error);
}

function undoMatchResult(msg) {
    // command format undo <match id>
    if(msg.member.roles.cache.has(config.SIX_MANS_ROLE) === false) {
        // user does not have sufficient permissions for this command
        return;
    }
    let args = msg.content.split(' '); // let the command be the first word in the user message
    if(args.length != 2) {
        return;
    }

    let matchId = Number(args[1]); // match id is the second word in the user message
    if(matchId.isNaN) {
        // invalid parameter
        return;
    }

    // valid number, check if this is a valid match id
    const query = {id: matchId};
    try{
        db.collection('matches').find(query).toArray(async (err, result) => {
            if(err) throw err;
            switch(result.length) {
                case 0:
                    // did not find any matches
                    msg.channel.send(`>>> Did not find any matches with match ID ${matchId}.`);
                    break;
                case 1:
                    // found exactly 1 match, undo this match
                    let match = result[0];
                    if(match.reported) {
                        var matchType;
                        switch(match.teamSize) {
                            /*
                            case config.SIX_MANS_TEAM_SIZE:
                                matchType = Player.SIX_MANS_PROPERTY;
                                break;
                            */
                            case config.FOUR_MANS_TEAM_SIZE:
                                matchType = Player.FOUR_MANS_PROPERTY;
                                break;

                            case config.TWO_MANS_TEAM_SIZE:
                                matchType = Player.TWO_MANS_PROPERTY;
                                break;
                            default:
                                matchType = Player.SIX_MANS_PROPERTY;
                        }

                        for(let i = 0; i < 2; i++) {
                            const winner = (match.winningTeam === i);
                            for(m of match.teams[i]) {
                                // first, fetch this player
                                const query = {_id: m.id};
                                let p;
                                try{
                                    p = await db.collection('players').findOne(query);
                                }
                                catch (err) {
                                    handleDataBaseError(err, 'Error finding player for undo\n', false);
                                    continue;
                                }

                                let update = {};

                                // decrement player wins/losses depending on what the match result was
                                if(winner) {
                                    update[`stats.${matchType}.wins`] = p.stats[matchType].wins - 1;
                                    update[`stats.${matchType}.totalWins`] = p.stats[matchType].totalWins - 1;
                                }
                                else {
                                    update[`stats.${matchType}.losses`] = p.stats[matchType].losses - 1;
                                    update[`stats.${matchType}.totalLosses`] = p.stats[matchType].totalLosses - 1;
                                }

                                // revert MMR to what it previously was
                                const ratingChange = p.stats[matchType].matchRatingChange[match.timestamp];
                                update[`stats.${matchType}.rating`] = p.stats[matchType].rating - ratingChange;
                                update[`stats.${matchType}.matchRatingChange.${match.timestamp}`] = 0;
                                update[`stats.${matchType}.lastRatingChange`] = ratingChange;

                                try {
                                    await db.collection('players').updateOne(query, {$set: update});
                                }
                                catch (err) {
                                    handleDataBaseError(err, 'Error undoing player result\n', false);
                                }

                            }
                        }

                        match.winningTeam = -1;
                        match.reported = false;
                        try{
                            const queryUpdate = {id: match.id, timestamp: match.timestamp};
                            const newValues = {$set: {winningTeam: -1, reported: false}};
                            db.collection('matches').updateOne(queryUpdate, newValues, (err, res) => {
                                if(err)
                                    throw err;
                                else
                                    msg.channel.send(`>>> Undid match result for match ID ${matchId}.`);
                            })
                        }
                        catch(err) {
                            handleDataBaseError(err, `Error updating match ID ${matchId} in matches collection\n`, false);
                            msg.channel.send(`>>> An error occured while updating match ID ${matchId}.`);
                        }

                    }
                    else {
                        msg.channel.send(`>>> Match ID ${matchId} has not been reported.`);
                    }
                    break;
                default:
                    // found multiple matches, TODO
                    // this can be handled by opening a DM with the user and having them select a match
                    // may implement this later
                    msg.channel.send(`>>> Error: found multiple matches for match ID ${matchId}. Tell a developer to fix this.`);
            }
        });
    }
    catch(err) {
        handleDataBaseError(err, `Error finding match ID ${matchId} in matches collection\n`, false);
        msg.channel.send(`>>> An error occured while searching for match ID ${matchId}.`);
    }

}

function userMentionString(list) {
    // takes list of users, returns string containing list of user mentions
    var s = '';
    for (m of list) {
        if (s === '')
        s += `<@${m.id}>`;
        else
        s += ", " + `<@${m.id}>`;
    }
    return s;
}

async function voteForBalancedTeams(msg) {
    let match = getUserMatch(msg.member.id);
    if (match === null) {
        return;
    }

    // this user is in a match
    if(!match.isVotingAllowed()) {
        return;
    }

    if(match.addVoteForBalanced(msg.member.id)) {
        msg.channel.send(match.getVotesString());
        if((match.teamSize === config.SIX_MANS_TEAM_SIZE && match.balancedVotes > config.SIX_MANS_MIN_VOTE_COUNT) || (match.teamSize === config.FOUR_MANS_TEAM_SIZE && match.balancedVotes > config.FOUR_MANS_MIN_VOTE_COUNT)) {
            // the requisite vote amount has been reached, create balanced teams
            startBalancedMatch(msg, match);
        }
    }
}

async function voteForCaptains(msg) {
    let match = getUserMatch(msg.member.id);
    if (match === null) {
        return;
    }

    // this user is in a match
    if(!match.isVotingAllowed()) {
        return;
    }

    if(match.addVoteForCaptains(msg.member.id)) {
        msg.channel.send(match.getVotesString());
        if((match.teamSize === config.SIX_MANS_TEAM_SIZE && match.captainVotes > config.SIX_MANS_MIN_VOTE_COUNT) || (match.teamSize === config.FOUR_MANS_TEAM_SIZE && match.captainVotes > config.FOUR_MANS_MIN_VOTE_COUNT)) {
            // the requisite vote amount has been reached, create captains to select teams
            startCaptainsMatch(msg, match);
        }
    }


}

function voteForRandomTeams(msg) {
    let match = getUserMatch(msg.member.id);
    if (match === null) {
        return;
    }

    // this user is in a match
    if(!match.isVotingAllowed()) {
        return;
    }

    if(match.addVoteForRandom(msg.member.id)) {
        msg.channel.send(match.getVotesString());
        if((match.teamSize === config.SIX_MANS_TEAM_SIZE && match.randomVotes > config.SIX_MANS_MIN_VOTE_COUNT) || (match.teamSize === config.FOUR_MANS_TEAM_SIZE && match.randomVotes > config.FOUR_MANS_MIN_VOTE_COUNT)) {
            // the requisite vote amount has been reached, create random teams
            startRandomMatch(msg, match);
        }
    }

}
