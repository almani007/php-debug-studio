import { spawn } from 'child_process';
import path from 'path';

export const SAFE_COMMAND_ALLOWLIST = [
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

export const DESTRUCTIVE_COMMANDS = [
  'migrate:fresh',
  'migrate:reset',
  'db:wipe',
  'db:seed',
];

export interface ArtisanRunOptions {
  projectPath: string;
  command: string;
  args?: string[];
  forceDestructive?: boolean;
  phpBinary?: string;
}

export interface ArtisanResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  isDestructive: boolean;
  durationMs: number;
}

export function executeArtisan(options: ArtisanRunOptions): Promise<ArtisanResult> {
  return new Promise((resolve) => {
    const isDestructive = DESTRUCTIVE_COMMANDS.includes(options.command);
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

    const cwd = path.resolve(options.projectPath);
    const artisanFile = path.join(cwd, 'artisan');
    const fullArgs = [artisanFile, options.command, ...(options.args || [])];

    const phpBin = options.phpBinary || 'php';
    const start = Date.now();

    const proc = spawn(phpBin, fullArgs, {
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
