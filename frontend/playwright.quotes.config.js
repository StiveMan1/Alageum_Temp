import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.E2E_QUOTES_PORT || 3135);
const baseURL = process.env.E2E_QUOTES_BASE_URL || `http://127.0.0.1:${port}`;
export default defineConfig({
  outputDir: './playwright-report/quotes-results',
  forbidOnly: Boolean(process.env.CI),
  testDir: './e2e', testMatch: 'quotes.spec.js', fullyParallel: true, workers: 2,
  retries: process.env.CI ? 1 : 0, reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {} },
  projects: [{ name: 'quotes-desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'quotes-mobile', use: { ...devices['Pixel 7'] } }],
  webServer: process.env.E2E_QUOTES_BASE_URL ? undefined : { command: `npm run dev -- --webpack --hostname 127.0.0.1 --port ${port}`, url: `${baseURL}/catalog`, reuseExistingServer: !process.env.CI, timeout: 120000, env: { NEXT_TELEMETRY_DISABLED: '1' } },
});
