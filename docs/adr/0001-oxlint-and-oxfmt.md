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
  - [perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist) for import order,
    and for sorting names inside `{ }` in imports and exports
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
  - `react/no-deprecated`: oxlint doesn't have it, so calls to deprecated React APIs are no longer flagged
  - `@stylistic/jsx-props-no-multi-spaces`: it crashes under oxlint, so only oxfmt removes double spaces in JSX props
  - the `**/*.less` glob of the file naming rule: it never ran, because neither ESLint nor oxlint reads `.less` files
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
  A project may set its formatter to `es5` in its own oxfmt config.
- **The lint owns import order.** `perfectionist/sort-imports` checks v3's groups, with a blank line between them:
  builtin, external, `~` aliases, local absolute imports, parent, then sibling and index.
  It shows up in the editor and in CI, and `oxlint --fix` sorts, as `eslint --fix` did in v3.
  On 1,824 files it takes 0.69 s, about the same as `import/order` in v3 (0.67 s).
- **oxfmt doesn't sort imports,** although it can, and faster.
  It only sorts when someone runs it, shows nothing in the editor and fails nothing in CI.
  Both tools sorting would give two sources of truth, and they undo each other around side-effect imports.
  v3's split was the same: Prettier formatted, `eslint --fix` sorted.
- **Local absolute imports come from the tsconfig.** `helpers/download` looks like an npm package,
  but a tsconfig path like `"*": ["./src/*"]` makes it a local file. v3 knew this through
  [eslint-import-resolver-typescript](https://github.com/import-js/eslint-import-resolver-typescript).
  So `oxlint()` reads the tsconfig itself and lists the names.
  It starts at the config file that calls it, found with `util.getCallSites()`,
  so each package in a monorepo gets its own.
  An option for this would be easy to forget, and `oxlint --fix` would then sort local imports in with npm packages.
- **The tsconfig is read with [get-tsconfig](https://github.com/privatenumber/get-tsconfig).**
  [TypeScript](https://github.com/microsoft/TypeScript)'s own API for that no longer exists in TypeScript 7.0,
  and 7.1 replaces it with a different one. This way the config loads with any TypeScript version.

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
- **A package that had `import/order` off** sets `oxlint({ sortImports: false })`, for example because of import cycles.
  In a cycle, import order decides which module runs first.
- **`oxlint --fix` can move an import across a side-effect import.** The rule keeps side-effect imports in place,
  but not the imports around them. v3 reported those cases and left the fix to a person.
  On our largest project it never happened. A single import can opt out with a disable comment.
- **`require` calls come after all imports and keep their own order**, because that order decides what runs first.
  v3 also sorted them among themselves. That check is gone.
- **Projects drop `prettier` from their dependencies.**
  A code generator that runs `prettier --write` should run `oxfmt` instead.
- **In a monorepo, each package keeps its own `oxlint.config.ts`.**
  Nothing else is needed per package.
- **Node `>=22.18.0`.** oxlint refuses `oxlint.config.ts` on older versions.

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

## More detail

- the README, for how to use v4 and migrate from v3
- [the original v4 design](https://github.com/ovos/coding-standard/blob/c22e18f780c848e75bcab31efc1552883b91728a/docs/superpowers/specs/2026-09-07-oxlint-oxfmt-v4-design.md),
  written before review, with every measurement and the alternatives we rejected.
  Some of it changed in review, and this ADR describes the result.
