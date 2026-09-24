import { defineConfig } from 'oxlint';

// lint this repository with its own package: run `npm run build` first, the config imports the compiled output
import { oxlint } from './dist/oxlint/index.js';

export default defineConfig({
  extends: [oxlint()],
  ignorePatterns: ['dist', 'test/fixtures'],
});
