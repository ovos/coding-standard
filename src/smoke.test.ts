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
  // radix is not part of the standard any more (see rules/core.ts); neither flavour of it may fire
  lacks(found, 'src/legacy.js:radix');
  lacks(found, 'src/legacy.js:eslint-js/radix');
  cleanFile(found, 'src/clean.ts');
});

test('react config: file naming, hooks and jsx quotes; react rules stay out of plain ts files', () => {
  const found = runOxlint('react', oxlint({ react: true }));
  has(found, 'src/badName.tsx:check-file/filename-naming-convention');
  lacks(found, 'src/useThing.tsx:check-file/filename-naming-convention');
  cleanFile(found, 'src/AIThing.tsx');
  has(found, 'src/useThing.tsx:react-hooks/exhaustive-deps');
  has(found, 'src/Card.tsx:stylistic/jsx-quotes');
  cleanFile(found, 'src/hook.ts');
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
    // test framework plugins are scoped to test files
    cleanFile(found, 'src/helper.ts');
  }
});
