import * as tslint from 'tslint';
import * as tslintAirbnb from 'tslint-config-airbnb';
const tslintReact = require('tslint-react');

const rulesAirbnb = tslintAirbnb.rules;
const rulesReact = tslintReact.rules;

const rules : tslint.Configuration.RawRulesConfig = Object.assign({}, rulesAirbnb, rulesReact, {
  // differences from airbnb ruleset
  'no-increment-decrement': false,
  'no-unused-variable': true,
  align: false,
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
        objects: "always",
        arrays: "always",
        imports: "always",
        exports: "always",
        typeLiterals: "always",
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
  'variable-name': false,
  'no-this-assignment': [true, {'allow-destructuring': true}],
  'import-name': false, // from tslint-microsoft-contrib
  'object-shorthand-properties-first': false, // from tslint-consistent-codestyle

  // differences from react ruleset
  'jsx-no-multiline-js': false,

  // additions
  'no-console': true,
  'no-unexpected-multiline': true,
  'ter-arrow-body-style': [true, 'as needed'], // eslint arrow-body-style equivalent
  'no-for-in-array': true,

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

// copy rules to jsRules
// until this is merged https://github.com/palantir/tslint/pull/3641
const jsRules = Object.assign({}, rules);
// delete typescriptOnly rules
delete jsRules['prefer-array-literal'];
delete jsRules['no-function-constructor-with-string-args'];
delete jsRules['no-increment-decrement'];
delete jsRules['no-unused-variable'];
delete jsRules['no-boolean-literal-compare'];
delete jsRules['function-name'];
delete jsRules['import-name'];

const config: tslint.Configuration.RawConfigFile = {
  extends: [
    'tslint-config-airbnb',
    'tslint-react',
  ],
  rules: rules,
  jsRules: jsRules,
};

export = config;
