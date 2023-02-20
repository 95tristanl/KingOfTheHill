import React, { Component } from 'react';
import LandingPage from "./components/landingPage.js";
import GameRoomPage from "./components/gameRoomPage.js";
import './app.css';


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
            backoffIncrement: 2
        };
    }

    componentDidMount() {
        this.websocketSetup();
    }

    websocketSetup = () => {
        const webSocket = new WebSocket(process.env.WEBSOCKET_URL);

        webSocket.onopen = (event) => {
            console.log('Websocket OPEN');
        };

        webSocket.onerror = (event) => {
            console.log('Websocket ERROR!');
            //console.log(event);
        };

        webSocket.onclose = (event) => {
            console.log('Websocket CLOSED');
            console.log("Will retry connect...");
            this.multiplicativeBackoffReconnect();
        };

        this.setState({webSocket: webSocket});
    }

    multiplicativeBackoffReconnect = () => {
        try {
            const backoffIncrement = this.state.backoffIncrement;
            setTimeout(() => {
                console.log("Retry connect...");
                this.websocketSetup();
            }, backoffIncrement * 1000);
            this.setState({backoffIncrement: backoffIncrement * 2});
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
