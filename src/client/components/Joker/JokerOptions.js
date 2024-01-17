import React from "react";
import '../../app.css';

const JokerOptions = (props) => {
    const i = props.cardInHandIndex;

    return (
        <div className="Joker_options" style={props.style}>
            <p className="Joker_option" onClick={() => props.setJokerOption("2s", i)}>2</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("3h", i)}>3</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("4d", i)}>4</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("5c", i)}>5</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("6s", i)}>6</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("7h", i)}>7</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("8d", i)}>8</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("9c", i)}>9</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("10s", i)}>10</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("11h", i)}>Jack</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("12d", i)}>Queen</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("13c", i)}>King</p>
            <p className="Joker_option" onClick={() => props.setJokerOption("69x", i)}>Rotten Egg</p>
        </div>
    )
}

export default JokerOptions;