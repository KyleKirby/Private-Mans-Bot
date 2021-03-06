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
    if (db != null) {
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
    background-color: #171717 !important;
    color: #ffffff;
}

table {
  font-family: arial, sans-serif !important;
  border-collapse: collapse !important;
  width: 100% !important;
}

td, th {
  border: 1px solid #3c3c3c !important;
  text-align: center !important;
  padding: 8px !important;
}

tr:nth-child(even) {
  background-color: #2c2c2c !important;
}

tr:nth-child(odd) {
  background-color: #1f1f1f !important;
}

th {
  background-color: #131313 !important;
}

a:link {
    color: #ffffff !important;
}

a:visited {
    color: #ffffff !important;
}

a:hover {
    color: #ffffff !important;
}

a:active {
    color: #ffffff !important;
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

function addLeaderboardTable(players, sort, nextMatchType) {

    var rank = '#';
    var icon = '';
    var rating = 'Rating';
    var name = 'Name';
    var wins = 'Wins';
    var losses = 'Losses';
    var total = 'Total Played';
    var rate = 'Winrate';
    var change = '+/-';

    // set the match type before sorting
    matchType = nextMatchType;

    players.sort(rankPlayers);

    let count = 1;
    for (entry of players) {
        if ((entry.stats[matchType].wins + entry.stats[matchType].losses) === 0) {
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

    switch (sort) {
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
    let iconURL;
    switch (nextMatchType) {
        case Player.FOUR_MANS_PROPERTY:
            lbHeaderText = 'Doubles';
            iconURL = '/icons/doubles.png';
            break;
        case Player.TWO_MANS_PROPERTY:
            lbHeaderText = 'Solo Duel';
            iconURL = '/icons/solo.png';
            break;
        default:
            lbHeaderText = 'Standard';
            iconURL = '/icons/standard.png';
    }
    let lbStr = `
<h2 class="tableTitle" id="${nextMatchType}" style="float: left; width: 100%; margin-bottom: 0px; padding-left: 3px;">
    <img class="modeIcon" src="${iconURL}">
    ${lbHeaderText}
</h2>
</br>
<table class="leaderboardTable display" data-page-length='50'>
    <thead><tr>
        <th class="nosearch" style="width: 50px;">` + rank + ` </th>
        <th class="nosearch" style="width: 50px;">` + icon + `</th>
        <th style="width: 200px;">` + name + ` </th>
        <th class="nosearch" style="width: 85px;">` + wins + ` </th>
        <th class="nosearch" style="width: 85px;">` + losses + ` </th>
        <th class="nosearch" style="width: 120px;">` + total + ` </th>
        <th class="nosearch" style="width: 90px;">` + rate + ` </th>
        <th class="nosearch" style="width: 75px;">` + rating + ` </th>
        <th class="nosearch" style="width: 50px;">` + change + ` </th>
    </tr></thead><tbody>`;
    for (entry of players) {
        if ((entry.stats[matchType].wins + entry.stats[matchType].losses) === 0) {
            // if this player has not played any matches of this type (this season), skip them
            continue;
        }
        rank = entry.rank.toString();

        const playerRank = getPlayerRankIcon(entry.stats[nextMatchType]);
        let rankIconHeight = '30';
        let rankIconWidth = '30';
        if(playerRank.min >= Rating.GRAND_CHAMPION_1) {
            rankIconWidth = '40';
        }
        else if(playerRank.min == Rating.CHAMPION_3) {
            rankIconWidth = '35';
        }
        icon = `<img src="${playerRank.icon}" alt="${playerRank.title}" height="${rankIconHeight}" width="${rankIconWidth}" style="margin-bottom: 5px;">`;

        let ratingChange;
        if (entry.stats[matchType].lastRatingChange > 0) {
            ratingChange = `<span style="color: green;">+${entry.stats[matchType].lastRatingChange.toFixed(0)}</span>`;
        }
        else if (entry.stats[matchType].lastRatingChange < 0) {
            ratingChange = `<span style="color: red;">${entry.stats[matchType].lastRatingChange.toFixed(0)}</span>`;
        }
        else {
            ratingChange = `+${entry.stats[matchType].lastRatingChange.toFixed(0)}`;
        }
        rating = entry.stats[matchType].rating.toFixed(0);
        name = `<a href='/player?q=${entry._id}'>${entry.name}</a>`;
        wins = entry.stats[matchType].wins.toString();
        losses = entry.stats[matchType].losses.toString();
        total = (entry.stats[matchType].wins + entry.stats[matchType].losses).toString();
        winsMinusLosses = (entry.stats[matchType].wins - entry.stats[matchType].losses).toString();
        if ((entry.stats[matchType].wins + entry.stats[matchType].losses) === 0) {
            // from undo?
            rate = '0.00%';
        }
        else {
            rate = (((entry.stats[matchType].wins / (entry.stats[matchType].wins + entry.stats[matchType].losses)) * 100).toFixed(2) + '%');
        }
        lbStr += '<tr><td>' + rank + '</td><td>' + icon + '</td><td>' + name + '</td><td>' + wins + '</td><td>' + losses + '</td><td>' + total + '</td><td>' + rate + '</td><td>' + rating + '</td><td>' + ratingChange + '</td></tr>';
    }
    lbStr += `</tbody></table></br>`;

    return lbStr;
}

const teamNames = ["Blue Team", "Orange Team"];

async function addMatchTypeTable(player, thisMatchType, season) {
    var moment = require('moment'); // require

    var matches = [];
    let headerText;
    let tSize;
    let iconURL;

    let stats = player.stats[thisMatchType];

    if(season >= 0)
        stats = stats.season[season];

    switch (thisMatchType) {
        case Player.SIX_MANS_PROPERTY:
            headerText = 'Standard';
            tSize = 3;
            iconURL = '/icons/standard.png';
            break;
        case Player.FOUR_MANS_PROPERTY:
            headerText = 'Doubles';
            iconURL = '/icons/doubles.png';
            tSize = 2;
            break;
        case Player.TWO_MANS_PROPERTY:
            headerText = 'Solo Duel';
            iconURL = '/icons/solo.png';
            tSize = 1;
            break;
    }

    let query = { players: { id: String(player._id) }, teamSize: Number(tSize)};

    // Query for player matches
    try {
        matches = await db.collection('matches').find(query).toArray();
    }
    catch (err) {
        console.error(err)
    }

    const playerRank = getPlayerRankIcon(stats);
    let rankIconHeight = '30';
    let rankIconWidth = '30';
    if(playerRank.min >= Rating.GRAND_CHAMPION_1) {
        rankIconWidth = '40';
    }
    else if(playerRank.min == Rating.CHAMPION_3) {
        rankIconWidth = '35';
    }
    icon = `<img src="${playerRank.icon}" alt="${playerRank.title}" height="${rankIconHeight}" width="${rankIconWidth}" style="margin-bottom: 5px;">`;

    let ratingChange;
    let changeColor; // either red or green
    if (player.stats[thisMatchType].lastRatingChange < 0) {
        changeSymbol = '-';
        changeColor = 'red';
    }
    else {
        changeSymbol = '+';
        changeColor = 'green';
    }

    if (stats.lastRatingChange > 0) {
        ratingChange = `<span style="color: green;">+${stats.lastRatingChange.toFixed(2)}</span>`;
    }
    else if (stats.lastRatingChange < 0) {
        ratingChange = `<span style="color: red;">${stats.lastRatingChange.toFixed(2)}</span>`;
    }
    else {
        ratingChange = `+${stats.lastRatingChange.toFixed(2)}`;
    }

    let pStr = `
<span>
    <h1 style="float: left; width: 100%;">
        ${icon} ${player.name}
        <a class="backLink" href="/leaderboard">Leaderboard<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span></a>
    </h1>
</span>
</br>
</br>
</br>
<h2 id="${thisMatchType}" style="float: left; width: 100%;">
    <img class="modeIcon" src="${iconURL}"> ${headerText}
</h2>
<table style="width: 800px !important; margin-bottom: 30px;">
    <thead>
    <tr>
        <th style="width: 12%">
            Rating
        </th>
        <th style="width: 8%">
            Season Wins
        </th>
        <th style="width: 8%">
            Season Losses
        </th>
        <th style="width: 8%">
            Total Wins
        </th>
        <th style="width: 8%">
            Total Losses
        </th>
        <th style="width: 8%">
            Streak
        </th>
    </tr>
    </thead>
    <tbody>
    <tr>
        <td>
            ${stats.rating.toFixed(2)} ${ratingChange}
        </td>
        <td>
            ${stats.wins}
        </td>
        <td>
            ${stats.losses}
        </td>
        <td>
            ${player.stats[thisMatchType].totalWins}
        </td>
        <td>
            ${player.stats[thisMatchType].totalLosses}
        </td>
        <td style="color: ${player.stats[thisMatchType].streak < 0 ? '#205dff' : 'orange'};">
            ${player.stats[thisMatchType].streak}
        </td>
    </tr>
    </tbody>
</table>
<br>
<table class="leaderboardTable display" data-page-length='50'>
<thead>
<tr>
    <th class="nosearch" style="width: 150px;">
        Timestamp
    </th>
    <th class="nosearch" style="width: 80px;">
        Match ID
    </th>
    <th style="width: 300px;">
        Blue Team
    </th>
    <th style="width: 300px;">
        Orange Team
    </th>
    <th class="nosearch" style="width: 125px;">
        Winning Team
    </th>
    <th class="nosearch" style="width: 50px;">
        +/-
    </th>
</tr>
</thead>
<tbody>
`;

    if (matches.length > 0) {
        // found some matches
        for (match of matches) {
            //console.log(match);

            if(!(match.timestamp in stats.matches))
                continue;

            // get players for team 1
            let team0String = "";
            for (p of match.teams[0]) {
                let pl = await getPlayerSync(p.id);
                if (pl != null) {
                    team0String += ` <a href='/player?q=${pl._id}'>${pl.name}</a>,`
                }
            }
            if (team0String.length > 0) {
                // erase last comma
                team0String = team0String.replace(/,$/, "");
            }
            // get players for team 2
            let team1String = "";
            for (p of match.teams[1]) {
                let pl = await getPlayerSync(p.id);
                if (pl != null) {
                    team1String += ` <a href='/player?q=${pl._id}'>${pl.name}</a>,`
                }
            }
            if (team1String.length > 0) {
                // erase last comma
                team1String = team1String.replace(/,$/, "");
            }
            const date = new Date(match.timestamp);
            let winningTeamStr;
            if (match.winningTeam < 0) {
                // match canceled or match result was undone
                if (match.canceled) {
                    winningTeamStr = 'Canceled';
                }
                else {
                    winningTeamStr = 'Not reported';
                }
            }
            else {
                winningTeamStr = `${teamNames[match.winningTeam]}`;
            }

            let dtConverted = moment.utc(date).local();

            let ratingChangeMatch;

            if (stats.matchRatingChange[match.timestamp] == undefined) {
                ratingChangeMatch = ``;
            }
            else if (stats.matchRatingChange[match.timestamp] > 0) {
                ratingChangeMatch = `<span style="color: green;">+${stats.matchRatingChange[match.timestamp].toFixed(2)}</span>`;
            }
            else if (stats.matchRatingChange[match.timestamp] < 0) {
                ratingChangeMatch = `<span style="color: red;">${stats.matchRatingChange[match.timestamp].toFixed(2)}</span>`;
            }
            else {
                ratingChangeMatch = `+${stats.matchRatingChange[match.timestamp].toFixed(2)}`;
            }

            pStr += `<tr>
    <td>
        ${dtConverted.format('L') + ' '  + dtConverted.format('LT')}
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
        ${ratingChangeMatch}
    </td>

    </tr>`
        }
    }

    pStr += '</tbody></table>'

    return pStr;
}

function getPlayerRankIcon(matchTypeStats) {
    let best = Rating.RANKS[0]; // best rank for this player so far
    if ((matchTypeStats.wins + matchTypeStats.losses) < Rating.NUMBER_OF_PLACEMENT_MATCHES) {
        return Rating.UNRANKED; // player is unranked
    }
    else {
        // get the icon for this player's rank
        for (r of Rating.RANKS) {
            if (matchTypeStats.rating > r.min) {
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
    if (exitProcess) {
        try {
            const data = fs.writeFileSync('log.txt', logMessage, { flag: 'a+' });
        }
        catch (err) {
            console.error(err);
        }
        process.exit();
    }
    else {
        try {
            const data = fs.writeFile('log.txt', logMessage, { flag: 'a+' }, (err) => {
                if (err) throw err;
            });
        }
        catch (err) {
            console.error(err);
        }
    }

}

try {
    const mongoOptions = { useUnifiedTopology: true };
    MongoClient.connect(url, mongoOptions, function (err, mdb) {
        if (err) throw err;
        db = mdb.db('sixMans');
    });
}
catch (err) {
    handleDataBaseError(err, 'Error opening mongo db\n', true);
}

async function getPlayerSync(playerId) {
    const query = { _id: playerId };
    try {
        return await db.collection('players').findOne(query);
    }
    catch (err) {
        console.error(err);
    }
}

// default player ranking
function rankPlayers(p1, p2) {
    if (p1.stats[matchType].rating < p2.stats[matchType].rating) {
        return 1;
    }
    else if (p1.stats[matchType].rating > p2.stats[matchType].rating) {
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
<link rel="stylesheet" href="/bootstrap/css/bootstrap.min.css"/>
<link rel="stylesheet" href="/styles/datatables/jquery.dataTables.min.css"/>

<script language="javascript" src="/jquery/jquery.min.js"></script>
<script language="javascript" src="/bootstrap/js/bootstrap.min.js"></script>
<script language="javascript" src="/scripts/jquery.dataTables.min.js"></script>

<script language="javascript" src="/scripts/sub-help.js"></script>
<style>
    ${HEADER_STYLE}
    .cmd {
        font-weight: bold;
    }
</style>
<link rel="stylesheet" href="/styles/help.css"/>
</head>
<body>
<div class="container">
    <div class="topLogo">
        <img src="/styles/images/help_logo.png">
    </div>
<a class="backLink" href="/leaderboard">Leaderboard<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span></a>
</br>
<h2 style="float: left; width: 100%; margin: 0px;">
    Commands
</h2>

<table class="leaderboardTable display" data-page-length='50'>
<thead>
<tr>
    <th class="cmd">
        Command
    </th>
    <th>
        Description
    </th>
</tr>
</thead>
<tbody>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}3</div>
        </td>
        <td>
            Add yourself to the rated standard (3v3) queue.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}2</div>
        </td>
        <td>
            Add yourself to the rated doubles (2v2) queue.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}1</div>
        </td>
        <td>
            Add yourself to the rated solo duel (1v1) queue.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}3u</div>
        </td>
        <td>
            Add yourself to the unrated standard (3v3) queue.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}2u</div>
        </td>
        <td>
            Add yourself to the unrated doubles (2v2) queue.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}1u</div>
        </td>
        <td>
            Add yourself to the unrated solo duel (1v1) queue.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}l ${userCommandPrefix}leave</div>
        </td>
        <td>
            Remove yourself from queue.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}s ${userCommandPrefix}status</div>
        </td>
        <td>
            Show the queue status.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}r ${userCommandPrefix}random</div>
        </td>
        <td>
            Vote for random teams.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}b ${userCommandPrefix}balanced</div>
        </td>
        <td>
            Vote for balanced teams.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}c ${userCommandPrefix}captains</div>
        </td>
        <td>
            Vote for captains.
        </td>
    </tr>
    <tr>
        <td>
            <span class="cmd">${userCommandPrefix}report</span> [match ID] &lt; w | l | win | loss &gt;
        </td>
        <td>
            Report the result of your match.</br>
            Optionally include match ID to report the result of a previous match.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}cancel</div>
        </td>
        <td>
            Vote to cancel the match you are currently in.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}matches</div>
        </td>
        <td>
            Show ongoing matches.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}help</div>
        </td>
        <td>
            Display help URL.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}lb ${userCommandPrefix}leaderboard</div>
        </td>
        <td>
            Display leaderboard URL.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">Admin only commands</div>
        </td>
        <td>

        </td>
    </tr>
    <tr>
        <td>
            <span class="cmd">${userCommandPrefix}clear</span> [3 | 2 | 1 | all]<br>

        </td>
        <td>
            Clear out the current queue.</br>
            Without any additional parameters this will clear the standard queue.</br>
            2 and 1 are optional parameters that specify the doubles and solo duel queues respectively.</br>
            All is another optional parameter that will clear all queues.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}force cancel &ltmatch ID&gt</div>
        </td>
        <td>
            Force cancellation of a match with the specified ID.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}new season</div>
        </td>
        <td>
            Reset player stats for a new season.
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}set</div>
        </td>
        <td>
            Valid command parameters are:</br>
            <span class="cmd" style="padding-left: 20px;">${userCommandPrefix}set prefix</span> &lt;new prefix&gt;
        </td>
    </tr>
    <tr>
        <td>
            <div class="cmd">${userCommandPrefix}undo <match ID></div>
        </td>
        <td>
            Undo a previously reported result for a match.
        </td>
    </tr>
