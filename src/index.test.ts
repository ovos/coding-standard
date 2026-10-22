import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as api from './index.js';

test('package exports the three factories', () => {
  assert.equal(typeof api.oxlint, 'function');
  assert.equal(typeof api.oxfmt, 'function');
  assert.equal(typeof api.prettier, 'object');
});
