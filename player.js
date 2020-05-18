

const SIX_MANS_PROPERTY = 'six';
const FOUR_MANS_PROPERTY = 'four';
const TWO_MANS_PROPERTY = 'two';

const defaultOptionProperties = [SIX_MANS_PROPERTY, FOUR_MANS_PROPERTY, TWO_MANS_PROPERTY];

function Player(member, options) {

    if(!(this instanceof Player)) {
        return new Player(member, options);
    }

    if(options == undefined) {
        // no options were supplied
        options = {six: {wins: 0, losses: 0, matches: {}}, four: {wins: 0, losses: 0, matches: {}}, two: {wins: 0, losses: 0, matches: {}}}
        //options = {wins: 0, losses: 0, matches: {}};
    }
    else {
        // some options were specified, replace missing options with defaults
        for(prop of defaultOptionProperties) {
            if(!(prop in options)) {
                options[prop] = {wins: 0, losses: 0, matches: {}};
            }
            else {
                if(!('wins' in options[prop])) {
                    options[prop].wins = 0;
                }
                if(!('losses' in options[prop])) {
                    options[prop].losses = 0;
                }
                if(!('matches' in options[prop])) {
                    options[prop].matches = {}; // {timestamp: match.id} // map from match timestamp to match id (time stamp is guaranteed to be unique between matches, ID is not)
                }
            }
        }
    }

    this._id = member.id;
    this.name = member.displayName;
    this.stats = options;
};

module.exports = {
    Player: Player,
    SIX_MANS_PROPERTY: SIX_MANS_PROPERTY,
    FOUR_MANS_PROPERTY: FOUR_MANS_PROPERTY,
    TWO_MANS_PROPERTY, TWO_MANS_PROPERTY
};
