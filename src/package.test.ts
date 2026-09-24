import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { packageRoot } from './smoke-helpers.js';

type Manifest = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
};

// read from disk: some dependencies (eslint-plugin-check-file) do not export their package.json
const manifest = (dir: string) =>
  JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) as Manifest;
const own = manifest(packageRoot);
const dependencies = own.dependencies ?? {};

// peers the consumer provides, as in v3
const providedByConsumer: Record<string, string> = {
  typescript: 'every consumer is a typescript project and picks its own compiler version',
};

// Yarn 1 does not install peer dependencies, npm does. The test suite runs on npm, so a required peer this
// package forgets to depend on passes every test here and breaks the first Yarn 1 consumer at config load.
test('every required peer of a runtime dependency is a runtime dependency too', () => {
  const missing: string[] = [];
  for (const name of Object.keys(dependencies)) {
    const dep = manifest(path.join(packageRoot, 'node_modules', name));
    for (const peer of Object.keys(dep.peerDependencies ?? {})) {
      if (dep.peerDependenciesMeta?.[peer]?.optional) continue;
      if (peer in dependencies || peer in providedByConsumer) continue;
      missing.push(`${name} requires ${peer}`);
    }
  }
  assert.deepEqual(missing, []);
});

// @typescript-eslint/eslint-plugin requires the parser of the same release as a peer (8.70.1: `^8.70.1`)
test('typescript-eslint plugin and parser ranges move together', () => {
  assert.equal(dependencies['@typescript-eslint/parser'], dependencies['@typescript-eslint/eslint-plugin']);
});
