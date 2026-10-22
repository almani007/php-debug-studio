import { spawn } from 'child_process';
import path from 'path';

export interface FailedJob {
  id: string;
  connection: string;
  queue: string;
  payload: string;
  exception: string;
  failed_at: string;
}

export function listFailedJobs(projectPath: string, phpBinary?: string): Promise<string> {
  return new Promise((resolve) => {
    const cwd = path.resolve(projectPath);
    const artisanFile = path.join(cwd, 'artisan');
    const phpBin = phpBinary || 'php';

    const proc = spawn(phpBin, [artisanFile, 'queue:failed'], { cwd });
    let output = '';

    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { output += d.toString(); });
    proc.on('close', () => { resolve(output); });
    proc.on('error', (err) => { resolve(`Error executing queue:failed: ${err.message}`); });
  });
}

export function retryFailedJob(jobId: string, projectPath: string, phpBinary?: string): Promise<string> {
  return new Promise((resolve) => {
    const cwd = path.resolve(projectPath);
    const artisanFile = path.join(cwd, 'artisan');
    const phpBin = phpBinary || 'php';

    const proc = spawn(phpBin, [artisanFile, 'queue:retry', jobId], { cwd });
    let output = '';

    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { output += d.toString(); });
    proc.on('close', () => { resolve(output); });
    proc.on('error', (err) => { resolve(`Error retrying job: ${err.message}`); });
  });
}
