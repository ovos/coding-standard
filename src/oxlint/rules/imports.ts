import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';

import { createPathsMatcher, getTsconfig } from 'get-tsconfig';

import type { Rules } from './core.js';

const probe = 'local-import-probe';
const sourceExtension = /(\.d)?\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const inNodeModules = /[\\/]node_modules[\\/]/;

const escapeRegex = (text: string) => text.replace(/[.+^${}()|[\]\\]/g, '\\$&');

function readTsconfig(location: string) {
  return fs.statSync(location).isDirectory()
    ? getTsconfig(location)
    : getTsconfig(path.dirname(location), path.basename(location));
}

/**
 * regular expressions for the bare imports a tsconfig resolves into the project, the local absolute imports.
 * they look like npm packages, so the rule has to be told. v3 found them with eslint-import-resolver-typescript.
 * a catch-all `"*": ["./src/*"]` or a `baseUrl` turns every entry of that directory into a pattern,
 * a key like `"@app/*"` into one for its prefix. `~` keys are left to the `~` group
 */
export function localImportPatterns(tsconfig: string): string[] {
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
      // v3's resolver checked node built-ins before the tsconfig: a bare `http` stays builtin, `http/client` is local
      patterns.add(isBuiltin(name) ? `^${escapeRegex(name)}/` : `^${escapeRegex(name)}(/|$)`);
    }
  }
  for (const key of Object.keys(result.config.compilerOptions?.paths ?? {})) {
    if (key === '*' || key.startsWith('~') || isBuiltin(key)) continue;
    // a key mapped into node_modules, like `"react": ["./node_modules/@types/react"]`, stays external
    const targets = matcher?.(key.replace('*', probe)) ?? [];
    if (targets.every((target) => inNodeModules.test(target))) continue;
    patterns.add(
      key.includes('*')
        ? `^${escapeRegex(key.slice(0, key.indexOf('*')))}`
        : `^${escapeRegex(key)}$`,
    );
  }
  return [...patterns].sort();
}

// the groups v3's import/order enforced, with a blank line between them: builtin, external, `~` aliases, local absolute
// imports, parent, sibling and index. oxfmt doesn't sort imports here, so this rule alone decides their order.
// side-effect imports like `import './env'` keep their position, because `side-effect` isn't listed in `groups`.
// `require` calls go last, as v3 ranked them, and stay unsorted, because their order decides what runs first.
// the rule also sees `require` calls inside functions, which v3 ignored, and `unsorted` leaves those alone too
export function importOrderRules(sortImports: boolean, tsconfig: string): Rules {
  if (!sortImports) return {};
  const local = localImportPatterns(tsconfig);
  return {
    'perfectionist/sort-imports': [
      'error',
      {
        type: 'alphabetical',
        ignoreCase: true,
        internalPattern: ['^~'],
        newlinesBetween: 1,
        customGroups: [
          { groupName: 'require', modifiers: ['require'], type: 'unsorted' },
          { groupName: 'tilde', elementNamePattern: ['^~'] },
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
          'require',
        ],
      },
    ],
  };
}
