import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium' },
  webServer: [
    {
      command: 'npm run dev:server:test',
      url: 'http://127.0.0.1:8787/api/health',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'npm run dev:client',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
