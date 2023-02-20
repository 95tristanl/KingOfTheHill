import React, { Component } from 'react';
import '../app.css';
import axios from "axios";

const CLOCK_START_TIME = 45;
const ROUND_END_WAIT_TIME = 8;

const genRandomString = (len) => {
    let charSet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randStr = "";
    for (let i = 0; i < len; i++) {
        randStr += charSet[(Math.floor(Math.random() * charSet.length))];
    }
    return randStr;
}

const genBackgroundColor = () => { //for background color of card img divs
    let r1 = Math.floor((Math.random() * 255));
    let r2 = Math.floor((Math.random() * 255));
    let r3 = Math.floor((Math.random() * 255));
    return "rgb(" + r1 + ", " + r2 + ", " + r3 + ")";
}

const genCardPileMovesBackgroundColors = (cardPile) => {
    if (!cardPile) {
        return [];
    }
    let cardPileMovesBackgroundColors = []; // Saves generated colors so re-render does not gen new colors and confuses player
    cardPile.forEach((move) => {
        if (move[1] === "battle") {
            const battleMovesBackgroundColors = move[0].map(() => genBackgroundColor());
            cardPileMovesBackgroundColors.push(battleMovesBackgroundColors);
        } else {
            cardPileMovesBackgroundColors.push(genBackgroundColor());
        }
    });
    return cardPileMovesBackgroundColors;
}

class GameRoom extends Component {
    constructor(props) {
        super(props);
        this.state = {
            lord: this.props.init_data.lord,
            gameSize: this.props.init_data.gameSize,
            deckSize: this.props.init_data.deckSize, // starting amount of cards still in the deck
            cardsInDeck: this.props.init_data.cardsInDeck, // amount of cards still in the deck
            handSize: this.props.init_data.handSize,
            refuelNum: this.props.init_data.refuelNum,
            score: 0, // how many cards have you won
            // arrays
            players: this.props.init_data.players,
            hand: this.props.init_data.hand, // the cards in your hand. Clients hand only gets updated by server after a round is over. Client updates its own hand and sends update to server
            hand_fallback: [], // make a copy in case data was not sent to server so can reset hand back to last state
            cardSelectedStack: [], // cards selected in his hand (list of ids)
            cardsSelected_handIndex_dict: {},
            cardPile: this.props.init_data.cardPile, //playing pile an array of arrays, usually each is an array having a single card item, Derby items have multiple cards
            cardIndexToBackgroundColor: genCardPileMovesBackgroundColors(this.props.init_data.cardPile),
            battleStack_Players: this.props.init_data.battleStack_Players,
            chatList: this.props.init_data.chatList ? this.props.init_data.chatList : [],
            roundLog: this.props.init_data.roundLog, // [last round winner, his prev score, cards won in that round]
            // objects
            dict_varData: this.props.init_data.dict_varData, // dict of users , user : [handSize, stillIn, yourTurn, score, sandwiched]
            // bools
            startGame: this.props.init_data.startGame,
            higherIsBetter: this.props.init_data.higherIsBetter, // higher cards are better
            isBattle: this.props.init_data.isBattle,
            isDerby: this.props.init_data.isDerby,
            isBattle_toServ: ["F", ""],
            isSandwich_toServ: ["F", "", ""], // [T/F, name, card val]
            roundEnd: this.props.init_data.roundEnd,
            gameOver: this.props.init_data.gameOver,
            announcement: !this.props.init_data.startGame ? "Game has not started" : "",
            show_wild_nine_button: false,
            error: "",
            canPlay_startOfNewRound: true,
            clockTime: CLOCK_START_TIME,
            clockIntervalVar: null
        };
    }

