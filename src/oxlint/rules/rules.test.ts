import assert from 'node:assert/strict';
import { test } from 'node:test';

import { coreRules, correctnessExtras, jsRules, tsRules } from './core.js';
import { fileNamingRules, reactCompilerRules, reactRules } from './react.js';
import { stylisticJsxRules, stylisticRules } from './stylistic.js';
import { jestRules, mochaRules, playwrightRules, vitestRules } from './tests.js';
import { typeAwareCorrectness, typeAwareOff, typeAwareRules } from './type-aware.js';

const severities = (rules: Record<string, unknown>) =>
  Object.values(rules).map((value) => (Array.isArray(value) ? value[0] : value));

test('no rule is configured at warn', () => {
  const all = [
    coreRules('ban-log'),
    tsRules(),
    jsRules(),
    stylisticRules(2),
    stylisticJsxRules(2),
    reactRules(),
    reactCompilerRules(true),
    typeAwareOff,
    typeAwareRules(true, true),
    jestRules(),
    vitestRules(),
    mochaRules(),
    playwrightRules(),
  ];
  for (const rules of all) assert.ok(!severities(rules).includes('warn'));
});

test('console option maps to no-console', () => {
  assert.equal(coreRules('allow')['no-console'], undefined);
  assert.deepEqual(coreRules('ban-log')['no-console'], [
    'error',
    { allow: ['error', 'warn', 'info'] },
  ]);
  assert.equal(coreRules('ban')['no-console'], 'error');
});

test('stylistic indent option flows into the indent rules', () => {
  assert.deepEqual((stylisticRules('tab')['stylistic/indent'] as unknown[]).slice(0, 2), [
    'error',
    'tab',
  ]);
  assert.deepEqual(stylisticJsxRules(4)['stylistic/jsx-indent-props'], ['error', 4]);
  // v5 rule name (v6 keeps it); jsx-props-no-multi-spaces is not configured (see stylistic.ts)
  assert.equal(stylisticRules(2)['stylistic/function-call-spacing'], 'error');
  assert.equal(stylisticJsxRules(2)['stylistic/jsx-props-no-multi-spaces'], undefined);
});

test('react compiler family is off by default and on by option', () => {
  assert.equal(reactCompilerRules(false)['react/set-state-in-effect'], 'off');
  assert.equal(reactCompilerRules(true)['react/set-state-in-effect'], 'error');
  assert.equal(reactRules()['react/set-state-in-effect'], undefined);
});

test('component file naming uses check-file, which accepts acronyms', () => {
  const rule = fileNamingRules()['check-file/filename-naming-convention'] as unknown[];
  assert.equal(rule[0], 'error');
  assert.deepEqual(Object.values(rule[1] as Record<string, string>), ['PASCAL_CASE', 'CAMEL_CASE']);
});

test('typeAwareOff switches off exactly the type-aware rules of the correctness category', () => {
  assert.deepEqual(Object.keys(typeAwareOff).sort(), [...typeAwareCorrectness].sort());
  assert.ok(severities(typeAwareOff).every((severity) => severity === 'off'));
});

test('typeAwareRules only adds: no-for-in-array, the catchers with typeChecked, everything with fullCorrectness', () => {
  for (const [typeChecked, full] of [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ] as const) {
    assert.ok(
      severities(typeAwareRules(typeChecked, full)).every((severity) => severity === 'error'),
    );
  }
  assert.deepEqual(Object.keys(typeAwareRules(false, false)), ['typescript/no-for-in-array']);
  const checked = typeAwareRules(true, false);
  assert.equal(checked['typescript/no-floating-promises'], 'error');
  assert.equal(checked['typescript/no-misused-promises'], 'error');
  // a judgement call, only in the full set
  assert.equal(checked['typescript/unbound-method'], undefined);
  const full = typeAwareRules(false, true);
  for (const rule of typeAwareCorrectness) assert.equal(full[rule], 'error', rule);
  // not in the correctness category, so not part of fullCorrectness
  assert.equal(full['typescript/no-misused-promises'], undefined);
});

test('import/namespace checks named access and allows computed access', () => {
  assert.deepEqual(coreRules('allow')['import/namespace'], ['error', { allowComputed: true }]);
});

test('the correctness rules this standard leaves out are off by default', () => {
  for (const rule of correctnessExtras.all) assert.equal(coreRules('allow')[rule], 'off', rule);
  for (const rule of correctnessExtras.ts) assert.equal(tsRules()[rule], 'off', rule);
});
