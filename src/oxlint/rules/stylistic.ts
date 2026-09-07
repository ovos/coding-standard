import type { Rules } from './core.js';

type Indent = number | 'tab';

// the @stylistic rules of v3, unchanged except: func-call-spacing renamed (stylistic v6), jsx-props-no-multi-spaces
// removed (folded into no-multi-spaces), generator and yield star spacing switched to `after` so that on-demand
// oxfmt or prettier output (`function* f`) never violates lint. jsx-self-closing-comp and jsx-curly-brace-presence
// moved to oxlint's native react rules (see react.ts).
export function stylisticRules(indent: Indent): Rules {
  return {
    'stylistic/array-bracket-spacing': ['error', 'never'],
    'stylistic/block-spacing': 'error',
    'stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'stylistic/comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        // only-multiline accepts both the es5 and the `all` trailing comma style of formatters
        functions: 'only-multiline',
        enums: 'always-multiline',
        generics: 'only-multiline',
        tuples: 'only-multiline',
      },
    ],
    'stylistic/comma-spacing': 'error',
    'stylistic/computed-property-spacing': ['error', 'never'],
    'stylistic/eol-last': 'error',
    'stylistic/function-call-spacing': 'error',
    'stylistic/generator-star-spacing': ['error', 'after'],
    'stylistic/indent': [
      'error',
      indent,
      {
        SwitchCase: 1,
        // only when indent is 2, broken otherwise: https://github.com/eslint-stylistic/eslint-stylistic/issues/514
        offsetTernaryExpressions: indent === 2,
        ignoredNodes: [
          // list from https://github.com/eslint-stylistic/eslint-stylistic/blob/main/packages/eslint-plugin/configs/customize.ts
          // which disables indent checks for cases the rule does not handle properly
          'TSUnionType',
          'TSIntersectionType',
          'TSTypeParameterInstantiation',
          'FunctionExpression > .params[decorators.length > 0]',
          'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
          // more exclusions needed for prettier-style output
          'TSInterfaceHeritage',
          '.superTypeArguments',
          'CallExpression > .typeArguments',
          'ConditionalExpression *',
          'ArrowFunctionExpression',
          'TemplateLiteral *',
        ],
      },
    ],
    'stylistic/key-spacing': 'error',
    'stylistic/keyword-spacing': 'error',
    'stylistic/max-len': [
      'error',
      120,
      {
        ignoreComments: true,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreUrls: true,
      },
    ],
    'stylistic/member-delimiter-style': 'error',
    'stylistic/no-extra-semi': 'error',
    'stylistic/no-mixed-spaces-and-tabs': 'error',
    'stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
    'stylistic/no-trailing-spaces': 'error',
    'stylistic/no-whitespace-before-property': 'error',
    'stylistic/object-curly-spacing': ['error', 'always'],
    'stylistic/quote-props': ['error', 'as-needed'],
    'stylistic/quotes': ['error', 'single', { allowTemplateLiterals: 'avoidEscape', avoidEscape: true }],
    'stylistic/rest-spread-spacing': ['error', 'never'],
    'stylistic/semi': 'error',
    'stylistic/semi-spacing': 'error',
    'stylistic/space-before-blocks': 'error',
    'stylistic/space-before-function-paren': [
      'error',
      { anonymous: 'always', named: 'never', asyncArrow: 'always' },
    ],
    'stylistic/space-in-parens': 'error',
    'stylistic/space-infix-ops': 'error',
    'stylistic/spaced-comment': ['error', 'always', { markers: ['/', ','], exceptions: ['*'] }],
    'stylistic/switch-colon-spacing': 'error',
    'stylistic/template-curly-spacing': ['error', 'never'],
    'stylistic/template-tag-spacing': ['error', 'never'],
    'stylistic/yield-star-spacing': ['error', 'after'],
  };
}

// jsx layout rules, for jsx/tsx files when the react option is on
export function stylisticJsxRules(indent: Indent): Rules {
  return {
    'stylistic/jsx-child-element-spacing': 'error',
    'stylistic/jsx-closing-bracket-location': ['error', 'line-aligned'],
    'stylistic/jsx-closing-tag-location': 'error',
    'stylistic/jsx-curly-spacing': 'error',
    'stylistic/jsx-equals-spacing': 'error',
    'stylistic/jsx-first-prop-new-line': 'error',
    'stylistic/jsx-function-call-newline': 'error',
    'stylistic/jsx-indent-props': ['error', indent],
    'stylistic/jsx-quotes': 'error',
    'stylistic/jsx-tag-spacing': [
      'error',
      { beforeSelfClosing: 'proportional-always', beforeClosing: 'proportional-always' },
    ],
    'stylistic/jsx-wrap-multilines': 'error',
  };
}
