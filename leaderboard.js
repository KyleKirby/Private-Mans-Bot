/*
TODO:

-make leaderboard and player pages more sexy

-use rank icons on leaderboard and player pages

*/


const mongo = require('mongodb');
const fs = require('fs');
const config = require('./config');
var path = require('path');

const sixMans = require('./sixMans');

const Player = require('./player');

const Rating = require('./rating');


var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
// mongo db
var db = null;

function handleExit() {
    if(db != null) {
        db.close();
    }
}

var matchType = Player.SIX_MANS_PROPERTY;

const SORT_BY_RANK = 0;
const SORT_BY_NAME = 1;
const SORT_BY_WINS = 2;
const SORT_BY_LOSSES = 3;
const SORT_BY_WINS_MINUS_LOSSES = 4;
const SORT_BY_WIN_PERCENTAGE = 5;

process.on('exit', handleExit);

const HEADER_STYLE = `
body {
    background-color: #171717;
    color: #ffffff;
}

table {
  font-family: arial, sans-serif;
  border-collapse: collapse;
  width: 100%;
}

td, th {
  border: 1px solid #3c3c3c;
  text-align: left;
  padding: 8px;
}

tr:nth-child(even) {
  background-color: #2c2c2c;
}

a:link {
    color: #ffffff;
}

a:visited {
    color: #ffffff;
}

a:hover {
    color: #ffffff;
}

a:active {
    color: #ffffff;
}
`;

/*
BRONZE_1 = 0;
BRONZE_2 = 190;
BRONZE_3 = 247;
SILVER_1 = 310;
SILVER_2 = 369;
SILVER_3 = 429;
GOLD_1 = 490;
GOLD_2 = 550;
GOLD_3 = 612;
PLATINUM_1 = 692;
PLATINUM_2 = 772;
PLATINUM_3 = 852;
DIAMOND_1 = 933;
DIAMOND_2 = 1012;
DIAMOND_3 = 1095;
CHAMPION_1 = 1195;
CHAMPION_2 = 1295;
CHAMPION_3 = 1395;
GRAND_CHAMPION = 1515;
*/

const UNRANKED = {title:'Unranked', icon:'/icons/unranked.png'};

const RANKS = [
    {title:'Bronze 1', min:Rating.BRONZE_1, icon:'/icons/bronze1.png'},
    {title:'Bronze 2', min:Rating.BRONZE_2, icon:'/icons/bronze2.png'},
    {title:'Bronze 3', min:Rating.BRONZE_3, icon:'/icons/bronze3.png'},
    {title:'Silver 1', min:Rating.SILVER_1, icon:'/icons/silver1.png'},
    {title:'Silver 2', min:Rating.SILVER_2, icon:'/icons/silver2.png'},
    {title:'Silver 3', min:Rating.SILVER_3, icon:'/icons/silver3.png'},
    {title:'Gold 1', min:Rating.GOLD_1, icon:'/icons/gold1.png'},
    {title:'Gold 2', min:Rating.GOLD_2, icon:'/icons/gold2.png'},
    {title:'Gold 3', min:Rating.GOLD_3, icon:'/icons/gold3.png'},
    {title:'Platinum 1', min:Rating.PLATINUM_1, icon:'/icons/platinum1.png'},
    {title:'Platinum 2', min:Rating.PLATINUM_2, icon:'/icons/platinum2.png'},
    {title:'Platinum 3', min:Rating.PLATINUM_3, icon:'/icons/platinum3.png'},
    {title:'Diamond 1', min:Rating.DIAMOND_1, icon:'/icons/diamond1.png'},
    {title:'Diamond 2', min:Rating.DIAMOND_2, icon:'/icons/diamond2.png'},
    {title:'Diamond 3', min:Rating.DIAMOND_3, icon:'/icons/diamond3.png'},
    {title:'Champion 1', min:Rating.CHAMPION_1, icon:'/icons/champ1.png'},
    {title:'Champion 2', min:Rating.CHAMPION_2, icon:'/icons/champ2.png'},
    {title:'Champion 3', min:Rating.CHAMPION_3, icon:'/icons/champ3.png'},
    {title:'Grand Champion', min:Rating.GRAND_CHAMPION, icon:'/icons/grandchamp.png'}
];