</tbody>
</table>
<span style="padding-bottom: 50px;">Note: parameters wrapped in &lt; &gt; are required. Parameters wrapped in [ ] are optional.</span>

</div>
</body>
</html>`;
    res.send(helpString);
}

function showLeaderboard(req, res, sort) {
    db.collection('players').find({}).toArray((err, result) => {
        if (err) {
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
<link rel="stylesheet" href="/bootstrap/css/bootstrap.min.css"/>
<link rel="stylesheet" href="/styles/datatables/jquery.dataTables.min.css"/>

<script language="javascript" src="/jquery/jquery.min.js"></script>
<script language="javascript" src="/bootstrap/js/bootstrap.min.js"></script>
<script language="javascript" src="/scripts/jquery.dataTables.min.js"></script>

<script language="javascript" src="/scripts/sub-leaderboard.js"></script>
<style>
${HEADER_STYLE}
</style>
<link rel="stylesheet" href="/styles/leaderboard.css"/>
</head>
<body>
<div class="container">
    <div class="topLogo">
        <img src="/styles/images/MAN_logo.png">
        </br>
        <div class="navButtons">
            <ul class="nav nav-pills">
	            <li class="active">
                    <a href="#standard" data-toggle="tab">Standard</a>
	            </li>
	            <li>
                    <a href="#doubles" data-toggle="tab">Doubles</a>
	            </li>
	            <li>
                    <a href="#solo" data-toggle="tab">Solo Duel</a>
	            </li>
            </ul>
        </div>
    </div>
    <div class="helpLinkContainer">
        <a class="helpLink" href="/help">Help<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span></a>
    </div>
    <div class="tab-content clearfix">
`;
            lbStr += `<div class="tab-pane active" id="standard">` + addLeaderboardTable(result, sort, Player.SIX_MANS_PROPERTY) + `</div>`;
            lbStr += `<div class="tab-pane" id="doubles">` + addLeaderboardTable(result, sort, Player.FOUR_MANS_PROPERTY) + `</div>`;
            lbStr += `<div class="tab-pane" id="solo">` + addLeaderboardTable(result, sort, Player.TWO_MANS_PROPERTY) + `</div>`;

        }
        lbStr += `</div></div></body></html>`;
        res.send(lbStr);
    });
}

