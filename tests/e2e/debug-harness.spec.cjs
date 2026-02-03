const { test } = require('@playwright/test');

test('debug test harness page', async ({ page }) => {
  await page.goto('/test-harness');
  await page.waitForTimeout(5000); // Wait for page to fully load
  
  // Take a screenshot to see what's actually on the page
  await page.screenshot({ path: 'debug-harness-page.png', fullPage: true });
  
  // Log the page title and content
  const title = await page.title();
  console.log('Page title:', title);
  
  // Log all text content
  const bodyText = await page.locator('body').textContent();
  console.log('Page body text (first 500 chars):', bodyText?.substring(0, 500));
  
  // Log any error messages
  const errors = await page.locator('[data-testid="error"], .error').count();
  console.log('Error elements found:', errors);
  
  if (errors > 0) {
    const errorText = await page.locator('[data-testid="error"], .error').first().textContent();
    console.log('First error text:', errorText);
  }
  
  // Check WASM status specifically
  const wasmStatus = await page.locator('text=WASM Status:').locator('..').textContent();
  console.log('WASM Status section:', wasmStatus);
});