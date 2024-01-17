import React from "react";
//import { genRandomString } from "../../../utils";
import '../../app.css';

const BattleSandwichMoveWrapper = (props) => {
    return (
        <div className="move_div_battleSandwich"
             style={{ backgroundColor: props.backgroundColor }}
        >
            <p className="move_card_text_top_battleSandwich">
                { props.text }
            </p>

            <div className="move_card_img_div">
                { props.children }
            </div>
        </div>
    )
}

export default BattleSandwichMoveWrapper;