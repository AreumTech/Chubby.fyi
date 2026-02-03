/**
 * Minimal Simulation Test - Foundation test that must always pass
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('minimal simulation case', async ({ page }) => {
  // Test harness setup already completed in beforeEach
  console.log('Testing minimal case: 1 income event, 1 month');
  
  // Absolutely minimal test case - same as our successful manual test
  const minimalCase = {
    initialAccounts: { 
      cash: 1000 
    },
    events: [
      {
        id: 'test-income',
        type: 'INCOME',
        monthOffset: 0,
        amount: 1000,
        metadata: { name: 'Test Income' }
      }
    ],
    config: {
      expectedReturns: { CASH: 0.02 },
      volatilities: { CASH: 0.01 }
    },
    monthsToRun: 1,
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(minimalCase, null, 2));
  
  console.log('Test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Simulation started - waiting for completion...');
  
  // Wait for completion with generous timeout
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 30000 });
  
  console.log('✅ SUCCESS: Automated test passed - simulation completed');
});