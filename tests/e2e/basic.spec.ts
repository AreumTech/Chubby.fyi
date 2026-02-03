import { test, expect } from '@playwright/test';

test('basic navigation', async ({ page }) => {
  await page.goto('/');
  
  // Check that the app loads
  await expect(page).toHaveTitle(/PathFinder Pro/);
  
  // Look for the main navigation or app content
  await expect(page.locator('body')).toBeVisible();
});

test('accessibility check', async ({ page }) => {
  await page.goto('/');
  
  // Basic accessibility checks
  await expect(page.locator('h1, h2, h3, h4, h5, h6')).toHaveCount({ min: 1 });
  
  // Check for basic interactive elements
  const buttons = page.locator('button');
  const buttonCount = await buttons.count();
  expect(buttonCount).toBeGreaterThan(0);
});