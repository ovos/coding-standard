// Regenerates test/parity/v3-rules.json: the rule sets v3 resolved for representative files, per option
// combination, straight from ESLint's `--print-config`. Installs v3 with its ESLint 9 tree into a temp dir.
//
//   node scripts/generate-v3-baseline.mjs
//
// The baseline is frozen on purpose: it is the contract the parity test (src/parity.test.ts) checks v4 against.
// Rerun it only to record what a different v3 dependency resolution enforced.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(packageRoot, 'test', 'parity', 'v3-rules.json');

const scenarios = {
  base: { options: {}, paths: ['src/a.ts', 'src/a.js'] },
  'console-ban': { options: { console: 'ban' }, paths: ['src/a.ts'] },
  react: { options: { react: true }, paths: ['src/A.tsx', 'src/A.jsx', 'src/useX.tsx'] },
  jest: { options: { jest: true }, paths: ['spec/a.spec.ts', 'spec/_helper.ts'] },
  vitest: { options: { vitest: true }, paths: ['spec/a.spec.ts'] },
  mocha: { options: { mocha: true }, paths: ['spec/a.spec.ts', 'spec/_helper.ts'] },
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-standard-v3-'));
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: dir, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
};

fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'v3-baseline', private: true }));
run('npm', ['i', '--no-audit', '--no-fund', '@ovos-media/coding-standard@3.0.1', 'eslint@9', 'typescript@5.9.3']);

const version = (name) => JSON.parse(fs.readFileSync(path.join(dir, 'node_modules', name, 'package.json'), 'utf8')).version;
const severity = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return { 0: 'off', 1: 'warn', 2: 'error' }[raw] ?? raw;
};

const configs = {};
for (const [name, { options, paths }] of Object.entries(scenarios)) {
  fs.writeFileSync(
    path.join(dir, 'eslint.config.js'),
    `const eslint = require('@ovos-media/coding-standard/eslint');\nmodule.exports = eslint(${JSON.stringify(options)});\n`,
  );
  for (const file of paths) {
    const config = JSON.parse(run('npx', ['eslint', '--print-config', file]));
    const rules = {};
    for (const [rule, value] of Object.entries(config.rules).sort(([a], [b]) => a.localeCompare(b))) {
      const ruleOptions = Array.isArray(value) ? value.slice(1) : [];
      rules[rule] = { severity: severity(value), ...(ruleOptions.length && { options: ruleOptions }) };
    }
    configs[`${name}:${file}`] = rules;
  }
}

const meta = {
  generatedWith: Object.fromEntries(
    [
      '@ovos-media/coding-standard',
      'eslint',
      '@typescript-eslint/eslint-plugin',
      '@stylistic/eslint-plugin',
      'eslint-plugin-react',
      'eslint-plugin-react-hooks',
      'eslint-plugin-jest',
      '@vitest/eslint-plugin',
      'eslint-plugin-mocha',
      'eslint-plugin-perfectionist',
      'eslint-plugin-check-file',
    ].map((name) => [name, version(name)]),
  ),
  scenarios: Object.fromEntries(Object.entries(scenarios).map(([name, { options }]) => [name, options])),
};
fs.writeFileSync(target, `${JSON.stringify({ meta, configs }, null, 2)}\n`);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`wrote ${path.relative(packageRoot, target)} from`, meta.generatedWith);
