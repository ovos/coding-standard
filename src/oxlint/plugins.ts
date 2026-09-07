import { fileURLToPath } from 'node:url';

export type JsPlugin = { name: string; specifier: string };

// absolute paths: oxlint resolves plugin specifiers relative to the consumer's config file, and consumers in a
// monorepo without hoisting would otherwise resolve different copies per package. oxlint deduplicates js plugins
// by resolved path and rejects a second copy of the same plugin name
// (https://github.com/oxc-project/oxc/issues/26017), so consumers must install this package once, at the root.
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
   * dependencies: the plugin imports @typescript-eslint/utils, which requires `eslint` at runtime and fails to
   * load without it (https://github.com/oxc-project/oxc/issues/17734). With perfectionist, the naming wrapper
   * (src/plugins/typescript.ts) and eslint-plugin-mocha removed, this package would need neither eslint nor
   * typescript-eslint (verified: stylistic, oxlint-plugin-eslint and eslint-plugin-playwright load with both
   * absent).
   *
   * Rejected replacements:
   *   - oxlint's native `sort-imports`: members in plain character order, no types-first, no export sorting.
   *   - @longzai-intelligence's oxlint port: UNLICENSED, two rules, no sort-named-exports, no repository.
   * Possible future actions:
   *   - two in-house rules with the same options: about 80 to 100 lines, exact parity, zero dependencies; the
   *     only way to an eslint-free package while keeping enforcement.
   *   - oxfmt's planned `sortNamedImports` (https://github.com/oxc-project/oxc/issues/23456) and "full
   *     perfectionist support by oxfmt" (https://github.com/oxc-project/oxc/issues/22521; first attempt
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
  // syntactically, but none of the done-callback rules.
  mocha: (): JsPlugin => ({ name: 'mocha', specifier: resolvePlugin('eslint-plugin-mocha') }),

  // eslint-plugin-playwright (https://github.com/mskelton/eslint-plugin-playwright); no runtime dependency on
  // eslint
  playwright: (): JsPlugin => ({ name: 'playwright', specifier: resolvePlugin('eslint-plugin-playwright') }),
};
