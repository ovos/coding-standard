import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { tsgolintLauncher } from './oxlint/tsgolint.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const fixturesRoot = path.join(packageRoot, 'test', 'fixtures');

const require = createRequire(import.meta.url);
const oxlintBin = path.join(path.dirname(require.resolve('oxlint/package.json')), 'bin', 'oxlint');

type Diagnostic = { filename: string; code: string; message: string };

// copies a fixture tree to a temp dir, writes the config next to it and runs oxlint with json output.
// returns "relative/path.ts:<rule>" strings, e.g. "src/naming.ts:typescript-js/naming-convention"
export function runOxlint(fixture: string, config: object): Set<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-standard-'));
  try {
    fs.cpSync(path.join(fixturesRoot, fixture), dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.oxlintrc.json'), JSON.stringify(config));
    // the temp dir has no node_modules above it, so oxlint cannot find tsgolint by itself; a consumer's config
    // module sets this variable at runtime, the json config written here cannot
    const result = spawnSync(
      process.execPath,
      [oxlintBin, '--disable-nested-config', '-f', 'json', '.'],
      {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, OXLINT_TSGOLINT_PATH: process.env.OXLINT_TSGOLINT_PATH ?? tsgolintLauncher },
      },
    );
    if (!result.stdout.trim().startsWith('{')) {
      throw new Error(`oxlint produced no json output:\n${result.stdout}\n${result.stderr}`);
    }
    const parsed = JSON.parse(result.stdout) as { diagnostics: Diagnostic[] };
    const found = new Set<string>();
    for (const d of parsed.diagnostics) {
      // code looks like "eslint(no-unused-vars)" or "typescript-js(naming-convention)"
      const match = d.code.match(/^([^(]+)\((.+)\)$/);
      const rule = match ? (match[1] === 'eslint' ? match[2] : `${match[1]}/${match[2]}`) : d.code;
      found.add(`${d.filename.split(path.sep).join('/')}:${rule}`);
    }
    return found;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
