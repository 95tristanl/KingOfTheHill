const { deck } = require("./helpers");

const Game = require("../models/game");

const rejoinGame = async (data, ws, _) => {
    /*
    data: {
        username: username,
        userID: userID,
        roomID: roomID
    }
    */
    await Game.findOne({roomID: data.roomID}, async (err, schema) => {
        if (err || schema === null) {
            const serverRes = {
                type: "REJOIN_GAME__ERROR",
                data: {
                    error: "Game was abandoned"
                }
            }
            ws.send(JSON.stringify(serverRes));
        } else {
            // make sure this user was in the game and had left
            if (data.userID && data.username && data.userID === schema.usernameToId[data.username] && schema.whoHasLeftGame[data.username] === 1) {
                try {
                    schema.whoHasLeftGame[data.username] = 0;
                    schema.markModified(`whoHasLeftGame.${data.username}`);
                    await schema.save();

                    ws.id = data.userID;

                    const serverRes = {
                        type: "REJOIN_GAME__SUCCESS",
                        data: {
                            userID: data.userID,
                            username: data.username,
                            roomID: data.roomID,
                            lord: schema.lord,
                            deckSize: (schema.deckSize * deck.length),
                            gameSize: schema.gameSize,
                            handSize: schema.handSize,
                            refuelNumber: schema.refuelNumber,
                            startGame: schema.startGame,
                            playerInfo: schema.playerInfo,
                            players: schema.players,
                            hand: schema.playerHands[data.username],
                            higherIsBetter: schema.higherIsBetter,
                            cardPile: schema.cardPile,
                            cardsInDeck: schema.startGame ? schema.deck.length : (schema.deckSize * deck.length),
                            isBattle: schema.isBattle,
                            battleStack_Players: schema.battleStack_Players,
                            isDerby: schema.isDerby,
                            gameOver: schema.gameOver,
                            roundEnd: schema.roundEnd,
                            roundLog: schema.roundLog,
                            chatList: schema.chatList,
                            lastTimestamp: schema.lastTimestamp,
                        }
                    }
                    ws.send(JSON.stringify(serverRes));
                } catch (err) {
                    console.log('err')
                    console.log(err);
                    const serverRes = {
                        type: "REJOIN_GAME__ERROR",
                        data: {
                            error: "Unknown error"
                        }
                    }
                    ws.send(JSON.stringify(serverRes));
                }
            } else {
                const serverRes = {
                    type: "REJOIN_GAME__ERROR",
                    data: {
                        error: "Not authorized"
                    }
                }
                ws.send(JSON.stringify(serverRes));
            }
        }
    });
};

exports.rejoinGame = rejoinGame;