/**
 * INCOME Event Tests
 * Tests the INCOME event type with various scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('simple monthly income event', async ({ page }) => {
  console.log('Testing INCOME event: Monthly salary');
  
  const incomeCase = {
    initialAccounts: { 
      cash: 2000 
    },
    events: [
      {
        id: 'monthly-salary',
        type: 'INCOME',
        monthOffset: 0,
        amount: 5000,
        metadata: { 
          name: 'Monthly Salary',
          taxable: true 
        }
      }
    ],
    config: {
      expectedReturns: { CASH: 0.02 },
      volatilities: { CASH: 0.01 }
    },
    monthsToRun: 2, // Test 2 months to verify recurring behavior
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(incomeCase, null, 2));
  
  console.log('Income test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Income simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Income simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    finalNetWorth: results.finalNetWorth,
    month0Income: results.monthlyData?.[0]?.incomeThisMonth,
    month1Income: results.monthlyData?.[1]?.incomeThisMonth
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(2);
  expect(results.finalNetWorth).toBeGreaterThan(2000); // Should be higher than initial
  
  // Validate income was applied both months
  expect(results.monthlyData[0].incomeThisMonth).toBe(5000);
  expect(results.monthlyData[1].incomeThisMonth).toBe(5000);
  
  // Net worth should reflect income minus taxes
  expect(results.monthlyData[0].netWorth).toBeGreaterThan(2000);
  expect(results.monthlyData[1].netWorth).toBeGreaterThan(results.monthlyData[0].netWorth);
  
  console.log('✅ INCOME event test passed - recurring monthly income working correctly');
});