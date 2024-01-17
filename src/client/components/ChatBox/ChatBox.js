import React, { Component } from 'react';
import '../../app.css';

class ChatBox extends Component {
    constructor(props) {
        super(props);
        this.state = {
            chatMsg: "",
        };
    }

    render() {
        return (
            <div className="chat_container">
                <div className="chat_input_and_button_div">
                    <input
                        className="chat_input"
                        name="msg"
                        placeholder="Chat message"
                        onChange={(e) => this.setState({chatMsg: e.target.value})}
                        value={this.state.chatMsg}
                    />

                    <p className="buttons"
                    id="chat_button"
                    onClick={() => {
                        const msg = this.state.chatMsg;
                        const succeeded = this.props.sendChatMessege(msg);
                        if (succeeded) {
                            this.setState({chatMsg: ""});
                        }
                    }}>
                    Send Messege
                    </p>
                </div>

                { this.props.chatList && this.props.chatList.length > 0 &&
                    <div className="chat_list_div">
                        {
                            this.props.chatList.map((el, i) => {
                                return (<p key={i} className="Chat_list_item">{el}</p>)
                            })
                        }
                    </div>
                }
            </div>
        )
    }
}

export default ChatBox;
