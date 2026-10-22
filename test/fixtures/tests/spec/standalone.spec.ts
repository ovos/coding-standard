// an expect outside a test block, and a test without any expect
expect(1).toBe(1);

describe('suite', () => {
  it('has no assertion', () => {
    const value = 1;
    return value;
  });
});
export {};
