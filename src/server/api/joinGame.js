const { genRandomString } = require("../../utils");
const { deck, createUserIdsToUsernames } = require("./helpers");

const WebSocket = require('ws');
const Game = require("../models/game");

const joinGame = async (data, ws, wss) => { // joining a room
    /*
    data: {
        username: this.state.username_j,
        roomID: this.state.roomID_j
    }
    */
    let errorMsg = "";
    if (data.username.trim().length <= 0 || !data.username.match(/^[a-zA-Z0-9 ]{2,15}$/) ) {
        errorMsg = "Username can only contain letters, numbers, and spaces, and must be 2-15 characters!";
    } else if (data.roomID.trim().length <= 0 || !data.roomID.match(/^[a-zA-Z0-9 ]{5,20}$/) ) {
        errorMsg = "RoomID can only contain letters, numbers, and spaces, and must be 5-20 characters!";
    }
    if (errorMsg === "") { //otherwise try and join
        await Game.findOne({roomID: data.roomID}, async (err, schema) => {
            if (err || schema === null) {
                const serverRes = {
                    type: "JOIN_GAME__ERROR",
                    data: {
                        error: "Game not found"
                    }
                }
                ws.send(JSON.stringify(serverRes));
            } else {
                if (Object.keys(schema.playerHands).length < schema.gameSize) { //schema.players.length < schema.gameSize
                    if (!schema.playerHands[data.username]) {
                        //console.log("Joined Game: " + data.username + " : " + data.roomID);
                        const playerID = genRandomString(8);
                        schema.usernameToId[data.username] = playerID;
                        schema.markModified(`usernameToId.${data.username}`);
                        schema.playerInfo[data.username] = {handSize: 0, stillIn: false, yourTurn: false, score: 0, isSandwiched: false};
                        schema.markModified(`playerInfo.${data.username}`); //manually give path to updated object for saving
                        schema.playerHands[data.username] = [];
                        schema.markModified(`playerHands.${data.username}`); //manually give path to updated object for saving
                        schema.players.push(data.username);
                        schema.whoHasLeftGame[data.username] = 0;
                        schema.markModified(`whoHasLeftGame.${data.username}`);
                        await schema.save();

                        ws.id = playerID;

                        const serverRes = {
                            type: "JOIN_GAME__SUCCESS",
                            data: {
                                userID: playerID,
                                lord: schema.lord,
                                deckSize: (schema.deckSize * deck.length),
                                gameSize: schema.gameSize,
                                handSize: schema.handSize,
                                refuelNumber: schema.refuelNumber,
                                startGame: schema.startGame,
                                playerInfo: schema.playerInfo,
                                players: schema.players,
                                hand: [],
                                higherIsBetter: true,
                                cardPile: [],
                                cardsInDeck: (schema.deckSize * deck.length),
                                isBattle: false,
                                battleStack_Players: [],
                                isDerby: false,
                                gameOver: {isOver: false, winners: []},
                                roundEnd: {isEnd: false, winner: ""},
                                roundLog: []
                            }
                        }
                        ws.send(JSON.stringify(serverRes));

                        const serverRes2 = {
                            type: "PLAYER_JOINED_GAME_UPDATE",
                            data: {
                                playerInfo: schema.playerInfo,
                                players: schema.players
                            }
                        }

                        const userIDs = createUserIdsToUsernames(schema.usernameToId); // dic of userIDs to usernames for quick look-up

                        wss.clients.forEach((client) => {
                            if (client.id && client.id !== ws.id && client.readyState === WebSocket.OPEN && userIDs[client.id]) {
                                client.send(JSON.stringify(serverRes2));
                            }
                        });
                    } else {
                        const serverRes = {
                            type: "JOIN_GAME__ERROR",
                            data: {
                                error: "Username is already taken!"
                            }
                        }
                        ws.send(JSON.stringify(serverRes));
                    }
                } else {
                    const serverRes = {
                        type: "JOIN_GAME__ERROR",
                        data: {
                            error: "Game Is Full!"
                        }
                    }
                    ws.send(JSON.stringify(serverRes));
                }
            }
        });
    } else {
        const serverRes = {
            type: "JOIN_GAME__ERROR",
            data: {
                error: errorMsg
            }
        }
        ws.send(JSON.stringify(serverRes));
    }
};

exports.joinGame = joinGame;