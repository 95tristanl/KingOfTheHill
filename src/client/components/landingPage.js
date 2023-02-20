import React, { Component } from 'react';
import '../app.css';
import axios from "axios";

class Landing extends Component {
    constructor(props) {
        super(props);
        this.state = {
            username_c: "",
            roomID_c: "",
            deckSize: "",
            gameSize: "",
            handSize: "",
            refuelNum: "",

            username_j: "",
            roomID_j: "",

            init_error: null
        };
    }

    handleServerToClientMsgByType = (msg) => {
        const serverToClientMsgTypeToHandler = {
            "CREATE_GAME__SUCCESS": () => {
                //console.log("got -> CREATE_GAME__SUCCESS");
                this.setState({init_error: null});
                this.props.changePage("game_room", this.state.username_c, this.state.roomID_c, msg.data.userID, msg.data, false);
            },
            "CREATE_GAME__ERROR": () => {
                //console.log("got -> CREATE_GAME__ERROR");
                this.setState({init_error: msg.data.error});
            },
            "JOIN_GAME__SUCCESS": () => {
                //console.log("got -> JOIN_GAME__SUCCESS");
                this.setState({init_error: null});
                this.props.changePage("game_room", this.state.username_j, this.state.roomID_j, msg.data.userID, msg.data, false);
            },
            "JOIN_GAME__ERROR": () => {
                //console.log("got -> JOIN_GAME__ERROR");
                this.setState({init_error: msg.data.error});
            },
            "REJOIN_GAME__SUCCESS": () => {
                //console.log("got -> REJOIN_GAME__SUCCESS");
                this.setState({init_error: null});
                this.props.changePage("game_room", msg.data.username, msg.data.roomID, msg.data.userID, msg.data, true);
            },
            "REJOIN_GAME__ERROR": () => {
                //console.log("got -> REJOIN_GAME__ERROR");
                localStorage.setItem('KingOfTheHill__roomID', "");
                localStorage.setItem('KingOfTheHill__username', "");
                localStorage.setItem('KingOfTheHill__userID', "");
                this.setState({init_error: msg.data.error});
            },
        }

        if (msg.type in serverToClientMsgTypeToHandler) {
            const handleMsg = serverToClientMsgTypeToHandler[msg.type];
            handleMsg();
        }
    }

    componentDidMount() {
        setTimeout(() => {
            let roomID = localStorage.getItem('KingOfTheHill__roomID')
            let username = localStorage.getItem('KingOfTheHill__username')
            let userID = localStorage.getItem('KingOfTheHill__userID')
            if (username && userID && roomID) {
                if (confirm("Welcome back " + username + "! Would you like to rejoin game room: " + roomID + "?") === true) {
                    this.rejoinGame(username, userID, roomID);
                } else {
                    localStorage.setItem('KingOfTheHill__roomID', "");
                    localStorage.setItem('KingOfTheHill__username', "");
                    localStorage.setItem('KingOfTheHill__userID', "");
                }
            }
        }, 2000);
    }

