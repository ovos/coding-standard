import type { Rules } from './core.js';

// type-aware rules run only when the project's ROOT oxlint config sets `options: { typeAware: true }` and
// oxlint-tsgolint (https://github.com/oxc-project/tsgolint) is installed. without that they are silent, so they can
// be listed unconditionally.
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

// the rest of oxlint's default-on type-aware set; explicitly off so `correctness: 'error'` cannot enable them
const defaultOnElsewhere = [
  'typescript/no-duplicate-type-constituents',
  'typescript/no-meaningless-void-operator',
  'typescript/no-redundant-type-constituents',
  'typescript/no-unnecessary-parameter-property-assignment',
  'typescript/no-useless-default-assignment',
  'typescript/no-useless-empty-export',
  'typescript/restrict-template-expressions',
  'typescript/unbound-method',
];

export function typeAwareRules(typeChecked: boolean): Rules {
  return {
    'typescript/no-for-in-array': 'error',
    ...Object.fromEntries(catchers.map((rule) => [rule, typeChecked ? 'error' : 'off'] as const)),
    ...Object.fromEntries(defaultOnElsewhere.map((rule) => [rule, 'off'] as const)),
  };
}
