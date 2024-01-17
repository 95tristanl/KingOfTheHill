const { genRandomString } = require("../../utils");
const { deck } = require("./helpers");

const Game = require("../models/game");

const createGame = async (data, ws, _) => {
    /*
    data: {
        lord: this.state.username_c,
        roomID: this.state.roomID_c,
        deckSize: this.state.deckSize,
        gameSize: this.state.gameSize,
        handSize: this.state.handSize,
        refuelNumber: this.state.refuelNumber
    }
    */
    let errorMsg = "";
    if (data.lord.trim().length <= 0 || !data.lord.match(/^[a-zA-Z0-9 ]{2,15}$/)) {
        errorMsg = "Username must only contain letters, numbers, and spaces, and must be 2-15 characters!";
    } else if (data.roomID.trim().length <= 0 || !data.roomID.match(/^[a-zA-Z0-9 ]{5,20}$/)) {
        errorMsg = "RoomID must only contain letters, numbers, and spaces, and must be 5-20 characters!";
    } else if (!data.gameSize.match(/^[1-9]{1,2}$/) && parseInt(data.gameSize) >= 2 && parseInt(data.gameSize) <= 20) {
        errorMsg = "Game size must be a number between 2 and 20!";
    } else if (!data.deckSize.match(/^[1-9]{1}$/) && parseInt(data.deckSize) >= 1 && parseInt(data.deckSize) < 10) {
        errorMsg = "Deck number must be a number between 1 and 9!";
    } else if (!data.handSize.match(/^[1-9]{1,2}$/) && parseInt(data.handSize) >= 1 && parseInt(data.handSize) <= 20) {
        errorMsg = "Hand size must be a number between 1 and 20!";
    } else if (!data.refuelNumber.match(/^[0-9]{1,2}$/) && parseInt(data.refuelNumber) >= 0 &&
        parseInt(data.refuelNumber) < parseInt(data.handSize)) {
        errorMsg = "Refuel number must be a positive number and less than the hand size!";
    } else if (((deck.length * parseInt(data.deckSize))/parseInt(data.gameSize)) < parseInt(data.handSize)) {
        errorMsg = "The math regarding the amount of decks, game size, and hand size you want does not add up... Try again.";
    }
    if (errorMsg === "") {
        try {
            await Game.findOne({roomID: data.roomID}, async (err, schema) => {
                if (err || schema !== null) {
                    // room with that id already exists
                    const serverRes = {
                        type: "CREATE_GAME__ERROR",
                        data: {
                            error: "Room code already in use"
                        }
                    }
                    ws.send(JSON.stringify(serverRes));
                } else {
                    const date = new Date();
                    const playerID = genRandomString(8);
                    let game = new Game({
                        lord: data.lord,
                        roomID: data.roomID,
                        deckSize: data.deckSize,
                        gameSize: parseInt(data.gameSize),
                        handSize: data.handSize,
                        refuelNumber: data.refuelNumber,
                        players: [data.lord],
                        usernameToId: {[data.lord]: playerID},
                        deck: [], // [cards]
                        cardPile: [], // [[cards played], type of play, username]
                        battleStack_Players: [],
                        battleStack_Moves: [],
                        derbyLastPlay: "", // keeps track of last played hand in a derby
                        sandwicher: "", // keeps track of person who last sandwiched
                        higherIsBetter: true,
                        startGame: false,
                        gameOver: {isOver: false, winners: []},
                        roundEnd: {isEnd: false, winner: ""},
                        isBattle: false,
                        isDerby: false,
                        orderOfPlay: {init: "init"}, // just init with a val that is never going to be used
                        chatList: [], // hold last 10 chat messeges
                        roundLog: [],
                        playerHands: {[data.lord]: []},
                        playerInfo: {[data.lord]: {handSize: 0, stillIn: false, yourTurn: false, score: 0, isSandwiched: false}},
                        whoHasLeftGame: {[data.lord]: 0},
                        lastTimestamp: null,
                        timerHash: "",
                        createDate: `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`,
                    });
                    await game.save();
        
                    ws.id = playerID;
        
                    const serverRes = {
                        type: "CREATE_GAME__SUCCESS",
                        data: {
                            userID: playerID,
                            lord: data.lord,
                            deckSize: (data.deckSize * deck.length),
                            gameSize: parseInt(data.gameSize),
                            handSize: data.handSize,
                            refuelNumber: data.refuelNumber,
                            startGame: false,
                            playerInfo: {[data.lord]: {handSize: 0, stillIn: false, yourTurn: false, score: 0, isSandwiched: false}},
                            players: [data.lord],
                            hand: [],
                            higherIsBetter: true,
                            cardPile: [],
                            cardsInDeck: (data.deckSize * deck.length),
                            isBattle: false,
                            battleStack_Players: [],
                            isDerby: false,
                            gameOver: ["F", ""],
                            roundEnd: ["F", ""],
                            roundLog: []
                        }
                    }
                    ws.send(JSON.stringify(serverRes));
                }
            });
        } catch (err) {
            console.log(err);
            const serverRes = {
                type: "CREATE_GAME__ERROR",
                data: {
                    error: "Unknown error"
                }
            }
            ws.send(JSON.stringify(serverRes));
        }
    } else {
        const serverRes = {
            type: "CREATE_GAME__ERROR",
            data: {
                error: errorMsg
            }
        }
        ws.send(JSON.stringify(serverRes));
    }
};

exports.createGame = createGame;