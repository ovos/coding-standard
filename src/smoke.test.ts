import assert from 'node:assert/strict';
import { test } from 'node:test';

import { oxlint } from './oxlint/index.js';
import { runOxlint } from './smoke-helpers.js';

const list = (found: Set<string>) => [...found].sort().join('\n  ');
const has = (found: Set<string>, entry: string) => assert.ok(found.has(entry), `expected ${entry} in:\n  ${list(found)}`);
const lacks = (found: Set<string>, entry: string) => assert.ok(!found.has(entry), `unexpected ${entry}`);
const cleanFile = (found: Set<string>, file: string) =>
  assert.ok(![...found].some((e) => e.startsWith(`${file}:`)), `expected no findings in ${file}:\n  ${list(found)}`);

test('base config: naming, camelcase, stylistic and perfectionist fire; clean file is clean', () => {
  const found = runOxlint('base', oxlint());
  has(found, 'src/naming.ts:typescript-js/naming-convention');
  has(found, 'src/legacy.js:eslint-js/camelcase');
  has(found, 'src/style.ts:stylistic/quotes');
  has(found, 'src/style.ts:stylistic/generator-star-spacing');
  has(found, 'src/sorting.ts:perfectionist/sort-named-imports');
  has(found, 'src/sorting.ts:perfectionist/sort-named-exports');
  cleanFile(found, 'src/clean.ts');
});

test('react config: file naming, hooks and jsx quotes', () => {
  const found = runOxlint('react', oxlint({ react: true }));
  has(found, 'src/badName.tsx:unicorn/filename-case');
  lacks(found, 'src/useThing.tsx:unicorn/filename-case');
  has(found, 'src/useThing.tsx:react-hooks/exhaustive-deps');
  has(found, 'src/Card.tsx:stylistic/jsx-quotes');
});

test('test frameworks: focused tests are errors, helper files are exempt from no-exports', () => {
  const frameworks = [
    ['jest', 'jest/no-focused-tests'],
    ['vitest', 'vitest/no-focused-tests'],
    ['mocha', 'mocha/no-exclusive-tests'],
    ['playwright', 'playwright/no-focused-test'],
  ] as const;
  for (const [option, rule] of frameworks) {
    const found = runOxlint('tests', oxlint({ [option]: true, testsDir: 'spec' }));
    has(found, `spec/focused.spec.ts:${rule}`);
    lacks(found, 'spec/_helper.ts:mocha/no-exports');
  }
});
