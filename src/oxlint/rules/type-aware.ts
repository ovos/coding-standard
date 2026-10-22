import { type Rules, off, on } from './core.js';

// type-aware rules run through oxlint-tsgolint (https://github.com/oxc-project/tsgolint), a dependency of this
// package, switched on by the `options.typeAware` the shared config carries into the consumer's root config (see
// index.ts). a consumer that turns the switch off gets silence from these rules, not errors, so they can be listed
// unconditionally.

// the type-aware rules of oxlint's correctness category (https://oxc.rs/docs/guide/usage/linter/rules.html), which
// the shared config sets to error for every file. overrides cannot set categories, so `typeAwareOff` switches them
// off for all files, and `typeAwareRules` switches on what this standard wants, for ts files only as in v3, and for
// js files with the `typeAwareJs` option
export const typeAwareCorrectness = [
  'typescript/await-thenable',
  'typescript/no-array-delete',
  'typescript/no-base-to-string',
  'typescript/no-duplicate-type-constituents',
  'typescript/no-floating-promises',
  'typescript/no-for-in-array',
  'typescript/no-implied-eval',
  'typescript/no-meaningless-void-operator',
  'typescript/no-misused-spread',
  'typescript/no-redundant-type-constituents',
  'typescript/no-unsafe-unary-minus',
  'typescript/no-useless-default-assignment',
  'typescript/require-array-sort-compare',
  'typescript/restrict-template-expressions',
  'typescript/unbound-method',
];

// runtime-bug catchers: typescript-eslint's recommended-type-checked minus the no-unsafe-* family (unusable while
// no-explicit-any is off) and the judgement calls (unbound-method, require-await, restrict-template-expressions).
const catchers = [
  'typescript/no-floating-promises',
  'typescript/no-misused-promises',
  'typescript/await-thenable',
  'typescript/no-base-to-string',
  'typescript/no-implied-eval',
  'typescript/no-misused-spread',
  'typescript/no-array-delete',
  'typescript/no-unsafe-unary-minus',
  'typescript/require-array-sort-compare',
  'typescript/restrict-plus-operands',
  'typescript/prefer-promise-reject-errors',
  'typescript/only-throw-error',
  'typescript/no-unsafe-enum-comparison',
  'typescript/switch-exhaustiveness-check',
  'typescript/use-unknown-in-catch-callback-variable',
  'typescript/no-unnecessary-type-assertion',
];

export const typeAwareOff: Rules = off(typeAwareCorrectness);

// the type-aware rules this standard turns on: no-for-in-array as in v3, the catchers with `typeChecked`, and the
// whole correctness set with `fullCorrectness`
export function typeAwareRules(typeChecked: boolean, fullCorrectness: boolean): Rules {
  return {
    'typescript/no-for-in-array': 'error',
    ...(typeChecked && on(catchers)),
    ...(fullCorrectness && on(typeAwareCorrectness)),
  };
}
