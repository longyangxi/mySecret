var prompt = require("prompt");
var colors = require("colors/safe");

async function userInput(property) {
    return new Promise((resolve, reject) => {
        prompt.message = colors.bgMagenta("Input");
        prompt.delimiter = colors.cyan("=>");

        let properties = {};

        for(let name in property) {
            properties[name] = {description: colors.blue(property[name])};
        }
        prompt.start();
        
        prompt.get({ properties }, function (err, result) {
            if(err || !result) reject(err)
            else resolve(result);
        });
    })
}

async function test() {
    let result = await userInput({name: "Your name? ", email: "Your email? "});
    console.log(colors.cyan("You said your name is: " + result.name + ", " + result.email));
}

// test();

module.exports = userInput;