# coding-standard v4 (oxlint + oxfmt) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@ovos-media/coding-standard` 4.0.0: an oxlint config factory, an oxfmt config factory and a Prettier
options object, replacing the ESLint config factory, with every rule of v3 preserved.

**Architecture:** `src/oxlint/` builds a plain oxlint config object from options; everything file-scoped lives in
`overrides` because oxlint's `extends` drops top-level `env`/`globals`/`settings`. JS plugins (stylistic,
perfectionist, oxlint-plugin-eslint, mocha, playwright, and this package's typescript-eslint naming wrapper) are
referenced by absolute paths resolved from inside the package. `src/oxfmt.ts` and `src/prettier.ts` share one base
object. Tests are `node:test` files compiled next to the sources plus a CLI smoke test over fixtures.

**Tech Stack:** TypeScript 5.9 compiled with `tsc` to ESM in `dist/`, `node:test`, oxlint 1.81 (`oxlint/plugins-dev`
RuleTester), oxfmt 0.66, Node `^20.19.0 || >=22.18.0`.

**Spec:** `docs/superpowers/specs/2026-09-07-oxlint-oxfmt-v4-design.md`

## Global Constraints

- Node engines: `^20.19.0 || >=22.18.0`. Package is ESM only (`"type": "module"`).
- Dependencies pinned at today's latest with caret ranges: `oxlint` ^1.81.0, `oxfmt` ^0.66.0,
  `oxlint-plugin-eslint` ^1.81.0, `@stylistic/eslint-plugin` ^5.10.0 (v6 rejected during Task 9, see the spec's
  item 11.2), `eslint-plugin-perfectionist`
  ^5.11.0, `eslint-plugin-mocha` ^12.0.2, `eslint-plugin-playwright` ^2.11.0, `@typescript-eslint/eslint-plugin`
  ^8.69.0, `eslint` ^10.9.1. `oxlint-tsgolint` is an optional peer `>=7.0.2001`.
- Errors only: no rule is configured at `warn`.
- Every code comment that references an upstream issue, PR, package or tool uses the full URL (spec, top).
- Writing style for code comments, commit messages and docs: `~/.claude/CLAUDE.md` (no em dashes, lines up to
  100 to 120 chars, no attribution lines in commits, concise).
- Nothing in this repo may mention the private consumer repository by name.
- Commands run from the repo root `/Users/ovos/work/coding-standard` on branch `v4-oxlint-oxfmt`.

---

## File structure

| Path | Responsibility |
|---|---|
| `package.json`, `tsconfig.json` | v4 metadata, exports map, dependencies, build and test scripts |
| `src/index.ts` | re-exports `oxlint`, `oxfmt`, `prettier` and their option types |
| `src/format-base.ts` | the shared formatting options (`printWidth`, quotes, commas, indent) |
| `src/oxfmt.ts` | `oxfmt(options)`: base plus `sortImports` |
| `src/prettier.ts` | `prettier`: the base object typed inline |
| `src/oxlint/index.ts` | `oxlint(options)`: assembles plugins, categories, jsPlugins, rules, overrides |
| `src/oxlint/options.ts` | `OxlintOptions` type and defaults |
| `src/oxlint/globs.ts` | extension lists and glob builders (`testGlobs`, `testHelperGlobs`) |
| `src/oxlint/plugins.ts` | JS-plugin registry with absolute-path resolution; carries the perfectionist comment |
| `src/oxlint/rules/core.ts` | ESLint core and typescript rules for all files, ts files, js files |
| `src/oxlint/rules/stylistic.ts` | the 42 stylistic rules (function of `indent`) and the jsx subset |
| `src/oxlint/rules/react.ts` | react, react-hooks, React Compiler family, filename-case overrides |
| `src/oxlint/rules/type-aware.ts` | `no-for-in-array` plus the `typeChecked` tier and the explicit off-list |
| `src/oxlint/rules/tests.ts` | jest, vitest, mocha, playwright overrides |
| `src/plugins/typescript.ts` | the naming-convention wrapper plugin; carries the cost comment |
| `src/**/*.test.ts` | unit tests compiled to `dist/**/*.test.js` |
| `test/fixtures/**` | files with known violations for the CLI smoke test (not compiled) |
| `src/smoke.test.ts` | runs the `oxlint` binary on fixtures with generated configs |
| `oxlint.config.ts`, `oxfmt.config.ts`, `prettier.config.js` | this repo linting itself with its own package |
| `README.md` | rewritten usage and migration guide |

Removed: `eslint.ts`, `prettier.ts`, `index.ts`, `types.d.ts`, `.prettierrc`.

---

### Task 1: Package skeleton, build and test harness

**Files:**
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Delete: `eslint.ts`, `prettier.ts`, `index.ts`, `types.d.ts`, `.prettierrc`
- Create: `src/index.ts`, `src/index.test.ts`

**Interfaces:**
- Produces: `npm run build` (tsc into `dist/`), `npm test` (build, then `node --test dist`), the exports map every
  later task's code relies on.

- [ ] **Step 1: Replace `package.json`**

```json
{
  "name": "@ovos-media/coding-standard",
  "version": "4.0.0",
  "description": "ovos-media coding standard: shared oxlint, oxfmt and prettier configuration",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./oxlint": { "types": "./dist/oxlint/index.d.ts", "default": "./dist/oxlint/index.js" },
    "./oxfmt": { "types": "./dist/oxfmt.d.ts", "default": "./dist/oxfmt.js" },
    "./prettier": { "types": "./dist/prettier.d.ts", "default": "./dist/prettier.js" },
    "./plugins/*": { "types": "./dist/plugins/*.d.ts", "default": "./dist/plugins/*.js" },
    "./package.json": "./package.json"
  },
  "author": "ovos",
  "license": "MIT",
  "repository": "https://github.com/ovos/coding-standard",
  "homepage": "https://github.com/ovos/coding-standard",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "clean": "node -e \"require('fs').rmSync('dist', { recursive: true, force: true })\"",
    "test": "npm run clean && npm run build && node --test dist",
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "format": "oxfmt",
    "prepublishOnly": "npm test"
  },
  "dependencies": {
    "@stylistic/eslint-plugin": "6.0.0-beta.6",
    "@typescript-eslint/eslint-plugin": "^8.69.0",
    "eslint": "^10.9.1",
    "eslint-plugin-mocha": "^12.0.2",
    "eslint-plugin-perfectionist": "^5.11.0",
    "eslint-plugin-playwright": "^2.11.0",
    "oxfmt": "^0.66.0",
    "oxlint": "^1.81.0",
    "oxlint-plugin-eslint": "^1.81.0"
  },
  "peerDependencies": {
    "oxlint-tsgolint": ">=7.0.2001"
  },
  "peerDependenciesMeta": {
    "oxlint-tsgolint": { "optional": true }
  },
  "devDependencies": {
    "@types/node": "24.0.14",
    "typescript": "5.9.3"
  },
  "engines": {
    "node": "^20.19.0 || >=22.18.0"
  },
  "files": [
    "dist",
    "!dist/**/*.test.js",
    "!dist/**/*.test.d.ts"
  ]
}
```

- [ ] **Step 2: Replace `tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["es2023"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "es2022",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Update `.gitignore`** so `dist/` is ignored instead of the old root-level `/*.js`, `/*.d.ts`,
  `!/types.d.ts` lines. Replace those three lines with `dist/`.

- [ ] **Step 4: Delete the v3 sources**

```bash
git rm -q eslint.ts prettier.ts index.ts types.d.ts .prettierrc
```

- [ ] **Step 5: Write the failing test** `src/index.test.ts`

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as api from './index.js';

test('package exports the three factories', () => {
  assert.equal(typeof api.oxlint, 'function');
  assert.equal(typeof api.oxfmt, 'function');
  assert.equal(typeof api.prettier, 'object');
});
```

- [ ] **Step 6: Write `src/index.ts`** with stubs that later tasks replace

```ts
export { oxlint, type OxlintOptions } from './oxlint/index.js';
export { oxfmt, type OxfmtOptions } from './oxfmt.js';
export { prettier } from './prettier.js';
```

and temporary stubs so the build passes: `src/oxlint/index.ts` exporting `export type OxlintOptions = {};
export function oxlint(_options: OxlintOptions = {}) { return {}; }`, `src/oxfmt.ts` exporting
`export type OxfmtOptions = {}; export function oxfmt(_options: OxfmtOptions = {}) { return {}; }`,
`src/prettier.ts` exporting `export const prettier = {};`.

- [ ] **Step 7: Install and run**

```bash
rm -rf node_modules && npm install
npm test
```

Expected: build succeeds, `node --test dist` reports 1 passing test.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "v4 skeleton: esm package with oxlint, oxfmt and prettier entry points

drops the eslint entry point and its plugins, adds oxlint/oxfmt and the js plugins
that keep rule parity, and a node:test harness over the compiled sources"
```

---

### Task 2: Formatting base, `oxfmt()` and `prettier`

**Files:**
- Create: `src/format-base.ts`, `src/oxfmt.ts`, `src/prettier.ts`, `src/oxfmt.test.ts`, `src/prettier.test.ts`

**Interfaces:**
- Produces: `formatBase(indent)` returning `{ printWidth, singleQuote, trailingComma, tabWidth, useTabs }`;
  `oxfmt(options?: { indent?: number | 'tab' })` returning an oxfmt config object; `prettier` object.

- [ ] **Step 1: Write the failing tests**

`src/oxfmt.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { oxfmt } from './oxfmt.js';

test('oxfmt defaults match the standard', () => {
  const config = oxfmt();
  assert.equal(config.printWidth, 100);
  assert.equal(config.singleQuote, true);
  assert.equal(config.trailingComma, 'all');
  assert.equal(config.tabWidth, 2);
  assert.equal(config.useTabs, false);
  assert.equal('sortPackageJson' in config, false, 'oxfmt default (on) is inherited, not set');
  assert.deepEqual(config.sortImports, {
    groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index'], 'unknown'],
    internalPattern: ['~'],
    ignoreCase: true,
    newlinesBetween: true,
  });
});

test('oxfmt indent option maps to tabs and width', () => {
  assert.equal(oxfmt({ indent: 'tab' }).useTabs, true);
  assert.equal(oxfmt({ indent: 4 }).tabWidth, 4);
});
```

`src/prettier.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { prettier } from './prettier.js';

test('prettier export is the shared base only', () => {
  assert.deepEqual(prettier, {
    printWidth: 100,
    singleQuote: true,
    trailingComma: 'all',
    tabWidth: 2,
    useTabs: false,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, `config.printWidth` is undefined (stub returns `{}`).

- [ ] **Step 3: Implement**

`src/format-base.ts`:

```ts
export type Indent = number | 'tab';

export type FormatBase = {
  printWidth: number;
  singleQuote: boolean;
  trailingComma: 'all';
  tabWidth: number;
  useTabs: boolean;
};

// shared between the oxfmt and prettier exports so both tools produce the same output
// (verified identical on the same options: oxfmt 0.66 vs prettier 3.9)
export function formatBase(indent: Indent = 2): FormatBase {
  return {
    printWidth: 100,
    singleQuote: true,
    trailingComma: 'all',
    tabWidth: indent === 'tab' ? 2 : indent,
    useTabs: indent === 'tab',
  };
}
```

`src/oxfmt.ts`:

```ts
import type { Oxfmtrc } from 'oxfmt';

import { formatBase, type Indent } from './format-base.js';

export type OxfmtOptions = {
  // number of spaces per indentation level, or 'tab' (default: 2)
  indent?: Indent;
};

/**
 * oxfmt configuration. Use it as `defineConfig(oxfmt())`, or spread it to override options:
 * `defineConfig({ ...oxfmt(), sortPackageJson: false })`. oxfmt has no `extends`.
 */
