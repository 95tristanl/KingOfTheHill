const { createUserIdsToUsernames, sortHand, whoWonBattle, arePlayedCardsInPlayersHand, pickManager, pickBackup } = require("./helpers");
const { genRandomString } = require("../../utils");

const WebSocket = require('ws');
const Game = require("../models/game");

const playMove = async (data, ws, wss) => {
    /*
    data: {
        roomID: this.props.roomID,
        username: this.props.username,
        usersMove: [this.state.cardSelectedStack_toServer.slice(), "play", this.props.username, []],
        battleData: battleData_toServer,
        isDerby: isDerby,
        sandwichData: sandwichData_toServer
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
            !schema.usernameToId[data.username] ||
            ws.id !== schema.usernameToId[data.username]
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
                handleMove(data, ws, wss, schema, false); // autoPlay = false
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

const handleMove = async (data, ws, wss, schema, autoPlay) => {

    const {roomID: _, ...rest} = data;
    console.log(rest);
    console.log("");

    let multiplePlayersAutoPlayed = false;
    if (autoPlay) {
        const numPlayersToAutoPlayFor = Object.values(schema.playerInfo).filter((player) => player.yourTurn).length;
        multiplePlayersAutoPlayed = numPlayersToAutoPlayFor > 1;

        if (numPlayersToAutoPlayFor === 1) {
            for (const username in schema.playerInfo) {
                if (schema.playerInfo[username].yourTurn) {
                    data.username = username; // need to set the data.username to the player we are autoplaying for - autoplay is called by a manager or a backup so the data.username will initially be set to their username
                    break;
                }
            }
    
            // auto play for player who was supposed to play
            if (schema.playerInfo[data.username].isSandwiched) {
                data.usersMove = [["SW"], "SW", data.username, []];
                data.battleData = {isBattle: false, battler: ""};
                data.sandwichData = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""};
            } else if (schema.isDerby && !schema.isBattle) { //is Derby so pass
                data.usersMove = [["pass"], "pass", data.username, []];
                data.battleData = {isBattle: false, battler: ""};
                data.sandwichData = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""};
            } else {
                const randomCardNum = Math.floor((Math.random() * schema.playerHands[data.username].length));
                if (schema.isBattle) {
                    data.usersMove = [[schema.playerHands[data.username][randomCardNum]], "play", data.username, []];
                    data.isDerby = false;
                    data.sandwichData = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""};
                } else { // normal
                    data.usersMove = [[schema.playerHands[data.username][randomCardNum]], "fold", data.username, []];
                    data.isDerby = false;
                    data.battleData = {isBattle: false, battler: ""};
                    data.sandwichData = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""};
                }
            }
    
            if (schema.roundEnd.isEnd) {
                data.isDerby = false;
                data.battleData = {isBattle: false, battler: ""};
                data.sandwichData = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""};
            }
        } else if (numPlayersToAutoPlayFor > 1) { // rare edge case: in Battle and more than 1 player did not play in time
            // in this case want to preserve the idea/flow of a move being played by a client meaning that we still want to populate the data var
            // with correct values for 1 of the auto played players. For the other players that need to be auto played for we will set the schema 
            // data (as if those moves were already/previously played) bc we cant play 2 or more moves at the same time - always want to play 1 move at a time -> go through the handleMove function once per played turn 
            
            const numPlayersSandwiched = Object.values(schema.playerInfo).filter((player) => player.isSandwiched).length;
            console.log(`numPlayersSandwiched: ${numPlayersSandwiched}`);
            
            if (schema.isBattle) {
                let setDataForAutoPlayedPlayer = true; // will be switched to false after we come across 1st player whose turn it is (there will be multiple players whose turn it is)
                for (const username in schema.playerInfo) {
                    if (schema.playerInfo[username].yourTurn) { // if their turn
                        if (schema.playerHands[username].length >= 1) { // if they have cards in their hand
                            const randomCardNum = Math.floor((Math.random() * schema.playerHands[username].length));

                            if (setDataForAutoPlayedPlayer) {
                                // as if user played regular battle move - but in this case its being auto played for them
                                setDataForAutoPlayedPlayer = false;
                                data.username = username; // need to set the data.username to the player we are autoplaying for
                                data.usersMove = [[schema.playerHands[username][randomCardNum]], "play", username, []];
                                data.isDerby = false;
                                data.sandwichData = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""};
                            } else {
                                // as if user had *already* played regular battle move - but in this case save auto played move for them in db/shema as if they already played
                                schema.playerInfo[username].yourTurn = false; //person who is battling has turn = false
                                schema.markModified(`playerInfo.${username}`);
                                const autoPlayedMove = [[schema.playerHands[username][randomCardNum]], "play", username, []];
                                schema.battleStack_Moves.unshift(autoPlayedMove); //add move to existing list of moves
                            }
                        } else { // user is out of cards
                            if (setDataForAutoPlayedPlayer) {
                                // as if user played regular battle move - but in this case its being auto played for them
                                setDataForAutoPlayedPlayer = false;
                                data.username = username; // need to set the data.username to the player we are autoplaying for
                                data.usersMove = [["outofcards"], "outofcards", username, []];
                                data.isDerby = false;
                                data.sandwichData = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""};
                            } else {
                                // as if user had *already* played regular battle move - but in this case save auto played move for them in db/shema as if they already played
                                schema.playerInfo[username].yourTurn = false; //person who is battling has turn = false
                                schema.markModified(`playerInfo.${username}`);
                                const autoPlayedMove = [["outofcards"], "outofcards", username, []];
                                schema.battleStack_Moves.unshift(autoPlayedMove); //add move to existing list of moves
                            }
                        }
                    }
                }
            } else if (numPlayersSandwiched > 1) { // multiple players who are sandwiched did not play -> need to autoplay for them
                let setDataForAutoPlayedPlayer = true; // will be switched to false after we come across 1st player whose turn it is (there will be multiple players whose turn it is)
                for (const username in schema.playerInfo) {
                    if (schema.playerInfo[username].yourTurn && schema.playerInfo[username].isSandwiched) { // if their turn and they are sandwiched
                        if (setDataForAutoPlayedPlayer) {
                            // as if user played regular battle move - but in this case its being auto played for them
                            setDataForAutoPlayedPlayer = false;
                            data.username = username; // need to set the data.username to the player we are autoplaying for
                            data.usersMove = [["SW"], "SW", username, []];
                            data.battleData = {isBattle: false, battler: ""};
                            data.sandwichData = {isSandwiched: false, lastFoe: "", usersCard: "", type: ""};
                        } else {
                            // as if user had *already* played regular battle move - but in this case save auto played move for them in db/shema as if they already played
                            schema.playerInfo[username].isSandwiched = false; // they are no longer sandwiched bc they are now out
                            schema.playerInfo[username].yourTurn = false; // not their turn anymore
                            schema.playerInfo[username].stillIn = false; // no longer in round
                            schema.markModified(`playerInfo.${username}`);
                            // do I need to add this to cardPile ? -> schema.cardPile.unshift(data.usersMove);
                        }
                    }
                }
            } else {
                console.log("Error: numPlayersToAutoPlayFor > 1 but schema.isBattle is false and numPlayersSandwiched <= 1 ... (unanticipated state)");
            }
        } else {
            console.log("Error: in autoPlay code block but numPlayersToAutoPlayFor < 1 (unanticipated state)");
        }
    }
    let skipTimer = false; // if a battle is going on, dont want to reset timer each time a players move come in, want to wait until all players have played

    // check if move is valid and return cards that will be removed from their hand
    // this is a loose validation, for now just check player played cards that were in their hand - does not check if move was entirely valid
    let validMove = false;
    let cards_to_remove_from_hand = {};
    if (data.usersMove[1] === "play" && data.usersMove[0].length >= 1) {
        let [isValid, cards_to_remove] = arePlayedCardsInPlayersHand(data.usersMove[0], schema.playerHands[data.username]);
        if (isValid) {
            validMove = true;
            cards_to_remove_from_hand = cards_to_remove;
        }
    } else if (data.usersMove[1] === "fold" && schema.playerInfo[data.username].yourTurn && data.usersMove[0].length >= 1) {
        let [isValid, cards_to_remove] = arePlayedCardsInPlayersHand(data.usersMove[0], schema.playerHands[data.username])
        if (isValid) {
            validMove = true;
            cards_to_remove_from_hand = cards_to_remove;
        }
    } else if (data.usersMove[1] === "wild" && schema.playerInfo[data.username].yourTurn && data.usersMove[0].length === 1 && (data.usersMove[0][0] === "wild_L" || data.usersMove[0][0] === "wild_H")) {
        schema.playerHands[data.username].forEach((card) => {
            if (card.includes("9")) {
                validMove = true;
                cards_to_remove_from_hand[card] = 1;
            }
        });
        if ((schema.higherIsBetter && data.usersMove[0][0] === "wild_H") || (!schema.higherIsBetter && data.usersMove[0][0] === "wild_L")) {
            // have to switch directions when playing a wild 9
            validMove = false;
        }
    } else if (data.usersMove[1] === "pass" && schema.playerInfo[data.username].yourTurn && data.usersMove[0].length === 1 && (schema.isDerby || schema.playerInfo[data.username].isSandwiched)) {
        validMove = true;
    } else if (data.usersMove[1] === "SW" && data.usersMove[0].length === 1) {
        validMove = true;
    } else if (data.usersMove[1] === "outofcards" && schema.playerInfo[data.username].yourTurn && schema.playerHands[data.username].length === 0 && data.usersMove[0].length === 1) {
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
    } else if (data.usersMove[1] === "play" && data.usersMove[0].length === 1) { // was a Derby but player got sandwiched 
        schema.isDerby = false;
    }

    if (schema.roundEnd.isEnd) { // Round just ended last turn so reset
        schema.roundEnd = {isEnd: false, winner: ""};
        schema.markModified("roundEnd.isEnd");
        schema.markModified("roundEnd.winner");
        schema.cardPile = [];
    }
    
    // remove any cards from auto played player's hand that were autoplayed
    let new_hand = schema.playerHands[data.username].filter((card) => {
        let keepCard = !cards_to_remove_from_hand[card];
        cards_to_remove_from_hand[card] -= 1;
        return keepCard;
    });
    schema.playerHands[data.username] = new_hand; // update playerHands
    schema.markModified(`playerHands.${data.username}`); // save changes to playerHands
    schema.playerInfo[data.username].handSize = new_hand.length; // update amount of cards in his hand
    schema.playerInfo[data.username].yourTurn = false; // update turn index of playerInfo for person who just played to false
    schema.markModified(`playerInfo.${data.username}`);

    // "S" = user sandwiched other player(s)
    // "RS" = user unsandwiched themselves and sandwiched other player(s)
    // "SW" = user got sandwiched and didn't re/unsandwich so now is out
    if (data.usersMove[1] === "SW") {
        schema.playerInfo[data.username].isSandwiched = false; // they are no longer sandwiched bc they are now out
        schema.playerInfo[data.username].yourTurn = false; // not their turn anymore
        schema.playerInfo[data.username].stillIn = false; // no longer in round
        schema.markModified(`playerInfo.${data.username}`);

        // check if anyone is still sandwiched, if no one is still sandwiched the wait for all sandwiched players to try and re/unsandwich or pass is over, can move onto next turn or round ends
        sandwichWaitOver = Object.values(schema.playerInfo).every((player) => !player.isSandwiched);
        console.log(`sandwichWaitOver: ${sandwichWaitOver}`);
    } else if (data.sandwichData.isSandwiched) { // player just sandwiched another player(s)
        schema.sandwicher = data.username;
        if (schema.isBattle) { // its already a battle
            console.log("isSandwiched - isBattle")
            console.log(data.sandwichData.type)
            schema.battleStack_Players.forEach((player) => {
                if (player !== data.username) {
                    schema.playerInfo[player].isSandwiched = true; // they are sandwiched
                    schema.playerInfo[player].yourTurn = true; // set so they have chance to re-sand
                    schema.markModified(`playerInfo.${player}`);
                }
            });

            // one or more battlers already submitted their battle move so battleStack move list exists
            schema.battleStack_Moves.forEach((move) => {
                // 1 prob with sandwiching rn: if 2 peeps are battling, 1 has played a card, other hasn't and a 3rd player sandwiches both of them, the player who has played his battle card will lose it...
                move[3] = ["LC", []]; //display as lost card
                schema.cardPile.unshift(move); //add lost cards to pile
            });

            const sandwichTypeEnum = data.sandwichData.type === "RS" ? "RS" : "S";
            data.usersMove[3] = [sandwichTypeEnum, schema.battleStack_Players.filter((username) => username !== data.username)];

            if (data.usersMove[0].length === 1) {
                schema.isDerby = false;
            }
            schema.isBattle = false; // no longer a battle since everyone in it was sandwiched
            schema.battleStack_Players = []; // reset battleStack
            schema.battleStack_Moves = []; // reset battleStack
        } else { // derby or normal so only 1 person is getting sandwiched = prev person
            Object.entries(schema.playerInfo).forEach(([player, playerInfo]) => {
                if (playerInfo.isSandwiched === false) { // set all players turn to false who are not currently sandwiched - want to give all sandwiched players a turn to re/unsandwich
                    playerInfo.yourTurn = false; 
                    schema.markModified(`playerInfo.${player}`);
                }
            });
            schema.playerInfo[data.sandwichData.lastFoe].isSandwiched = true; // they are sandwiched
            schema.playerInfo[data.sandwichData.lastFoe].yourTurn = true; // set so they have a chance to re/unsandwich
            schema.markModified(`playerInfo.${data.sandwichData.lastFoe}`);
            
            const sandwichTypeEnum = data.sandwichData.type === "RS" ? "RS" : "S";
            data.usersMove[3] = [sandwichTypeEnum, [data.sandwichData.lastFoe]];
        }

        if (data.sandwichData.type === "RS" ) {
            schema.playerInfo[data.username].isSandwiched = false; // you are not sandwiched
            schema.markModified(`playerInfo.${data.username}`);
        }
    }

    // Battles, no sandwiching
    if (!schema.isBattle && data.battleData.isBattle && data.usersMove[1] !== "SW") { // BATTLE, person who just played initiated a battle
        schema.isBattle = true;
        for (const username in schema.playerInfo) { //set everyones yourTurn to false but battlers
            if (username === data.username) { // 2 peeps battling
                schema.playerInfo[data.username].yourTurn = true; // set person who just instigated battle's turn to true
                schema.markModified(`playerInfo.${data.username}`);
            } else if (username === data.battleData.battler) {
                schema.playerInfo[data.battleData.battler].yourTurn = true; // person who is being battled has turn = true
                schema.markModified(`playerInfo.${data.battleData.battler}`);
            } else { // set non battlers turn to false
                if (schema.playerInfo[username].isSandwiched === false) { // only if they aren't currently sandwiched
                    schema.playerInfo[username].yourTurn = false;
                    schema.markModified(`playerInfo.${username}`);
                }
            }
        }

        if (schema.playerInfo[data.battleData.battler].stillIn) { // if person being battled is still in
            schema.battleStack_Players.push(data.username); //guy who played
            schema.battleStack_Players.push(data.battleData.battler); //prev guy who played
        } else { //only wait for person still in => person who just played to play one more card to win battle
            schema.battleStack_Players.push(data.username); //guy who played, so will only wait for him to play again to end battle
            schema.playerInfo[data.battleData.battler].yourTurn = false; //person being battled has turn = false since he is out of the round
            schema.markModified(`playerInfo.${data.battleData.battler}`);
        }

        data.usersMove[3] = ["B", [data.battleData.battler]]; //store person being battled
        schema.cardPile.unshift(data.usersMove); //put move on top of cardPile (in front of array)
        //now wait for all peeps in battle to play their moves
    } else if (schema.isBattle && data.usersMove[1] !== "SW") { //already was a battle, another person joined, >= 3 person battle
        if (schema.battleStack_Players.indexOf(data.username) < 0) { //not already in battle, via battle button
            schema.playerInfo[data.username].yourTurn = true; //person who is battling has turn = true
            schema.markModified(`playerInfo.${data.username}`);
            data.usersMove[3] = ['B', []]; //dont need to pass people being battled, waste of space //schema.battleStack_Players.slice()
            schema.battleStack_Players.push(data.username); //new guy joined battle, so battle > 2 people
            schema.cardPile.unshift(data.usersMove); //put move on top of cardPile (in front of array)
        } else { //already a part of battle so add his move to stack and set his turn to false
            schema.playerInfo[data.username].yourTurn = false; //person who is battling has turn = false
            schema.markModified(`playerInfo.${data.username}`);
            schema.battleStack_Moves.unshift(data.usersMove); //add move to existing list of moves
        }

        //see who won battle, use short circuit eval because schema.battleStack[1] might not exist if a 3rd or more peeps join battle before
        //any prev players played their batle moves
        if (schema.battleStack_Players.length === schema.battleStack_Moves.length || multiplePlayersAutoPlayed) { //everyone has played their battle move
            //wild 9 could be played so return that in data if played and update schema
            //schema.cardPile.unshift([schema.battleStack_Moves, "battle", "Battle", []]); //will be rendered as a battle result
            const battleStack_moves_copy = schema.battleStack_Moves.slice();
            const higherIsBetter_copy = schema.higherIsBetter;
            const resData = whoWonBattle(battleStack_moves_copy, higherIsBetter_copy);
            schema.higherIsBetter = resData[1]; // [1] bool h is b

            //send back who won...

            if (resData[0].length > 1) { // battleOver = false;
                // do another battle...
                schema.cardPile.unshift([schema.battleStack_Moves, "battle", "Tie! Another Battle!", []]);
                schema.battleStack_Players = []; //reset battleStack
                schema.battleStack_Moves = []; //reset battleStack
                for (const username in schema.playerInfo) { //put everyone out
                    schema.playerInfo[username].stillIn = false; //stillIn = false
                    schema.playerInfo[username].yourTurn = false; //yourTurn = false
                    schema.markModified(`playerInfo.${username}`);
                }
                for (let i = 0; i < resData[0].length; i++) { //then put tied people back in
                    schema.battleStack_Players.push(resData[0][i][2]); //recreate the battleStack data structure user list
                    schema.playerInfo[resData[0][i][2]].stillIn = true; //set stillIn to true for tied battle person
                    schema.playerInfo[resData[0][i][2]].yourTurn = true; //set yourTurn to true for tied battle person
                    schema.markModified(`playerInfo.${resData[0][i][2]}`); //save
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
    } else if (schema.isDerby) { // Derby
        if (data.usersMove[1] !== "SW") {
            schema.cardPile.unshift(data.usersMove); //put move on top of cardPile (in front of array)
        }
        if (data.usersMove[1] === "play") {
            schema.derbyLastPlay = data.username; //keep track of who "played" last, not "passed", never need to reset this value
            //schema.cardPile.unshift(data.usersMove);
        } else {
            //player passed
        }

        if (!data.sandwichData.isSandwiched && data.usersMove[1] !== "SW" || sandwichWaitOver) { //if not a sand bc want to wait for sandwiched person to maybe resandwich
            maybeWinner = schema.derbyLastPlay; //no matter what asign a tmp winner, but if round isn't over, does not matter
            let derbyOverFlag = true;

            if (data.usersMove[1] === "play" && data.usersMove[0][0].substr(0,2) === "15") { //Ace was played so end round
                //ace so ends round, skips over check below
            } else {
                let next = schema.orderOfPlay[data.username];
                if (sandwichWaitOver)  {
                    next = schema.orderOfPlay[schema.sandwicher];
                }
                for (const _ in schema.playerInfo) {
                    if (schema.playerInfo[next].stillIn) { // find next player who is still in
                        // if derby and next person up is also the last person who "played" and not "passed", round is over
                        if (schema.derbyLastPlay === next) {
                            // derbyOver = true, ends round by breaking before looping to person who is still in but passed
                        } else { // found next player who is still in who did not play the last played hand
                            derbyOverFlag = false;
                            schema.playerInfo[next].yourTurn = true;
                            schema.markModified(`playerInfo.${next}`);
                        }
                        break;
                    } else {
                        next = schema.orderOfPlay[next]; // increment to next player
                    }
                }
            }
            derbyOver = derbyOverFlag; // this ends the round if true
        }
    } else { // Normal
        if (data.usersMove[1] !== "SW") {
            schema.cardPile.unshift(data.usersMove); // put move on top of cardPile (in front of array)
        }
        if (data.usersMove[1] === "play" && data.usersMove[0][0].substr(0,2) === "15") { // Ace was played so end round
            isAce = true; //only when not a battle and not a derby
        } else if (data.usersMove[1] === "play" && data.usersMove[0][0] === "69x") {
            isRottenEgg = true;
        } else if (data.usersMove[1] === "wild") { // wild 9 was played, update higherIsBetter.
            if (data.usersMove[0][0] === "wild_H") {
                schema.higherIsBetter = true;
            } else {
                schema.higherIsBetter = false;
            }
        } else if (data.usersMove[1] === "fold" || data.usersMove[1] === "outofcards") {
            schema.playerInfo[data.username].stillIn = false; // that person folded so is no longer in round
            schema.markModified(`playerInfo.${data.username}`);
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
            Object.entries(schema.playerInfo).forEach(([username, playerInfo]) => {
                if (playerInfo.stillIn) { // if this person is still in increase count
                    stillIn_count += 1;
                    maybeWinner = username;
                }
            });
        }
    }

    // Move processing is done, onto deck, score, next up stuff...
    if (!data.sandwichData.isSandwiched && data.usersMove[1] !== "SW" || (data.usersMove[1] === "SW" && sandwichWaitOver) ){
        //everything/code comes back here no matter if battle, derby or normal
        if (!schema.isBattle || battleOver || derbyOver) { //only skip over if in battle/waiting for people to play their battle moves
            if (stillIn_count === 1 || isAce || isRottenEgg || battleOver || derbyOver) { //round is over.
                let card_count = 0;
                if (maybeWinner !== "haha... no winner") { //check to see if a rotten egg was played
                    for (let p = 0; p < schema.cardPile.length; p++) { //go thru all players
                        if (schema.cardPile[p][1] === "fold") { //this check speeds loop up
                            for (let x = 0; x < schema.cardPile[p][0].length; x++) { //go thru all players played cards
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
                    schema.roundLog = [maybeWinner, schema.playerInfo[maybeWinner].score, card_count]; //save round events and send back to clients
                    schema.playerInfo[maybeWinner].score = schema.playerInfo[maybeWinner].score + card_count; //adds cards from battle to score
                    schema.markModified(`playerInfo.${maybeWinner}`);
                }

                //refuel?
                if (schema.deck.length > 0) {
                    let refuelStack = [];
                    let doneCounter = 0;

                    Object.entries(schema.playerHands).forEach(([player, hand]) => {
                        if (hand.length <= schema.refuelNumber) {
                            refuelStack.push(player); // if player is below limit, add him to stack so he can get refueled
                        }
                    });

                    do { // continuously goes around and deals 1 card at a time so cards are dealt evenly amoung players needing refill
                        doneCounter = 0;
                        for (let i = 0; i < refuelStack.length; i++) {
                            if (schema.playerHands[refuelStack[i]].length < schema.handSize && schema.deck.length > 0) { //refuel
                                schema.playerHands[refuelStack[i]].push(schema.deck[ schema.deck.length - 1 ]);
                                schema.markModified(`playerHands.${refuelStack[i]}`); //save
                                schema.playerInfo[refuelStack[i]].handSize = schema.playerHands[refuelStack[i]].length; //update cards in hand in playerInfo
                                schema.markModified(`dict_playerInfo.${refuelStack[i]}`); //save
                                schema.deck.pop(); //get rid of last card in deck that was just dealt to players hand
                            } else {
                                doneCounter = doneCounter + 1;
                            }
                        }
                    } while (doneCounter < refuelStack.length)
                    //only sort hands of player/s that needed to refuel
                    for (let i = 0; i < refuelStack.length; i++) {
                        schema.playerHands[refuelStack[i]] = sortHand(schema.playerHands[refuelStack[i]])
                        schema.markModified(`playerHands.${refuelStack[i]}`);
                    }
                } else {
                    // no more cards in deck... cant refuel
                }
                // this is only var that is not reset, will get reset next time this route is hit
                schema.roundEnd = {isEnd: true, winner: maybeWinner}; //send winner back to client signaling round is over
                schema.markModified("roundEnd.isEnd");
                schema.markModified("roundEnd.winner");
                //reset everything else for next round since round is over
                schema.isBattle = false;
                schema.isDerby = false;
                schema.battleStack_Players = [];
                schema.battleStack_Moves = [];
                for (const username in schema.playerInfo) { // put everyone back in
                    schema.playerInfo[username].stillIn = true; // set stillIn to true for everyone
                    schema.playerInfo[username].yourTurn = false; // set yourTurn to false for everyone
                    schema.playerInfo[username].isSandwiched = false; // set sandwiched to false
                    schema.markModified(`playerInfo.${username}`); //save
                }
                //gameOver?
                if (schema.deck.length === 0) { //even if no cards left in deck, play until only 1 or 0 people left with cards
                    let guysWithHands_count = 0;
                    for (const username in schema.playerHands) {
                        if (schema.playerHands[username].length > 0) { //if this person is still in increase count
                            guysWithHands_count = guysWithHands_count + 1;
                        } else { //he has no more cards left so set stillIn = false (will be like this for rest of the game)
                            schema.playerInfo[username].stillIn = false; //set stillIn to false
                            schema.markModified(`playerInfo.${username}`);
                        }
                        if (guysWithHands_count > 1) { //speeds up look-up loop
                            break; //Game is NOT over
                        }
                    }
                    if (guysWithHands_count <= 1) { //game is over
                        let winners = [schema.lord]; //could be a tie
                        for (const username in schema.playerInfo) {
                            if (schema.playerInfo[username].score > schema.playerInfo[winners[0]].score) {
                                winners = [username]; //better than the person or people tied
                            } else if (schema.playerInfo[username].score === schema.playerInfo[winners[0]].score && username !== schema.lord) {
                                winners.push(username); //so far is a tie
                            }
                        }
                        schema.gameOver = {isOver: true, winners: winners};
                        schema.markModified("gameOver.isOver");
                        schema.markModified("gameOver.winners");
                    }
                }

                //Game not over...
                if (!schema.gameOver.isOver) { // game is not over but round is, maybeWinner won round so he starts next round
                    let toStart = maybeWinner;
                    if (maybeWinner === "haha... no winner") {
                        toStart = schema.players[Math.floor(Math.random()*schema.players.length)];
                    }
                    while (schema.playerInfo[toStart].handSize <= 0 ) { //while that player is not out of the game (has cards)
                        toStart = orderOfPlay[toStart]; // look at next person in line
                    } // this loop should always end since there are > 1 people with cards left in their hand
                    schema.playerInfo[toStart].yourTurn = true;
                }
            } else if (stillIn_count > 1 && !schema.isDerby) { // Round not over. in normal mode. set next persons turn whos still in
                // round is not over, if not a battle and cur player has played, find next person still in
                let next = schema.orderOfPlay[data.username];
                if (sandwichWaitOver) {
                    next = schema.orderOfPlay[schema.sandwicher];
                }
                for (let _ in schema.playerInfo) { //cycle through everyone
                    if (schema.playerInfo[next].stillIn) { // found next player who is still in
                        schema.playerInfo[next].yourTurn = true; // set their turn to true
                        schema.markModified(`playerInfo.${next}`);
                        break;
                    } else {
                        next = schema.orderOfPlay[next]; //increment to next player
                    }
                }
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

    const userIDs = createUserIdsToUsernames(schema.usernameToId); // dic of userIDs to usernames for quick look-up
    
    let manager = "skip";
    let backup = "skip";
    const timerHash = skipTimer ? null : genRandomString(8);
    if (!skipTimer) {
        manager = pickManager(schema.players, schema.usernameToId); // 1 manager from players = a playerID
        backup = pickBackup(schema.players, schema.usernameToId, manager); // 1 backup from players = a playerID

        schema.lastTimestamp = (new Date()).getTime();
        schema.timerHash = timerHash;
    }
    
    await schema.save();

    const serverRes = {
        type: "PLAY_MOVE__SUCCESS",
        data: {
            // hand: schema.playerHands[user], - added in below loop per client
            higherIsBetter: schema.higherIsBetter,
            cardPile: schema.cardPile,
            cardsInDeck: schema.deck.length,
            playerInfo: schema.playerInfo,
            isBattle: schema.isBattle,
            battleStack_Players: schema.battleStack_Players,
            isDerby: schema.isDerby,
            gameOver: schema.gameOver,
            roundEnd: schema.roundEnd,
            roundLog: schema.roundLog,
            error: "",
            battleNotAllPlayersPlayed: skipTimer, // only if still waiting on all players in battle to play battle card
            isManager: false,
            isBackup: false,
            timerHash: null,
        }
    }

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
};

exports.playMove = playMove;
exports.handleMove = handleMove;