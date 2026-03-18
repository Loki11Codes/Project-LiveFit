import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'clover'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        '.next/**',
        'out/**',
        'public/**',
        '**/*.d.ts',
        'next.config.ts',
        'postcss.config.mjs',
        'tailwind.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
