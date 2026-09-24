import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import picomatch from 'picomatch';

import { type OxlintOptions, oxlint } from './oxlint/index.js';
import { materialize, packageRoot, runOxlintCli } from './smoke-helpers.js';

/*
 * Parity with v3, machine-checked.
 *
 * test/parity/v3-rules.json holds the rule sets v3 resolved for representative files per option combination,
 * generated once from ESLint's `--print-config` (scripts/generate-v3-baseline.mjs). For every rule v3 enforced
 * as an error, v4 must enforce it too, under its oxlint name, or the rule must be listed in
 * test/parity/dropped.json with a reason.
 *
 * test/parity/v4/<scenario>.json snapshots what v4 resolves for the same files: the explicit rules of the
 * shared config plus everything oxlint's `correctness` category adds (read from `oxlint --print-config`, so an
 * oxlint upgrade that moves a rule in or out of the category shows up as a diff). Update with
 * `npm run parity:update` and review the diff.
 */

type Severity = 'error' | 'warn' | 'off';
type RuleEntry = { severity: Severity; options?: unknown[] };
type RuleSet = Record<string, RuleEntry>;
type Baseline = { meta: { scenarios: Record<string, OxlintOptions> }; configs: Record<string, RuleSet> };

const parityDir = path.join(packageRoot, 'test', 'parity');
const baseline = JSON.parse(fs.readFileSync(path.join(parityDir, 'v3-rules.json'), 'utf8')) as Baseline;
const dropped = JSON.parse(fs.readFileSync(path.join(parityDir, 'dropped.json'), 'utf8')) as Record<
  string,
  string
>;

// v3 rule name to the v4 names that may carry it; the first one enforced satisfies the check
const renamed: Record<string, string[]> = {
  '@typescript-eslint/naming-convention': ['typescript-js/naming-convention'],
  '@stylistic/func-call-spacing': ['stylistic/function-call-spacing'],
  '@stylistic/jsx-self-closing-comp': ['react/self-closing-comp'],
  '@stylistic/jsx-curly-brace-presence': ['react/jsx-curly-brace-presence'],
  camelcase: ['eslint-js/camelcase'],
  // eslint-plugin-mocha 10 to 12
  'mocha/no-async-describe': ['mocha/no-async-suite'],
  'mocha/no-global-tests': ['mocha/no-top-level-tests'],
  'mocha/no-setup-in-describe': ['mocha/no-setup-in-suite'],
  'mocha/no-skipped-tests': ['mocha/no-pending-tests'],
  'mocha/no-empty-description': ['mocha/no-empty-title'],
  'mocha/no-hooks-for-single-case': ['mocha/no-hooks-for-single-child'],
  'mocha/no-return-and-callback': ['mocha/no-return-and-done'],
  'mocha/no-sibling-hooks': ['mocha/consistent-structure'],
  'mocha/no-top-level-hooks': ['mocha/no-root-hooks'],
  'mocha/valid-suite-description': ['mocha/valid-suite-title'],
  'mocha/valid-test-description': ['mocha/valid-test-title'],
};

function candidates(v3Rule: string): string[] {
  if (renamed[v3Rule]) return renamed[v3Rule];
  // oxlint keeps the TypeScript-aware flavour of core rules under the core name (no-unused-vars, ...)
  if (v3Rule.startsWith('@typescript-eslint/')) {
    const bare = v3Rule.slice('@typescript-eslint/'.length);
    return [`typescript/${bare}`, bare];
  }
  if (v3Rule.startsWith('@stylistic/')) return [`stylistic/${v3Rule.slice('@stylistic/'.length)}`];
  if (v3Rule.includes('/')) return [v3Rule];
  return [v3Rule, `eslint-js/${v3Rule}`];
}

const severityOf = (value: unknown): Severity => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'deny' || raw === 'error' || raw === 2) return 'error';
  if (raw === 'warn' || raw === 1) return 'warn';
  return 'off';
};
const entryOf = (value: unknown): RuleEntry => {
  const options = Array.isArray(value) ? value.slice(1) : [];
  return options.length ? { severity: severityOf(value), options } : { severity: severityOf(value) };
};

