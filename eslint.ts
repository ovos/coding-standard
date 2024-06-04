import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import * as tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import checkFilePlugin from 'eslint-plugin-check-file';
import * as importPlugin from 'eslint-plugin-import'; // aliased to eslint-plugin-import-x https://github.com/un-ts/eslint-plugin-import-x
import globals from 'globals';

type CustomizeOptions = {
  // Whether to ban or allow console usage.
  // Defaults to 'ban-log' (which allows 'console.error()', 'console.warn()' and 'console.info()') when 'react': true, 'allow' otherwise.
  console?: 'ban' | 'ban-log' | 'allow';
  // Number of spaces to use for indentation, or 'tab' to use tabs (default: 2)
  indent?: number | 'tab';
  // Whether to enable Jest-specific rules. (default: false)
  jest?: boolean;
  // Whether to enable React-specific rules. (default: false)
  react?: boolean;
  // Whether to enable Vitest-specific rules. (default: false)
  vitest?: boolean;
};

// shared settings - for js + ts equivalent rules
const shared: Linter.RulesRecord = {
  'no-unused-vars': ['error', { varsIgnorePattern: '^_', args: 'none' }],
};

/**
 * Customize the eslint configuration.
 *
 * @param {Object} options
 * @param {'ban' | 'ban-log' | 'allow'} [options.console] - Whether to ban or allow console usage. Defaults to 'ban-log' (which allows 'console.error()', 'console.warn()' and 'console.info()') when 'react': true, 'allow' otherwise.
 * @param {number | 'tab'} [options.indent=2] - Number of spaces to use for indentation, or 'tab' to use tabs.
 * @param {boolean} [options.jest=false] - Whether to enable Jest-specific rules.
 * @param {boolean} [options.react=false] - Whether to enable React-specific rules.
 * @param {boolean} [options.vitest=false] - Whether to enable Vitest-specific rules.
 * @returns {import('eslint').Linter.FlatConfig[]} requires @types/eslint to be installed for FlatConfig type to appear on Linter - https://stackoverflow.com/a/75684357/3729316
 */
