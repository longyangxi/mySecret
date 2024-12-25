
/**
 * https://github.com/atom/node-keytar
 * keychain安全吗: https://www.computerworld.com/article/3254183/how-to-use-icloud-keychain-the-guide.html
 * restore keychain from timemachine：https://softwaretested.com/mac/how-to-restore-keychain-access-on-mac/
 */
const keytar = require('keytar')

async function setPwd(service, account, pwd)
{
    let r = await keytar.setPassword(service, account, pwd)
    // console.log("Set keychain successfully", service, account, pwd);
}

async function getPwd(service, account)
{
    let r = await keytar.getPassword(service, account)
    // if(r) console.log("Find a keychain: " + r + " for " + service + " of " + account)
    // else console.log("Not find a keychain for " + service + " of " + account)
    return r;
}

// setPwd(`google-secret-manager(${6666666})`, 'longsir1', 'danqing1997')
// getPwd('Google Secret Manager', 'longsir')

module.exports = {
    setPwd,
    getPwd
}