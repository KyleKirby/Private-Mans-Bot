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


    // return the new score for player A = (current rating) + (K value) * (score + (expected score))
    return kA*(sA-eA);
}

/*
These K values are a multiplier on the amount of MMR a player gains/losses each match.
You can consider these to be 'uncertainty' values.

A recommended 'high' K value is 40, but that is for players with less than 30 matches.

Since we want to have only 10 placement matches, lets try a higher 'high' K value instead.

*/
const K_HIGH = 120; // for placement matches
const K_MID = 20; // for low to mid tier players (below GC)
const K_LOW = 10; // for high tier players (above GC) NOTE: for now this is not used

const NUMBER_OF_PLACEMENT_MATCHES = 10;

// for now there will only be 2 values, high or mid
exports.getK = function getK(rating, totalMatches) {
    if(rating < 1515 && totalMatches < NUMBER_OF_PLACEMENT_MATCHES) {
        return K_HIGH;
    }
    else /*if(rating < 1501)*/ {
        return K_MID;
    } /*
    else {
        // rating >= 1501
        return K_LOW;
    }*/
}


exports.NUMBER_OF_PLACEMENT_MATCHES = NUMBER_OF_PLACEMENT_MATCHES;

// ranks
exports.BRONZE_1 = 0;
exports.BRONZE_2 = 190;
exports.BRONZE_3 = 247;
exports.SILVER_1 = 310;
exports.SILVER_2 = 369;
exports.SILVER_3 = 429;
exports.GOLD_1 = 490;
exports.GOLD_2 = 550;
exports.GOLD_3 = 612;
exports.PLATINUM_1 = 692;
exports.PLATINUM_2 = 772;
exports.PLATINUM_3 = 852;
exports.DIAMOND_1 = 933;
exports.DIAMOND_2 = 1012;
exports.DIAMOND_3 = 1095;
exports.CHAMPION_1 = 1195;
exports.CHAMPION_2 = 1295;
exports.CHAMPION_3 = 1395;
exports.GRAND_CHAMPION = 1515;
