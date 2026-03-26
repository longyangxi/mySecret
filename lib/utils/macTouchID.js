/**
 * https://github.com/emilbayes/macos-touchid
 */
const touchid = require('macos-touchid')

async function auth(reason = 'authenticate to access secrets') {
  return new Promise((resolve, reject) => {
    if (touchid.canAuthenticate() === false) {
       resolve(true) // No Touch ID available, skip authentication
       return
    }
    touchid.authenticate(reason, function (err, didAuthenticate) {
      if (err) reject(err);
      else resolve(didAuthenticate)
    })
  })
}

function canAuthenticate() {
  return touchid.canAuthenticate()
}

module.exports = {
  auth,
  canAuthenticate
}
