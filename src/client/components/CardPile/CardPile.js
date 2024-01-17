import React, { Component } from "react";
import '../../app.css';

class CardPile extends Component {

    shouldComponentUpdate(nextProps) {
        if (nextProps.cardPile.length !== this.props.cardPile.length || 
            this.props.cardPile.length === 0 ||
            nextProps.roundEnd.isEnd !== this.props.roundEnd.isEnd || 
            nextProps.gameOver.isOver !== this.props.gameOver.isOver
        ) { 
            return true;
        } else { 
            return false;
        } 
    }

    render() {
        return (
            <>
                <div className="cardPile_container">
                    <p className="cardPile_text">Card Pile:</p>

                    <div className="announcement_div">
                        { this.props.announcement &&
                            <p className="announcement_text"
                            style={{backgroundColor:
                                    this.props.roundEnd.isEnd && !this.props.gameOver.isOver
                                    ? "pink"
                                    : this.props.gameOver.isOver
                                        ? "gold"
                                        : "pink"
                                }}>
                                {this.props.announcement}
                            </p>
                        }
                    </div>
                </div>

                <div className="cardPileRow">
                    { this.props.generateCardPile(this.props.cardPile) }
                </div>
            </>
        )
    }
}

export default CardPile;