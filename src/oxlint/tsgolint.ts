import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

// the launcher oxlint-tsgolint (https://github.com/oxc-project/tsgolint) links into node_modules/.bin; it picks
// the platform binary from its optional dependencies itself
export const tsgolintLauncher = path.join(
  path.dirname(require.resolve('oxlint-tsgolint/package.json')),
  'bin',
  'tsgolint.js',
);

/*
 * oxlint looks for the tsgolint executable in this order
 * (https://github.com/oxc-project/oxc/blob/main/crates/oxc_linter/src/tsgolint.rs, `try_find_tsgolint_executable`):
 *   1. the `OXLINT_TSGOLINT_PATH` environment variable,
 *   2. `node_modules/.bin/tsgolint` next to the first package.json found walking up from the working directory,
 *   3. the system PATH.
 * When it finds none it aborts the whole run with "Failed to find tsgolint executable".
 *
 * oxlint-tsgolint is a dependency of this package, so package managers normally hoist it next to oxlint and step 2
 * succeeds. It fails when the copy is not hoisted (a second oxlint-tsgolint elsewhere in the tree, a package
 * manager that does not hoist) or when oxlint runs from a directory with no node_modules above it. The consumer's
 * config module is evaluated inside the oxlint process before tsgolint is spawned, so setting the variable there
 * to this package's copy closes both gaps. A variable set by the user wins.
 */
export function pointOxlintAtTsgolint(): void {
  process.env.OXLINT_TSGOLINT_PATH ??= tsgolintLauncher;
}
