import React from "react";
import { getCardImg } from "../shared";
import { genRandomString } from "../../../utils";
import '../../app.css';

const BattleResult = (props) => {
    return (
        <div className="move_div_battleSandwich"
             style={{backgroundColor: "deepskyblue"}}>

            <p className="move_card_text_top_battleSandwich">
                {props.curMove[2]}
            </p>

            <div className="move_card_img_div">
                {
                    props.curMove[0].map((battleMove, i) => {
                        return (
                            <div key={genRandomString(5)}
                                 className="move_div"
                                 style={{backgroundColor: props.cardIndexToBackgroundColor[props.curCardPileIndex][i]}}>
                                <p className="move_card_text_top">{battleMove[2]}</p>

                                <img className="move_card_img"
                                     src={`src/client/images/${getCardImg(battleMove, battleMove[0][0])}.png`}
                                />

                                <div className="move_card_div_bottom">
                                    <p className="move_card_text_bottom">{battleMove[2]}</p>
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}

export default BattleResult;