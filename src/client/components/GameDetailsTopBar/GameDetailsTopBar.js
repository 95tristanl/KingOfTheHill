import React from "react";
import '../../app.css';

const GameDetailsTopBar = (props) => {
    return (
        <div className="navbar">
                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Players:</p>
                        <p className="stats_header">{props.gameSize}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Deck Size:</p>
                        <p className="stats_header">{props.deckSize}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Hand Size:</p>
                        <p className="stats_header">{props.handSize}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Refuel At:</p>
                        <p className="stats_header">{props.refuelNumber}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="navbar_title">King of the Hill</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">Cards Left:</p>
                        <p className="stats_header">{props.cardsInDeck}</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div">
                        <p className="stats_header">
                            {props.roundLog.length > 0 ? props.roundLog[0] : "No winner"}
                        </p>
                        <p className="stats_header">
                            {props.roundLog.length > 0 ? `${props.roundLog[1]} + ${props.roundLog[2]}` : "yet..."}
                        </p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div"
                         style={{backgroundColor: props.higherIsBetter ? "#EAA754" : "pink"}}>
                        <p className="stats_header">{props.higherIsBetter ? "Higher" : "Lower"}</p>
                        <p className="stats_header">is better</p>
                    </div>

                    <div className="navbar_blackbar"/>

                    <div className="nav_info_div"
                         style={{backgroundColor: props.isBattle ? "deepskyblue" : props.isDerby ? "blueviolet" : "#EAA754"}}>
                        <p className="stats_header">
                            {props.isBattle ? "Battle" : props.isDerby ? "Derby" : "Normal"}
                        </p>
                    </div>

                    <div className="navbar_blackbar"/>
                </div>
    )
}

export default GameDetailsTopBar;