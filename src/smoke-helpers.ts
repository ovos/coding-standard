import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { OxlintOptions } from './oxlint/index.js';

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const fixturesRoot = path.join(packageRoot, 'test', 'fixtures');

const require = createRequire(import.meta.url);
const oxlintRoot = path.dirname(require.resolve('oxlint/package.json'));
const oxlintBin = path.join(oxlintRoot, 'bin', 'oxlint');

type Diagnostic = { filename: string; code: string; message: string };

export type ConsumerConfig = Record<string, unknown>;

export type Run = {
  // options passed to oxlint() in the generated root oxlint.config.ts
  options?: OxlintOptions;
  // the consumer's own additions next to `extends`: rules, overrides, ignorePatterns
  consumer?: ConsumerConfig;
  // keep oxlint's nested config discovery on, for fixtures that ship their own oxlint.config.ts files
  nestedConfigs?: boolean;
};

// the root config every README example shows
export function consumerConfig(options: OxlintOptions, consumer: ConsumerConfig): string {
  const additions = Object.entries(consumer).map(
    ([key, value]) => `  ${key}: ${JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')},\n`,
  );
  return [
    "import { defineConfig } from 'oxlint';",
    "import { oxlint } from '@ovos-media/coding-standard';",
    '',
    'export default defineConfig({',
    `  extends: [oxlint(${JSON.stringify(options)})],`,
    ...additions,
    '});',
    '',
  ].join('\n');
}

// fixtures ship their configs as oxlint.config.fixture.ts: with the real name, oxlint's nested config discovery
// would load them during this repository's own lint run, ignore patterns or not
function restoreConfigNames(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) restoreConfigNames(entryPath);
    else if (entry.name === 'oxlint.config.fixture.ts') fs.renameSync(entryPath, path.join(dir, 'oxlint.config.ts'));
  }
}

// materialises a fixture as a consumer project in a temp dir: package.json, node_modules links to oxlint and to
// this package (so the config imports read like a consumer's), and the generated root config unless the fixture
// ships its own
export function materialize(fixture: string, run: Run = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-standard-'));
  fs.cpSync(path.join(fixturesRoot, fixture), dir, { recursive: true });
  restoreConfigNames(dir);
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    const manifest = { name: 'fixture', private: true, type: 'module' };
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest, null, 2));
  }
  fs.mkdirSync(path.join(dir, 'node_modules', '@ovos-media'), { recursive: true });
  fs.symlinkSync(oxlintRoot, path.join(dir, 'node_modules', 'oxlint'), 'dir');
  fs.symlinkSync(packageRoot, path.join(dir, 'node_modules', '@ovos-media', 'coding-standard'), 'dir');
  if (!fs.existsSync(path.join(dir, 'oxlint.config.ts'))) {
    fs.writeFileSync(path.join(dir, 'oxlint.config.ts'), consumerConfig(run.options ?? {}, run.consumer ?? {}));
  }
  return dir;
}

export function runOxlintCli(dir: string, args: string[]): { stdout: string; stderr: string } {
  // no --type-aware flag and no OXLINT_TSGOLINT_PATH: the consumer's config module must switch type-aware
  // mode on and point oxlint at tsgolint by itself. the test process may carry the variable from calling
  // oxlint() directly, so it is dropped here
  const env = { ...process.env };
  delete env.OXLINT_TSGOLINT_PATH;
  const result = spawnSync(process.execPath, [oxlintBin, ...args], { cwd: dir, encoding: 'utf8', env });
  return { stdout: result.stdout, stderr: result.stderr };
}

// runs oxlint over a materialised fixture with json output.
// returns "relative/path.ts:<rule>" strings, e.g. "src/naming.ts:typescript-js/naming-convention"
export function runOxlint(fixture: string, run: Run = {}): Set<string> {
  const dir = materialize(fixture, run);
  try {
    const args = ['--ignore-pattern', 'node_modules', '-f', 'json', '.'];
    if (!run.nestedConfigs) args.unshift('--disable-nested-config');
    const { stdout, stderr } = runOxlintCli(dir, args);
    if (!stdout.trim().startsWith('{')) {
      throw new Error(`oxlint produced no json output:\n${stdout}\n${stderr}`);
    }
    const parsed = JSON.parse(stdout) as { diagnostics: Diagnostic[] };
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
