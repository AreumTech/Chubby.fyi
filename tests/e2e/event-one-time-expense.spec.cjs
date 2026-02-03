/**
 * ONE_TIME_EXPENSE Event Tests
 * Tests the ONE_TIME_EXPENSE event type for single occurrence expense scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('one-time expense event', async ({ page }) => {
  console.log('Testing ONE_TIME_EXPENSE event: Large single expense');
  
  const oneTimeExpenseCase = {
    initialAccounts: { 
      cash: 20000  // Start with sufficient cash for the one-time expense
    },
    events: [
      {
        id: 'emergency-repair',
        type: 'ONE_TIME_EXPENSE',
        monthOffset: 1, // Occur in month 1 only
        amount: 5000,
        metadata: { 
          name: 'Emergency Home Repair',
          category: 'Maintenance',
          frequency: 'one-time',
          taxDeductible: false
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
    monthsToRun: 3, // Should only occur in month 1
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(oneTimeExpenseCase, null, 2));
  
  console.log('One-time expense test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('One-time expense simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('One-time expense simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 20000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    expectedExpenseAmount: 5000,
    month0Expenses: results.monthlyData?.[0]?.expensesThisMonth,
    month1Expenses: results.monthlyData?.[1]?.expensesThisMonth,
    month2Expenses: results.monthlyData?.[2]?.expensesThisMonth,
    month0OneTime: results.monthlyData?.[0]?.oneTimeEventsImpactThisMonth,
    month1OneTime: results.monthlyData?.[1]?.oneTimeEventsImpactThisMonth,
    month2OneTime: results.monthlyData?.[2]?.oneTimeEventsImpactThisMonth,
    netWorthReduction: 20000 - results.finalNetWorth
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  
  // Final net worth should be initial cash minus expense plus modest returns
  expect(results.finalNetWorth).toBeLessThan(20000); // Should be reduced by expense
  expect(results.finalNetWorth).toBeGreaterThan(14500); // Should be around $15k ($20k - $5k + returns)
  
  // Validate expense occurred only in month 1 (monthOffset: 1)
  // One-time expenses are tracked in oneTimeEventsImpactThisMonth
  expect(results.monthlyData[0].oneTimeEventsImpactThisMonth).toBe(0); // Month 0: no expense
  expect(results.monthlyData[1].oneTimeEventsImpactThisMonth).toBe(5000); // Month 1: expense occurs
  expect(results.monthlyData[2].oneTimeEventsImpactThisMonth).toBe(0); // Month 2: no expense
  
  // Net worth should decrease only in month 1
  expect(results.monthlyData[0].netWorth).toBeGreaterThan(results.monthlyData[1].netWorth); // Month 1 drops due to expense
  
  // Final cash should reflect the expense
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeLessThan(20000); // Initial cash reduced
  expect(finalCash).toBeGreaterThan(14500); // Approximately $20k - $5k + returns
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ ONE_TIME_EXPENSE event test passed - one-time expenses working correctly');
});