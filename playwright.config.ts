import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  retries: 1,
  use: {
    baseURL: 'https://cleancheck.e-findo.de',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, geolocation: { latitude: 51.673, longitude: 6.639 }, permissions: ['geolocation'] } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 }, geolocation: { latitude: 51.673, longitude: 6.639 }, permissions: ['geolocation'] } },
  ],
});
