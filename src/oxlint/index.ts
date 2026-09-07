import type { OxlintConfig, OxlintOverride } from 'oxlint';

import { namingConventionOptions } from '../plugins/typescript.js';
import { globs, scriptExtensions, testGlobs, testHelperGlobs } from './globs.js';
import { resolveOptions, type OxlintOptions } from './options.js';
import { jsPlugins } from './plugins.js';
import { coreRules, jsRules, tsRules } from './rules/core.js';
import { reactHookFileRules, reactRules, reactTsxRules } from './rules/react.js';
import { stylisticJsxRules, stylisticRules } from './rules/stylistic.js';
import { jestRules, mochaRules, playwrightRules, vitestRules } from './rules/tests.js';
import { typeAwareRules } from './rules/type-aware.js';

export type { OxlintOptions } from './options.js';

// perfectionist sorts with localeCompare by default ('123..AaBbCc..'). we want uppercase before lowercase and
// symbols first; only the needed part of the alphabet is listed
const alphabet = '_-.@/#~$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Build the shared oxlint configuration.
 *
 * Use it through `extends` so a project can layer its own rules, ignores and overrides on top:
 *
 *   export default defineConfig({ extends: [oxlint({ react: true, vitest: true })], ignorePatterns: ['public'] });
 *
 * Everything file-scoped (environments, globals, per-language rules) is expressed as overrides, because oxlint's
 * `extends` inherits rules, plugins, jsPlugins and overrides but drops top-level env, globals and settings.
 * `options.typeAware` is deliberately not set: oxlint honours it in the root config only.
 */
export function oxlint(options: OxlintOptions = {}): OxlintConfig {
  const o = resolveOptions(options);

  const plugins: NonNullable<OxlintConfig['plugins']> = ['eslint', 'typescript', 'unicorn', 'oxc', 'import'];
  if (o.react) plugins.push('react');
  if (o.jest) plugins.push('jest');
  if (o.vitest) plugins.push('vitest');
  if (o.a11y) plugins.push('jsx-a11y');

  const overrides: OxlintOverride[] = [
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
