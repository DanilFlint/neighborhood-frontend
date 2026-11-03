import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1,
  reporter: 'list', timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173', trace: 'retain-on-failure',
    launchOptions: { channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'small-mobile', grep: /catalog, URL|publish and then/, use: { ...devices['Pixel 7'], viewport: { width: 320, height: 740 } } },
  ],
  webServer: { command: process.env.E2E_PREVIEW ? 'pnpm preview --port 5173 --strictPort' : 'pnpm dev', url: 'http://localhost:5173', reuseExistingServer: false, timeout: 30000 },
});
