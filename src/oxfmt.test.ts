import assert from 'node:assert/strict';
import { test } from 'node:test';

import { oxfmt } from './oxfmt.js';

test('oxfmt defaults match the standard', () => {
  const config = oxfmt();
  assert.equal(config.printWidth, 100);
  assert.equal(config.singleQuote, true);
  assert.equal(config.trailingComma, 'all');
  assert.equal(config.tabWidth, 2);
  assert.equal(config.useTabs, false);
  assert.equal('sortPackageJson' in config, false, 'oxfmt default (on) is inherited, not set');
  assert.deepEqual(config.sortImports, {
    groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index'], 'unknown'],
    internalPattern: ['~'],
    ignoreCase: true,
    newlinesBetween: true,
  });
});

test('oxfmt indent option maps to tabs and width', () => {
  assert.equal(oxfmt({ indent: 'tab' }).useTabs, true);
  assert.equal(oxfmt({ indent: 4 }).tabWidth, 4);
});
