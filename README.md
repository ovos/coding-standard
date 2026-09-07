# @ovos-media/coding-standard

Shared [oxlint](https://github.com/oxc-project/oxc) and [oxfmt](https://github.com/oxc-project/oxc) configuration,
plus a [Prettier](https://github.com/prettier/prettier) options object for projects that format on demand.

## Install

```sh
npm install --save-dev @ovos-media/coding-standard
# or
yarn add --dev @ovos-media/coding-standard
```

| Requirement | Value | Why |
|---|---|---|
| Node.js | `^20.19.0 \|\| >=22.18.0` | oxlint loads `oxlint.config.ts` through Node's type stripping |
| `oxlint`, `oxfmt` | installed by this package | regular dependencies, one install gets the runners |
| `oxlint-tsgolint` | optional peer, `>=7.0.2001` | only for type-aware rules, see below |

## `oxlint.config.ts`

```ts
import { defineConfig } from 'oxlint';
import { oxlint } from '@ovos-media/coding-standard';

export default defineConfig({
  extends: [oxlint({ react: true, vitest: true })],
  // your project's additions
  ignorePatterns: ['public', 'build'],
  rules: {
    'react-hooks/exhaustive-deps': 'off',
  },
  overrides: [
    { files: ['**/*.stories.tsx'], rules: { 'react/display-name': 'off' } },
  ],
});
```

`oxlint(options)` returns a plain config object. Use it through `extends`; everything file-scoped (environments,
globals, per-language rules) is inside `overrides`, so nothing is lost on the way.

| Option | Type | Default | Effect |
|---|---|---|---|
| `console` | `'ban' \| 'ban-log' \| 'allow'` | `'ban-log'` with `react`, else `'allow'` | `ban-log` allows `console.error`, `console.warn`, `console.info` |
| `indent` | `number \| 'tab'` | `2` | indentation checked by `stylistic/indent` and `stylistic/jsx-indent-props` |
| `testsDir` | `string` | `'{spec,test,tests}'` | where test files live; `__tests__` folders and `*.spec.*` / `*.test.*` files count anywhere |
| `jest` | `boolean` | `false` | jest rules and globals for test files |
| `vitest` | `boolean` | `false` | vitest rules and globals for test files |
| `mocha` | `boolean` | `false` | [eslint-plugin-mocha](https://github.com/lo1tuma/eslint-plugin-mocha) recommended rules for test files |
| `playwright` | `boolean` | `false` | [eslint-plugin-playwright](https://github.com/mskelton/eslint-plugin-playwright) recommended rules for test files |
| `react` | `boolean` | `false` | react and react-hooks rules, jsx layout rules, PascalCase component files (`use*` / `with*` camelCase) |
| `reactCompiler` | `boolean` | `false` | the 12 React Compiler rules (`react/immutability`, `react/purity`, `react/refs`, ...) as errors |
| `typeChecked` | `boolean` | `false` | type-aware runtime-bug catchers (`no-floating-promises`, `no-misused-promises`, ...) |
| `a11y` | `boolean` | `false` | oxlint's built-in `jsx-a11y` rules |

Every rule is an error. Warnings are not used.

### Type-aware rules

`typescript/no-for-in-array` is always configured, `typeChecked` adds 16 more. They run only when the **root**
config of the project enables type-aware mode and `oxlint-tsgolint` is installed:

```ts
// root oxlint.config.ts only; oxlint ignores this option in nested configs
export default defineConfig({
  extends: [oxlint()],
  options: { typeAware: true },
});
```

tsgolint implements TypeScript 7 semantics. Projects must not use `baseUrl` or `moduleResolution: node10`, and
`rootDir` defaults to the tsconfig's directory. [ts5to6](https://github.com/andrewbranch/ts5to6) automates the
tsconfig changes; TypeScript 5.9 accepts them.

## `oxfmt.config.ts` and `prettier.config.js`

```ts
import { defineConfig } from 'oxfmt';
import { oxfmt } from '@ovos-media/coding-standard';

export default defineConfig(oxfmt());
// with overrides: oxfmt has no `extends`, spread instead
export default defineConfig({ ...oxfmt({ indent: 4 }), sortPackageJson: false });
```

```js
import { prettier } from '@ovos-media/coding-standard';

export default prettier;
```

Both exports share one base: `printWidth: 100`, `singleQuote`, `trailingComma: 'all'`, indent from the option.
The oxfmt export also sorts import declarations (builtin, external, `~` aliases, parent, sibling and index).
Formatting is enforced by the `stylistic/*` lint rules; oxfmt and Prettier are on-demand tools whose output
passes those rules. Per-directory formatting differences go through oxfmt `overrides` or a nested
`oxfmt.config.ts`.

## Monorepos

- Install this package **once, at the root**, never per package. Package configs import it by name; Node resolves
  upwards. oxlint deduplicates JS plugins by file path and rejects a second copy of the same plugin
  ([oxc #26017](https://github.com/oxc-project/oxc/issues/26017)); with one install there is one copy.
- Each package keeps its own `oxlint.config.ts` extending the shared config with its own ignores, rules and
  overrides. One `oxlint` run from the root discovers every nested config.
- `options: { typeAware: true }` goes into the root config only.

```json
{
  "scripts": {
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "format": "oxfmt"
  },
  "lint-staged": {
    "*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}": "oxlint --fix"
  }
}
```

## Editors

- VS Code and Cursor: [oxc.oxc-vscode](https://github.com/oxc-project/oxc-vscode). Diagnostics, quick fixes,
  `source.fixAll.oxc` on save, formatting on demand, on selection or on save.
- IntelliJ and WebStorm: [oxc-intellij-plugin](https://github.com/oxc-project/oxc-intellij-plugin).

## Migrating from v3

| v3 | v4 |
|---|---|
| `@ovos-media/coding-standard/eslint` | removed; `@ovos-media/coding-standard/oxlint` |
| `eslint.config.js` | `oxlint.config.ts` |
| `cypress: true` | removed; `playwright: true` |
| `disableTypeChecked` | removed; files outside every tsconfig are skipped by type-aware rules |
| `indent` | still on `oxlint()`, also on `oxfmt()` |
| `trailingComma: 'es5'` in the Prettier export | `'all'`; the `comma-dangle` lint rule accepts both styles |
| `@stylistic/*` rules | same rules, `stylistic/*` under oxlint; `jsx-self-closing-comp` and `jsx-curly-brace-presence` became `react/*` |
| `@stylistic/generator-star-spacing`, `yield-star-spacing` | now `after` (`function* f`), what oxfmt and Prettier print |
| `import/order` | oxfmt's `sortImports`, on demand |
| `react/jsx-no-bind` | removed |
| `check-file/filename-naming-convention` | `unicorn/filename-case` in the react overrides |

Disable directives for rules that moved to JS plugins need the oxlint name; native rules keep accepting the
`@typescript-eslint/` spelling. A directive may list both names during a transition.

| ESLint directive | oxlint directive |
|---|---|
| `eslint-disable @typescript-eslint/naming-convention` | `eslint-disable typescript-js/naming-convention` |
| `eslint-disable camelcase` | `eslint-disable eslint-js/camelcase` |
| `eslint-disable react/jsx-no-bind` | remove |
| `eslint-disable @typescript-eslint/no-explicit-any` | unchanged |

## Dependencies, and what an eslint-free package would take

oxlint has no equivalent for three things this standard enforces. They run as ESLint plugins through oxlint's
JS-plugin bridge, and they are what keeps `eslint` and typescript-eslint in the dependency tree:

| Feature | Runs as | Keeps in the tree | Cost on 4,000 files |
|---|---|---|---|
| `@typescript-eslint/naming-convention` | this package's wrapper around the upstream rule, [src/plugins/typescript.ts](src/plugins/typescript.ts) | `@typescript-eslint/eslint-plugin` and its tree, `eslint` | about 7 s, 0.5 s per start |
| `perfectionist/sort-named-imports`, `sort-named-exports` | [eslint-plugin-perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist), see [src/oxlint/plugins.ts](src/oxlint/plugins.ts) | `@typescript-eslint/utils`, `eslint` | about 1.2 s, 0.3 s per start |
| mocha rules | [eslint-plugin-mocha](https://github.com/lo1tuma/eslint-plugin-mocha) | `eslint` | negligible |

Dropping them without losing a single check means, in this order:

1. An in-house `naming-convention` rule for the five selectors in use (function, method, objectLiteralMethod,
   typeLike, import), AST-only, with fixtures pinning quoted keys, function-typed properties and underscore
   handling to upstream behaviour. About 100 to 150 lines. Or wait for tsgolint's native rule
   ([tsgolint #186](https://github.com/oxc-project/tsgolint/issues/186)), which will need type-aware mode.
2. In-house `sort-named-imports` and `sort-named-exports` with the same options (types first, custom alphabet,
   `ignoreAlias`), about 80 to 100 lines. oxfmt may grow this ([oxc #23456](https://github.com/oxc-project/oxc/issues/23456)),
   but as formatting, not as an enforced rule.
3. mocha rules on oxlint's native `jest` plugin: covers focused tests, identical titles, async suites, duplicate
   hooks, exports and pending tests; loses the `done`-callback rules and `no-mocha-arrows`.

After all three, `eslint`, `@typescript-eslint/*` and `eslint-plugin-mocha` leave the tree; `@stylistic`,
`oxlint-plugin-eslint` and `eslint-plugin-playwright` load without them.

## Development

```sh
npm test        # build, unit tests, CLI smoke tests over test/fixtures
npm run lint    # this repository with its own config (build first)
```
