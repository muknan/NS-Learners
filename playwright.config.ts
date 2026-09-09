import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm start',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-touch',
      testMatch: /touch-regressions\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'webkit-touch',
      testMatch: /touch-regressions\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'webkit',
      testMatch: /touch-regressions\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