function addLeaderboardTable(players, sort, nextMatchType) {

    var rank = '#';
    var icon = '';
    var rating = 'Rating';
    var name = 'Name';
    var wins = 'Wins';
    var losses = 'Losses';
    var rate = '%';

    // set the match type before sorting
    matchType = nextMatchType;

    players.sort(rankPlayers);

    let count = 1;
    for(entry of players) {
        if((entry.stats[matchType].wins + entry.stats[matchType].losses) === 0) {
            // if this player has not played any matches of this type (this season), skip them
            continue;
        }
        entry.rank = count;
        count++;
    }

    /*
    const SORT_BY_RANK = 0;
    const SORT_BY_NAME = 1;
    const SORT_BY_WINS = 2;
    const SORT_BY_LOSSES = 3;
    const SORT_BY_WINS_MINUS_LOSSES = 4;
    const SORT_BY_WIN_PERCENTAGE = 5;
    */

    switch(sort){
        case SORT_BY_NAME:
            players.sort(sortPlayersBynames);
            break;
        case SORT_BY_WINS:
            players.sort(sortPlayersByWins);
            break;
        case SORT_BY_LOSSES:
            players.sort(sortPlayersByLosses);
            break;
        case SORT_BY_WIN_PERCENTAGE:
            players.sort(sortPlayersByWinpercentage);
            break;
    }


    let lbHeaderText;
    switch(nextMatchType) {
        case Player.FOUR_MANS_PROPERTY:
            lbHeaderText = 'Doubles';
            break;
        case Player.TWO_MANS_PROPERTY:
            lbHeaderText = 'Solo Duel';
            break;
        default:
            lbHeaderText = 'Standard';
    }
    let lbStr = `
<h2 id="${nextMatchType}" style="float: left; width: 100%;">
    ${lbHeaderText}
</h2></br>
<table>
    <tr>
        <th style="width: 2%">` + rank + ` <a href='/leaderboard?sort=rank#${nextMatchType}'>&#8659;</a></th>
        <th style="width: 2%">` + icon + `</th>
        <th style="width: 2%">` + rating + ` <a href='/leaderboard?sort=rating#${nextMatchType}'>&#8659;</a></th>
        <th style="width: 10%">` + name + ` <a href='/leaderboard?sort=name#${nextMatchType}'>&#8659;</a></th>
        <th style="width: 2%">` + wins + ` <a href='/leaderboard?sort=wins#${nextMatchType}'>&#8659;</a></th>
        <th style="width: 2%">` + losses + ` <a href='/leaderboard?sort=losses#${nextMatchType}'>&#8659;</a></th>
        <th style="width: 25%">` + rate + ` <a href='/leaderboard?sort=winpercentage'>&#8659;</a> </th>
    </tr>`;
    for(entry of players) {
        if((entry.stats[matchType].wins + entry.stats[matchType].losses) === 0) {
            // if this player has not played any matches of this type (this season), skip them
            continue;
        }
        rank = entry.rank.toString();

        const playerRank = getPlayerRankIcon(entry.stats[nextMatchType]);
        icon = `<img src="${playerRank.icon}" alt="${playerRank.title}" height="30" width="30">`;

        let ratingChange;
        if(entry.stats[matchType].lastRatingChange >= 0) {
            ratingChange = `+${entry.stats[matchType].lastRatingChange.toFixed(0)}`;
        }
        else {
            ratingChange = `${entry.stats[matchType].lastRatingChange.toFixed(0)}`;
        }
        rating = `${entry.stats[matchType].rating.toFixed(0)} ${ratingChange}`;
        name = `<a href='/player?q=${entry._id}'>${entry.name}</a>`;
        wins = entry.stats[matchType].wins.toString();
        losses = entry.stats[matchType].losses.toString();
        winsMinusLosses = (entry.stats[matchType].wins - entry.stats[matchType].losses).toString();
        if((entry.stats[matchType].wins + entry.stats[matchType].losses) === 0) {
            // from undo?
            rate = '0.00%';
        }
        else {
            rate = (((entry.stats[matchType].wins / (entry.stats[matchType].wins + entry.stats[matchType].losses)) * 100).toFixed(2) + '%');
        }
        lbStr += '<tr><td>' + rank + '</td><td>' + icon + '</td><td>' + rating + '</td><td>' + name + '</td><td>' + wins + '</td><td>' + losses + '</td><td>' + rate + '</td></tr>';
    }
    lbStr += `</table></br>`;

    return lbStr;
}

