/*
TODO:

-allow variable amounts of teams to compensate for times when there are not enough people
    -4 mans, 6 mans
    -have separate queues?

-track more stats?
    -goals?
    -user reporting?

-more commands for admin control
    -set player stats (wins/losses)

-set timeout on voting, picking teams

-require users to 'ready' up upon the queue popping?
    -avoids users being stuck in a game with someone afk
    -would need a timer for this

-store old matches in a log that is easily accessible to allow for 'undoing' match results
    -currently have matches which have ended in the 'matchArchive' JSON object
        -currently no way to view the matches in this object

-use 'mmr' to rank people
    -everyone starts at 1000 mmr
    -no one loses mmr?

-add 'balanced' team creation mode in addition to random and captains
    -try to add people to teams so that they are 'even'
        -rank players 1,2,3,4,5,6
            -team 1 gets players: 1,4,5
            -team 2 gets players: 2,3,6

-use config file for handling constants such as userCommandPrefix and the channel IDs

-in function startMatch(), check if a user is in voice chat before trying to move them
    -currently just moving without checking and logging the error that is received

*/

const config = require('./config.js');
const Match = require('./match');
const Player = require('./player');
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

try{
    const mongoOptions = { useUnifiedTopology: true };
    MongoClient.connect(url, mongoOptions, function(err, mdb) {
      if (err) throw err;
      db = mdb.db('sixMans');
    });
}
catch(err) {
    handleDataBaseError(err, 'Error opening mongo db\n', true);
}



var userCommandPrefix = '.';

var queue = []; // 6 mans queue

var queueFour = []; // 4 mans queue

var queueTwo = []; // 2 mans queue

var nextmatchId = 0;
const MAX_MATCH_ID = 100000; // match id will wrap to 0 upon reaching this value, so this is also the max concurrent matches
var matches = {}; // map match id to match object
var matchArhive = {}; // map matchid id to match object
var membersInMatches = {}; // map user id to match id


