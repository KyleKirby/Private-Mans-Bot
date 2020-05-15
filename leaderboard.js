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


const express = require('express');
const app = express();
const port = config.leaderboardPort;

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

function showLeaderboard(req, res) {



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

            players.sort(rankPlayers);

            lbStr += '<tr><th>' + rank + '</th><th>' + name + '</th><th>' + wins + '</th><th>' + losses + '</th><th>' + winsMinusLosses + '</th><th>' + rate + '</th></tr>';
            var count = 1;
            for(entry of players) {
                rank = count.toString();
                name = entry.name;
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

app.get('/leaderboard', (req, res) => {
    // do any request validation here
    showLeaderboard(req,res);
});



app.listen(port, () => console.log(`Listening at  http://localhost:${port}`));
