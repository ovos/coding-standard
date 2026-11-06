// type-aware rule in a js file: off by default, on with the typeAwareJs option
export function indices(list = [1, 2]) {
  const out = [];
  for (const index in list) {
    out.push(index);
  }
  return out;
}
