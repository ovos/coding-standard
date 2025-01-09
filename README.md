## Install

```sh
# using npm
npm install --save-dev @ovos-media/coding-standard

# using yarn
yarn add --dev @ovos-media/coding-standard
```

## Usage

### `eslint.config.js`

```js
const eslint = require('@ovos-media/coding-standard/eslint');

module.exports = eslint();
```

The configuration is based on the recommended rulesets from [ESLint](https://eslint.org/) and [typescript-eslint](https://typescript-eslint.io/).

It also includes [ESLint Stylistic](https://eslint.style/) which replaces deprecated rules from eslint and typescript-eslint.

Currently, it uses ESLint v9 and typescript-eslint v8. (nodejs v18.18+ required)
If you need to use this package on older nodejs v16, you may switch to older v2.x version, which is based on ESLint v8 (nodejs v16.10+ required)


`@ovos-media/coding-standard/eslint` exports a function that accepts an object with the following options:

- `console`: `ban`, `ban-log` or `allow` - whether to ban or allow console usage. Defaults to:
  - `ban-log` (which only allows `console.error()`, `console.warn()` and `console.info()`) when `react: true`,
  - `allow` otherwise.
- `disableTypeChecked`: List ts files which should be linted, but are not covered by `tsconfig.json`
  to avoid `Parsing error (...) TSConfig does not include this file`. [read more &raquo;](https://typescript-eslint.io/linting/troubleshooting/#i-get-errors-telling-me-eslint-was-configured-to-run--however-that-tsconfig-does-not--none-of-those-tsconfigs-include-this-file)
  Example: `['dangerfile.ts', '.storybook/*.ts?(x)']`
- `indent` (default: `2`): number of spaces to use for indentation or `tab` for tabs
- `testsDir` (default: `{spec,test,tests}`): directory where test files are located.
  Example: `src` for single directory, `{spec,tests}` to include multiple directories.
  In addition, files in `__tests__` folders and files with `*.spec.*`/`*.test.*` filenames are picked up as test files, even outside of `testsDir`.
- `cypress` (default: `false`): enable Cypress-specific rules
- `jest` (default: `false`): enable Jest-specific rules
- `mocha` (default: `false`): enable Mocha-specific rules
- `react` (default: `false`): enable React-specific rules
- `vitest` (default: `false`): enable Vitest-specific rules

The function returns an array of ESLint "[Flat Config](https://eslint.org/docs/v8.x/use/configure/configuration-files-new)" objects.
You may further customize the default configuration by adding your own configuration objects to the exported array.

```js
const eslint = require('@ovos-media/coding-standard/eslint');

module.exports = [
  ...eslint({ react: true, vitest: true }),
  // your custom config and overrides
  {
    ignores: ['public'],
  },
  {
    rules: {
      // toggle off unwanted rules
      'import/order': 'off',
    },
  },
  {
    files: ['**/*.?(m|c)[jt]s?(x)'],
    rules: {
      // your custom rules
    },
  },
];
```

---

### `prettier.config.js`

```js
module.exports = require('@ovos-media/coding-standard').prettier;
```

