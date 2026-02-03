const { test } = require('@playwright/test');

test('debug WASM status loading', async ({ page }) => {
  await page.goto('/test-harness');
  
  console.log('Initial page load complete');
  
  // Wait up to 15 seconds for WASM status to change from Loading
  for (let i = 0; i < 15; i++) {
    const wasmStatus = await page.locator('text=WASM Status:').locator('..').textContent();
    console.log(`Second ${i}: WASM Status: ${wasmStatus.replace(/\s+/g, ' ').trim()}`);
    
    if (wasmStatus.includes('Available') || wasmStatus.includes('Not Available')) {
      console.log(`✓ WASM status resolved after ${i} seconds`);
      break;
    }
    
    await page.waitForTimeout(1000);
  }
  
  // Final status check
  const finalStatus = await page.locator('text=WASM Status:').locator('..').textContent();
  console.log('Final WASM Status:', finalStatus.replace(/\s+/g, ' ').trim());
  
  // Check if any buttons are enabled/disabled
  const runButton = page.locator('button:has-text("Run Simulation from JSON")');
  const isEnabled = await runButton.isEnabled();
  console.log('Run button enabled:', isEnabled);
});