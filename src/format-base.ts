export type Indent = number | 'tab';

export type FormatBase = {
  printWidth: number;
  singleQuote: boolean;
  trailingComma: 'all';
  tabWidth: number;
  useTabs: boolean;
};

// shared between the oxfmt and prettier exports so both tools produce the same output
// (verified identical for the same options: oxfmt 0.66 against prettier 3.9)
export function formatBase(indent: Indent = 2): FormatBase {
  return {
    // prettier recommends 80, but 100 has been the convention here for years
    printWidth: 100,
    singleQuote: true,
    // the default of both oxfmt and prettier 3; the stylistic comma-dangle rule accepts this and the es5 style
    trailingComma: 'all',
    tabWidth: indent === 'tab' ? 2 : indent,
    useTabs: indent === 'tab',
  };
}
