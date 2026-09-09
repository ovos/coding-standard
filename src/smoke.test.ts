import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runOxlint } from './smoke-helpers.js';

const list = (found: Set<string>) => [...found].sort().join('\n  ');
const has = (found: Set<string>, entry: string) =>
  assert.ok(found.has(entry), `expected ${entry} in:\n  ${list(found)}`);
const lacks = (found: Set<string>, entry: string) => assert.ok(!found.has(entry), `unexpected ${entry}`);
const cleanFile = (found: Set<string>, file: string) =>
  assert.ok(
    ![...found].some((e) => e.startsWith(`${file}:`)),
    `expected no findings in ${file}:\n  ${list(found)}`,
  );

// every run goes through a consumer-style oxlint.config.ts with `extends: [oxlint(options)]`, see smoke-helpers

test('base config: naming, camelcase, stylistic, perfectionist and the type-aware rule fire; clean file is clean', () => {
  const found = runOxlint('base');
  // type-aware through tsgolint, on by default, found by oxlint without any flag or variable from outside
  has(found, 'src/forIn.ts:typescript/no-for-in-array');
  has(found, 'src/naming.ts:typescript-js/naming-convention');
  has(found, 'src/legacy.js:eslint-js/camelcase');
  has(found, 'src/style.ts:stylistic/quotes');
  has(found, 'src/style.ts:stylistic/generator-star-spacing');
  has(found, 'src/sorting.ts:perfectionist/sort-named-imports');
  has(found, 'src/sorting.ts:perfectionist/sort-named-exports');
  // radix is not part of the standard any more (see rules/core.ts); neither flavour of it may fire
  lacks(found, 'src/legacy.js:radix');
  lacks(found, 'src/legacy.js:eslint-js/radix');
  cleanFile(found, 'src/clean.ts');
});

test('react config: file naming, hooks and jsx quotes; react rules stay out of plain ts files', () => {
  const found = runOxlint('react', { options: { react: true } });
  has(found, 'src/badName.tsx:check-file/filename-naming-convention');
  lacks(found, 'src/useThing.tsx:check-file/filename-naming-convention');
  cleanFile(found, 'src/AIThing.tsx');
  has(found, 'src/useThing.tsx:react-hooks/exhaustive-deps');
  has(found, 'src/Card.tsx:stylistic/jsx-quotes');
  cleanFile(found, 'src/hook.ts');
});

test('test frameworks: focused tests are errors, helper files are exempt, plugins are scoped to test files', () => {
  const frameworks = [
    ['jest', 'jest/no-focused-tests'],
    ['vitest', 'vitest/no-focused-tests'],
    ['mocha', 'mocha/no-exclusive-tests'],
    ['playwright', 'playwright/no-focused-test'],
  ] as const;
  for (const [option, rule] of frameworks) {
    const found = runOxlint('tests', { options: { [option]: true, testsDir: 'spec' } });
    has(found, `spec/focused.spec.ts:${rule}`);
    lacks(found, 'spec/_helper.ts:mocha/no-exports');
    cleanFile(found, 'src/helper.ts');
  }
});

test('vitest keeps the recommended expect rules v3 enforced; jest keeps the v3 relaxations', () => {
  const vitest = runOxlint('tests', { options: { vitest: true, testsDir: 'spec' } });
  has(vitest, 'spec/standalone.spec.ts:vitest/no-standalone-expect');
  has(vitest, 'spec/standalone.spec.ts:vitest/expect-expect');
  const jest = runOxlint('tests', { options: { jest: true, testsDir: 'spec' } });
  has(jest, 'spec/standalone.spec.ts:jest/no-standalone-expect');
  lacks(jest, 'spec/standalone.spec.ts:jest/expect-expect');
});

test('consumer additions through extends: env and globals, categories, overrides and ignores', () => {
  const options = { react: true, jest: true, testsDir: 'spec' } as const;
  const base = runOxlint('consumer', { options, consumer: { rules: { 'no-undef': 'error' } } });
  has(base, 'src/Comp.tsx:react-hooks/exhaustive-deps');
  // env node from the shared config's overrides survives extends; jest globals reach test files only
  cleanFile(base, 'src/env.ts');
  cleanFile(base, 'spec/env.spec.ts');
  has(base, 'src/notTest.ts:no-undef');
  // the correctness category is inherited
  has(base, 'src/compare.ts:oxc/const-comparisons');
  has(base, 'src/ignored/x.ts:stylistic/quotes');

  // a react rule set by the shared config is changed by an override that lists the plugin ...
  const override = { files: ['**/*.{jsx,tsx}'], rules: { 'react-hooks/exhaustive-deps': 'off' } };
  const scoped = runOxlint('consumer', {
    options,
    consumer: { overrides: [{ ...override, plugins: ['react'] }] },
  });
  lacks(scoped, 'src/Comp.tsx:react-hooks/exhaustive-deps');
  // ... and by nothing else: these two are the documented traps
  const withoutPlugin = runOxlint('consumer', { options, consumer: { overrides: [override] } });
  has(withoutPlugin, 'src/Comp.tsx:react-hooks/exhaustive-deps');
  const topLevel = runOxlint('consumer', {
    options,
    consumer: { rules: { 'react-hooks/exhaustive-deps': 'off' } },
  });
  has(topLevel, 'src/Comp.tsx:react-hooks/exhaustive-deps');

  const ignored = runOxlint('consumer', { options, consumer: { ignorePatterns: ['src/ignored'] } });
  cleanFile(ignored, 'src/ignored/x.ts');
});

test('monorepo: root and package configs both extend the shared config, one plugin copy', () => {
  const found = runOxlint('monorepo', { nestedConfigs: true });
  has(found, 'src/root.ts:stylistic/quotes');
  // the root config has no react option, the package config has
  cleanFile(found, 'src/Root.tsx');
  has(found, 'packages/app/src/App.tsx:react-hooks/exhaustive-deps');
  has(found, 'packages/app/src/forIn.ts:typescript/no-for-in-array');
});
