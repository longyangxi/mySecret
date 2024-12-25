const { spawn } = require('child_process');

async function runCommand(command, args = [], inputs = []) {
    return new Promise((resolve, reject) => {
        console.log(`Spawning command: ${command} ${args.join(' ')}`);
        const child = spawn(command, args);

        let output = '';
        let errorOutput = '';

        // 捕获标准输出
        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                // 忽略 Google service 错误和其他无关输出
                if (!line.includes('Google service Error') && !line.includes('DeprecationWarning')) {
                    // console.log(`[STDOUT]: ${line}`);
                    output += `${line}\n`;
                }
            }
        });

        // 捕获错误输出
        child.stderr.on('data', (data) => {
            const errorLine = data.toString();
            if (!errorLine.includes('DeprecationWarning')) {
                // console.error(`[STDERR]: ${errorLine}`);
                errorOutput += errorLine;
            }
        });

        // 捕获子进程关闭
        child.on('close', (code) => {
            // console.log(`Child process exited with code ${code}`);
            if (code === 0) {
                // 提取有意义的输出行
                const finalOutput = output
                    .split('\n')
                    .map((line) => line.replace(/\x1B\[[0-9;]*m/g, '').trim()) // 去掉 ANSI 转义字符
                    .filter((line) => line && !line.startsWith('at ') && !line.includes('GoogleAuth')); // 过滤无关行
        
                resolve(finalOutput[finalOutput.length - 1]);
            } else {
                reject(new Error(`Process exited with code ${code}: ${errorOutput.trim()}`));
            }
        });

        // 输入参数
        inputs.forEach((input) => {
            // console.log(`[STDIN]: ${input}`);
            child.stdin.write(`${input}\n`);
        });

        // 结束输入
        child.stdin.end();
    });
}

// 测试运行
(async () => {
    try {
        const result = await runCommand('node', ['./bin/index.js', 'get', '0'], ['\n']); // 修改为你的输入
        console.log('Final Output:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
})();