"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFailedJobs = listFailedJobs;
exports.retryFailedJob = retryFailedJob;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
function listFailedJobs(projectPath, phpBinary) {
    return new Promise((resolve) => {
        const cwd = path_1.default.resolve(projectPath);
        const artisanFile = path_1.default.join(cwd, 'artisan');
        const phpBin = phpBinary || 'php';
        const proc = (0, child_process_1.spawn)(phpBin, [artisanFile, 'queue:failed'], { cwd });
        let output = '';
        proc.stdout.on('data', (d) => { output += d.toString(); });
        proc.stderr.on('data', (d) => { output += d.toString(); });
        proc.on('close', () => { resolve(output); });
        proc.on('error', (err) => { resolve(`Error executing queue:failed: ${err.message}`); });
    });
}
function retryFailedJob(jobId, projectPath, phpBinary) {
    return new Promise((resolve) => {
        const cwd = path_1.default.resolve(projectPath);
        const artisanFile = path_1.default.join(cwd, 'artisan');
        const phpBin = phpBinary || 'php';
        const proc = (0, child_process_1.spawn)(phpBin, [artisanFile, 'queue:retry', jobId], { cwd });
        let output = '';
        proc.stdout.on('data', (d) => { output += d.toString(); });
        proc.stderr.on('data', (d) => { output += d.toString(); });
        proc.on('close', () => { resolve(output); });
        proc.on('error', (err) => { resolve(`Error retrying job: ${err.message}`); });
    });
}
//# sourceMappingURL=queue-diagnostics.js.map