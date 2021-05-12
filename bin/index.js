#!/usr/bin/env node

'use strict';

const program = require('commander');
const fs = require('fs')
const path = require('path')
const {GoogleSecret, KeyChain, MacTouchID, Crypto} = require('../lib/index')
const {setId, getId} = require('../lib/utils/projectId')
const userInput = require('../lib/utils/userInput')
const colors = require('colors')

const LOCAL_LIST_CACHE = path.join(__dirname, 'secret_list_cache.json')

program
    .version('0.3.8');

program.command("setid")
.description("Set google secret project id")
.action(function() {
    setId();
})

program.command("getid")
.description("Get google secret project id")
.action(function() {
    let id = getId();
    console.log(colors.green('Google secret manager id is: ' + id))
})

program.command("list")
.description("List all the google secrets")
.action(async function() {
    let id = getId()
    console.log(colors.green('Google secret manager id is: ' + id))

    let arr = []
    if(fs.existsSync(LOCAL_LIST_CACHE)) {
        arr = JSON.parse(fs.readFileSync(LOCAL_LIST_CACHE, 'utf-8'))
    }
    console.log("LOCAL LIST: ")
    console.table(arr)

    let gs = new GoogleSecret(id)
    await showOnlineList(gs)
})
program.command("add")
.description("Add a google secret text")
.action(async function() {
   let id = getId()
   console.log(colors.green('Google secret manager id is: ' + id))
   let gs = new GoogleSecret(id)
   let {secretId} = await userInput({secretId: 'Secret Id'})

    let has = await gs.getSecret(secretId)
    if(!has) {
        await gs.createSecret(secretId)
    } else {
        console.log(colors.red("There already has a secret named: " + secretId))
        process.exit(0)
    }
    let {secretStr, pwd} = await userInput({secretStr: 'Text to be protected', pwd: "A password to encrypt your text? (optional)"})

    if(pwd  && pwd.length) {
        let {pwd1} = await userInput({pwd1: 'Confirm your password'})
        if(pwd == pwd1) {
            secretStr = Crypto.encrypt(secretStr,  pwd);
            await doAdd(gs, secretId, secretStr, pwd);
            process.exit(0);
        } else {
            console.log(colors.red("The two password are not the same!"))
            process.exit(0)
        }
    } else {
        await doAdd(gs, secretId, secretStr);
        process.exit(0)
    }
})

program.command("get")
.description("Get a google secret text")
.action(async function() {
    let id = getId()
    console.log(colors.green('Google secret manager id is: ' + id))
    let gs = new GoogleSecret(id)
    //secretId@5 means version 5, or return the latest
    let {secretId} = await userInput({secretId: 'Secret Id'})
    if(!secretId) {
        console.log(colors.red("Secret Id is null, exit!"));
        process.exit(0)
        return;
    }
    let arr = secretId.split('@');
    let sid = arr[0]; //the secret id
    let sv = arr[1];  //the secret version

    //先从keychain获取
    let str = await KeyChain.getPwd(getKeychainValueId(), sid);
    if(str) {
        console.log("SECRET FROM LOCAL KEYCHAIN: ")
        await showSecret(str, sid);
    }
    
    //再尝试从google获取
    let gstr = await gs.accessSecretVersion(sid,  sv || 'latest');

    if(!str && !gstr) {
        console.log(colors.red("There is no secret named: " + sid));
        process.exit(0);
    }

    console.log("SECRET FROM GOOGLE: ")
    await showSecret(gstr, sid);

    process.exit(0)
})

program.command("remove")
.description("Remove a google secret")
.action(async function() {
    let id = getId()
    console.log(colors.green('Google secret manager id is: ' + id))
    let gs = new GoogleSecret(id);
    let {secretId} = await userInput({secretId: 'Secret Id'})
    await gs.deleteSecret(secretId)
    await showOnlineList(gs)
    process.exit(0)
})

async function doAdd(gs, secretId, secretStr, pwd)
{
    //本地存一份
    if(pwd) KeyChain.setPwd(getKeychainPwdId(), secretId, pwd);
    KeyChain.setPwd(getKeychainValueId(), secretId, secretStr);
    //google存一份
    await gs.addSecretVersion(secretId, secretStr);
    await showOnlineList(gs)
}

/**
 * 存储在keychain中的加密字符串
 */
function getKeychainValueId() {
    return 'GoogleSecretManager_v@' + getId()
}

/**
 * 存储在keychain中的加密字符串的密码
 */
function getKeychainPwdId() {
    return 'GoogleSecretManager_p@' + getId()
}

async function showOnlineList(gs) {
    let arrOnline = await gs.listSecrets();
    if(arrOnline) {
        fs.writeFileSync(LOCAL_LIST_CACHE, JSON.stringify(arrOnline))
        console.log("ONLINE LIST: ")
        console.table(arrOnline)
    }
}

async function showSecret(secretStr, secretId) {
    //优先使用keychain存储的密码来解密
    let pwd = await KeyChain.getPwd(getKeychainPwdId(), secretId);

    if(pwd) {
        secretStr = Crypto.decrypt(secretStr, pwd);
        showResult(secretStr); 
    } else {
        let {pwd} = await userInput({pwd: 'A password to decrypt? (optional)'})
        if(pwd && pwd.length) {
            secretStr = Crypto.decrypt(secretStr, pwd);
            showResult(secretStr);
        } else {
            showResult(secretStr);
        }
    }
}

function showResult(secretStr) {
    let sarr = secretStr.split(':')
    console.log(colors.green("******RESULT******"));
    if(sarr.length > 1) {
        console.log(colors.yellow("ID: " + sarr[0]))
        console.log(colors.yellow("PASSWORD: " + sarr[1]))
    } else {
        console.log(colors.yellow(secretStr))
    }
}


program.parse(process.argv);
