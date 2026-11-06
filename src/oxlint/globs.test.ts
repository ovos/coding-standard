import assert from 'node:assert/strict';
import { test } from 'node:test';

import { globs, scriptExtensions, testGlobs, testHelperGlobs } from './globs.js';

test('globs cover every js and ts extension in brace form', () => {
  assert.equal(globs.all, '**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}');
  assert.equal(globs.js, '**/*.{js,mjs,cjs,jsx}');
  assert.equal(globs.ts, '**/*.{ts,mts,cts,tsx}');
  assert.equal(globs.jsx, '**/*.{jsx,tsx}');
  assert.equal(globs.hooks, '**/{use,with}*.{jsx,tsx}');
});

test('test globs follow testsDir, __tests__ and spec/test suffixes', () => {
  assert.deepEqual(testGlobs('{spec,test,tests}'), [
    '{spec,test,tests}/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}',
    '**/__tests__/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}',
    '**/*.{spec,test}.{js,mjs,cjs,jsx,ts,mts,cts,tsx}',
  ]);
  assert.deepEqual(testGlobs('src', scriptExtensions), [
    'src/**/*.{js,mjs,cjs,ts,mts,cts}',
    '**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts}',
    '**/*.{spec,test}.{js,mjs,cjs,ts,mts,cts}',
  ]);
  assert.deepEqual(testHelperGlobs('test'), ['test/**/_*', 'test/**/*.skip.*']);
});
