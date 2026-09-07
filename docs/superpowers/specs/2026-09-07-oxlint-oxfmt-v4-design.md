# @ovos-media/coding-standard v4: oxlint + oxfmt

Status: design approved on 2026-09-07, implementation in progress on branch `v4-oxlint-oxfmt`.
Supersedes the stashed, untested v3.1.0 work (`git stash list`: "wip: v3.1.0 untested dep updates + esm switch").

Convention for this spec and for every code comment it prescribes: upstream issues and pull requests are
referenced with their full URL, never only by number, and a package or tool links to its repository on its first
mention.

## 1. Summary

v4 replaces ESLint (https://github.com/eslint/eslint) as the lint runner with oxlint 1.81
(https://github.com/oxc-project/oxc) and drops Prettier (https://github.com/prettier/prettier) as a dependency in
favour of oxfmt 0.66 (same repository), while keeping every rule the standard enforces today. ESLint disappears as
a runner but stays installed as a runtime dependency of two ESLint plugins that oxlint executes through its
JS-plugin bridge. Formatting keeps today's model: the `@stylistic` rules
(https://github.com/eslint-stylistic/eslint-stylistic) remain the enforced layer, now running under oxlint; oxfmt
and Prettier are on-demand tools whose configs the package exports.

Consumers get:

- `@ovos-media/coding-standard/oxlint`: `oxlint(options)` returning an oxlint config object, used through `extends`
- `@ovos-media/coding-standard/oxfmt`: `oxfmt(options)` returning an oxfmt config object
- `@ovos-media/coding-standard/prettier`: a Prettier options object generated from the same base as oxfmt
- the `eslint` entry point is removed

All measurements in this spec come from a private monorepo used for validation ("the validation monorepo"):
Yarn 1 without workspaces, 13 lint targets, about 6,000 ts/tsx files. On three of its packages (4,058 ts/tsx
files) the native rules alone run in 1.8 s; with every JS plugin in this spec enabled (stylistic, naming wrapper,
perfectionist, `eslint-js/camelcase`) a full run takes 19 to 24 s. The same three packages take over a minute
under their current serial ESLint setup; the largest alone takes 36 s.

## 2. Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | `@typescript-eslint/naming-convention`, `camelcase` | Keep both. naming-convention runs as the upstream rule through a 40-line wrapper that supplies empty `parserServices` (the approach of https://github.com/seek-oss/oxc-config-seek/pull/13); `camelcase` via `oxlint-plugin-eslint` (https://github.com/oxc-project/oxc, rule `eslint-js/camelcase`). |
| 2 | Baseline rule set | oxlint's `correctness` category stays on with `categories: { correctness: 'error' }`; the 17 recommended rules oxlint has but does not enable by default are listed explicitly. Errors only, no warnings, as today. |
| 2c | React Compiler rules | Behind a `reactCompiler` option, default off. |
| 3 | `no-for-in-array` | Always listed. It runs only when the consumer's root config sets `options.typeAware: true`, which needs `oxlint-tsgolint` (https://github.com/oxc-project/tsgolint). |
| 3b | Other type-aware rules | Behind a `typeChecked` option, default off: the 15 runtime-bug catchers from typescript-eslint's `recommended-type-checked` (https://github.com/typescript-eslint/typescript-eslint) plus `no-unnecessary-type-assertion`, minus the `no-unsafe-*` family and the judgement calls. |
| 4 | Named-specifier sorting | Keep `perfectionist/sort-named-imports` and `sort-named-exports` (https://github.com/azat-io/eslint-plugin-perfectionist) as a JS plugin, with the v5 `groups` option. |
| 5 | `react/jsx-no-bind` | Dropped. Not in any recommended set; every hit in the validation monorepo was suppressed inline. |
| 6c | Formatting strategy | The 42 surviving `@stylistic` rules stay the enforced layer, running under oxlint with `indent` included. oxfmt and Prettier are on-demand tools, never checked in CI. No repo-wide reformat. |
| 6a | Trailing commas | `all` in the oxfmt and Prettier exports (oxfmt's and Prettier 3's default). The stylistic `comma-dangle` rule keeps `functions: 'only-multiline'`, so both `es5`-style and `all`-style code pass lint. |
| 6b | package.json sorting | oxfmt's default (on). Consumers can disable it globally, per package via `overrides`, or via a nested config; all three verified. |
| 7 | jsx-a11y | Behind an `a11y` option, default off. oxlint's built-in plugin reports 600 findings on the three React packages of the validation monorepo. |
| 8 | Dependency model | `oxlint` and `oxfmt` are regular dependencies, like `eslint` today. `oxlint-tsgolint` is an optional peer dependency (open item 11.1, resolved). |
| - | Cypress | The `cypress` option is removed; a `playwright` option backed by `eslint-plugin-playwright` (https://github.com/mskelton/eslint-plugin-playwright) replaces it. `eslint-plugin-chai-friendly` goes with it. |
| - | Prettier in consumers | Kept as an export for on-demand use. A consumer keeps a root `prettier.config.js` importing from this package, drops `prettier` from its own dependencies, and points any code generator that runs `prettier --write` at `oxfmt` instead. |

## 3. Verified facts the design depends on

- oxlint's `extends` inherits `rules`, `plugins`, `jsPlugins`, `options` and `overrides`. Top-level `env`, `globals`,
  `settings`, `ignorePatterns` and `categories` are dropped. `env` and `globals` placed inside an `overrides` entry
  are inherited and effective. The shared config therefore expresses everything file-scoped as overrides.
- `options.typeAware` is honoured only in the consumer's root config. Inherited through `extends` into a nested
  config it is silently ignored. Type-aware rules are silent no-ops when the switch is off, so they can be listed
  unconditionally.
- Files not covered by any tsconfig (`vite.config.ts`, lint-staged configs) are skipped by type-aware rules without
  error. The v3 `disableTypeChecked` option has no equivalent because it is not needed.
- JS plugins are deduplicated by resolved file path (https://github.com/oxc-project/oxc/issues/26017). Two nested
  configs that load different copies of the same plugin make the second config fail; in the language server the
  losing packages get no diagnostics at all. Reproduced, and the fix verified: all package configs must resolve one
  copy.
- JS plugins do not support `settings` or `parserServices`. Perfectionist takes its alphabet as per-rule options.
- Disable directives for JS-plugin rules must use the oxlint rule name (`typescript-js/naming-convention`,
  `eslint-js/camelcase`). Native rules honour the `@typescript-eslint/...` spelling. A directive may list several
  names; inactive names are ignored unless unused-directive reporting is on.
- TypeScript config files need Node `^20.19.0 || >=22.18.0`. Only `.ts`, `.mts`, `.cts` and JSON are accepted.
- tsgolint 7 implements TypeScript 7 semantics: it refuses `baseUrl` and `moduleResolution: node10`
  (https://github.com/oxc-project/tsgolint/issues/351), and applies the TypeScript 6 default of `rootDir` =
  tsconfig directory. TypeScript 5.9 already supports `paths` without `baseUrl` (`"*": ["./src/*"]` keeps bare
  imports working), verified with tsc 5.9.3.
- oxfmt output is identical to Prettier 3.9.6 output for the same options on JS/TS. In the validation monorepo,
  1,003 of one package's 1,319 files differ from both, i.e. that codebase was never Prettier-clean. oxfmt output
  passes all stylistic rules except generator spacing (see 11.3).
- `@stylistic/eslint-plugin` 6.0.0-beta.6 declares oxlint as a peer and runs under it. `func-call-spacing` is now
  `function-call-spacing`; `jsx-props-no-multi-spaces` was folded into `no-multi-spaces`. v6's `indent` reports 86
  auto-fixable findings on the three packages that v5 accepts (multi-line assignment continuations, nested
  conditional types, arrow-function bodies our `ignoredNodes` used to hide).
- `eslint-plugin-mocha` 12 (https://github.com/lo1tuma/eslint-plugin-mocha) imports `eslint` at runtime, and so
  does perfectionist through `@typescript-eslint/utils`, so `eslint` stays a dependency (see
  https://github.com/oxc-project/oxc/issues/17734).
- `radix` in ESLint 10 no longer accepts `as-needed`; oxlint's native rule still does.
- Performance, three packages, warm: native 1.8 s; + `eslint-js/camelcase` no change; + perfectionist 3.0 s;
  + naming wrapper 9.0 s; + stylistic with `indent` 13 to 14 s; `oxfmt --check` alone 1.5 s; type-aware mode on a
  1,125-file program 1.9 s against 0.6 to 1.0 s. Startup per CLI invocation with all JS plugins: about 1 s.

## 4. Package

- ESM only, `"type": "module"`, TypeScript source compiled with `tsc` as today, declarations emitted.
- `engines.node`: `^20.19.0 || >=22.18.0`.
- `exports`: `.` (re-exports `oxlint`, `oxfmt`, `prettier`), `./oxlint`, `./oxfmt`, `./prettier`, and
  `./plugins/*` for the plugin entry files that the config references by absolute path.
- `files`: the compiled `dist` only.

### 4.1 Dependencies

Regular dependencies, all at today's latest: `oxlint` ^1.81.0, `oxfmt` ^0.66.0, `oxlint-plugin-eslint` ^1.81.0,
`@stylistic/eslint-plugin` 6.0.0-beta.6 (see 11.2), `eslint-plugin-perfectionist` ^5.11.0,
`eslint-plugin-mocha` ^12.0.2, `eslint-plugin-playwright` ^2.11.0, `@typescript-eslint/eslint-plugin` ^8.69.0
(for the naming wrapper), `eslint` ^10.9.1 (runtime requirement of eslint-plugin-mocha and typescript-eslint).

`oxlint` and `oxfmt` ranges are bumped deliberately in this package: under `correctness: 'error'` a new default-on
rule in an oxlint release is a new error in every consumer.

Removed from v3: `@typescript-eslint/parser`, `@typescript-eslint/utils`, `@vitest/eslint-plugin`,
`eslint-import-resolver-*`, `eslint-plugin-import-x`, `eslint-plugin-react`, `eslint-plugin-react-hooks`,
`eslint-plugin-jest`, `eslint-plugin-cypress`, `eslint-plugin-chai-friendly`, `eslint-plugin-check-file`,
`globals`, `@eslint/js`. `prettier` is no longer a dependency at all; the export is typed inline.

`oxlint-tsgolint`: optional peer dependency (`peerDependenciesMeta`), documented next to the root switch.

### 4.2 `oxlint(options)`

```ts
type Options = {
  console?: 'ban' | 'ban-log' | 'allow';   // as v3; default 'ban-log' when react, else 'allow'
  indent?: number | 'tab';                  // default 2; drives stylistic/indent and jsx-indent-props
  testsDir?: string;                        // default '{spec,test,tests}'
  jest?: boolean;
  mocha?: boolean;
  playwright?: boolean;                     // replaces cypress
  react?: boolean;
  vitest?: boolean;
  reactCompiler?: boolean;                  // default false
  typeChecked?: boolean;                    // default false
  a11y?: boolean;                           // default false
};
```

Removed: `cypress`, `disableTypeChecked`.

Returns a plain config object suitable for `defineConfig({ extends: [oxlint(opts)] })` or
`defineConfig(oxlint(opts))`.

### 4.3 Config shape

- `plugins`: `eslint`, `typescript`, `unicorn`, `oxc`, `import`, plus `react` when `react`, `jest` when `jest`,
  `vitest` when `vitest`, `jsx-a11y` when `a11y`.
- `categories: { correctness: 'error' }`.
- `jsPlugins`, each resolved to an absolute file path with `fileURLToPath(import.meta.resolve(...))` from inside
  this package: `stylistic`, `perfectionist`, `eslint-js` (oxlint-plugin-eslint), `typescript-js` (this package's
  naming wrapper), `mocha` when `mocha`, `playwright` when `playwright`.
- `rules`: everything file-independent.
- `overrides`, in order:
  1. `**/*` with `env: { node: true }` (the v3 default globals) and rules that apply to all files.
  2. `**/*.{ts,mts,cts,tsx}`: the typescript-eslint recommended overrides as today, `typescript-js/naming-convention`,
     `typescript/ban-tslint-comment`, `typescript/no-for-in-array`, the `typeChecked` tier when on.
  3. `**/*.{js,mjs,cjs,jsx}`: `eslint-js/camelcase` and the js-only extras from v3.
  4. `**/*.{jsx,tsx}` when `react`: `env: { browser: true }`, react rules, stylistic jsx rules,
     `unicorn/filename-case` PascalCase with `ignore` for `index` and `routes`; then a second override for
     `**/{use,with}*.{jsx,tsx}` with camelCase (replaces check-file; the `.less` naming rule of v3 never ran).
  5. `**/*.tsx` when `react`: `no-empty-object-type` with `allowWithName: 'Props$'` as today.
  6. Test files for `jest` / `vitest` / `mocha` / `playwright`, using the v3 globs converted to brace form:
     `${testsDir}/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`, `**/__tests__/**/*...`, `**/*.{spec,test}.*`.
     jest: `env: { jest: true }` plus the `DB`, `GQL`, `Setup`, `app` globals, oxlint's jest rules with the v3
     tweaks. vitest: `env: { vitest: true }`, same tweaks. mocha: `env: { mocha: true }`, eslint-plugin-mocha
     recommended with the v3 tweaks, `prefer-arrow-callback` off in favour of `mocha/prefer-arrow-callback`.
     playwright: `flat/recommended` with `no-skipped-test`, `expect-expect` and `no-conditional-expect` off,
     mirroring the jest tweaks.
  7. `mocha` helper-file exemption (`${testsDir}/**/_*`, `*.skip.*`) as today.

`ignorePatterns` cannot be shared; consumers rely on `.gitignore` and their own patterns, as they already do.

### 4.4 Rule mapping

- ESLint core and typescript-eslint rules from v3: all native, same options. `radix` keeps `as-needed`.
  `import/no-duplicates` uses `preferInline: true`.
- `@stylistic`: the 42 rules from v3 as `stylistic/*`, same options, `func-call-spacing` renamed to
  `function-call-spacing`, `jsx-props-no-multi-spaces` dropped, `generator-star-spacing` and `yield-star-spacing`
  switched to `after` (11.3). `jsx-self-closing-comp` and `jsx-curly-brace-presence` move to their native `react/`
  equivalents.
- `import/order`: dropped as a lint rule; the oxfmt export sorts import declarations with the same groups
  (`builtin, external, internal, parent, [sibling, index]`, `internalPattern: ['~']`). Under 6c this is on-demand
  only; see 11.5.
- `perfectionist`: `sort-named-imports` with `{ type: 'custom', alphabet, ignoreCase: false, ignoreAlias: true,
  groups: ['type-import', 'value-import'] }`, `sort-named-exports` likewise with `type-export`, `value-export`.
- `react`: oxlint's native plugin replaces eslint-plugin-react recommended (`prop-types` does not exist and was
  buggy), `react-hooks/rules-of-hooks` and `exhaustive-deps` as today, `jsx-no-useless-fragment` with
  `allowExpressions`. The 12 React Compiler rules (`static-components`, `use-memo`, `void-use-memo`,
  `preserve-manual-memoization`, `incompatible-library`, `immutability`, `globals`, `refs`, `set-state-in-effect`,
  `error-boundaries`, `purity`, `set-state-in-render`) are off unless `reactCompiler`, then at upstream severities
  promoted to error.
- Type-aware: `typescript/no-for-in-array` always on. `typeChecked` adds `no-floating-promises`,
  `no-misused-promises`, `await-thenable`, `no-base-to-string`, `no-implied-eval`, `no-misused-spread`,
  `no-array-delete`, `no-unsafe-unary-minus`, `require-array-sort-compare`, `restrict-plus-operands`,
  `prefer-promise-reject-errors`, `only-throw-error`, `no-unsafe-enum-comparison`, `switch-exhaustiveness-check`,
  `use-unknown-in-catch-callback-variable`, `no-unnecessary-type-assertion`. Every other type-aware rule in oxlint's
  default set (`unbound-method`, `no-useless-default-assignment`, `restrict-template-expressions`, ...) is set to
  off explicitly so `correctness: 'error'` cannot pull it in.
- `a11y`: oxlint's `jsx-a11y` plugin with its default rules.
- `unicorn` and `oxc` correctness rules: on, as errors, from the category.

### 4.5 Naming-convention wrapper (`./plugins/typescript.ts`)

Loads the upstream rule module by absolute path (`<plugin dir>/dist/rules/naming-convention.js`, resolved from
`@typescript-eslint/eslint-plugin/package.json`; the package's `exports` map blocks the bare specifier but not a
filesystem path) and wraps `create` so `context.sourceCode.parserServices` is `{ esTreeNodeToTSNodeMap: new Map(),
tsNodeToESTreeNodeMap: new Map(), program: null }`. Exposed as plugin `typescript-js`. Our five selectors never use
the `types` option, the only part of the rule that needs a checker. Verified identical to ESLint on fixtures and on
the validation monorepo with the disable directives renamed. Loading the single module instead of the
`use-at-your-own-risk/rules` index cuts startup from about 0.7 s to about 0.5 s per invocation.

The file must carry a comment with the following, so the trade-off is visible where it is paid:

- what the stub does and why it is safe (no `types` option in our selectors);
- startup cost: about 0.5 s per CLI invocation, because the rule module loads 580 modules including the 9 MB
  TypeScript compiler, `@typescript-eslint/scope-manager`, ESLint's own modules, ajv and semver; paid once per
  lint-staged commit, editor session or CI run;
- per-file cost: about 1.8 ms, roughly 7 s per 4,000 ts files, because the rule resolves scope for every matched
  name to compute modifiers (`unused`, `global`) regardless of the configured selectors; not tunable from our side;
- the private-path dependency and the test that guards it;
- the alternative and when to take it: an in-house AST-only rule for the five selectors (spiked in September 2026:
  100 to 150 lines, about 0.2 ms per file, no typescript-eslint dependency, but semantics owned by us; the spike
  diverged from upstream on quoted keys, function-typed properties and underscore defaults before those were
  pinned), worth switching to only if the 10 s per full run starts to matter;
- the exit for both: tsgolint's native `typescript/naming-convention`
  (https://github.com/oxc-project/tsgolint/issues/186, implementations proposed in
  https://github.com/oxc-project/tsgolint/pull/1075 and https://github.com/oxc-project/tsgolint/pull/1167), which
  needs type-aware mode; on arrival delete this file, switch the rule name, rename the disable directives back.

### 4.6 Perfectionist (`sort-named-imports`, `sort-named-exports`)

Kept as a JS plugin for feature parity: types-first grouping, the custom alphabet (`_-.@/#~$0-9A-Za-z`,
uppercase before lowercase), `ignoreAlias`, and export sorting. On the three measured packages perfectionist v5
reports zero import findings; its export findings are all `export { up, down }` migration files that the consumer
already exempts, so the switch is churn-free.

The file that registers the plugin must carry a comment with:

- cost: about 1.2 s per 4,000 files and 0.3 s of startup per invocation, and the dependency tree it keeps in the
  package: `eslint` (required at runtime through `@typescript-eslint/utils`, verified: the plugin fails to load
  without it), `@typescript-eslint/utils`, `typescript-estree`, `scope-manager`. Without perfectionist, and with
  the naming wrapper and eslint-plugin-mocha gone, the package needs neither `eslint` nor typescript-eslint
  (verified: stylistic, oxlint-plugin-eslint and eslint-plugin-playwright load with both absent);
- rejected alternatives and why: oxlint's native `eslint/sort-imports` (members in plain character order, no
  types-first, no export sorting, 79 files re-sorted on three packages); the `@longzai-intelligence` oxlint port
  (`UNLICENSED`, two rules, no `sort-named-exports`, no repository);
- possible future actions and their gains: (a) two in-house rules in this package's plugin with the same options,
  about 80 to 100 lines, exact parity, zero dependencies, the only way to an eslint-free package while keeping
  enforcement; (b) oxfmt's planned `sortNamedImports` (https://github.com/oxc-project/oxc/issues/23456, open since
  2026-06-15, proposes `groupKind: 'types-first'`, `ignoreAlias`, `ignoreCase`; no implementation yet), and the
  wider "full perfectionist support by oxfmt" (https://github.com/oxc-project/oxc/issues/22521, open; the first
  attempt, https://github.com/oxc-project/oxc/pull/26211, was closed unmerged on 2026-09-02); under the
  stylistic-under-oxlint model those are on-demand formatting, not enforcement, so they replace this rule only if
  formatting enforcement moves to oxfmt; related: https://github.com/oxc-project/oxc/issues/22856 (type versus
  value tiebreak), https://github.com/oxc-project/oxc/issues/13610 (sorting umbrella),
  https://github.com/oxc-project/oxc/issues/19984 (declaration sorting in oxfmt),
  https://github.com/oxc-project/oxc/issues/17734 (JS plugins depending on `eslint`);
- upstream support status: perfectionist tests its rules under oxlint's RuleTester in its own CI since
  https://github.com/azat-io/eslint-plugin-perfectionist/pull/726 (merged 2026-03-24); the TypeScript 7 crash in
  `sort-imports` (https://github.com/azat-io/eslint-plugin-perfectionist/issues/757) was fixed before 5.11.0.

### 4.7 `oxfmt(options)` and `prettier`

One base object: `printWidth: 100`, `singleQuote: true`, `trailingComma: 'all'`, `tabWidth` / `useTabs` from
`indent`. The oxfmt export adds `sortImports` (groups above, `ignoreCase: true`, `newlinesBetween: true`) and leaves
`sortPackageJson` at its default. The Prettier export is the base object only. Consumers override with the spread
form, `overrides`, or a nested config; oxfmt has no `extends`.

## 5. Consumer usage

```ts
// packages/app/oxlint.config.ts
import { defineConfig } from 'oxlint';
import { oxlint } from '@ovos-media/coding-standard';

export default defineConfig({
  extends: [oxlint({ react: true, vitest: true })],
  ignorePatterns: ['public', 'build'],
  rules: { 'no-restricted-imports': ['error', { /* project-specific */ }], 'react-hooks/exhaustive-deps': 'off' },
  overrides: [{ files: ['**/*.stories.tsx'], rules: { /* package-specific */ } }],
});
```

```ts
// oxfmt.config.ts and prettier.config.js at the repo root
import { defineConfig } from 'oxfmt';
import { oxfmt } from '@ovos-media/coding-standard';
export default defineConfig(oxfmt());

import { prettier } from '@ovos-media/coding-standard';
export default prettier;
```

Monorepo rules, all verified:

- Install this package once at the root, never per package. Package configs import it by name and Node resolution
  walks up. This is what keeps every nested config on one copy of each JS plugin
  (https://github.com/oxc-project/oxc/issues/26017). Package-specific plugins (storybook, playwright) are
  unaffected.
- One `oxlint` run from the root discovers all nested `oxlint.config.ts` files and lints everything in one process.
  Per-package `lint` scripts call the root binary.
- `options: { typeAware: true }` goes in the root config only, once the tsconfigs are TypeScript 7 clean.
- Scripts: `"lint": "oxlint"`, `"lint:fix": "oxlint --fix"`; lint-staged: `'*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}':
  'oxlint --fix'`. No `oxfmt --check` under 6c.
- Editors: the oxc VS Code extension `oxc.oxc-vscode` (https://github.com/oxc-project/oxc-vscode) for diagnostics,
  quick fixes and on-demand or selection formatting; the official JetBrains plugin
  (https://github.com/oxc-project/oxc-intellij-plugin) for IntelliJ and WebStorm.

## 6. Migrating a monorepo consumer

Two steps before the switch, then the switch:

1. **tsconfig cleanup** (mergeable on its own, TypeScript 5.9 compatible): remove `baseUrl` and re-root `paths`
   (`"*": ["./src/*"]`, `"~shared/*": ["../shared/src/*"]`), set `rootDir` explicitly where the output layout
   relies on inference or where a package includes files from a sibling (`".."`), replace
   `moduleResolution: node10` with `bundler`, consider explicit `types` per package.
   `@andrewbranch/ts5to6 --fixBaseUrl --fixRootDir` (https://github.com/andrewbranch/ts5to6) automates most of
   it. Validate with each package's `tsc --noEmit`, any `tsconfig-paths` runtime usage, and an
   `oxlint --type-aware` sweep reporting zero `tsconfig-error`.
2. **coding-standard 4.0.0** released.
3. **switch**: Node 22.18+ (or 24), install this package at the root only and remove it from package-level
   `package.json` files, replace every `eslint.config.js` with `oxlint.config.ts`, root `oxfmt.config.ts` and
   `prettier.config.js` importing from the package, drop `prettier` and the ESLint plugins from dependencies,
   point code generators that run `prettier --write` at `oxfmt`, replace any serial per-package lint runner with a
   single root `oxlint` (JSON output via `-f json` for CI reporting), lint-staged to `oxlint --fix`, rename disable
   directives (`@typescript-eslint/naming-convention` gets `typescript-js/naming-convention` added alongside;
   `camelcase` becomes `eslint-js/camelcase`; `react/jsx-no-bind` directives removed), run `oxlint --fix` for the
   stylistic v6 findings and the perfectionist v5 reorders, flip `typeAware` on at the root.

## 7. Testing in this repo

- `node --test` with oxlint's `RuleTester` (`oxlint/plugins-dev`) for the naming wrapper: valid and invalid cases
  for the five selectors, quoted keys, function-typed properties, leading underscores.
- Fixture smoke tests: fixture trees per option combination, `oxlint --config <generated config> fixtures`,
  asserting the expected diagnostics (rule name, file, line) and nothing else, run through the built package.
- A test that every JS-plugin path in the generated config resolves to a file inside this package.
- oxfmt and Prettier config snapshots.
- `tsc` build plus a check that the exports map matches `dist`.

## 8. Validation before release

Build, `yalc publish`, install into a real consumer on top of its tsconfig cleanup, apply the switch steps, run
`oxlint` from the root and compare findings package by package against the consumer's current ESLint output.
Record every difference and its cause (renamed directive, v6 stylistic change, new correctness rule) before
tagging.

## 9. Performance budget

Repo-wide (about 6,000 ts/tsx files), measured on the validation monorepo: native rules 2.1 to 2.3 s from the
root; with all JS plugins 31 s from the root, 47 s as the sum of per-package runs (about 1 s of plugin startup per
invocation). Against 120 s for the serial ESLint setup it replaces, and instant per file in the editor.

## 10. Out of scope, later minors

- Replace the naming wrapper with tsgolint's native `naming-convention` when it lands; it will need type-aware mode.
- `typeChecked: 'strict'` adding the `no-unsafe-*` family once `no-explicit-any` is turned on.
- Turning `reactCompiler` and `a11y` on in consumers.
- Trimming `stylistic/indent`'s `ignoredNodes` now that v6 handles arrows.
- An eslint-free package: in-house replacements for the naming wrapper, perfectionist's two rules and
  eslint-plugin-mocha, each with fixture-proven parity (sections 4.5 and 4.6).

## 11. Open items, resolved for implementation

1. `oxlint-tsgolint`: optional peer dependency, so consumers that never enable type-aware mode do not install 21 MB.
2. Stylistic: `6.0.0-beta.6`, the version that targets oxlint. Consumers fix its 86-style findings with `--fix`.
3. `generator-star-spacing` and `yield-star-spacing` switched to `after`, matching oxfmt and Prettier output so
   on-demand formatting cannot produce lint errors; auto-fixable.
4. `comma-dangle` for functions stays `only-multiline`, accepting both styles.
5. Import declaration order is enforced only by on-demand oxfmt; accepted.
6. `reportUnusedDisableDirectives` off in v4, so dual-name directives during the transition are not reported.
7. oxfmt on directory runs formats every supported file type; the README documents js/ts-only `ignorePatterns` as
   the starting point.
