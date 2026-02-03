/**
 * LIFE_INSURANCE_PREMIUM Event Tests
 * Tests the LIFE_INSURANCE_PREMIUM event type for life insurance premium scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('life insurance premium event', async ({ page }) => {
  console.log('Testing LIFE_INSURANCE_PREMIUM event: Monthly insurance premiums');
  
  const lifeInsurancePremiumCase = {
    initialAccounts: { 
      cash: 15000  // Start with sufficient cash for insurance premiums
    },
    events: [
      {
        id: 'monthly-life-insurance',
        type: 'LIFE_INSURANCE_PREMIUM',
        monthOffset: 0,
        amount: 150,
        metadata: { 
          name: 'Monthly Life Insurance Premium',
          policyType: 'Term Life',
          beneficiary: 'Spouse',
          coverage: 500000,
          frequency: 'one-time'  // Test as single payment for now
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
    monthsToRun: 3, // Test 3 months to see insurance premium impact
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(lifeInsurancePremiumCase, null, 2));
  
  console.log('Life insurance premium test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Life insurance premium simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Life insurance premium simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 15000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    expectedPremium: 150,
    month0Expenses: results.monthlyData?.[0]?.expensesThisMonth,
    month1Expenses: results.monthlyData?.[1]?.expensesThisMonth,
    month2Expenses: results.monthlyData?.[2]?.expensesThisMonth,
    netWorthReduction: 15000 - results.finalNetWorth
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  
  // Final net worth should be initial cash minus premium plus modest returns
  expect(results.finalNetWorth).toBeLessThan(15000); // Should be reduced by premium
  expect(results.finalNetWorth).toBeGreaterThan(14800); // Should be around $14.85k ($15k - $150 + returns)
  
  // Validate premium occurred in month 0 only (frequency: one-time)
  expect(results.monthlyData[0].expensesThisMonth).toBe(150); // Month 0: premium payment occurs
  expect(results.monthlyData[1].expensesThisMonth).toBe(0); // Month 1: no premium payment
  expect(results.monthlyData[2].expensesThisMonth).toBe(0); // Month 2: no premium payment
  
  // Final cash should reflect the premium payment
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeLessThan(15000); // Initial cash reduced
  expect(finalCash).toBeGreaterThan(14800); // Approximately $15k - $150 + returns
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ LIFE_INSURANCE_PREMIUM event test passed - life insurance premiums working correctly');
});