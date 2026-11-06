import { describe, it } from 'node:test';

import { RuleTester } from 'oxlint/plugins-dev';

// oxlint's RuleTester runs eslint-style valid/invalid cases through the js plugin bridge.
// wired to node:test the same way eslint-plugin-perfectionist and oxc-config-seek do it.
RuleTester.describe = describe;
RuleTester.it = it;

export const tsRuleTester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: 'ts' } },
});
