"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = runTests;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
function runTests(options) {
    return new Promise((resolve) => {
        const cwd = path_1.default.resolve(options.projectPath);
        const runnerBinary = options.runner === 'pest' ? 'vendor/bin/pest' : 'vendor/bin/phpunit';
        const executable = path_1.default.join(cwd, runnerBinary);
        const args = ['--testdox'];
        if (options.filter) {
            args.push('--filter', options.filter);
        }
        const phpBin = options.phpBinary || 'php';
        const start = Date.now();
        const proc = (0, child_process_1.spawn)(phpBin, [executable, ...args], {
            cwd,
            env: { ...process.env, APP_ENV: 'testing' },
        });
        let output = '';
        proc.stdout.on('data', (data) => {
            output += data.toString();
        });
        proc.stderr.on('data', (data) => {
            output += data.toString();
        });
        proc.on('close', (code) => {
            const durationMs = Date.now() - start;
            resolve({
                runner: options.runner || 'phpunit',
                exitCode: code ?? 1,
                output,
                passed: code === 0,
                durationMs,
            });
        });
        proc.on('error', (err) => {
            const durationMs = Date.now() - start;
            resolve({
                runner: options.runner || 'phpunit',
                exitCode: 1,
                output: `Failed to launch test runner: ${err.message}`,
                passed: false,
                durationMs,
            });
        });
    });
}
//# sourceMappingURL=test-studio.js.map