const teamNames = ["Blue Team", "Orange Team"];

async function addMatchTypeTable(player, thisMatchType) {
    let query = {$or: []};

    for(timestamp in player.stats[thisMatchType].matches) {
        query.$or.push({timestamp:Number(timestamp), id:player.stats[thisMatchType].matches[timestamp]});
    }

    var matches = [];

    if(query.$or.length > 0) {
        // need to query for something
        try{
            matches = await db.collection('matches').find(query).toArray();
        }
        catch(err) {
            console.error(err)
        }
    }
    else {
        return ''; // no matches for this match type
    }

    let headerText;
    switch(thisMatchType) {
        case Player.SIX_MANS_PROPERTY:
            headerText = 'Standard';
            break;
        case Player.FOUR_MANS_PROPERTY:
            headerText = 'Doubles';
            break;
        case Player.TWO_MANS_PROPERTY:
            headerText = 'Solo Duel';
            break;
    }

    const playerRank = getPlayerRankIcon(player.stats[thisMatchType]);
    icon = `<img src="${playerRank.icon}" alt="${playerRank.title}" height="30" width="30">`;

    let changeSymbol; // either + or -
    let changeColor; // either red or green
    if(player.stats[thisMatchType].lastRatingChange < 0) {
        changeSymbol = '-';
        changeColor = 'red';
    }
    else {
        changeSymbol = '+';
        changeColor = 'green';
    }

    let pStr = `
<h2 id="${thisMatchType}" style="float: left; width: 100%;">
    ${headerText} ${icon}
</h2>
<table style="width: 32%">
    <tr>
        <th style="width: 12%">
            Rating
        </th>
        <th style="width: 10%">
            Season Wins
        </th>
        <th style="width: 10%">
            Season Losses
        </th>
        <th style="width: 10%">
            Total Wins
        </th>
        <th style="width: 10%">
            Total Losses
        </th>
    </tr>
    <tr>
        <td>
            ${player.stats[thisMatchType].rating.toFixed(2)} <span style="color: ${changeColor};">${changeSymbol}${Math.abs(player.stats[thisMatchType].lastRatingChange).toFixed(2)}</span>
        </td>
        <td>
            ${player.stats[thisMatchType].wins}
        </td>
        <td>
            ${player.stats[thisMatchType].losses}
        </td>
        <td>
            ${player.stats[thisMatchType].totalWins}
        </td>
        <td>
            ${player.stats[thisMatchType].totalLosses}
        </td>
    </tr>

</table>
<br>
<table>
<tr>
    <th style="width: 9%">
        Timestamp
    </th>
    <th style="width: 2%">
        Match ID
    </th>
    <th style="width: 25%">
        Blue Team
    </th>
    <th style="width: 25%">
        Orange Team
    </th>
    <th style="width: 5%">
        Winning Team
    </th>
    <th style="width: 25%">
        Rating Change
    </th>
</tr>
`;

    if(matches.length > 0) {
        // found some matches
        for(match of matches) {
            //console.log(match);

            // get players for team 1
            let team0String = "";
            for(p of match.teams[0]) {
                let pl = await getPlayerSync(p.id);
                if(pl != null) {
                    team0String += ` <a href='/player?q=${pl._id}'>${pl.name}</a>,`
                }
            }
            if(team0String.length > 0) {
                // erase last comma
                team0String = team0String.replace(/,$/,"");
            }
            // get players for team 2
            let team1String = "";
            for(p of match.teams[1]) {
                let pl = await getPlayerSync(p.id);
                if(pl != null) {
                    team1String += ` <a href='/player?q=${pl._id}'>${pl.name}</a>,`
                }
            }
            if(team1String.length > 0) {
                // erase last comma
                team1String = team1String.replace(/,$/,"");
            }
            const date = new Date(match.timestamp);
            let winningTeamStr;
            if(match.winningTeam < 0) {
                // match canceled or match result was undone
                if(match.canceled) {
                    winningTeamStr = 'Canceled';
                }
                else {
                    winningTeamStr = 'Not reported';
                }
            }
            else {
                winningTeamStr = `${teamNames[match.winningTeam]}`;
            }
            pStr += `<tr>
    <td>
        ${date.getUTCMonth()+1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()} UTC
    </td>
    <td>
        ${match.id}
    </td>
    <td>
        ${team0String}
    </td>
    <td>
        ${team1String}
    </td>
    <td>
        ${winningTeamStr}
    </td>
    <td>
        ${player.stats[thisMatchType].matchRatingChange[match.timestamp].toFixed(3)}
    </td>

    </tr>`
        }
    }

    pStr += '</table>'

    return pStr;
}

