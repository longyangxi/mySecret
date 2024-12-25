const { spawn } = require('child_process');
const readline = require('readline');

async function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`Spawning command: ${command} ${args.join(' ')}`);
        const child = spawn(command, args);

        let output = '';
        let errorOutput = '';
        let awaitingInput = false; // 标志是否等待用户输入

        // 捕获标准输出
        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                console.log(`[STDOUT]: ${line}`);
                // 检查是否需要用户输入
                if (line.includes('Input')) { // 示例匹配用户输入提示
                    awaitingInput = true; // 设置等待输入标志
                    promptUserInput(child); // 调用用户输入处理
                } else {
                    // 将正常输出存储到 output 中
                    output += `${line}\n`;
                }
            }
        });

        // 捕获标准错误输出
        child.stderr.on('data', (data) => {
            const errorLine = data.toString();
            errorOutput += errorLine;
        });

        // 捕获子进程关闭
        child.on('close', (code) => {
            if (code === 0) {
                resolve(output.trim());
            } else {
                reject(new Error(`Process exited with code ${code}: ${errorOutput.trim()}`));
            }
        });

        // 用户输入处理
        const promptUserInput = (childProcess) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            rl.question('Enter your input: ', (input) => {
                childProcess.stdin.write(`${input}\n`);
                rl.close();
            });

            // rl.on('close', () => {
                // console.log('Input stream closed.');
                // child.stdin.end(); // 结束 stdin
            // });
        };
    });
}

// 测试运行
(async () => {
    try {
        const result = await runCommand('node', ['./bin/index.js', 'list']);
        console.log('Final Output:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
})();