const mongo = require('mongodb');
const fs = require('fs');
const config = require('./config');


var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
// mongo db
var db = null;

function handleExit() {
    if(db != null) {
        db.close();
    }
}

const SORT_BY_RANK = 0;
const SORT_BY_NAME = 1;
const SORT_BY_WINS = 2;
const SORT_BY_LOSSES = 3;
const SORT_BY_WINS_MINUS_LOSSES = 4;
const SORT_BY_WIN_PERCENTAGE = 5;

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
    if ((p1.wins - p1.losses) < (p2.wins - p2.losses)) {
        return 1;
    }
    else if ((p1.wins - p1.losses) > (p2.wins - p2.losses)){
        return -1;
    }
    else
        return 0;
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
<style>
table {
  font-family: arial, sans-serif;
  border-collapse: collapse;
  width: 100%;
}

td, th {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 8px;
}

tr:nth-child(even) {
  background-color: #dddddd;
}
</style>
</head>
<body>
<table>`;
            const rankPadding = 5;
            const namePadding = 40;
            const numberPadding = 10;
            const padding = ' ';
            var rank = '#'.padEnd(rankPadding, padding);
            var name = 'Name'.padEnd(namePadding, padding);
            var wins = 'Wins'.padEnd(numberPadding, padding);
            var losses = 'Losses'.padEnd(numberPadding, padding);
            var winsMinusLosses = '+/-'.padEnd(numberPadding, padding);
            var rate = '%'.padEnd(numberPadding, padding);

            var players = [];
            //console.log(result);
            players = result;

            /*
            const SORT_BY_RANK = 0;
            const SORT_BY_NAME = 1;
            const SORT_BY_WINS = 2;
            const SORT_BY_LOSSES = 3;
            const SORT_BY_WINS_MINUS_LOSSES = 4;
            const SORT_BY_WIN_PERCENTAGE = 5;
            */
            switch(sort){
                case SORT_BY_RANK:
                    players.sort(rankPlayers);
                    break;
                case SORT_BY_NAME:
                    players.sort(sortPlayersBynames);
                    break;
                case SORT_BY_WINS:
                    players.sort(sortPlayersByWins);
                    break;
                case SORT_BY_LOSSES:
                    players.sort(sortPlayersByLosses);
                    break;
                case SORT_BY_WINS_MINUS_LOSSES:
                    players.sort(sortPlayersByWinsMinusLosses);
                    break;
                case SORT_BY_WIN_PERCENTAGE:
                    players.sort(sortPlayersByWinpercentage);
                    break;
            }

            lbStr += `<tr><th>` + rank + `<a href='/leaderboard?sort=rank'>&#8659;</a> </th><th>` + name + ` <a href='/leaderboard?sort=name'>&#8659;</a> </th><th>` + wins + ` <a href='/leaderboard?sort=wins'>&#8659;</a> </th><th>` + losses + ` <a href='/leaderboard?sort=losses'>&#8659;</a> </th><th>` + winsMinusLosses + ` <a href='/leaderboard?sort=winsminuslosses'>&#8659;</a> </th><th>` + rate + ` <a href='/leaderboard?sort=winpercentage'>&#8659;</a> </th></tr>`;
            var count = 1;
            for(entry of players) {
                rank = count.toString();
                name = `<a href='/player?q=${entry._id}'>${entry.name}</a>`;
                wins = entry.wins.toString();
                losses = entry.losses.toString();
                winsMinusLosses = (entry.wins - entry.losses).toString();
                if((entry.wins + entry.losses) === 0) {
                    // from undo?
                    rate = '0.00%';
                }
                else {
                    rate = (((entry.wins / (entry.wins + entry.losses)) * 100).toFixed(2) + '%');
                }
                lbStr += '<tr><td>' + rank + '</td><td>' + name + '</td><td>' + wins + '</td><td>' + losses + '</td><td>' + winsMinusLosses + '</td><td>' + rate + '</td></tr>';
                count++;
            }
        }
        lbStr+=`</table>
</body>
</html>`;
        res.send(lbStr);
    });
}

async function showPlayer(req, res, player) {
    var pStr = `<!DOCTYPE html>
<html>
<head>
<style>
table {
  font-family: arial, sans-serif;
  border-collapse: collapse;
  width: 100%;
}

td, th {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 8px;
}

tr:nth-child(even) {
  background-color: #dddddd;
}
</style>
</head>
<body>`;

    pStr += `<h1>${player.name}</h1>
<table>
<tr>
    <th>
        Timestamp
    </th>
    <th>
        Match ID
    </th>
    <th>
        Team 1
    </th>
    <th>
        Team 2
    </th>
    <th>
        Winning Team
    </th>
</tr>`;


    // build query for player matches
    let query = {$or: []};
    for(timestamp in player.matches) {
        query.$or.push({timestamp:Number(timestamp), id:player.matches[timestamp]});
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
            pStr += `<tr>
    <td>
        ${match.timestamp}
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
        Team ${match.winningTeam+1}
    </td>

</tr>`
        }
    }

    pStr += '</table>'


    pStr += `</body>
</html>`
    res.send(pStr);
}

function sortPlayersByLosses(p1,p2) {
    if (p1.losses < p2.losses) {
        return 1;
    }
    else if (p1.losses > p2.losses) {
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
    if((p1.wins + p1.losses) === 0) {
        p1Rate = 0;
    }
    else {
        p1Rate = p1.wins / (p1.wins + p1.losses);
    }

    if((p2.wins + p2.losses) === 0) {
        p2Rate = 0;
    }
    else {
        p2Rate = p2.wins / (p2.wins + p2.losses);
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
    if (p1.wins < p2.wins) {
        return 1;
    }
    else if (p1.wins > p2.wins) {
        return -1;
    }
    else
        return 0;
}

function sortPlayersByWinsMinusLosses(p1, p2) {
    return rankPlayers(p1, p2);
}

const express = require('express');
const app = express();
const port = config.leaderboardPort;

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
