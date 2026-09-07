import { defineConfig } from 'oxfmt';

import { oxfmt } from './dist/oxfmt.js';

export default defineConfig({ ...oxfmt(), ignorePatterns: ['dist', 'test/fixtures'] });