export function oxfmt(options: OxfmtOptions = {}): Oxfmtrc {
  return {
    ...formatBase(options.indent),
    // same grouping as the import/order rule of v3: builtin, external, aliased-internal (~), parent, sibling+index.
    // type imports sort among value imports, as import/order did. named specifiers inside braces are not sorted
    // by oxfmt (https://github.com/oxc-project/oxc/issues/23456); perfectionist covers that in the oxlint config.
    sortImports: {
      groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index'], 'unknown'],
      internalPattern: ['~'],
      ignoreCase: true,
      newlinesBetween: true,
    },
  };
}
```

If `Oxfmtrc` is not exported under that name, run `grep -n "export" node_modules/oxfmt/dist/index.d.ts | head`
and use the exported config type (the interface is named `Oxfmtrc` in 0.66; `OxfmtConfig` may be the alias).

`src/prettier.ts`:

```ts
import { formatBase } from './format-base.js';

// prettier is not a dependency of this package; the object is plain options compatible with prettier 3.
// kept for projects that format with prettier on demand. same values as the oxfmt export.
export const prettier: {
  printWidth: number;
  singleQuote: boolean;
  trailingComma: 'all';
  tabWidth: number;
  useTabs: boolean;
} = formatBase();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/format-base.ts src/oxfmt.ts src/prettier.ts src/oxfmt.test.ts src/prettier.test.ts
git commit -m "add oxfmt and prettier exports sharing one formatting base

trailingComma 'all' (oxfmt and prettier 3 default), import declaration sorting with
the same groups as the former import/order rule"
```

---

### Task 3: Globs and extension lists

**Files:**
- Create: `src/oxlint/globs.ts`, `src/oxlint/globs.test.ts`

**Interfaces:**
- Produces: `globs` (`all`, `js`, `ts`, `jsx`, `tsx`, `hooks`), `testGlobs(testsDir, extensions?)`,
  `testHelperGlobs(testsDir)`, `jsExtensions`, `tsExtensions`, `scriptExtensions` (js+ts without jsx/tsx).

- [ ] **Step 1: Write the failing test** `src/oxlint/globs.test.ts`

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { globs, scriptExtensions, testGlobs, testHelperGlobs } from './globs.js';

test('globs cover every js and ts extension in brace form', () => {
  assert.equal(globs.all, '**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}');
  assert.equal(globs.js, '**/*.{js,mjs,cjs,jsx}');
  assert.equal(globs.ts, '**/*.{ts,mts,cts,tsx}');
  assert.equal(globs.jsx, '**/*.{jsx,tsx}');
  assert.equal(globs.hooks, '**/{use,with}*.{jsx,tsx}');
});

test('test globs follow testsDir, __tests__ and spec/test suffixes', () => {
  assert.deepEqual(testGlobs('{spec,test,tests}'), [
    '{spec,test,tests}/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}',
    '**/__tests__/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}',
    '**/*.{spec,test}.{js,mjs,cjs,jsx,ts,mts,cts,tsx}',
  ]);
  assert.deepEqual(testGlobs('src', scriptExtensions), [
    'src/**/*.{js,mjs,cjs,ts,mts,cts}',
    '**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts}',
    '**/*.{spec,test}.{js,mjs,cjs,ts,mts,cts}',
  ]);
  assert.deepEqual(testHelperGlobs('test'), ['test/**/_*', 'test/**/*.skip.*']);
});
```

- [ ] **Step 2: Run to verify it fails** (`npm test`, expected: cannot find module `./globs.js`).

- [ ] **Step 3: Implement** `src/oxlint/globs.ts`

```ts
export const jsExtensions = ['js', 'mjs', 'cjs', 'jsx'] as const;
export const tsExtensions = ['ts', 'mts', 'cts', 'tsx'] as const;
export const allExtensions = [...jsExtensions, ...tsExtensions] as const;
// test globs of mocha and playwright suites: no jsx/tsx, as in v3
export const scriptExtensions = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'] as const;

const braces = (list: readonly string[]) => `{${list.join(',')}}`;

// oxlint globs use gitignore-style brace expansion, relative to the config file's directory
export const globs = {
  all: `**/*.${braces(allExtensions)}`,
  js: `**/*.${braces(jsExtensions)}`,
  ts: `**/*.${braces(tsExtensions)}`,
  jsx: '**/*.{jsx,tsx}',
  tsx: '**/*.tsx',
  hooks: '**/{use,with}*.{jsx,tsx}',
} as const;

// files in testsDir, in __tests__ folders, and *.spec.* / *.test.* anywhere
export function testGlobs(testsDir: string, extensions: readonly string[] = allExtensions): string[] {
  const ext = braces(extensions);
  return [`${testsDir}/**/*.${ext}`, `**/__tests__/**/*.${ext}`, `**/*.{spec,test}.${ext}`];
}

// helper files inside testsDir which are not test suites
export function testHelperGlobs(testsDir: string): string[] {
  return [`${testsDir}/**/_*`, `${testsDir}/**/*.skip.*`];
}
```

- [ ] **Step 4: Run to verify it passes** (`npm test`).

- [ ] **Step 5: Commit**

```bash
git add src/oxlint/globs.ts src/oxlint/globs.test.ts
git commit -m "add glob builders for the oxlint overrides"
```

---

### Task 4: Naming-convention wrapper plugin

**Files:**
- Create: `src/plugins/typescript.ts`, `src/plugins/typescript.test.ts`, `src/plugins/rule-tester.ts`

**Interfaces:**
- Produces: default export `{ meta: { name: 'typescript-js' }, rules: { 'naming-convention': Rule } }`; the
  config references it as `typescript-js/naming-convention`. `namingConventionOptions` (the five selectors) is
  exported for the config and the tests.

- [ ] **Step 1: Write the RuleTester helper** `src/plugins/rule-tester.ts`

```ts
import { describe, it } from 'node:test';

import { RuleTester } from 'oxlint/plugins-dev';

RuleTester.describe = describe;
RuleTester.it = it;

export const tsRuleTester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: 'ts' } },
});
```

If `RuleTester` is not exported from `oxlint/plugins-dev`, check `node_modules/oxlint/dist/plugins-dev.d.ts` for
the export name and adapt. The `describe`/`it` assignment mirrors how eslint-plugin-perfectionist and
oxc-config-seek wire it to `node:test`.

- [ ] **Step 2: Write the failing test** `src/plugins/typescript.test.ts`

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import plugin, { namingConventionOptions } from './typescript.js';
import { tsRuleTester } from './rule-tester.js';

const rule = plugin.rules['naming-convention'];
const options = namingConventionOptions;

test('plugin is registered under the typescript-js alias', () => {
  assert.equal(plugin.meta.name, 'typescript-js');
});

tsRuleTester.run('typescript-js/naming-convention', rule as never, {
  valid: [
    { code: 'function fetchUser() {}', options },
    { code: 'function UserCard() {}', options },
    { code: 'class Api { getData() {} }', options },
    { code: 'const r = { user_name() {}, __resolveType() {} };', options },
    { code: 'type UserProfile = {}; type UPPER_CASE = {};', options },
    { code: "import okLib from 'ok-lib'; import { some_named } from 'x'; okLib(some_named);", options },
    { code: 'const some_var = 1; const obj: any = {}; obj.some_prop = some_var;', options },
    { code: "const o = { 'quoted.key': 1 };", options },
  ],
  invalid: [
    { code: 'function fetch_user() {}', options, errors: 1 },
    { code: 'class Api { Get_Data() {} }', options, errors: 1 },
    { code: 'const r = { Bad_Method() {} };', options, errors: 1 },
    { code: 'type user_profile = {};', options, errors: 1 },
    { code: "import my_lib from 'my-lib'; my_lib();", options, errors: 1 },
    // quoted keys and function-typed properties count as methods upstream; keep parity
    { code: "const a = { 'x.y': (t: number) => t };", options, errors: 1 },
    { code: 'interface I { Foo: () => void }', options, errors: 1 },
    { code: 'class C { Foo = () => 1; }', options, errors: 1 },
  ],
});
```

- [ ] **Step 3: Run to verify it fails** (`npm test`, expected: cannot find module `./typescript.js`).