function getPlayerRankIcon(matchTypeStats) {
    let best = RANKS[0]; // best rank for this player so far
    if((matchTypeStats.wins + matchTypeStats.losses) < Rating.NUMBER_OF_PLACEMENT_MATCHES) {
        return UNRANKED; // player is unranked
    }
    else {
        // get the icon for this player's rank
        for (r of RANKS) {
            if(matchTypeStats.rating > r.min) {
                best = r;
            }
            else {
                break;
            }
        }
    }
    return best;
}

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

async function getPlayerSync(playerId) {
    const query = {_id: playerId};
    try{
        return await db.collection('players').findOne(query);
    }
    catch(err) {
        console.error(err);
    }
}

// default player ranking
function rankPlayers(p1,p2) {
    if (p1.stats[matchType].rating < p2.stats[matchType].rating) {
        return 1;
    }
    else if (p1.stats[matchType].rating > p2.stats[matchType].rating){
        return -1;
    }
    else
        return 0;
}

function showHelp(req, res) {
    let userCommandPrefix = sixMans.getCommandPrefix();
    const helpString = `<!DOCTYPE html>
<html>
<head>
    <title>
        Private Mans Help
    </title>
    <style>
        ${HEADER_STYLE}
        .cmd {
            font-weight: bold;
        }
    </style>
</head>
<body>
    Note: parameters wrapped in &lt; &gt; are required. Parameters wrapped in [ ] are optional. <br>
    <br>
    Valid commands are:</br>
</br>
<div class="cmd">${userCommandPrefix}3</div>
-add yourself to the standard (3v3) queue</br>
</br>
<div class="cmd">${userCommandPrefix}2</div>
-add yourself to the doubles (2v2) queue</br>
</br>
<div class="cmd">${userCommandPrefix}1</div>
-add yourself to the solo duel (1v1) queue</br>
</br>
    <div class="cmd">${userCommandPrefix}b ${userCommandPrefix}balanced</div>
    -vote for balanced teams</br>
</br>
    <div class="cmd">${userCommandPrefix}c ${userCommandPrefix}captains</div>
    -vote for captains</br>
</br>
    <div class="cmd">${userCommandPrefix}cancel</div>
    -vote to cancel the match you are currently in</br>
</br>
    <span class="cmd">${userCommandPrefix}clear</span> [3 | 2 | 1 | all]<br>
    -clear out the current queue</br>
    -without any additional parameters this will clear the standard queue</br>
    -2 and 1 are optional parameters that specify the doubles and solo duel queues respectively</br>
    -all is another optional parameter that will clear all queues</br>
</br>
    <div class="cmd">${userCommandPrefix}help</div>
    -display help URL</br>
</br>
    <div class="cmd">${userCommandPrefix}l ${userCommandPrefix}leave</div>
    -remove yourself from queue</br>
</br>
    <div class="cmd">${userCommandPrefix}lb ${userCommandPrefix}leaderboard</div>
    -display leaderboard URL</br>
</br>
    <div class="cmd">${userCommandPrefix}matches</div>
    -show ongoing matches</br>
</br>
    <div class="cmd">${userCommandPrefix}new season</div>
    -reset player stats for a new season</br>
</br>
    <div class="cmd">${userCommandPrefix}r ${userCommandPrefix}random</div>
    -vote for random teams</br>
</br>
    <span class="cmd">${userCommandPrefix}report</span> [match ID] &lt; w | l | win | loss &gt;</br>
    -report the result of your match</br>
    -optionally include match ID to report the result of a previous match</br>
</br>
    <div class="cmd">${userCommandPrefix}set</div>
    -valid command parameters are:</br>
        <span class="cmd">${userCommandPrefix}set prefix</span> &lt;new prefix&gt;</br>
</br>
    <div class="cmd">${userCommandPrefix}s ${userCommandPrefix}status</div>
    -show the queue status</br>
</br>
    <div class="cmd">${userCommandPrefix}undo <match ID></div>
    -undo a previously reported result for a match</br>
</body>
</html>`;
    res.send(helpString);
}

