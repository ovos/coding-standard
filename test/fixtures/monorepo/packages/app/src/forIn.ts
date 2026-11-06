// type-aware rule: needs tsgolint and the type of `list`; the only type-aware rule on by default
export function indices(list: string[]): string[] {
  const out: string[] = [];
  for (const index in list) {
    out.push(index);
  }
  return out;
}
