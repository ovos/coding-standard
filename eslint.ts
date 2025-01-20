import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import * as tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import checkFilePlugin from 'eslint-plugin-check-file';
import * as importPlugin from 'eslint-plugin-import'; // aliased to eslint-plugin-import-x https://github.com/un-ts/eslint-plugin-import-x
import perfectionist from 'eslint-plugin-perfectionist';
import globals from 'globals';

type CustomizeOptions = {
  // Whether to ban or allow console usage.
  // Defaults to 'ban-log' (which allows 'console.error()', 'console.warn()' and 'console.info()') when 'react': true, 'allow' otherwise.
  console?: 'ban' | 'ban-log' | 'allow';
  // List ts files which should be linted, but are not covered by tsconfig.json to avoid 'Parsing error (...) TSConfig does not include this file'
  // https://typescript-eslint.io/linting/troubleshooting/#i-get-errors-telling-me-eslint-was-configured-to-run--however-that-tsconfig-does-not--none-of-those-tsconfigs-include-this-file
  disableTypeChecked?: string[];
  // Number of spaces to use for indentation, or 'tab' to use tabs (default: 2)
  indent?: number | 'tab';
  // Directory where test files are located. (default: `{spec,test,tests}`)
  // Example: `src` for single directory, `{spec,tests}` to include multiple directories.
  // In addition, files in `__tests__` folders and files with `*.spec.*`/`*.test.*` filenames are picked up as test files, even outside of `testsDir`.
  testsDir?: string;
  // Whether to enable Cypress-specific rules. (default: false)
  cypress?: boolean;
  // Whether to enable Jest-specific rules. (default: false)
  jest?: boolean;
  // Whether to enable Mocha-specific rules. (default: false)
  mocha?: boolean;
  // Whether to enable React-specific rules. (default: false)
  react?: boolean;
  // Whether to enable Vitest-specific rules. (default: false)
  vitest?: boolean;
};

// shared settings - for js + ts equivalent rules
const shared: Linter.RulesRecord = {
  'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
  'no-unused-vars': ['error', { varsIgnorePattern: '^_', args: 'none', caughtErrors: 'none' }],
};

/**
 * Customize the eslint configuration.
 *
 * @param {Object} options
 * @param {'ban' | 'ban-log' | 'allow'} [options.console] - Whether to ban or allow console usage. Defaults to 'ban-log' (which allows 'console.error()', 'console.warn()' and 'console.info()') when 'react': true, 'allow' otherwise.
 * @param {string[]} [options.disableTypeChecked] - List ts files which should be linted, but are not covered by tsconfig.json to avoid 'Parsing error (...) TSConfig does not include this file' https://typescript-eslint.io/linting/troubleshooting/#i-get-errors-telling-me-eslint-was-configured-to-run--however-that-tsconfig-does-not--none-of-those-tsconfigs-include-this-file
 * @param {number | 'tab'} [options.indent=2] - Number of spaces to use for indentation, or 'tab' to use tabs.
 * @param {string} [options.testsDir={spec,test,tests}] - Directory where test files are located. Example: `src` for single directory, `{spec,tests}` to include multiple directories. In addition, files in `__tests__` folders and files with `*.spec.*`/`*.test.*` filenames are picked up as test files, even outside of `testsDir`.
 * @param {boolean} [options.cypress=false] - Whether to enable Cypress-specific rules.
 * @param {boolean} [options.jest=false] - Whether to enable Jest-specific rules.
 * @param {boolean} [options.mocha=false] - Whether to enable Mocha-specific rules.
 * @param {boolean} [options.react=false] - Whether to enable React-specific rules.
 * @param {boolean} [options.vitest=false] - Whether to enable Vitest-specific rules.
 * @returns {import('eslint').Linter.Config[]}
 */
