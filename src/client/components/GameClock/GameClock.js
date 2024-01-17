import React from "react";
import '../../app.css';

const GameClock = (props) => {
    return (
        <div className="clock_div">
            <p className="clock_text">Timer:</p>

            <div className="clock"
                 style={{backgroundColor: props.roundEnd.isEnd
                            ? "#EAA754"
                            : (props.playerInfo[props.username] && props.playerInfo[props.username].yourTurn)
                                ? (props.clockTime > 30
                                    ? "green"
                                    : props.clockTime > 20
                                        ? "yellow"
                                        : props.clockTime > 10
                                            ? "orange"
                                            : "red")
                                : "#EAA754"
                }}>

                {
                    props.roundEnd.isEnd
                        ? props.clockStartTime
                        : props.clockTime
                }
            </div>
        </div>
    );
}

export default GameClock;