const { handleMove } = require("./playMove");

const Game = require("../models/game");

const timeRanOut = async (data, ws, wss) => {
    /*
    data: {
        roomID: this.props.roomID,
        username: this.props.username,
        timerHash: timerHash,
    }
    */
    await Game.findOne({roomID: data.roomID}, async (err, schema) => {
        if (err || schema === null) {
            console.log('err');
            console.log(err);
            const serverRes = {
                type: "TIME_RAN_OUT__ERROR",
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
                type: "TIME_RAN_OUT__ERROR",
                data: {
                    error: "Not authorized"
                }
            }
            ws.send(JSON.stringify(serverRes));
        } else {
            try {
                if (data.timerHash && data.timerHash === schema.timerHash) {
                    // dont care about param data in this case since we will only be referencing the data coming from the DB (parma data comes from user/client)
                    handleMove(data, ws, wss, schema, true); // autoPlay - player who was up did not play in time so timeout reached (Not cancelled)

                    // time ran out is an auto play: there is no TIME_RAN_OUT__SUCCESS action type, instead it turns into a PLAY_MOVE__SUCCESS when handleMove is called above and the function succeeds with no errors
                } else {
                    // ideally this should never happen but can happen if the backup tries to tell the server time is up if the manager was slow to tell the server -> manager told the server but the server was not able to update client and clear the backup's timeout in time so the backup hit the server with the old timerHash
                    console.log("ERROR: data.timerHash !== schema.timerHash");
                    const serverRes = {
                        type: "TIME_RAN_OUT__ERROR",
                        data: {
                            error: "Wrong timer hash"
                        }
                    }
                    ws.send(JSON.stringify(serverRes));
                }
            } catch (err) {
                console.log("err")
                console.log(err);
                const serverRes = {
                    type: "TIME_RAN_OUT__ERROR",
                    data: {
                        error: "Unknown error"
                    }
                }
                ws.send(JSON.stringify(serverRes));
            }
        }
    });
};

exports.timeRanOut = timeRanOut;