    handleServerToClientMsgByType = (msg) => {
        const serverToClientMsgTypes = {
            "SEND_CHAT_MSG__SUCCESS": () => {
                //console.log("got -> SEND_CHAT_MSG__SUCCESS");
                this.setState({chatList: msg.data.chatList});
            },
            "SEND_CHAT_MSG__ERROR": () => {
                //console.log("got -> SEND_CHAT_MSG__ERROR");
                console.log(msg.data.error);
            },
            "PLAYER_JOINED_GAME_UPDATE": () => {
                //console.log("got -> PLAYER_JOINED_GAME_UPDATE");
                this.setState({
                    dict_varData: msg.data.dict_varData,
                    players: msg.data.players
                });
            },
            "LEAVE_GAME__SUCCESS": () => {
                //console.log("got -> LEAVE_GAME__SUCCESS");
            },
            "LEAVE_GAME__ERROR": () => {
                //console.log("got -> LEAVE_GAME__ERROR");
                console.log(msg.data.error);
            },
            "START_GAME__SUCCESS": () => {
                //console.log("got -> START_GAME_SUCCESS");
                this.setState({
                    hand: msg.data.hand,
                    cardPile: msg.data.cardPile,
                    cardsInDeck: msg.data.cardsInDeck,
                    dict_varData: msg.data.dict_varData,
                    startGame: msg.data.startGame,
                    announcement: ""
                });
                this.setClockTimer(null);
            },
            "START_GAME__ERROR": () => {
                //console.log("got -> START_GAME_ERROR");
                this.setState({error: msg.data.error});
            },
            "PLAY_MOVE__SUCCESS": () => {
                //console.log("got -> PLAY_MOVE__SUCCESS");
                let announcement = ""
                if (msg.data.roundEnd[0] === "T" && msg.data.gameOver[0] !== "T") { // Round over
                    announcement = `${msg.data.roundEnd[1]} won the round. Score: ${msg.data.roundLog[1]} + ${msg.data.roundLog[2]}`;

                    let cardIndexToBackgroundColor = this.state.cardIndexToBackgroundColor.slice();
                    const numIndicesToAdd = msg.data.cardPile.length - this.state.cardIndexToBackgroundColor.length;
                    for (let i = 0; i < numIndicesToAdd; i++) {
                        if (msg.data.cardPile[numIndicesToAdd - i - 1][1] === "battle") {
                            const battleMovesBackgroundColors = msg.data.cardPile[numIndicesToAdd - i - 1][0].map(() => genBackgroundColor());
                            cardIndexToBackgroundColor.unshift(battleMovesBackgroundColors);
                        } else {
                            cardIndexToBackgroundColor.unshift(genBackgroundColor());
                        }
                    }

                    // Edits to hand and dict_varData are only local and temporary so everyone
                    // can see the state of the game (whos left in, and how many cards
                    // everyone had at the end) at the end of the round before
                    // the data is reset for the next round (as done in the setState
                    // in the setTimeout below) - the server returns the up-to-date state
                    let tmp_dict_varData = {...this.state.dict_varData};
                    let usernameWhoPlayedLast = msg.data.cardPile[0][2];
                    if (usernameWhoPlayedLast === "Battle Result") {
                        usernameWhoPlayedLast = msg.data.cardPile[0][0][0][2];
                        tmp_dict_varData[usernameWhoPlayedLast][0] -= 1;
                    } else {
                        tmp_dict_varData[usernameWhoPlayedLast][0] -= msg.data.cardPile[0][0].length;
                    }
                    for (let username in tmp_dict_varData) {
                        if (msg.data.roundEnd[1] !== username) { // set everyone that did not win the round to false = out
                            tmp_dict_varData[username][1] = false;
                        } else {
                            tmp_dict_varData[username][1] = true; // winner
                        }
                    }

                    // locally update hand (if player played last) so see end game state before state resets next round
                    let cards_to_remove_from_hand = {};
                    if (msg.data.cardPile[0][2] === "Battle Result") {
                        for (let i = 0; i < msg.data.cardPile[0][0].length; i++) {
                            if (msg.data.cardPile[0][0][i][2] === this.props.username) {
                                let card = msg.data.cardPile[0][0][i][0][0];
                                cards_to_remove_from_hand[card] = cards_to_remove_from_hand[card] ? cards_to_remove_from_hand[card] + 1 : 1;
                                break;
                            }
                        }
                    } else if (msg.data.cardPile[0][2] === this.props.username) {
                        for (let i = 0; i < msg.data.cardPile[0][0].length; i++) {
                            let card = msg.data.cardPile[0][0][i];
                            cards_to_remove_from_hand[card] = cards_to_remove_from_hand[card] ? cards_to_remove_from_hand[card] + 1 : 1;
                        }
                    }

                    const hand = this.state.hand.filter((card) => {
                        let keepCard = !cards_to_remove_from_hand[card]
                        cards_to_remove_from_hand[card] -= 1;
                        return keepCard;
                    });

                    this.setState({
                        hand: hand,
                        higherIsBetter: msg.data.higherIsBetter,
                        cardPile: msg.data.cardPile,
                        dict_varData: tmp_dict_varData,
                        gameOver: msg.data.gameOver,
                        roundEnd: msg.data.roundEnd,
                        roundLog: msg.data.roundLog,
                        error: msg.data.error,
                        announcement: announcement,
                        cardIndexToBackgroundColor: cardIndexToBackgroundColor,
                        canPlay_startOfNewRound: false,
                        battleNotAllPlayersPlayed: msg.data.battleNotAllPlayersPlayed
                    });

                    setTimeout(() => {
                        this.setState({
                            hand: msg.data.hand,
                            //higherIsBetter: msg.data.higherIsBetter,
                            cardPile: [],
                            cardsInDeck: msg.data.cardsInDeck,
                            dict_varData: msg.data.dict_varData,
                            isBattle: msg.data.isBattle,
                            battleStack_Players: msg.data.battleStack_Players,
                            isDerby: msg.data.isDerby,
                            //gameOver: msg.data.gameOver,
                            roundEnd: ["F", ""],
                            //roundLog: msg.data.roundLog,
                            //error: msg.data.error,
                            announcement: "",
                            cardIndexToBackgroundColor: [],
                            canPlay_startOfNewRound: true,
                            battleNotAllPlayersPlayed: msg.data.battleNotAllPlayersPlayed
                        });
                    }, ROUND_END_WAIT_TIME * 1000);
                } else {
                    if (msg.data.gameOver[0] === "T") { // gameOver
                        let winner = "";
                        for (let i = 0; i < msg.data.gameOver[1].length; i++) {
                            if (i < msg.data.gameOver[1].length - 1) {
                                winner += msg.data.gameOver[1][i] + " and ";
                            } else {
                                winner += msg.data.gameOver[1][i];
                            }
                        }
                        announcement = `${winner} is the King of the hill! To play again create a new room.`;
                    }

                    let cardIndexToBackgroundColor = this.state.cardIndexToBackgroundColor.slice();
                    const numIndicesToAdd = msg.data.cardPile.length - this.state.cardIndexToBackgroundColor.length;
                    for (let i = 0; i < numIndicesToAdd; i++) {
                        if (msg.data.cardPile[numIndicesToAdd - i - 1][1] === "battle") {
                            const battleMovesBackgroundColors = msg.data.cardPile[numIndicesToAdd - i - 1][0].map(() => genBackgroundColor());
                            cardIndexToBackgroundColor.unshift(battleMovesBackgroundColors);
                        } else {
                            cardIndexToBackgroundColor.unshift(genBackgroundColor());
                        }
                    }

                    this.setState({
                        hand: msg.data.hand,
                        higherIsBetter: msg.data.higherIsBetter,
                        cardPile: msg.data.cardPile,
                        cardsInDeck: msg.data.cardsInDeck,
                        dict_varData: msg.data.dict_varData,
                        isBattle: msg.data.isBattle,
                        battleStack_Players: msg.data.battleStack_Players,
                        isDerby: msg.data.isDerby,
                        gameOver: msg.data.gameOver,
                        roundEnd: msg.data.roundEnd,
                        roundLog: msg.data.roundLog,
                        error: msg.data.error,
                        announcement: announcement,
                        cardIndexToBackgroundColor: cardIndexToBackgroundColor,
                        battleNotAllPlayersPlayed: msg.data.battleNotAllPlayersPlayed
                    });
                }
                if (!msg.data.battleNotAllPlayersPlayed) { // card played in battle but battle still going - not all players have played yet
                    this.setClockTimer(null);
                }
            },
            "PLAY_MOVE__ERROR": () => {
                //console.log("got -> PLAY_MOVE__ERROR");
                this.setState({error: msg.data.error});
            },
        }

        if (msg.type in serverToClientMsgTypes) {
            serverToClientMsgTypes[msg.type]();
        }
    }

