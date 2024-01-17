import React from "react";
import { getCardImg } from "../shared";
import { genRandomString } from "../../../utils";
import '../../app.css';

const PlayersMove = (props) => {
    console.log("render - PlayersMove")
    return (
        <div className="move_div"
             style={{backgroundColor: props.backgroundColor}}
        >
            <p className="move_card_text_top">
                {props.player}
            </p>

            <div className="move_card_img_div">
                {
                    props.cardsPlayed.map((card) => {
                        return (
                            <img key={genRandomString(5)}
                                 className="move_card_img"
                                 src={`src/client/images/${getCardImg(props.moveType, card)}.png`}
                            />
                        )
                    })
                }
            </div>

            <div className="move_card_div_bottom">
                <p className="move_card_text_bottom">
                    {props.player}
                </p>
            </div>
        </div>
    )
}

export default PlayersMove;