function customize(options: CustomizeOptions = {}) {
  const {
    disableTypeChecked = [],
    indent = 2,
    testsDir = '{spec,test,tests}',
    cypress = false,
    jest = false,
    mocha = false,
    react = false,
    vitest = false,
  } = options;
  const consoleUsage = options.console ?? (react ? 'ban-log' : 'allow');

  const config: Linter.Config[] = [
    // common settings for all files
    {
      ignores: ['node_modules', 'build', 'coverage', '.yalc', 'vite.config.ts.*'],
    },
    {
      name: 'recommended/js',
      files: ['**/*.?(m|c)[jt]s?(x)'],
      rules: js.configs.recommended.rules, // 'eslint:recommended' rules
      languageOptions: {
        // @todo configurable env 'node', 'browser'
        globals: globals.node,
      },
      plugins: {
        // https://eslint.style/ providing replacement for formatting rules, which are now deprecated in eslint and @typescript-eslint
        '@stylistic': { rules: stylistic.rules },
        perfectionist,
      },
      settings: {
        // https://perfectionist.dev/guide/getting-started#settings
        perfectionist: {
          type: 'custom',
          ignoreCase: false,
          // 'perfectionist' uses .localeCompare() which by default which sorts '123..AaBbCc..'
          // we want to put uppercase before lowercase, the rest stays the same (esp. symbols)
          // Alphabet from 'perfectionist' could be used, such as
          // `Alphabet.generateRecommendedAlphabet().sortByNaturalSort('en-US').placeAllWithCaseBeforeAllWithOtherCase('uppercase').getCharacters()`
          // but that contains 128k chars, which is unnecessarily large
          // so recreated only the needed part of the alphabet, with uppercase before lowercase
          alphabet: '_-.@/#~$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        },
      },
    },
    // common settings for typescript files
    {
      name: 'recommended/ts',
      files: ['**/*.?(m|c)ts?(x)'],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          // https://typescript-eslint.io/packages/parser/
          projectService: true,
        },
      },
      plugins: {
        '@typescript-eslint': { rules: tsPlugin.rules as any },
        import: importPlugin,
      } satisfies Linter.Config['plugins'],
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
      name: 'workaround-for-files-not-included-in-tsconfig',
      // list ts files which should be linted, but are not covered by tsconfig.json to avoid 'Parsing error (...) TSConfig does not include this file'
      // https://typescript-eslint.io/linting/troubleshooting/#i-get-errors-telling-me-eslint-was-configured-to-run--however-that-tsconfig-does-not--none-of-those-tsconfigs-include-this-file
      files: [
        // defaults will cover e.g. jest.config.ts, vite.config.ts, vitest.setup.ts
        '*.config.ts',
        '*.setup.ts',
        ...disableTypeChecked,
      ],
      languageOptions: { parserOptions: { projectService: null } }, // this is what basically the 'disable-type-checked' config does, when 'recommended-type-checked' is not used
    },
  ];

  config.push(
    // our rules and overrides (1/3: js files)
    {
      name: 'overrides/js',
      files: ['**/*.?(m|c)js?(x)'],
      rules: {
        // ** eslint:recommended overrides:
        'no-unused-expressions': shared['no-unused-expressions'],
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
      name: 'overrides/ts',
      files: ['**/*.?(m|c)ts?(x)'],
      rules: {
        // ** typescript-eslint:recommended overrides:
        // Even though we have `strict: true` in tsconfig.json and write strict code in new files, not all old files are 'strict' yet.
        // The project was written in js at first, then we introduced "loose" typescript. We use `ts-strictify` to push for strict mode incrementally.
        // Linting all existing files with "strict mode"-related rules e.g. 'no-explicit-any' etc. would list too many errors to handle at the moment.
        '@typescript-eslint/no-explicit-any': 'off',
        // allow @ts-ignore
        '@typescript-eslint/ban-ts-comment': 'off',
        // we still sometimes want to use dynamic, sync `require()` instead of `await import()`
        '@typescript-eslint/no-require-imports': 'off',
        // allow `interface I extends Base<Param> {}` syntax
        '@typescript-eslint/no-empty-object-type': [
          'error',
          { allowInterfaces: 'with-single-extends' },
        ],
        // even though the rules blow are already reconfigured for eslint:recommended,
        // they need to be reconfigured again for typescript files, with the same options repeated
        '@typescript-eslint/no-unused-expressions': shared['no-unused-expressions'],
        '@typescript-eslint/no-unused-vars': shared['no-unused-vars'],
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
      name: 'overrides/js-ts',
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
            // only enable when 'indent' is 2 spaces, as it's broken otherwise -> https://github.com/eslint-stylistic/eslint-stylistic/issues/514
            offsetTernaryExpressions: indent === 2,
            ignoredNodes: [
              // copied list of ignoredNodes from https://github.com/eslint-stylistic/eslint-stylistic/blob/main/packages/eslint-plugin/configs/customize.ts
              // which just disables indent rules for cases not properly supported by the plugin
              // (issues have been carried over from the original indent and @typescript-eslint/indent rules
              // and now are being addressed occasionally, one by one, in eslint-stylistic)
              'TSUnionType',
              'TSIntersectionType',
              'TSTypeParameterInstantiation',
              'FunctionExpression > .params[decorators.length > 0]',
              'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
              // some more exclusions are needed:
              // does not indent multiline interface extends (conflicts with prettier)
              'TSInterfaceHeritage',
              '.superTypeArguments',
              // multiline generic type parameters in function calls
              'CallExpression > .typeArguments',
              // checking indentation of multiline ternary expression is broken in some cases (i.a. nested function calls)
              'ConditionalExpression *',
              // still breaking on nested (chained) arrow functions () => () => {}
              'ArrowFunctionExpression',
              // https://stackoverflow.com/questions/52178093/ignore-the-indentation-in-a-template-literal-with-the-eslint-indent-rule
              'TemplateLiteral *', // even after some fixes in @stylistic, still not handling multiline expressions in template literals properly
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
        '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }], // default is { max: 2 }
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
        'perfectionist/sort-named-exports': ['error', { groupKind: 'types-first' }],
        'perfectionist/sort-named-imports': [
          'error',
          { ignoreAlias: true, groupKind: 'types-first' },
        ],
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
        name: 'react/tsx',
        files: ['**/*.?(m|c)tsx'],
        rules: {
          // allow i.a. `type Props = {}` in react components
          // https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-675156492
          '@typescript-eslint/no-empty-object-type': ['error', { allowWithName: 'Props$' }],
        },
      },
      // our rules and overrides (react 2/2: jsx+tsx)
      {
        name: 'react/jsx-tsx',
        files: ['**/*.?(m|c)[jt]sx'],
        languageOptions: {
          parserOptions: {
            ecmaFeatures: {
              jsx: true,
            },
          },
          globals: globals.browser,
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
          '@stylistic/jsx-indent-props': ['error', indent],
          '@stylistic/jsx-props-no-multi-spaces': 'error',
          '@stylistic/jsx-quotes': 'error',
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
    name: 'file-naming-conventions',
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

  // patterns to extra (helper) files in testsDir, which are not test suites
  const ignoreInTestsDir = [`${testsDir}/**/_*`, `${testsDir}/**/*.skip.*`];

  if (jest) {
    const jestPlugin = require('eslint-plugin-jest');
    config.push({
      name: 'jest',
      files: [
        `${testsDir}/**/*.?(c|m)[jt]s?(x)`,
        '**/__tests__/**/*.?(c|m)[jt]s?(x)',
        '**/*.{spec,test}.?(c|m)[jt]s?(x)',
      ],
      languageOptions: {
        globals: {
          ...jestPlugin.environments.globals.globals,
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
    const vitestPlugin = require('@vitest/eslint-plugin');
    config.push({
      name: 'vitest',
      files: [
        `${testsDir}/**/*.?(c|m)[jt]s?(x)`,
        '**/__tests__/**/*.?(c|m)[jt]s?(x)',
        '**/*.{spec,test}.?(c|m)[jt]s?(x)',
      ],
      languageOptions: {
        globals: vitestPlugin.environments.env.globals,
      },
      plugins: {
        vitest: vitestPlugin,
      },
      rules: {
        // https://github.com/veritem/eslint-plugin-vitest#rules
        ...vitestPlugin.configs.recommended.rules,
        // allow titles to be parameterized - using variables or ternaries
        'vitest/valid-title': ['error', { ignoreTypeOfDescribeName: true }],
        'vitest/prefer-to-be': 'off', // this override can be removed after eslint-plugin-vitest is updated to 0.3.19+ https://github.com/veritem/eslint-plugin-vitest/pull/332
        // additional rules
        'vitest/no-focused-tests': 'error',
        'no-console': 'error',
      },
    });
  }

  // cypress is based on mocha, so also enable mocha-specific rules when cypress is enabled
  if (mocha || cypress) {
    const mochaPlugin = require('eslint-plugin-mocha');
    config.push(
      {
        ...mochaPlugin.configs.flat.recommended,
        name: 'mocha',
        files: [
          `${testsDir}/**/*.?(c|m)[jt]s`,
          '**/__tests__/**/*.?(c|m)[jt]s',
          '**/*.{spec,test}.?(c|m)[jt]s',
        ],
        rules: {
          // https://github.com/lo1tuma/eslint-plugin-mocha#rules
          ...mochaPlugin.configs.flat.recommended.rules,
          'mocha/no-exclusive-tests': 'error', // the rule is set to 'warn' in the recommended config
          'mocha/no-skipped-tests': 'off', // the rule is set to 'warn' in the recommended config, but we don't need it
          // not compatible with https://www.npmjs.com/package/mocha-each and https://mochajs.org/#dynamically-generating-tests
          'mocha/no-setup-in-describe': 'off',
          // mocha prefers function expressions https://mochajs.org/#arrow-functions
          // https://github.com/lo1tuma/eslint-plugin-mocha/blob/HEAD/docs/rules/prefer-arrow-callback.md
          'prefer-arrow-callback': 'off',
          'mocha/prefer-arrow-callback': 'error',
        },
      },
      {
        // folder with snapshots generated by https://www.npmjs.com/package/snap-shot-it
        ignores: ['__snapshots__'],
      },
      {
        name: 'mocha/ignore',
        files: ignoreInTestsDir,
        rules: {
          'mocha/no-exports': 'off',
        },
      }
    );
  }

  if (cypress) {
    const cypressPlugin = require('eslint-plugin-cypress/flat');
    config.push({
      ...cypressPlugin.configs.recommended,
      name: 'cypress',
      files: [
        `${testsDir}/**/*.?(c|m)[jt]s`,
        '**/__tests__/**/*.?(c|m)[jt]s',
        '**/*.{spec,test}.?(c|m)[jt]s',
      ],
      rules: {
        ...cypressPlugin.configs.recommended.rules,
        // Even though cypress is based on mocha, and uses `this` in regular functions to access the test context,
        // we won't force using regular functions in cypress tests, as most of the cases can be covered with `cy.get` command.
        // https://docs.cypress.io/guides/core-concepts/variables-and-aliases#Avoiding-the-use-of-this
        // Still when `this` context needs to be accessed, a dev can easily convert an arrow function to a regular function.
        // This rule comes from our default config for `mocha`.
        'mocha/no-mocha-arrows': 'off',
      },
    });
  }

  return config;
}

// https://stackoverflow.com/questions/62516916/how-do-i-make-export-default-compile-to-module-exports
export = customize;

// @todo suggestions to revisit in the future:
// - `@stylistic/jsx-curly-newline` https://eslint.style/rules/jsx/jsx-curly-newline
// - `@stylistic/no-multi-spaces` https://eslint.style/rules/js/no-multi-spaces
//   - errors on array elements or object props, vertically aligned with spaces