- [ ] **Step 4: Implement** `src/plugins/typescript.ts`

```ts
import { createRequire } from 'node:module';
import path from 'node:path';

/*
 * typescript-eslint's `naming-convention` rule, executed by oxlint through its JS-plugin bridge.
 *
 * Why a wrapper: oxlint has no native naming-convention. tsgolint is growing one
 * (https://github.com/oxc-project/tsgolint/issues/186, implementations proposed in
 * https://github.com/oxc-project/tsgolint/pull/1075 and https://github.com/oxc-project/tsgolint/pull/1167) but it
 * is unmerged, and it will be a type-aware rule, so it needs oxlint's type-aware mode.
 *
 * What the wrapper does: the upstream rule reads `context.sourceCode.parserServices` to decide whether the `types`
 * option can be evaluated. oxlint's bridge provides no parserServices, so the rule throws. We hand it an empty
 * services object with `program: null`; the rule then behaves exactly as under ESLint without type information.
 * The selectors this standard configures (function, method, objectLiteralMethod, typeLike, import) never use the
 * `types` option, the only part of the rule that needs a type checker. Verified identical to ESLint 9 and 10 with
 * typescript-eslint 8.24 and 8.69 on fixtures and on a 4,000-file codebase.
 *
 * What it costs (measured on oxlint 1.81, typescript-eslint 8.69):
 *   - startup: about 0.5 s per CLI invocation. The rule module loads 580 modules including the 9 MB TypeScript
 *     compiler (via the plugin's own astUtils), @typescript-eslint/scope-manager, ESLint's modules, ajv, semver.
 *     Paid once per lint-staged commit, editor session (the language server keeps the plugin loaded) or CI run.
 *     Loading `dist/rules/naming-convention.js` directly instead of the `use-at-your-own-risk/rules` index saves
 *     about 0.2 s; the package's `exports` map blocks the bare specifier, an absolute filesystem path does not.
 *   - per file: about 1.8 ms, roughly 7 s per 4,000 ts files, because the rule resolves scope for every matched
 *     name to compute modifiers (`unused`, `global`) whether or not the configured selectors use them. Not tunable
 *     from here.
 *   - dependencies: @typescript-eslint/eslint-plugin and its tree (scope-manager, type-utils, utils,
 *     typescript-estree), plus eslint at runtime.
 *
 * Alternatives, and when to take them:
 *   - an in-house AST-only rule for the five selectors: about 100 to 150 lines, about 0.2 ms per file, no
 *     typescript-eslint dependency, but the semantics become ours. A September 2026 spike diverged from upstream on
 *     quoted keys, function-typed properties and leading-underscore defaults before those were pinned by fixtures.
 *     Worth it only if the 10 s per full run or the dependency tree starts to matter.
 *   - tsgolint's native rule once merged and registered in oxlint: delete this file, switch the config to
 *     `typescript/naming-convention`, rename disable directives back to `@typescript-eslint/naming-convention`.
 *
 * The module path below is private API. `typescript.test.ts` fails loudly when a typescript-eslint release moves it.
 */

type RuleContext = { sourceCode?: object };
type RuleModule = { meta: unknown; create: (context: RuleContext) => Record<string, unknown> };

const require = createRequire(import.meta.url);
const pluginDir = path.dirname(require.resolve('@typescript-eslint/eslint-plugin/package.json'));
const loaded = require(path.join(pluginDir, 'dist/rules/naming-convention.js')) as RuleModule | { default: RuleModule };
const upstream: RuleModule = 'default' in loaded ? loaded.default : loaded;

const emptyParserServices = {
  esTreeNodeToTSNodeMap: new Map(),
  tsNodeToESTreeNodeMap: new Map(),
  program: null,
};

function withParserServices(context: RuleContext): RuleContext {
  const sourceCode = Object.create(context.sourceCode ?? {}) as object;
  Object.defineProperty(sourceCode, 'parserServices', { value: emptyParserServices, enumerable: true });
  const derived = Object.create(context) as RuleContext;
  Object.defineProperty(derived, 'sourceCode', { value: sourceCode, enumerable: true });
  return derived;
}

// the five selectors of this standard. property and variable names are deliberately unchecked: all styles
// are in use (snake_case model fields, PascalCase graphql types, UPPER_CASE constants, kebab-case headers)
export const namingConventionOptions = [
  { selector: 'function', format: ['camelCase', 'PascalCase'] }, // PascalCase for react function components
  { selector: 'method', format: ['camelCase'] },
  // snake_case for graphql resolvers of snake_cased fields, `__resolveType` and similar
  { selector: 'objectLiteralMethod', format: ['camelCase', 'snake_case'], leadingUnderscore: 'allowDouble' },
  { selector: 'typeLike', format: ['PascalCase', 'UPPER_CASE'] },
  { selector: 'import', format: ['camelCase', 'PascalCase'] },
] as const;

const plugin = {
  meta: { name: 'typescript-js' },
  rules: {
    'naming-convention': {
      ...upstream,
      create: (context: RuleContext) => upstream.create(withParserServices(context)),
    },
  },
};

export default plugin;
```

- [ ] **Step 5: Run to verify it passes** (`npm test`). If the RuleTester reports option validation errors, print
  `upstream.meta` to confirm the module loaded, and check the `options` array is passed as the rule's options (an
  array of selector objects, as in ESLint).

- [ ] **Step 6: Commit**

```bash
git add src/plugins/typescript.ts src/plugins/typescript.test.ts src/plugins/rule-tester.ts
git commit -m "add typescript-js/naming-convention wrapper for oxlint

runs typescript-eslint's rule through oxlint's js plugin bridge with empty parserServices.
the file documents the measured cost, the alternatives and the tsgolint exit path"
```

---

### Task 5: JS-plugin registry with absolute-path resolution

**Files:**
- Create: `src/oxlint/plugins.ts`, `src/oxlint/plugins.test.ts`

**Interfaces:**
- Produces: `type JsPlugin = { name: string; specifier: string }`; `jsPlugins.stylistic()`,
  `jsPlugins.perfectionist()`, `jsPlugins.eslintJs()`, `jsPlugins.typescriptJs()`, `jsPlugins.mocha()`,
  `jsPlugins.playwright()`; `resolvePlugin(specifier)`.

- [ ] **Step 1: Write the failing test** `src/oxlint/plugins.test.ts`

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { jsPlugins } from './plugins.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('every js plugin resolves to an existing file inside this package', () => {
  for (const factory of Object.values(jsPlugins)) {
    const plugin = factory();
    assert.ok(path.isAbsolute(plugin.specifier), `${plugin.name} must be an absolute path`);
    assert.ok(fs.existsSync(plugin.specifier), `${plugin.name}: ${plugin.specifier} does not exist`);
    assert.ok(plugin.specifier.startsWith(packageRoot), `${plugin.name} must resolve inside ${packageRoot}`);
  }
});

test('plugin names are the ones the rules reference', () => {
  assert.deepEqual(
    Object.values(jsPlugins).map((factory) => factory().name).sort(),
    ['eslint-js', 'mocha', 'perfectionist', 'playwright', 'stylistic', 'typescript-js'],
  );
});
```

- [ ] **Step 2: Run to verify it fails** (`npm test`).

- [ ] **Step 3: Implement** `src/oxlint/plugins.ts`

```ts
import { fileURLToPath } from 'node:url';

export type JsPlugin = { name: string; specifier: string };

// absolute paths: oxlint resolves plugin specifiers relative to the consumer's config file, and consumers in a
// monorepo without hoisting would otherwise resolve different copies per package. oxlint deduplicates js plugins by
// resolved path and rejects a second copy of the same plugin name (https://github.com/oxc-project/oxc/issues/26017),
// so consumers must also install this package once, at the root; see README.
export const resolvePlugin = (specifier: string): string => fileURLToPath(import.meta.resolve(specifier));

export const jsPlugins = {
  // @stylistic/eslint-plugin 6 (https://github.com/eslint-stylistic/eslint-stylistic) declares oxlint as a peer.
  // it is the enforced formatting layer of this standard; oxfmt is an on-demand tool. about 11 s per 4,000 files,
  // 7 s of it the indent rule.
  stylistic: (): JsPlugin => ({ name: 'stylistic', specifier: resolvePlugin('@stylistic/eslint-plugin') }),

  /*
   * eslint-plugin-perfectionist (https://github.com/azat-io/eslint-plugin-perfectionist): sort-named-imports and
   * sort-named-exports. Kept for feature parity with v3: types first, the custom alphabet (`_-.@/#~$0-9A-Za-z`,
   * uppercase before lowercase), `ignoreAlias`, and named exports. Perfectionist tests its rules under oxlint's
   * RuleTester in its own CI (https://github.com/azat-io/eslint-plugin-perfectionist/pull/726).
   *
   * Cost: about 1.2 s per 4,000 files and 0.3 s of startup per invocation. It keeps `eslint` in this package's
   * dependencies: the plugin imports @typescript-eslint/utils, which requires `eslint` at runtime and fails to load
   * without it (https://github.com/oxc-project/oxc/issues/17734). With perfectionist, the naming wrapper and
   * eslint-plugin-mocha removed, this package would need neither eslint nor typescript-eslint (verified: stylistic,
   * oxlint-plugin-eslint and eslint-plugin-playwright load with both absent).
   *
   * Rejected replacements:
   *   - oxlint's native `sort-imports`: members in plain character order, no types-first, no export sorting.
   *   - @longzai-intelligence's oxlint port: UNLICENSED, two rules, no sort-named-exports, no repository.
   * Possible future actions:
   *   - two in-house rules with the same options: about 80 to 100 lines, exact parity, zero dependencies; the only
   *     way to an eslint-free package while keeping enforcement.
   *   - oxfmt's planned `sortNamedImports` (https://github.com/oxc-project/oxc/issues/23456) and "full perfectionist
   *     support by oxfmt" (https://github.com/oxc-project/oxc/issues/22521; first attempt
   *     https://github.com/oxc-project/oxc/pull/26211 closed unmerged). Related:
   *     https://github.com/oxc-project/oxc/issues/22856, https://github.com/oxc-project/oxc/issues/13610,
   *     https://github.com/oxc-project/oxc/issues/19984. Those are formatting, not lint enforcement: they replace
   *     this rule only if the standard moves formatting enforcement to oxfmt.
   */
  perfectionist: (): JsPlugin => ({
    name: 'perfectionist',
    specifier: resolvePlugin('eslint-plugin-perfectionist'),
  }),

  // ESLint's built-in rules as an oxlint plugin, published by the oxc project (https://github.com/oxc-project/oxc).
  // used for `camelcase`, which oxlint does not implement. no runtime cost measured on top of the native rules.
  eslintJs: (): JsPlugin => ({ name: 'eslint-js', specifier: resolvePlugin('oxlint-plugin-eslint') }),

  // this package's wrapper around typescript-eslint's naming-convention; see src/plugins/typescript.ts
  typescriptJs: (): JsPlugin => ({
    name: 'typescript-js',
    specifier: fileURLToPath(new URL('../plugins/typescript.js', import.meta.url)),
  }),

  // eslint-plugin-mocha 12 (https://github.com/lo1tuma/eslint-plugin-mocha) imports `eslint` at runtime.
  // oxlint has no mocha plugin; its jest rules would cover focused tests, identical titles and async suites
  // syntactically but none of the done-callback rules.
  mocha: (): JsPlugin => ({ name: 'mocha', specifier: resolvePlugin('eslint-plugin-mocha') }),

  // eslint-plugin-playwright (https://github.com/mskelton/eslint-plugin-playwright); no runtime dependency on eslint
  playwright: (): JsPlugin => ({ name: 'playwright', specifier: resolvePlugin('eslint-plugin-playwright') }),
};
```

- [ ] **Step 4: Run to verify it passes** (`npm test`). If `import.meta.resolve` returns a `file:` URL to a
  directory for any plugin, replace that entry with `createRequire(import.meta.url).resolve(<specifier>)`.

- [ ] **Step 5: Commit**

```bash
git add src/oxlint/plugins.ts src/oxlint/plugins.test.ts
git commit -m "add js plugin registry resolved to absolute paths inside the package

