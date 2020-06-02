# Private-Mans-Bot

Here is some relevant information to get you up and running with this bot. I'd also like to mention now that this bot has been implemented in such a way as to only work on *one* Discord server at a time.

## Dependencies:

### discord.js
```npm install discord.js```

### mongoDB
https://docs.mongodb.com/manual/installation/


### Config
As you may see in some of the source files (such as index.js), there are require statements looking for 'config.js'. However, this file is not tracked by version control since it contains the token to use for the bot.

Here is a template you may use to create your own 'config.js' file. Put it in the root directory of the git repo.

```
module.exports = {
    TOKEN: '', // your private token for the Discord bot
    
    SIX_MANS_CATAGORY: '', // catagory to create new voice channels in
    QUEUE_CHANNEL: '', // voice channel to put players into after a match is finished
    SIX_MANS_ROLE: '', // role used for deciding who can execute 'admin' commands such as 'undo'
    
    SIX_MANS_MAX_QUEUE_SIZE: 6, // max players to allow in a queue before starting a match
    SIX_MANS_TEAM_SIZE:3,
    SIX_MANS_MIN_VOTE_COUNT: 2, // need more than this number of votes in order to select the team selection method

    FOUR_MANS_MAX_QUEUE_SIZE: 4, // max players to allow in a queue before starting a match
    FOUR_MANS_TEAM_SIZE: 2,
    FOUR_MANS_MIN_VOTE_COUNT: 1, // need more than this number of votes in order to select the team selection method

    TWO_MANS_MAX_QUEUE_SIZE: 2, // max players to allow in a queue before starting a match
    TWO_MANS_TEAM_SIZE: 1,

    serverIP: 'localhost', // used when displaying the URL of the leaderboard/help pages
    leaderboardPort: 8080 // used to determine which port to host the website on
}
```

