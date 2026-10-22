import fs from 'fs';
import path from 'path';
import { runCollection, Collection } from './runner';
import { generateJUnitReport, TestResult } from './junit';

export async function cli(args: string[]): Promise<number> {
  const collectionIndex = args.indexOf('run');
  if (collectionIndex === -1 || !args[collectionIndex + 1]) {
    console.error('Usage: debug-studio run <collection.json> [--env <env.json>] [--report-junit <report.xml>]');
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