    componentDidMount() {
        this.props.webSocket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.handleServerToClientMsgByType(msg);
            } catch (e) {
                console.log('onmessage ERROR! \n');
                console.log(e);
            }
        };

        if (this.props.rejoinGame) {
            this.setClockTimer(this.props.init_data.clockTime);
        }

        window.onbeforeunload = (event) => {
            this.leaveGame();
        };
    }

    setClockTimer = (clockStartTime) => {
        if (this.state.clockIntervalVar) {
            clearInterval(this.state.clockIntervalVar);
        }

        this.setState({clockTime: clockStartTime ? clockStartTime : CLOCK_START_TIME});

        const clockIntervalVar = setInterval(() => {
            const newClockTime = this.state.clockTime - 1;
            if (newClockTime <= 0) {
                clearInterval(this.state.clockIntervalVar);
                this.setState({clockTime: newClockTime <= 0 ? 0 : newClockTime, clockIntervalVar: null});
            } else {
                this.setState({clockTime: newClockTime <= 0 ? 0 : newClockTime});
            }
        }, 1000);

        this.setState({clockIntervalVar: clockIntervalVar});
    }

    sendChatMessege = () => {
        if (this.state.chat_msg) {
            const clientMsg = {
                type: "SEND_CHAT_MSG",
                data: {
                    userID: this.props.userID,
                    roomID: this.props.roomID,
                    username: this.props.username,
                    msg: this.state.chat_msg
                }
            }
            try {
                //console.log("send -> SEND_CHAT_MSG");
                this.props.webSocket.send(JSON.stringify(clientMsg))
                this.setState({chat_msg: ""});
            } catch (err) {
                console.log("Error sending chat msg...");
                console.log(err);
            }
        }
    }

    startGame = () => {
        // can only be called by the lord
        const clientMsg = {
            type: "START_GAME",
            data: {
                roomID: this.props.roomID
            }
        }
        try {
            //console.log("send -> START_GAME");
            this.props.webSocket.send(JSON.stringify(clientMsg))
        } catch (err) {
            console.log("Error sending chat msg...");
            console.log(err);
        }
    }

    leaveGame = () => {
        // called if client leaves browser window
        const clientMsg = {
            type: "LEAVE_GAME",
            data: {
                roomID: this.props.roomID,
                username: this.props.username
            }
        }
        try {
            //console.log("send -> LEAVE_GAME");
            this.props.webSocket.send(JSON.stringify(clientMsg))
        } catch (err) {
            console.log("Error sending chat msg...");
            console.log(err);
        }
    }

    setJokerOption = (card, index) => {
        this.setState({
            ["curJokerOption_" + index]: card,
            show_joker_options: ""
        });
    }

    jokerCardToDisplayValue = (card) => {
        const cardToDisplayValue = {
            "2s": "2",
            "3h": "3",
            "4d": "4",
            "5c": "5",
            "6s": "6",
            "7h": "7",
            "8d": "8",
            "9c": "9",
            "10s": "10",
            "11h": "Jack",
            "12d": "Queen",
            "13c": "King",
            "69x": "Egg"
        }
        return cardToDisplayValue[card];
    }

    selectUnselectCardInHand = (card, index) => {
        let card_was_joker = false;
        if (card === "14j") {
            card_was_joker = true;
            card = this.state["curJokerOption_" + index] ? this.state["curJokerOption_" + index] : "2s";
        }

        let cardsSelected_handIndex_dict = {...this.state.cardsSelected_handIndex_dict};
        let cardSelectedStack = [...this.state.cardSelectedStack];
        if (cardsSelected_handIndex_dict[(index + "")]) { //index of card in hand key exists in cardsSelected_handIndex_dict
            //remove index and card from cardsSelected_handIndex_dict
            //remove card from cardSelectedStack
            delete cardsSelected_handIndex_dict[(index + "")];
            cardSelectedStack.splice(cardSelectedStack.indexOf(card), 1);
        } else { //index of card in hand key DOES NOT exist in cardsSelected_handIndex_dict
            //add index and card to cardsSelected_handIndex_dict
            //add card to cardSelectedStack
            cardsSelected_handIndex_dict[(index + "")] = card;
            cardSelectedStack.push(card);
        }

        let show_wild_nine_button = false;
        if (
            card.substring(0, 1) === "9" &&
            !card_was_joker &&
            cardSelectedStack.length === 1 &&
            (this.state.isBattle || !this.state.isDerby)
        ) {
            show_wild_nine_button = true;
        }

        this.setState({
            cardSelectedStack: cardSelectedStack,
            cardsSelected_handIndex_dict: cardsSelected_handIndex_dict,
            show_wild_nine_button: show_wild_nine_button
        });
    }

    //makes sure all cards selected are the same when action button like play or battle is pressed
    areAllCardsSelectedTheSame = () => {
        if (this.state.cardSelectedStack.length === 0) {
            return false;
        }
        if (this.state.cardSelectedStack.length === 1) {
            return true;
        }
        let allSame = true;
        for (let i = 1; i < this.state.cardSelectedStack.length; i++) {
            let prevCard = this.state.cardSelectedStack[i-1].substring(0, this.state.cardSelectedStack[i-1].length - 1); //card value
            let curCard = this.state.cardSelectedStack[i].substring(0, this.state.cardSelectedStack[i].length - 1); //card value
            if (prevCard !== curCard) {
                allSame = false;
                break;
            }
        }
        return allSame
    }

    //only seen when you are in but its not your turn but could be if you came in to battle or sandwhich someone
    battleSandwich = () => { //if was not clients turn but decided to battle/sandwhich
        let inBattle = false;
        let isDerby = this.state.isDerby;
        let isBattle_toServ = this.state.isBattle_toServ;
        let isSandwich_toServ = this.state.isSandwich_toServ;
        for (let i = 0; i < this.state.battleStack_Players.length; i++) { //see if player is already participating in battle
            if (this.props.username === this.state.battleStack_Players[i]) {
                inBattle = true;
                break;
            }
        }
        let playable = true;
        let lastPlay = '';
        let lastFoe = '';
        let whoPlayedLast = '';
        //if all cards selected are same or a single card is chosen: valid so far
        if (this.areAllCardsSelectedTheSame()) {
            for (let i = 0; i < this.state.cardPile.length; i++) {
                if (this.state.cardPile[i][1] === 'play') { //the card(s) that the user must beat
                    lastPlay = this.state.cardPile[i][0];
                    lastFoe = this.state.cardPile[i][2];
                    break; //the reason we loop instead of picking top of queue is because we only play against 'play' cards, not wild or fold cards.
                }
            }
            if (this.state.cardPile.length > 0) {
                whoPlayedLast = this.state.cardPile[0][2]; //could be a wild card 9 => 'wild'
            }
            if (lastPlay === '') { //user is first to play this round so as long as user doesn't play more than 1 card he can play anything
                playable = false;
                alert("Can't battle! No one has played yet!");
            } else if (whoPlayedLast === this.props.username || lastFoe === this.props.username) { //lastFoe
                playable = false;
                alert("Either you played last or you are trying to battle yourself!");
            } else { //someone played before user, must beat that card(s)
                let usersCard = this.state.cardSelectedStack[0].substring(0, this.state.cardSelectedStack[0].length - 1); //card value
                let lastPlayedCard = lastPlay[0].substring(0, lastPlay[0].length - 1); //card value
                usersCard = parseInt(usersCard); //was string
                lastPlayedCard = parseInt(lastPlayedCard);  //was string
                if (usersCard === lastPlayedCard) {
                    if (this.state.dict_varData[this.props.username][4]) { //if you are sandwiched
                        isDerby = this.state.cardSelectedStack.length > 1;
                        isBattle_toServ = ["F", ""];
                        isSandwich_toServ = ["T", lastFoe, usersCard, "RS"];
                    } else if (this.state.cardSelectedStack.length > lastPlay.length) {
                        isDerby = true;
                        isBattle_toServ = ["F", ""];
                        isSandwich_toServ = ["T", lastFoe, usersCard, ""];
                    } else if (inBattle) { //already in the battle, and then you play the same card again so its a sandwich
                        isBattle_toServ = ["F", ""];
                        isSandwich_toServ = ["T", lastFoe, usersCard, ""];
                    } else if (this.state.cardSelectedStack.length === lastPlay.length) {
                        isBattle_toServ = ["T", lastFoe]; //set flag to indicate battle order of play
                        isSandwich_toServ = ["F", "", ""];
                    } else if (this.state.cardSelectedStack.length < lastPlay.length) {
                        playable = false; // not valid
                        alert("Its a Derby. You need to play more cards!");
                    }
                } else {
                    playable = false; // not valid battle
                    alert("Your card(s) must be the exact same as the previous cards played!");
                }
            }
        } else { //cards played were not all the same value
            playable = false; // not valid
            alert("Cannot play different types of cards!");
        }

        if (playable) {
            let moveData = {
                usersMove: [this.state.cardSelectedStack.slice(), "play", this.props.username, []],
                isBattle: isBattle_toServ,
                isDerby: isDerby,
                isSandwich: isSandwich_toServ
            };
            this.playMove(moveData);
        }
    }

    play = () => { //user has pressed the play button, display selected hand cards in pile
        let isDerby = this.state.isDerby;
        let isBattle_toServ = this.state.isBattle_toServ;
        let isSandwich_toServ = this.state.isSandwich_toServ;
        let playable = true;
        let lastPlay = '';
        let lastFoe = '';
        let whoPlayedLast = '';
        //if all cards selected are same or a single card is chosen: valid so far
        if (this.state.dict_varData[this.props.username][4]) {
            // user is sandwhiched so whatever they play (if its valid) will un/resandwich
            this.battleSandwich();
        } else if (this.areAllCardsSelectedTheSame()) {
            if (this.state.isBattle) {
                if (this.state.cardSelectedStack.length !== 1) {
                    playable = false; //have to play a single card
                    alert("You only play one card in a battle.");
                } else {
                    //valid, can play any single card. Who wins functionality is on server side
                }
            } else { //not a battle
                for (let i = 0; i < this.state.cardPile.length; i++) {
                    if (this.state.cardPile[i][1] === 'play') { //the card(s) that the user must beat (dont need to beat a fold, pass or wild)
                        lastPlay = this.state.cardPile[i][0];
                        lastFoe = this.state.cardPile[i][2]; //last person to 'play' a normal card (not a fold, pass, or wild)
                        break; //only look for 'play' cards, not wild, pass, fold, etc.
                    }
                }
                if (this.state.cardPile.length > 0) {
                    whoPlayedLast = this.state.cardPile[0][2]; //last person to play, could be a wild card 9 => 'wild'
                }
                if (lastPlay === '' && this.state.cardSelectedStack.length === 1) {
                    //valid
                } else if (this.state.cardPile.length === 0 && this.state.cardSelectedStack.length > 1) {
                    playable = false;
                    alert("Can't start a round by playing multiple cards (Derby).");
                } else if (lastPlay === '' && this.state.cardPile.length > 0) { //user is first to play this round so as long as user doesn't play more than 1 card he can play anything
                    //valid, can play anything after ONLY anycombination of folded cards and wild cards
                    isDerby = this.state.cardSelectedStack.length > 1;
                } else if (lastPlay !== '') { //someone played before user, must beat that card(s)
                    let usersCard = this.state.cardSelectedStack[0].substring(0, this.state.cardSelectedStack[0].length - 1); //card value
                    let lastPlayedCard = lastPlay[0].substr(0, lastPlay[0].length - 1); //card value
                    usersCard = parseInt(usersCard); //was string
                    lastPlayedCard = parseInt(lastPlayedCard);  //was string
                    if ( (this.state.cardSelectedStack.length >= lastPlay.length && usersCard === 15) ||
                         (usersCard === 69 && this.state.cardSelectedStack.length === 1 && lastPlay.length === 1) ) {
                        //valid, ace/aces were played or rotten egg was played
                    } else if (this.state.cardSelectedStack.length === lastPlay.length) {
                        if (this.state.higherIsBetter && usersCard > lastPlayedCard ) {
                            // valid
                        } else if (this.state.higherIsBetter && usersCard < lastPlayedCard ) {
                            playable = false; // not valid
                            alert("Higher is better. You need to play a higher hand than what was just played.");
                        } else if (!this.state.higherIsBetter && usersCard > lastPlayedCard ) {
                            playable = false; // not valid
                            alert("Lower is better. You need to play a lower hand than what was just played.");
                        } else if (!this.state.higherIsBetter && usersCard < lastPlayedCard ) {
                            // valid
                        } else if (usersCard === lastPlayedCard && (whoPlayedLast === this.props.username || lastFoe === this.props.username)) {
                            playable = false;
                            alert("Can't battle yourself!");
                        } else if (usersCard === lastPlayedCard && whoPlayedLast !== this.props.username && lastFoe !== this.props.username) {
                            isBattle_toServ = ["T", lastFoe]; //set flag to indicate battle order of play
                            isSandwich_toServ = ["F", "", ""];
                        }
                    } else if (this.state.cardSelectedStack.length < lastPlay.length) {
                        playable = false; // not valid
                        alert("Its a Derby. You need to play more cards!");
                    } else if (this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length > 1 ||
                               this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length === 1 && this.state.higherIsBetter && usersCard >= lastPlayedCard ||
                               this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length === 1 && !this.state.higherIsBetter && usersCard <= lastPlayedCard )
                        {
                        if (usersCard === lastPlayedCard && (whoPlayedLast === this.props.username || lastFoe === this.props.username)) {
                            playable = false;
                            alert("Can't sandwich yourself!");
                        } else {
                            isDerby = true;
                            if (usersCard === lastPlayedCard) { //valid
                                isBattle_toServ = ["F", ""];
                                isSandwich_toServ = ["T", lastFoe, usersCard, ""];
                            }
                        }
                    } else { // should never get here...
                        playable = false; // not valid
                        if (this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length === 1 && this.state.higherIsBetter && usersCard < lastPlayedCard) {
                            alert("Not valid! When starting a Derby, your card must be higher than the last card if higher is better");
                        } else if (this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length === 1 && !this.state.higherIsBetter && usersCard > lastPlayedCard) {
                            alert("Not valid! When starting a Derby, your card must be lower than the last card if lower is better");
                        }
                    }
                } else {
                    //can play anything. ex. wild 9 to start, then someone can play anything they want
                }
            }

            if (playable) {
                const moveData = {
                    usersMove: [this.state.cardSelectedStack.slice(), "play", this.props.username, []],
                    isBattle: isBattle_toServ,
                    isDerby: isDerby,
                    isSandwich: isSandwich_toServ
                };
                this.playMove(moveData);
            }
        } else { //cards played were not all the same value
            playable = false; // not valid
            alert("Either you didn't select a card(s) or you tried to play different types of cards!");
        }
    }

    pass = () => { //should only appear during a derby or is sandwiched
        let usersMove = [["pass"], "pass", this.props.username, []];
        if (this.state.dict_varData[this.props.username][4]) { // sandwiched
            usersMove = [["SW"], "SW", this.props.username, []];
        }
        const moveData = {
            usersMove: usersMove,
            isBattle: this.state.isBattle_toServ,
            isDerby: this.state.isDerby,
            isSandwich: this.state.isSandwich_toServ
        };
        this.playMove(moveData);
    }

    fold = () => { //displays folded cards on pile, hill only happen/appear if user is still in and its not a Derby, should not appear during a derby
        const moveData = {
            usersMove: [this.state.cardSelectedStack.slice(), "fold", this.props.username, []],
            isBattle: this.state.isBattle_toServ,
            isDerby: this.state.isDerby,
            isSandwich: this.state.isSandwich_toServ
        };
        this.playMove(moveData);
    }

    wildNine = () => { // Only appears if 1 nine is selected and not during a derby
        const moveData = {
            usersMove: [[this.state.higherIsBetter ? "wild_L" : "wild_H"], "wild", this.props.username, []],
            isBattle: this.state.isBattle_toServ,
            isDerby: this.state.isDerby,
            isSandwich: this.state.isSandwich_toServ
        };
        this.playMove(moveData);
    }

    playMove = (moveData) => {
        // called when client plays any kind of move
        if (this.state.clockTime && this.state.clockTime > 0 && this.state.canPlay_startOfNewRound) {
            const clientMsg = {
                type: "PLAY_MOVE",
                data: {
                    roomID: this.props.roomID,
                    username: this.props.username,
                    ...moveData
                }
            }
            try {
                //console.log("send -> PLAY_MOVE");
                this.props.webSocket.send(JSON.stringify(clientMsg))
                this.setState({
                    cardSelectedStack: [],
                    cardsSelected_handIndex_dict: {}
                });
            } catch (err) {
                console.log("Error trying to play move...");
                console.log(err);
            }
        }

        // Ran out of time, can't play move
    }

    getCardImg = (move, card) => {
        if (move[1] === 'play') {
            return card;
        } else if (move[1] === 'fold') {
            return "fold";
        } else if (move[1] === 'wild') {
            return card;
        } else if (move[1] === 'pass') {
            return "pass";
        } else if (move[1] === 'outofcards') {
            return "outofcards";
        } else {
            return card;
        }
    }

    generateCardPile = (cardPile) => {
        if (!cardPile || cardPile.length === 0) {
            return [];
        }

        // first play will always be a regular single card play or fold, never a battle or derby
        let cardPileJSX = [];
        let cur_move;
        let jsx_i = 0;
        for (let m = cardPile.length - 1; m >= 0; m--) {
            cur_move = cardPile[m];
            if (cur_move[3].length > 0) { // battle, sandwich, un/resandwich, lost card
                if (cur_move[3][0] === "B") { // battle - last card played battled other players
                    cardPileJSX.unshift(
                        <div key={genRandomString(5)} className="move_div_battleSandwich"
                             style={{backgroundColor: "deepskyblue"}}>

                            <p className="move_card_text_top_battle">Battle!</p>

                            <div className="move_card_img_div">
                                <div className="move_div"
                                     style={{backgroundColor: this.state.cardIndexToBackgroundColor[m]}}>

                                    <p className="move_card_text_top">{cur_move[2]}</p>

                                    <div className="move_card_img_div">
                                        {
                                            cur_move[0].map((card, i) => {
                                                return (
                                                    <img key={i} className="move_card_img"
                                                         src={`src/client/images/${this.getCardImg(cur_move, card)}.png`}
                                                    />
                                                )
                                            })
                                        }
                                    </div>

                                    <div className="move_card_div_bottom">
                                        <p className="move_card_text_bottom">{cur_move[2]}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );

                    // walk backwards and wrap prev battled move(s) in blue battle div
                    let battleMoveJSX;
                    for (let i = jsx_i + 1; i < jsx_i + 1 + cur_move[3][1].length; i++) {
                        battleMoveJSX = cardPileJSX[i];
                        cardPileJSX[i] = (
                            <div key={genRandomString(5)} className="move_div_battleSandwich"
                                 style={{backgroundColor: "deepskyblue"}}>

                                <p className="move_card_text_top_battle">Battle!</p>

                                <div className="move_card_img_div">
                                    { battleMoveJSX }
                                </div>
                            </div>
                        )
                    }
                } else if (cur_move[3][0] === "S") { // sandwich, last card played sandwiched other players
                    cardPileJSX.unshift(
                        <div key={genRandomString(5)} className="move_div"
                             style={{backgroundColor: this.state.cardIndexToBackgroundColor[m]}}>

                            <p className="move_card_text_top">{cur_move[2]}</p>

                            <div className="move_card_img_div">
                                {
                                    cur_move[0].map((card, i) => {
                                        return (
                                            <img key={i} className="move_card_img"
                                                 src={`src/client/images/${this.getCardImg(cur_move, card)}.png`}
                                            />
                                        )
                                    })
                                }
                            </div>

                            <div className="move_card_div_bottom">
                                <p className="move_card_text_bottom">{cur_move[2]}</p>
                            </div>
                        </div>
                    );

                    // walk backwards and wrap sandwiched prev move(s) in green sandwich div
                    let sandwichMoveJSX;
                    let endRange = m + 1 + cur_move[3][1].length;
                    for (let i = m + 1; i < endRange; i++) {
                        if (cardPile[i][3][0] === "LC") { // want to skip over this card/move
                            endRange += 1;
                        } else {
                            // only want to wrap sandwich div around Non "LC" = Lost Card
                            sandwichMoveJSX = cardPileJSX[i - m + jsx_i];
                            cardPileJSX[i - m + jsx_i] = (
                                <div key={genRandomString(5)} className="move_div_battleSandwich"
                                     style={{backgroundColor: "limegreen"}}>

                                    <p className="move_card_text_top_battle">Sandwiched!</p>

                                    <div className="move_card_img_div">
                                        { sandwichMoveJSX }
                                    </div>
                                </div>
                            )
                        }
                    }
                } else if (cur_move[3][0] === "RS") { // un/resandwich, last card played unsandwiched the,selves and sandwiched other players
                    cardPileJSX.unshift(
                        <div key={genRandomString(5)} className="move_div"
                             style={{backgroundColor: this.state.cardIndexToBackgroundColor[m]}}>

                            <p className="move_card_text_top">{cur_move[2]}</p>

                            <div className="move_card_img_div">
                                {
                                    cur_move[0].map((card, i) => {
                                        return (
                                            <img key={i} className="move_card_img"
                                                 src={`src/client/images/${this.getCardImg(cur_move, card)}.png`}
                                            />
                                        )
                                    })
                                }
                            </div>

                            <div className="move_card_div_bottom">
                                <p className="move_card_text_bottom">{cur_move[2]}</p>
                            </div>
                        </div>
                    );

                    // walk backwards and wrap prev sandwiched move(s) in either green sandwich or purple unsandwich div
                    let resandwichMoveJSX;
                    // extra + 1 on line below since we want to sandwhich these players -> cur_move[3][1] and (the +1) want to unsandwich cur player = player who played last
                    let endRange = m + 1 + cur_move[3][1].length + 1;
                    for (let i = m + 1; i < endRange; i++) {
                        if (cardPile[i][3][0] === "LC") { // want to skip over this card/move
                            endRange += 1;
                        } else {
                            // only want to wrap sandwich div around Non "LC" = Lost Card
                            resandwichMoveJSX = cardPileJSX[i - m + jsx_i];
                            cardPileJSX[i - m + jsx_i] = (
                                <div key={genRandomString(5)} className="move_div_battleSandwich"
                                     style={{backgroundColor: cardPile[i][2] === cardPile[m][2] ? "purple" : "limegreen"}}>

                                    <p className="move_card_text_top_battle">
                                        {cardPile[i][2] === cardPile[m][2] ? "Unsandwiched!" : "Sandwiched!"}
                                    </p>

                                    <div className="move_card_img_div">
                                        { resandwichMoveJSX }
                                    </div>
                                </div>
                            )
                        }
                    }
                } else if (cur_move[3][0] === "LC") { // Lost Card - wrap Lost Card div around move
                    cardPileJSX.unshift(
                        <div key={genRandomString(5)} className="move_div_battleSandwich"
                             style={{backgroundColor: "salmon"}}>

                            <p className="move_card_text_top_battle">Lost Card!</p>

                            <div className="move_card_img_div">
                                <div className="move_div"
                                     style={{backgroundColor: this.state.cardIndexToBackgroundColor[m]}}>

                                    <p className="move_card_text_top">{cur_move[2]}</p>

                                    <div className="move_card_img_div">
                                        {
                                            cur_move[0].map((card, i) => {
                                                return (
                                                    <img key={i} className="move_card_img"
                                                         src={`src/client/images/${this.getCardImg(cur_move, card)}.png`}
                                                    />
                                                )
                                            })
                                        }
                                    </div>

                                    <div className="move_card_div_bottom">
                                        <p className="move_card_text_bottom">{cur_move[2]}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }
            } else { // // battle result, everything else = regular play = play, fold, pass
                if (cur_move[1] === "battle") {
                    cardPileJSX.unshift(
                        <div key={genRandomString(5)} className="move_div_battleSandwich"
                             style={{backgroundColor: "deepskyblue"}}>

                            <p className="move_card_text_top_battle">{cur_move[2]}</p>

                            <div className="move_card_img_div">
                                {
                                    cur_move[0].map((battleMove, i) => {
                                        return (
                                            <div key={i} className="move_div"
                                                 style={{backgroundColor: this.state.cardIndexToBackgroundColor[m][i]}}>
                                                <p className="move_card_text_top">{battleMove[2]}</p>

                                                <img className="move_card_img"
                                                     src={`src/client/images/${this.getCardImg(battleMove, battleMove[0][0])}.png`}
                                                />

                                                <div className="move_card_div_bottom">
                                                    <p className="move_card_text_bottom">{battleMove[2]}</p>
                                                </div>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        </div>
                    );
                } else {
                    cardPileJSX.unshift(
                        <div key={genRandomString(5)} className="move_div"
                             style={{backgroundColor: this.state.cardIndexToBackgroundColor[m]}}>

                            <p className="move_card_text_top">{cur_move[2]}</p>

                            <div className="move_card_img_div">
                                {
                                    cur_move[0].map((card, i) => {
                                        return (
                                            <img key={i} className="move_card_img"
                                                 src={`src/client/images/${this.getCardImg(cur_move, card)}.png`}
                                            />
                                        )
                                    })
                                }
                            </div>

                            <div className="move_card_div_bottom">
                                <p className="move_card_text_bottom">{cur_move[2]}</p>
                            </div>
                        </div>
                    );
                }
            }
        }

        return cardPileJSX;
    }

    render() {
        return (
            <div className="gameRoom__container">
                <div className="navbar">
                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Players:</p>
                        <p className="stats_header">{this.state.gameSize}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Deck Size:</p>
                        <p className="stats_header">{this.state.deckSize}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Hand Size:</p>
                        <p className="stats_header">{this.state.handSize}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Refuel At:</p>
                        <p className="stats_header">{this.state.refuelNum}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="navbar_title">King of the Hill</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Cards Left:</p>
                        <p className="stats_header">{this.state.cardsInDeck}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">
                            {this.state.roundLog.length > 0 ? this.state.roundLog[0] : "No winner"}
                        </p>
                        <p className="stats_header">
                            {this.state.roundLog.length > 0 ? `${this.state.roundLog[1]} + ${this.state.roundLog[2]}` : "yet..."}
                        </p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div"
                         style={{backgroundColor: this.state.higherIsBetter ? "#EAA754" : "pink"}}>
                        <p className="stats_header">{this.state.higherIsBetter ? "Higher" : "Lower"}</p>
                        <p className="stats_header">is better</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div"
                         style={{backgroundColor: this.state.isBattle ? "deepskyblue" : this.state.isDerby ? "blueviolet" : "#EAA754"}}>
                        <p className="stats_header">
                            {this.state.isBattle ? "Battle" : this.state.isDerby ? "Derby" : "Normal"}
                        </p>
                    </div>

                    <div className="navbar_blackbar"/>
                </div>

                <div className="container">
                    <div className="peeps_and_clock">
                        <div className="Players_div">
                            {
                                this.state.players.map((username, i) => {
                                    return (
                                        <p key={i} className="Player_details_div"
                                           style={{
                                               border: this.state.dict_varData[username][4]
                                                       ? "2px solid orange"
                                                       : this.state.dict_varData[username][2]
                                                         ? "2px solid yellow"
                                                         : "2px solid black",
                                               backgroundColor: this.state.dict_varData[username][1] ? "green" : "red"
                                           }}>
                                            <span style={{color: username === this.props.username ? "white" : "black"}}>
                                                {username}
                                            </span>
                                            <br/>
                                            {"Cards: " + this.state.dict_varData[username][0]}
                                            <br/>
                                            {"score: " + this.state.dict_varData[username][3]}
                                        </p>
                                    )
                                })
                            }
                        </div>

                        <div className="clock_div">
                            <p className="clock_text">Timer:</p>
                            <div className="clock"
                                 style={{backgroundColor: this.state.roundEnd[0] === "T"
                                                          ? "#EAA754"
                                                          : (this.state.dict_varData[this.props.username] && this.state.dict_varData[this.props.username][2])
                                                            ? (this.state.clockTime > 30
                                                              ? "green"
                                                              : this.state.clockTime > 20
                                                                ? "yellow"
                                                                : this.state.clockTime > 10
                                                                    ? "orange"
                                                                    : "red")
                                                            : "#EAA754"
                                 }}>

                                {
                                    this.state.roundEnd[0] === "T"
                                    ? CLOCK_START_TIME - ROUND_END_WAIT_TIME
                                    : this.state.clockTime
                                }
                            </div>
                        </div>
                    </div>

                    <div className="cardPile_container">
                        <p className="cardPile_text">Card Pile:</p>

                        <div className="announcement_div">
                            { this.state.announcement &&
                                <p className="announcement_text"
                                     style={{backgroundColor:
                                                this.state.roundEnd[0] === "T" && this.state.gameOver[0] !== "T"
                                                ? "pink"
                                                : this.state.gameOver[0] === "T"
                                                  ? "gold"
                                                  : "pink"
                                     }}>
                                    {this.state.announcement}
                                </p>
                            }
                        </div>
                    </div>

                    <div className="cardPileRow">
                        { this.generateCardPile(this.state.cardPile) }
                    </div>

                    <div className="buttons_menu">
                        <p className="yourHand_text">Your Hand:</p>

                        <div className="buttons_container">
                            { this.state.canPlay_startOfNewRound &&
                              this.props.username === this.state.lord && this.state.players.length === this.state.gameSize && !this.state.startGame &&
                                <button className="buttons"
                                        id="startGameButton"
                                        onClick={() => this.startGame()}
                                >
                                    START GAME
                                </button>
                            }

                            { this.state.canPlay_startOfNewRound &&
                              this.state.dict_varData[this.props.username][2] &&
                              this.state.dict_varData[this.props.username] &&
                              this.state.dict_varData[this.props.username][1] &&
                              !this.state.dict_varData[this.props.username][4] &&
                                <button className="buttons"
                                        id="playButton"
                                        onClick={() => this.play()}
                                >
                                    PLAYYY
                                </button>
                            }

                            { this.state.canPlay_startOfNewRound &&
                              this.state.dict_varData[this.props.username][2] && this.state.show_wild_nine_button &&
                                <button className="buttons"
                                        id="nineButton"
                                        onClick={() => this.wildNine()}
                                >
                                    WILD 9
                                </button>
                            }

                            { this.state.canPlay_startOfNewRound &&
                              this.state.dict_varData[this.props.username][2] &&
                              ((this.state.isDerby && !this.state.isBattle) || this.state.dict_varData[this.props.username][4]) &&
                                <button className="buttons"
                                        id="passButton"
                                        onClick={() => this.pass()}
                                >
                                    PAAASS
                                </button>
                            }

                            { this.state.canPlay_startOfNewRound &&
                              !this.state.isBattle &&
                              !this.state.dict_varData[this.props.username][4] &&
                              this.state.dict_varData[this.props.username][2] &&
                              !this.state.isDerby &&
                              this.state.cardSelectedStack.length > 0 &&
                                <button className="buttons"
                                        id="foldButton"
                                        onClick={() => this.fold()}
                                >
                                    FFFOLD
                                </button>
                            }

                            { this.state.canPlay_startOfNewRound &&
                              this.state.cardPile.length > 0 &&
                              this.state.cardPile[0][2] !== this.props.username &&
                              this.areAllCardsSelectedTheSame() &&
                              this.state.cardPile[0][2] !== "Tie! Another Battle!" &&
                              (this.state.isBattle || !this.state.dict_varData[this.props.username][2] || this.state.dict_varData[this.props.username][4]) &&
                              (this.state.cardSelectedStack[0].substring(0, this.state.cardSelectedStack[0].length - 1) ===
                               this.state.cardPile[0][0][0].substring(0, this.state.cardPile[0][0][0].length - 1)) &&
                                <button className="buttons"
                                        id="battleButton"
                                        onClick={() => this.battleSandwich()}
                                >
                                    { this.state.dict_varData[this.props.username][2] ? "SANDWICH" : "BATTLE/SANDWICH"}
                                </button>
                            }
                        </div>
                    </div>

                    <div className="hand_div">
                        {
                            this.state.hand.map((card, i) => {
                                return (
                                    <div key={i} className="card_in_hand"
                                         style={{ backgroundColor: this.state.cardsSelected_handIndex_dict[(i + "")] ? "blueviolet" : "white" }}>

                                        <img className="card_in_hand_img"
                                             style={card === "14j" ? {height: "75px"} : {}}
                                             onClick={() => this.selectUnselectCardInHand(card, i)}
                                             src={`src/client/images/${card}.png`}>
                                        </img>

                                        { card === "14j" &&
                                            <div className="Joker_menu"
                                                 onMouseEnter={(e) => {
                                                     this.setState({
                                                         show_joker_options: ("joker_options_menu_" + i),
                                                         joker_options_menu_x: (e.clientX - 15),
                                                         joker_options_menu_y: (e.clientY - 180)
                                                     })
                                                 }}
                                                 onMouseLeave={() => this.setState({show_joker_options: ""})}>

                                                 <p className="Joker_cur_option">
                                                     {
                                                         this.state["curJokerOption_" + i]
                                                         ? this.jokerCardToDisplayValue(this.state["curJokerOption_" + i])
                                                         : "2"
                                                     }
                                                 </p>

                                                { this.state.show_joker_options === ("joker_options_menu_" + i) &&
                                                    <div className="Joker_options"
                                                         style={{top: this.state.joker_options_menu_y, left: this.state.joker_options_menu_x}}>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("2s", i)}>2</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("3h", i)}>3</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("4d", i)}>4</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("5c", i)}>5</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("6s", i)}>6</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("7h", i)}>7</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("8d", i)}>8</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("9c", i)}>9</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("10s", i)}>10</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("11h", i)}>Jack</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("12d", i)}>Queen</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("13c", i)}>King</p>
                                                        <p className="Joker_option" onClick={() => this.setJokerOption("69x", i)}>Rotten Egg</p>
                                                    </div>
                                                }
                                            </div>
                                        }
                                    </div>
                                )
                            })
                        }
                    </div>

                    <div className="chat_container">
                        <div className="chat_input_and_button_div">
                            <input
                                className="chat_input"
                                name="msg"
                                placeholder="Chat message"
                                onChange={(e) => this.setState({chat_msg: e.target.value})}
                                value={this.state.chat_msg}
                            />

                            <p className="buttons"
                               id="chat_button"
                               onClick={() => this.sendChatMessege()}>
                               Send Messege
                            </p>
                        </div>

                        { this.state.chatList && this.state.chatList.length > 0 &&
                            <div className="chat_list_div">
                                {
                                    this.state.chatList.map((el, i) => {
                                        return (<p key={i} className="Chat_list_item">{el}</p>)
                                    })
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>
        )
    }
}

export default GameRoom;
