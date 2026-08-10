import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: process.env.INSTASCORE_E2E_BASE_URL ?? 'http://instascore.local',
    trace: 'on-first-retry',
  },
});
