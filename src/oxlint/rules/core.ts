import type { DummyRuleMap } from 'oxlint';

// oxlint's rule map type: severity or [severity, ...options]
export type Rules = DummyRuleMap;
export type ConsoleUsage = 'ban' | 'ban-log' | 'allow';

// shared options for the rules that exist in a js and a ts flavour
const noUnusedExpressions: Rules['no-unused-expressions'] = [
  'error',
  { allowShortCircuit: true, allowTernary: true },
];
const noUnusedVars: Rules['no-unused-vars'] = [
  'error',
  { varsIgnorePattern: '^_', args: 'none', caughtErrors: 'none' },
];

// rules for every file. oxlint's `correctness` category (set to error by the config) covers most of
// eslint:recommended and typescript-eslint recommended; the ones it does not enable by default are listed here.
export function coreRules(consoleUsage: ConsoleUsage): Rules {
  return {
    // eslint:recommended (eslint 9) rules oxlint has but does not enable by default. eslint 10 added
    // preserve-caught-error and no-useless-assignment to recommended; they are not part of this standard yet
    'no-case-declarations': 'error',
    'no-empty': 'error',
    'no-prototype-builtins': 'error',
    'no-regex-spaces': 'error',
    'no-unexpected-multiline': 'error',
    // eslint:recommended overrides
    'no-unused-expressions': noUnusedExpressions,
    'no-unused-vars': noUnusedVars,
    // allow constant conditions in loops (e.g. `while (true)`)
    'no-constant-condition': ['error', { checkLoops: false }],
    // allow fallthrough in switch statements by adding `// fallthrough`
    'no-fallthrough': ['error', { commentPattern: 'fallthrough' }],
    // additional rules
    curly: ['error', 'multi-line'],
    eqeqeq: 'error',
    'import/no-duplicates': ['error', { preferInline: true }],
    // on by default with oxlint's import plugin but not part of v3; they need module resolution and report
    // esm/cjs interop and computed namespace access
    'import/default': 'off',
    'import/namespace': 'off',
    'no-array-constructor': 'error',
    'no-else-return': 'error',
    'no-eval': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-param-reassign': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'one-var': ['error', 'never'],
    'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
    'prefer-const': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    // in oxlint's correctness category, but `then` is also the JSON Schema keyword (if/then/else) used in model
    // schemas; the rule cannot tell the two apart
    'unicorn/no-thenable': 'off',
    ...(consoleUsage === 'ban' && { 'no-console': 'error' }),
    ...(consoleUsage === 'ban-log' && {
      'no-console': ['error', { allow: ['error', 'warn', 'info'] }],
    }),
  };
}

// typescript files: typescript-eslint recommended rules oxlint does not enable by default, and our overrides
export function tsRules(): Rules {
  return {
    'typescript/no-namespace': 'error',
    'typescript/no-unnecessary-type-constraint': 'error',
    'typescript/no-unsafe-function-type': 'error',
    // not all old files are strict yet; `any` and ts comments stay allowed, as in v3
    'typescript/no-explicit-any': 'off',
    'typescript/ban-ts-comment': 'off',
    // dynamic sync `require()` is still in use
    'typescript/no-require-imports': 'off',
    // allow `interface I extends Base<Param> {}`
    'typescript/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
    'typescript/ban-tslint-comment': 'error',
  };
}

// javascript files: camelcase via ESLint's own rule (oxlint has none); ts files get naming-convention instead
export function jsRules(): Rules {
  return {
    'eslint-js/camelcase': 'error',
    // v3 had `radix: ['error', 'as-needed']` here: a redundant radix 10 was an error, a missing radix was not.
    // ESLint 10 deprecated both options and made every call without a radix an error, because 10 was never the
    // default radix (https://github.com/eslint/eslint/issues/19916,
    // https://eslint.org/docs/latest/use/migrate-to-10.0.0#deprecated-options-of-the-radix-rule); oxlint's native rule
    // followed in v1.49.0 (https://oxc.rs/docs/guide/usage/linter/rules/eslint/radix.html). the opposite of the
    // v3 rule is not this standard's call to make, so radix is not configured; consumers who want it add
    // `radix: 'error'`
  };
}
