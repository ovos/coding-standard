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

Currently, it uses ESLint v8 and typescript-eslint v6.
The upgrade to ESLint v9 and typescript-eslint v7 is planned for the next major release.


`@ovos-media/coding-standard/eslint` exports a function that accepts an object with the following options:

- `console`: `ban`, `ban-log` or `allow` - whether to ban or allow console usage. Defaults to:
  - `ban-log` (which only allows `console.error()`, `console.warn()` and `console.info()`) when `react: true`,
  - `allow` otherwise.
- `indent` (default: `2`): number of spaces to use for indentation or `tab` for tabs
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

