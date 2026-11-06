import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCallSites } from 'node:util';

export type OxlintOptions = {
  /**
   * whether to ban or allow console usage. 'ban-log' allows console.error/warn/info
   * @default 'ban-log' when react is enabled, 'allow' otherwise
   */
  console?: 'ban' | 'ban-log' | 'allow';
  /**
   * number of spaces to use for indentation, or 'tab'
   * @default 2
   */
  indent?: number | 'tab';
  /**
   * directory where test files are located.
   * files in __tests__ folders and files named *.spec.* / *.test.* are picked up as test files anywhere
   * @default '{spec,test,tests}'
   */
  testsDir?: string;
  /**
   * jest-specific rules and globals for test files
   * @default false
   */
  jest?: boolean;
  /**
   * mocha-specific rules and globals for test files
   * @default false
   */
  mocha?: boolean;
  /**
   * playwright-specific rules for test files
   * @default false
   */
  playwright?: boolean;
  /**
   * react rules, jsx layout rules and component file naming for jsx/tsx files
   * @default false
   */
  react?: boolean;
  /**
   * vitest-specific rules and globals for test files
   * @default false
   */
  vitest?: boolean;
  /**
   * React Compiler rules (react/immutability, react/purity, react/refs, ...), for projects that adopted the compiler
   * @default false
   */
  reactCompiler?: boolean;
  /**
   * type-aware runtime-bug catchers (no-floating-promises, no-misused-promises, ...).
   * needs the root config's `options: { typeAware: true }` and oxlint-tsgolint to have any effect
   * @default false
   */
  typeChecked?: boolean;
  /**
   * every rule of oxlint's correctness category, including its type-aware rules and the few this standard leaves out.
   * covers the plugins enabled at the top level, but not the react, jest and vitest rules listed in overrides
   * @default false
   */
  fullCorrectness?: boolean;
  /**
   * type-aware rules for js files too: `true` for every js file, or a list of globs.
   * off by default as in v3, because plain js has inferred types only.
   * the files should be in a tsconfig with `allowJs`, ideally `checkJs`
   * @default false
   */
  typeAwareJs?: boolean | string[];
  /**
   * directory or tsconfig file whose `paths` define the local absolute imports, for example `tsconfig.app.json`.
   * a relative path starts at the config file that calls `oxlint()`
   * @default the nearest tsconfig.json from the config file that calls `oxlint()` up
   */
  tsconfig?: string;
  /**
   * report import order and groups in the editor and in CI, as `import/order` did in v3.
   * set to false in a package whose imports must stay in their order, for example because of import cycles,
   * where import order decides which module runs first
   * @default true
   */
  sortImports?: boolean;
  /**
   * oxlint's built-in jsx-a11y rules
   * @default false
   */
  a11y?: boolean;
};

export type ResolvedOptions = Required<OxlintOptions>;

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));

// the directory of the config file that called `oxlint()`, so that each package in a monorepo gets its own tsconfig.
// oxlint loads nested configs with the root as the current directory, so `process.cwd()` can't tell them apart.
// a forgotten option there would mix local imports with npm packages, and `oxlint --fix` would sort them that way
function callingConfigDirectory(): string {
  for (const { scriptName } of getCallSites()) {
    // a config file is always a file URL, also a CommonJS one, because oxlint loads it with `import()`
    if (!scriptName.startsWith('file:')) continue;
    const file = fileURLToPath(scriptName);
    if (!file.startsWith(packageRoot)) return path.dirname(file);
  }
  return process.cwd();
}

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
    fullCorrectness: options.fullCorrectness ?? false,
    typeAwareJs: options.typeAwareJs ?? false,
    tsconfig: path.resolve(callingConfigDirectory(), options.tsconfig ?? ''),
    sortImports: options.sortImports ?? true,
    a11y: options.a11y ?? false,
  };
}