documents why perfectionist and eslint-plugin-mocha keep eslint in the dependency tree
and what would replace them"
```

---

### Task 6: Rule sets

**Files:**
- Create: `src/oxlint/rules/core.ts`, `src/oxlint/rules/stylistic.ts`, `src/oxlint/rules/react.ts`,
  `src/oxlint/rules/type-aware.ts`, `src/oxlint/rules/tests.ts`, `src/oxlint/rules/rules.test.ts`

**Interfaces:**
- Produces: `type Rules = Record<string, unknown>`; `coreRules(consoleUsage)`, `tsRules()`, `jsRules()`,
  `stylisticRules(indent)`, `stylisticJsxRules(indent)`, `reactRules(reactCompiler)`, `reactHookFileRules()`,
  `reactTsxRules()`, `typeAwareRules(typeChecked)`, `jestRules()`, `vitestRules()`, `mochaRules()`,
  `playwrightRules()`. All return plain objects.

- [ ] **Step 1: Write the failing test** `src/oxlint/rules/rules.test.ts`

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { coreRules, jsRules, tsRules } from './core.js';
import { reactRules } from './react.js';
import { stylisticJsxRules, stylisticRules } from './stylistic.js';
import { mochaRules, playwrightRules } from './tests.js';
import { typeAwareRules } from './type-aware.js';

const severities = (rules: Record<string, unknown>) =>
  Object.values(rules).map((value) => (Array.isArray(value) ? value[0] : value));

test('no rule is configured at warn', () => {
  const all = [
    coreRules('ban-log'), tsRules(), jsRules(), stylisticRules(2), stylisticJsxRules(2),
    reactRules(true), typeAwareRules(true), mochaRules(), playwrightRules(),
  ];
  for (const rules of all) assert.ok(!severities(rules).includes('warn'));
});

test('console option maps to no-console', () => {
  assert.equal(coreRules('allow')['no-console'], undefined);
  assert.deepEqual(coreRules('ban-log')['no-console'], ['error', { allow: ['error', 'warn', 'info'] }]);
  assert.equal(coreRules('ban')['no-console'], 'error');
});

test('stylistic indent option flows into indent rules', () => {
  assert.deepEqual((stylisticRules('tab')['stylistic/indent'] as unknown[]).slice(0, 2), ['error', 'tab']);
  assert.deepEqual(stylisticJsxRules(4)['stylistic/jsx-indent-props'], ['error', 4]);
  assert.equal('stylistic/func-call-spacing' in stylisticRules(2), false, 'renamed in stylistic v6');
  assert.equal('stylistic/jsx-props-no-multi-spaces' in stylisticJsxRules(2), false, 'removed in stylistic v6');
});

test('react compiler family is off by default and on by option', () => {
  assert.equal(reactRules(false)['react/set-state-in-effect'], 'off');
  assert.equal(reactRules(true)['react/set-state-in-effect'], 'error');
});

test('type-aware tier keeps no-for-in-array on and everything else explicit', () => {
  const off = typeAwareRules(false);
  assert.equal(off['typescript/no-for-in-array'], 'error');
  assert.equal(off['typescript/no-floating-promises'], 'off');
  assert.equal(off['typescript/unbound-method'], 'off');
  const on = typeAwareRules(true);
  assert.equal(on['typescript/no-floating-promises'], 'error');
  assert.equal(on['typescript/no-misused-promises'], 'error');
  assert.equal(on['typescript/unbound-method'], 'off');
});
```

- [ ] **Step 2: Run to verify it fails** (`npm test`).

- [ ] **Step 3: Implement** `src/oxlint/rules/core.ts`

```ts
export type Rules = Record<string, unknown>;
export type ConsoleUsage = 'ban' | 'ban-log' | 'allow';

// shared options for the js and ts flavours of these rules
const noUnusedExpressions = ['error', { allowShortCircuit: true, allowTernary: true }];
const noUnusedVars = ['error', { varsIgnorePattern: '^_', args: 'none', caughtErrors: 'none' }];

// rules for every file. oxlint's `correctness` category (set to error by the config) covers most of
// eslint:recommended and typescript-eslint recommended; the ones it does not enable by default are listed here.
export function coreRules(consoleUsage: ConsoleUsage): Rules {
  return {
    // eslint:recommended rules oxlint has but does not enable by default
    'no-case-declarations': 'error',
    'no-empty': 'error',
    'no-prototype-builtins': 'error',
    'no-regex-spaces': 'error',
    'no-unexpected-multiline': 'error',
    'preserve-caught-error': 'error',
    // eslint:recommended overrides
    'no-unused-expressions': noUnusedExpressions,
    'no-unused-vars': noUnusedVars,
    // allow constant conditions in loops (e.g. `while (true)`)
    'no-constant-condition': ['error', { checkLoops: false }],
    // allow fallthrough in switch statements by adding `// fallthrough`
    'no-fallthrough': ['error', { commentPattern: 'fallthrough' }],
    // additional rules
    curly: ['error', 'multi-line'],
    eqeqeq: 'error',
    'import/no-duplicates': ['error', { preferInline: true }],
    'no-array-constructor': 'error',
    'no-else-return': 'error',
    'no-eval': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-param-reassign': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'one-var': ['error', 'never'],
    'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
    'prefer-const': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    radix: ['error', 'as-needed'],
    ...(consoleUsage === 'ban' && { 'no-console': 'error' }),
    ...(consoleUsage === 'ban-log' && { 'no-console': ['error', { allow: ['error', 'warn', 'info'] }] }),
  };
}

// typescript files: typescript-eslint recommended rules oxlint does not enable by default, and our overrides
export function tsRules(): Rules {
  return {
    'typescript/no-namespace': 'error',
    'typescript/no-unnecessary-type-constraint': 'error',
    'typescript/no-unsafe-function-type': 'error',
    // not all old files are strict yet; `any` and ts comments stay allowed, as in v3
    'typescript/no-explicit-any': 'off',
    'typescript/ban-ts-comment': 'off',
    // dynamic sync `require()` is still in use
    'typescript/no-require-imports': 'off',
    // allow `interface I extends Base<Param> {}`
    'typescript/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
    'typescript/ban-tslint-comment': 'error',
  };
}

// javascript files: camelcase via ESLint's own rule (oxlint has none); ts files get naming-convention instead
export function jsRules(): Rules {
  return {
    'eslint-js/camelcase': 'error',
  };
}
```

If a smoke test later shows `no-unused-vars` reported twice on ts files, that means oxlint registers
`typescript/no-unused-vars` separately; the fix is to keep a single entry, which this file already does.

- [ ] **Step 4: Implement** `src/oxlint/rules/stylistic.ts`

```ts
import type { Rules } from './core.js';

type Indent = number | 'tab';

