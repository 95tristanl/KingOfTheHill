import React from "react";
import '../../app.css';

const PlayerBubbles = (props) => {
    return (
        <div className="Players_div">
            {
                props.players.map((username, i) => {
                    return (
                        <p key={i} className="Player_details_div"
                           style={{
                                border: props.playerInfo[username].isSandwiched
                                        ? "2px solid orange"
                                        : props.playerInfo[username].yourTurn
                                            ? "2px solid yellow"
                                            : "2px solid black",
                                backgroundColor: props.playerInfo[username].stillIn ? "green" : "red"
                            }}>
                                
                            <span style={{color: username === props.username ? "white" : "black"}}>
                                {username}
                            </span>
                            <br/>
                            {"Cards: " + props.playerInfo[username].handSize}
                            <br/>
                            {"score: " + props.playerInfo[username].score}
                        </p>
                    )
                })
            }
        </div>
    );
}

export default PlayerBubbles;