const Game = require("../models/game");

const leaveGame = async (data, ws, _) => { //deletes mongo room schema only after all players leave
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
        } else if (ws.id && data.username && ws.id === schema.usernameToId[data.username]) {
            schema.whoHasLeftGame[data.username] = 1;
            schema.markModified(`whoHasLeftGame.${data.username}`);
            let allOut = true;
            for (const username in schema.whoHasLeftGame) {
                if (!schema.whoHasLeftGame[username]) {
                    allOut = false;
                    break;
                }
            }

            if (allOut) {
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

exports.leaveGame = leaveGame;