function customize(options: CustomizeOptions = {}) {
  const { indent = 2, jest = false, react = false, vitest = false } = options;
  const consoleUsage = options.console ?? (react ? 'ban-log' : 'allow');

  const config: Linter.FlatConfig[] = [
    // common settings for all files
    {
      ignores: ['node_modules', 'build', 'coverage', '.yalc', 'vite.config.ts.*'],
    },
    {
      files: ['**/*.?(m|c)[jt]s?(x)'],
      rules: js.configs.recommended.rules, // 'eslint:recommended' rules
      languageOptions: {
        globals: {
          ...globals.node,
        },
      },
      plugins: {
        // https://eslint.style/ providing replacement for formatting rules, which are now deprecated in eslint and @typescript-eslint
        '@stylistic': { rules: stylistic.rules },
      },
    },
    // common settings for typescript files
    {
      files: ['**/*.?(m|c)ts?(x)'],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          // https://typescript-eslint.io/packages/parser/
          project: true,
        },
      },
      plugins: {
        '@typescript-eslint': { rules: tsPlugin.rules as any },
        import: importPlugin,
      } satisfies Linter.FlatConfig['plugins'],
      settings: {
        // `import-x` prefix is hardcoded in `eslint-plugin-import-x` to read its settings, ignores the alias defined in `plugins`
        'import-x/resolver': { typescript: { alwaysTryTypes: true } },
      },
      rules: {
        // configures the typescript-eslint plugin to use the recommended rules, using flat config format
        // this disables some rules from 'eslint:recommended' that are conflicting with 'typescript-eslint:recommended' rules
        ...tsPlugin.configs['eslint-recommended']!.overrides![0].rules,
        // use only 'recommended' rules, and not 'recommended-type-checked'.
        // Type checking is done in IDE and `yarn type-check` on CI. No need to involve also eslint there.
        ...tsPlugin.configs['recommended'].rules,
      },
    },
    {
      // list ts files which should be linted, but are not covered by tsconfig.json to avoid 'Parsing error (...) TSConfig does not include this file'
      // https://typescript-eslint.io/linting/troubleshooting/#i-get-errors-telling-me-eslint-was-configured-to-run--however-that-tsconfig-does-not--none-of-those-tsconfigs-include-this-file
      files: ['*.config.ts', '*.setup.ts'], // e.g. jest.config.ts, vite.config.ts, vitest.setup.ts
      languageOptions: { parserOptions: { project: null } }, // this is what basically the 'disable-type-checked' config does, when 'recommended-type-checked' is not used
    },
  ];

  if (jest) {
    const jestPlugin = require('eslint-plugin-jest');
    config.push({
      files: ['spec/**', '**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'],
      languageOptions: {
        globals: {
          ...globals.jest,
          DB: 'readonly',
          GQL: 'readonly',
          Setup: 'readonly',
          app: 'readonly',
        },
      },
      plugins: {
        jest: jestPlugin,
      },
      rules: {
        // flat config is not supported by eslint-plugin-jest yet - https://github.com/jest-community/eslint-plugin-jest/issues/1408
        ...jestPlugin.configs.recommended.rules,
        // the recommended set is too strict for us. Disable rules which we do not want.
        // https://github.com/jest-community/eslint-plugin-jest#rules
        'jest/expect-expect': 'off',
        'jest/no-alias-methods': 'off',
        'jest/no-conditional-expect': 'off',
        'jest/no-disabled-tests': 'off',
        'jest/no-standalone-expect': [
          'error',
          {
            additionalTestBlockFunctions: [
              // expects in before/after hooks are perfectly fine
              'beforeAll',
              'beforeEach',
              'afterEach',
              'afterAll',
              // custom helpers to run tests conditionally
              'testif',
              'itif',
              'testskipif',
              'itskipif',
            ],
          },
        ],
        // allow titles to be parameterized - using variables or ternaries
        'jest/valid-title': [
          'error',
          { ignoreTypeOfDescribeName: true, ignoreTypeOfTestName: true },
        ],
        // additional rules
        'no-console': 'error',
      },
    });
  }

  if (vitest) {
    const vitestPlugin = require('eslint-plugin-vitest');
    config.push({
      files: ['spec/**', '**/*.{spec,test}.?(c|m)[jt]s?(x)', '**/__tests__/**'],
      languageOptions: {
        globals: {
          ...vitestPlugin.environments.env.globals,
        },
      },
      plugins: {
        vitest: vitestPlugin,
      },
      rules: {
        // https://github.com/veritem/eslint-plugin-vitest#rules
        ...vitestPlugin.configs.recommended.rules,
        // allow titles to be parameterized - using variables or ternaries
        'vitest/valid-title': ['error', { ignoreTypeOfDescribeName: true }],
        // additional rules
        'vitest/no-focused-tests': 'error',
        'no-console': 'error',
      },
    });
  }

  config.push(
    // our rules and overrides (1/3: js files)
    {
      files: ['**/*.?(m|c)js?(x)'],
      rules: {
        // ** eslint:recommended overrides:
        'no-unused-vars': shared['no-unused-vars'],
        // ** end eslint:recommended overrides

        // additional rules
        camelcase: 'error',
        radix: ['error', 'as-needed'],
        // rules below are already enabled in '@typescript-eslint:recommended', add them for js files too, for consistency
        'no-array-constructor': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
      },
    },
    // our rules and overrides (2/3: ts files)
    {
      files: ['**/*.?(m|c)ts?(x)'],
      rules: {
        // ** typescript-eslint:recommended overrides:
        // Even though we have `strict: true` in tsconfig.json and write strict code in new files, not all old files are 'strict' yet.
        // The project was written in js at first, then we introduced "loose" typescript. We use `ts-strictify` to push for strict mode incrementally.
        // Linting all existing files with "strict mode"-related rules e.g. 'no-explicit-any' etc. would list too many errors to handle at the moment.
        '@typescript-eslint/no-explicit-any': 'off',
        // allow @ts-ignore
        '@typescript-eslint/ban-ts-comment': 'off',
        // even though `no-unused-vars` is already reconfigured, this needs to be reconfigured again for typescript files, with the same options repeated
        '@typescript-eslint/no-unused-vars': shared['no-unused-vars'],
        // we still sometimes want to use dynamic, sync `require()` instead of `await import()`
        '@typescript-eslint/no-var-requires': 'off',
        // ** end typescript-eslint:recommended overrides

        // additional rules
        '@typescript-eslint/ban-tslint-comment': 'error',
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'function',
            format: ['camelCase', 'PascalCase'], // PascalCase to allow React function components
          },
          {
            selector: 'method',
            format: ['camelCase'],
          },
          {
            selector: 'objectLiteralMethod',
            // snake_case to allow i.a. graphql resolvers for fields which are snake_cased
            format: ['camelCase', 'snake_case'],
            // allow e.g. `__resolveType` graphql resolver method
            leadingUnderscore: 'allowDouble',
          },
          {
            selector: 'typeLike',
            format: ['PascalCase', 'UPPER_CASE'],
          },
          {
            selector: 'import',
            format: ['camelCase', 'PascalCase'],
          },
          // Note: There is no point to lint property names, as we have them all mixed
          // aside from regular camelCased properties, there are snake_cased e.g. for objection models
          // PascalCase for graphql type names, kebab-case for headers,
          // UPPER_CASE for constants, jwt claims, and some other cases
          // and they all might be also prefixed with single or double underscores.
          // So in the end all styles are in use, with no real reason to limit the usage down.
          // Similarly with variables, which are also in use in all styles.
        ],
        '@typescript-eslint/no-for-in-array': 'error',
      },
    },
    // our rules and overrides (3/3: all files)
    {
      files: ['**/*.?(m|c)[jt]s?(x)'],
      plugins: {
        import: importPlugin,
      },
      rules: {
        // ** eslint:recommended overrides:
        // allow using constant conditions in loops (e.g. `while (true)`)
        'no-constant-condition': ['error', { checkLoops: false }],
        // allow fallthrough in switch statements by adding '// fallthrough'
        'no-fallthrough': ['error', { commentPattern: 'fallthrough' }],
        // superseded by @stylistic/no-extra-semi (note: not included in eslint:recommended anymore in eslint v9, remove after upgrade)
        'no-extra-semi': 'off',
        // superseded by @stylistic/no-mixed-spaces-and-tabs (note: not included in eslint:recommended anymore in eslint v9, remove after upgrade)
        'no-mixed-spaces-and-tabs': 'off',
        // ** end eslint:recommended overrides

        // additional rules
        '@stylistic/array-bracket-spacing': ['error', 'never'],
        '@stylistic/block-spacing': 'error',
        '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
        '@stylistic/comma-dangle': [
          'error',
          {
            arrays: 'always-multiline',
            objects: 'always-multiline',
            imports: 'always-multiline',
            exports: 'always-multiline',
            functions: 'only-multiline',
            enums: 'always-multiline',
            generics: 'only-multiline',
            tuples: 'only-multiline',
          },
        ],
        '@stylistic/comma-spacing': 'error',
        '@stylistic/computed-property-spacing': ['error', 'never'],
        '@stylistic/eol-last': 'error',
        '@stylistic/func-call-spacing': 'error',
        '@stylistic/generator-star-spacing': ['error', 'before'],
        '@stylistic/indent': [
          'error',
          indent,
          {
            SwitchCase: 1,
            // indenting parameters on multiline function calls is sometimes broken
            CallExpression: { arguments: 'off' },
            // @typescript-eslint/indent is broken and unmaintained,
            // but there is no other, better option available at the moment. (except the prettier itself?)
            // Eslint cuts it ties with stylistic lints while leaving them in broken state
            // https://github.com/eslint/eslint/issues/17522
            // Maybe it'll be fixed one day at https://github.com/eslint-stylistic/eslint-stylistic/ 🙄
            //
            // Apply workarounds posted in https://github.com/typescript-eslint/typescript-eslint/issues/1824 et al.
            ignoredNodes: [
              // https://github.com/typescript-eslint/typescript-eslint/issues/1824#issuecomment-1378327382
              'PropertyDefinition[decorators]',
              'FunctionExpression[params]:has(Identifier[decorators])',
              'TSUnionType',
              'TSIntersectionType',
              // https://github.com/typescript-eslint/typescript-eslint/issues/1824#issuecomment-943783564
              // Generics are not properly indented
              'TSTypeParameterInstantiation',
              'TSInterfaceHeritage',
              // checking indentation of multiline ternary expression is broken
              // https://github.com/eslint/eslint/issues/14058
              'ConditionalExpression *',
              // breaking on nested arrow functions
              'ArrowFunctionExpression',
              // https://stackoverflow.com/questions/52178093/ignore-the-indentation-in-a-template-literal-with-the-eslint-indent-rule
              'TemplateLiteral *',
              // ignore jsx indentation - copied from https://github.com/eslint-stylistic/eslint-stylistic/blob/main/packages/eslint-plugin/configs/customize.ts
              // use jsx-indent rule instead
              'JSXElement',
              'JSXElement > *',
              'JSXAttribute',
              'JSXIdentifier',
              'JSXNamespacedName',
              'JSXMemberExpression',
              'JSXSpreadAttribute',
              'JSXExpressionContainer',
              'JSXOpeningElement',
              'JSXClosingElement',
              'JSXFragment',
              'JSXOpeningFragment',
              'JSXClosingFragment',
              'JSXText',
              'JSXEmptyExpression',
              'JSXSpreadChild',
            ],
          },
        ],
        '@stylistic/key-spacing': 'error',
        '@stylistic/keyword-spacing': 'error',
        '@stylistic/max-len': [
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
        '@stylistic/member-delimiter-style': 'error',
        '@stylistic/no-extra-semi': 'error',
        '@stylistic/no-mixed-spaces-and-tabs': 'error',
        '@stylistic/no-multiple-empty-lines': 'error',
        '@stylistic/no-trailing-spaces': 'error',
        '@stylistic/no-whitespace-before-property': 'error',
        '@stylistic/object-curly-spacing': ['error', 'always'],
        '@stylistic/quote-props': ['error', 'as-needed'],
        '@stylistic/quotes': [
          'error',
          'single',
          { allowTemplateLiterals: true, avoidEscape: true },
        ],
        '@stylistic/rest-spread-spacing': ['error', 'never'],
        '@stylistic/semi': 'error',
        '@stylistic/semi-spacing': 'error',
        '@stylistic/space-before-blocks': 'error',
        '@stylistic/space-before-function-paren': [
          'error',
          { anonymous: 'always', named: 'never', asyncArrow: 'always' },
        ],
        '@stylistic/space-in-parens': 'error',
        '@stylistic/space-infix-ops': 'error',
        '@stylistic/spaced-comment': [
          'error',
          'always',
          { markers: ['/', ','], exceptions: ['*'] },
        ],
        '@stylistic/switch-colon-spacing': 'error',
        '@stylistic/template-curly-spacing': ['error', 'never'],
        '@stylistic/template-tag-spacing': ['error', 'never'],
        '@stylistic/yield-star-spacing': ['error', 'before'],
        curly: ['error', 'multi-line'],
        eqeqeq: 'error',
        'import/no-duplicates': ['error', { 'prefer-inline': true }],
        'import/order': [
          'error',
          {
            // configure import/order rule to match our convention
            alphabetize: { caseInsensitive: true, order: 'asc' },
            'newlines-between': 'always',
            groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index']],
            distinctGroup: true,
            pathGroupsExcludedImportTypes: [],
            pathGroups: [
              // aliased paths (which begin with tilde [~] in our convention)
              {
                pattern: '~**/**',
                group: 'internal',
                position: 'before',
              },
            ],
          },
        ],
        'no-else-return': 'error',
        'no-eval': 'error',
        'no-new-func': 'error',
        'no-new-wrappers': 'error',
        'no-param-reassign': 'error',
        'object-shorthand': 'error',
        'one-var': ['error', 'never'],
        'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
        ...(consoleUsage !== 'allow' && {
          'no-console':
            consoleUsage === 'ban-log' ? ['error', { allow: ['error', 'warn', 'info'] }] : 'error',
        }),
      },
    }
  );

  if (react) {
    const reactPlugin = require('eslint-plugin-react');
    const reactHooksPlugin = require('eslint-plugin-react-hooks');

    // our rules and overrides (react 1/2: tsx only)
    config.push(
      {
        files: ['**/*.?(m|c)tsx'],
        rules: {
          // allow i.a. `type Props = {}` in react components
          // https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-675156492
          '@typescript-eslint/ban-types': [
            'error',
            { extendDefaults: true, types: { '{}': false } },
          ],
        },
      },
      // our rules and overrides (react 2/2: jsx+tsx)
      {
        files: ['**/*.?(m|c)[jt]sx'],
        languageOptions: {
          parserOptions: {
            ecmaFeatures: {
              jsx: true,
            },
          },
          globals: {
            // @todo configurable env 'node', 'browser'
            ...globals.browser,
          },
        },
        plugins: {
          'check-file': checkFilePlugin,
          react: reactPlugin,
          'react-hooks': reactHooksPlugin,
        },
        settings: {
          react: {
            version: 'detect', // https://github.com/jsx-eslint/eslint-plugin-react/issues/3758
          },
        },
        rules: {
          // https://eslint.style/packages/jsx
          // @stylistic/jsx does not provide a recommended rule set, add relevant rules manually
          '@stylistic/jsx-child-element-spacing': 'error',
          '@stylistic/jsx-closing-bracket-location': ['error', 'line-aligned'],
          '@stylistic/jsx-closing-tag-location': 'error',
          '@stylistic/jsx-curly-brace-presence': ['error', { propElementValues: 'always' }],
          '@stylistic/jsx-curly-spacing': 'error',
          '@stylistic/jsx-equals-spacing': 'error',
          '@stylistic/jsx-first-prop-new-line': 'error',
          '@stylistic/jsx-function-call-newline': 'error',
          '@stylistic/jsx-indent': ['error', indent],
          '@stylistic/jsx-indent-props': ['error', indent],
          '@stylistic/jsx-props-no-multi-spaces': 'error',
          '@stylistic/jsx-self-closing-comp': 'error', // replaces `react/self-closing-comp`, even though it's not deprecated yet
          '@stylistic/jsx-tag-spacing': [
            'error',
            {
              beforeSelfClosing: 'proportional-always',
              beforeClosing: 'proportional-always',
            },
          ],
          '@stylistic/jsx-wrap-multilines': 'error',
          // add `eslint-react` recommended set + a few additional rules
          // https://github.com/jsx-eslint/eslint-plugin-react#list-of-supported-rules
          // watch out: `prop-types` and `display-name` are pretty buggy - see github issues:
          // https://github.com/search?q=repo%3Ajsx-eslint%2Feslint-plugin-react+prop-types&type=issues
          // https://github.com/search?q=repo%3Ajsx-eslint%2Feslint-plugin-react+display-name&type=issues
          ...reactPlugin.configs.recommended.rules,
          'react/jsx-no-bind': ['error', { allowArrowFunctions: true }],
          'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
          // https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks
          'react-hooks/rules-of-hooks': 'error',
          'react-hooks/exhaustive-deps': 'error',
          // @todo add a11y rules https://github.com/jsx-eslint/eslint-plugin-jsx-a11y
        },
      }
    );
  }

  // file naming conventions
  config.push({
    plugins: {
      'check-file': checkFilePlugin,
    },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/!(index|routes|use*|with*).?(m|c)[jt]sx': 'PASCAL_CASE',
          '**/(use|with)*.?(m|c)[jt]sx': 'CAMEL_CASE',
          '**/*.less': 'CAMEL_CASE',
        },
        { ignoreMiddleExtensions: true },
      ],
    },
  });

  return config;
}

// https://stackoverflow.com/questions/62516916/how-do-i-make-export-default-compile-to-module-exports
export = customize;

// @todo suggestions to revisit in the future:
// - `@stylistic/jsx-curly-newline` https://eslint.style/rules/jsx/jsx-curly-newline
// - `@stylistic/no-multi-spaces` https://eslint.style/rules/js/no-multi-spaces
//   - errors on array elements or object props, vertically aligned with spaces
