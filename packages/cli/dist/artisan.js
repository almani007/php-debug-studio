"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESTRUCTIVE_COMMANDS = exports.SAFE_COMMAND_ALLOWLIST = void 0;
exports.executeArtisan = executeArtisan;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
exports.SAFE_COMMAND_ALLOWLIST = [
    'route:list',
    'config:show',
    'about',
    'optimize:clear',
    'cache:clear',
    'view:clear',
    'event:list',
    'schedule:list',
    'queue:failed',
    'debug-studio:doctor',
    'debug-studio:install',
];
exports.DESTRUCTIVE_COMMANDS = [
    'migrate:fresh',
    'migrate:reset',
    'db:wipe',
    'db:seed',
];
function executeArtisan(options) {
    return new Promise((resolve) => {
        const isDestructive = exports.DESTRUCTIVE_COMMANDS.includes(options.command);
        if (isDestructive && !options.forceDestructive) {
            resolve({
                command: options.command,
                exitCode: 1,
                stdout: '',
                stderr: `Blocked: Command '${options.command}' is flagged as destructive. Explicit forceDestructive confirmation required.`,
                isDestructive: true,
                durationMs: 0,
            });
            return;
        }
        const cwd = path_1.default.resolve(options.projectPath);
        const artisanFile = path_1.default.join(cwd, 'artisan');
        const fullArgs = [artisanFile, options.command, ...(options.args || [])];
        const phpBin = options.phpBinary || 'php';
        const start = Date.now();
        const proc = (0, child_process_1.spawn)(phpBin, fullArgs, {
            cwd,
            env: process.env,
        });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('close', (code) => {
            resolve({
                command: options.command,
                exitCode: code ?? 1,
                stdout,
                stderr,
                isDestructive,
                durationMs: Date.now() - start,
            });
        });
        proc.on('error', (err) => {
            resolve({
                command: options.command,
                exitCode: 1,
                stdout,
                stderr: `Execution error: ${err.message}`,
                isDestructive,
                durationMs: Date.now() - start,
            });
        });
    });
}
//# sourceMappingURL=artisan.js.map