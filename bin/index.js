#!/usr/bin/env node

'use strict';

const { Command } = require('commander');
const fs = require('fs')
const path = require('path')
const { GoogleSecret, KeyChain, MacTouchID, Crypto } = require('../lib/index')
const { setId, getId, getConfigDir, ensureConfigDir } = require('../lib/utils/projectId')
const userInput = require('../lib/utils/userInput')
const colors = require('colors')
const pkg = require('../package.json')

const program = new Command();

function getLocalListCachePath() {
    ensureConfigDir()
    return path.join(getConfigDir(), 'secret_list_cache.json')
}

program
    .version(pkg.version);

program.command("setid")
    .description("Set google secret project id")
    .action(function () {
        setId();
    })

program.command("getid")
    .description("Get google secret project id")
    .action(function () {
        const id = getId();
        console.log(colors.green('Google secret manager id is: ' + id))
    })

program.command("list")
    .description("List all the google secrets")
    .action(async function () {
        const id = getId()
        console.log(colors.green('Google secret manager id is: ' + id))

        const gs = new GoogleSecret(id)
        await showList(gs)
    })

program.command("add")
    .description("Add a google secret text")
    .action(async function () {
        const id = getId()
        console.log(colors.green('Google secret manager id is: ' + id))
        const gs = new GoogleSecret(id)
        let { secretId } = await userInput({ secretId: 'Secret Id' })

        // Validate secretId
        if (!secretId || !secretId.trim()) {
            console.log(colors.red("Secret Id cannot be empty!"))
            process.exit(1)
        }
        if (/[\/\\\.\.]/g.test(secretId)) {
            console.log(colors.red("Secret Id contains invalid characters!"))
            process.exit(1)
        }

        const has = await gs.getSecret(secretId)
        if (!has) {
            try {
                await gs.createSecret(secretId)
            } catch (e) {
                console.log(colors.red("Failed to create secret, aborting."))
                process.exit(1)
            }
        } else {
            console.log(colors.red("There already has a secret named: " + secretId))
            process.exit(0)
        }
        let { secretStr, pwd } = await userInput({ secretStr: 'Text to be protected', pwd: "A password to encrypt your text? (optional)" })

        if (pwd && pwd.length) {
            const { pwd1 } = await userInput({ pwd1: 'Confirm your password' })
            if (pwd === pwd1) {
                secretStr = Crypto.encrypt(secretStr, pwd);
                await doAdd(gs, secretId, secretStr, pwd);
                process.exit(0);
            } else {
                console.log(colors.red("The two passwords are not the same!"))
                process.exit(1)
            }
        } else {
            await doAdd(gs, secretId, secretStr);
            process.exit(0)
        }
    })

program.command("get")
    .description("Get a google secret text")
    .argument('<string>', 'the id you want to get')
    .action(async (secretId, options) => {
        const id = getId()
        const gs = new GoogleSecret(id)

        // Touch ID authentication
        try {
            const authed = await MacTouchID.auth('authenticate to access secret')
            if (!authed) {
                console.log(colors.red("Authentication failed!"))
                process.exit(1)
            }
        } catch (e) {
            console.log(colors.red("Authentication error: " + e.message))
            process.exit(1)
        }

        const arr = secretId.split('@');
        let sid = arr[0];
        const sv = arr[1];
        sid = getIdFromIndex(sid);

        // 先尝试从google获取
        const gstr = await gs.accessSecretVersion(sid, sv || 'latest');

        if (gstr) {
            console.log("SECRET FROM GOOGLE: ")
            await showSecret(gstr, sid);
        } else {
            const str = await KeyChain.getPwd(getKeychainValueId(), sid);
            if (str) {
                console.log("SECRET FROM LOCAL KEYCHAIN: ")
                await showSecret(str, sid);
            } else {
                console.log(colors.red("Secret not found in Google or local Keychain."))
            }
        }
        process.exit(0)
    })