async function showPlayer(req, res, player) {
    let currentSeasonId = await sixMans.getCurrentSeasonId();
    var pStr = `<!DOCTYPE html>
<html>
<head>
<title>
    MAN Leaderboard | ${player.name}
</title>
<link rel="stylesheet" href="/bootstrap/css/bootstrap.min.css"/>
<link rel="stylesheet" href="/styles/datatables/jquery.dataTables.min.css"/>

<script language="javascript" src="/jquery/jquery.min.js"></script>
<script language="javascript" src="/bootstrap/js/bootstrap.min.js"></script>
<script language="javascript" src="/scripts/jquery.dataTables.min.js"></script>
<script language="javascript" src="/scripts/moment-with-locales.js"></script>

<script language="javascript" src="/scripts/sub-player.js"></script>
<style>
${HEADER_STYLE}
</style>
<link rel="stylesheet" href="/styles/leaderboard.css"/>
</head>
<body>
<div class="container">
    <div class="topLogo">
        <img src="/styles/images/MAN_logo.png">
        </br>
        <div class="navButtons">
            <ul class="nav nav-pills">
            <li class="active">
                <a href="#season${currentSeasonId}" data-toggle="tab">Season ${currentSeasonId}</a>
            </li>
            `;
            for(let i = currentSeasonId - 1; i >= 0; i--)
            {
                pStr += `
                <li>
                    <a href="#season${i}" data-toggle="tab">Season ${i}</a>
	            </li>
                `;
            }
            pStr += `
            </ul>
        </div>
    </div>
<div class="tab-content clearfix">`;

    try {
        pStr += `   <div class="tab-pane active" id="season${currentSeasonId}">
                        <div class="container">
                            <div class="navButtons">
                                <ul class="nav nav-pills">
                                    <li class="active">
                                        <a href="#standard" data-toggle="tab">Standard</a>
                                    </li>
                                    <li>
                                        <a href="#doubles" data-toggle="tab">Doubles</a>
                                    </li>
                                    <li>
                                        <a href="#solo" data-toggle="tab">Solo Duel</a>
                                    </li>
                                </ul>
                            </div>
                            <div class="tab-content clearfix">`;

        pStr += `               <div class="tab-pane active" id="standard">` + await addMatchTypeTable(player, Player.SIX_MANS_PROPERTY, -1) + '</div>';
        pStr += `               <div class="tab-pane" id="doubles">` + await addMatchTypeTable(player, Player.FOUR_MANS_PROPERTY, -1) + '</div>';
        pStr += `               <div class="tab-pane" id="solo">` + await addMatchTypeTable(player, Player.TWO_MANS_PROPERTY, -1) + '</div>';

        pStr += `           </div>
                        </div>
                    </div>`;




        for(let i = currentSeasonId - 1; i >= 0; i--) {
            pStr += `   <div class="tab-pane" id="season${i}">
                            <div class="container">
                                <div class="navButtons">
                                    <ul class="nav nav-pills">
                                        <li class="active">
                                            <a href="#standard${i}" data-toggle="tab">Standard</a>
                                        </li>
                                        <li>
                                            <a href="#doubles${i}" data-toggle="tab">Doubles</a>
                                        </li>
                                        <li>
                                            <a href="#solo${i}" data-toggle="tab">Solo Duel</a>
                                        </li>
                                    </ul>
                                </div>
                                <div class="tab-content clearfix">`;

            pStr += `               <div class="tab-pane active" id="standard${i}">` + await addMatchTypeTable(player, Player.SIX_MANS_PROPERTY, i) + '</div>';
            pStr += `               <div class="tab-pane" id="doubles${i}">` + await addMatchTypeTable(player, Player.FOUR_MANS_PROPERTY, i) + '</div>';
            pStr += `               <div class="tab-pane" id="solo${i}">` + await addMatchTypeTable(player, Player.TWO_MANS_PROPERTY, i) + '</div>';

            pStr += `           </div>
                            </div>
                        </div>`;
        }


    }
    catch (err) {
        console.error(err);
    }


    pStr += `</body>
</html>`
    res.send(pStr);
}

