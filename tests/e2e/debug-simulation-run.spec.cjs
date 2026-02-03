const { test } = require('@playwright/test');

test('debug simulation execution', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  await page.goto('/test-harness');
  
  // Dismiss modals
  await page.evaluate(() => {
    document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop').forEach(el => el.remove());
  });
  
  // Wait for WASM to be available
  await page.waitForTimeout(15000);
  
  // Check WASM status
  const wasmStatus = await page.locator('text=WASM Status:').locator('..').textContent();
  console.log('WASM Status:', wasmStatus?.replace(/\s+/g, ' ').trim());
  
  const wasmAvailable = await page.locator('text=Available').count() > 0;
  if (!wasmAvailable) {
    console.log('WASM not available - test will skip simulation');
    return;
  }
  
  console.log('WASM is available, proceeding with simulation test...');
  
  // Load a simple test case
  await page.click('button:has-text("Young Accumulator")', { force: true });
  
  // Check if run button is enabled
  const runButton = page.locator('button:has-text("Run Simulation from JSON")');
  const isEnabled = await runButton.isEnabled();
  console.log('Run button enabled:', isEnabled);
  
  if (!isEnabled) {
    console.log('Run button is disabled - stopping test');
    return;
  }
  
  // Start simulation
  console.log('Starting simulation...');
  await runButton.click();
  
  // Wait a bit and check status
  await page.waitForTimeout(2000);
  let runningVisible = await page.locator('text=Running...').count() > 0;
  console.log('Simulation running status:', runningVisible);
  
  // Wait up to 45 seconds for completion
  for (let i = 0; i < 90; i++) { // 90 * 500ms = 45 seconds
    await page.waitForTimeout(500);
    
    const completed = await page.locator('text=✅ Simulation Completed').count() > 0;
    const errored = await page.locator('text=❌ Error').count() > 0;
    runningVisible = await page.locator('text=Running...').count() > 0;
    
    if (i % 10 === 0) { // Log every 5 seconds
      console.log(`${i * 0.5}s: Running=${runningVisible}, Completed=${completed}, Error=${errored}`);
    }
    
    if (completed || errored) {
      console.log(`Simulation finished after ${i * 0.5} seconds`);
      if (completed) console.log('✅ Simulation completed successfully');
      if (errored) console.log('❌ Simulation failed with error');
      break;
    }
  }
  
  // Log final console messages
  console.log('\n--- Recent Console Messages ---');
  consoleMessages.slice(-10).forEach(msg => console.log(msg));
});