const deck = ['3c', '3d', '3h', '3s', '4c', '4d', '4h', '4s', '5c', '5d', '5h', '5s', '6c', '6d', '6h', '6s', '14j', '14j', '14j', '14j', '14j', '14j', '14j', '14j'];
/*
    let deck = ['2c', '2d', '2h', '2s', '3c', '3d', '3h', '3s', '4c', '4d', '4h', '4s',
                '5c', '5d', '5h', '5s', '6c', '6d', '6h', '6s', '7c', '7d', '7h', '7s',
                '8c', '8d', '8h', '8s', '9c', '9d', '9h', '9s', '10c', '10d', '10h', '10s',
                '11c', '11d', '11h', '11s', '12c', '12d', '12h', '12s', '13c', '13d', '13h', '13s',
                '14j', '14j', '15c', '15d', '15h', '15s'];
    */

const { getRandomInt } = require("../../utils");

// dic of userIDs to usernames for quick look-up
const createUserIdsToUsernames = (usernameToId) => {
    return Object.keys(usernameToId).reduce((acc, cur) => {
        acc[usernameToId[cur]] = cur;
        return acc;
    }, {});
};

const pickManager = (usernames, usernameToId) => {
    const username = usernames[getRandomInt(usernames.length)];
    return usernameToId[username];
};

const pickBackup = (usernames, usernameToId, managerPlayerID) => {
    const managerKeyValTuple = Object.entries(usernameToId).find((keyValTuple) => keyValTuple[1] === managerPlayerID);
    if (managerKeyValTuple === undefined) {
        console.log("Error!");
        throw new Error("managerPlayerID not found in usernameToId");
    }

    const usernamesMinusManager = usernames.filter((username) => username !== managerKeyValTuple[0]);
    const backup = usernamesMinusManager[getRandomInt(usernamesMinusManager.length)];
    return usernameToId[backup];
};

//makes the deck based on the deckSize (number of decks param) and shuffles it
const makeDeck = (numDecks) => { //14 is for the 2 jokers
    const newDeck = [];
    let sumDeck = [];

    for (let i = 0; i < numDecks; i++) {
        sumDeck = sumDeck.concat(deck);
    }
    while (sumDeck.length > 0) {
        let ran = Math.floor((Math.random() * sumDeck.length));
        newDeck.push(sumDeck[ran]);
        sumDeck.splice(ran, 1);
    }
    return newDeck;
};

//sort hand, lowest to highest/joker
const sortHand = (hand) => {
    let sortedHand = [];
    for (let i = 0; i < hand.length; i++) {
        if (sortedHand.length === 0) {
            sortedHand.push(hand[0]);
        } else {
          let tmp = sortedHand.length;
          for (let j = 0; j < tmp; j++) {
              if ( (parseInt(hand[i].slice(0, hand[i].length - 1))) <=
                   (parseInt(sortedHand[j].slice(0, sortedHand[j].length - 1))) ) {
                   sortedHand.splice(j, 0, hand[i]);
                   break;
              } else if (j === sortedHand.length - 1) {
                   sortedHand.splice(j+1, 0, hand[i]);
              }
          }
        }
    }
    return sortedHand;
};

const whoWonBattle = (battleStack_Moves, higherIsBetter) => {
    let plays = [];
    let wilds = [];
    let firstWildAlreadyPlayed = false;
    for (let i = 0; i < battleStack_Moves.length; i++) { //only keep played moves when calculating winner
        if (battleStack_Moves[i][1] === "play") {
            plays.push(battleStack_Moves[i]);
        } else if (battleStack_Moves[i][1] === "wild") { //wild 9 was played, update higherIsBetter, will affect battle result
            higherIsBetter = !higherIsBetter;
            if (firstWildAlreadyPlayed) { //correct any other wild cards after first wild card
                if (higherIsBetter) { //all wild cards coming in will be of same value, we DONT want this
                    battleStack_Moves[i][0][0] = "wild_H";
                } else {
                    battleStack_Moves[i][0][0] = "wild_L";
                }
            }
            firstWildAlreadyPlayed = true;
            wilds.push(battleStack_Moves[i]); // can have a tie if all people play a wild card in battle
        } // else {
        // outofcards is a valid move: when player runs out of cards during battle
        //}
    }
    let winner = [];
    if (plays.length >= 1) { //now go through stack and see who won, there could be a tie
        winner = [plays[0]]; //start off assuming this player is winner
        plays.splice(0, 1); //remove start-off winner player
        for (let i = 0; i < plays.length; i++) { //look through rest and compare
            let leadingCard = winner[0][0][0]; //string ex. "12c"
            let curCard = plays[i][0][0]; //string ex. "12c"
            leadingCard = parseInt( leadingCard.substr(0, leadingCard.length - 1) ); //card value
            curCard = parseInt( curCard.substr(0, curCard.length - 1) ); //card value
            if (curCard === 69 || leadingCard === 69) { //rotten egg was played
                winner = [];
                break; // Rotten egg played in battle
            }
            if ( (higherIsBetter && leadingCard < curCard) ||
                 (!higherIsBetter && leadingCard > curCard && leadingCard !== 15) ||
                 (!higherIsBetter && leadingCard < curCard && curCard === 15) ) {
                winner = [plays[i]];
            } else if (leadingCard === curCard) { //tie, so add to winner stack
                winner.push(plays[i]);
            }
        }
    } else if (wilds.length >= 1) { //there could be a tie because all people played wild cards, or a player played a wild card and the other player(s) ran out of cards
        winner = wilds;
    } else {
        //somehow all poeple battling ran out of cards... possible but very, very, very, improbable
    }
    return [winner, higherIsBetter]; //return winner/s and higherIsBetter
};

const arePlayedCardsInPlayersHand = (playedCards, hand) => {
    let cards_to_remove_from_hand = {};
    let cards_in_hand_dict = {};
    for (let i = 0; i < hand.length; i++) {
        cards_in_hand_dict[hand[i]] = cards_in_hand_dict[hand[i]] ? cards_in_hand_dict[hand[i]] + 1 : 1;
    }
    playedCards.forEach((card) => {
        if (cards_in_hand_dict[card]) {
            // valid
            cards_in_hand_dict[card] -= 1;
            cards_to_remove_from_hand[card] = cards_to_remove_from_hand[card] ? cards_to_remove_from_hand[card] + 1 : 1;
        } else {
            if (card.includes("15")) {
                // jokers can be any card but an ace or wild nine so if ace wasn't in the hand,
                // could not have come from a joker
                return [false, []];
            } else if (cards_in_hand_dict["14j"]) {
                // valid, card could have come from a joker in the hand
                cards_in_hand_dict["14j"] -= 1;
                cards_to_remove_from_hand["14j"] = cards_to_remove_from_hand["14j"] ? cards_to_remove_from_hand["14j"] + 1 : 1;
            } else {
                return [false, []];
            }
        }
    });
    return [true, cards_to_remove_from_hand];
};

exports.createUserIdsToUsernames = createUserIdsToUsernames;
exports.pickManager = pickManager;
exports.pickBackup = pickBackup;
exports.makeDeck = makeDeck;
exports.sortHand = sortHand;
exports.whoWonBattle = whoWonBattle;
exports.arePlayedCardsInPlayersHand = arePlayedCardsInPlayersHand;
exports.deck = deck;