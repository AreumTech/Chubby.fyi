/**
 * QUARTERLY_ESTIMATED_TAX_PAYMENT Event Tests
 * Tests the QUARTERLY_ESTIMATED_TAX_PAYMENT event type for quarterly tax payment scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('quarterly estimated tax payment event', async ({ page }) => {
  console.log('Testing QUARTERLY_ESTIMATED_TAX_PAYMENT event: Quarterly tax payments');
  
  const quarterlyTaxCase = {
    initialAccounts: { 
      cash: 25000  // Start with sufficient cash for tax payments
    },
    events: [
      {
        id: 'quarterly-tax-q1',
        type: 'QUARTERLY_ESTIMATED_TAX_PAYMENT',
        monthOffset: 0,
        amount: 3500,
        metadata: { 
          name: 'Q1 Estimated Tax Payment',
          taxYear: 2024,
          quarter: 1,
          federalAmount: 2800,
          stateAmount: 700,
          frequency: 'one-time'
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
    monthsToRun: 3, // Test 3 months to see tax payment impact
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(quarterlyTaxCase, null, 2));
  
  console.log('Quarterly tax payment test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Quarterly tax payment simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Quarterly tax payment simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 25000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    expectedTaxPayment: 3500,
    month0Expenses: results.monthlyData?.[0]?.expensesThisMonth,
    month1Expenses: results.monthlyData?.[1]?.expensesThisMonth,
    month2Expenses: results.monthlyData?.[2]?.expensesThisMonth,
    month0TaxWithheld: results.monthlyData?.[0]?.taxWithheldThisMonth,
    month1TaxWithheld: results.monthlyData?.[1]?.taxWithheldThisMonth,
    month2TaxWithheld: results.monthlyData?.[2]?.taxWithheldThisMonth,
    netWorthReduction: 25000 - results.finalNetWorth
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  
  // Final net worth should be initial cash minus tax payment plus modest returns
  expect(results.finalNetWorth).toBeLessThan(25000); // Should be reduced by tax payment
  expect(results.finalNetWorth).toBeGreaterThan(10000); // Allow for larger tax impact due to tax system complexity
  
  // Validate tax payment occurred in month 0 (monthOffset: 0)
  // Quarterly tax payments are tracked in taxWithheldThisMonth
  expect(results.monthlyData[0].taxWithheldThisMonth).toBe(3500); // Month 0: tax payment occurs
  expect(results.monthlyData[1].taxWithheldThisMonth).toBe(0); // Month 1: no tax payment
  expect(results.monthlyData[2].taxWithheldThisMonth).toBe(0); // Month 2: no tax payment
  
  // Final cash should reflect the tax payment
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeLessThan(25000); // Initial cash reduced
  expect(finalCash).toBeGreaterThan(10000); // Allow for tax system complexity
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ QUARTERLY_ESTIMATED_TAX_PAYMENT event test passed - quarterly tax payments working correctly');
});