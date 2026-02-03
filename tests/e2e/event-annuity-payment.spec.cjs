/**
 * ANNUITY_PAYMENT Event Tests
 * Tests the ANNUITY_PAYMENT event type for monthly annuity payment scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('monthly annuity payment event', async ({ page }) => {
  console.log('Testing ANNUITY_PAYMENT event: Monthly annuity payments');
  
  const annuityPaymentCase = {
    initialAccounts: { 
      cash: 8000  // Start with some cash, annuity will add to it
    },
    events: [
      {
        id: 'monthly-annuity',
        type: 'ANNUITY_PAYMENT',
        monthOffset: 0,
        amount: 1500,
        metadata: { 
          name: 'Monthly Annuity Payment',
          annuityType: 'immediate',
          taxable: true
        }
      }
    ],
    config: {
      expectedReturns: { 
        CASH: 0.02
      },
      volatilities: { 
        CASH: 0.01
      }
    },
    monthsToRun: 3, // Test 3 months of annuity payments
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(annuityPaymentCase, null, 2));
  
  console.log('Annuity payment test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Annuity payment simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Annuity payment simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 8000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    totalAnnuityExpected: 1500 * 3, // 3 months at $1500/month
    month0Income: results.monthlyData?.[0]?.incomeThisMonth,
    month1Income: results.monthlyData?.[1]?.incomeThisMonth,
    month2Income: results.monthlyData?.[2]?.incomeThisMonth,
    netWorthGrowth: results.finalNetWorth - 8000
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  
  // Final net worth should be initial cash plus total annuity payments plus modest returns
  expect(results.finalNetWorth).toBeGreaterThan(8000); // Should be higher than initial due to income
  expect(results.finalNetWorth).toBeGreaterThan(12000); // Should be around $12.5k ($8k + $4.5k + returns)
  
  // Validate income was applied each month
  expect(results.monthlyData[0].incomeThisMonth).toBe(1500);
  expect(results.monthlyData[1].incomeThisMonth).toBe(1500);
  expect(results.monthlyData[2].incomeThisMonth).toBe(1500);
  
  // Net worth should increase each month due to income
  expect(results.monthlyData[0].netWorth).toBeGreaterThan(8000);
  expect(results.monthlyData[1].netWorth).toBeGreaterThan(results.monthlyData[0].netWorth);
  expect(results.monthlyData[2].netWorth).toBeGreaterThan(results.monthlyData[1].netWorth);
  
  // Final cash should reflect all annuity payments plus returns
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeGreaterThan(12000); // Approximately $8k initial + $4.5k payments + returns
  expect(finalCash).toBeLessThan(14000); // But not too much more (allowing for returns)
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ ANNUITY_PAYMENT event test passed - annuity payments working correctly');
});