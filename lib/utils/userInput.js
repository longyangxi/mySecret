const prompt = require("prompt");
const colors = require("colors/safe");

async function userInput(property) {
    return new Promise((resolve, reject) => {
        prompt.message = colors.bgMagenta("Input");
        prompt.delimiter = colors.cyan("=>");

        const properties = {};

        for (let name in property) {
            properties[name] = { description: colors.blue(property[name]) };
        }
        prompt.start();

        prompt.get({ properties }, function (err, result) {
            if (err || !result) reject(err)
            else resolve(result);
        });
    })
}

module.exports = userInput;
