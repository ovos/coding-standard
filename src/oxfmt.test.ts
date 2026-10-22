import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { oxfmt } from './oxfmt.js';

const require = createRequire(import.meta.url);
const oxfmtBin = path.join(path.dirname(require.resolve('oxfmt/package.json')), 'bin', 'oxfmt');

// formats `source` as `file` with the given oxfmt config and returns the output
function format(config: object, file: string, source: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxfmt-'));
  try {
    const configPath = path.join(dir, '.oxfmtrc.json');
    fs.writeFileSync(configPath, JSON.stringify(config));
    const result = spawnSync(
      process.execPath,
      [oxfmtBin, '-c', configPath, '--stdin-filepath', file],
      {
        cwd: dir,
        input: source,
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('oxfmt defaults match the standard', () => {
  const config = oxfmt();
  assert.equal(config.printWidth, 100);
  assert.equal(config.singleQuote, true);
  assert.equal(config.trailingComma, 'all');
  assert.equal(config.tabWidth, 2);
  assert.equal(config.useTabs, false);
  assert.equal('sortPackageJson' in config, false, 'oxfmt default (on) is inherited, not set');
  assert.deepEqual(config.sortImports, {
    customGroups: [{ groupName: 'tilde', elementNamePattern: ['~*', '~*/**'] }],
    groups: ['builtin', 'external', 'tilde', 'internal', 'parent', ['sibling', 'index'], 'unknown'],
    internalPattern: ['~'],
    ignoreCase: true,
    newlinesBetween: true,
  });
});

test('import groups follow v3: builtin, external, `~` as its own group, parent, sibling', () => {
  const source = [
    "import styles from './styles.module.less';",
    "import { useTranslation } from '~common/i18n';",
    "import Card from '../Card';",
    "import React from 'react';",
    "import fs from 'node:fs';",
    "import ui from '~ui';",
    '',
    'export { Card, fs, React, styles, ui, useTranslation };',
    '',
  ].join('\n');
  assert.equal(
    format(oxfmt(), 'src/a.ts', source),
    [
      "import fs from 'node:fs';",
      '',
      "import React from 'react';",
      '',
      "import { useTranslation } from '~common/i18n';",
      "import ui from '~ui';",
      '',
      "import Card from '../Card';",
      '',
      "import styles from './styles.module.less';",
      '',
      'export { Card, fs, React, styles, ui, useTranslation };',
      '',
    ].join('\n'),
  );
});

test('`~` imports stay a group of their own before the other internal imports', () => {
  const base = oxfmt();
  const sortImports = { ...(base.sortImports as object), internalPattern: ['helpers/'] };
  const config = { ...base, sortImports };
  const source = [
    "import { download } from 'helpers/download';",
    "import { useTranslation } from '~common/i18n';",
    "import React from 'react';",
    '',
    'export { download, React, useTranslation };',
    '',
  ].join('\n');
  assert.equal(
    format(config, 'src/a.ts', source),
    [
      "import React from 'react';",
      '',
      "import { useTranslation } from '~common/i18n';",
      '',
      "import { download } from 'helpers/download';",
      '',
      'export { download, React, useTranslation };',
      '',
    ].join('\n'),
  );
});

test('oxfmt indent option maps to tabs and width', () => {
  assert.equal(oxfmt({ indent: 'tab' }).useTabs, true);
  assert.equal(oxfmt({ indent: 4 }).tabWidth, 4);
});
