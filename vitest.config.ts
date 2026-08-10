import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/frontend/setup.ts'],
    css: true,
    // Several route tests intentionally manipulate window history and browser globals.
    // Running files serially keeps those integration-style fixtures isolated in CI.
    fileParallelism: false,
  },
});
