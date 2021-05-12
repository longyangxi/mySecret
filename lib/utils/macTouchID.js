/**
 * https://github.com/emilbayes/macos-touchid
 */
var touchid = require('macos-touchid')

async function auth() {
  return new Promise((resolve, reject) => {
    if (touchid.canAuthenticate() === false) {
       reject('No authentication method available')
    }
    touchid.authenticate('authenticate you', function (err, didAuthenticate) {
      if (err) reject(err);
      else resolve(didAuthenticate)
    })
  })
}

module.exports = {
  auth
}