// the @stylistic rules of v3, unchanged except: func-call-spacing renamed (stylistic v6), jsx-props-no-multi-spaces
// removed (folded into no-multi-spaces), generator/yield star spacing switched to `after` so that on-demand oxfmt
// or prettier output (`function* f`) never violates lint. jsx-self-closing-comp and jsx-curly-brace-presence moved
// to oxlint's native react rules (see react.ts).
export function stylisticRules(indent: Indent): Rules {
  return {
    'stylistic/array-bracket-spacing': ['error', 'never'],
    'stylistic/block-spacing': 'error',
    'stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'stylistic/comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        // only-multiline accepts both the es5 and the `all` trailing comma style of formatters
        functions: 'only-multiline',
        enums: 'always-multiline',
        generics: 'only-multiline',
        tuples: 'only-multiline',
      },
    ],
    'stylistic/comma-spacing': 'error',
    'stylistic/computed-property-spacing': ['error', 'never'],
    'stylistic/eol-last': 'error',
    'stylistic/function-call-spacing': 'error',
    'stylistic/generator-star-spacing': ['error', 'after'],
    'stylistic/indent': [
      'error',
      indent,
      {
        SwitchCase: 1,
        // only when indent is 2, broken otherwise: https://github.com/eslint-stylistic/eslint-stylistic/issues/514
        offsetTernaryExpressions: indent === 2,
        ignoredNodes: [
          // list from https://github.com/eslint-stylistic/eslint-stylistic/blob/main/packages/eslint-plugin/configs/customize.ts
          // which disables indent checks for cases the rule does not handle properly
          'TSUnionType',
          'TSIntersectionType',
          'TSTypeParameterInstantiation',
          'FunctionExpression > .params[decorators.length > 0]',
          'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
          // more exclusions needed for prettier-style output
          'TSInterfaceHeritage',
          '.superTypeArguments',
          'CallExpression > .typeArguments',
          'ConditionalExpression *',
          'ArrowFunctionExpression',
          'TemplateLiteral *',
        ],
      },
    ],
    'stylistic/key-spacing': 'error',
    'stylistic/keyword-spacing': 'error',
    'stylistic/max-len': [
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
    'stylistic/member-delimiter-style': 'error',
    'stylistic/no-extra-semi': 'error',
    'stylistic/no-mixed-spaces-and-tabs': 'error',
    'stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
    'stylistic/no-trailing-spaces': 'error',
    'stylistic/no-whitespace-before-property': 'error',
    'stylistic/object-curly-spacing': ['error', 'always'],
    'stylistic/quote-props': ['error', 'as-needed'],
    'stylistic/quotes': ['error', 'single', { allowTemplateLiterals: 'avoidEscape', avoidEscape: true }],
    'stylistic/rest-spread-spacing': ['error', 'never'],
    'stylistic/semi': 'error',
    'stylistic/semi-spacing': 'error',
    'stylistic/space-before-blocks': 'error',
    'stylistic/space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
    'stylistic/space-in-parens': 'error',
    'stylistic/space-infix-ops': 'error',
    'stylistic/spaced-comment': ['error', 'always', { markers: ['/', ','], exceptions: ['*'] }],
    'stylistic/switch-colon-spacing': 'error',
    'stylistic/template-curly-spacing': ['error', 'never'],
    'stylistic/template-tag-spacing': ['error', 'never'],
    'stylistic/yield-star-spacing': ['error', 'after'],
  };
}

// jsx layout rules, for jsx/tsx files when the react option is on
export function stylisticJsxRules(indent: Indent): Rules {
  return {
    'stylistic/jsx-child-element-spacing': 'error',
    'stylistic/jsx-closing-bracket-location': ['error', 'line-aligned'],
    'stylistic/jsx-closing-tag-location': 'error',
    'stylistic/jsx-curly-spacing': 'error',
    'stylistic/jsx-equals-spacing': 'error',
    'stylistic/jsx-first-prop-new-line': 'error',
    'stylistic/jsx-function-call-newline': 'error',
    'stylistic/jsx-indent-props': ['error', indent],
    'stylistic/jsx-quotes': 'error',
    'stylistic/jsx-tag-spacing': [
      'error',
      { beforeSelfClosing: 'proportional-always', beforeClosing: 'proportional-always' },
    ],
    'stylistic/jsx-wrap-multilines': 'error',
  };
}
```

- [ ] **Step 5: Implement** `src/oxlint/rules/react.ts`

```ts
import type { Rules } from './core.js';

// eslint-plugin-react-hooks 7 ships these as its React Compiler rules; oxlint implements them natively under react/
// and enables them by default as warnings. off unless the consumer adopts the compiler (reactCompiler option).
const reactCompilerFamily = [
  'react/static-components', 'react/use-memo', 'react/void-use-memo', 'react/preserve-manual-memoization',
  'react/incompatible-library', 'react/immutability', 'react/globals', 'react/refs', 'react/set-state-in-effect',
  'react/error-boundaries', 'react/purity', 'react/set-state-in-render',
];

export function reactRules(reactCompiler: boolean): Rules {
  return {
    // eslint-plugin-react recommended, as implemented natively by oxlint (prop-types does not exist there;
    // it was unreliable under eslint too). listed explicitly so `correctness` category changes cannot drop them.
    'react/display-name': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-comment-textnodes': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-no-undef': 'error',
    'react/no-children-prop': 'error',
    'react/no-danger-with-children': 'error',
    'react/no-direct-mutation-state': 'error',
    'react/no-find-dom-node': 'error',
    'react/no-is-mounted': 'error',
    'react/no-render-return-value': 'error',
    'react/no-string-refs': 'error',
    'react/no-unescaped-entities': 'error',
    'react/no-unknown-property': 'error',
    // formerly @stylistic/jsx-self-closing-comp and @stylistic/jsx-curly-brace-presence
    'react/self-closing-comp': 'error',
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never', propElementValues: 'always' }],
    'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    ...Object.fromEntries(reactCompilerFamily.map((rule) => [rule, reactCompiler ? 'error' : 'off'])),
    // component files are PascalCase; index and routes files are exempt (replaces check-file of v3)
    'unicorn/filename-case': ['error', { case: 'pascalCase', ignore: ['^index\\.', '^routes\\.'] }],
  };
}

// hooks and HOCs: useThing.tsx, withAuth.tsx
export function reactHookFileRules(): Rules {
  return {
    'unicorn/filename-case': ['error', { case: 'camelCase' }],
  };
}

// allow `type Props = {}` in react components
// https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-675156492
export function reactTsxRules(): Rules {
  return {
    'typescript/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends', allowWithName: 'Props$' }],
  };
}
```

- [ ] **Step 6: Implement** `src/oxlint/rules/type-aware.ts`

```ts
import type { Rules } from './core.js';

// type-aware rules run only when the consumer's ROOT oxlint config sets `options: { typeAware: true }` and
// oxlint-tsgolint is installed. without that they are silent, so they can be listed unconditionally.
// runtime-bug catchers: typescript-eslint's recommended-type-checked minus the no-unsafe-* family (unusable while
// no-explicit-any is off) and the judgement calls (unbound-method, require-await, restrict-template-expressions).
const catchers = [
  'typescript/no-floating-promises',
  'typescript/no-misused-promises',
  'typescript/await-thenable',
  'typescript/no-base-to-string',
  'typescript/no-implied-eval',
  'typescript/no-misused-spread',
  'typescript/no-array-delete',
  'typescript/no-unsafe-unary-minus',
  'typescript/require-array-sort-compare',
  'typescript/restrict-plus-operands',
  'typescript/prefer-promise-reject-errors',
  'typescript/only-throw-error',
  'typescript/no-unsafe-enum-comparison',
  'typescript/switch-exhaustiveness-check',
  'typescript/use-unknown-in-catch-callback-variable',
  'typescript/no-unnecessary-type-assertion',
];

// the rest of oxlint's default-on type-aware set; explicitly off so `correctness: 'error'` cannot enable them
const defaultOnElsewhere = [
  'typescript/no-duplicate-type-constituents',
  'typescript/no-meaningless-void-operator',
  'typescript/no-redundant-type-constituents',
  'typescript/no-unnecessary-parameter-property-assignment',
  'typescript/no-useless-default-assignment',
  'typescript/no-useless-empty-export',
  'typescript/restrict-template-expressions',
  'typescript/unbound-method',
];

export function typeAwareRules(typeChecked: boolean): Rules {
  return {
    'typescript/no-for-in-array': 'error',
    ...Object.fromEntries(catchers.map((rule) => [rule, typeChecked ? 'error' : 'off'])),
    ...Object.fromEntries(defaultOnElsewhere.map((rule) => [rule, 'off'])),
  };
}
```

- [ ] **Step 7: Implement** `src/oxlint/rules/tests.ts`

```ts
import type { Rules } from './core.js';

// custom helpers running tests conditionally, plus hooks, where standalone expects are fine
const additionalTestBlockFunctions = [
  'beforeAll', 'beforeEach', 'afterEach', 'afterAll', 'testif', 'itif', 'testskipif', 'itskipif',
];

// oxlint's jest plugin, recommended set listed explicitly, with the v3 tweaks
export function jestRules(): Rules {
  return {
    'jest/no-commented-out-tests': 'error',
    'jest/no-deprecated-functions': 'error',
    'jest/no-done-callback': 'error',
    'jest/no-export': 'error',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/no-interpolation-in-snapshots': 'error',
    'jest/no-jasmine-globals': 'error',
    'jest/no-mocks-import': 'error',
    'jest/no-test-prefixes': 'error',
    'jest/valid-describe-callback': 'error',
    'jest/valid-expect': 'error',
    'jest/valid-expect-in-promise': 'error',
    // the recommended set is too strict for us
    'jest/expect-expect': 'off',
    'jest/no-alias-methods': 'off',
    'jest/no-conditional-expect': 'off',
    'jest/no-disabled-tests': 'off',
    'jest/no-standalone-expect': ['error', { additionalTestBlockFunctions }],
    // allow parameterized titles, using variables or ternaries
    'jest/valid-title': ['error', { ignoreTypeOfDescribeName: true, ignoreTypeOfTestName: true }],
    'no-console': 'error',
  };
}

export function vitestRules(): Rules {
  return {
    'vitest/expect-expect': 'off',
    'vitest/no-commented-out-tests': 'error',
    'vitest/no-identical-title': 'error',
    'vitest/no-import-node-test': 'error',
    'vitest/valid-describe-callback': 'error',
    'vitest/valid-expect': 'error',
    'vitest/valid-title': ['error', { ignoreTypeOfDescribeName: true }],
    'vitest/prefer-to-be': 'off',
    'vitest/no-focused-tests': 'error',
    'no-console': 'error',
  };
}

