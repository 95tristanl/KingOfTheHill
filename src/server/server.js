const { createGame } = require("./api/createGame");
const { joinGame }  = require("./api/joinGame");
const { startGame }  = require("./api/startGame");
const { playMove }  = require("./api/playMove");
const { sendChatMsg }  = require("./api/sendChatMsg");
const { timeRanOut }  = require("./api/timeRanOut");
const { leaveGame }  = require("./api/leaveGame");
const { rejoinGame }  = require("./api/rejoinGame");

const dotenv = require('dotenv');
const mongoose = require("mongoose");
const { WebSocketServer } = require('ws');

dotenv.config();

const clientToServerMsgTypeToRoute = {
    "CREATE_GAME": createGame,
    "JOIN_GAME": joinGame,
    "START_GAME": startGame,
    "PLAY_MOVE": playMove,
    "SEND_CHAT_MSG": sendChatMsg,
    "TIME_RAN_OUT": timeRanOut,
    "LEAVE_GAME": leaveGame,
    "REJOIN_GAME": rejoinGame,
}

const setupServer = async () => {
    console.log("v2.0.1");

    try {
        const connectionString = process.env.MONGODB_URI;
        await mongoose.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true});
        console.log("Connected to Mongo");
    } catch (err) {
        console.log("Could not connect to Mongo :(");
        process.exit(-1);
    }

    const ws_port = process.env.WS_PORT;
    const wss = new WebSocketServer({ port: ws_port });
    console.log("WebSocket server started on: " + ws_port);

    wss.on('connection', (ws) => {
        ws.on('error', (err) => {
            console.log("ERROR - ws");
            console.log(err);
        });

        ws.on('message', (data) => {
            try {
                const clientMsg = JSON.parse(data);
                if (clientMsg.type in clientToServerMsgTypeToRoute) {
                    const handleMsg = clientToServerMsgTypeToRoute[clientMsg.type];
                    handleMsg(clientMsg.data, ws, wss);
                } else {
                    console.log(`'${clientMsg.type}' is not a valid msg type`);
                }
            } catch (err) {
                console.log("ERROR - handle msg");
                console.log(err);
            }
        });
    });
};

setupServer();