// the rules oxlint resolves at the top level for the shared config: explicit ones plus the correctness category
const printedTopLevel = new Map<string, Record<string, unknown>>();
function printConfig(scenario: string, options: OxlintOptions): Record<string, unknown> {
  const cached = printedTopLevel.get(scenario);
  if (cached) return cached;
  const dir = materialize('base', { options });
  try {
    const { stdout, stderr } = runOxlintCli(dir, ['--print-config']);
    if (!stdout.trim().startsWith('{')) throw new Error(`oxlint --print-config failed:\n${stdout}\n${stderr}`);
    const rules = (JSON.parse(stdout) as { rules: Record<string, unknown> }).rules;
    printedTopLevel.set(scenario, rules);
    return rules;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// what v4 enforces for one file: category rules, then the shared config's top-level rules, then its overrides
// in order, the way oxlint layers them
function v4RulesFor(scenario: string, options: OxlintOptions, file: string): RuleSet {
  const config = oxlint(options);
  const effective: RuleSet = {};
  for (const [rule, value] of Object.entries(printConfig(scenario, options))) effective[rule] = entryOf(value);
  for (const [rule, value] of Object.entries(config.rules ?? {})) effective[rule] = entryOf(value);
  for (const override of config.overrides ?? []) {
    const files = override.files as string[];
    if (!files.some((glob) => picomatch.isMatch(file, glob))) continue;
    for (const [rule, value] of Object.entries(override.rules ?? {})) effective[rule] = entryOf(value);
  }
  return Object.fromEntries(Object.entries(effective).sort(([a], [b]) => a.localeCompare(b)));
}

const scenarioFiles = new Map<string, string[]>();
for (const key of Object.keys(baseline.configs)) {
  const [scenario, file] = key.split(':') as [string, string];
  scenarioFiles.set(scenario, [...(scenarioFiles.get(scenario) ?? []), file]);
}

test('every rule v3 enforced is enforced by v4 or listed in dropped.json', () => {
  const missing: string[] = [];
  for (const [scenario, files] of scenarioFiles) {
    const options = baseline.meta.scenarios[scenario];
    for (const file of files) {
      const v3 = baseline.configs[`${scenario}:${file}`];
      const v4 = v4RulesFor(scenario, options, file);
      for (const [rule, entry] of Object.entries(v3)) {
        if (entry.severity !== 'error' || rule in dropped) continue;
        const names = candidates(rule);
        if (names.some((name) => v4[name]?.severity === 'error')) continue;
        missing.push(`${scenario} ${file}: ${rule} (looked for ${names.join(', ')})`);
      }
    }
  }
  assert.deepEqual(missing, [], `v3 rules without a v4 counterpart:\n  ${missing.join('\n  ')}`);
});

test('dropped.json lists only rules v3 actually enforced', () => {
  const enforced = new Set<string>();
  for (const rules of Object.values(baseline.configs)) {
    for (const [rule, entry] of Object.entries(rules)) if (entry.severity === 'error') enforced.add(rule);
  }
  const stale = Object.keys(dropped).filter((rule) => rule !== '_comment' && !enforced.has(rule));
  assert.deepEqual(stale, [], `entries in dropped.json that v3 did not enforce: ${stale.join(', ')}`);
});

test('v4 resolved rule sets match the committed snapshots', () => {
  const snapshotDir = path.join(parityDir, 'v4');
  fs.mkdirSync(snapshotDir, { recursive: true });
  const differences: string[] = [];
  for (const [scenario, files] of scenarioFiles) {
    const options = baseline.meta.scenarios[scenario];
    const resolved = Object.fromEntries(files.map((file) => [file, v4RulesFor(scenario, options, file)]));
    const snapshotPath = path.join(snapshotDir, `${scenario}.json`);
    const serialized = `${JSON.stringify({ options, files: resolved }, null, 2)}\n`;
    if (process.env.UPDATE_SNAPSHOTS) {
      fs.writeFileSync(snapshotPath, serialized);
      continue;
    }
    const current = fs.existsSync(snapshotPath) ? fs.readFileSync(snapshotPath, 'utf8') : '';
    if (current !== serialized) differences.push(path.relative(packageRoot, snapshotPath));
  }
  assert.deepEqual(
    differences,
    [],
    `resolved rules changed for ${differences.join(', ')}; run \`npm run parity:update\` and review the diff`,
  );
});
