/**
 * Test runner: discovers and runs every test-*.js script in the tests/ directory.
 *
 * Usage:  node tests/run-all.js
 * Exit 0 = all passed, exit 1 = at least one failure.
 */

import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const testFiles = readdirSync(__dirname)
  .filter(f => f.startsWith('test-') && f.endsWith('.js'))
  .sort();

if (testFiles.length === 0) {
  console.log('No test files found (expected tests/test-*.js)');
  process.exit(0);
}

console.log(`Found ${testFiles.length} test file(s):\n`);

const results = [];

for (const file of testFiles) {
  const filePath = join(__dirname, file);
  const label = file.replace(/\.js$/, '');

  try {
    execFileSync(process.execPath, [filePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    results.push({ label, passed: true });
    console.log(`  PASS  ${label}`);
  } catch (err) {
    results.push({ label, passed: false });
    console.log(`  FAIL  ${label}`);
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.log(err.stderr.toString());
  }
}

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`);
process.exit(failed > 0 ? 1 : 0);