// eslint-plugin-mocha 12 recommended, everything at error, with the v3 tweaks:
// no-pending-tests off (v3 turned off the equivalent no-skipped-tests), no-setup-in-suite off (was
// no-setup-in-describe; incompatible with mocha-each and dynamically generated tests), exclusive tests promoted
// from warn to error, mocha's own prefer-arrow-callback instead of the core one
export function mochaRules(): Rules {
  return {
    'mocha/consistent-structure': ['error', { disallowDuplicateHooks: true }],
    'mocha/handle-done-callback': 'error',
    'mocha/no-async-and-done': 'error',
    'mocha/no-async-in-sync-tests': 'error',
    'mocha/no-async-suite': 'error',
    'mocha/no-code-after-done': 'error',
    'mocha/no-conditional-tests': 'error',
    'mocha/no-done-twice': 'error',
    'mocha/no-empty-title': 'error',
    'mocha/no-exclusive-tests': 'error',
    'mocha/no-exports': 'error',
    'mocha/no-identical-title': 'error',
    'mocha/no-mocha-arrows': 'error',
    'mocha/no-nested-tests': 'error',
    'mocha/no-pending-tests': 'off',
    'mocha/no-return-and-done': 'error',
    'mocha/no-setup-in-suite': 'off',
    'mocha/no-top-level-tests': 'error',
    'prefer-arrow-callback': 'off',
    'mocha/prefer-arrow-callback': 'error',
  };
}

// eslint-plugin-playwright flat/recommended promoted to error (errors-only policy), with the same tweaks as jest:
// no-skipped-test, expect-expect and no-conditional-expect off
export function playwrightRules(): Rules {
  return {
    'no-empty-pattern': 'off',
    'playwright/consistent-spacing-between-blocks': 'error',
    'playwright/max-nested-describe': 'error',
    'playwright/missing-playwright-await': 'error',
    'playwright/no-conditional-in-test': 'error',
    'playwright/no-duplicate-hooks': 'error',
    'playwright/no-duplicate-slow': 'error',
    'playwright/no-element-handle': 'error',
    'playwright/no-eval': 'error',
    'playwright/no-focused-test': 'error',
    'playwright/no-force-option': 'error',
    'playwright/no-nested-step': 'error',
    'playwright/no-networkidle': 'error',
    'playwright/no-page-pause': 'error',
    'playwright/no-standalone-expect': 'error',
    'playwright/no-unnecessary-assertions': 'error',
    'playwright/no-unsafe-references': 'error',
    'playwright/no-unused-locators': 'error',
    'playwright/no-useless-await': 'error',
    'playwright/no-useless-not': 'error',
    'playwright/no-wait-for-navigation': 'error',
    'playwright/no-wait-for-selector': 'error',
    'playwright/no-wait-for-timeout': 'error',
    'playwright/prefer-hooks-in-order': 'error',
    'playwright/prefer-hooks-on-top': 'error',
    'playwright/prefer-locator': 'error',
    'playwright/prefer-to-have-count': 'error',
    'playwright/prefer-to-have-length': 'error',
    'playwright/prefer-web-first-assertions': 'error',
    'playwright/valid-describe-callback': 'error',
    'playwright/valid-expect': 'error',
    'playwright/valid-expect-in-promise': 'error',
    'playwright/valid-test-tags': 'error',
    'playwright/valid-title': 'error',
    'playwright/expect-expect': 'off',
    'playwright/no-conditional-expect': 'off',
    'playwright/no-skipped-test': 'off',
  };
}
```

- [ ] **Step 8: Run to verify it passes** (`npm test`).

- [ ] **Step 9: Commit**

```bash
git add src/oxlint/rules
git commit -m "add oxlint rule sets: core, stylistic, react, type-aware, test frameworks

every rule of v3 mapped to oxlint or a js plugin; react compiler family and the
type-checked tier behind options, everything at error"
```

---

### Task 7: `oxlint(options)` assembly

**Files:**
- Create: `src/oxlint/options.ts`, `src/oxlint/index.ts` (replace stub), `src/oxlint/index.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 3 to 6.
- Produces: `oxlint(options?: OxlintOptions): OxlintConfig` where `OxlintConfig` is the `Config` type exported by
  `oxlint` (`import type { Config } from 'oxlint'`; if the name differs, take it from
  `node_modules/oxlint/dist/index.d.ts`).

- [ ] **Step 1: Write the failing test** `src/oxlint/index.test.ts`

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { oxlint } from './index.js';

type Override = { files: string[]; env?: Record<string, boolean>; rules?: Record<string, unknown>; jsPlugins?: unknown[] };

const overrides = (config: ReturnType<typeof oxlint>) => (config.overrides ?? []) as Override[];
const overrideFor = (config: ReturnType<typeof oxlint>, glob: string) =>
  overrides(config).find((o) => o.files.includes(glob));

test('defaults: native plugins, correctness as error, four js plugins', () => {
  const config = oxlint();
  assert.deepEqual(config.plugins, ['eslint', 'typescript', 'unicorn', 'oxc', 'import']);
  assert.deepEqual(config.categories, { correctness: 'error' });
  assert.deepEqual(
    (config.jsPlugins as { name: string }[]).map((p) => p.name),
    ['stylistic', 'perfectionist', 'eslint-js', 'typescript-js'],
  );
  assert.equal(config.options, undefined, 'typeAware is root-config-only and must not be set here');
});

test('environment and globals live in overrides so extends keeps them', () => {
  const config = oxlint();
  assert.deepEqual(overrideFor(config, '**/*')?.env, { node: true });
  assert.equal(overrideFor(config, '**/*.{ts,mts,cts,tsx}')?.rules?.['typescript-js/naming-convention'] !== undefined, true);
  assert.equal(overrideFor(config, '**/*.{js,mjs,cjs,jsx}')?.rules?.['eslint-js/camelcase'], 'error');
});

test('react option adds the react plugin, browser env for jsx and file naming', () => {
  const config = oxlint({ react: true });
  assert.ok(config.plugins?.includes('react'));
  const jsx = overrideFor(config, '**/*.{jsx,tsx}');
  assert.deepEqual(jsx?.env, { browser: true });
  assert.equal(jsx?.rules?.['react-hooks/exhaustive-deps'], 'error');
  assert.deepEqual(overrideFor(config, '**/{use,with}*.{jsx,tsx}')?.rules?.['unicorn/filename-case'], ['error', { case: 'camelCase' }]);
  assert.equal(config.rules?.['no-console'] !== undefined, false, 'no-console sits in the all-files override');
  assert.deepEqual(overrideFor(config, '**/*')?.rules?.['no-console'], ['error', { allow: ['error', 'warn', 'info'] }]);
});

test('test framework options add their overrides and plugins', () => {
  const jest = oxlint({ jest: true, testsDir: 'tests' });
  const jestOverride = overrides(jest).find((o) => o.files[0] === 'tests/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}');
  assert.deepEqual(jestOverride?.env, { jest: true });
  assert.equal(jestOverride?.rules?.['jest/no-focused-tests'], 'error');
  assert.ok(jest.plugins?.includes('jest'));

  const mocha = oxlint({ mocha: true, testsDir: 'test' });
  const mochaOverride = overrides(mocha).find((o) => o.files[0] === 'test/**/*.{js,mjs,cjs,ts,mts,cts}');
  assert.deepEqual(mochaOverride?.env, { mocha: true });
  assert.deepEqual((mochaOverride?.jsPlugins as { name: string }[]).map((p) => p.name), ['mocha']);
  assert.deepEqual(overrides(mocha).find((o) => o.files[0] === 'test/**/_*')?.rules, { 'mocha/no-exports': 'off' });

  const playwright = oxlint({ playwright: true });
  assert.ok(overrides(playwright).some((o) => o.rules?.['playwright/no-focused-test'] === 'error'));
  assert.ok(oxlint({ vitest: true }).plugins?.includes('vitest'));
});

test('a11y, reactCompiler and typeChecked toggles', () => {
  assert.ok(oxlint({ react: true, a11y: true }).plugins?.includes('jsx-a11y'));
  assert.equal(overrideFor(oxlint({ react: true }), '**/*.{jsx,tsx}')?.rules?.['react/purity'], 'off');
  assert.equal(overrideFor(oxlint({ react: true, reactCompiler: true }), '**/*.{jsx,tsx}')?.rules?.['react/purity'], 'error');
  assert.equal(overrideFor(oxlint(), '**/*.{ts,mts,cts,tsx}')?.rules?.['typescript/no-floating-promises'], 'off');
  assert.equal(overrideFor(oxlint({ typeChecked: true }), '**/*.{ts,mts,cts,tsx}')?.rules?.['typescript/no-floating-promises'], 'error');
});

test('config is JSON-serialisable (plain object, absolute plugin paths)', () => {
  const config = oxlint({ react: true, jest: true, mocha: true, playwright: true, vitest: true });
  assert.deepEqual(JSON.parse(JSON.stringify(config)), config);
});
```

- [ ] **Step 2: Run to verify it fails** (`npm test`).

- [ ] **Step 3: Implement** `src/oxlint/options.ts`

```ts
export type OxlintOptions = {
  // whether to ban or allow console usage. defaults to 'ban-log' (allows console.error/warn/info) when react is
  // enabled, 'allow' otherwise
  console?: 'ban' | 'ban-log' | 'allow';
  // number of spaces to use for indentation, or 'tab' (default: 2)
  indent?: number | 'tab';
  // directory where test files are located (default: `{spec,test,tests}`). files in __tests__ folders and files
  // named *.spec.* / *.test.* are picked up as test files anywhere
  testsDir?: string;
  jest?: boolean;
  mocha?: boolean;
  playwright?: boolean;
  react?: boolean;
  vitest?: boolean;
  // React Compiler rules (react/immutability, react/purity, react/refs, ...). off until a project adopts the compiler
  reactCompiler?: boolean;
  // type-aware runtime-bug catchers (no-floating-promises, no-misused-promises, ...). needs the root config's
  // `options: { typeAware: true }` and oxlint-tsgolint to have any effect
  typeChecked?: boolean;
  // oxlint's built-in jsx-a11y rules
  a11y?: boolean;
};

export type ResolvedOptions = Required<Omit<OxlintOptions, 'console'>> & { console: 'ban' | 'ban-log' | 'allow' };

