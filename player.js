

const SIX_MANS_PROPERTY = 'six';
const FOUR_MANS_PROPERTY = 'four';
const TWO_MANS_PROPERTY = 'two';

const STARTING_RATING = 100;

// if you add a field here, make sure you add it to the if statements below...
const DEFAULT_OPTIONS_PER_MATCH_TYPE = {wins: 0, losses: 0, matches: {}, rating: STARTING_RATING, matchRatingChange: {}, lastRatingChange: 0, totalWins: 0, totalLosses: 0, streak: 0, season: {}};

const defaultOptionProperties = [SIX_MANS_PROPERTY, FOUR_MANS_PROPERTY, TWO_MANS_PROPERTY];

function Player(member, options) {

    if(!(this instanceof Player)) {
        return new Player(member, options);
    }

    if(options == undefined) {
        // no options were supplied
        options = {six: DEFAULT_OPTIONS_PER_MATCH_TYPE,
                four: DEFAULT_OPTIONS_PER_MATCH_TYPE,
                two: DEFAULT_OPTIONS_PER_MATCH_TYPE};
    }
    else {
        // some options were specified, replace missing options with defaults
        for(prop of defaultOptionProperties) {
            if(!(prop in options)) {
                options[prop] = DEFAULT_OPTIONS_PER_MATCH_TYPE;
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
                if(!('rating' in options[prop])) {
                    options[prop].rating = STARTING_RATING;
                }
                if(!('matchRatingChange' in options[prop])) {
                    options[prop].matchRatingChange = {}; // map match timestamp to rating change, this is used for undoing this match's rating change later if needed
                }
                if(!('lastRatingChange' in options[prop])) {
                    options[prop].lastRatingChange = 0; // for use in leaderboard in case people care about the last change to their MMR
                }
                if(!('totalWins' in options[prop])) {
                    options[prop].totalWins = 0; // for use in leaderboard in case people care about the last change to their MMR
                }
                if(!('totalLosses' in options[prop])) {
                    options[prop].totalLosses = 0; // for use in leaderboard in case people care about the last change to their MMR
                }
                if(!('streak' in options[prop])) {
                    options[prop].streak = 0; // win/loss streak
                }
                if(!('season' in options[prop])) {
                    options[prop].season = {}; // map season id to season player stats
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
    TWO_MANS_PROPERTY: TWO_MANS_PROPERTY,
    STARTING_RATING: STARTING_RATING
};
