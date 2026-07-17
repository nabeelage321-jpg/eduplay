import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Desktop Chrome
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile (375px) — Pakistan users primarily mobile
    {
      name: 'mobile-chrome',
      use: { ...devices['iPhone SE'] },
    },
    // RTL test — Urdu
    {
      name: 'urdu-rtl',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'ur-PK',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
