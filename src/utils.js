const getRandomInt = (max) => { // getRandomInt(3) -> output: 0, 1 or 2
    return Math.floor(Math.random() * max);
}

const genRandomString = (len) => {
    let charSet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randStr = "";
    for (let i = 0; i < len; i++) {
        randStr += charSet[getRandomInt(charSet.length)];
    }
    return randStr;
}

exports.getRandomInt = getRandomInt;
exports.genRandomString = genRandomString;