import React, { Component } from 'react';

import { getRandomInt, genRandomString } from "../../utils";
import BattleSandwichMoveWrapper from '../components/battleSandwichMoveWrapper/battleSandwichMoveWrapper';
import BattleResult from '../components/BattleResult/BattleResult';
import PlayersMove from '../components/PlayersMove/PlayersMove';
import GameDetailsTopBar from '../components/GameDetailsTopBar/GameDetailsTopBar';
import PlayerBubbles from "../components/PlayerBubbles/PlayerBubbles";
import GameClock from "../components/GameClock/GameClock";
import CardPile from "../components/CardPile/CardPile";
import ActionButtons from "../components/ActionButtons/ActionButtons";
import Hand from "../components/Hand/Hand";
import ChatBox from "../components/ChatBox/ChatBox";
import AlertModal from "../components/AlertModal/AlertModal";

import '../app.css';

/*
const cardPile__TEST_1 = (
    [
        [
            ['3h'],
            "play",
            "ryan",
            ['RS', ['jason']],
        ],
        [
            ['3h'],
            "play",
            "jason",
            ["RS", ['cam', 'ryan']],
        ],
        [
            ['3h'],
            "play",
            "cam",
            ["B", ['ryan']],
        ],
        [
            ['3d'],
            "play",
            "ryan",
            ["S", ['jason']],
        ],
        [
            ['3s'],
            "play",
            "jason",
            ["B", ['ryan']],
        ],
        [
            ['3h'],
            "play",
            "ryan",
            []
        ]
    ]
);

const cardPile__TEST_2 = (
    [
        [
            ['3h'],
            "play",
            "jason",
            ['RS', ['ryan']],
        ],
        [
            ['3h'],
            "play",
            "ryan",
            ["RS", ['cam']],
        ],
        [
            ['3s', '3h'],
            "play",
            "cam",
            ["S", ['ryan']],
        ],
        [
            ['3h'],
            "play",
            "ryan",
            ["RS", ['jason']],
        ],
        [
            ['3c', '3d'],
            "play",
            "jason",
            ["S", ['ryan']],
        ],
        [
            ['3h'],
            "play",
            "ryan",
            []
        ]
    ]
);
*/

const CLOCK_START_TIME = 30;
const ROUND_END_WAIT_TIME = 10;

