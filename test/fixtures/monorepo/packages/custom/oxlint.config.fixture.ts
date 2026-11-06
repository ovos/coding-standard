import { oxlint } from '@ovos-media/coding-standard';
import { defineConfig } from 'oxlint';

export default defineConfig({ extends: [oxlint({ tsconfig: 'tsconfig.custom.json' })] });
