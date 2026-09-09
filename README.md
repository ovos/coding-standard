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
| `oxlint`, `oxfmt`, `oxlint-tsgolint` | installed by this package | regular dependencies, one install gets the runners and the type-aware engine |
| tsconfig files | valid under TypeScript 6/7 semantics | tsgolint refuses `baseUrl` and `moduleResolution: node10`, see below |

## `oxlint.config.ts`

```ts
import { defineConfig } from 'oxlint';
import { oxlint } from '@ovos-media/coding-standard';

export default defineConfig({
  extends: [oxlint({ react: true, vitest: true })],
  // your project's additions
  ignorePatterns: ['public', 'build'],
  rules: {
    'no-restricted-imports': ['error', { paths: ['lodash'] }],
  },
  overrides: [
    { files: ['**/*.{jsx,tsx}'], plugins: ['react'], rules: { 'react-hooks/exhaustive-deps': 'off' } },
    { files: ['**/*.stories.tsx'], plugins: ['react'], rules: { 'react/display-name': 'off' } },
    { files: ['src/legacy/**'], rules: { 'typescript/no-namespace': 'off' } },
  ],
});
```

`oxlint(options)` returns a plain config object. Use it through `extends`; everything file-scoped (environments,
globals, per-language rules) is inside `overrides`, so nothing is lost on the way.

Two oxlint rules of thumb for your own additions:

- The shared config sets its rules inside overrides (all files, ts files, jsx files, test files), and oxlint
  applies overrides after top-level `rules`. A rule the shared config sets can only be changed by an override of
  your own with matching `files`. Top-level `rules` are for rules the shared config does not touch, such as
  `no-restricted-imports`.
- The react, jest and vitest plugins are enabled inside the jsx and test-file overrides, so their rules apply to
  those files only, as in v3 (a hook in `useThing.ts` is not checked by `react-hooks/*`, a helper in `src/` not by
  `jest/*`). oxlint resolves an override's rules against the plugins listed in that override, so an override of
  yours that changes a `react/*`, `react-hooks/*`, `jest/*` or `vitest/*` rule must list the plugin too, as the
  first two overrides above do. Without it the rule is dropped without a message.

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

