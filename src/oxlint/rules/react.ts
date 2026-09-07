import type { Rules } from './core.js';

// eslint-plugin-react-hooks 7 (https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks)
// ships these as its React Compiler rules; oxlint implements them natively under react/ and enables them by
// default as warnings. off unless the project adopts the compiler (reactCompiler option).
const reactCompilerFamily = [
  'react/static-components',
  'react/use-memo',
  'react/void-use-memo',
  'react/preserve-manual-memoization',
  'react/incompatible-library',
  'react/immutability',
  'react/globals',
  'react/refs',
  'react/set-state-in-effect',
  'react/error-boundaries',
  'react/purity',
  'react/set-state-in-render',
];

export function reactRules(reactCompiler: boolean): Rules {
  return {
    // eslint-plugin-react recommended, as implemented natively by oxlint (prop-types does not exist there; it was
    // unreliable under eslint too). listed explicitly so category changes in oxlint cannot drop them.
    'react/display-name': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-comment-textnodes': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-no-undef': 'error',
    'react/no-children-prop': 'error',
    'react/no-danger-with-children': 'error',
    'react/no-direct-mutation-state': 'error',
    'react/no-find-dom-node': 'error',
    'react/no-is-mounted': 'error',
    'react/no-render-return-value': 'error',
    'react/no-string-refs': 'error',
    'react/no-unescaped-entities': 'error',
    'react/no-unknown-property': 'error',
    // formerly @stylistic/jsx-self-closing-comp and @stylistic/jsx-curly-brace-presence
    'react/self-closing-comp': 'error',
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never', propElementValues: 'always' }],
    'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    ...Object.fromEntries(reactCompilerFamily.map((rule) => [rule, reactCompiler ? 'error' : 'off'])),
    // component files are PascalCase; index and routes files are exempt (replaces check-file of v3)
    'unicorn/filename-case': ['error', { case: 'pascalCase', ignore: ['^index\\.', '^routes\\.'] }],
  };
}

// hooks and higher-order components: useThing.tsx, withAuth.tsx
export function reactHookFileRules(): Rules {
  return {
    'unicorn/filename-case': ['error', { case: 'camelCase' }],
  };
}

// allow `type Props = {}` in react components
// https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-675156492
export function reactTsxRules(): Rules {
  return {
    'typescript/no-empty-object-type': [
      'error',
      { allowInterfaces: 'with-single-extends', allowWithName: 'Props$' },
    ],
  };
}
