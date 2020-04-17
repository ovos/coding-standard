import * as fs from 'fs';
import * as path from 'path';
import * as coreModules from 'resolve/lib/core';
import * as tslint from 'tslint';
import * as tslintAirbnb from 'tslint-config-airbnb';
const tslintReact = require('tslint-react');

const rulesAirbnb = tslintAirbnb.rules;
const rulesReact = tslintReact.rules;

// prepare regex for node core modules for 'ordered-imports' rule
const modules = Object.entries(coreModules as Record<string, boolean>).reduce(
  (acc: string[], [module, enabled]) => {
    enabled && !module.startsWith('_') && acc.push(module);
    return acc;
  },
  []
);
const coreModulesRegex = '^(' + modules.join('|') + ')$';

// prepare import groups for 'ordered-imports' rule
const projectPackageJson = path.join(process.cwd(), 'package.json');
let dependenciesRegex;
if (fs.existsSync(projectPackageJson)) {
  const packageJson = require(projectPackageJson);
  const dependencies = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
  ];

  if (dependencies.length) {
    dependenciesRegex = '^(' + dependencies.join('|').replace(/\./g, '\\\\.') + ')(/|$)';
  }
}

const importGroups = [
  {
    name: 'aliased paths (which begin with tilde [~] in our convention)',
    match: '^~',
    order: 30,
  },
  {
    name: 'parent directories',
    match: '^\\.\\.',
    order: 50,
  },
  {
    name: 'current directory',
    match: '^\\.',
    order: 60,
  },
  {
    name: 'built-in node modules',
    match: coreModulesRegex,
    order: 10,
  },
  dependenciesRegex && {
    name: 'dependencies',
    match: dependenciesRegex,
    order: 20,
  },
  {
    name: 'absolute imports',
    match: '\\.*',
    order: 40,
  },
].filter(Boolean); // filter out empty dependencies group

const rules : tslint.Configuration.RawRulesConfig = Object.assign({}, rulesAirbnb, rulesReact, {
  // differences from airbnb ruleset
  'prefer-array-literal': [true, {'allow-size-argument': true}],
  align: false,
  'increment-decrement': false,
  whitespace: [
    true,
    'check-branch',
    'check-decl',
    'check-operator',
    'check-preblock',
    'check-separator',
    'check-module', // added
  ],
  'trailing-comma': [
    true,
    {
      esSpecCompliant: true, // disallow trailing comma on object and array rest and rest parameters
      multiline: { // modified to check everything except functions
        objects: 'always',
        arrays: 'always',
        imports: 'always',
        exports: 'always',
        typeLiterals: 'always',
      },
      singleline: 'never',
    },
  ],
  'max-line-length': false,
  // replaced with https://github.com/buzinas/tslint-eslint-rules/blob/master/src/docs/rules/terMaxLenRule.md
  // for finer configuration of exceptions to max-line-length rule
  'ter-max-len': [true, 120, 2, {
    ignoreUrls: true,
    ignoreComments: true,
    ignoreRegExpLiterals: true,
    ignoreStrings: true,
    ignoreTemplateLiterals: true,
  }],
  'function-name': [
    true,
    {
      'function-regex':         /^[a-zA-Z$][a-zA-Z\d]+$/, // allow React function components
      'method-regex':           /^[a-z$][a-zA-Z\d]+$/,
      'private-method-regex':   /^[a-z$][a-zA-Z\d]+$/,
      'protected-method-regex': /^[a-z$][a-zA-Z\d]+$/,
      'static-method-regex':    /^[a-z$][a-zA-Z\d]+$/,
    },
  ],
  'variable-name': false,
  'no-this-assignment': [true, {'allow-destructuring': true}],
  'import-name': false, // from tslint-microsoft-contrib
  'object-shorthand-properties-first': false, // from tslint-consistent-codestyle
  'ter-prefer-arrow-callback': [true, {'allowNamedFunctions': true}], // suits React functional components better
  'ter-arrow-parens': false,
  'no-boolean-literal-compare': false,
  // added ignore-bound-class-methods for compatibility with prettier always adding semicolons there
  // https://github.com/prettier/prettier/issues/1444
  semicolon: [true, 'always', 'ignore-bound-class-methods'],
  // allow-single-concat to allow simple cast to string ('' + foo)
  'prefer-template': [true, 'allow-single-concat'],

  // differences from react ruleset
  'jsx-no-multiline-js': false,
  // https://github.com/palantir/tslint-react/issues/96
  // https://stackoverflow.com/questions/43968779/are-lambda-in-jsx-attributes-an-anti-pattern/43968902#43968902
  'jsx-no-lambda': false,
  'jsx-boolean-value': false,
  // disabled because of false positives and being unmaintained (and being incompatible with prettier)
  // https://github.com/palantir/tslint-react/pull/194#issuecomment-478307364
  // https://github.com/palantir/tslint-react/issues/79#issuecomment-289923337
  'jsx-wrap-multiline': false,

  // additions
  'no-console': true,
  'no-unexpected-multiline': true,
  'ter-arrow-body-style': [true, 'as needed'], // eslint arrow-body-style equivalent
  'no-for-in-array': true,
  'no-return-await': true,
  'no-unused': [true, 'ignore-parameters'], // instead of "noUnusedLocals" in typescript
  'ordered-imports': [true, {
    'named-imports-order': 'lowercase-last',
    'grouped-imports': true,
    groups: importGroups,
  }],

  // for the tslint-react-hooks plugin
  'react-hooks-nesting': true,

  // comments
  /**
   * 1) the following rules which we once used with eslint seems not to be available for tslint:
   * - no-mixed-operators
   * - no-await-in-loop
   * - no-case-declarations
   *
   * 2) we had "class-methods-use-this" enabled, considering enabling
   * "prefer-function-over-method" as an equivalent rule
   */
});

const config: tslint.Configuration.RawConfigFile = {
  extends: [
    'tslint-config-airbnb',
    'tslint-react',
    'tslint-react-hooks'
  ],
  rules: rules,
  jsRules: true,
};

export = config;
