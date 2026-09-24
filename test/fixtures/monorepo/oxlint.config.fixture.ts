import { defineConfig } from 'oxlint';
import { oxlint } from '@ovos-media/coding-standard';

export default defineConfig({ extends: [oxlint()] });
