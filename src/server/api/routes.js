const WebSocket = require('ws');
const Game = require("../models/game");

const CLOCK_START_TIME = 45;

const genRandomString = (len) => {
    let charSet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randStr = "";
    for (let i = 0; i < len; i++) {
        randStr += charSet[(Math.floor(Math.random() * charSet.length))];
    }
    return randStr;
}

const createGame = async (data, ws, wss) => {
    /*
    data: {
        lord: this.state.username_c,
        roomID: this.state.roomID_c,
        deckSize: this.state.deckSize,
        gameSize: this.state.gameSize,
        handSize: this.state.handSize,
        refuelNum: this.state.refuelNum
    }
    */
    let errorMsg = "";
    if (!data.lord.match(/^[a-zA-Z0-9]{3,12}$/) ) {
        errorMsg = "Username must only contain letters and numbers and must be 3-12 characters!";
    } else if (!data.roomID.match(/^[a-zA-Z0-9]{5,20}$/) ) {
        errorMsg = "RoomID must only contain letters and numbers and must be 5-20 characters!";
    } else if (!data.gameSize.match(/^[1-9]{1,2}$/) && parseInt(data.gameSize) >= 2 && parseInt(data.gameSize) <= 20) {
        errorMsg = "Game size must be a number between 2 and 20!";
    } else if (!data.deckSize.match(/^[1-9]{1}$/) && parseInt(data.deckSize) >= 1 && parseInt(data.deckSize) < 10) {
        errorMsg = "Deck number must be a number between 1 and 9!";
    } else if (!data.handSize.match(/^[1-9]{1,2}$/) && parseInt(data.handSize) >= 1 && parseInt(data.handSize) <= 20) {
        errorMsg = "Hand size must be a number between 1 and 20!";
    } else if (!data.refuelNum.match(/^[0-9]{1,2}$/) && parseInt(data.refuelNum) >= 0 &&
        parseInt(data.refuelNum) < parseInt(data.handSize)) {
        errorMsg = "Refuel number must be a positive number and less than the hand size!";
    } else if (((54 * parseInt(data.deckSize))/parseInt(data.gameSize)) < parseInt(data.handSize)) {
        errorMsg = "The math regarding the amount of decks, game size, and hand size you want does not add up... Try again.";
    }
    if (errorMsg === "") {
        try {
            const playerID = genRandomString(8);
            let game = new Game({
                lord: data.lord,
                roomID: data.roomID,
                deckSize: data.deckSize,
                gameSize: parseInt(data.gameSize),
                handSize: data.handSize,
                refuelNum: data.refuelNum,
                players: [data.lord],
                player_to_id_dict: {[data.lord]: playerID},
                deck: [], // [cards]
                cardPile: [], // [[cards played], type of play, username]
                battleStack_Players: [],
                battleStack_Moves: [],
                derbyLastPlay: "", // keeps track of last played hand in a derby
                sandwicher: "", // keeps track of person who last sandwiched
                higherIsBetter: true,
                startGame: false,
                gameOver: ["F", ""],
                roundEnd: ["F", ""],
                isBattle: false,
                isDerby: false,
                orderOfPlay: {init: "init"}, // just init with a val that is never going to be used
                chatList: [], // hold last 10 chat messeges
                roundLog: [],
                dict_hands: {[data.lord]: []},
                dict_varData: {[data.lord]: [0, false, false, 0, false]},
                who_has_left: {[data.lord]: 0}
            });
            await game.save();

            ws.id = playerID;

            const serverRes = {
                type: "CREATE_GAME__SUCCESS",
                data: {
                    userID: playerID,
                    lord: data.lord,
                    deckSize: (data.deckSize * 54),
                    gameSize: parseInt(data.gameSize),
                    handSize: data.handSize,
                    refuelNum: data.refuelNum,
                    startGame: false,
                    dict_varData: {[data.lord]: [0, false, false, 0, false]},
                    players: [data.lord],
                    hand: [],
                    higherIsBetter: true,
                    cardPile: [],
                    cardsInDeck: (data.deckSize * 54),
                    isBattle: false,
                    battleStack_Players: [],
                    isDerby: false,
                    gameOver: ["F", ""],
                    roundEnd: ["F", ""],
                    roundLog: []
                }
            }
            ws.send(JSON.stringify(serverRes));
        } catch (err) {
            console.log(err);
            const serverRes = {
                type: "CREATE_GAME__ERROR",
                data: {
                    error: "Unknown error creating game... "
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
}

const joinGame = async (data, ws, wss) => { // joining a room
    /*
    data: {
        username: this.state.username_j,
        roomID: this.state.roomID_j
    }
    */
    let errorMsg = "";
    if (!data.username.match(/^[a-zA-Z0-9]{3,12}$/) ) {
        errorMsg = "Username must only contain letters and numbers and must be 3-12 characters!";
    } else if (!data.roomID.match(/^[a-zA-Z0-9]{5,20}$/) ) {
        errorMsg = "RoomID must only contain letters and numbers and must be 5-20 characters!";
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
                if (Object.keys(schema.dict_hands).length < schema.gameSize) { //schema.players.length < schema.gameSize
                    if (!schema.dict_hands[data.username]) {
                        //console.log("Joined Game: " + data.username + " : " + data.roomID);
                        const playerID = genRandomString(8);
                        schema.player_to_id_dict[data.username] = playerID;
                        schema.markModified(`player_to_id_dict.${data.username}`);
                        schema.dict_varData[data.username] = [0, false, false, 0, false];
                        schema.markModified(`dict_varData.${data.username}`); //manually give path to updated object for saving
                        schema.dict_hands[data.username] = [];
                        schema.markModified(`dict_hands.${data.username}`); //manually give path to updated object for saving
                        schema.players.push(data.username);
                        schema.who_has_left[data.username] = 0;
                        schema.markModified(`who_has_left.${data.username}`);
                        await schema.save();

                        ws.id = playerID;

                        const serverRes = {
                            type: "JOIN_GAME__SUCCESS",
                            data: {
                                userID: playerID,
                                lord: schema.lord,
                                deckSize: (schema.deckSize * 54),
                                gameSize: schema.gameSize,
                                handSize: schema.handSize,
                                refuelNum: schema.refuelNum,
                                startGame: schema.startGame,
                                dict_varData: schema.dict_varData,
                                players: schema.players,
                                hand: [],
                                higherIsBetter: true,
                                cardPile: [],
                                cardsInDeck: (schema.deckSize * 54),
                                isBattle: false,
                                battleStack_Players: [],
                                isDerby: false,
                                gameOver: ["F", ""],
                                roundEnd: ["F", ""],
                                roundLog: []
                            }
                        }
                        ws.send(JSON.stringify(serverRes));

                        const serverRes2 = {
                            type: "PLAYER_JOINED_GAME_UPDATE",
                            data: {
                                dict_varData: schema.dict_varData,
                                players: schema.players
                            }
                        }

                        // dic of userIDs to usernames for quick look-up
                        let userIDs = Object.keys(schema.player_to_id_dict).reduce((acc, cur) => {
                            acc[schema.player_to_id_dict[cur]] = cur;
                            return acc;
                        }, {});

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

const rejoinGame = async (data, ws, wss) => {
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
            if (data.userID && data.username && data.userID === schema.player_to_id_dict[data.username] && schema.who_has_left[data.username] === 1) {
                try {
                    schema.who_has_left[data.username] = 0;
                    schema.markModified(`who_has_left.${data.username}`);
                    await schema.save();

                    ws.id = data.userID;

                    const serverRes = {
                        type: "REJOIN_GAME__SUCCESS",
                        data: {
                            userID: data.userID,
                            username: data.username,
                            roomID: data.roomID,
                            lord: schema.lord,
                            deckSize: (schema.deckSize * 54),
                            gameSize: schema.gameSize,
                            handSize: schema.handSize,
                            refuelNum: schema.refuelNum,
                            startGame: schema.startGame,
                            dict_varData: schema.dict_varData,
                            players: schema.players,
                            hand: schema.dict_hands[data.username],
                            higherIsBetter: schema.higherIsBetter,
                            cardPile: schema.cardPile,
                            cardsInDeck: schema.startGame ? schema.deck.length : (schema.deckSize * 54),
                            isBattle: schema.isBattle,
                            battleStack_Players: schema.battleStack_Players,
                            isDerby: schema.isDerby,
                            gameOver: schema.gameOver,
                            roundEnd: schema.roundEnd,
                            roundLog: schema.roundLog,
                            chatList: schema.chatList,
                            clockTime: (CLOCK_START_TIME - Math.round(((new Date()).getTime() - schema.lastTimestamp)/1000)) - 1
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

const sendChatMsg = async (data, ws, wss) => {
    /*
    data: {
        roomID: this.props.roomID,
        username: this.props.username,
        msg: this.state.chat_msg,
    }
    */
    await Game.findOne({roomID: data.roomID}, async (err, schema) => {
        if (err || schema === null) {
            const serverRes = {
                type: "SEND_CHAT_MSG__ERROR",
                data: {
                    error: "Game not found"
                }
            }
            ws.send(JSON.stringify(serverRes));
        } else if (
            !data.username ||
            !schema.player_to_id_dict[data.username] ||
            ws.id !== schema.player_to_id_dict[data.username]
        ) {
            const serverRes = {
                type: "SEND_CHAT_MSG__ERROR",
                data: {
                    error: "Not authorized"
                }
            }
            ws.send(JSON.stringify(serverRes));
        } else {
            try {
                let chatList = schema.chatList.slice();
                chatList.unshift(data.username + " : " + data.msg);
                if (chatList.length > 10) { // only keep 10 most recent msgs
                    chatList.pop();
                }
                schema.chatList = chatList;
                await schema.save();

                // dic of userIDs to usernames for quick look-up
                let userIDs = Object.keys(schema.player_to_id_dict).reduce((acc, cur) => {
                    acc[schema.player_to_id_dict[cur]] = cur;
                    return acc;
                }, {});

                const serverRes = {
                    type: "SEND_CHAT_MSG__SUCCESS",
                    data: {
                        chatList: chatList
                    }
                }

                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN && client.id && userIDs[client.id]) {
                        client.send(JSON.stringify(serverRes));
                    }
                });
            } catch (err) {
                console.log('err')
                console.log(err);
                const serverRes = {
                    type: "SEND_CHAT_MSG__ERROR",
                    data: {
                        error: "Could not save chat msg"
                    }
                }
                ws.send(JSON.stringify(serverRes));
            }
        }
    });
};

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
            if (ws.id !== schema.player_to_id_dict[schema.lord]) {
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
                    schema.startGame = true; //update server startGame to true
                    schema.deck = makeDeck(schema.deckSize); //makes the deck based on the deckSize (number of decks param) and shuffles it
                    for (let key in schema.dict_hands) { //deal to players
                        let hand = [];
                        for (let j = 0; j < schema.handSize; j++) {
                            hand.push(schema.deck[schema.deck.length - 1]); //grab last card in deck (top of pile) and insert into players hand
                            schema.deck.pop(); //get rid of last card in deck that was just dealt to player
                        }
                        schema.dict_hands[key] = sortHand(hand); //add tuple of player username and their hand of cards
                        schema.markModified(`dict_hands.${key}`); //save dict changes
                    }
                    for (let key in schema.dict_varData) { //the lord user starts the game (his turn first)
                        if (key === schema.lord) {
                            schema.dict_varData[key][2] = true;
                        } else {
                            schema.dict_varData[key][2] = false;
                        }
                        schema.dict_varData[key][0] = schema.dict_hands[schema.lord].length; //length of a standard hand, lord as ex
                        schema.dict_varData[key][1] = true;
                        schema.dict_varData[key][3] = 0; //set everyones score to 0
                        schema.markModified(`dict_varData.${key}`); //save dict changes
                    }
                    const lastTimestamp = (new Date()).getTime();
                    schema.lastTimestamp = lastTimestamp;

                    await schema.save();

                    const serverRes = {
                        type: "START_GAME__SUCCESS",
                        data: {
                            // hand: schema.dict_hands[username], - will be added in loop below per client
                            cardPile: schema.cardPile,
                            cardsInDeck: schema.deck.length,
                            dict_varData: schema.dict_varData,
                            startGame: true
                        }
                    }

                    // dic of userIDs to usernames for quick look-up
                    let userIDs = Object.keys(schema.player_to_id_dict).reduce((acc, cur) => {
                        acc[schema.player_to_id_dict[cur]] = cur;
                        return acc;
                    }, {});

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN && client.id && userIDs[client.id]) {
                            serverRes.data.hand = schema.dict_hands[userIDs[client.id]]
                            client.send(JSON.stringify(serverRes));
                        }
                    });

                    setTimeout(async () => {
                        await Game.findOne({roomID: data.roomID}, async (err2, schema2) => {
                            if (err2) {
                                console.log("... ERROR:");
                                console.log(err2);
                            } else {
                                if (schema2.lastTimestamp <= lastTimestamp) {
                                    data.isDerby = false;
                                    data.isBattle = ["F", ""];
                                    data.isSandwich = ["F", "", ""];
                                    handleMove(data, ws, wss, schema, true); // autoPlay - player who was up did not play in time so timeout reached (Not cancelled)
                                }
                            }
                        });
                    }, (CLOCK_START_TIME * 1000) + 1000);
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

const leaveGame = async (data, ws, wss) => { //deletes mongo room schema only after all players leave
    /*
    data: {
        roomID: this.props.roomID
        username: this.props.username
    }
    */
    await Game.findOne({roomID: data.roomID}, async (err, schema) => {
        if (err || schema === null) {
            const serverRes = {
                type: "LEAVE_GAME__ERROR",
                data: {
                    error: "Game not found"
                }
            }
            ws.send(JSON.stringify(serverRes));
        } else if (ws.id && data.username && ws.id === schema.player_to_id_dict[data.username]) {
            schema.who_has_left[data.username] = 1;
            schema.markModified(`who_has_left.${data.username}`);
            let all_out = true;
            for (let key in schema.who_has_left) {
                if (!schema.who_has_left[key]) {
                    all_out = false;
                    break;
                }
            }

            if (all_out) {
                try {
                    await Game.findOneAndDelete({roomID: data.roomID}, async (err) => {
                        if (err) {
                            console.log('err')
                            console.log(err);
                            const serverRes = {
                                type: "LEAVE_GAME__ERROR",
                                data: {
                                    error: "Could not find and destroy game"
                                }
                            }
                            ws.send(JSON.stringify(serverRes));
                        } else {
                            //console.log(`Destroyed game: ${data.roomID}`);
                            const serverRes = {
                                type: "LEAVE_GAME__SUCCESS",
                                data: {}
                            }
                            ws.send(JSON.stringify(serverRes));
                        }
                    });
                } catch (err) {
                    console.log('err')
                    console.log(err);
                    const serverRes = {
                        type: "LEAVE_GAME__ERROR",
                        data: {
                            error: "Could not find and destroy game"
                        }
                    }
                    ws.send(JSON.stringify(serverRes));
                }
            } else {
                try {
                    await schema.save();

                    const serverRes = {
                        type: "LEAVE_GAME__SUCCESS",
                        data: {}
                    }
                    ws.send(JSON.stringify(serverRes));
                } catch (err) {
                    console.log('err')
                    console.log(err);
                    const serverRes = {
                        type: "LEAVE_GAME__ERROR",
                        data: {
                            error: "Unknown error"
                        }
                    }
                    ws.send(JSON.stringify(serverRes));
                }
            }
        } else {
            const serverRes = {
                type: "LEAVE_GAME__ERROR",
                data: {
                    error: "Not authorized"
                }
            }
            ws.send(JSON.stringify(serverRes));
        }
    });
};

const playMove = async (data, ws, wss) => {
    /*
    data: {
        roomID: this.props.roomID,
        username: this.props.username,
        usersMove: [this.state.cardSelectedStack_toServ.slice(), "play", this.props.username, []],
        isBattle: isBattle_toServ,
        isDerby: isDerby,
        isSandwich: isSandwich_toServ
    }
    */

    await Game.findOne({roomID: data.roomID}, async (err, schema) => {
        if (err || schema === null) {
            console.log('err');
            console.log(err);
            const serverRes = {
                type: "PLAY_MOVE__ERROR",
                data: {
                    error: "Game not found"
                }
            }
            ws.send(JSON.stringify(serverRes));
        } else if (
            !data.username ||
            !schema.player_to_id_dict[data.username] ||
            ws.id !== schema.player_to_id_dict[data.username]
        ) {
            const serverRes = {
                type: "PLAY_MOVE__ERROR",
                data: {
                    error: "Not authorized"
                }
            }
            ws.send(JSON.stringify(serverRes));
        } else {
            try {
                handleMove(data, ws, wss, schema, false); // dont autoPlay
            } catch (err) {
                console.log("err")
                console.log(err);
                const serverRes = {
                    type: "PLAY_MOVE__ERROR",
                    data: {
                        error: "Unknown error"
                    }
                }
                ws.send(JSON.stringify(serverRes));
            }
        }
    });
};

//makes the deck based on the deckSize (number of decks param) and shuffles it
const makeDeck = (numDecks) => { //14 is for the 2 jokers
    let newDeck = [];
    let sumDeck = [];
    let deck = ['2c', '2d', '2h', '2s', '3c', '3d', '3h', '3s', '4c', '4d', '4h', '4s',
                '5c', '5d', '5h', '5s', '6c', '6d', '6h', '6s', '7c', '7d', '7h', '7s',
                '8c', '8d', '8h', '8s', '9c', '9d', '9h', '9s', '10c', '10d', '10h', '10s',
                '11c', '11d', '11h', '11s', '12c', '12d', '12h', '12s', '13c', '13d', '13h', '13s',
                '14j', '14j', '15c', '15d', '15h', '15s'];

    for (let i = 0; i < numDecks; i++) {
        sumDeck = sumDeck.concat(deck);
    }
    while (sumDeck.length > 0) {
        let ran = Math.floor((Math.random() * sumDeck.length));
        newDeck.push(sumDeck[ran]);
        sumDeck.splice(ran, 1);
    }
    return newDeck;
}

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
}

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
        }
    }
    let winner = [];
    if (plays.length > 0) { //now go through stack and see who won, there could be a tie
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
    } else if (wilds.length >= 2) { //there could be a tie because all people played wild cards
        winner = wilds;
    } else {
        //somehow all poeple battling ran out of cards... possible but very, very, very, improbable
    }
    return [winner, higherIsBetter]; //return winner/s and higherIsBetter
}

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
}


const handleMove = async (data, ws, wss, schema, autoPlay) => {
    if (autoPlay) {
        let curPlayer = null;
        for (let username in schema.dict_varData) {
            if (schema.dict_varData[username][2]) {
                data.username = username;
                break;
            }
        }

        // auto play for player who was supposed to play
        if (schema.dict_varData[data.username][4]) { // sandwiched
            data.usersMove = [["SW"], "SW", data.username, []];
            data.isBattle = ["F", ""];
            data.isSandwich = ["F", "", ""];
        } else if (schema.isDerby && !schema.isBattle) { //is Derby so pass
            data.usersMove = [["pass"], "pass", data.username, []];
            data.isBattle = ["F", ""];
            data.isSandwich = ["F", "", ""];
        } else {
            let randomCardNum = Math.floor((Math.random() * schema.dict_hands[data.username].length));
            if (schema.isBattle) {
                data.usersMove = [[schema.dict_hands[data.username][randomCardNum]], "play", data.username, []];
                data.isDerby = false;
                data.isSandwich = ["F", "", ""];
            } else { //normal
                data.usersMove = [[schema.dict_hands[data.username][randomCardNum]], "fold", data.username, []];
                data.isDerby = false;
                data.isBattle = ["F", ""];
                data.isSandwich = ["F", "", ""];
            }
        }

        if (schema.roundEnd[0] === "T") {
            data.isDerby = false;
            data.isBattle = ["F", ""];
            data.isSandwich = ["F", "", ""];
        }
    }
    let skipTimer = false; // if a battle is going on, dont want to reset timer each time a players move come in, want to wait until all players have played

    // check if move is valid and return cards that will be removed from their hand
    // this is a loose validation, for now just check player played cards that were in their hand
    let validMove = false;
    let cards_to_remove_from_hand = {};
    if (data.usersMove[1] === "play" && data.usersMove[0].length >= 1) {
        let [isValid, cards_to_remove] = arePlayedCardsInPlayersHand(data.usersMove[0], schema.dict_hands[data.username]);
        if (isValid) {
            validMove = true;
            cards_to_remove_from_hand = cards_to_remove;
        }
    } else if (data.usersMove[1] === "fold" && schema.dict_varData[data.username][2] && data.usersMove[0].length >= 1) {
        let [isValid, cards_to_remove] = arePlayedCardsInPlayersHand(data.usersMove[0], schema.dict_hands[data.username])
        if (isValid) {
            validMove = true;
            cards_to_remove_from_hand = cards_to_remove;
        }
    } else if (data.usersMove[1] === "wild" && schema.dict_varData[data.username][2] && data.usersMove[0].length === 1 && (data.usersMove[0][0] === "wild_L" || data.usersMove[0][0] === "wild_H")) {
        schema.dict_hands[data.username].forEach((card) => {
            if (card.includes("9")) {
                validMove = true;
                cards_to_remove_from_hand[card] = 1;
            }
        });
        if ((schema.higherIsBetter && data.usersMove[0][0] === "wild_H") || (!schema.higherIsBetter && data.usersMove[0][0] === "wild_L")) {
            // have to switch directions when playing a wild 9
            validMove = false;
        }
    } else if (data.usersMove[1] === "pass" && schema.dict_varData[data.username][2] && data.usersMove[0].length === 1 && (schema.isDerby || schema.dict_varData[data.username][4])) {
        validMove = true;
    } else if (data.usersMove[1] === "SW" && data.usersMove[0].length === 1) {
        validMove = true;
    } else if (data.usersMove[1] === "outofcards" && schema.dict_varData[data.username][2] && schema.dict_hands[data.username].length === 0 && data.usersMove[0].length === 1) {
        validMove = true;
    }

    if (!validMove) {
        const serverRes = {
            type: "PLAY_MOVE__ERROR",
            data: {
                error: "Invalid move"
            }
        }
        ws.send(JSON.stringify(serverRes));
        return;
    }

    let battleOver = false;
    let sandwichWaitOver = false;
    let derbyOver = false;
    let maybeWinner = "";
    let isAce = false;
    let isRottenEgg = false;
    let stillIn_count = 0;

    if (!schema.isDerby) { //only set schema.isDerby if false, if schema.isDerby is true, want to keep it true until round ends
        schema.isDerby = data.isDerby;
    } else if (data.usersMove[1] === "play" && data.usersMove[0].length === 1) {
        schema.isDerby = false;
    }

    if (schema.roundEnd[0] === "T") { // Round just ended last turn so reset
        schema.roundEnd = ["F", ""];
        schema.cardPile = [];
    }

    let new_hand = schema.dict_hands[data.username].filter((card) => {
        let keepCard = !cards_to_remove_from_hand[card]
        cards_to_remove_from_hand[card] -= 1;
        return keepCard;
    });
    schema.dict_hands[data.username] = new_hand; //update dict_hands
    schema.markModified(`dict_hands.${data.username}`); //save changes to dict_hands
    schema.dict_varData[data.username][0] = new_hand.length; //update amount of cards in his hand
    schema.dict_varData[data.username][2] = false; //update turn index of dict_varData for person who just played to false
    schema.markModified(`dict_varData.${data.username}`); //save changes to dict_varData

    if (data.usersMove[1] === "SW") {
        schema.dict_varData[data.username][4] = false; // they are not sandwiched bc they are out
        schema.dict_varData[data.username][2] = false; // not their turn
        schema.dict_varData[data.username][1] = false; // no longer in round
        schema.markModified(`dict_varData.${data.username}`);
        let sandCounter = 0;
        for (let key in schema.dict_varData) {
            if (schema.dict_varData[key][4] === true) { //if this person is sandwiched
                sandCounter = 1;
                break;
            }
        }
        if (sandCounter === 0) {
            sandwichWaitOver = true;
        }
    } else if (data.isSandwich[0] === "T") { //person just sandwiched another person incoming data has isDerby set to true
        schema.sandwicher = data.username;
        if (schema.isBattle) { // its already a battle
            for (let i = 0; i < schema.battleStack_Players.length; i++) {
                if (schema.battleStack_Players[i] !== data.username) {
                    schema.dict_varData[schema.battleStack_Players[i]][4] = true; // they are sandwiched
                    schema.dict_varData[schema.battleStack_Players[i]][2] = true; // set so they have chance to re-sand
                    schema.markModified(`dict_varData.${schema.battleStack_Players[i]}`);
                }
            }
            //one or more battlers already submitted their battle move so battleStack move list exists
            for (let i = 0; i < schema.battleStack_Moves.length; i++) {
                //1 prob with sandwiching rn: if 2 peeps are battling, 1 has played a card, other hasn't and a 3rd player sandwiches
                //both of them, the player who has played his battle card will lose it...
                schema.battleStack_Moves[i][3] = ["LC", []]; //display as lost card
                schema.cardPile.unshift(schema.battleStack_Moves[i]); //add lost cards to pile
            }

            if (data.isSandwich[3] === "RS") {
                data.usersMove[3] = ["RS", schema.battleStack_Players.filter((username) => username !== data.username)];
            } else { // normal sandwich
                data.usersMove[3] = ["S", schema.battleStack_Players.filter((username) => username !== data.username)];
            }

            if (data.usersMove[0].length === 1) {
                schema.isDerby = false;
            }
            schema.isBattle = false; //no longer a battle since everyone in it was sandwiched
            schema.battleStack_Players = []; //reset battleStack
            schema.battleStack_Moves = []; //reset battleStack
        } else { //derby or normal so only 1 person is getting sandwiched = prev person
            for (let key in schema.dict_varData) { //put everyone out
                if (schema.dict_varData[key][4] === false) {
                    schema.dict_varData[key][2] = false; //set all peoples turn to false who are not currently sandwiched
                    schema.markModified(`dict_varData.${key}`); //save
                }
                /* error bc ... does not account for people currently sandwiched
                if (schema.dict_varData[key][2] == true) {
                    schema.dict_varData[key][2] = false; //set all peoples turn to false (should only be 1 person)
                    schema.markModified(`dict_varData.${key}`); //save
                }
                */
            } //then put just-sandwiched person in
            schema.dict_varData[data.isSandwich[1]][4] = true; // they are sandwiched
            schema.dict_varData[data.isSandwich[1]][2] = true; // set so they have chance to resand
            schema.markModified(`dict_varData.${data.isSandwich[1]}`);
            if (data.isSandwich[3] === "RS" ) {
                data.usersMove[3] = ["RS", [data.isSandwich[1]]]; //store replica in move
            } else { // normal sandwich
                data.usersMove[3] = ["S", [data.isSandwich[1]] ]; //store person being sandwiched
            }
        }

        if (data.isSandwich[3] === "RS" ) { //reSandwich, data.sandwichStack.length < schema.sandwichStack.length
            schema.dict_varData[data.username][4] = false; // you are not sandwiched
            schema.markModified(`dict_varData.${data.username}`);
        }
    }

    //Battles, no sandwiching
    if (!schema.isBattle && data.isBattle[0] === "T" && data.usersMove[1] !== "SW") { //BATTLE, person who just played initiated a battle
        schema.isBattle = true;
        for (let key in schema.dict_varData) { //set everyones yourTurn to false but battlers
            if (key === data.username) { //2 peeps battling
                schema.dict_varData[data.username][2] = true; //set person who just instigated battle's turn to true
                schema.markModified(`dict_varData.${data.username}`);
            } else if (key === data.isBattle[1]) {
                schema.dict_varData[data.isBattle[1]][2] = true; //person who is being battled has turn = true
                schema.markModified(`dict_varData.${data.isBattle[1]}`);
            } else { //set non battlers turn to false
                if (schema.dict_varData[key][4] === false) { //only if they aren't currently sandwiched
                    schema.dict_varData[key][2] = false;
                    schema.markModified(`dict_varData.${key}`);
                }
            }
        }

        if (schema.dict_varData[data.isBattle[1]][1]) { //if person being battled is still in
            schema.battleStack_Players.push(data.username); //guy who played
            schema.battleStack_Players.push(data.isBattle[1]); //prev guy who played
        } else { //only wait for person still in => person who just played to play one more card to win battle
            schema.battleStack_Players.push(data.username); //guy who played, so will only wait for him to play again to end battle
            schema.dict_varData[data.isBattle[1]][2] = false; //person being battled has turn = false since he is out of the round
            schema.markModified(`dict_varData.${data.isBattle[1]}`);
        }

        data.usersMove[3] = ["B", [data.isBattle[1]] ]; //store person being battled
        schema.cardPile.unshift(data.usersMove); //put move on top of cardPile (in front of array)
        //now wait for all peeps in battle to play their moves
    } else if (schema.isBattle && data.usersMove[1] !== "SW") { //already was a battle, another person joined, >= 3 person battle
        if (schema.battleStack_Players.indexOf(data.username) < 0) { //not already in battle, via battle button
            schema.dict_varData[data.username][2] = true; //person who is battling has turn = true
            schema.markModified(`dict_varData.${data.username}`);
            data.usersMove[3] = ['B', []]; //dont need to pass people being battled, waste of space //schema.battleStack_Players.slice()
            schema.battleStack_Players.push(data.username); //new guy joined battle, so battle > 2 people
            schema.cardPile.unshift(data.usersMove); //put move on top of cardPile (in front of array)
        } else { //already a part of battle so add his move to stack and set his turn to false
            schema.dict_varData[data.username][2] = false; //person who is battling has turn = false
            schema.markModified(`dict_varData.${data.username}`);
            schema.battleStack_Moves.unshift(data.usersMove); //add move to existing list of moves
        }

        //see who won battle, use short circuit eval because schema.battleStack[1] might not exist if a 3rd or more peeps join battle before
        //any prev players played their batle moves
        if (schema.battleStack_Players.length === schema.battleStack_Moves.length) { //everyone has played their battle move
            //wild 9 could be played so return that in data if played and update schema
            //schema.cardPile.unshift([schema.battleStack_Moves, "battle", "Battle", []]); //will be rendered as a battle result
            let tmp = schema.battleStack_Moves.slice();
            let tmp2 = schema.higherIsBetter;
            let resData = whoWonBattle(tmp, tmp2);
            schema.higherIsBetter = resData[1]; // [1] bool h is b

            //send back who won...

            if (resData[0].length > 1) { // battleOver = false;
                // do another battle...
                schema.cardPile.unshift([schema.battleStack_Moves, "battle", "Tie! Another Battle!", []]);
                schema.battleStack_Players = []; //reset battleStack
                schema.battleStack_Moves = []; //reset battleStack
                for (let key in schema.dict_varData) { //put everyone out
                    schema.dict_varData[key][1] = false; //stillIn = false
                    schema.dict_varData[key][2] = false; //yourTurn = false
                    schema.markModified(`dict_varData.${key}`);
                }
                for (let i = 0; i < resData[0].length; i++) { //then put tied people back in
                    schema.battleStack_Players.push(resData[0][i][2]); //recreate the battleStack data structure user list
                    schema.dict_varData[ resData[0][i][2] ][1] = true; //set stillIn to true for tied battle person
                    schema.dict_varData[ resData[0][i][2] ][2] = true; //set yourTurn to true for tied battle person
                    schema.markModified(`dict_varData.${resData[0][i][2]}`); //save
                }
                // ...wait for tied players to play their next battle moves
            } else {
                battleOver = true;
                schema.cardPile.unshift([schema.battleStack_Moves, "battle", "Battle Result", []]);
                if (resData[0].length == 0) { //everybody ran out of cards or rotten egg was played...
                    maybeWinner = "haha... no winner"; //won round
                } else {
                    maybeWinner = resData[0][0][2]; //winner won round
                }
            }
        } else { // everyone in battle has not played their move, only at least one has
            skipTimer = true;
        }
        // ...wait for all people in battle to play their moves
    //Normal or Derby, no battle or sandwich
    } else { //NOT A BATTLE, normal or Derby , one person plays at a time
        if (schema.isDerby) {
            if (data.usersMove[1] !== "SW") {
                schema.cardPile.unshift(data.usersMove); //put move on top of cardPile (in front of array)
            }
            if (data.usersMove[1] === "play") {
                schema.derbyLastPlay = data.username; //keep track of who "played" last, not "passed", never need to reset this value
                //schema.cardPile.unshift(data.usersMove);
            } else {
                //player passed
            }

            if (data.isSandwich[0] !== "T" && data.usersMove[1] !== "SW" || sandwichWaitOver) { //if not a sand bc want to wait for sandwiched person to maybe resandwich
                maybeWinner = schema.derbyLastPlay; //no matter what asign a tmp winner, but if round isn't over, does not matter
                let aFlag = true;

                if (data.usersMove[1] === "play" && data.usersMove[0][0].substr(0,2) === "15") { //Ace was played so end round
                    //ace so ends round, skips over check below
                } else {
                    let next = schema.orderOfPlay[data.username];
                    if (sandwichWaitOver === true)  {
                        next = schema.orderOfPlay[schema.sandwicher];
                    }
                    for (let key in schema.dict_varData) {
                        if (schema.dict_varData[next][1] === true) { //found next player who is still in
                            //if derby and next person up is also the last person who "played" and not "passed", round is over
                            if (schema.derbyLastPlay === next) {
                                //derbyOver = true, ends round by breaking before looping to person who is still in but passed
                            } else { //found next player who is still in who did not play the last played hand
                                aFlag = false;
                                schema.dict_varData[next][2] = true;
                                schema.markModified(`dict_varData.${next}`);
                            }
                            break;
                        } else {
                            next = schema.orderOfPlay[next]; //increment to next player
                        }
                    }
                }
                derbyOver = aFlag; //this ends the round if true
            }
        } else { //normal
            if (data.usersMove[1] !== "SW") {
                schema.cardPile.unshift(data.usersMove); //put move on top of cardPile (in front of array)
            }
            if (data.usersMove[1] === "play" && data.usersMove[0][0].substr(0,2) === "15") { //Ace was played so end round
                isAce = true; //only when not a battle and not a derby
            } else if (data.usersMove[1] === "play" && data.usersMove[0][0] === "69x") {
                isRottenEgg = true;
            } else if (data.usersMove[1] === "wild") { //wild 9 was played, update higherIsBetter.
                if (data.usersMove[0][0] === "wild_H") {
                    schema.higherIsBetter = true;
                } else {
                    schema.higherIsBetter = false;
                }
            } else if (data.usersMove[1] === "fold" || data.usersMove[1] === "outofcards") {
                schema.dict_varData[data.username][1] = false; //that person folded so is no longer in round
                schema.markModified(`dict_varData.${data.username}`);
                if (data.usersMove[1] === "outofcards") {
                    // ran out of cards
                } else {
                    // folded
                }
            }

            if (isAce) { //ace was played outside of a battle
                maybeWinner = data.username;
            } else if (isRottenEgg) {
                maybeWinner = "haha... no winner";
            } else { //see who is in to determine if the round continues
                //continue round?
                for (let key in schema.dict_varData) {
                    if (schema.dict_varData[key][1]) { //if this person is still in increase count
                        stillIn_count = stillIn_count + 1;
                        maybeWinner = key;
                    }
                    if (stillIn_count > 1) { //speeds up lookup
                        break; //round is NOT over
                    }
                }
            }
        }
    }

    // Move processing is done, onto deck, score, next up stuff...
    if (data.isSandwich[0] !== "T" && data.usersMove[1] !== "SW" || (data.usersMove[1] === "SW" && sandwichWaitOver) ){
        //everything/code comes back here no matter if battle, derby or normal
        if (!schema.isBattle || battleOver || derbyOver) { //only skip over if in battle/waiting for people to play their battle moves
            if (stillIn_count === 1 || isAce || isRottenEgg || battleOver || derbyOver) { //round is over.
                let card_count = 0;
                if (maybeWinner !== "haha... no winner") { //check to see if a rotten egg was played
                    for (let p = 0; p < schema.cardPile.length; p++) { //go thru all players
                        if (schema.cardPile[p][1] === "fold") { //this check speeds loop up
                            for (let x = 0; x < schema.cardPile[p][0].length; x++) { //go thru a// players played cards
                                if (schema.cardPile[p][0][x] === "69x") { //look for a folded rotten egg
                                    isRottenEgg = true;
                                    maybeWinner = "haha... no winner";
                                    schema.cardPile.unshift([["69x"], "play", schema.cardPile[p][2], []]); //to show it was played
                                    break;
                                }
                            }
                        }
                        if (isRottenEgg) {
                            break;
                        }
                    }
                }
                //always want to see how many cards were played
                for (let x = 0; x < schema.cardPile.length; x++) { //only tally play, wild, and folded cards
                    if (schema.cardPile[x][1] === "play" || schema.cardPile[x][1] === "fold") {
                        card_count = card_count + schema.cardPile[x][0].length;
                    } else if (schema.cardPile[x][1] === "battle") {
                        for (let y = 0; y < schema.cardPile[x][0].length; y++) {
                            if (schema.cardPile[x][0][y][1] !== "outofcards") {
                                card_count = card_count + schema.cardPile[x][0][y][0].length; //num cards played per person in battle
                            }
                        }
                    } else if (schema.cardPile[x][1] === "wild") {
                        card_count = card_count + 1;
                    }
                }

                if (maybeWinner === "haha... no winner") { //there wasn't a winner...  rotten egg or tie
                    schema.roundLog = ["No winner", 0, card_count]; //save round events and send back to clients
                } else { // add score to winners score
                    schema.roundLog = [maybeWinner, schema.dict_varData[maybeWinner][3], card_count]; //save round events and send back to clients
                    schema.dict_varData[maybeWinner][3] = schema.dict_varData[maybeWinner][3] + card_count; //adds cards from battle to score
                    schema.markModified(`dict_varData.${maybeWinner}`); //save
                }

                //refuel?
                if (schema.deck.length > 0) {
                    let refuelStack = [];
                    let doneCounter = 0;
                    for (let key in schema.dict_hands) {
                        if (schema.dict_hands[key].length <= schema.refuelNum) {
                            refuelStack.push(key); //if player is below limit, add him to stack so he can get refueled
                        }
                    }
                    do { //continuous goes around and deals 1 card at a time so cards are dealt evenly amoung players needing refill
                        doneCounter = 0;
                        for (let i = 0; i < refuelStack.length; i++) {
                            if (schema.dict_hands[refuelStack[i]].length < schema.handSize && schema.deck.length > 0) { //refuel
                                schema.dict_hands[refuelStack[i]].push(schema.deck[ schema.deck.length - 1 ]);
                                schema.markModified(`dict_hands.${refuelStack[i]}`); //save
                                schema.dict_varData[refuelStack[i]][0] = schema.dict_hands[refuelStack[i]].length; //update cards in hand in dict_varData
                                schema.markModified(`dict_dict_varData.${refuelStack[i]}`); //save
                                schema.deck.pop(); //get rid of last card in deck that was just dealt to players hand
                            } else {
                                doneCounter = doneCounter + 1;
                            }
                        }
                    } while (doneCounter < refuelStack.length)
                    //only sort hands of player/s that needed to refuel
                    for (let i = 0; i < refuelStack.length; i++) {
                        schema.dict_hands[refuelStack[i]] = sortHand(schema.dict_hands[refuelStack[i]])
                        schema.markModified(`dict_hands.${refuelStack[i]}`);
                    }
                } else {
                    // no more cards in deck... cant refuel
                }
                // this is only var that is not reset, will get reset next time this route is hit
                // if schema.roundEnd[0] === "T" --> schema.roundEnd = ["F", ""];
                schema.roundEnd = ["T", maybeWinner]; //send winner back to client signaling round is over
                //reset everything else for next round since round is over
                schema.isBattle = false;
                schema.isDerby = false;
                schema.battleStack_Players = [];
                schema.battleStack_Moves = [];
                for (let key in schema.dict_varData) { //put everyone back in
                    schema.dict_varData[key][1] = true; //set stillIn to true for everyone
                    schema.dict_varData[key][2] = false; //set yourTurn to false for everyone
                    schema.dict_varData[key][4] = false; //set sandwiched to false
                    schema.markModified(`dict_varData.${key}`); //save
                }
                //gameOver?
                if (schema.deck.length === 0) { //even if no cards left in deck, play until only 1 or 0 people left with cards
                    let guysWithHands_count = 0;
                    for (let key in schema.dict_hands) {
                        if (schema.dict_hands[key].length > 0) { //if this person is still in increase count
                            guysWithHands_count = guysWithHands_count + 1;
                        } else { //he has no more cards left so set stillIn = false (will be like this for rest of the game)
                            schema.dict_varData[key][1] = false; //set stillIn to false
                            schema.markModified(`dict_varData.${key}`);
                        }
                        if (guysWithHands_count > 1) { //speeds up look-up loop
                            break; //Game is NOT over
                        }
                    }
                    if (guysWithHands_count <= 1) { //game is over
                        let winner = [schema.lord]; //could be a tie
                        for (let keyy in schema.dict_varData) {
                            if (schema.dict_varData[keyy][3] > schema.dict_varData[winner[0]][3]) {
                                winner = [keyy]; //better than the person or people tied
                            } else if (schema.dict_varData[keyy][3] === schema.dict_varData[winner[0]][3] && keyy !== schema.lord) {
                                winner.push(keyy); //so far is a tie
                            }
                        }
                        schema.gameOver = ["T", winner];
                    }
                }

                //Game not over...
                if (schema.gameOver[0] === "F") { //game is not over but round is, maybeWinner won round so he starts next round
                    let toStart = maybeWinner;
                    if (maybeWinner === "haha... no winner") {
                        toStart = schema.players[Math.floor(Math.random()*schema.players.length)];
                    }
                    while (schema.dict_varData[toStart][0] <= 0 ) { //while that player is not out of the game (has cards)
                        toStart = orderOfPlay[toStart]; //look at next person in line
                    } //this loop should always end since there are > 1 people with cards left in their hand
                    schema.dict_varData[toStart][2] = true;
                }
            } else if (stillIn_count > 1 && !schema.isDerby) { //Round not over. in normal mode. set next persons turn whos still in
                //round is not over, if not a battle and cur player has played, find next person still in
                let next = schema.orderOfPlay[data.username];
                if (sandwichWaitOver) {
                    next = schema.orderOfPlay[schema.sandwicher];
                }
                let copi = next;
                for (let key in schema.dict_varData) { //cycle through everyone
                    if (schema.dict_varData[next][1] === true) { //found next player who is still in
                        schema.dict_varData[next][2] = true; // set their turn to true
                        schema.markModified(`dict_varData.${next}`);
                        break;
                    } else {
                        next = schema.orderOfPlay[next]; //increment to next player
                    }
                }
                //if (copi === next) {
                    // someone else should still be in... something is wrong
                //}
            } //else {
                // Derby still going
            //}
        } //else {
            //battle just started, battle isn't over or sandwich just occured...
            //wait for all players in battle to play their moves
        //}
    } //else {
        // sandwich wait is not over...
    //}
    const lastTimestamp = (new Date()).getTime();
    if (!skipTimer) {
        schema.lastTimestamp = lastTimestamp;
    }

    await schema.save();

    // dic of userIDs to usernames for quick look-up
    let userIDs = Object.keys(schema.player_to_id_dict).reduce((acc, cur) => {
        acc[schema.player_to_id_dict[cur]] = cur;
        return acc;
    }, {});

    const serverRes = {
        type: "PLAY_MOVE__SUCCESS",
        data: {
            // hand: schema.dict_hands[user], - added in below loop per client
            higherIsBetter: schema.higherIsBetter,
            cardPile: schema.cardPile,
            cardsInDeck: schema.deck.length,
            dict_varData: schema.dict_varData,
            isBattle: schema.isBattle,
            battleStack_Players: schema.battleStack_Players,
            isDerby: schema.isDerby,
            gameOver: schema.gameOver,
            roundEnd: schema.roundEnd,
            roundLog: schema.roundLog,
            error: "",
            battleNotAllPlayersPlayed: skipTimer // only if still waiting on all players in battle to play battle card
        }
    }

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.id && userIDs[client.id]) {
            serverRes.data.hand = schema.dict_hands[userIDs[client.id]]
            client.send(JSON.stringify(serverRes));
        }
    });

    if (!skipTimer) {
        setTimeout(async () => {
            await Game.findOne({roomID: data.roomID}, async (err2, schema2) => {
                if (err2) {
                    console.log("... ERROR:");
                    console.log(err2);
                } else {
                    if (schema2.lastTimestamp <= lastTimestamp) {
                        handleMove(data, ws, wss, schema, true); // autoPlay - player who was up did not play in time so timeout reached (Not cancelled)
                    }
                }
            });
        }, (CLOCK_START_TIME * 1000) + 1000);
    }
};


module.exports = {
    createGame: createGame,
    joinGame: joinGame,
    leaveGame: leaveGame,
    rejoinGame: rejoinGame,
    sendChatMsg: sendChatMsg,
    startGame: startGame,
    playMove: playMove
}
