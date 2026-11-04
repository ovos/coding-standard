# ADR 1: oxlint and oxfmt replace ESLint and Prettier

- Status: accepted, for v4.0.0
- Date: 2026-11-04. Designed in September 2026, decided in detail during review in October 2026.

## Context

v3 linted with [ESLint](https://github.com/eslint/eslint), using
[typescript-eslint](https://github.com/typescript-eslint/typescript-eslint),
[eslint-plugin-import-x](https://github.com/un-ts/eslint-plugin-import-x)
and [@stylistic](https://github.com/eslint-stylistic/eslint-stylistic).
It also exported a [Prettier](https://github.com/prettier/prettier) config.

Linting was slow. Our largest project, a private monorepo with about 6,000 TypeScript files, took 104.5 s.

[oxlint](https://github.com/oxc-project/oxc) has most of the same rules built in, and runs them much faster.
It can also run ESLint plugins, and type-aware rules through [tsgolint](https://github.com/oxc-project/tsgolint).
oxfmt, from the same project, formats JS and TS exactly like Prettier 3.

## Decision

### Linting

- **oxlint runs the lint.** Rules it doesn't have come from the original ESLint plugins, which oxlint runs as well:
  - `@stylistic` for code style
  - [perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist) for sorting names inside `{ }`
    in imports and exports
  - typescript-eslint's `naming-convention`, through a small wrapper
  - ESLint's `camelcase` and `no-octal`,
    through [oxlint-plugin-eslint](https://github.com/oxc-project/oxc/tree/main/npm/oxlint-plugin-eslint)
  - [eslint-plugin-check-file](https://github.com/dukeluo/eslint-plugin-check-file) for component file names,
    because oxlint's own rule rejects acronyms like `AIPanel.tsx`
  - [eslint-plugin-mocha](https://github.com/lo1tuma/eslint-plugin-mocha)
    and [eslint-plugin-playwright](https://github.com/mskelton/eslint-plugin-playwright)
- **Every rule v3 enforced is still enforced**, or dropped on purpose with a reason.
  `test/parity` checks this automatically.
- **The base is oxlint's `correctness` category**, as errors.
  On top come the rules from ESLint's and typescript-eslint's recommended sets that oxlint doesn't turn on itself.
  There are no warnings, as in v3.
- **Four rules of that category stay off.** v3 didn't have them, and they report false positives in our code:
  - `import/default` reports imports like `./worker.js?url`, although the bundler provides their default export
  - `unicorn/no-thenable` reports the `then` keyword of JSON Schema
  - two TypeScript rules

  The `fullCorrectness` option turns them on.
- **`import/namespace` is new.** It checks that names used on `import * as ns` exist.
  It allows computed access like `ns[key]`, which can't be checked without running the code.
- **No new "restriction" rules.** oxlint describes this category as "rules that ban specific patterns or features".
  They are a team's choice, like `unicorn/prefer-node-protocol` (`node:path` instead of `path`).
  v4 keeps the ones v3 had, like `no-var`, and projects add more themselves.
- **Dropped:**
  - `react/jsx-no-bind`: it's in no recommended set, and every finding in our code was suppressed
  - `radix`: ESLint 10 and oxlint both changed what it checks, and neither matches v3 any more
  - the `cypress` option, replaced by `playwright`
- **Off by default:**
  - jsx-a11y, because it reports 600 findings on our three React packages
  - the React Compiler rules, which only make sense once a project uses the compiler

### Type-aware rules

- **They're on without any setup**, so `no-for-in-array` keeps running on every TS file, as in v3.
  A project can turn them off with `options: { typeAware: false }` in its root config.
- **They run on TS files only**, as in v3. Plain JS only has inferred types, so these rules misfire there.
  The `typeAwareJs` option turns them on for JS files too.
- **More rules on request:** `typeChecked` adds the rules that catch runtime bugs, like `no-floating-promises`.
  `fullCorrectness` adds the whole `correctness` category.

### Formatting

- **The lint checks code style, not the formatter.** oxfmt and Prettier run only when someone formats.
  Our code was never formatted with Prettier.
  Making a formatter the check would mean reformatting almost everything at once: 1,003 of 1,319 files in one package.
- **Trailing commas: `all`**, the default of both oxfmt and Prettier. The lint accepts both styles.
  A project may set its formatter to `es5`. This is provisional, and a later ADR will settle it.
- **oxfmt sorts imports into v3's groups**, with a blank line between them:
  builtin, external, `~` aliases, local absolute imports, parent, then sibling and index.
- **Local absolute imports come from the tsconfig.** `helpers/download` looks like an npm package,
  but a tsconfig path like `"*": ["./src/*"]` makes it a local file. v3 knew this through
  [eslint-import-resolver-typescript](https://github.com/import-js/eslint-import-resolver-typescript).
  oxfmt can't resolve imports, so `oxfmt()` reads the tsconfig itself and lists the names.
- **The tsconfig is read with [get-tsconfig](https://github.com/privatenumber/get-tsconfig).**
  [TypeScript](https://github.com/microsoft/TypeScript)'s own API for that no longer exists in TypeScript 7.0,
  and 7.1 replaces it with a different one. This way formatting works with any TypeScript version.

### Dependencies

- **`oxlint`, `oxfmt` and `oxlint-tsgolint` are regular dependencies.** One install brings everything.
- **`eslint` stays a dependency.** eslint-plugin-mocha and perfectionist need it at runtime.
- **A monorepo installs this package once, at the root.**
  oxlint refuses a second copy of the same plugin ([oxc #26017](https://github.com/oxc-project/oxc/issues/26017)).
- **Dependencies use open version ranges (`^`), dev dependencies exact versions.**
  Projects get fixes, oxlint's included, without waiting for a release of this package.
  Exact dev dependencies keep builds and tests of this package reproducible, locally and in CI.
  oxfmt is still on 0.x, where `^0.74.0` allows only 0.74 patch releases,
  so formatting changes reach projects only through releases of this package.

## Consequences

- **Linting is about 4 times faster:** 23.7 s instead of 104.5 s on the same monorepo.
  Most of the remaining time goes to the ESLint plugins: `stylistic/indent` takes 7.9 s,
  the `naming-convention` wrapper 4.9 s.
- **New oxlint releases can bring new errors.** The range `^1.89.0` lets new minor releases reach projects
  without a release of this package. A rule oxlint adds to its `correctness` category then reports errors there
  after their next dependency update. We accept this in exchange for getting fixes sooner.
- **TypeScript stays below 6.1 for now.** typescript-eslint, which the `naming-convention` wrapper and perfectionist
  need, doesn't support newer versions yet. A project on TypeScript 7 needs Microsoft's
  [`@typescript/typescript6`](https://www.npmjs.com/package/@typescript/typescript6) package alongside it.
- **tsconfigs must not use `baseUrl` or `moduleResolution: node10`**, because tsgolint refuses both.
  [ts5to6](https://github.com/andrewbranch/ts5to6) fixes most of this automatically.
- **Two rules have new names in disable comments:**
  `typescript-js/naming-convention` and `eslint-js/camelcase`, because oxlint runs them through plugins.
- **To change a rule this config sets, a project needs an override with matching `files`.**
  A plain top-level `rules` entry loses, because oxlint applies overrides last.
  For react, jest and vitest rules, the override must also list the plugin.
- **Import order is no longer checked**, only fixed when someone formats.
  A package that had `import/order` off, for example because of import cycles, sets `sortImports: false`
  in its own oxfmt config. In a cycle, import order decides which module runs first.
- **Projects drop `prettier` from their dependencies.**
  A code generator that runs `prettier --write` should run `oxfmt` instead.
- **In a monorepo, each package keeps its own `oxlint.config.ts`.**
  A package with its own tsconfig `paths` also gets an `oxfmt.config.ts`
  with `oxfmt({ tsconfig: import.meta.dirname })`.
  oxfmt runs every package's config from the root directory, so it can't find the package's tsconfig alone.
- **Config files written in TypeScript need Node `^20.19.0 || >=22.18.0`.**

## Later

- **Replace the `naming-convention` wrapper** with tsgolint's built-in rule once it exists
  ([tsgolint #186](https://github.com/oxc-project/tsgolint/issues/186)).
  That would save about 5 s per full run.
- **Replace perfectionist** with oxfmt's planned sorting of names inside `{ }`
  ([oxc #23456](https://github.com/oxc-project/oxc/issues/23456)), if formatting ever becomes the check.
- **Drop `eslint` as a dependency**, once the wrapper, perfectionist and eslint-plugin-mocha are replaced.
  The README describes what that would take.
- **Move to `@stylistic` v6.** Its new `list-style` rule reports about 1,800 findings in three of our packages,
  so it waits for a minor release of its own.
- **Settle trailing commas**, see above.

## More detail

- the README, for how to use v4 and migrate from v3
- [the original v4 design](https://github.com/ovos/coding-standard/blob/c22e18f780c848e75bcab31efc1552883b91728a/docs/superpowers/specs/2026-09-07-oxlint-oxfmt-v4-design.md),
  written before review, with every measurement and the alternatives we rejected.
  Some of it changed in review, and this ADR describes the result.