function showLeaderboard(req, res, sort) {
    db.collection('players').find({}).toArray((err, result) => {
        if(err) {
            handleDataBaseError(err, 'Error retrieving player stats\n', false);
            res.send("Could not retrieve player statistics. Please wait a minute and try again. If this problem persists, you may contact hubris#2390 on Discord.");
        }
        else {
            var lbStr = `<!DOCTYPE html>
<html>
<head>
<title>
    MAN Leaderboard
</title>
<style>
${HEADER_STYLE}
</style>
</head>
<body>
<span style="float:right">

    Contents:</br>
    <a href='#${Player.SIX_MANS_PROPERTY}'>Jump to Standard</a><br>
    <a href='#${Player.FOUR_MANS_PROPERTY}'>Jump to Doubles</a><br>
    <a href='#${Player.TWO_MANS_PROPERTY}'>Jump to Solo Duel</a><br>
</span><br>
<h1 style="text-align: center; width: 100%">
    Middle Age Noobs Leaderboard
</h1>
`;
            lbStr += addLeaderboardTable(result, sort, Player.SIX_MANS_PROPERTY);
            lbStr += addLeaderboardTable(result, sort, Player.FOUR_MANS_PROPERTY);
            lbStr += addLeaderboardTable(result, sort, Player.TWO_MANS_PROPERTY);

        }
        lbStr += `</body>
</html>`;
        res.send(lbStr);
    });
}

async function showPlayer(req, res, player) {
    var pStr = `<!DOCTYPE html>
<html>
<head>
<title>
    ${player.name} stats
</title>
<style>
${HEADER_STYLE}
</style>
</head>
<body>`;

    pStr += `
<span>
    <h1 style="float:left">
        ${player.name}
    </h1>
    <span style="float:right">
        Contents:</br>
        <a href='#${Player.SIX_MANS_PROPERTY}'>Jump to Standard</a><br>
        <a href='#${Player.FOUR_MANS_PROPERTY}'>Jump to Doubles</a><br>
        <a href='#${Player.TWO_MANS_PROPERTY}'>Jump to Solo Duel</a><br>
    </span>
</span>
</br>
</br>
</br>`;

    try {
        pStr += await addMatchTypeTable(player, Player.SIX_MANS_PROPERTY);
        pStr += await addMatchTypeTable(player, Player.FOUR_MANS_PROPERTY);
        pStr += await addMatchTypeTable(player, Player.TWO_MANS_PROPERTY);
    }
    catch (err) {
        console.error(err);
    }


    pStr += `</body>
</html>`
    res.send(pStr);
}

