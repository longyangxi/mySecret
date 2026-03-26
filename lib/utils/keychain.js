
/**
 * https://github.com/atom/node-keytar
 * keychain安全吗: https://www.computerworld.com/article/3254183/how-to-use-icloud-keychain-the-guide.html
 * restore keychain from timemachine：https://softwaretested.com/mac/how-to-restore-keychain-access-on-mac/
 */
const keytar = require('keytar')
const colors = require('colors')

async function setPwd(service, account, pwd) {
    try {
        await keytar.setPassword(service, account, pwd)
    } catch (e) {
        console.error(colors.red(`Failed to save to Keychain: ${e.message}`))
        throw e;
    }
}

async function getPwd(service, account) {
    try {
        return await keytar.getPassword(service, account)
    } catch (e) {
        console.error(colors.red(`Failed to read from Keychain: ${e.message}`))
        return null;
    }
}

module.exports = {
    setPwd,
    getPwd
}
