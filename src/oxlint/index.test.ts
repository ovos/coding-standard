import assert from 'node:assert/strict';
import { test } from 'node:test';

import { oxlint } from './index.js';

type Override = {
  files: string[];
  env?: Record<string, boolean>;
  rules?: Record<string, unknown>;
  jsPlugins?: { name: string }[];
};

const overrides = (config: ReturnType<typeof oxlint>) => (config.overrides ?? []) as unknown as Override[];
const overrideFor = (config: ReturnType<typeof oxlint>, glob: string) =>
  overrides(config).find((o) => o.files.includes(glob));
const pluginNames = (list: unknown) => (list as { name: string }[]).map((p) => p.name);

test('defaults: native plugins, correctness as error, four js plugins, no typeAware option', () => {
  const config = oxlint();
  assert.deepEqual(config.plugins, ['eslint', 'typescript', 'unicorn', 'oxc', 'import']);
  assert.deepEqual(config.categories, { correctness: 'error' });
  assert.deepEqual(pluginNames(config.jsPlugins), ['stylistic', 'perfectionist', 'eslint-js', 'typescript-js']);
  assert.equal(config.options, undefined, 'typeAware is root-config-only and must not be set here');
});

test('environment and globals live in overrides so extends keeps them', () => {
  const config = oxlint();
  assert.deepEqual(overrideFor(config, '**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}')?.env, { node: true });
  assert.ok(overrideFor(config, '**/*.{ts,mts,cts,tsx}')?.rules?.['typescript-js/naming-convention']);
  assert.equal(overrideFor(config, '**/*.{js,mjs,cjs,jsx}')?.rules?.['eslint-js/camelcase'], 'error');
});

test('react option adds the react plugin, browser env for jsx and file naming', () => {
  const config = oxlint({ react: true });
  assert.ok(config.plugins?.includes('react'));
  const jsx = overrideFor(config, '**/*.{jsx,tsx}');
  assert.deepEqual(jsx?.env, { browser: true });
  assert.equal(jsx?.rules?.['react-hooks/exhaustive-deps'], 'error');
  assert.deepEqual(overrideFor(config, '**/{use,with}*.{jsx,tsx}')?.rules?.['unicorn/filename-case'], [
    'error',
    { case: 'camelCase' },
  ]);
  assert.deepEqual(overrideFor(config, '**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}')?.rules?.['no-console'], [
    'error',
    { allow: ['error', 'warn', 'info'] },
  ]);
});

test('test framework options add their overrides and plugins', () => {
  const jest = oxlint({ jest: true, testsDir: 'tests' });
  const jestOverride = overrides(jest).find((o) => o.files[0] === 'tests/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}');
  assert.deepEqual(jestOverride?.env, { jest: true });
  assert.equal(jestOverride?.rules?.['jest/no-focused-tests'], 'error');
  assert.ok(jest.plugins?.includes('jest'));

  const mocha = oxlint({ mocha: true, testsDir: 'test' });
  const mochaOverride = overrides(mocha).find((o) => o.files[0] === 'test/**/*.{js,mjs,cjs,ts,mts,cts}');
  assert.deepEqual(mochaOverride?.env, { mocha: true });
  assert.deepEqual(pluginNames(mochaOverride?.jsPlugins), ['mocha']);
  assert.deepEqual(overrides(mocha).find((o) => o.files[0] === 'test/**/_*')?.rules, { 'mocha/no-exports': 'off' });

  const playwright = oxlint({ playwright: true });
  assert.ok(overrides(playwright).some((o) => o.rules?.['playwright/no-focused-test'] === 'error'));
  assert.ok(oxlint({ vitest: true }).plugins?.includes('vitest'));
});

test('a11y, reactCompiler and typeChecked toggles', () => {
  assert.ok(oxlint({ react: true, a11y: true }).plugins?.includes('jsx-a11y'));
  assert.equal(overrideFor(oxlint({ react: true }), '**/*.{jsx,tsx}')?.rules?.['react/purity'], 'off');
  assert.equal(
    overrideFor(oxlint({ react: true, reactCompiler: true }), '**/*.{jsx,tsx}')?.rules?.['react/purity'],
    'error',
  );
  const ts = '**/*.{ts,mts,cts,tsx}';
  assert.equal(overrideFor(oxlint(), ts)?.rules?.['typescript/no-floating-promises'], 'off');
  assert.equal(overrideFor(oxlint({ typeChecked: true }), ts)?.rules?.['typescript/no-floating-promises'], 'error');
});

test('config is JSON-serialisable (plain object, absolute plugin paths)', () => {
  const config = oxlint({ react: true, jest: true, mocha: true, playwright: true, vitest: true });
  assert.deepEqual(JSON.parse(JSON.stringify(config)), config);
});
