import type { Oxfmtrc } from 'oxfmt';

import { type Indent, formatBase } from './format-base.js';

export type OxfmtOptions = {
  // number of spaces per indentation level, or 'tab' (default: 2)
  indent?: Indent;
};

/**
 * oxfmt configuration. Use it as `defineConfig(oxfmt())`, or spread it to override options:
 * `defineConfig({ ...oxfmt(), sortPackageJson: false })`. oxfmt has no `extends`.
 */
export function oxfmt(options: OxfmtOptions = {}): Oxfmtrc {
  return {
    ...formatBase(options.indent),
    // same grouping as the import/order rule of v3: builtin, external, `~` aliases, other internal imports, parent,
    // sibling+index. v3 had `~` as its own path group before the other internal imports, with a blank line
    // between. type imports sort among value imports, as import/order did. names inside the braces are not sorted
    // by oxfmt (https://github.com/oxc-project/oxc/issues/23456), perfectionist covers that in the oxlint config.
    sortImports: {
      // `~*/**` for `~common/foo`, `~*` for a bare `~ui`. a lone `~**` does not match across `/`
      customGroups: [{ groupName: 'tilde', elementNamePattern: ['~*', '~*/**'] }],
      groups: [
        'builtin',
        'external',
        'tilde',
        'internal',
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
