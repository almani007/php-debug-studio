import fs from 'fs';
import path from 'path';
import { runCollection, Collection } from './runner';
import { generateJUnitReport, TestResult } from './junit';
import { importOpenApi, importPostman } from './openapi';

export async function cli(args: string[]): Promise<number> {
  const command = args[0];

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
    console.error('Usage:');
    console.error('  debug-studio run <collection.json> [--env <env.json>] [--report-junit <report.xml>]');
    console.error('  debug-studio import <spec.json> [--type openapi|postman] --out <collection.json>');
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
