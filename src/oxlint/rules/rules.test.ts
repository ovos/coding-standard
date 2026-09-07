import assert from 'node:assert/strict';
import { test } from 'node:test';

import { coreRules, jsRules, tsRules } from './core.js';
import { reactRules } from './react.js';
import { stylisticJsxRules, stylisticRules } from './stylistic.js';
import { jestRules, mochaRules, playwrightRules, vitestRules } from './tests.js';
import { typeAwareRules } from './type-aware.js';

const severities = (rules: Record<string, unknown>) =>
  Object.values(rules).map((value) => (Array.isArray(value) ? value[0] : value));

test('no rule is configured at warn', () => {
  const all = [
    coreRules('ban-log'),
    tsRules(),
    jsRules(),
    stylisticRules(2),
    stylisticJsxRules(2),
    reactRules(true),
    typeAwareRules(true),
    jestRules(),
    vitestRules(),
    mochaRules(),
    playwrightRules(),
  ];
  for (const rules of all) assert.ok(!severities(rules).includes('warn'));
});

test('console option maps to no-console', () => {
  assert.equal(coreRules('allow')['no-console'], undefined);
  assert.deepEqual(coreRules('ban-log')['no-console'], ['error', { allow: ['error', 'warn', 'info'] }]);
  assert.equal(coreRules('ban')['no-console'], 'error');
});

test('stylistic indent option flows into the indent rules', () => {
  assert.deepEqual((stylisticRules('tab')['stylistic/indent'] as unknown[]).slice(0, 2), ['error', 'tab']);
  assert.deepEqual(stylisticJsxRules(4)['stylistic/jsx-indent-props'], ['error', 4]);
  assert.equal('stylistic/func-call-spacing' in stylisticRules(2), false, 'renamed in stylistic v6');
  assert.equal('stylistic/jsx-props-no-multi-spaces' in stylisticJsxRules(2), false, 'removed in stylistic v6');
});

test('react compiler family is off by default and on by option', () => {
  assert.equal(reactRules(false)['react/set-state-in-effect'], 'off');
  assert.equal(reactRules(true)['react/set-state-in-effect'], 'error');
});

test('type-aware tier keeps no-for-in-array on and everything else explicit', () => {
  const off = typeAwareRules(false);
  assert.equal(off['typescript/no-for-in-array'], 'error');
  assert.equal(off['typescript/no-floating-promises'], 'off');
  assert.equal(off['typescript/unbound-method'], 'off');
  const on = typeAwareRules(true);
  assert.equal(on['typescript/no-floating-promises'], 'error');
  assert.equal(on['typescript/no-misused-promises'], 'error');
  assert.equal(on['typescript/unbound-method'], 'off');
});
