import { type FormatBase, formatBase } from './format-base.js';

// prettier is not a dependency of this package. the object is plain options compatible with prettier 3, kept for
// projects that format with prettier on demand. same values as the oxfmt export, so both tools agree.
export const prettier: FormatBase = formatBase();