module.exports = {
    handleUserCommand: function(client, msg) {
        if(msg.channel.type === 'dm')
            // for now, ignore commands from DM channel
            return;
        //msg.channel.send(`received user command '${msg.content}'`);
        let command = msg.content.split(' ')[0]; // let the command be the first word in the user message
        //console.log(`received user command '${s}'`);
        switch(command) {
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

            case 'help':
            displayHelp(msg);
            break;

            case 'l2':
            removeUserFromTwoMansQueue(msg);
            break;

            case 'l4':
            removeUserFromFourMansQueue(msg);
            break;

            case 'l6':
            case 'leave':
            removeUserFromSixMansQueue(msg);
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

            case 'q':
            case 'queue':
            addUserToQueue(msg);
            break;

            case 'q2':
            case 'queue2':
            addToTwoMansQueue(msg);
            break;

            case 'q4':
            case 'queue4':
            addToFourMansQueue(msg);
            break;

            case 'q6':
            case 'queue6':
            addToSixMansQueue(msg);
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

function addToFourMansQueue(msg) {
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
    var s = `>>> Added <@${msg.member.id}> to the 4 mans queue.
Users in queue: ${queueFourString()}\n`;

    if(queueFour.length === config.FOUR_MANS_MAX_QUEUE_SIZE) {
        // the queue is filled!
        // now we need to make teams
        createMatch(msg, config.FOUR_MANS_TEAM_SIZE);
        s += `Match is ready to start.
Enter ${userCommandPrefix}r or ${userCommandPrefix}random to vote for random teams.
Enter ${userCommandPrefix}c or ${userCommandPrefix}captains to vote to have captains pick teams.
The match will be canceled if neither option receives 3 votes after 2 minutes have elapsed.`;
    }
    msg.channel.send(s);
}

function addToSixMansQueue(msg) {
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
    var s = `>>> Added <@${msg.member.id}> to the 6 mans queue.
Users in queue: ${queueString()}\n`;

    if(queue.length === config.SIX_MANS_MAX_QUEUE_SIZE) {
        // the queue is filled!
        // now we need to make teams
        createMatch(msg, config.SIX_MANS_TEAM_SIZE);
        s += `Match is ready to start.
Enter ${userCommandPrefix}r or ${userCommandPrefix}random to vote for random teams.
Enter ${userCommandPrefix}c or ${userCommandPrefix}captains to vote to have captains pick teams.
The match will be canceled if neither option receives 3 votes after 2 minutes have elapsed.`;
    }
    msg.channel.send(s);
}

function addToTwoMansQueue(msg) {
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
    var s = `>>> Added <@${msg.member.id}> to the 2 mans queue.
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

function addUserToQueue(msg) {
    let args = msg.content.split(' ');
    if(args.length === 1) {
        // adding to 6 mans queue
        addToSixMansQueue(msg);
    }
    else if(args.length === 2) {
        if(args[1] === '4')
            addToFourMansQueue(msg);
        else if(args[1] === '6')
            addToSixMansQueue(msg);
        else if(args[1] === '2')
            addToTwoMansQueue(msg);
    }
}

function cancelMatch(msg) {
    // TODO
    // -use match id to cancel match instead and check permissions (admin only command?)
    // OR
    // -allow for players to vote to cancel match?
    let match = getUserMatch(msg.member.id);
    if(match == null)
        return; // user is not in a match, ignore

    match.canceled = true;
    endMatch(msg, match);
}

function clearQueue(msg) {
    // TODO check user permissions (must be admin?)
    let args = msg.content.split(' ');
    if(args.length === 1) {
        // clearing 6 mans queue
        if(queue.length > 0) {
            queue = [];
            msg.channel.send(`>>> Cleared 6 mans queue.`);
        }
        else {
            msg.channel.send(`>>> 6 mans queue is already empty.`);
        }

    }
    else if(args.length === 1 && args[1] === '4') {
        // clearing 4 mans queue
        if(queueFour.length > 0) {
            queueFour = [];
            msg.channel.send(`>>> Cleared 4 mans queue.`);
        }
        else {
            msg.channel.send(`>>> 4 mans queue is already empty.`);
        }
    }
    else if(args.length === 1 && args[1] === '2') {
        // clearing 4 mans queue
        if(queueTwo.length > 0) {
            queueTwo = [];
            msg.channel.send(`>>> Cleared 2 mans queue.`);
        }
        else {
            msg.channel.send(`>>> 2 mans queue is already empty.`);
        }
    }
}

function createMatch(msg, teamSize) {
    var match;
    switch(teamSize) {
        case config.SIX_MANS_TEAM_SIZE:
            match = Match(queue, nextmatchId, teamSize);
            queue = [];
            break;

        case config.FOUR_MANS_TEAM_SIZE:
            match = Match(queueFour, nextmatchId, teamSize);
            queueFour = [];
            break;

        case config.TWO_MANS_TEAM_SIZE:
            match = Match(queueTwo, nextmatchId, teamSize);
            queueTwo = [];
            break;

        default:

    }

    for (user of match.players) {
        membersInMatches[user.id] = match.id;
    }

    matches[match.id] = match;
    nextmatchId = (nextmatchId + 1) % MAX_MATCH_ID;

    // start 2 minute timer to allow players to vote on teams
    match.timer = setTimeout (() => {
        // handle timeout here
        msg.channel.send(`>>> Match ID ${match.id} has timed out. Canceling match.`);
        match.canceled = true;
        endMatch(msg, match);
    }, 120000);
    return match;
}

function decrementMatchLosses(team) {
    for (m of team) {
        decrementMemberMatchLosses(m);
    }
}

function decrementMatchWins(team) {
    for (m of team) {
        decrementMemberMatchWins(m);
    }
}

function decrementMemberMatchLosses(member) {
    const query = {_id: member.id};
    db.collection('players').findOne(query, (err, result) => {
        if(err) {
            handleDataBaseError(err, `Error finding member ID ${member.id} in players collection\n`, false);
        }
        else {
            if(result != null) {
                // found player in database, need to update document for that player in the players collection
                db.collection('players').updateOne(query, {$inc: {losses: -1}}, (err, res) => {
                    if(err) {
                        handleDataBaseError(err, 'Error undoing player loss\n', false);
                    }
                });
            }
        }
    });
}

function decrementMemberMatchWins(member) {
    const query = {_id: member.id};
    db.collection('players').findOne(query, (err, result) => {
        if(err) {
            handleDataBaseError(err, `Error finding member ID ${member.id} in players collection\n`, false);
        }
        else {
            if(result != null) {
                // found player in database, need to update document for that player in the players collection
                db.collection('players').updateOne(query, {$inc: {wins: -1}}, (err, res) => {
                    if(err) {
                        handleDataBaseError(err, 'Error undoing player win\n', false);
                    }
                });
            }
        }
    });
}

function displayHelp(msg) {
    const helpString = `Valid commands are:
${userCommandPrefix}c
${userCommandPrefix}captains
-vote for captains

${userCommandPrefix}cancel
-cancel the match you are currently in

${userCommandPrefix}clear
-clear out the current queue

${userCommandPrefix}help
-display this text

${userCommandPrefix}l
${userCommandPrefix}leave
-remove yourself from the queue

${userCommandPrefix}lb
${userCommandPrefix}leaderboard
-show the leaderboard

${userCommandPrefix}matches
-show ongoing matches

${userCommandPrefix}q
${userCommandPrefix}queue
-add yourself to the 6 mans queue

${userCommandPrefix}q4
${userCommandPrefix}queue4
-add yourself to the 4 mans queue

${userCommandPrefix}q6
${userCommandPrefix}queue6
-add yourself to the 6 mans queue

${userCommandPrefix}r
${userCommandPrefix}random
-vote for random teams

${userCommandPrefix}report [match ID] <win|loss>
-report the result of your match
-optionally include match ID to report the result of a previous match

${userCommandPrefix}s
${userCommandPrefix}status
-show the queue status

${userCommandPrefix}undo <match ID>
-undo a previously reported result for a match`;
    msg.channel.send(`${helpString}`);
}

function endMatch(msg, match) {
    match.ended = true;

    if(match.started) {

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

    matchArhive[match.id] = match;
    delete matches[match.id];
    for(player of match.players) {
        delete membersInMatches[player.id];
    }

}

function getMemberTeamId(match, member) {
    for(let i = 0; i < 2; i++)
        for(m of match.teams[i]) {
            if(m.id === member.id)
                return i;
        }
    return -1; // member not in either team
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
            if(collected.size === 0){
                // did not receive message from captain
                // for now, resend the message...
                messageCaptain(omsg, match, captainIndex);
                return;
            }
            var msg = collected.first();
            var n = Number(msg.content);
            if(n < 1 || n > match.playerPickList.length) {
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
                if(match.playerPickList.length > 1)
                    messageCaptain(omsg, match, (captainIndex + 1) % 2);
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

async function orderPlayersByRank(players) {
    var playerList = [];

    // first retrieve player stats
    for(p of players) {
        try{
            let result = await db.collection('players').findOne({_id: p.id});
            if(result == null) {
                // player does not exist in players collection
                let player = Player(p);
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
            let player = Player(p);
            player.player = p;
            playerList.push(player);
        }
    }

    playerList.sort(rankPlayers);
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

function rankPlayers(p1,p2) {
    if ((p1.wins - p1.losses) < (p2.wins - p2.losses)) {
        return 1;
    }
    else if ((p1.wins - p1.losses) > (p2.wins - p2.losses)){
        return -1;
    }
    else
        return 0;
}

function removeUserFromFourMansQueue(msg) {
    var i = 0;
    let removedFromQueue = false;
    for (m of queueFour) {
        if(m.id === msg.member.id)
        {
            // remove this member from the queue
            queueFour.splice(i, 1);
            removedFromQueue = true;
            break;
        }
        i++;
    }
    if(removedFromQueue) {
        var s = `>>> Removed <@${msg.member.id}> from the 4 mans queue.\n`;
        if(queueFour.length > 0) {
            s += `Users in queue: ${queueString()}`;
        }
        else {
            s += `No users left in queue.`
        }
        msg.channel.send(s);
    }
}

function removeUserFromSixMansQueue(msg) {
    var i = 0;
    let removedFromQueue = false;
    for (m of queue) {
        if(m.id === msg.member.id)
        {
            // remove this member from the queue
            queue.splice(i, 1);
            removedFromQueue = true;
            break;
        }
        i++;
    }
    if(removedFromQueue) {
        var s = `>>> Removed <@${msg.member.id}> from the 6 mans queue.\n`;
        if(queue.length > 0) {
            s += `Users in queue: ${queueString()}`;
        }
        else {
            s += `No users left in queue.`
        }
        msg.channel.send(s);
    }
}

function removeUserFromTwoMansQueue(msg) {
    var i = 0;
    let removedFromQueue = false;
    for (m of queueTwo) {
        if(m.id === msg.member.id)
        {
            // remove this member from the queue
            queueTwo.splice(i, 1);
            removedFromQueue = true;
            break;
        }
        i++;
    }
    if(removedFromQueue) {
        var s = `>>> Removed <@${msg.member.id}> from the 2 mans queue.\n`;
        if(queueTwo.length > 0) {
            s += `Users in queue: ${queueTwoString()}`;
        }
        else {
            s += `No users left in queue.`
        }
        msg.channel.send(s);
    }
}

function removeUserFromQueue(msg) {
    let args = msg.content.split(' ');
    var arg = '';
    if(args.length > 1) {
        arg = args[1];
    }
    if(arg === '' || arg === '6') {
        // removing from 6 mans queue
        removeUserFromSixMansQueue(msg);
    }
    else if(arg === '4') {
        removeUserFromFourMansQueue(msg);
    }
    else if(arg === '2') {
        removeUserFromTwoMansQueue(msg);
    }
}

function reportMatchResult(msg) {
    // remove match from matches object and remove users from membersInMatches object

    var match, matchId;

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
            break;

        default:
            // check if valid match id
            let n = Number(arg);
            if(n.isNaN) {
                // invalid parameter
                return;
            }

            // valid number, check if this is a valid match id
            if(n in matches && matches[n].isUserInMatch(msg.member.id)) {
                // this is a valid match id, the match has not be reported yet, and the user is in the match
                matchId = n;
                match = matches[n];
            }
            else if(n in matchArhive && matchArhive[n].isUserInMatch(msg.member.id)) {
                // this game is archived
                matchId = n;
                match = matchArhive[n];
            }
            else {
                return;
            }

            // check if there is a second parameter (this is required)
            if(args.length === 3) {
                arg = args[2];
            }
            else {
                // insufficient command parameters
                return;
            }
    }

    if(!match.started || match.reported || match.canceled) {
        // cannot report this match
        return;
    }

    // find which team this user was on
    var teamId = getMemberTeamId(match, msg.member);
    var win = false;
    var team0String, team1String;

    if(arg === 'win'){
        // this user's team won the match
        if(teamId === 0) {
            team0String = 'won';
            team1String = 'lost'
            reportTeamWon(match.teams[0]);
            reportTeamLost(match.teams[1]);
            match.winningTeam = 0;
        }
        else {
            team0String = 'lost';
            team1String = 'won'
            reportTeamLost(match.teams[0]);
            reportTeamWon(match.teams[1]);
            match.winningTeam = 1;
        }
        win = true;
    }
    else if(arg === 'loss'){
        // this user's team lost the match
        if(teamId === 0) {
            team0String = 'lost';
            team1String = 'won'
            reportTeamLost(match.teams[0]);
            reportTeamWon(match.teams[1]);
            match.winningTeam = 1;
        }
        else {
            team0String = 'won';
            team1String = 'lost'
            reportTeamWon(match.teams[0]);
            reportTeamLost(match.teams[1]);
            match.winningTeam = 0;
        }
    }
    else {
        msg.channel.send(`>>> Invalid command parameter "${arg}". Valid "report" parameters are "win" or "loss".`);
        return;
    }
    msg.channel.send(`>>> Match ID ${matchId} result:
Team 1 ${team0String}: ${userMentionString(match.teams[0])}
Team 2 ${team1String}: ${userMentionString(match.teams[1])}`);

    match.reported = true;

    if(!match.ended)
        endMatch(msg, match);
}

function reportMemberLost(member) {
    const query = {_id: member.id};
    db.collection('players').findOne(query, (err, result) => {
        if(err) {
            handleDataBaseError(err, `Error finding member ID ${member.id} in players collection\n`, false);
        }
        else {
            if(result == null) {
                // did not find player in database, need to insert document for that player in the players collection
                let o = Player(member, {losses: 1, wins: 0});
                db.collection('players').insertOne(o, (err, res) => {
                    if(err) {
                        handleDataBaseError(err, 'Error inserting player lost\n', false);
                    }
                });
            }
            else {
                // found player in database, need to update document for that player in the players collection
                db.collection('players').updateOne(query, {$inc: {losses: 1}}, (err, res) => {
                    if(err) {
                        handleDataBaseError(err, 'Error updating player lost\n', false);
                    }
                });
            }
        }
    });
}

function reportMemberWon(member) {
    const query = {_id: member.id};

    db.collection('players').findOne(query, (err, result) => {
        if(err) {
            handleDataBaseError(err, `Error finding member ID ${member.id} in players collection\n`, false);
        }
        else {
            if(result == null) {
                // did not find player in database, need to insert document for that player in the players collection
                let o = Player(member, {losses: 0, wins: 1});
                db.collection('players').insertOne(o, (err, res) => {
                    if(err) {
                        handleDataBaseError(err, 'Error inserting player won\n', false);
                    }
                });
            }
            else {
                // found player in database, need to update document for that player in the players collection
                db.collection('players').updateOne(query, {$inc: {wins: 1}}, (err, res) => {
                    if(err) {
                        handleDataBaseError(err, 'Error updating player won\n', false);
                    }
                });
            }
        }
    });
}

function reportTeamLost(team) {
    for (m of team) {
        reportMemberLost(m);
    }
}

function reportTeamWon(team) {
    for (m of team) {
        reportMemberWon(m);
    }
}

function setCommand(msg) {
    let args = msg.content.split(' ');
    if(args.length < 2)
        return;
    if(args[1] === 'prefix') {
        // change command prefix
        if(args.length < 3)
            return;
        userCommandPrefix = args[2];
        // TODO put this in a config file/database so it is persistent between reloads
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
            s += `Users in 6 mans queue: ${queueString()}\n`;
        }
        if(queueFour.length > 0) {
            s += `Users in 4 mans queue: ${queueFourString()}\n`;
        }
        if(queueTwo.length > 0) {
            s += `Users in 2 mans queue: ${queueTwoString()}\n`;
        }
        msg.channel.send(s);
    }

}

function startMatch(msg, match) {
    match.start();
    let matchMsg = `>>> Match ID ${match.id}; teams have been created.
Team 1: ${userMentionString(match.teams[0])}
Team 2: ${userMentionString(match.teams[1])}
Name: ${match.name}
Password: ${match.password}`;
    msg.channel.send(matchMsg);

    for(p of match.players) {
        p.send(matchMsg).then().catch(console.error);
    }

    const options = {type: 'voice', parent: config.SIX_MANS_CATAGORY, userLimit: match.teamSize, reason: 'Needed for private man match'};


    // now create voice channels for this match
    msg.guild.channels.create(`Orange ${match.id}`, options)
    .then(chan1 => {
        match.voiceChannels[0] = chan1;
        msg.guild.channels.create(`Blue ${match.id}`, options)
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
    //
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
    if(matchId in matchArhive) {
        // this game is archived
        let match = matchArhive[matchId];
        if(match.reported) {
            decrementMatchLosses(match.teams[(match.winningTeam + 1) % 2]);
            decrementMatchWins(match.teams[match.winningTeam]);
            match.winningTeam = -1;
            match.reported = false;
            msg.channel.send(`>>> Undid match result for match ID ${matchId}.`);
        }

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

async function voteForCaptains(msg) {
    let match = getUserMatch(msg.member.id);
    if (match === null) {
        return;
    }

    // this user is in a match
    if(match.started || match.pickingTeams) {
        return;
    }

    if(match.addVoteForCaptains(msg.member.id)) {
        msg.channel.send(`>>> Votes for random: ${match.randomVotes}
Votes for captains: ${match.captainVotes}`);
        if((match.teamSize === config.SIX_MANS_TEAM_SIZE && match.captainVotes > config.SIX_MANS_MIN_VOTE_COUNT) || (match.teamSize === config.FOUR_MANS_TEAM_SIZE && match.captainVotes > config.FOUR_MANS_MIN_VOTE_COUNT)) {
            // the requisite vote amount has been reached, create captains to select teams
            match.createCaptains(await orderPlayersByRank(match.players));
            messageCaptains(msg, match);
        }
    }


}

function voteForRandomTeams(msg) {
    let match = getUserMatch(msg.member.id);
    if (match === null) {
        return;
    }

    // this user is in a match
    if(match.started || match.pickingTeams) {
        return;
    }

    if(match.addVoteForRandom(msg.member.id)) {
        msg.channel.send(`>>> Votes for random: ${match.randomVotes}
Votes for captains: ${match.captainVotes}`);
        if((match.teamSize === config.SIX_MANS_TEAM_SIZE && match.randomVotes > config.SIX_MANS_MIN_VOTE_COUNT) || (match.teamSize === config.FOUR_MANS_TEAM_SIZE && match.randomVotes > config.FOUR_MANS_MIN_VOTE_COUNT)) {
            // the requisite vote amount has been reached, create random teams
            match.createRandomteams();
            startMatch(msg, match);
        }
    }

}