Type-aware linting is on out of the box, as it was in v3: `typescript/no-for-in-array` runs on every ts file,
`typeChecked` adds 16 more rules. The engine is [oxlint-tsgolint](https://github.com/oxc-project/tsgolint), a
dependency of this package; the shared config carries `options: { typeAware: true }` into your root config
through `extends`, which is the only place oxlint reads it, and points oxlint at the installed tsgolint binary
(`OXLINT_TSGOLINT_PATH`, set only when you have not set it) so the copy is found wherever the package manager
put it. Cost measured on 6,000 files: about 5 s per full run on top of the native rules.

To turn it off, in the root config only:

```ts
export default defineConfig({ extends: [oxlint()], options: { typeAware: false } });
```

tsgolint implements TypeScript 7 semantics. Projects must not use `baseUrl` or `moduleResolution: node10`, and
`rootDir` defaults to the tsconfig's directory; a tsconfig that violates this fails the run with
`tsconfig-error` diagnostics. [ts5to6](https://github.com/andrewbranch/ts5to6) automates the changes; TypeScript
5.9 accepts them. Files outside every tsconfig are skipped by the type-aware rules without error.

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
- Type-aware mode comes from the root config's `extends`; nested configs inherit the option too and oxlint
  ignores it there, so nothing extra is needed per package.
- `ignorePatterns` belong to the config that governs a file: they are not inherited through `extends`, and the
  root config's patterns do not reach files under a package with its own config. v3's mocha block ignored
  `__snapshots__` directories; a package with snapshot files adds `ignorePatterns: ['**/__snapshots__']` itself.

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
| `{ rules: { 'react-hooks/exhaustive-deps': 'off' } }` as a config block | `overrides: [{ files: ['**/*.{jsx,tsx}'], plugins: ['react'], rules: { ... } }]`, see above |
| `ignores: ['__snapshots__']` in the mocha block | `ignorePatterns: ['**/__snapshots__']` in the package config |
| `cypress: true` | removed; `playwright: true` |
| `disableTypeChecked` | removed; files outside every tsconfig are skipped by type-aware rules |
| `projectService: true` (type information always on) | `oxlint-tsgolint` installed by this package, switched on through `extends`; `no-for-in-array` keeps running everywhere |
| `indent` | still on `oxlint()`, also on `oxfmt()` |
| `trailingComma: 'es5'` in the Prettier export | `'all'`; the `comma-dangle` lint rule accepts both styles |
| `@stylistic/*` rules | same rules, `stylistic/*` under oxlint; `jsx-self-closing-comp` and `jsx-curly-brace-presence` became `react/*` |
| `@stylistic/generator-star-spacing`, `yield-star-spacing` | now `after` (`function* f`), what oxfmt and Prettier print |
| `import/order` | oxfmt's `sortImports`, on demand |
| `react/jsx-no-bind` | removed |
| `react/prop-types`, `react/no-deprecated` | not implemented by oxlint; the rest of eslint-plugin-react recommended is |
| `check-file/filename-naming-convention` | same rule and globs, [eslint-plugin-check-file](https://github.com/dukeluo/eslint-plugin-check-file) 2.x to 3.3 as a JS plugin; acronyms (`AIPanel.tsx`) stay valid, a camelCase `.tsx` file that 2.x let through is reported |
| `radix: ['error', 'as-needed']` (js files) | removed. ESLint 10 deprecated the option and always requires a radix ([eslint #19916](https://github.com/eslint/eslint/issues/19916)), oxlint 1.49 followed; the opposite of v3. Add `radix: 'error'` if wanted |
| `@stylistic/jsx-props-no-multi-spaces` | not configured; it crashes under oxlint's plugin bridge on some files and v6 removes it |
| `@stylistic/eslint-plugin` `^3.0.1` | `^5.10.0`; `indent` reports a few constructs v3 accepted (`=` followed by a line break before `!x && (`, members of an object type in a return type indented one level deeper), all auto-fixable |
| `unicorn/no-thenable` (new in oxlint's correctness set) | off: `then` is also the JSON Schema keyword |
| `no-unreachable`, `no-unsafe-optional-chaining` | now checked in ts files too. typescript-eslint's `eslint-recommended` preset turned `no-unreachable` off for ts files; TypeScript does not report it either |

Disable directives for rules that moved to JS plugins need the oxlint name; native rules keep accepting the
`@typescript-eslint/` spelling. A directive may list both names during a transition.

| ESLint directive | oxlint directive |
|---|---|
| `eslint-disable @typescript-eslint/naming-convention` | `eslint-disable typescript-js/naming-convention` |
| `eslint-disable camelcase` | `eslint-disable eslint-js/camelcase` |
| `eslint-disable @stylistic/key-spacing` (any `@stylistic/*`) | `eslint-disable stylistic/key-spacing` |
| `eslint-disable mocha/no-global-tests` | `eslint-disable mocha/no-top-level-tests` (renamed in eslint-plugin-mocha 11) |
| `eslint-disable react/jsx-no-bind` | remove |
| `eslint-disable @typescript-eslint/no-explicit-any` | unchanged |
| `/* eslint no-console: ["error", { "allow": ["debug"] }] */` (inline rule configuration) | not supported by oxlint; use a disable directive or an override in the config |

Two rules report at a different line than ESLint did, so an existing `eslint-disable-next-line` may no longer
cover them: `no-useless-catch` is reported at the `catch` clause (ESLint: at `try`), `prefer-const` at the `let`
declaration (ESLint: at the assignment).

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
`oxlint-plugin-eslint`, `eslint-plugin-check-file` and `eslint-plugin-playwright` load without them.

## Development

```sh
npm test                # build, unit tests, CLI smoke tests, parity with v3
npm run lint            # this repository with its own config (build first)
npm run parity:update   # rewrite test/parity/v4/*.json after a deliberate rule change, then review the diff
```

The smoke tests run the CLI over `test/fixtures/*` through a consumer-style `oxlint.config.ts` with
`extends: [oxlint(options)]`, node_modules links and no flags, so what the README describes is what is tested.

Parity with v3 is machine-checked: `test/parity/v3-rules.json` is the rule set v3 resolved for representative
files per option (ESLint `--print-config`, regenerated by `scripts/generate-v3-baseline.mjs`), and
`src/parity.test.ts` fails when a rule v3 enforced is neither enforced by v4 under its oxlint name nor listed
in `test/parity/dropped.json` with a reason. `test/parity/v4/*.json` snapshot what v4 resolves, including
what oxlint's `correctness` category adds, so an oxlint upgrade that moves a rule is a reviewable diff.
