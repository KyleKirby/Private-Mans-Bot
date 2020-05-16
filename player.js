
function Player(member, options) {

    if(!(this instanceof Player)) {
        return new Player(member, options);
    }

    if(options == undefined) {
        // no options were supplied
        options = {wins: 0, losses: 0, matches: {}};
    }
    else {
        // some options were specified, replace missing options with defaults
        if(!('wins' in options)) {
            options.wins = 0;
        }
        if(!('losses' in options)) {
            options.losses = 0;
        }
        if(!('matches' in options)) {
            options.matches = {};
        }
    }

    this._id = member.id;
    this.name = member.displayName;
    this.wins = options.wins;
    this.losses = options.losses;
    this.matches = options.matches; // {timestamp: match.id} // map from match timestamp to match id (time stamp is guaranteed to be unique between matches, ID is not)

};

module.exports = Player;
