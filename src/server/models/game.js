"use strict";

let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let Game = new Schema({
    lord: {type: String},
    roomID: {type: String},
    deckSize: {type: Number},
    gameSize: {type: Number},
    handSize: {type: Number},
    refuelNumber: {type: Number},
    players: [], // string[]
    usernameToId: {}, // {key: string (username), value: string (playerID)}
    deck: [],
    cardPile: [],
    battleStack_Players: [],
    battleStack_Moves: [],
    sandwicher: {type: String}, // username
    derbyLastPlay: {type: String},
    higherIsBetter: {type: Boolean, default: true},
    startGame: {type: Boolean, default: false},
    gameOver: {isOver: {type: Boolean, default: false}, winners: []},
    roundEnd: {isEnd: {type: Boolean, default: false}, winner: {type: String, default: false}},
    isBattle: {type: Boolean, default: false},
    isDerby: {type: Boolean, default: false},
    orderOfPlay: {},  //a dictionary, stores who plays after who, order of play
    chatList: [], // list of strings = messeges sent by people
    roundLog: [], // holds [last round winner, his prev score, cards won in that round]
    playerHands: {},   // a dictionary at 0 index of this list
    playerInfo: {}, // {handSize: number, stillIn: bool, yourTurn: bool, score: number, isSandwiched: bool}
    whoHasLeftGame: {},
    lastTimestamp: {type: Number},
    timerHash: {type: String},
    /* every turn 2 players are randomly selected to manage the timer. One player is set to the 'manager' and the other the 'backup'. 
       The manager will set a timeout in their browser and when it is up will tell the server time is up for that turn. The backup will also set a 
       timeout 1.1 seconds longer than the manager's timeout and will only tell the sever time is up if the manager was not able to. Once a move 
       has been made in time, the manager and backup's timeouts will be canceled and a new manager 
       and backup will be chosen. Both will recieve a timerHash from the server. A player can only update the lastTimestamp (say time is up) 
       if their timerHash matches the timerHash in the DB.
    */
   createDate: {type: String}, // used for identifying old game rooms that were not deleted
});

Game.pre("save", function(next) {
    next();
});

module.exports = mongoose.model("Game", Game);
