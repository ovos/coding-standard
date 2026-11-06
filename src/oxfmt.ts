import type { Oxfmtrc } from 'oxfmt';

import { type Indent, formatBase } from './format-base.js';

export type OxfmtOptions = {
  /**
   * number of spaces per indentation level, or 'tab'
   * @default 2
   */
  indent?: Indent;
};

/**
 * oxfmt configuration. Use it as `defineConfig(oxfmt())`, or spread it to override options:
 * `defineConfig({ ...oxfmt(), sortPackageJson: false })`. oxfmt has no `extends`.
 *
 * It doesn't sort imports: the `perfectionist/sort-imports` lint rule owns their order, so that it shows up in the
 * editor and in CI, and two tools can't undo each other. `oxlint --fix` sorts them, as `eslint --fix` did in v3.
 */
export function oxfmt(options: OxfmtOptions = {}): Oxfmtrc {
  return formatBase(options.indent);
}
