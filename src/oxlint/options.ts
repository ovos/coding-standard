export type OxlintOptions = {
  // whether to ban or allow console usage. defaults to 'ban-log' (allows console.error/warn/info) when react is
  // enabled, 'allow' otherwise
  console?: 'ban' | 'ban-log' | 'allow';
  // number of spaces to use for indentation, or 'tab' (default: 2)
  indent?: number | 'tab';
  // directory where test files are located (default: `{spec,test,tests}`). files in __tests__ folders and files
  // named *.spec.* / *.test.* are picked up as test files anywhere
  testsDir?: string;
  // jest-specific rules and globals for test files
  jest?: boolean;
  // mocha-specific rules and globals for test files
  mocha?: boolean;
  // playwright-specific rules for test files
  playwright?: boolean;
  // react rules, jsx layout rules and component file naming for jsx/tsx files
  react?: boolean;
  // vitest-specific rules and globals for test files
  vitest?: boolean;
  // React Compiler rules (react/immutability, react/purity, react/refs, ...). off until a project adopts the
  // compiler
  reactCompiler?: boolean;
  // type-aware runtime-bug catchers (no-floating-promises, no-misused-promises, ...). needs the root config's
  // `options: { typeAware: true }` and oxlint-tsgolint to have any effect
  typeChecked?: boolean;
  // oxlint's built-in jsx-a11y rules
  a11y?: boolean;
};

export type ResolvedOptions = Required<OxlintOptions>;

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
