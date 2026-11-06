import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { fixturesRoot } from '../../smoke-helpers.js';

import { importOrderRules, localImportPatterns } from './imports.js';

const pathsFixture = path.join(fixturesRoot, 'tsconfig-paths');

test('local absolute imports come from the tsconfig paths, through extends', () => {
  // `react` maps into node_modules and `~common/*` belongs to the `~` group, so neither is listed
  assert.deepEqual(localImportPatterns(path.join(pathsFixture, 'app')), [
    '^@app/',
    '^App(/|$)',
    '^config$',
    '^global(/|$)',
    '^helpers(/|$)',
    // a bare `http` stays builtin, as in v3
    '^http/',
    '^styles\\.less(/|$)',
  ]);
  // a tsconfig file instead of a directory, here one with `baseUrl`
  assert.deepEqual(localImportPatterns(path.join(pathsFixture, 'app', 'tsconfig.types.json')), [
    '^vendor(/|$)',
  ]);
  assert.deepEqual(localImportPatterns(path.join(pathsFixture, 'plain')), []);
});

test('a paths target in node_modules is not local', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'local-imports-'));
  try {
    fs.mkdirSync(path.join(dir, 'node_modules', 'react'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'src', 'helpers'), { recursive: true });
    const paths = { '*': ['./node_modules/*', './src/*'] };
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { paths } }),
    );
    assert.deepEqual(localImportPatterns(dir), ['^helpers(/|$)']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('sortImports: false leaves the rule out', () => {
  assert.deepEqual(importOrderRules(false, pathsFixture), {});
});

test('the local group only exists with local imports', () => {
  const options = (dir: string) =>
    (importOrderRules(true, dir)['perfectionist/sort-imports'] as unknown[])[1] as {
      customGroups: { groupName: string }[];
      groups: unknown[];
    };
  const plain = options(path.join(pathsFixture, 'plain'));
  assert.deepEqual(
    plain.customGroups.map((group) => group.groupName),
    ['require', 'tilde'],
  );
  assert.ok(plain.groups.includes('internal'));
  const app = options(path.join(pathsFixture, 'app'));
  assert.deepEqual(
    app.customGroups.map((group) => group.groupName),
    ['require', 'tilde', 'local'],
  );
  assert.deepEqual(app.groups[3], ['local', 'internal']);
});
