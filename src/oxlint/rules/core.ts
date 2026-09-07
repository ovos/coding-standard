export type Rules = Record<string, unknown>;
export type ConsoleUsage = 'ban' | 'ban-log' | 'allow';

// shared options for the rules that exist in a js and a ts flavour
const noUnusedExpressions = ['error', { allowShortCircuit: true, allowTernary: true }];
const noUnusedVars = ['error', { varsIgnorePattern: '^_', args: 'none', caughtErrors: 'none' }];

// rules for every file. oxlint's `correctness` category (set to error by the config) covers most of
// eslint:recommended and typescript-eslint recommended; the ones it does not enable by default are listed here.
export function coreRules(consoleUsage: ConsoleUsage): Rules {
  return {
    // eslint:recommended rules oxlint has but does not enable by default
    'no-case-declarations': 'error',
    'no-empty': 'error',
    'no-prototype-builtins': 'error',
    'no-regex-spaces': 'error',
    'no-unexpected-multiline': 'error',
    'preserve-caught-error': 'error',
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
    radix: ['error', 'as-needed'],
    ...(consoleUsage === 'ban' && { 'no-console': 'error' }),
    ...(consoleUsage === 'ban-log' && { 'no-console': ['error', { allow: ['error', 'warn', 'info'] }] }),
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
  };
}
