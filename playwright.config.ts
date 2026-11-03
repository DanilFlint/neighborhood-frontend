import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT || '5173';

export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1,
  reporter: 'list', timeout: 30000,
  use: {
    baseURL: `http://localhost:${port}`, trace: 'retain-on-failure',
    launchOptions: { channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'small-mobile', grep: /catalog, URL|publish and then|choose an address/, use: { ...devices['Pixel 7'], viewport: { width: 320, height: 740 } } },
  ],
  webServer: { command: process.env.E2E_PREVIEW ? `pnpm preview --port ${port} --strictPort` : `pnpm dev --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: false, timeout: 30000 },
});
