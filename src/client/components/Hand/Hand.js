import React, { Component } from "react";
import JokerOptions from "../Joker/JokerOptions";
import '../../app.css';

const jokerCardToDisplayValue = (card) => {
    const cardToDisplayValue = {
        "2s": "2",
        "3h": "3",
        "4d": "4",
        "5c": "5",
        "6s": "6",
        "7h": "7",
        "8d": "8",
        "9c": "9",
        "10s": "10",
        "11h": "Jack",
        "12d": "Queen",
        "13c": "King",
        "69x": "Egg"
    }

    return cardToDisplayValue[card];
}

class Hand extends Component {
    constructor(props) {
        super(props);
        this.state = {
            show_joker_options: "",
            joker_options_menu_x: 0,
            joker_options_menu_y: 0,
        };
    }

    render() {
        return (
            <div className="hand_div">
                {
                    this.props.hand.map((card, i) => {
                        return (
                            <div key={i} className="card_in_hand"
                                style={{ backgroundColor: this.props.cardsSelected_handIndex_dict[i] ? "blueviolet" : "white" }}>

                                <img className="card_in_hand_img"
                                    style={card === "14j" ? {height: "75px"} : {}}
                                    onClick={() => this.props.selectUnselectCardInHand(card, i)}
                                    src={`src/client/images/${card}.png`}>
                                </img>

                                { card === "14j" &&
                                    <div className="Joker_menu"
                                        onMouseEnter={(e) => 
                                            this.setState({
                                                show_joker_options: ("joker_options_menu_" + i),
                                                joker_options_menu_x: e.clientX - 15,
                                                joker_options_menu_y: e.clientY - 180,
                                            })
                                        }
                                        onMouseLeave={() => this.setState({show_joker_options: ""})}>

                                        <p className="Joker_cur_option">
                                            {
                                                this.state["curJokerOption_" + i]
                                                ? jokerCardToDisplayValue(this.state["curJokerOption_" + i])
                                                : "2"
                                            }
                                        </p>

                                        { this.state.show_joker_options === ("joker_options_menu_" + i) &&
                                            <JokerOptions
                                                cardInHandIndex={i}
                                                setJokerOption={
                                                    (card, index) => {
                                                        this.setState({
                                                            show_joker_options: "",
                                                            ["curJokerOption_" + index]: card, // set "curJokerOption_" + index in state in this component and parent component
                                                        });
                                                        this.props.setJokerOption(card, index);
                                                    }
                                                }
                                                style={{top: this.state.joker_options_menu_y, left: this.state.joker_options_menu_x}}
                                            />
                                        }
                                    </div>
                                }       
                            </div>
                        )
                    })
                }
            </div>
        );
    }
}

export default Hand;