function sortPlayersByLosses(p1, p2) {
    if (p1.stats[matchType].losses < p2.stats[matchType].losses) {
        return 1;
    }
    else if (p1.stats[matchType].losses > p2.stats[matchType].losses) {
        return -1;
    }
    else
        return 0;
}

function sortPlayersByName(p1, p2) {
    if (p1.name < p2.name) {
        return 1;
    }
    else if (p1.name > p2.name) {
        return -1;
    }
    else
        return 0;
}

function sortPlayersByWinpercentage(p1, p2) {
    let p1Rate, p2Rate;
    if ((p1.stats[matchType].wins + p1.stats[matchType].losses) === 0) {
        p1Rate = 0;
    }
    else {
        p1Rate = p1.stats[matchType].wins / (p1.stats[matchType].wins + p1.stats[matchType].losses);
    }

    if ((p2.stats[matchType].wins + p2.stats[matchType].losses) === 0) {
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

function sortPlayersByWins(p1, p2) {
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
    else if ((p1.stats[matchType].wins - p1.stats[matchType].losses) > (p2.stats[matchType].wins - p2.stats[matchType].losses)) {
        return -1;
    }
    else
        return 0;
}

const express = require('express');
const app = express();
const port = config.leaderboardPort;

app.use("/scripts", express.static(path.join(__dirname, '/scripts')));
app.use("/styles", express.static(path.join(__dirname, '/styles')));
app.use("/bootstrap", express.static(path.join(__dirname, '/node_modules/bootstrap/dist')));
app.use("/jquery", express.static(path.join(__dirname, '/node_modules/jquery/dist')));
app.use('/fonts/', express.static(path.join(__dirname, 'build/fonts')));

app.get('/help', (req, res) => {
    showHelp(req, res);
});

app.get('/icons/*.png', (req, res) => {
    let filePath = path.join(__dirname, req.path);
    fs.stat(filePath, (err, stat) => {
        if (err) {
            res.send(`Error: requested file '${req.path}' does not exist.`);
        }
        else {
            res.sendFile(filePath);
        }
    });
});

app.get('/leaderboard', (req, res) => {

    // do any request validation here

    if (req.query.sort == undefined) {
        showLeaderboard(req, res, SORT_BY_RANK);
    }
    else {
        let sort = req.query.sort.toLowerCase();
        switch (sort) {
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
    if (req.query.q != undefined) {
        let qId = req.query.q.replace('"', '').replace("'", "").replace('?', '').replace(':', '');
        const query = { _id: qId };
        try {
            db.collection('players').findOne(query, (err, result) => {
                if (err) throw err;
                if (result != null) {
                    // found player with this ID
                    showPlayer(req, res, result);
                }
                else {
                    // did not find player with this ID
                    res.send('Did not find player with ID ' + req.query.q);
                }
            });
        }
        catch (err) {
            console.error(err);
            res.send('Error encountered while searching for ' + req.query.q);
        }
    }
    else {
        res.send('Need to query for specific player ID');
    }

});

app.listen(port, () => console.log(`Listening at  http://localhost:${port}`));
