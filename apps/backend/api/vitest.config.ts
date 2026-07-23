import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@wema/database': resolve(__dirname, '../../../packages/database/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
