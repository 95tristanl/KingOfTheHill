const { createUserIdsToUsernames, pickManager, pickBackup, makeDeck, sortHand } = require("./helpers");
const { genRandomString } = require("../../utils");

const WebSocket = require('ws');
const Game = require("../models/game");

const startGame = async (data, ws, wss) => {
    /*
    data: {
        roomID: this.props.roomID
    }
    */
    await Game.findOne({roomID: data.roomID}, async (err, schema) => {
        if (err || schema === null) {
            const serverRes = {
                type: "START_GAME__ERROR",
                data: {
                    error: "Game not found"
                }
            }
            ws.send(JSON.stringify(serverRes));
        } else {
            if (ws.id !== schema.usernameToId[schema.lord]) {
                const serverRes = {
                    type: "START_GAME__ERROR",
                    data: {
                        error: "Not authorized"
                    }
                }
                ws.send(JSON.stringify(serverRes));
            } else {
                try {
                    for (let q = 0; q < schema.players.length; q++) { //creates the order of play (whos after who) dictionary
                        if (q === schema.players.length - 1) {
                            schema.orderOfPlay[schema.players[q]] = schema.players[0];
                            schema.markModified(`orderOfPlay.${schema.players[q]}`); // save the dictionary
                        } else {
                            schema.orderOfPlay[schema.players[q]] = schema.players[q+1];
                            schema.markModified(`orderOfPlay.${schema.players[q]}`); // save the dictionary
                        }
                    }
                    schema.startGame = true; // update server startGame to true
                    schema.deck = makeDeck(schema.deckSize); // makes the deck based on the deckSize (number of decks param) and shuffles it
                    for (let username in schema.playerHands) { // deal to players
                        let hand = [];
                        for (let j = 0; j < schema.handSize; j++) {
                            hand.push(schema.deck[schema.deck.length - 1]); // grab last card in deck (top of pile) and insert into players hand
                            schema.deck.pop(); // get rid of last card in deck that was just dealt to player
                        }
                        schema.playerHands[username] = sortHand(hand); // add tuple of player username and their hand of cards
                        schema.markModified(`playerHands.${username}`);
                    }
                    for (const username in schema.playerInfo) { // the lord user starts the game (his turn first)
                        if (username === schema.lord) {
                            schema.playerInfo[username].yourTurn = true;
                        } else {
                            schema.playerInfo[username].yourTurn = false;
                        }
                        schema.playerInfo[username].handSize = schema.playerHands[schema.lord].length; // length of a standard hand, lord as ex
                        schema.playerInfo[username].stillIn = true;
                        schema.playerInfo[username].score = 0; // set everyones score to 0
                        schema.markModified(`playerInfo.${username}`);
                    }
                    const lastTimestamp = (new Date()).getTime();
                    schema.lastTimestamp = lastTimestamp;

                    const timerHash = genRandomString(8);
                    schema.timerHash = timerHash;

                    await schema.save();

                    const serverRes = {
                        type: "START_GAME__SUCCESS",
                        data: {
                            // hand: schema.playerHands[username], - will be added in loop below per client
                            cardPile: schema.cardPile,
                            cardsInDeck: schema.deck.length,
                            playerInfo: schema.playerInfo,
                            startGame: true,
                            isManager: false,
                            isBackup: false,
                            timerHash: null,
                        }
                    }

                    const userIDs = createUserIdsToUsernames(schema.usernameToId); // dic of userIDs to usernames for quick look-up
                    const manager = pickManager(schema.players, schema.usernameToId); // 1 manager from players = a playerID
                    const backup = pickBackup(schema.players, schema.usernameToId, manager); // 1 backup from players = a playerID

                    console.log(`manager: ${manager} | ${userIDs[manager]}, backup: ${backup} | ${userIDs[backup]}`);
                    console.log(`timerHash: ${timerHash}`);
                    console.log("");

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN && client.id && userIDs[client.id]) {
                            serverRes.data.hand = schema.playerHands[userIDs[client.id]]; // set hand for specific client
                            // set manager, backup, and timerHash
                            if (manager === client.id) {
                                serverRes.data.isManager = true;
                                serverRes.data.isBackup = false;
                                serverRes.data.timerHash = timerHash;
                            } else if (backup === client.id) {
                                serverRes.data.isManager = false;
                                serverRes.data.isBackup = true;
                                serverRes.data.timerHash = timerHash;
                            } else {
                                serverRes.data.isManager = false;
                                serverRes.data.isBackup = false;
                                serverRes.data.timerHash = null;
                            }
                            client.send(JSON.stringify(serverRes));
                        }
                    });
                } catch (err) {
                    console.log('err')
                    console.log(err);
                    const serverRes = {
                        type: "START_GAME__ERROR",
                        data: {
                            error: "Game not found"
                        }
                    }
                    ws.send(JSON.stringify(serverRes));
                }
            }
        }
    });
};

exports.startGame = startGame;