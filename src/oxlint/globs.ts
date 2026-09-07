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
export function testGlobs(
  testsDir: string,
  extensions: readonly string[] = allExtensions,
): string[] {
  const ext = braces(extensions);
  return [`${testsDir}/**/*.${ext}`, `**/__tests__/**/*.${ext}`, `**/*.{spec,test}.${ext}`];
}

// helper files inside testsDir which are not test suites
export function testHelperGlobs(testsDir: string): string[] {
  return [`${testsDir}/**/_*`, `${testsDir}/**/*.skip.*`];
}
