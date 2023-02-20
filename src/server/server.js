"use strict";

let express = require('express');
const path = require('path');
const dotenv = require('dotenv');
let mongoose = require("mongoose");
let { WebSocketServer } = require('ws');
const serverRoutes = require("./api/routes.js");

dotenv.config();

const clientToServerMsgTypeToRoute = {
    "CREATE_GAME": serverRoutes.createGame,
    "JOIN_GAME": serverRoutes.joinGame,
    "LEAVE_GAME": serverRoutes.leaveGame,
    "REJOIN_GAME": serverRoutes.rejoinGame,
    "SEND_CHAT_MSG": serverRoutes.sendChatMsg,
    "START_GAME": serverRoutes.startGame,
    "PLAY_MOVE": serverRoutes.playMove
}

const setupServer = async () => {
    try {
        let connectionString = process.env.MONGODB_URI;
        await mongoose.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true});
        console.log("Connected to Mongo");
    } catch (err) {
        console.log("Could not connect to Mongo :(");
        process.exit(-1);
    }

    const ws_port = process.env.WS_PORT;
    const wss = new WebSocketServer({ port: ws_port });
    console.log("WebSocket server started on: " + ws_port);

    wss.on('connection', (ws, req) => {
        ws.on('message', async (data) => {
            try {
                const clientMsg = JSON.parse(data);
                if (clientMsg.type in clientToServerMsgTypeToRoute) {
                    const handleMsg = clientToServerMsgTypeToRoute[clientMsg.type];
                    handleMsg(clientMsg.data, ws, wss);
                }
            } catch (err) {
                console.log("ERROR! \n")
                console.log(err)
            }
        });
    });
};

setupServer(); // Run server

const setupServer2 = async () => {
    let app2 = express();
    app2.use(express.static(`${__dirname}/../../dist`));

    const http_port = process.env.HTTP_PORT;
    app2.listen(http_port, () => {
        console.log("HTTP server started on: " + http_port);
    });
};

setupServer2(); // Run the server
