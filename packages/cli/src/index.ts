import fs from 'fs';
import path from 'path';
import { runCollection, Collection } from './runner';
import { generateJUnitReport, TestResult } from './junit';
import { importOpenApi, importPostman } from './openapi';
import { runTests } from './test-studio';
import { executeArtisan } from './artisan';
import { scanProjectSecurity } from './security-scan';
import { listFailedJobs, retryFailedJob } from './queue-diagnostics';
import { explainErrorCli, optimizeQueryCli } from './advisor';
import { simulateWebhookCli } from './webhook';
import { scanDatabaseCli } from './database';

export async function cli(args: string[]): Promise<number> {
  const command = args[0];

  if (command === 'scan') {
    const targetDir = args[1] || '.';
    console.log(`Running Security Diagnostics on: ${path.resolve(targetDir)}...`);
    const findings = scanProjectSecurity(targetDir);
    if (findings.length === 0) {
      console.log('  \x1b[32m✔ No configuration vulnerabilities or exposed keys detected.\x1b[0m');
      return 0;
    }
    for (const f of findings) {
      const color = f.severity === 'critical' ? '\x1b[31m' : '\x1b[33m';
      console.log(`  ${color}[${f.severity.toUpperCase()}]\x1b[0m ${f.rule} (${f.file})`);
      console.log(`    Evidence: ${f.evidence}`);
      console.log(`    Remediation: ${f.remediation}`);
    }
    return findings.some((f) => f.severity === 'critical') ? 1 : 0;
  }

  if (command === 'test') {
    const runner = args.includes('--pest') ? 'pest' : 'phpunit';
    const filterIndex = args.indexOf('--filter');
    const filter = filterIndex !== -1 ? args[filterIndex + 1] : undefined;
    console.log(`Running ${runner.toUpperCase()} test suite in isolated process...`);
    const res = await runTests({ projectPath: '.', runner, filter });
    console.log(res.output);
    return res.exitCode;
  }

  if (command === 'artisan') {
    const artisanCmd = args[1];
    if (!artisanCmd) {
      console.error('Usage: debug-studio artisan <command> [--force]');
      return 1;
    }
    const force = args.includes('--force');
    const res = await executeArtisan({
      projectPath: '.',
      command: artisanCmd,
      args: args.slice(2).filter((a) => a !== '--force'),
      forceDestructive: force,
    });
    if (res.stdout) console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    return res.exitCode;
  }

  if (command === 'queue') {
    const subCmd = args[1];
    if (subCmd === 'retry') {
      const jobId = args[2];
      if (!jobId) {
        console.error('Usage: debug-studio queue retry <job-id>');
        return 1;
      }
      console.log(`Retrying queued job ID: ${jobId}...`);
      const output = await retryFailedJob(jobId, '.');
      console.log(output);
      return 0;
    }
    console.log('Fetching failed queue jobs via artisan...');
    const output = await listFailedJobs('.');
    console.log(output);
    return 0;
  }

  if (command === 'ai') {
    const subCmd = args[1];
    if (subCmd === 'explain') {
      const errorText = args.slice(2).join(' ') || 'General PHP Exception';
      console.log(`Asking local Ollama AI to explain error: "${errorText}"...`);
      const res = await explainErrorCli(errorText);
      console.log('\n--- Local AI Advisor Analysis ---');
      console.log(res);
      return 0;
    }
    if (subCmd === 'optimize') {
      const sqlQuery = args.slice(2).join(' ');
      if (!sqlQuery) {
        console.error('Usage: debug-studio ai optimize <SELECT ...>');
        return 1;
      }
      console.log(`Analyzing query performance via local AI...`);
      const res = await optimizeQueryCli(sqlQuery);
      console.log('\n--- Local AI Optimization Recommendations ---');
      console.log(res);
      return 0;
    }
    console.error('Usage: debug-studio ai <explain|optimize> [arguments]');
    return 1;
  }

  if (command === 'webhook') {
    const receiverId = args[1];
    const event = args[2] || 'test.ping';
    let payload = { timestamp: Date.now(), test: true };
    if (args[3]) {
      try {
        payload = JSON.parse(args[3]);
      } catch (e: any) {
        console.error('Invalid JSON payload provided.');
        return 1;
      }
    }
    if (!receiverId) {
      console.error('Usage: debug-studio webhook <receiver-id> [event-type] [payload-json]');
      return 1;
    }
    console.log(`Dispatching webhook event "${event}" to receiver ${receiverId}...`);
    const res = await simulateWebhookCli(receiverId, event, payload);
    console.log(`Response HTTP ${res.status}: ${res.body}`);
    return res.status >= 200 && res.status < 300 ? 0 : 1;
  }

  if (command === 'db') {
    const subCmd = args[1];
    if (subCmd === 'scan') {
      const proj = args[2] || 'default';
      console.log(`Fetching database performance findings for project: ${proj}...`);
      try {
        const findings = await scanDatabaseCli(proj);
        console.log(`Retrieved findings:`, JSON.stringify(findings, null, 2));
        return 0;
      } catch (e: any) {
        console.error(e.message);
        return 1;
      }
    }
    console.error('Usage: debug-studio db scan [project-id]');
    return 1;
  }

  if (command === 'import') {
    const inputPath = args[1];
    if (!inputPath) {
      console.error('Usage: debug-studio import <spec.json> [--type openapi|postman] --out <collection.json>');
      return 1;
    }

    const resolvedInput = path.resolve(process.cwd(), inputPath);
    if (!fs.existsSync(resolvedInput)) {
      console.error(`Error: File not found: ${resolvedInput}`);
      return 1;
    }

    const content = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
    let type = 'openapi';
    const typeIndex = args.indexOf('--type');
    if (typeIndex !== -1 && args[typeIndex + 1]) {
      type = args[typeIndex + 1].toLowerCase();
    } else if (content.info?.schema?.includes('postman') || content.item) {
      type = 'postman';
    }

    let collection: Collection;
    if (type === 'postman') {
      collection = importPostman(content);
    } else {
      collection = importOpenApi(content);
    }

    let outPath = 'collection.json';
    const outIndex = args.indexOf('--out');
    if (outIndex !== -1 && args[outIndex + 1]) {
      outPath = args[outIndex + 1];
    }

    const resolvedOut = path.resolve(process.cwd(), outPath);
    fs.writeFileSync(resolvedOut, JSON.stringify(collection, null, 2), 'utf8');
    console.log(`Successfully imported ${collection.requests.length} requests into ${resolvedOut}`);
    return 0;
  }

  const collectionIndex = args.indexOf('run');
  if (collectionIndex === -1 || !args[collectionIndex + 1]) {
    console.error('PHP Debug Studio CLI (by zoventra)');
    console.error('Usage:');
    console.error('  debug-studio run <collection.json> [--env <env.json>] [--report-junit <report.xml>]');
    console.error('  debug-studio import <spec.json> [--type openapi|postman] --out <collection.json>');
    console.error('  debug-studio test [--pest] [--filter <pattern>]');
    console.error('  debug-studio artisan <command> [--force]');
    console.error('  debug-studio queue [retry <id>]');
    console.error('  debug-studio scan [path]');
    console.error('  debug-studio ai <explain|optimize> <text>');
    console.error('  debug-studio webhook <receiver-id> [event] [payload-json]');
    console.error('  debug-studio db scan [project-id]');
    return 1;
  }

  const collectionPath = path.resolve(process.cwd(), args[collectionIndex + 1]);
  if (!fs.existsSync(collectionPath)) {
    console.error(`Error: Collection file not found: ${collectionPath}`);
    return 1;
  }

  let env: Record<string, string> = {};
  const envIndex = args.indexOf('--env');
  if (envIndex !== -1 && args[envIndex + 1]) {
    const envPath = path.resolve(process.cwd(), args[envIndex + 1]);
    if (fs.existsSync(envPath)) {
      try {
        env = JSON.parse(fs.readFileSync(envPath, 'utf8'));
      } catch (e: any) {
        console.error(`Error parsing environment JSON: ${e.message}`);
        return 1;
      }
    }
  }

  const collection: Collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
  console.log(`Running collection: ${collection.name} (${collection.requests.length} requests)...`);

  const results: TestResult[] = await runCollection(collection, env);

  let allPassed = true;
  for (const r of results) {
    if (r.passed) {
      console.log(`  \x1b[32m✔\x1b[0m ${r.name} (${r.durationMs}ms)`);
    } else {
      allPassed = false;
      console.log(`  \x1b[31m✖\x1b[0m ${r.name} (${r.durationMs}ms)`);
      console.log(`    \x1b[31m${r.failureMessage}\x1b[0m`);
    }
  }

  const junitIndex = args.indexOf('--report-junit');
  if (junitIndex !== -1 && args[junitIndex + 1]) {
    const outputPath = path.resolve(process.cwd(), args[junitIndex + 1]);
    const xml = generateJUnitReport(collection.name, results);
    fs.writeFileSync(outputPath, xml, 'utf8');
    console.log(`JUnit report generated at: ${outputPath}`);
  }

  return allPassed ? 0 : 1;
}
