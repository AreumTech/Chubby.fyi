const { test } = require('@playwright/test');

test('debug WASM loading process', async ({ page }) => {
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  await page.goto('/test-harness');
  
  // Wait for WASM loading to complete
  await page.waitForTimeout(15000);
  
  // Log all console messages
  console.log('Console messages during WASM loading:');
  consoleMessages.forEach(msg => console.log(msg));
  
  // Check global WASM function
  const wasmFunctionExists = await page.evaluate(() => {
    return typeof window.runSingleSimulation === 'function';
  });
  
  console.log('WASM function exists:', wasmFunctionExists);
  
  // Check WASM status in UI
  const statusText = await page.locator('text=WASM Status:').locator('..').textContent();
  console.log('UI WASM Status:', statusText?.replace(/\s+/g, ' ').trim());
});