export function resolveOptions(options: OxlintOptions): ResolvedOptions {
  const react = options.react ?? false;
  return {
    console: options.console ?? (react ? 'ban-log' : 'allow'),
    indent: options.indent ?? 2,
    testsDir: options.testsDir ?? '{spec,test,tests}',
    jest: options.jest ?? false,
    mocha: options.mocha ?? false,
    playwright: options.playwright ?? false,
    react,
    vitest: options.vitest ?? false,
    reactCompiler: options.reactCompiler ?? false,
    typeChecked: options.typeChecked ?? false,
    a11y: options.a11y ?? false,
  };
}
```

- [ ] **Step 4: Implement** `src/oxlint/index.ts`

```ts
import type { Config } from 'oxlint';

import { globs, scriptExtensions, testGlobs, testHelperGlobs } from './globs.js';
import { resolveOptions, type OxlintOptions } from './options.js';
import { jsPlugins } from './plugins.js';
import { coreRules, jsRules, tsRules } from './rules/core.js';
import { reactHookFileRules, reactRules, reactTsxRules } from './rules/react.js';
import { stylisticJsxRules, stylisticRules } from './rules/stylistic.js';
import { jestRules, mochaRules, playwrightRules, vitestRules } from './rules/tests.js';
import { typeAwareRules } from './rules/type-aware.js';

export type { OxlintOptions } from './options.js';
export type OxlintConfig = Config;

type Override = NonNullable<Config['overrides']>[number];

/**
 * Build the shared oxlint configuration.
 *
 * Use it through `extends` so a project can layer its own rules, ignores and overrides on top:
 *
 *   export default defineConfig({ extends: [oxlint({ react: true, vitest: true })], ignorePatterns: ['public'] });
 *
 * Everything file-scoped (environments, globals, per-language rules) is expressed as overrides, because oxlint's
 * `extends` inherits rules, plugins, jsPlugins and overrides but drops top-level env, globals and settings.
 */
export function oxlint(options: OxlintOptions = {}): Config {
  const o = resolveOptions(options);

  const plugins: NonNullable<Config['plugins']> = ['eslint', 'typescript', 'unicorn', 'oxc', 'import'];
  if (o.react) plugins.push('react');
  if (o.jest) plugins.push('jest');
  if (o.vitest) plugins.push('vitest');
  if (o.a11y) plugins.push('jsx-a11y');

  const overrides: Override[] = [
    {
      files: [globs.all],
      env: { node: true },
      rules: { ...coreRules(o.console), ...stylisticRules(o.indent) },
    },
    {
      files: [globs.ts],
      rules: {
        ...tsRules(),
        ...typeAwareRules(o.typeChecked),
        'typescript-js/naming-convention': ['error', ...namingConventionOptions],
      },
    },
    {
      files: [globs.js],
      rules: jsRules(),
    },
  ];

  if (o.react) {
    overrides.push(
      {
        files: [globs.jsx],
        env: { browser: true },
        rules: { ...stylisticJsxRules(o.indent), ...reactRules(o.reactCompiler) },
      },
      { files: [globs.hooks], rules: reactHookFileRules() },
      { files: [globs.tsx], rules: reactTsxRules() },
    );
  }

  if (o.jest) {
    overrides.push({
      files: testGlobs(o.testsDir),
      env: { jest: true },
      globals: { DB: 'readonly', GQL: 'readonly', Setup: 'readonly', app: 'readonly' },
      rules: jestRules(),
    });
  }

  if (o.vitest) {
    overrides.push({ files: testGlobs(o.testsDir), env: { vitest: true }, rules: vitestRules() });
  }

  if (o.mocha) {
    overrides.push(
      {
        files: testGlobs(o.testsDir, scriptExtensions),
        env: { mocha: true },
        jsPlugins: [jsPlugins.mocha()],
        rules: mochaRules(),
      },
      // helper files in testsDir which are not test suites
      { files: testHelperGlobs(o.testsDir), rules: { 'mocha/no-exports': 'off' } },
    );
  }

  if (o.playwright) {
    overrides.push({
      files: testGlobs(o.testsDir, scriptExtensions),
      jsPlugins: [jsPlugins.playwright()],
      rules: playwrightRules(),
    });
  }

  return {
    plugins,
    categories: { correctness: 'error' },
    jsPlugins: [jsPlugins.stylistic(), jsPlugins.perfectionist(), jsPlugins.eslintJs(), jsPlugins.typescriptJs()],
    rules: {
      'perfectionist/sort-named-imports': [
        'error',
        { type: 'custom', alphabet, ignoreCase: false, ignoreAlias: true, groups: ['type-import', 'value-import'] },
      ],
      'perfectionist/sort-named-exports': [
        'error',
        { type: 'custom', alphabet, ignoreCase: false, groups: ['type-export', 'value-export'] },
      ],
    },
    overrides,
  };
}

// perfectionist sorts with localeCompare by default ('123..AaBbCc..'); we want uppercase before lowercase and
// symbols first. only the needed part of the alphabet is listed
const alphabet = '_-.@/#~$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
```

Add `import { namingConventionOptions } from '../plugins/typescript.js';` at the top. The `namingConventionOptions`
array is `as const`; spread it into a mutable array with `[...namingConventionOptions]` if the `Config` type
rejects readonly tuples.

If the `Config` type in `oxlint` does not accept `jsPlugins` inside overrides or `env` values, check
`node_modules/oxlint/dist/index.d.ts` for `OxlintOverride` and adjust the field names; the schema (verified) allows
`files`, `excludeFiles`, `env`, `globals`, `plugins`, `jsPlugins`, `rules` in an override.

- [ ] **Step 5: Run to verify it passes** (`npm test`).

- [ ] **Step 6: Commit**

```bash
git add src/oxlint/index.ts src/oxlint/options.ts src/oxlint/index.test.ts
git commit -m "add oxlint() config factory

assembles plugins, js plugins and overrides from the options; environments and
globals live in overrides so that consumers can use the config through extends"
```

---

### Task 8: CLI smoke test over fixtures

**Files:**
- Create: `test/fixtures/base/src/naming.ts`, `test/fixtures/base/src/legacy.js`, `test/fixtures/base/src/style.ts`,
  `test/fixtures/base/src/sorting.ts`, `test/fixtures/base/src/clean.ts`, `test/fixtures/react/src/badName.tsx`,
  `test/fixtures/react/src/useThing.tsx`, `test/fixtures/react/src/Card.tsx`, `test/fixtures/tests/spec/focused.spec.ts`,
  `test/fixtures/tests/spec/_helper.ts`, `src/smoke.test.ts`, `src/smoke-helpers.ts`

**Interfaces:**
- Consumes: `oxlint()` from Task 7.
- Produces: `runOxlint(fixtureDir, config)` returning `Set<string>` of `"relative/file.ts:<rule>"` entries.

- [ ] **Step 1: Create the fixtures**

`test/fixtures/base/src/naming.ts`:

```ts
function fetch_user() {}
class Api { Get_Data() {} getData() {} }
const resolvers = { user_name() {}, __resolveType() {}, Bad_Method() {} };
type user_profile = {};
type Ok = {};
import my_lib from 'my-lib';
import okLib from 'ok-lib';
export { fetch_user, Api, resolvers, my_lib, okLib };
export type { user_profile, Ok };
```

`test/fixtures/base/src/legacy.js`:

```js
const user_name = 1;
export { user_name };
```

`test/fixtures/base/src/style.ts`:

```ts
export const bad = "double";
export function *gen() { yield *bad; }
```

`test/fixtures/base/src/sorting.ts`:

```ts
import { zeta, type Alpha, beta } from 'zeta';
export { zeta, beta };
export type { Alpha };
export { beta as b2, zeta as z2 };
```

`test/fixtures/base/src/clean.ts`:

```ts
import { type Alpha, beta } from 'zeta';

export function fetchUser(input: Alpha): Alpha {
  return beta(input);
}
```

`test/fixtures/react/src/badName.tsx`:

```tsx
export function BadName() {
  return <div>x</div>;
}
```

`test/fixtures/react/src/useThing.tsx`:

```tsx
import { useEffect, useState } from 'react';

export function useThing(id: string) {
  const [v, setV] = useState('');
  useEffect(() => { setV(id); }, []);
  return v;
}
```

`test/fixtures/react/src/Card.tsx`:

```tsx
export function Card({ title }: { title: string }) {
  return <div className='x'>{title}</div>;
}
```

`test/fixtures/tests/spec/focused.spec.ts`:

```ts
describe.only('suite', () => {
  it('works', () => {});
});
export {};
```

`test/fixtures/tests/spec/_helper.ts`:

```ts
export const helper = 1;
```

- [ ] **Step 2: Write the helper** `src/smoke-helpers.ts`

```ts
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRequire } from 'node:module';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const fixturesRoot = path.join(packageRoot, 'test', 'fixtures');

const require = createRequire(import.meta.url);
const oxlintBin = path.join(path.dirname(require.resolve('oxlint/package.json')), 'bin', 'oxlint');

