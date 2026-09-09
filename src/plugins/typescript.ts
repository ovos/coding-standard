import { createRequire } from 'node:module';

/*
 * typescript-eslint's `naming-convention` rule, executed by oxlint through its JS-plugin bridge.
 *
 * Why a wrapper: oxlint has no native naming-convention. tsgolint is growing one
 * (https://github.com/oxc-project/tsgolint/issues/186, implementations proposed in
 * https://github.com/oxc-project/tsgolint/pull/1075 and https://github.com/oxc-project/tsgolint/pull/1167), but it
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
 *     compiler (via the plugin's own astUtils), @typescript-eslint/scope-manager, ESLint's modules, ajv and semver.
 *     Paid once per lint-staged commit, editor session (the language server keeps the plugin loaded) or CI run.
 *     The rule is taken from the plugin's public entry point; loading `dist/rules/naming-convention.js` by file
 *     path, a private location, measured the same (412 ms against 423 ms cold), so nothing depends on the
 *     package's file layout. The entry point does not need `@typescript-eslint/parser`, a peer this package does
 *     not install.
 *   - per file: about 1.8 ms, roughly 7 s per 4,000 ts files, because the rule resolves scope for every matched
 *     name to compute modifiers (`unused`, `global`) whether or not the configured selectors use them. Not tunable
 *     from here.
 *   - dependencies: @typescript-eslint/eslint-plugin (https://github.com/typescript-eslint/typescript-eslint) and
 *     its tree (scope-manager, type-utils, utils, typescript-estree), plus eslint at runtime.
 *
 * Alternatives, and when to take them:
 *   - an in-house AST-only rule for the five selectors: about 100 to 150 lines, about 0.2 ms per file, no
 *     typescript-eslint dependency, but the semantics become ours. A September 2026 spike diverged from upstream on
 *     quoted keys, function-typed properties and leading-underscore defaults before those were pinned by fixtures.
 *     Worth it only if the 10 s per full run or the dependency tree starts to matter.
 *   - tsgolint's native rule once merged and registered in oxlint: delete this file, switch the config to
 *     `typescript/naming-convention`, rename disable directives back to `@typescript-eslint/naming-convention`.
 *
 * `typescript.test.ts` pins the wrapper's behaviour to upstream on 16 fixtures.
 */

type RuleContext = { sourceCode?: object };
type RuleModule = { meta: unknown; create: (context: RuleContext) => Record<string, unknown> };

const require = createRequire(import.meta.url);
const upstreamPlugin = require('@typescript-eslint/eslint-plugin') as { rules: Record<string, RuleModule> };
const upstream: RuleModule = upstreamPlugin.rules['naming-convention'];

const emptyParserServices = {
  esTreeNodeToTSNodeMap: new Map(),
  tsNodeToESTreeNodeMap: new Map(),
  program: null,
};

function withParserServices(context: RuleContext): RuleContext {
  const sourceCode = Object.create(context.sourceCode ?? {}) as object;
  Object.defineProperty(sourceCode, 'parserServices', {
    value: emptyParserServices,
    enumerable: true,
  });
  const derived = Object.create(context) as RuleContext;
  Object.defineProperty(derived, 'sourceCode', { value: sourceCode, enumerable: true });
  return derived;
}

export type NamingConventionSelector = {
  selector: string;
  format: string[];
  leadingUnderscore?: string;
};

// the five selectors of this standard. property and variable names are deliberately unchecked: all styles
// are in use (snake_case model fields, PascalCase graphql types, UPPER_CASE constants, kebab-case headers)
export const namingConventionOptions: NamingConventionSelector[] = [
  // PascalCase to allow react function components
  { selector: 'function', format: ['camelCase', 'PascalCase'] },
  { selector: 'method', format: ['camelCase'] },
  // snake_case for graphql resolvers of snake_cased fields, double underscore for `__resolveType` and similar
  {
    selector: 'objectLiteralMethod',
    format: ['camelCase', 'snake_case'],
    leadingUnderscore: 'allowDouble',
  },
  { selector: 'typeLike', format: ['PascalCase', 'UPPER_CASE'] },
  { selector: 'import', format: ['camelCase', 'PascalCase'] },
];

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
