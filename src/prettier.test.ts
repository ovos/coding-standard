import assert from 'node:assert/strict';
import { test } from 'node:test';

import { prettier } from './prettier.js';

test('prettier export is the shared base only', () => {
  assert.deepEqual(prettier, {
    printWidth: 100,
    singleQuote: true,
    trailingComma: 'all',
    tabWidth: 2,
    useTabs: false,
  });
});