// copies a fixture tree to a temp dir, writes the config next to it and runs oxlint with json output.
// returns "relative/path.ts:<rule>" strings, e.g. "src/naming.ts:typescript-js/naming-convention"
export function runOxlint(fixture: string, config: object): Set<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-standard-'));
  fs.cpSync(path.join(fixturesRoot, fixture), dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.oxlintrc.json'), JSON.stringify(config));
  const result = spawnSync(process.execPath, [oxlintBin, '--disable-nested-config', '-f', 'json', '.'], {
    cwd: dir,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(result.stdout) as { diagnostics: { filename: string; code: string }[] };
  const found = new Set<string>();
  for (const d of parsed.diagnostics) {
    // code looks like "eslint(no-unused-vars)" or "typescript-js(naming-convention)"
    const match = d.code.match(/^([^(]+)\((.+)\)$/);
    const rule = match ? (match[1] === 'eslint' ? match[2] : `${match[1]}/${match[2]}`) : d.code;
    found.add(`${path.relative(dir, d.filename).split(path.sep).join('/')}:${rule}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return found;
}
```

Before relying on the JSON shape, run once by hand and adapt the field names:

```bash
mkdir -p /tmp/ox-shape && printf 'const user_name = 1;\n' > /tmp/ox-shape/a.js && printf '{ "jsPlugins": [], "rules": { "no-unused-vars": "error" } }' > /tmp/ox-shape/.oxlintrc.json
cd /tmp/ox-shape && node "$(npm root)/oxlint/bin/oxlint" -f json . | head -40
```

The diagnostics array, the `filename` and the `code` fields are what the helper reads; rename in the helper if
oxlint names them differently.

- [ ] **Step 3: Write the failing test** `src/smoke.test.ts`

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { oxlint } from './oxlint/index.js';
import { runOxlint } from './smoke-helpers.js';

const has = (found: Set<string>, entry: string) => assert.ok(found.has(entry), `expected ${entry} in ${[...found].join(', ')}`);
const lacks = (found: Set<string>, file: string) =>
  assert.ok(![...found].some((e) => e.startsWith(`${file}:`)), `expected no findings in ${file}: ${[...found].join(', ')}`);

test('base config: naming, camelcase, stylistic and perfectionist fire; clean file is clean', () => {
  const found = runOxlint('base', oxlint());
  has(found, 'src/naming.ts:typescript-js/naming-convention');
  has(found, 'src/legacy.js:eslint-js/camelcase');
  has(found, 'src/style.ts:stylistic/quotes');
  has(found, 'src/style.ts:stylistic/generator-star-spacing');
  has(found, 'src/sorting.ts:perfectionist/sort-named-imports');
  has(found, 'src/sorting.ts:perfectionist/sort-named-exports');
  lacks(found, 'src/clean.ts');
  // naming-convention must not report unused-import noise twice: ts files get one no-unused-vars rule
  assert.equal([...found].filter((e) => e === 'src/naming.ts:no-unused-vars').length <= 1, true);
});

test('react config: file naming, hooks and jsx quotes', () => {
  const found = runOxlint('react', oxlint({ react: true }));
  has(found, 'src/badName.tsx:unicorn/filename-case');
  lacks(found, 'src/useThing.tsx'.replace('src/useThing.tsx', 'src/useThing.tsx:unicorn/filename-case'));
  has(found, 'src/useThing.tsx:react-hooks/exhaustive-deps');
  has(found, 'src/Card.tsx:stylistic/jsx-quotes');
});

test('test frameworks: focused tests are errors, helper files are exempt from no-exports', () => {
  for (const [option, rule] of [
    ['jest', 'jest/no-focused-tests'],
    ['vitest', 'vitest/no-focused-tests'],
    ['mocha', 'mocha/no-exclusive-tests'],
    ['playwright', 'playwright/no-focused-test'],
  ] as const) {
    const found = runOxlint('tests', oxlint({ [option]: true, testsDir: 'spec' }));
    has(found, `spec/focused.spec.ts:${rule}`);
    assert.ok(!found.has('spec/_helper.ts:mocha/no-exports'), `${option}: helper exempt`);
  }
});
```

The `lacks` call for `useThing.tsx` should assert that no `unicorn/filename-case` finding exists for that file;
write it as `assert.ok(!found.has('src/useThing.tsx:unicorn/filename-case'))`.

- [ ] **Step 4: Run to verify it fails, then passes**

Run: `npm test`. Expected first: failures naming the missing entries. Fix the config until every assertion holds.
Findings that appear but are not asserted are fine as long as `clean.ts` stays clean. Known things to check when
a rule does not fire: the plugin name in the diagnostic `code` (adapt the helper's mapping), the override glob (the
fixture is copied to the temp root, so `src/...` paths are relative to the config).

- [ ] **Step 5: Commit**

```bash
git add test/fixtures src/smoke.test.ts src/smoke-helpers.ts
git commit -m "add cli smoke test over fixtures for every option"
```

---

### Task 9: Lint this repository with its own package

**Files:**
- Create: `oxlint.config.ts`, `oxfmt.config.ts`, `prettier.config.js`
- Modify: `package.json` (already has the scripts), fix any findings in `src/`

- [ ] **Step 1: Create the configs**

`oxlint.config.ts`:

```ts
import { defineConfig } from 'oxlint';

import { oxlint } from './src/oxlint/index.js';

export default defineConfig({
  extends: [oxlint()],
  ignorePatterns: ['dist', 'test/fixtures'],
});
```

The import must resolve from source under Node's type stripping: use `./src/oxlint/index.ts` if `.js` fails to
resolve (Node maps `.js` to `.ts` only with `--experimental-transform-types`; with plain type stripping, import
the `.ts` path).

`oxfmt.config.ts`:

```ts
import { defineConfig } from 'oxfmt';

import { oxfmt } from './src/oxfmt.ts';

export default defineConfig({ ...oxfmt(), ignorePatterns: ['dist', 'test/fixtures'] });
```

`prettier.config.js`:

```js
import { prettier } from './dist/prettier.js';

export default prettier;
```

- [ ] **Step 2: Run and fix**

```bash
npm run build && npx oxlint
```

Expected: findings in `src/` (style, sorting). Fix with `npx oxlint --fix` and by hand until clean. Do not touch
`test/fixtures`.

- [ ] **Step 3: Commit**

```bash
git add oxlint.config.ts oxfmt.config.ts prettier.config.js src
git commit -m "lint the repository with its own oxlint and oxfmt configs"
```

---

### Task 10: README and migration guide

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite `README.md`** with these sections, concrete and skimmable (tables and examples, no prose):

1. Install: `npm install --save-dev @ovos-media/coding-standard` and the Node requirement
   `^20.19.0 || >=22.18.0`; `oxlint-tsgolint` optional for type-aware rules.
2. `oxlint.config.ts` usage: the `extends` example from the spec section 5, then the options table (name, type,
   default, effect), including `reactCompiler`, `typeChecked`, `a11y`, and the note that `typeChecked` and
   `no-for-in-array` need `options: { typeAware: true }` in the root config.
3. `oxfmt.config.ts` and `prettier.config.js` usage, the spread form for overrides, `sortPackageJson: false` as the
   example, per-directory `overrides`.
4. Monorepo section: install once at the root (with the link to https://github.com/oxc-project/oxc/issues/26017),
   nested `oxlint.config.ts` per package, one root run, root-only `typeAware`.
5. Editors: `oxc.oxc-vscode` (https://github.com/oxc-project/oxc-vscode) and the JetBrains plugin
   (https://github.com/oxc-project/oxc-intellij-plugin); format on demand or on save.
6. Migration from v3: a table of removed options (`cypress`, `disableTypeChecked`) and their replacements, the
   `eslint` entry point removal, rule-name changes for disable directives (`@typescript-eslint/naming-convention`
   to `typescript-js/naming-convention`, `camelcase` to `eslint-js/camelcase`, `react/jsx-no-bind` removed), the
   stylistic v6 renames, `generator-star-spacing` now `after`, TypeScript 7 tsconfig requirements for type-aware
   mode (`baseUrl`, `moduleResolution: node10`, `rootDir`) with https://github.com/andrewbranch/ts5to6.
7. Dependencies: what is heavy and why (link to the comments in `src/plugins/typescript.ts` and
   `src/oxlint/plugins.ts`), and exactly what it would take to drop them with full parity: in-house
   `naming-convention` (five selectors), in-house `sort-named-imports`/`sort-named-exports`, and mocha rules on
   oxlint's jest plugin; after which `eslint`, `@typescript-eslint/*` and `eslint-plugin-mocha` leave the tree.

- [ ] **Step 2: Check every link resolves** (`grep -oE 'https://[^ )]+' README.md | sort -u` and open a few).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "readme for v4: oxlint and oxfmt usage, monorepo setup, migration from v3"
```

---

### Task 11: Validate against a real consumer with yalc (private, nothing committed here)

- [ ] **Step 1:** `npm run build && npx yalc publish` in this repo.
- [ ] **Step 2:** In the consumer worktree: `npx yalc add @ovos-media/coding-standard` at the root only, write the root
  `oxlint.config.ts` and one package `oxlint.config.ts` per the README, bump Node if needed, run `oxlint` from the
  root, and compare findings with the consumer's current lint output package by package.
- [ ] **Step 3:** Record every difference and its cause in `.superpowers/private/validation-notes.md` (untracked).
  Any difference caused by this package's config, rather than by a renamed directive or a known v6 change, is a bug
  to fix in the corresponding task's files, with a fixture added to Task 8.

---

### Task 12: Draft pull request

- [ ] **Step 1:** `git push` the branch, then `gh pr create --draft --base master --title "v4: oxlint + oxfmt replace eslint + prettier"`
  with a body that is skimmable (tables, examples, no narrative), covering: what's new (entry points, options),
  benefits (measured runtimes, one runner), trade-offs (JS plugins, `eslint` still a dependency, type-aware needs
  tsgolint and TypeScript 7-clean tsconfigs), comparisons (v3 vs v4 option table, rule mapping table), migration
  steps, and exactly what is needed to drop the heavy dependencies with full parity. Links for every package,
  issue and PR. No mention of any private repository.

---

## Self-review

- Spec coverage: 4.1 dependencies (Task 1), 4.2 options (Task 7), 4.3 config shape (Task 7), 4.4 rule mapping
  (Task 6), 4.5 wrapper and its comment (Task 4), 4.6 perfectionist comment (Task 5), 4.7 oxfmt/prettier (Task 2),
  5 consumer usage and 6 migration (Task 10), 7 tests (Tasks 4 to 8), 8 validation (Task 11), 11 open items
  (Task 1 peer meta, Task 6 stylistic version and generator spacing, Task 7 no `options` field).
- Placeholders: none; every step carries its content.
- Type consistency: `Rules = Record<string, unknown>` throughout; `JsPlugin` name/specifier shape used by Tasks 5
  and 7; `namingConventionOptions` exported by Task 4 and consumed by Task 7; `testGlobs(testsDir, extensions?)`
  signature used identically in Tasks 3, 7 and 8.
