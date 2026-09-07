import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { jsPlugins } from './plugins.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('every js plugin resolves to an existing file inside this package', () => {
  for (const factory of Object.values(jsPlugins)) {
    const plugin = factory();
    assert.ok(path.isAbsolute(plugin.specifier), `${plugin.name} must be an absolute path`);
    assert.ok(fs.existsSync(plugin.specifier), `${plugin.name}: ${plugin.specifier} does not exist`);
    assert.ok(plugin.specifier.startsWith(packageRoot), `${plugin.name} must resolve inside ${packageRoot}`);
  }
});

test('plugin names are the ones the rules reference', () => {
  assert.deepEqual(
    Object.values(jsPlugins)
      .map((factory) => factory().name)
      .sort(),
    ['check-file', 'eslint-js', 'mocha', 'perfectionist', 'playwright', 'stylistic', 'typescript-js'],
  );
});
