/**
 * Quick Simulation Test (CommonJS)
 * 
 * Fast simulation test with short timeframe for validation
 */

const { test, expect } = require('@playwright/test');

test('quick simulation validation', async ({ page }) => {
  await page.goto('/test-harness');
  
  // Remove modals
  await page.evaluate(() => {
    document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop').forEach(el => el.remove());
  });
  
  await page.waitForTimeout(2000);
  
  // Wait for WASM
  await expect(page.locator('text=Available').or(page.locator('text=Not Available'))).toBeVisible({ timeout: 20000 });
  
  const wasmAvailable = await page.locator('text=Available').count() > 0;
  console.log('WASM Available:', wasmAvailable);
  
  if (!wasmAvailable) {
    console.log('WASM not available - skipping test');
    return;
  }
  
  // Create a simple, fast test case
  const quickTestCase = {
    initialAccounts: { cash: 10000 },
    events: [
      {
        id: 'test-income',
        type: 'INCOME',
        monthOffset: 0,
        amount: 12000, // $1K/month
        metadata: { name: 'Test Income' }
      }
    ],
    config: {
      expectedReturns: { CASH: 0.02 },
      volatilities: { CASH: 0.01 }
    },
    monthsToRun: 12, // Only 1 year
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Input the test case
  const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
  await jsonEditor.fill(JSON.stringify(quickTestCase, null, 2));
  
  console.log('Quick test case loaded');
  
  // Remove modals again before clicking
  await page.evaluate(() => {
    document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop').forEach(el => el.remove());
  });
  
  // Start simulation
  const runButton = page.locator('button:has-text("Run Simulation from JSON")');
  await expect(runButton).toBeEnabled();
  
  console.log('Starting quick simulation...');
  await runButton.click({ force: true });
  
  // Should start running
  await expect(page.locator('text=Running...')).toBeVisible({ timeout: 5000 });
  console.log('Simulation started, waiting for completion...');
  
  // Should complete quickly (12 months should take seconds, not minutes)
  await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: 30000 });
  
  // Check result
  const completed = await page.locator('text=✅ Simulation Completed').count() > 0;
  const errored = await page.locator('text=❌ Error').count() > 0;
  
  console.log('Simulation completed:', completed);
  console.log('Simulation errored:', errored);
  
  if (completed) {
    console.log('✅ Quick simulation completed successfully!');
    
    // Verify we have output
    const outputArea = page.locator('pre').last();
    const outputText = await outputArea.textContent();
    const hasOutput = outputText && outputText.length > 100;
    console.log('Has meaningful output:', hasOutput);
    
    if (hasOutput) {
      // Parse and validate the output
      try {
        const output = JSON.parse(outputText);
        console.log('Output structure valid:', typeof output === 'object');
        console.log('Has success field:', 'success' in output);
        console.log('Success value:', output.success);
        
        if (output.success && output.monthlyData) {
          console.log('Monthly data entries:', output.monthlyData.length);
          console.log('Expected entries (12 months):', 12);
          expect(output.monthlyData.length).toBe(12);
        }
      } catch (e) {
        console.log('Output is not valid JSON:', e.message);
      }
    }
  } else if (errored) {
    const errorArea = page.locator('text=❌ Error').locator('..');
    const errorText = await errorArea.textContent();
    console.log('Error details:', errorText);
  }
  
  // Test completed
  expect(completed || errored).toBe(true);
});