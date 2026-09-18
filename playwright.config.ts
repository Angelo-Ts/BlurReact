import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', workers: 1, timeout: 60000,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: { command: 'node tests/server.mjs', port: 4173, reuseExistingServer: false },
});
