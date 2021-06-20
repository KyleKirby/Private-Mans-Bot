/*
See https://en.wikipedia.org/wiki/Elo_rating_system#Mathematical_details
for more information about the equations used here.

*/

// winning player receives score of 1
// losing player receives score of 0
exports.loss = 0;
exports.win = 1;


exports.calculateRatingChange = function calculateRatingChange(rA, rB, kA, sA) {
    // ratings = {rA:rating A, rB:rating B, kA:k-value A, kB:k-value B, sA:score A, sB:score B}
    const qA = 10**(rA/400);
    const qB = 10**(rB/400);
    const eA = qA/(qA+qB); // player A expected score
    const eB = qB/(qA+qB); // player B expected score
/*
    console.log(`
rA ${rA}
rB ${rB}
kA ${kA}
sA ${sA}
qA ${qA}
qB ${qB}
eA ${eA}
eB ${eB}
kA*(sA-eA) = ${kA*(sA-eA)}
`);
*/
    // return the new score for player A = (current rating) + (K value) * (score + (expected score))
    return kA*(sA-eA);
}

/*
These K values are a multiplier on the amount of MMR a player gains/losses each match.
You can consider these to be 'uncertainty' values.

A recommended 'high' K value is 40, but that is for players with less than 30 matches.

Since we want to have only 10 placement matches, lets try a higher 'high' K value instead.

*/
const K_HIGH = 40; // for placement matches
const K_MID = 20; // for low to mid tier players (below GC)
const K_LOW = 10; // for high tier players (above GC) NOTE: for now this is not used

const NUMBER_OF_PLACEMENT_MATCHES = 10;
const MAX_STREAK = 5;

// if a player has not played placement matches they are given more volatility
// if a player is on a win streak or a lose streak they will begin to experience more volatility (capped at MAX_STREAK)
exports.getK = function getK(rating, totalMatches, streak) {
    streak = Math.abs(streak);
    if(streak > 5)
        streak = 5;
    if(totalMatches < NUMBER_OF_PLACEMENT_MATCHES) {
        return K_HIGH * (streak);
    }
    else {
        return K_MID * (streak);
    }
}


exports.NUMBER_OF_PLACEMENT_MATCHES = NUMBER_OF_PLACEMENT_MATCHES;

// ranks
exports.BRONZE_1 = 0;
exports.BRONZE_2 = 160;
exports.BRONZE_3 = 220;
exports.SILVER_1 = 280;
exports.SILVER_2 = 340;
exports.SILVER_3 = 400;
exports.GOLD_1 = 460;
exports.GOLD_2 = 520;
exports.GOLD_3 = 580;
exports.PLATINUM_1 = 640;
exports.PLATINUM_2 = 700;
exports.PLATINUM_3 = 760;
exports.DIAMOND_1 = 820;
exports.DIAMOND_2 = 900;
exports.DIAMOND_3 = 980;
exports.CHAMPION_1 = 1060;
exports.CHAMPION_2 = 1180;
exports.CHAMPION_3 = 1300;
exports.GRAND_CHAMPION_1 = 1420;
exports.GRAND_CHAMPION_2 = 1560;
exports.GRAND_CHAMPION_3 = 1700;
exports.SUPERSONIC_LEGEND = 1860;

/*
// check if these role match with MAN role ids
exports.RANKS = [
    { title: 'Bronze 1', min: exports.BRONZE_1, icon: '/icons/bronze1.png', role: '415455534901100545' },
    { title: 'Bronze 2', min: exports.BRONZE_2, icon: '/icons/bronze2.png', role: '415458199110680576' },
    { title: 'Bronze 3', min: exports.BRONZE_3, icon: '/icons/bronze3.png', role: '415459042790735873' },
    { title: 'Silver 1', min: exports.SILVER_1, icon: '/icons/silver1.png', role: '415460179165970444' },
    { title: 'Silver 2', min: exports.SILVER_2, icon: '/icons/silver2.png', role: '415460151873765378' },
    { title: 'Silver 3', min: exports.SILVER_3, icon: '/icons/silver3.png', role: '415460111826288650' },
    { title: 'Gold 1', min: exports.GOLD_1, icon: '/icons/gold1.png', role: '415459928308842496' },
    { title: 'Gold 2', min: exports.GOLD_2, icon: '/icons/gold2.png', role: '415459901255581706' },
    { title: 'Gold 3', min: exports.GOLD_3, icon: '/icons/gold3.png', role: '415459842866675712' },
    { title: 'Platinum 1', min: exports.PLATINUM_1, icon: '/icons/platinum1.png', role: '415459629762478090' },
    { title: 'Platinum 2', min: exports.PLATINUM_2, icon: '/icons/platinum2.png', role: '415459588180279297' },
    { title: 'Platinum 3', min: exports.PLATINUM_3, icon: '/icons/platinum3.png', role: '415459474824888321' },
    { title: 'Diamond 1', min: exports.DIAMOND_1, icon: '/icons/diamond1.png', role: '415459256016568342' },
    { title: 'Diamond 2', min: exports.DIAMOND_2, icon: '/icons/diamond2.png', role: '415459221660893185' },
    { title: 'Diamond 3', min: exports.DIAMOND_3, icon: '/icons/diamond3.png', role: '415459170456961025' },
    { title: 'Champion 1', min: exports.CHAMPION_1, icon: '/icons/champ1.png', role: '415459007474696194' },
    { title: 'Champion 2', min: exports.CHAMPION_2, icon: '/icons/champ2.png', role: '415458847529107457' },
    { title: 'Champion 3', min: exports.CHAMPION_3, icon: '/icons/champ3.png', role: '415458733410353172' },
    { title: 'Grand Champion 1', min: exports.GRAND_CHAMPION_1, icon: '/icons/GrandChamp1.png', role: '415458302466588672' },
    { title: 'Grand Champion 2', min: exports.GRAND_CHAMPION_2, icon: '/icons/GrandChamp2.png', role: '750825700830871695' },
    { title: 'Grand Champion 3', min: exports.GRAND_CHAMPION_3, icon: '/icons/GrandChamp3.png', role: '750825780493156433' },
    { title: 'Supersonic Legend', min: exports.SUPERSONIC_LEGEND, icon: '/icons/SupersonicLegend.png', role: '750826797330858025' }
];
*/

