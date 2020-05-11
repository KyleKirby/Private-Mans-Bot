

const config = require('./config.js');
const Discord = require('discord.js');
const client = new Discord.Client();

var sixMans = require('./sixMans');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    let commandPrefix = sixMans.getCommandPrefix();
    if(msg.content[0] === commandPrefix)
    {
      msg.content = msg.content.slice(commandPrefix.length);
      sixMans.handleUserCommand(client, msg);
    }
});

client.login(config.TOKEN);

/*
function handleExit() {
    console.trace("Stack trace at exit:");
}

process.on('exit', handleExit);

//catches uncaught exceptions
process.on('uncaughtException', handleExit);
*/
