
const fs = require('fs')
const path = require('path')
const userInput = require('./userInput')

const PROJECT_ID_FILE = path.join(__dirname, '../../bin/google_secret_id.txt')

async function setId() {
    if(fs.existsSync(PROJECT_ID_FILE)) {
        let id = fs.readFileSync(PROJECT_ID_FILE, 'utf-8')
        if(id && id.length) {
             let {yes} = await userInput({yes: `There has a id: ${id}, do you want to replace it? Y/n `})
             if(yes && yes.toLowerCase() == 'y') await doSetId();
             else process.exit(0)
        } else {
            await doSetId()
        }
     } else {
        await doSetId()
     }
}

function getId() {
    if(fs.existsSync(PROJECT_ID_FILE)) {
        let id = fs.readFileSync(PROJECT_ID_FILE, 'utf-8')
        if(id && id.length) {
            return id;
        }
    } 
    console.log('There is no any google secret manager id, please run "mysecret setid"')
    process.exit(0)
}

async function doSetId() {
   let {id} = await userInput({id: `Input a id`})
   if(!id || id.length < 12) {
        console.log('Please input a 12 length numbers(like 661237770843), found at: https://console.cloud.google.com/security/secret-manager')
        process.exit(0)
    } else {
        fs.writeFileSync(PROJECT_ID_FILE, id);
    }
}

module.exports = {
    setId,
    getId
}

// setId();