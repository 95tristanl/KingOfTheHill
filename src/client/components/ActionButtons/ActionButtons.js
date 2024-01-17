import React from "react";
import '../../app.css';

const ActionButtons = (props) => {
    const showStartGameButton = props.canPlay_startOfNewRound && props.username === props.lord && props.players.length === props.gameSize && !props.gameStarted;

    const showPlayButton = 
        props.canPlay_startOfNewRound && 
        props.playerInfo[props.username] && 
        props.playerInfo[props.username].stillIn && 
        props.playerInfo[props.username].yourTurn && 
        !props.playerInfo[props.username].isSandwiched;

    const showWild9Button = props.canPlay_startOfNewRound && props.playerInfo[props.username].yourTurn && props.show_wild_nine_button;

    const showPassButton = 
        props.canPlay_startOfNewRound &&
        props.playerInfo[props.username].yourTurn &&
        ((props.isDerby && !props.isBattle) || props.playerInfo[props.username].isSandwiched);

    const showFoldButton =
        props.canPlay_startOfNewRound &&
        !props.isBattle &&
        !props.playerInfo[props.username].isSandwiched &&
        props.playerInfo[props.username].yourTurn &&
        !props.isDerby &&
        props.cardSelectedStack.length > 0;

    const showBattleSandwichButton = (
        props.canPlay_startOfNewRound &&
        props.cardPile.length > 0 &&
        props.cardPile[0][2] !== "Tie! Another Battle!" && // can't battle or sandwich once in a double, triple... etc battle
        (
            props.cardPile[0][2] !== props.username ||
            ( // if player plays and battles prev player(s) can still decide to play again to sandwich other player(s) instead of battling them
                props.cardPile[0][2] === props.username && 
                props.isBattle &&
                props.playerInfo[props.username].yourTurn
            ) 
        ) &&
        (
            props.isBattle || 
            !props.playerInfo[props.username].yourTurn || 
            props.playerInfo[props.username].isSandwiched
        ) &&
        props.areAllCardsSelectedTheSame() && // ensures all cards player is trying to play are the same. So in next check below only have to look at first card in this.state.cardSelectedStack
        ( // card(s) you are playing have to be the same as the last card(s) played in the card pile
            props.cardSelectedStack[0].substring(0, props.cardSelectedStack[0].length - 1) ===
            props.cardPile[0][0][0].substring(0, props.cardPile[0][0][0].length - 1)
        )
    );

    return (
        <div className="buttons_menu">
            <p className="yourHand_text">Your Hand:</p>

            <div className="buttons_container">
                { showStartGameButton &&
                    <button className="buttons"
                            id="startGameButton"
                            onClick={() => props.startGame()}
                    >
                        START GAME
                    </button>
                }

                { showPlayButton &&
                    <button className="buttons"
                            id="playButton"
                            onClick={() => props.play()}
                    >
                        PLAYYY
                    </button>
                }

                { showWild9Button &&
                    <button className="buttons"
                            id="nineButton"
                            onClick={() => props.wildNine()}
                    >
                        WILD 9
                    </button>
                }

                { showPassButton &&
                    <button className="buttons"
                            id="passButton"
                            onClick={() => props.pass()}
                    >
                        PAAASS
                    </button>
                }

                { showFoldButton &&
                    <button className="buttons"
                            id="foldButton"
                            onClick={() => props.fold()}
                    >
                        FFFOLD
                    </button>
                }

                { showBattleSandwichButton &&
                    <button className="buttons"
                            id="battleButton"
                            onClick={() => props.battleSandwich()}
                    >
                        { props.playerInfo[props.username].yourTurn ? "SANDWICH" : "BATTLE/SANDWICH"}
                    </button>
                }
            </div>
        </div>
    );
}

export default ActionButtons;