import { defineConfig } from 'oxfmt';

import { oxfmt } from './dist/oxfmt.js';

// oxfmt formats every file type it knows; this repository formats its sources and package.json only
export default defineConfig({
  ...oxfmt(),
  ignorePatterns: ['dist', 'test/fixtures', '**/*.{md,html,yml,yaml}'],
});