program.command("remove")
    .description("Remove a google secret")
    .action(async function () {
        const id = getId();
        console.log(colors.green('Google secret manager id is: ' + id));

        const gs = new GoogleSecret(id);
        const { secretId } = await userInput({ secretId: 'Secret Id' });

        // 确认倒计时逻辑
        console.log(colors.red(`Warning: You are about to delete the secret "${secretId}".`));
        console.log(colors.yellow('This action is irreversible. You have 20 seconds to cancel (press Ctrl+C to exit).'));

        await countdown(20);

        console.log(colors.green('Proceeding with deletion...'));

        const n = await gs.deleteSecret(secretId);
        if (!n) {
            removeLocalList(secretId);
        }
        await showList(gs);
        process.exit(0);
    });

async function doAdd(gs, secretId, secretStr, pwd) {
    // 本地存一份
    try {
        if (pwd) await KeyChain.setPwd(getKeychainPwdId(), secretId, pwd);
        await KeyChain.setPwd(getKeychainValueId(), secretId, secretStr);
    } catch (e) {
        console.log(colors.yellow("Warning: Failed to save to local Keychain backup."))
    }

    // google存一份
    const v = await gs.addSecretVersion(secretId, secretStr);
    if (!v) {
        console.log(colors.yellow("Warning: Failed to save to Google. Saved to local cache only."))
        addLocalList(secretId);
    } else {
        addLocalList(secretId);
    }
    await showList(gs);
}

function addLocalList(secretId) {
    const cachePath = getLocalListCachePath()
    let arr = []
    if (fs.existsSync(cachePath)) {
        arr = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
    }
    if (!arr.includes(secretId)) {
        arr.push(secretId);
    }
    fs.writeFileSync(cachePath, JSON.stringify(arr), { mode: 0o600 })
}

function removeLocalList(secretId) {
    const cachePath = getLocalListCachePath()
    if (!fs.existsSync(cachePath)) return;
    let arr = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
    const index = arr.indexOf(secretId);
    if (index > -1) {
        arr.splice(index, 1);
    }
    fs.writeFileSync(cachePath, JSON.stringify(arr), { mode: 0o600 })
}

function getIdFromIndex(index) {
    if (!isPositiveInteger(index)) return index;
    const cachePath = getLocalListCachePath()
    if (!fs.existsSync(cachePath)) return index;
    const arr = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
    return arr[parseInt(index)] || index;
}

function isPositiveInteger(str) {
    return /^\d+$/.test(str);
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

async function showList(gs) {
    let arr = await showOnlineList(gs)
    if (!arr) {
        arr = []
        const cachePath = getLocalListCachePath()
        if (fs.existsSync(cachePath)) {
            arr = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
        }
        console.log("Online is not available, here is the local list: ")
        console.table(arr)
    }
}

async function showOnlineList(gs) {
    const arrOnline = await gs.listSecrets();
    if (arrOnline) {
        const cachePath = getLocalListCachePath()
        fs.writeFileSync(cachePath, JSON.stringify(arrOnline), { mode: 0o600 })
        console.log("ONLINE LIST: ")
        console.table(arrOnline)
    }
    return arrOnline;
}

async function showSecret(secretStr, secretId) {
    // 优先使用keychain存储的密码来解密
    let pwd = await KeyChain.getPwd(getKeychainPwdId(), secretId);

    if (!pwd) {
        const input = await userInput({ pwd: 'A password to decrypt? (optional)' })
        pwd = input.pwd;
    }

    if (pwd && pwd.length) {
        try {
            secretStr = Crypto.decrypt(secretStr, pwd);
        } catch (e) {
            console.log(colors.red(e.message));
            return;
        }
    }

    showResult(secretStr);
}

function showResult(secretStr) {
    // Copy to clipboard hint
    console.log(colors.green("******RESULT******"));
    console.log(colors.green(secretStr));
}

async function countdown(seconds) {
    for (let i = seconds; i > 0; i--) {
        process.stdout.write(colors.yellow(`\rTime remaining: ${i} seconds`));
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log();
}


program.parse(process.argv);
