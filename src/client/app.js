import React, { Component } from 'react';
import LandingPage from "./pages/Landing.js";
import GameRoomPage from "./pages/GameRoom.js";
import './app.css';

const BACKOFF_MULTIPLIER = 2;


class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            username: "",
            roomID: "",
            userID: "",
            cur_page: "landing", // "landing" or "game_room"
            webSocket: null,
            init_data: {}, // when a player creates or joins a room, this is the current
                           // state/data of the game (returned immediately by the server)
                           // before it has been started by the lord
            backoffValue: BACKOFF_MULTIPLIER
        };
    }

    componentDidMount() {
        this.websocketSetup();
    }

    websocketSetup = () => {
        const webSocket = new WebSocket(process.env.NODE_ENV === "prod" ? process.env.WEBSOCKET_URL : `ws://localhost:${process.env.WS_PORT}`);

        webSocket.onopen = (event) => {
            console.log('Websocket Open');
        };

        webSocket.onerror = (event) => {
            console.log('Websocket Error!');
        };

        webSocket.onclose = (event) => {
            console.log('Websocket Closed!');
            this.multiplicativeBackoffReconnect();
        };

        this.setState({webSocket: webSocket});
    }

    multiplicativeBackoffReconnect = () => {
        console.log("Try reconnect...");
        try {
            const backoffValue = this.state.backoffValue;
            setTimeout(() => {
                console.log("Retry connect...");
                this.websocketSetup();
            }, backoffValue * 1000);
            this.setState({backoffValue: backoffValue * BACKOFF_MULTIPLIER});
        } catch (e) {
            console.log(e);
        }
    }

    changePage = (cur_page, username, roomID, userID, init_data, rejoinGame) => {
        localStorage.setItem('KingOfTheHill__roomID', roomID);
        localStorage.setItem('KingOfTheHill__username', username);
        localStorage.setItem('KingOfTheHill__userID', userID);
        this.setState({cur_page: cur_page, username: username, roomID: roomID, userID: userID, init_data: init_data, rejoinGame: rejoinGame});
    }

    render() {
        return (
            <div className="app__container">
                { this.state.cur_page === "landing" &&
                    <LandingPage
                        changePage={this.changePage}
                        webSocket={this.state.webSocket}
                    />
                }

                { this.state.cur_page === "game_room" &&
                    <GameRoomPage
                        username={this.state.username}
                        roomID={this.state.roomID}
                        userID={this.state.userID}
                        changePage={this.changePage}
                        webSocket={this.state.webSocket}
                        init_data={this.state.init_data}
                        rejoinGame={this.state.rejoinGame}
                    />
                }
            </div>
        )
    }
}

export default App;
