const { createUserIdsToUsernames } = require("./helpers");

const WebSocket = require('ws');
const Game = require("../models/game");

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
            !schema.usernameToId[data.username] ||
            ws.id !== schema.usernameToId[data.username]
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

                const userIDs = createUserIdsToUsernames(schema.usernameToId); // dic of userIDs to usernames for quick look-up

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

exports.sendChatMsg = sendChatMsg;