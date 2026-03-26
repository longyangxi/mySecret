const CryptoJS = require("crypto-js");

const KEY_SIZE = 256 / 32; // 256-bit key
const ITERATIONS = 100000; // PBKDF2 iterations
const SALT_SIZE = 128 / 8;  // 128-bit salt

function encrypt(str, pwd) {
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE);
    const key = CryptoJS.PBKDF2(pwd, salt, { keySize: KEY_SIZE, iterations: ITERATIONS });
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(str, key, { iv: iv });
    // Format: salt:iv:ciphertext (all base64)
    return salt.toString(CryptoJS.enc.Base64) + ':' +
           iv.toString(CryptoJS.enc.Base64) + ':' +
           encrypted.toString();
}

function decrypt(str, pwd) {
    // Support legacy format (no salt:iv: prefix) for backward compatibility
    const parts = str.split(':');
    if (parts.length === 3) {
        // New format: salt:iv:ciphertext
        const salt = CryptoJS.enc.Base64.parse(parts[0]);
        const iv = CryptoJS.enc.Base64.parse(parts[1]);
        const ciphertext = parts[2];
        const key = CryptoJS.PBKDF2(pwd, salt, { keySize: KEY_SIZE, iterations: ITERATIONS });
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv: iv });
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        if (!result) {
            throw new Error('Decryption failed: incorrect password');
        }
        return result;
    } else {
        // Legacy format: try old CryptoJS string-passphrase decrypt
        const bytes = CryptoJS.AES.decrypt(str, pwd);
        const result = bytes.toString(CryptoJS.enc.Utf8);
        if (!result) {
            throw new Error('Decryption failed: incorrect password or unencrypted text');
        }
        return result;
    }
}

module.exports = {
    encrypt,
    decrypt
}