const genBackgroundColor = () => { // for background color of card img divs
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
            refuelNumber: this.props.init_data.refuelNumber,
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
            battleData_toServer: {isBattle: false, battler: ""},
            sandwichData_toServer: {isSandwiched: false, lastFoe: "", usersCard: "", type: ""},
            // objects
            playerInfo: this.props.init_data.playerInfo, // dict of users , user : [handSize, stillIn, yourTurn, score, sandwiched]
            // bools
            startGame: this.props.init_data.startGame,
            higherIsBetter: this.props.init_data.higherIsBetter, // higher cards are better
            isBattle: this.props.init_data.isBattle,
            isDerby: this.props.init_data.isDerby,
            roundEnd: this.props.init_data.roundEnd,
            gameOver: this.props.init_data.gameOver,
            show_wild_nine_button: false,
            canPlay_startOfNewRound: true,
            showAlertModal: false,
            alertModalTitle: "",
            alertModalText: "",
            // other
            announcement: !this.props.init_data.startGame ? "Game has not started" : "",
            error: "",
            clockTime: CLOCK_START_TIME,
            clockIntervalVar: null,
            managerOrBackupTimeoutVar: null,
        };
    }

    generateAlertModalTitle = () => {
        const titleList = [
            "Hello!!",
            "Hold Up!",
            "Wait a second...",
            "Excuse Me",
            "Sir!",
            "Mam!",
            "Just A Minute!",
            "Umm...",
            "Wait A Minute!",
            "Hold Your Horses!",
            "Eh Hem!",
            "Stop Stop Stop!",
            "Hold On...",
            "Something Doesn't Look Right Here...",
            "Hmmm...",
            "Nice Try...",
            "Yo",
            "Hold it!",
        ];

        return titleList[getRandomInt(titleList.length)];
    }

    handleServerToClientMsgByType = (msg) => {
        const serverToClientMsgTypes = {
            "SEND_CHAT_MSG__SUCCESS": () => {
                this.setState({chatList: msg.data.chatList});
            },
            "SEND_CHAT_MSG__ERROR": () => {
                console.log(msg.data.error);
            },
            "PLAYER_JOINED_GAME_UPDATE": () => {
                this.setState({
                    playerInfo: msg.data.playerInfo,
                    players: msg.data.players
                });
            },
            "LEAVE_GAME__SUCCESS": () => {
                //console.log("got -> LEAVE_GAME__SUCCESS");
            },
            "LEAVE_GAME__ERROR": () => {
                console.log(msg.data.error);
            },
            "START_GAME__SUCCESS": () => {
                this.setState({
                    hand: msg.data.hand,
                    cardPile: msg.data.cardPile,
                    cardsInDeck: msg.data.cardsInDeck,
                    playerInfo: msg.data.playerInfo,
                    startGame: msg.data.startGame,
                    announcement: "",
                });
                this.setClockTimer(null);

                // if manager or backup, let server know when time runs out
                if (msg.data.isManager) {
                    const managerOrBackupTimeoutVar = setTimeout(() => {
                        this.ranOutOfTime(msg.data.timerHash);
                    }, CLOCK_START_TIME * 1000);
                    this.setState({managerOrBackupTimeoutVar: managerOrBackupTimeoutVar});
                } else if (msg.data.isBackup) {
                    const managerOrBackupTimeoutVar = setTimeout(() => {
                        this.ranOutOfTime(msg.data.timerHash);
                    }, (CLOCK_START_TIME * 1000) + 1100); // 1100 more delay for backup. Only want backup to tell server time is up if manager failed to do so. If manager succeeds in telling server time is up, server will auto play and adjust for next turn which will send a PLAY_MOVE__SUCCESS back to client which will clear the managerOrBackupTimeoutVar (backup does not have to tell server) and a new manager and backup will get set
                    this.setState({managerOrBackupTimeoutVar: managerOrBackupTimeoutVar});
                }
            },
            "START_GAME__ERROR": () => {
                this.setState({error: msg.data.error});
            },
            "PLAY_MOVE__SUCCESS": () => {
                // clear manager or backup timeout var so they dont tell server time is up (for prev turn)
                if (!msg.data.battleNotAllPlayersPlayed && this.state.managerOrBackupTimeoutVar) { // if there is a battle, DONT clear timeout if all players in a battle have NOT played -> msg.data.battleNotAllPlayersPlayed === true
                    clearTimeout(this.state.managerOrBackupTimeoutVar);
                    this.setState({managerOrBackupTimeoutVar: null});
                }

                let announcement = ""
                if (msg.data.roundEnd.isEnd && !msg.data.gameOver.isOver) { // Round over
                    announcement = `${msg.data.roundEnd.winner} won the round. Score: ${msg.data.roundLog[1]} + ${msg.data.roundLog[2]}`;

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

                    // Edits to hand and playerInfo are only local and temporary so everyone
                    // can see the state of the game (whos left in, and how many cards
                    // everyone had at the end) at the end of the round before
                    // the data is reset for the next round (as done in the setState
                    // in the setTimeout below) - the server returns the up-to-date state
                    let tmp_playerInfo = {...this.state.playerInfo};
                    let usernameWhoPlayedLast = msg.data.cardPile[0][2];
                    if (usernameWhoPlayedLast === "Battle Result") {
                        usernameWhoPlayedLast = msg.data.cardPile[0][0][0][2];
                        tmp_playerInfo[usernameWhoPlayedLast].handSize -= 1;
                    } else {
                        tmp_playerInfo[usernameWhoPlayedLast].handSize -= msg.data.cardPile[0][0].length;
                    }
                    for (let username in tmp_playerInfo) {
                        if (msg.data.roundEnd.winner !== username) { // set everyone that did not win the round to false = out
                            tmp_playerInfo[username].stillIn = false;
                        } else {
                            tmp_playerInfo[username].stillIn = true; // winner
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
                        playerInfo: tmp_playerInfo,
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
                            playerInfo: msg.data.playerInfo,
                            isBattle: msg.data.isBattle,
                            battleStack_Players: msg.data.battleStack_Players,
                            isDerby: msg.data.isDerby,
                            //gameOver: msg.data.gameOver,
                            roundEnd: {isEnd: false, winner: ""},
                            //roundLog: msg.data.roundLog,
                            //error: msg.data.error,
                            announcement: "",
                            cardIndexToBackgroundColor: [],
                            canPlay_startOfNewRound: true,
                            battleNotAllPlayersPlayed: msg.data.battleNotAllPlayersPlayed
                        });

                        // if manager or backup, let server know when time runs out
                        if (!msg.data.battleNotAllPlayersPlayed) { // if there is a battle, DONT set a new manager, backup and timeout if all players in a battle have NOT played -> msg.data.battleNotAllPlayersPlayed === true
                            if (msg.data.isManager) {
                                const managerOrBackupTimeoutVar = setTimeout(() => {
                                    this.ranOutOfTime(msg.data.timerHash);
                                }, CLOCK_START_TIME * 1000);
                                this.setState({managerOrBackupTimeoutVar: managerOrBackupTimeoutVar});
                            } else if (msg.data.isBackup) {
                                const managerOrBackupTimeoutVar = setTimeout(() => {
                                    this.ranOutOfTime(msg.data.timerHash);
                                }, (CLOCK_START_TIME * 1000) + 1100); // 1100 more delay for backup. Only want backup to tell server time is up if manager failed to do so. If manager succeeds in telling server time is up, server will auto play and adjust for next turn which will send a PLAY_MOVE__SUCCESS back to client which will clear the managerOrBackupTimeoutVar (backup does not have to tell server) and a new manager and backup will get set
                                this.setState({managerOrBackupTimeoutVar: managerOrBackupTimeoutVar});
                            }
                        }

                        if (!msg.data.battleNotAllPlayersPlayed) { // card played in battle but battle still going - not all players have played yet
                            this.setClockTimer(null);
                        }
                    }, ROUND_END_WAIT_TIME * 1000);
                } else {
                    if (msg.data.gameOver.isOver) { // gameOver
                        let winner = "";
                        for (let i = 0; i < msg.data.gameOver.winners.length; i++) {
                            if (i < msg.data.gameOver.winners.length - 1) {
                                winner += msg.data.gameOver.winners[i] + " and ";
                            } else {
                                winner += msg.data.gameOver.winners[i];
                            }
                        }
                        announcement = `${winner} ${msg.data.gameOver.winners.length === 1 ? "is" : "are"} the King of the Hill! To play again create a new room.`;
                    } else {
                        // if manager or backup, let server know when time runs out
                        if (!msg.data.battleNotAllPlayersPlayed) { // if there is a battle, DONT set a new manager, backup and timeout if all players in a battle have NOT played -> msg.data.battleNotAllPlayersPlayed === true
                            if (msg.data.isManager) {
                                const managerOrBackupTimeoutVar = setTimeout(() => {
                                    this.ranOutOfTime(msg.data.timerHash);
                                }, CLOCK_START_TIME * 1000);
                                this.setState({managerOrBackupTimeoutVar: managerOrBackupTimeoutVar});
                            } else if (msg.data.isBackup) {
                                const managerOrBackupTimeoutVar = setTimeout(() => {
                                    this.ranOutOfTime(msg.data.timerHash);
                                }, (CLOCK_START_TIME * 1000) + 1100); // 1100 more delay for backup. Only want backup to tell server time is up if manager failed to do so. If manager succeeds in telling server time is up, server will auto play and adjust for next turn which will send a PLAY_MOVE__SUCCESS back to client which will clear the managerOrBackupTimeoutVar (backup does not have to tell server) and a new manager and backup will get set
                                this.setState({managerOrBackupTimeoutVar: managerOrBackupTimeoutVar});
                            }
                        }

                        if (!msg.data.battleNotAllPlayersPlayed) { // card played in battle but battle still going - not all players have played yet
                            this.setClockTimer(null);
                        }

                        if (msg.data.hand.length === 0 && msg.data.playerInfo[this.props.username].yourTurn) { // its your turn and you are out of cards so auto play "outofcards"
                            setTimeout(() => {
                                this.outOfCards();
                            }, 5000);
                        }
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
                        playerInfo: msg.data.playerInfo,
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
            },
            "PLAY_MOVE__ERROR": () => {
                this.setState({error: msg.data.error});
            },
            "TIME_RAN_OUT__ERROR": () => {
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
                console.log('onmessage ERROR!');
                console.log(e);
            }
        };

        if (this.props.rejoinGame) {
            if (this.props.init_data.lastTimestamp) {
                const curTimeMinusTimestampInDB = (new Date()).getTime() - this.props.init_data.lastTimestamp;
                const currentRoundTime = CLOCK_START_TIME - Math.round(curTimeMinusTimestampInDB / 1000);
                this.setClockTimer(currentRoundTime);
            } else {
                this.setClockTimer(CLOCK_START_TIME);
            }
            
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

    ranOutOfTime = (timerHash) => {
        if (!timerHash) {
            console.log("ERROR: is manager or backup but no timerHash present...");
        }

        const clientMsg = {
            type: "TIME_RAN_OUT",
            data: {
                roomID: this.props.roomID,
                username: this.props.username,
                timerHash: timerHash,
            }
        }
        try {
            //console.log("send -> TIME_RAN_OUT");
            this.props.webSocket.send(JSON.stringify(clientMsg));
        } catch (err) {
            console.log("Error trying to tell server time ran out...");
            console.log(err);
        }
    }

    sendChatMessege = (chatMsg) => {
        if (chatMsg) {
            const clientMsg = {
                type: "SEND_CHAT_MSG",
                data: {
                    userID: this.props.userID,
                    roomID: this.props.roomID,
                    username: this.props.username,
                    msg: chatMsg
                }
            }

            try {
                this.props.webSocket.send(JSON.stringify(clientMsg));
                return true; // succeeded
            } catch (err) {
                console.log("Error sending chat msg...");
                console.log(err);
                return false; // failed
            }
        }
    }

    // can only be called by the lord
    startGame = () => {
        const clientMsg = {
            type: "START_GAME",
            data: {
                roomID: this.props.roomID
            }
        }
        try {
            this.props.webSocket.send(JSON.stringify(clientMsg))
        } catch (err) {
            console.log("Error sending chat msg...");
            console.log(err);
        }
    }

    // called if client leaves browser window
    leaveGame = () => {
        const clientMsg = {
            type: "LEAVE_GAME",
            data: {
                roomID: this.props.roomID,
                username: this.props.username
            }
        }
        try {
            this.props.webSocket.send(JSON.stringify(clientMsg))
        } catch (err) {
            console.log("Error sending chat msg...");
            console.log(err);
        }
    }

    setJokerOption = (card, index) => {
        this.setState({
            ["curJokerOption_" + index]: card,
        });
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
            const prevCard = this.state.cardSelectedStack[i-1].substring(0, this.state.cardSelectedStack[i-1].length - 1); //card value
            const curCard = this.state.cardSelectedStack[i].substring(0, this.state.cardSelectedStack[i].length - 1); //card value
            if (prevCard !== curCard) {
                allSame = false;
                break;
            }
        }
        return allSame;
    }

    //only seen when you are in but its not your turn but could be if you came in to battle or sandwich someone
    battleSandwich = () => { //if was not clients turn but decided to battle/sandwich
        console.log("Yo!")
        let inBattle = false;
        let isDerby = this.state.isDerby;
        let battleData_toServer = this.state.battleData_toServer;
        let sandwichData_toServer = this.state.sandwichData_toServer;
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
                this.setState({
                    showAlertModal: true,
                    alertModalTitle: this.generateAlertModalTitle(),
                    alertModalText: "You cannot battle anyone! No one has played yet...",
                });
            } else if (whoPlayedLast === this.props.username || lastFoe === this.props.username) { //lastFoe
                playable = false;
                this.setState({
                    showAlertModal: true,
                    alertModalTitle: this.generateAlertModalTitle(),
                    alertModalText: "Either you played last or you are trying to battle yourself...",
                });
            } else { //someone played before user, must beat that card(s)
                let usersCard = this.state.cardSelectedStack[0].substring(0, this.state.cardSelectedStack[0].length - 1); //card value
                let lastPlayedCard = lastPlay[0].substring(0, lastPlay[0].length - 1); //card value
                usersCard = parseInt(usersCard); //was string
                lastPlayedCard = parseInt(lastPlayedCard);  //was string
                if (usersCard === lastPlayedCard) {
                    if (this.state.playerInfo[this.props.username].isSandwiched) { //if you are sandwiched
                        isDerby = this.state.cardSelectedStack.length > 1;
                        battleData_toServer = {isBattle: false, battler: ""};
                        sandwichData_toServer = {isSandwiched: true, lastFoe: lastFoe, usersCard: usersCard, type: "RS"};
                    } else if (this.state.cardSelectedStack.length > lastPlay.length) {
                        isDerby = true;
                        battleData_toServer = {isBattle: false, battler: ""};
                        sandwichData_toServer = {isSandwiched: true, lastFoe: lastFoe, usersCard: usersCard, type: ""};
                    } else if (inBattle) { //already in the battle, and then you play the same card again so its a sandwich
                        battleData_toServer = {isBattle: false, battler: ""};
                        sandwichData_toServer = {isSandwiched: true, lastFoe: lastFoe, usersCard: usersCard, type: "S"};
                    } else if (this.state.cardSelectedStack.length === lastPlay.length) {
                        battleData_toServer = {isBattle: true, battler: lastFoe}; //set flag to indicate battle order of play
                        sandwichData_toServer = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""}
                    } else if (this.state.cardSelectedStack.length < lastPlay.length) {
                        playable = false; // not valid
                        this.setState({
                            showAlertModal: true,
                            alertModalTitle: this.generateAlertModalTitle(),
                            alertModalText: "Its a Derby... You need to play more cards!",
                        });
                    }
                } else {
                    playable = false; // not valid battle
                    this.setState({
                        showAlertModal: true,
                        alertModalTitle: this.generateAlertModalTitle(),
                        alertModalText: "Your card(s) must be the same value as the previous card(s) played.",
                    });
                }
            }
        } else { //cards played were not all the same value
            playable = false; // not valid
            this.setState({
                showAlertModal: true,
                alertModalTitle: this.generateAlertModalTitle(),
                alertModalText: "You can't play different types of cards!",
            });
        }

        if (playable) {
            console.log("hit!")
            let moveData = {
                usersMove: [this.state.cardSelectedStack.slice(), "play", this.props.username, []],
                battleData: battleData_toServer,
                isDerby: isDerby,
                sandwichData: sandwichData_toServer
            };
            this.playMove(moveData);
        }
    }

    play = () => {
        let isDerby = this.state.isDerby;
        let battleData_toServer = this.state.battleData_toServer;
        let sandwichData_toServer = this.state.sandwichData_toServer;
        let playable = true;
        let lastPlay = '';
        let lastFoe = '';
        let whoPlayedLast = '';
        //if all cards selected are same or a single card is chosen: valid so far
        if (this.state.playerInfo[this.props.username].isSandwiched) {
            // user is sandwiched so whatever they play (if its valid) will un/resandwich
            this.battleSandwich();
        } else if (this.areAllCardsSelectedTheSame()) {
            if (this.state.isBattle) {
                if (this.state.cardSelectedStack.length !== 1) {
                    playable = false; //have to play a single card
                    this.setState({
                        showAlertModal: true,
                        alertModalTitle: this.generateAlertModalTitle(),
                        alertModalText: "You can only play one card in a battle.",
                    });
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
                    this.setState({
                        showAlertModal: true,
                        alertModalTitle: this.generateAlertModalTitle(),
                        alertModalText: "You can't play multiple cards to start the round",
                    });
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
                            this.setState({
                                showAlertModal: true,
                                alertModalTitle: this.generateAlertModalTitle(),
                                alertModalText: "Higher is better. You need to play a card(s) of higher value than what was just played.",
                            });
                        } else if (!this.state.higherIsBetter && usersCard > lastPlayedCard ) {
                            playable = false; // not valid
                            this.setState({
                                showAlertModal: true,
                                alertModalTitle: this.generateAlertModalTitle(),
                                alertModalText: "Lower is better. You need to play a card(s) of lower value than what was just played.",
                            });
                        } else if (!this.state.higherIsBetter && usersCard < lastPlayedCard ) {
                            // valid
                        } else if (usersCard === lastPlayedCard && (whoPlayedLast === this.props.username || lastFoe === this.props.username)) {
                            playable = false;
                            this.setState({
                                showAlertModal: true,
                                alertModalTitle: this.generateAlertModalTitle(),
                                alertModalText: "You can't battle yourself!",
                            });
                        } else if (usersCard === lastPlayedCard && whoPlayedLast !== this.props.username && lastFoe !== this.props.username) {
                            battleData_toServer = {isBattle: true, battler: lastFoe}; //set flag to indicate battle order of play
                            sandwichData_toServer = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""};
                        }
                    } else if (this.state.cardSelectedStack.length < lastPlay.length) {
                        playable = false; // not valid
                        this.setState({
                            showAlertModal: true,
                            alertModalTitle: this.generateAlertModalTitle(),
                            alertModalText: "Its a Derby, you need to play more cards!",
                        });
                    } else if (this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length > 1 ||
                               this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length === 1 && this.state.higherIsBetter && usersCard >= lastPlayedCard ||
                               this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length === 1 && !this.state.higherIsBetter && usersCard <= lastPlayedCard )
                        {
                        if (usersCard === lastPlayedCard && (whoPlayedLast === this.props.username || lastFoe === this.props.username)) {
                            playable = false;
                            this.setState({
                                showAlertModal: true,
                                alertModalTitle: this.generateAlertModalTitle(),
                                alertModalText: "You can't sandwich yourself!",
                            });
                        } else {
                            isDerby = true;
                            if (usersCard === lastPlayedCard) { //valid
                                battleData_toServer = {isBattle: false, battler: ""};
                                sandwichData_toServer = {isSandwiched: true, lastFoe: lastFoe, usersCard: usersCard, type: ""};
                            }
                        }
                    } else { // should never get here...
                        playable = false; // not valid
                        if (this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length === 1 && this.state.higherIsBetter && usersCard < lastPlayedCard) {
                            this.setState({
                                showAlertModal: true,
                                alertModalTitle: this.generateAlertModalTitle(),
                                alertModalText: "When starting a Derby, and higher is better, your cards must be of higher value than the last card played.",
                            });
                        } else if (this.state.cardSelectedStack.length > lastPlay.length && lastPlay.length === 1 && !this.state.higherIsBetter && usersCard > lastPlayedCard) {
                            this.setState({
                                showAlertModal: true,
                                alertModalTitle: this.generateAlertModalTitle(),
                                alertModalText: "When starting a Derby, and lower is better, your cards must be of lower value than the last card played.",
                            });
                        }
                    }
                } else {
                    //can play anything. ex. wild 9 to start, then someone can play anything they want
                }
            }

            if (playable) {
                const moveData = {
                    usersMove: [this.state.cardSelectedStack.slice(), "play", this.props.username, []],
                    battleData: battleData_toServer,
                    isDerby: isDerby,
                    sandwichData: sandwichData_toServer
                };
                this.playMove(moveData);
            }
        } else { //cards played were not all the same value
            playable = false; // not valid
            this.setState({
                showAlertModal: true,
                alertModalTitle: this.generateAlertModalTitle(),
                alertModalText: "Either you didn't select a card(s) or you tried to play different types of cards!",
            });
        }
    }

    // should only appear during a derby or is sandwiched
    pass = () => {
        let usersMove = [["pass"], "pass", this.props.username, []];
        if (this.state.playerInfo[this.props.username].isSandwiched) { // player is currently sandwiched
            usersMove = [["SW"], "SW", this.props.username, []];
        }
        const moveData = {
            usersMove: usersMove,
            battleData: this.state.battleData_toServer,
            isDerby: this.state.isDerby,
            sandwichData: this.state.sandwichData_toServer
        };
        this.playMove(moveData);
    }

    // displays folded cards on pile, hill only happen/appear if user is still in and its not a Derby, should not appear during a derby
    fold = () => {
        const moveData = {
            usersMove: [this.state.cardSelectedStack.slice(), "fold", this.props.username, []],
            battleData: this.state.battleData_toServer,
            isDerby: this.state.isDerby,
            sandwichData: this.state.sandwichData_toServer
        };
        this.playMove(moveData);
    }

    // Only appears if 1 nine is selected and not during a derby
    wildNine = () => {
        const moveData = {
            usersMove: [[this.state.higherIsBetter ? "wild_L" : "wild_H"], "wild", this.props.username, []],
            battleData: this.state.battleData_toServer,
            isDerby: this.state.isDerby,
            sandwichData: this.state.sandwichData_toServer
        };
        this.playMove(moveData);
    }

    outOfCards = () => {
        const moveData = {
            usersMove: [["outofcards"], "outofcards", this.props.username, []],
            battleData: this.state.battleData_toServer,
            isDerby: this.state.isDerby,
            sandwichData: this.state.sandwichData_toServer
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

    generateCardPile = (cardPile) => {
        if (!cardPile || cardPile.length === 0) {
            return [];
        }

        // first play will always be a regular single card play or fold, never a battle or derby
        let cardPileJSX = [];
        let cur_move;
        for (let m = cardPile.length - 1; m >= 0; m--) {
            cur_move = cardPile[m];
            if (cur_move[3].length > 0) { // battle, sandwich, un/resandwich, lost card
                if (cur_move[3][0] === "B") { // battle - last card played battled other players
                    cardPileJSX.unshift(
                        <BattleSandwichMoveWrapper
                            key={genRandomString(5)}
                            text={"Battle!"}
                            backgroundColor={"deepskyblue"}
                        >
                            <PlayersMove
                                key={genRandomString(5)}
                                backgroundColor={this.state.cardIndexToBackgroundColor[m]}
                                player={cur_move[2]}
                                cardsPlayed={cur_move[0]}
                                moveType={cur_move[1]}
                            />
                        </BattleSandwichMoveWrapper>
                    );

                    // walk backwards numAllPlayersInBattle iterations and wrap these players moves (prev moves) in blue battle div
                    let battleMoveJSX;
                    const numOtherPlayersInBattle = cur_move[3][1].length; // array of other players being battled
                    const numAllPlayersInBattle = numOtherPlayersInBattle + 1; // + 1 to account for cur player. This will be the offset from current card pile position
                    for (let i = 1; i < numAllPlayersInBattle; i++) {
                        battleMoveJSX = cardPileJSX[i];
                        cardPileJSX[i] = (
                            <BattleSandwichMoveWrapper
                                key={genRandomString(5)}
                                text={"Battle!"}
                                backgroundColor={"deepskyblue"}
                            >
                                {battleMoveJSX}
                            </BattleSandwichMoveWrapper>
                        )
                    }
                } else if (cur_move[3][0] === "S") { // sandwich, last card played sandwiched other players
                    cardPileJSX.unshift(
                        <PlayersMove
                            key={genRandomString(5)}
                            backgroundColor={this.state.cardIndexToBackgroundColor[m]}
                            player={cur_move[2]}
                            cardsPlayed={cur_move[0]}
                            moveType={cur_move[1]}
                        />
                    );

                    // walk backwards and wrap sandwiched prev move(s) in green sandwich div
                    let peepsGettingSandwiched = [...cur_move[3][1]];
                    let i = m + 1;
                    while (peepsGettingSandwiched.length > 0 && i < cardPile.length) {
                        if (cardPile[i][3][0] === "LC" || !peepsGettingSandwiched.includes(cardPile[i][2])) { // want to skip over this card/move - skip any lost cards from battle, skip player moves who are not getting sandwiched
                            // skip/dont sandwich
                        } else {
                            peepsGettingSandwiched = peepsGettingSandwiched.filter((player) => player !== cardPile[i][2]); // remove player (whose move we are on) from array
                            // only want to wrap sandwich div around Non "LC" = Lost Card
                            const curMoveJSX = cardPileJSX[i - m];
                            const moveBeenSandwiched = curMoveJSX?.props?.text === "Sandwiched!" && curMoveJSX?.props?.backgroundColor === "limegreen";
                            if (moveBeenSandwiched) { // need to use moveBeenSandwiched && !moveNotBattedOrSandwiched in combo bc without className check in moveNotBattedOrSandwiched, props.children === "Sandwiched!" check could check a player's username (a username could potentially be "Sandwiched!" which is rare but would mess with the logic)
                                // skip adding action wrapper (green "Sandwiched!") bc move already has green "Sandwiched!" wrapper
                                // checking to see if we are sandwiching an already sandwiched player - adding another sandwich wrapper over an already sandwiched move
                            } else {
                                cardPileJSX[i - m] = (
                                    <BattleSandwichMoveWrapper
                                        key={genRandomString(5)}
                                        text={"Sandwiched!"}
                                        backgroundColor={"limegreen"}
                                    >
                                        {curMoveJSX}
                                    </BattleSandwichMoveWrapper>
                                )
                            }
                        }
                        i += 1;
                    }
                } else if (cur_move[3][0] === "RS") { // un/resandwich, last card played unsandwiched themselves and sandwiched other players
                    cardPileJSX.unshift(
                        <PlayersMove
                            key={genRandomString(5)}
                            backgroundColor={this.state.cardIndexToBackgroundColor[m]}
                            player={cur_move[2]}
                            cardsPlayed={cur_move[0]}
                            moveType={cur_move[1]}
                        />
                    );

                    // walk backwards and wrap prev sandwiched move(s) in either green sandwich or purple unsandwich div
                    // extra + 1 on line below since we want to sandwich these players -> cur_move[3][1] and (the +1) want to unsandwich cur player = player who played last
                    let i = m + 1;
                    while (cardPile[i][2] !== cardPile[m][2] || (cardPile[i][2] === cardPile[m][2] && cardPile[i][3][0] === "LC")) { // PlayerWhoPlayedTheCurLookedAtMoveWhileTraversingBackwards !== PlayerWhoPlayedThatTurn, stay in loop if come across players prev move but that move was a Lost Card - want to stop the loop at players last played move = when they were sandwiched
                        if (cardPile[i][3][0] === "LC") { // want to skip over this card/move
                            // skip
                        } else {
                            // only want to wrap sandwich div around Non "LC" = Lost Card
                            const curMoveJSX = cardPileJSX[i - m];
                            const moveBeenSandwiched = curMoveJSX?.props?.text === "Sandwiched!" && curMoveJSX?.props?.backgroundColor === "limegreen";
                            const isUnsandwiched = cardPile[i][2] === cardPile[m][2]; // cur player's prev move. Any move is either "Unsandwiched!" (only the cur player can be unsandwiched) or "Sandwiched!" (multiple players - others/not cur player - could still be sandwiched), 
                            // TODO - do we need this if check or no? If check keeps from adding another green Sandwiched! layer on top of move that was already sandwiched. 
                            // ... cleaner without multiple Sandwiched! layers, but displays more info if we do show each time a sandwiching occurs
                            if (moveBeenSandwiched && !isUnsandwiched) { // need to use moveBeenSandwiched && !moveNotBattedOrSandwiched in combo bc without className check in moveNotBattedOrSandwiched, props.children === "Sandwiched!" check could check a player's username (a username could potentially be "Sandwiched!" which is rare but would mess with the logic)
                                // skip adding action wrapper (green "Sandwiched!") bc move already has green "Sandwiched!" wrapper
                                // checking to see if we are sandwiching an already sandwiched player - adding another sandwich wrapper over an already sandwiched move
                            } else {
                                cardPileJSX[i - m] = (
                                    <BattleSandwichMoveWrapper
                                        key={genRandomString(5)}
                                        text={"Sandwiched!"}
                                        backgroundColor={"limegreen"}
                                    >
                                        {curMoveJSX}
                                    </BattleSandwichMoveWrapper>
                                )
                            }
                        }
                        i += 1;
                    }
                    const curMoveJSX = cardPileJSX[i - m];
                    cardPileJSX[i - m] = (
                        <BattleSandwichMoveWrapper
                            key={genRandomString(5)}
                            text={"Unsandwiched!"}
                            backgroundColor={"purple"}
                        >
                            {curMoveJSX}
                        </BattleSandwichMoveWrapper>
                    )
                } else if (cur_move[3][0] === "LC") { // Lost Card - wrap Lost Card div around move
                    cardPileJSX.unshift(
                        <BattleSandwichMoveWrapper
                            key={genRandomString(5)}
                            text={"Lost Card!"}
                            backgroundColor={"salmon"}
                        >
                            <PlayersMove
                                key={genRandomString(5)}
                                backgroundColor={this.state.cardIndexToBackgroundColor[m]}
                                player={cur_move[2]}
                                cardsPlayed={cur_move[0]}
                                moveType={cur_move[1]}
                            />
                        </BattleSandwichMoveWrapper>
                    );
                }
            } else { // // battle result, everything else = regular play = play, fold, pass
                if (cur_move[1] === "battle") {
                    cardPileJSX.unshift(
                        <BattleResult
                        key={genRandomString(5)}
                            curMove={cur_move}
                            curCardPileIndex={m}
                            cardIndexToBackgroundColor={this.state.cardIndexToBackgroundColor}
                        />
                    );
                } else {
                    cardPileJSX.unshift(
                        <PlayersMove
                            key={genRandomString(5)}
                            backgroundColor={this.state.cardIndexToBackgroundColor[m]}
                            player={cur_move[2]}
                            cardsPlayed={cur_move[0]}
                            moveType={cur_move[1]}
                        />
                    );
                }
            }
        }

        return cardPileJSX;
    }

    render() {
        return (
            <div className="gameRoom__container">
                { this.state.showAlertModal &&
                    <AlertModal
                        title={ this.state.alertModalTitle }
                        text={ this.state.alertModalText }
                        hideModal={() => this.setState({showAlertModal: false})}
                    />
                }

                <GameDetailsTopBar
                    gameSize={this.state.gameSize}
                    deckSize={this.state.deckSize}
                    handSize={this.state.handSize}
                    refuelNumber={this.state.refuelNumber}
                    cardsInDeck={this.state.cardsInDeck}
                    roundLog={this.state.roundLog}
                    higherIsBetter={this.state.higherIsBetter}
                    isBattle={this.state.isBattle}
                    isDerby={this.state.isDerby}
                />

                <div className="container">
                    <div className="peeps_and_clock">
                        <PlayerBubbles
                            players={this.state.players}
                            username={this.props.username}
                            playerInfo={this.state.playerInfo}
                        />

                        <GameClock
                            roundEnd={this.state.roundEnd}
                            username={this.props.username}
                            playerInfo={this.state.playerInfo}
                            clockTime={this.state.clockTime}
                            clockStartTime={CLOCK_START_TIME}
                        />
                    </div>

                    <CardPile
                        cardPile={this.state.cardPile}
                        generateCardPile={this.generateCardPile}
                        roundEnd={this.state.roundEnd}
                        gameOver={this.state.gameOver}
                        announcement={this.state.announcement}
                    />

                    <ActionButtons
                        canPlay_startOfNewRound={this.state.canPlay_startOfNewRound}
                        username={this.props.username}
                        lord={this.state.lord}
                        players={this.state.players}
                        gameSize={this.state.gameSize}
                        gameStarted={this.state.startGame}
                        playerInfo={this.state.playerInfo}
                        show_wild_nine_button={this.state.show_wild_nine_button}
                        isBattle={this.state.isBattle}
                        isDerby={this.state.isDerby}
                        cardSelectedStack={this.state.cardSelectedStack}
                        cardPile={this.state.cardPile}

                        startGame={this.startGame}
                        play={this.play}
                        wildNine={this.wildNine}
                        pass={this.pass}
                        fold={this.fold}
                        battleSandwich={this.battleSandwich}
                        areAllCardsSelectedTheSame={this.areAllCardsSelectedTheSame}
                    />

                    <Hand
                        hand={this.state.hand}
                        cardsSelected_handIndex_dict={this.state.cardsSelected_handIndex_dict}
                        selectUnselectCardInHand={this.selectUnselectCardInHand}
                        setJokerOption={this.setJokerOption}
                    />

                    <ChatBox
                        sendChatMessege={this.sendChatMessege}
                        chatList={this.state.chatList}
                    />
                </div>
            </div>
        )
    }
}

export default GameRoom;
