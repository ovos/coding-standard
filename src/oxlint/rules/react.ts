import type { Rules } from './core.js';

// eslint-plugin-react-hooks 7 (https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks)
// ships these as its React Compiler rules; oxlint implements them natively under react/ and enables them by
// default as warnings. off unless the project adopts the compiler (reactCompiler option). they apply to jsx and
// tsx files only, like every react rule here: the react plugin is enabled inside the jsx override, so oxlint's
// categories cannot turn them on for plain ts files
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

export function reactCompilerRules(reactCompiler: boolean): Rules {
  return Object.fromEntries(
    reactCompilerFamily.map((rule) => [rule, reactCompiler ? 'error' : 'off'] as const),
  );
}

// jsx and tsx files
export function reactRules(): Rules {
  return {
    // eslint-plugin-react 7.37 recommended (https://github.com/jsx-eslint/eslint-plugin-react), as implemented
    // natively by oxlint. listed explicitly: the plugin is enabled per override, where oxlint's categories do not
    // apply. not available in oxlint: no-deprecated, prop-types (unreliable with typescript anyway), and
    // jsx-uses-react / jsx-uses-vars, whose only job was to keep no-unused-vars quiet about jsx usage
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
    'react/no-unsafe': 'off',
    // projects on the automatic jsx runtime (`jsx: react-jsx`) turn this off, as they did in v3
    'react/react-in-jsx-scope': 'error',
    'react/require-render-return': 'error',
    // formerly @stylistic/jsx-self-closing-comp and @stylistic/jsx-curly-brace-presence
    'react/self-closing-comp': 'error',
    'react/jsx-curly-brace-presence': [
      'error',
      { props: 'never', children: 'never', propElementValues: 'always' },
    ],
    'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
    // oxlint's rules-of-hooks also reports hooks called from anonymous functions, which eslint-plugin-react-hooks 5
    // accepted; storybook `render: () => { useState() }` patterns need a named component function
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    // component files are PascalCase, hooks and higher-order components (use*, with*) camelCase, index and routes
    // files exempt. eslint-plugin-check-file accepts acronyms (AIConversation.tsx); unicorn/filename-case does not
    'check-file/filename-naming-convention': [
      'error',
      {
        '**/!(index|routes|use*|with*).?(m|c)[jt]sx': 'PASCAL_CASE',
        '**/(use|with)*.?(m|c)[jt]sx': 'CAMEL_CASE',
      },
      { ignoreMiddleExtensions: true },
    ],
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
