import playwright from '@playwright/test';
const { test, expect } = playwright;

test.describe('Basic Smoke Test', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Basic assertion that the page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
    
    console.log('✅ Application loads successfully');
  });
});