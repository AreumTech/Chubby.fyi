/**
 * Basic Test Harness Tests (CommonJS)
 * 
 * Tests that work regardless of WASM availability
 */

const { test, expect } = require('@playwright/test');

test.describe('Test Harness Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-harness');
    
    // Aggressive modal dismissal
    await page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop').forEach(el => el.remove());
    });
    
    await page.waitForTimeout(1000);
    
    // Wait for page load
    await expect(page.locator('h1')).toContainText('Simulation Test Harness');
  });

  test('page loads correctly', async ({ page }) => {
    // Basic page elements
    await expect(page.locator('h1:has-text("🧪 Simulation Test Harness")')).toBeVisible();
    await expect(page.locator('text=Pre-built Test Cases')).toBeVisible();
    await expect(page.locator('text=Simulation Input (JSON)')).toBeVisible();
  });

  test('test case buttons are clickable', async ({ page }) => {
    // Remove any modals before interacting
    await page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop').forEach(el => el.remove());
    });
    
    // Test loading different test cases
    console.log('Testing Young Accumulator button...');
    await page.click('button:has-text("Young Accumulator")', { force: true });
    
    // Verify JSON editor has content
    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await expect(jsonEditor).toBeVisible();
    
    const content = await jsonEditor.inputValue();
    expect(content).toContain('"cash": 15000');
    expect(content).toContain('Tech Professional Salary');
    
    console.log('Young Accumulator test case loaded successfully');
  });

  test('navigation works', async ({ page }) => {
    // Test back button
    await page.click('button:has-text("← Back to App")');
    await expect(page).toHaveURL('/');
    
    // Navigate back to test harness
    await page.goto('/test-harness');
    await expect(page.locator('h1:has-text("🧪 Simulation Test Harness")')).toBeVisible();
  });

  test('WASM status is displayed', async ({ page }) => {
    await expect(page.locator('text=WASM Status:')).toBeVisible();
    
    // Wait for status to resolve
    await expect(page.locator('text=Available').or(
      page.locator('text=Not Available')
    )).toBeVisible({ timeout: 15000 });
    
    const status = await page.locator('text=WASM Status:').locator('..').textContent();
    console.log('Final WASM Status:', status?.replace(/\s+/g, ' ').trim());
  });
});