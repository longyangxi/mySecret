var CryptoJS = require("crypto-js");

function encrypt(str, pwd) {
    var result = CryptoJS.AES.encrypt(str, pwd).toString();
    return result;
}

function decrypt(str, pwd) {
    var bytes  = CryptoJS.AES.decrypt(str, pwd);
    var originalText = bytes.toString(CryptoJS.enc.Utf8);
    if(!originalText) console.log('The password is incorrect or ' + 'the string may be unencrypted!')
    return originalText || str;
}

module.exports = {
    encrypt,
    decrypt
}