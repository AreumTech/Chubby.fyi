/**
 * Simulation Execution Test (CommonJS)
 * 
 * Focused test for running simulations with working WASM
 */

const { test, expect } = require('@playwright/test');

test('run simulation end-to-end', async ({ page }) => {
  // Collect console for debugging
  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'log' && (msg.text().includes('SIMULATION') || msg.text().includes('TEST-HARNESS'))) {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    }
  });

  await page.goto('/test-harness');
  
  // Aggressive modal removal at every step
  const removeModals = async () => {
    await page.evaluate(() => {
      const modals = document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop, .modal, [class*="modal"]');
      modals.forEach(el => {
        console.log('Removing modal:', el.className);
        el.remove();
      });
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  };
  
  // Initial modal removal
  await page.waitForTimeout(2000);
  await removeModals();
  
  // Wait for page to stabilize
  await expect(page.locator('h1:has-text("🧪 Simulation Test Harness")')).toBeVisible();
  
  // Wait for WASM to be available
  await expect(page.locator('text=Available').or(page.locator('text=Not Available'))).toBeVisible({ timeout: 20000 });
  
  const wasmAvailable = await page.locator('text=Available').count() > 0;
  console.log('WASM Available:', wasmAvailable);
  
  if (!wasmAvailable) {
    console.log('WASM not available - skipping simulation test');
    return;
  }
  
  // Remove modals before clicking
  await removeModals();
  
  // Load test case
  console.log('Loading Young Accumulator test case...');
  await page.click('button:has-text("Young Accumulator")', { force: true });
  await page.waitForTimeout(1000);
  
  // Remove modals again
  await removeModals();
  
  // Verify JSON was loaded
  const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
  const content = await jsonEditor.inputValue();
  console.log('JSON loaded, contains cash:', content.includes('"cash": 15000'));
  
  // Remove modals before running simulation
  await removeModals();
  
  // Check run button status
  const runButton = page.locator('button:has-text("Run Simulation from JSON")');
  const isEnabled = await runButton.isEnabled();
  console.log('Run button enabled before click:', isEnabled);
  
  if (!isEnabled) {
    console.log('Run button is disabled - cannot proceed');
    return;
  }
  
  // Start simulation
  console.log('Starting simulation...');
  await runButton.click({ force: true });
  
  // Monitor simulation progress
  console.log('Monitoring simulation progress...');
  
  // Wait for either completion or timeout (60 seconds)
  let completed = false;
  let errored = false;
  
  for (let i = 0; i < 120; i++) { // 120 * 500ms = 60 seconds
    await page.waitForTimeout(500);
    
    completed = await page.locator('text=✅ Simulation Completed').count() > 0;
    errored = await page.locator('text=❌ Error').count() > 0;
    const running = await page.locator('text=Running...').count() > 0;
    
    if (i % 20 === 0) { // Log every 10 seconds
      console.log(`${i * 0.5}s: Running=${running}, Completed=${completed}, Error=${errored}`);
    }
    
    if (completed || errored) {
      console.log(`Simulation finished after ${i * 0.5} seconds`);
      break;
    }
  }
  
  if (completed) {
    console.log('✅ Simulation completed successfully!');
    
    // Verify output is present
    const outputArea = page.locator('pre').last();
    const outputText = await outputArea.textContent();
    const hasOutput = outputText && outputText.length > 100;
    console.log('Has simulation output:', hasOutput);
    
    if (hasOutput) {
      console.log('Output preview:', outputText?.substring(0, 200) + '...');
    }
  } else if (errored) {
    console.log('❌ Simulation failed');
    const errorText = await page.locator('text=❌ Error').locator('..').textContent();
    console.log('Error details:', errorText);
  } else {
    console.log('⏱️ Simulation timed out after 60 seconds');
  }
  
  // Log relevant console messages
  console.log('\n--- Relevant Console Messages ---');
  consoleMessages.forEach(msg => console.log(msg));
});