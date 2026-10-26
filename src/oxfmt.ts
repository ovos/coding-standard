import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';

import { createPathsMatcher, getTsconfig } from 'get-tsconfig';
import type { Oxfmtrc } from 'oxfmt';

import { type Indent, formatBase } from './format-base.js';

export type OxfmtOptions = {
  // number of spaces per indentation level, or 'tab' (default: 2)
  indent?: Indent;
  // directory or tsconfig file whose `paths` define the local absolute imports (default: the nearest tsconfig.json
  // from the current directory up). in a monorepo, pass `import.meta.dirname` in each package's oxfmt.config.ts:
  // oxfmt loads nested configs with the root as the current directory
  tsconfig?: string;
};

const probe = 'local-import-probe';
const sourceExtension = /(\.d)?\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const inNodeModules = /[\\/]node_modules[\\/]/;

function readTsconfig(location = process.cwd()) {
  return fs.statSync(location).isDirectory()
    ? getTsconfig(location)
    : getTsconfig(path.dirname(location), path.basename(location));
}

// glob patterns for the bare imports a tsconfig resolves into the project, the local absolute imports. v3 found them
// with eslint-import-resolver-typescript, oxfmt cannot resolve imports. a catch-all `"*": ["./src/*"]` or a `baseUrl`
// turns every entry of that directory into `name` and `name/**`, `"@app/*"` turns into `@app/*` and `@app/*/**`.
// `~` keys are left to the `~` group
export function localImportPatterns(tsconfig?: string): string[] {
  const result = readTsconfig(tsconfig);
  if (!result) return [];
  const patterns = new Set<string>();
  // the matcher resolves through `paths` and `baseUrl` relative to the tsconfig that declares them, also via `extends`
  const matcher = createPathsMatcher(result);
  for (const target of matcher?.(probe) ?? []) {
    if (!target.includes(probe)) continue;
    const dir = target.slice(0, target.indexOf(probe));
    if (inNodeModules.test(dir) || !fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      const name = entry.replace(sourceExtension, '');
      patterns.add(name);
      patterns.add(`${name}/**`);
    }
  }
  for (const key of Object.keys(result.config.compilerOptions?.paths ?? {})) {
    if (key === '*' || key.startsWith('~')) continue;
    // a key mapped into node_modules, like `"react": ["./node_modules/@types/react"]`, stays external
    const targets = matcher?.(key.replace('*', probe)) ?? [];
    if (targets.every((target) => inNodeModules.test(target))) continue;
    patterns.add(key);
    if (key.includes('*')) patterns.add(`${key}/**`);
  }
  // v3's resolver checked node built-ins before the tsconfig: a bare `http` stays builtin, `http/client` is local
  return [...patterns].filter((pattern) => !isBuiltin(pattern)).sort();
}

/**
 * oxfmt configuration. Use it as `defineConfig(oxfmt())`, or spread it to override options:
 * `defineConfig({ ...oxfmt(), sortPackageJson: false })`. oxfmt has no `extends`.
 */
export function oxfmt(options: OxfmtOptions = {}): Oxfmtrc {
  const local = localImportPatterns(options.tsconfig);
  return {
    ...formatBase(options.indent),
    // same grouping as the import/order rule of v3: builtin, external, `~` aliases, local absolute imports, parent,
    // sibling+index, with a blank line between groups. v3 had `~` as its own path group before the other internal
    // imports. type imports sort among value imports, as import/order did. names inside the braces are not sorted
    // by oxfmt (https://github.com/oxc-project/oxc/issues/23456), perfectionist covers that in the oxlint config.
    sortImports: {
      // `~*/**` for `~common/foo`, `~*` for a bare `~ui`. a lone `~**` does not match across `/`
      customGroups: [
        { groupName: 'tilde', elementNamePattern: ['~*', '~*/**'] },
        // only with patterns: an empty `elementNamePattern` matches every import
        ...(local.length > 0 ? [{ groupName: 'local', elementNamePattern: local }] : []),
      ],
      groups: [
        'builtin',
        'external',
        'tilde',
        local.length > 0 ? ['local', 'internal'] : 'internal',
        'parent',
        ['sibling', 'index'],
        'unknown',
      ],
      internalPattern: ['~'],
      ignoreCase: true,
      newlinesBetween: true,
    },
  };
}
