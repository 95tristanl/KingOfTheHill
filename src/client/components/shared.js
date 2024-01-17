export const getCardImg = (moveType, card) => {
    if (moveType === 'play') {
        return card;
    } else if (moveType === 'fold') {
        return "fold";
    } else if (moveType === 'wild') {
        return card;
    } else if (moveType === 'pass') {
        return "pass";
    } else if (moveType === 'outofcards') {
        return "outofcards";
    } else {
        return card;
    }
}