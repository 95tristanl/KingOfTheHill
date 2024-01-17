import React from "react";
import '../../app.css';

const AlertModal = (props) => {
    return (
        <div className="alertModalBackdrop" 
             onClick={() => props.hideModal()}
        >
            <div className="alertModal" onClick={(e) => e.stopPropagation()}>
                <div className="alertModalCenter">
                    <div className="alertModalTitle">
                        { props.title }
                    </div>

                    <div className="alertModalText">
                        { props.text }
                    </div>

                    <div className="alertModalCloseBtn" onClick={() => props.hideModal()}>
                        Close X
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AlertModal;