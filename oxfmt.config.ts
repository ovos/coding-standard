import { defineConfig } from 'oxfmt';

import { oxfmt } from './dist/oxfmt.js';

// oxfmt formats every file type it knows. This repository formats its sources and package.json only.
// test/parity holds generated JSON that the parity test compares byte for byte.
export default defineConfig({
  ...oxfmt(),
  ignorePatterns: ['dist', 'test/fixtures', 'test/parity', '**/*.{md,html,yml,yaml}'],
});