exports.RANKS = [
    { title: 'Bronze 1', min: exports.BRONZE_1, icon: '/icons/bronze1.png', role: '855126988594872330' },
    { title: 'Bronze 2', min: exports.BRONZE_2, icon: '/icons/bronze2.png', role: '855127049802743869' },
    { title: 'Bronze 3', min: exports.BRONZE_3, icon: '/icons/bronze3.png', role: '855127077418172437' },
    { title: 'Silver 1', min: exports.SILVER_1, icon: '/icons/silver1.png', role: '855127099105869835' },
    { title: 'Silver 2', min: exports.SILVER_2, icon: '/icons/silver2.png', role: '855127129707773962' },
    { title: 'Silver 3', min: exports.SILVER_3, icon: '/icons/silver3.png', role: '855127149521666099' },
    { title: 'Gold 1', min: exports.GOLD_1, icon: '/icons/gold1.png', role: '855127175200112651' },
    { title: 'Gold 2', min: exports.GOLD_2, icon: '/icons/gold2.png', role: '855127194799570975' },
    { title: 'Gold 3', min: exports.GOLD_3, icon: '/icons/gold3.png', role: '855127212968509450' },
    { title: 'Platinum 1', min: exports.PLATINUM_1, icon: '/icons/platinum1.png', role: '855127231939870722' },
    { title: 'Platinum 2', min: exports.PLATINUM_2, icon: '/icons/platinum2.png', role: '855127268271063041' },
    { title: 'Platinum 3', min: exports.PLATINUM_3, icon: '/icons/platinum3.png', role: '855127283383140382' },
    { title: 'Diamond 1', min: exports.DIAMOND_1, icon: '/icons/diamond1.png', role: '855127297778384916' },
    { title: 'Diamond 2', min: exports.DIAMOND_2, icon: '/icons/diamond2.png', role: '855127312651649074' },
    { title: 'Diamond 3', min: exports.DIAMOND_3, icon: '/icons/diamond3.png', role: '855127380570144789' },
    { title: 'Champion 1', min: exports.CHAMPION_1, icon: '/icons/champ1.png', role: '855127402712006666' },
    { title: 'Champion 2', min: exports.CHAMPION_2, icon: '/icons/champ2.png', role: '855127434294591518' },
    { title: 'Champion 3', min: exports.CHAMPION_3, icon: '/icons/champ3.png', role: '855127470361542656' },
    { title: 'Grand Champion 1', min: exports.GRAND_CHAMPION_1, icon: '/icons/GrandChamp1.png', role: '855127490258534400' },
    { title: 'Grand Champion 2', min: exports.GRAND_CHAMPION_2, icon: '/icons/GrandChamp2.png', role: '855127533426442240' },
    { title: 'Grand Champion 3', min: exports.GRAND_CHAMPION_3, icon: '/icons/GrandChamp3.png', role: '855127552938999828' },
    { title: 'Supersonic Legend', min: exports.SUPERSONIC_LEGEND, icon: '/icons/SupersonicLegend.png', role: '855127577537937419' }
];

exports.UNRANKED = { title: 'Unranked', min: exports.BRONZE_1, icon: '/icons/unranked.png', role: '415462517029076992' };

exports.getHighestRank = function getHighestRank(roles) {
    // return the highest rank found
    let highestRank = exports.RANKS[0]; // default is unranked

    for (let rank of exports.RANKS) {
        if(roles.has(rank.role) === true) {
            highestRank = rank;
        }
    }

    return highestRank;
}