function sortPlayersByLosses(p1,p2) {
    if (p1.stats[matchType].losses < p2.stats[matchType].losses) {
        return 1;
    }
    else if (p1.stats[matchType].losses > p2.stats[matchType].losses) {
        return -1;
    }
    else
        return 0;
}

function sortPlayersByName(p1,p2) {
    if (p1.name < p2.name) {
        return 1;
    }
    else if (p1.name > p2.name) {
        return -1;
    }
    else
        return 0;
}

function sortPlayersByWinpercentage(p1,p2) {
    let p1Rate, p2Rate;
    if((p1.stats[matchType].wins + p1.stats[matchType].losses) === 0) {
        p1Rate = 0;
    }
    else {
        p1Rate = p1.stats[matchType].wins / (p1.stats[matchType].wins + p1.stats[matchType].losses);
    }

    if((p2.stats[matchType].wins + p2.stats[matchType].losses) === 0) {
        p2Rate = 0;
    }
    else {
        p2Rate = p2.stats[matchType].wins / (p2.stats[matchType].wins + p2.stats[matchType].losses);
    }

    if (p1Rate < p2Rate) {
        return 1;
    }
    else if (p1Rate > p2Rate) {
        return -1;
    }
    else
        return 0;
}

function sortPlayersByWins(p1,p2) {
    if (p1.stats[matchType].wins < p2.stats[matchType].wins) {
        return 1;
    }
    else if (p1.stats[matchType].wins > p2.stats[matchType].wins) {
        return -1;
    }
    else
        return 0;
}

function sortPlayersByWinsMinusLosses(p1, p2) {
    if ((p1.stats[matchType].wins - p1.stats[matchType].losses) < (p2.stats[matchType].wins - p2.stats[matchType].losses)) {
        return 1;
    }
    else if ((p1.stats[matchType].wins - p1.stats[matchType].losses) > (p2.stats[matchType].wins - p2.stats[matchType].losses)){
        return -1;
    }
    else
        return 0;
}

const express = require('express');
const app = express();
const port = config.leaderboardPort;

app.get('/help', (req, res) => {
    showHelp(req, res);
});

app.get('/icons/*.png', (req, res) => {
    let filePath = path.join(__dirname, req.path);
    fs.stat(filePath, (err, stat) => {
        if(err) {
            res.send(`Error: requested file '${req.path}' does not exist.`);
        }
        else {
            res.sendFile(filePath);
        }
    });
});

app.get('/leaderboard', (req, res) => {
    // do any request validation here

    if(req.query.sort == undefined) {
        showLeaderboard(req, res, SORT_BY_RANK);
    }
    else {
        let sort = req.query.sort.toLowerCase();
        switch(sort) {
            case 'name':
                showLeaderboard(req, res, SORT_BY_RANK);
                break;
            case 'wins':
                showLeaderboard(req, res, SORT_BY_WINS);
                break;
            case 'losses':
                showLeaderboard(req, res, SORT_BY_LOSSES);
                break;
            case 'winsminuslosses':
                showLeaderboard(req, res, SORT_BY_WINS_MINUS_LOSSES);
                break;
            case 'winpercentage':
                showLeaderboard(req, res, SORT_BY_WIN_PERCENTAGE);
                break;
            default:
                showLeaderboard(req, res, SORT_BY_RANK);
        }
    }


});

app.get('/player', (req, res) => {
    if(req.query.q != undefined) {
        let qId = req.query.q.replace('"','').replace("'", "").replace('?', '').replace(':', '');
        const query = {_id: qId};
        try{
            db.collection('players').findOne(query, (err, result) => {
                if(err) throw err;
                if(result != null) {
                    // found player with this ID
                    showPlayer(req, res, result);
                }
                else {
                    // did not find player with this ID
                    res.send('Did not find player with ID ' + req.query.q);
                }
            });
        }
        catch(err) {
            console.error(err);
            res.send('Error encountered while searching for ' + req.query.q);
        }
    }
    else {
        res.send('Need to query for specific player ID');
    }

});

app.listen(port, () => console.log(`Listening at  http://localhost:${port}`));
