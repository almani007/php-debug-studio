import { spawn } from 'child_process';
import path from 'path';

export interface TestSuiteOptions {
  projectPath: string;
  runner?: 'phpunit' | 'pest';
  filter?: string;
  phpBinary?: string;
}

export interface TestExecutionResult {
  runner: string;
  exitCode: number;
  output: string;
  passed: boolean;
  durationMs: number;
}

export function runTests(options: TestSuiteOptions): Promise<TestExecutionResult> {
  return new Promise((resolve) => {
    const cwd = path.resolve(options.projectPath);
    const runnerBinary = options.runner === 'pest' ? 'vendor/bin/pest' : 'vendor/bin/phpunit';
    const executable = path.join(cwd, runnerBinary);

    const args: string[] = ['--testdox'];
    if (options.filter) {
      args.push('--filter', options.filter);
    }

    const phpBin = options.phpBinary || 'php';
    const start = Date.now();

    const proc = spawn(phpBin, [executable, ...args], {
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
