
function Player(member, options) {

    if(!(this instanceof Player)) {
        return new Player(member, options);
    }

    if(options == undefined) {
        // no options were supplied
        options = {wins: 0, losses: 0};
    }
    else {
        // some options were specified
        if(!('wins' in options)) {
            options.wins = 0;
        }
        if(!('losses' in options)) {
            options.losses = 0;
        }
    }

    this._id = member.id;
    this.name = member.displayName;
    this.wins = options.wins;
    this.losses = options.losses;
};

module.exports = Player;
