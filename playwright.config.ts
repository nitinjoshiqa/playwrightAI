import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  retries: 2,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['allure-playwright']
  ],
  use: {
    headless: true,
    baseURL: 'https://www.saucedemo.com',
    screenshot: 'on',
    trace: 'on',
    video: 'on'
  }
});
