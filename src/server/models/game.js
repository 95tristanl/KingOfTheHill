"use strict";

let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let Game = new Schema({
    lord: {type: String},
    roomID: {type: String},
    deckSize: {type: Number},
    gameSize: {type: Number},
    handSize: {type: Number},
    refuelNum: {type: Number},
    players: [],
    player_to_id_dict: {},
    deck: [],
    cardPile: [],
    battleStack_Players: [],
    battleStack_Moves: [],
    sandwichStack: [],
    sandwichCard: {type: Number},
    sandwicher: { type: String},
    derbyLastPlay: { type: String},
    higherIsBetter: { type: Boolean, default: true},
    startGame: { type: Boolean, default: false},
    gameOver: [],
    roundEnd: [],
    isBattle: { type: Boolean, default: false},
    isDerby: { type: Boolean, default: false},
    orderOfPlay: {},  //a dictionary, stores who plays after who, order of play
    chatList: [], // list of strings = messeges sent by people
    roundLog: [], // holds [last round winner, his prev score, cards won in that round]
    dict_hands: {},   //a dictionary at 0 index of this list
    dict_varData: {}, //a dictionary at 0 index of this list [handSize, stillIn, yourTurn, score, sandwiched]
    who_has_left: {},
    lastTimestamp: {type: Number}
});

Game.pre("save", function(next) {
    next();
});

module.exports = mongoose.model("Game", Game);