    componentDidUpdate(prevProps, prevState) {
        if (!prevProps.webSocket && this.props.webSocket) {
            this.props.webSocket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.handleServerToClientMsgByType(msg);
                } catch (err) {
                    console.log('onmessage ERROR! \n');
                    console.log(err);
                }
            };
        }
    }

    change__username_c = (e) => {
        this.setState({username_c: e.target.value});
    }

    change__roomID_c = (e) => {
        this.setState({roomID_c: e.target.value});
    }

    change__deckSize = (e) => {
        this.setState({deckSize: e.target.value});
    }

    change__gameSize = (e) => {
        this.setState({gameSize: e.target.value});
    }

    change__handSize = (e) => {
        this.setState({handSize: e.target.value});
    }

    change__refuelNum = (e) => {
        this.setState({refuelNum: e.target.value});
    }

    change__username_j = (e) => {
        this.setState({username_j: e.target.value});
    }

    change__roomID_j = (e) => {
        this.setState({roomID_j: e.target.value});
    }

    createGame = () => { //when new game button is pressed creates a new gameRoom
        const clientMsg = {
            type: "CREATE_GAME",
            data: {
                lord: this.state.username_c,
                roomID: this.state.roomID_c,
                deckSize: this.state.deckSize,
                gameSize: this.state.gameSize,
                handSize: this.state.handSize,
                refuelNum: this.state.refuelNum
            }
        }
        try {
            //console.log('sent -> CREATE_GAME');
            this.props.webSocket.send(JSON.stringify(clientMsg))
        } catch (err) {
            console.log(err);
            this.setState({init_error: "Error creating game..."});
        }
    }

    joinGame = () => { //when join game button is pressed brings user to the desired game if it exists
        const clientMsg = {
            type: "JOIN_GAME",
            data: {
                username: this.state.username_j,
                roomID: this.state.roomID_j
            }
        }
        try {
            //console.log('sent -> JOIN_GAME');
            this.props.webSocket.send(JSON.stringify(clientMsg))
        } catch (err) {
            console.log(err);
            this.setState({init_error: "Error joining game..."});
        }
    }

    rejoinGame = (username, userID, roomID) => {
        // when user leaves KOTH browser window and comes back, user will be prompted
        // if creds are saved in local storage. User can choose to rejoin game or not
        const clientMsg = {
            type: "REJOIN_GAME",
            data: {
                username: username,
                userID: userID,
                roomID: roomID
            }
        }
        try {
            //console.log('sent -> REJOIN_GAME');
            this.props.webSocket.send(JSON.stringify(clientMsg))
        } catch (err) {
            console.log(err);
            this.setState({init_error: "Error rejoining game..."});
        }
    }

    render() {
        return (
            <div className="landing__container">
                <div className="landing__menu">
                    <div className="landing__menu_left_side">
                        <div className="landing__title_container">
                            <p className="landing__title">. . . /\ . . . King of the Hill . . . /\ . . .</p>
                            <p className="landing__subtitle">Start a New Game Room or Join an Existing Game</p>
                        </div>

                        <div className="landing__formsContainer">
                            <div className="landing__createRoom_div">
                                <div className="landing__createRoom_header_div">
                                    <p className="landing__createGame_header">Create Game</p>
                                </div>

                                <div className="landing__createRoom_form">
                                    <input
                                        className="landing__inputField"
                                        type="text"
                                        name="username_c"
                                        placeholder=" Username"
                                        value={this.state.username_c}
                                        onChange={this.change__username_c}
                                    />

                                    <input
                                        className="landing__inputField"
                                        type="text"
                                        name="roomID_c"
                                        placeholder=" Room Code"
                                        value={this.state.roomID_c}
                                        onChange={this.change__roomID_c}
                                    />

                                    <input
                                        className="landing__inputField"
                                        type="text"
                                        name="gameSize"
                                        placeholder=" Number of players"
                                        value={this.state.gameSize}
                                        onChange={this.change__gameSize}
                                    />

                                    <input
                                        className="landing__inputField"
                                        type="text"
                                        name="deckSize"
                                        placeholder=" Number of decks"
                                        value={this.state.deckSize}
                                        onChange={this.change__deckSize}
                                    />

                                    <input
                                        className="landing__inputField"
                                        type="text"
                                        name="handSize"
                                        placeholder=" Hand size"
                                        value={this.state.handSize}
                                        onChange={this.change__handSize}
                                    />

                                    <input
                                        className="landing__inputField"
                                        type="text"
                                        name="refuelNum"
                                        placeholder=" Refuel number"
                                        value={this.state.refuelNum}
                                        onChange={this.change__refuelNum}
                                    />

                                    <div className="landing__btnClient"
                                         id="landing__newGameBtn"
                                         onClick={() => this.createGame()}
                                    >
                                        New Game
                                    </div>
                                </div>
                            </div>

                            <div className="landing__joinRoom_div">
                                <div className="landing__joinRoom_header_div">
                                    <p className="landing__joinGame_header">Join Game</p>
                                </div>

                                <div className="landing__joinRoom_form">
                                    <input
                                        className="landing__inputField"
                                        type="text"
                                        name="username_j"
                                        placeholder=" Username"
                                        value={this.state.username_j}
                                        onChange={this.change__username_j}
                                    />

                                    <input
                                        className="landing__inputField"
                                        type="text"
                                        name="roomID_j"
                                        placeholder=" Existing Room Code"
                                        value={this.state.roomID_j}
                                        onChange={this.change__roomID_j}
                                    />

                                    <div className="landing__btnClient"
                                         id="landing__joinGameBtn"
                                         onClick={() => this.joinGame()}
                                    >
                                         Join Game
                                    </div>
                                </div>
                                { this.state.init_error &&
                                    <div id="landing__error_div"
                                         style={this.state.init_error ? {padding: "10px 10px 10px 10px"} : {padding: "0px 0px 0px 0px"}}>
                                        <p id="landing__error_text">{this.state.init_error}</p>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>

                    <div className="landing__menu_right_side">
                        <p className="landing__form_helper_summary">
                            The Game size is the amount of players that are going to be playing.
                            You can play with up to 9 decks. Each deck is 54 cards, 52 cards plus 2 jokers.
                            Hand size is the amount of cards in your hand that you will be playing with.
                            The Refuel number determines when your hand gets replenished by the deck:
                            when you have the Refuel number of cards in your hand you will go back to the
                            Hand Size number of cards at the end of the round, unless there are no more cards in the deck.
                            Happy Playing, Battling, Derbying and Sandwiching!
                        </p>
                    </div>
                </div>

                <div className="landing__rules_div">
                    <h1 className="rules">The Official Rule Book:</h1>

                    <p className="rules">
                        King of the Hill or Sandwich or Trump was originally created for 2-3-4-5 player games,
                        but it can be played with really as many players as you like. Also, the original name
                        of the game was Trump (before he got elected) because the Ace is an overpowering trump
                        card that automatically wins you the hand if played in a sequence or derby (and can't
                        be battled except if in a battle already).
                    </p>

                    <h3 className="rules">-Object of the game:</h3>

                    <p className="rules">
                        Win the most amount of cards or get to the objective set amount of cards first (say you
                        play first to win 50 cards). Win cards by winning play piles. Number of cards in the pile
                        won = the number of cards added to your score.
                    </p>

                    <h3 className="rules">-Set up:</h3>

                    <p className="rules">
                        Each player starts off with your choice of hand size, 10 or 12 cards is normal. You also
                        need to set a refuel number so that, after a round, players with the refuel amount of cards
                        remaining in their hand can grab more from the deck until they have the hand-size number.
                        A standard refuel number is half the hand size plus a card or two, so starting with 12 cards
                        I would use 7 as a refuel number (for say 15 I'd do 8 or 9).
                    </p>

                    <h3 className="rules">-Directions:</h3>

                    <p className="rules">
                        To start the game everybody participates in a Battle (in the app though, the person who
                        creates the room starts the game). After, follow Order of Play and normal play begins.
                        Higher cards are better to start the game. When playing with a 12 card starting hand and
                        after a round you find yourself with 7 cards or less, you Refuel. Refueling only takes
                        place after the round is over/before the next round. Winner of the previous round plays
                        first/starts the next round. Play always goes clockwise, and always continues clockwise from
                        whoever played last. The winner is the last person still in who hasn't Folded or been knocked
                        out by a Sandwich. If so he/she wins the round, he/she adds the total amount of cards from the
                        pile to their score. The winner then plays first in the next hand. Winner of the game is first
                        to reach a decided score tally or have the highest score once the deck runs out and there aren’t
                        two players who can play anymore. When/if there is one person left with cards in their hand at the
                        end of the game, he/she does not add those cards to his/her score. To start a round a single card
                        must be played. You CANT start a round by playing more than 1 card: a Derby.
                    </p>

                    <h3 className="rules">-Refuel:</h3>

                    <p className="rules">
                        If the game started with 12 cards per person then once you have the refuel number of cards in your
                        hand, take turns picking cards from the deck until everyone who needed to refuel has the starting
                        amount.
                    </p>

                    <h3 className="rules">-Normal Play: 1 card play where folding is present</h3>

                    <p className="rules">
                        The normal sequence of play is to go clockwise from the winner of the last round.
                        Each player has to play a better card then the last person. When it is your turn you
                        have exactly 4 options:
                    </p>
                    <ul className="rules">
                        <li>#1 you can play a better card then the previous card.</li>
                        <li>
                            #2 play a card of the same value: this means you initiate a Battle or a Sandwich
                            if you play multiple cards of the same value of the last card played.
                        </li>
                        <li>#3 play a 9 as a wild card.</li>
                        <li>#4 Fold</li>
                    </ul>

                    <h3 className="rules">-Folding:</h3>

                    <p className="rules">
                        If a player cannot beat, or does not want to play/beat the previous single card he must fold and
                        is knocked out of the round. This is done by playing one or many cards from his hand face down on
                        the deck (folding many cards can be strategic for refueling/building a better hand).
                    </p>

                    <h3 className="rules">-Battling:</h3>

                    <p className="rules">
                        If the card played is of the same value as the previous card it is a Battle. When a Battle
                        occurs, both players choose one card and lay it face down before showing their card to their
                        opponent. Best card wins depending on the game value. If the cards are of the same value, Battle
                        again. If three people participate, but only two play cards that are of the same value and both are
                        tied for the best, better than the third person's, the two players play in another battle while the
                        third person gets knocked out. You can Battle someone even if it is not your turn (just play your
                        card of the same value that was just played). More than 2 people can participate in a Battle. In a
                        Derby If two or more people lay down doubles or triples or more of the same value then they battle
                        using just one card as usual. In a Derby you can Battle someone out of turn.
                    </p>

                    <h3 className="rules">-Derby: no folding, just playing and passing</h3>

                    <p className="rules">
                        A Derby occurs when someone has 2, 3, 4 or more of the same valued card in their hand. Once a Derby
                        is started there is no Folding order of play continues clockwise (there can be battles) and each
                        player has two options: either play or say 'pass'. If you pass you are still in the round, you are
                        just electing not to play, however, if people continue to pass and it gets back to the person who's
                        cards are currently the last played/on top of the pile, then the Derby is over and he/she wins. You
                        CANT use a wild 9 in a Derby and you CANT start a round with a Derby. Any triples beats any
                        doubles, any quadruples (4 of a kind) beats any triples or doubles and so on, but, in order to start
                        a Derby the value of the cards you are playing must be better than the card previously played (no
                        matter how many cards you play): if a five was played last and higher cards are better, one cannot
                        play two 4s or three 2s, two or three 6s would work. Aces automatically win the Derby and pile
                        if the same or more are played: 3 8s are played cant play 1 or 2 aces, need 3 (or more if you want).
                    </p>

                    <h3 className="rules">-The Nine:</h3>

                    <p className="rules">
                        If a 9 is played, it can act as a regular nine, or, it can be played as a wild card that changes the
                        value of play: making lower cards better than higher cards or higher cards better than lower cards:
                        always the opposite of what it was. (a wild 9 has to switch the order of value, you CANT have higher
                        cards be better, play a wild 9, and say higher cards are still better). When a 9 is used as wild, it
                        has no value and even though it acts as your turn, it is not the card the next person has to beat:
                        the card played before the wild 9 was played becomes the card the current player must beat. Basically
                        you can play them anytime, on any single card, except on an Ace or during a derby. You can also
                        play them in a Battle, you will just never win but you will be able to switch the direction. If higher
                        cards are better and, before anyone flips their cards you announce your card is a wild 9, you switch
                        direction. This does influence the outcome of a Battle if more than 2 people participate in the Battle:
                        if higher cards are better and you play a wild 9 and player #2 plays an 8 and player #3 plays a 10, player
                        #2 wins because of the switch. The wild 9's value switch stays in effect for the rest of the game until the
                        value is switched again by another wild 9 (continues across rounds). Wild 9s cannot be battled with another
                        wild 9 since they hold no value so if two people are Battling and the both play wild 9s (in real life
                        this probably wouldn't happen since after the first person announced their 9 is wild the second would keep
                        their 9 normal so they win the Battle) nobody wins, its a tie, and the direction is not switched since
                        the wild 9s switching cancels out since 2 are played.
                    </p>

                    <h3 className="rules">-The Ace:</h3>

                    <p className="rules">
                        The ace beats any single card (regardless of higher or lower value, it beats a king in higher
                        play and 2 in lower play) and automatically wins any pile on the spot when played. You CANT
                        battle an ace when an it is played outside a Battle. Aces can only Battle when they are
                        flipped up in a Battle. An Ace cannot beat doubles unless you have 2 aces, same with triples
                        and so on. If multiple are played in a Derby then they automatically win the round on the spot.
                    </p>

                    <h3 className="rules">-The Joker:</h3>

                    <p className="rules">
                        Can take on any value 2 through king. Cannot become a wild 9 or Ace. Can also be used as a
                        rotten egg: if Folded (obviously, secretly), after the round ends reveal it and no one wins
                        the card pile. You can play the rotten egg in a battle but you have to specify that its an egg
                        before flipping.
                    </p>

                    <h3 className="rules">-Sandwiching: the most annoying and fun part of the game</h3>

                    <p className="rules">There are two ways to Sandwich another player/multiple players:</p>
                    <ul className="rules">
                        <li>
                            #1 your cards surround their card/s ex: you play a 7, next person Battles
                            you with a 7, you play another 7, they are now sandwiched.
                        </li>
                        <li>
                            #2 your cards (multiple) are played on top of their card/s (you have to have
                            played more of a same valued card then the previous play ex: last person plays
                            a 5 you sandwich her with 2 5's or last person plays 3 4's in a Derby and you
                            sandwich him with 4 4's).
                        </li>
                    </ul>

                    <p className="rules">
                        A sandwich occurs when two or more of the same card surround another card of that same value,
                        or are on top of a card of that same value. A sandwich does not occur if a different valued
                        card takes place: you play a 7, next person plays an 8 and you playing another 7 is not
                        possible/not a sandwich because your 7 is not the same value as the last played 8 so you
                        cannot play out of turn/Battle that person: a sandwich is basically a modified Battle.
                    </p>

                    <h3 className="rules">-Un/re-sandwiching:</h3>

                    <p className="rules">
                        If you get/are sandwiched and you have another of that same card or a joker you can play it and you
                        not only become un-sandwiched but you sandwich that other player: you play a 5, another person plays
                        2 5's, you play a 5: that person is sandwiched because your 5s wrap around his even though you have
                        both played the same number of 5s, you could even re-sandwich with 2 5's and start a Derby. If you
                        fail to re-sandwich, you are knocked out. After a player/players are knocked out by getting sandwiched,
                        play continues clockwise from the person who played last: this is the sandwicher. The next person then
                        just has to beat the last card/cards played, not the entirety of what the sandwicher played if there
                        were multiple plays between players during the sandwich episode. So, if you play a 5, another person
                        plays 2 5's, you play a 5, the next person only has to beat a 5. If you play a 5, another person plays
                        2 5's, you play 2 5's (still a sandwich) now its a Derby and the next person has to beat 2 5's.
                    </p>

                    <h1 className="rules">Gameplay examples:</h1>

                    <h3 className="rules">Example #1, 3 person gameplay (no derby, battle, or sandwich):</h3>

                    <ul className="rules">
                        <li>
                            Player #1 won the beginning Battle or started the online game: he played a queen, player #2 played
                            a 10 and player #3 played a 6 so player #1 starts next round and wins 3 points since card pile consisted
                            of 3 cards.
                        </li>
                        <li>Player #1 plays a 6 to start the round.</li>
                        <li>
                            Player #2 (clockwise from person 1) plays a 7 (if he wanted to battle, he would play a 6, and if
                            player #3 wanted to jump in out-of-turn to battle player #1 he would have played a 6 before person
                            2 played a card. If player #2 played a 6 player #3 could also join their battle if he plays a 6
                            too => 3 person battle).
                        </li>
                        <li>Player #2 has played a 7.</li>
                        <li>
                            Player #3 although he could beat the 7 with a queen he has decides not to play and folds a card face down
                            (he is out of the round).
                        </li>
                        <li>
                            Back to player #1 who plays a 9 as a wild card: this reverses the card value so lower cards are now
                            better (turn 9 face down to represent it as a wild card and it does not have a value so next person to
                            go has to play against player #2's Queen since it was the last play of value.
                        </li>
                        <li>
                            Player #2 now has to beat himself since he played last valued card. He cannot play a 7 and Battle
                            himself (not allowed), nor can he play multiple 7s so he plays a 2.
                        </li>
                        <li>
                            Player #1 plays an Ace and wins the pile automatically, he now has a score of 6 for the number of
                            cards in the pile he won(wild 9 and folded cards count), and he will start next round.
                        </li>
                    </ul>

                    <h3 className="rules">Example #2, 3 person gameplay (derby):</h3>

                    <ul className="rules">
                        <li>Player #1 starts round with a Jack.</li>
                        <li>
                            Player #2 plays 2 queens (playing 2 or 3 10s would not be allowed since to start a derby the
                            value of your cards has to be better than that of the previous cards played => 10 is not better
                            than Jack).
                        </li>
                        <li>Player #3 passes.</li>
                        <li>Player #1 plays 2 Kings.</li>
                        <li>Player #2 passes.</li>
                        <li>
                            Player #3 plays 3 4s (4 is lower than King but since the derby has already been started, any larger-card-number play beats a play with fewer cards -> there are 3 4s and only 2 Kings).
                        </li>
                        <li>Player #1 passes.</li>
                        <li>Player #2 passes.</li>
                        <li>Player #3 is up but his 3 4s are last played so he wins 8 points (passes do not count as points).</li>
                   </ul>

                   <h3 className="rules">Example #3, 4 person gameplay (sandwiching and battle):</h3>

                   <ul className="rules">
                      <li>Player #1 starts round with a 4.</li>
                      <li>
                          Player #3 jumps in out of turn to play 3 4s sandwiching player #1 (3 4s > 1 4, player #3 could have
                          sandwiched with 2 4s as well).
                      </li>
                      <li>
                          If player #1 plays a 4 he is un-sandwiched and sandwiches player #3 back, but if player #2 plays a
                          card of Different Value before player #1 un-sandwiches himself, player #1 is out (in the app you wait
                          to see if a player can un-sandwich himself before moving on to next player). If player #2 plays a card
                          of Same Value, the sandwiching process continues and player #1 still has a chance/time to un-sandwich
                          himself. In this case playing a card of Different Value moves on from the sandwiching process.
                      </li>
                      <li>
                          Anyway, player #1 un-sandwiches himself and sandwiches player #3 by playing a 4. Player #3 is now out
                          unless he can un-sandwich himself.
                      </li>
                      <li>
                          Player #4 comes in out of turn and plays 2 4s (this game is being played with more than 1 deck) and
                          sandwiches player #1, player #3 is still sandwiched. This is possible because the last play is player
                          #1's single 4, and player #4's 2 4s are of same value and larger quantity so they sandwich player #1.
                      </li>
                      <li>
                          At this point player #3 can still un-sandwich himself and sandwich player #1 and player #4 if he plays a
                          single 4 because his previous 4 play and his next 4 play will wrap around player #4's 2 4s, but player #3
                          does not have any other 4s so he is out. Player #1 cannot un-sandwich himself either, so he is out too by
                          not having the cards to un/re-sandwich.
                      </li>
                      <li>
                          Player #2 is up and plays 2 4s (he actually plays 1 4 and uses a joker to become the other 4), this
                          initiates a Battle against player #4. If player #2 had played 3 4s, player 4 would have been sandwiched,
                          and if player #2 had played 1 4 it would not be allowed. Note: (in real life/not app) after player #4
                          sandwiches players #1 and #3 only player #2 is left in so it is technically his turn even though players #1
                          and #3 have a chance to still un-sandwich themselves. So, if player 2 had played any different valued cards
                          like 2 5s or three 8s, since player #4s 2 4s also turn the game into a Derby, that different valued play
                          ends any chance for players #1 and #3 to un-sandwich themselves. If, however, player #1 or #3 did have an
                          extra 4 or joker they could still un-sandwich themselves and sandwich the Battling players #2 and #4 since
                          player #2 played 4s still (you can sandwich people Battling: in the app if a Battling player plays a card
                           down but then gets sandwiched, that card is lost and counts towards the point total at the end but in real
                           life you can take that card back into your hand).
                      </li>
                      <li>
                          Anyway, Player #2 had played 2 4s to Battle and now plays a wild 9 face down as his Battle card.
                      </li>
                      <li>Player #3 plays a king face down as his Battle card.</li>
                      <li>
                          Both flip and player #3 wins but starting next turn lower cards are better since player #2 played a wild
                          9 and switched the direction from higher is better to lower is better.
                      </li>
                   </ul>

                   <p className="rules">This is what the play stack looks like for that round:</p>
                   <ul className="rules">
                      <li>#1: [4]</li>
                      <li>#3: [4, 4, 4]</li>
                      <li>#1: [4]</li>
                      <li>#4: [4, 4]</li>
                      <li>#2: [4, Joker]</li>
                      <li>#2: [wild 9]</li>
                      <li>#3: [King]</li>
                      <li>Battle is now over but: lower cards are now better from now on because of #2's wild 9</li>
                      <li>#3 wins round and 11 points because he/she won the battle: a wild 9 can never win a battle</li>
                   </ul>

                   <p className="rules">(C)opyright 2019 Tristan Le Veille</p>
                   <p className="rules">All rights reserved ;)</p>
                </div>
            </div>
        )
    }
}

export default Landing;
