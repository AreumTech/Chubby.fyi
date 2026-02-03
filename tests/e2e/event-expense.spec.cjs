/**
 * EXPENSE Event Tests
 * Tests the EXPENSE event type with various scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('simple monthly expense event', async ({ page }) => {
  console.log('Testing EXPENSE event: Monthly rent');
  
  const expenseCase = {
    initialAccounts: { 
      cash: 10000 // Start with enough cash for expenses
    },
    events: [
      {
        id: 'monthly-rent',
        type: 'EXPENSE',
        monthOffset: 0,
        amount: 2500,
        metadata: { 
          name: 'Monthly Rent',
          category: 'Housing' 
        }
      }
    ],
    config: {
      expectedReturns: { CASH: 0.02 },
      volatilities: { CASH: 0.01 }
    },
    monthsToRun: 3, // Test 3 months of expenses
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(expenseCase, null, 2));
  
  console.log('Expense test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Expense simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Expense simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 10000,
    finalNetWorth: results.finalNetWorth,
    totalExpensesExpected: 2500 * 3,
    month0Expenses: results.monthlyData?.[0]?.expensesThisMonth,
    month1Expenses: results.monthlyData?.[1]?.expensesThisMonth,
    month2Expenses: results.monthlyData?.[2]?.expensesThisMonth
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  expect(results.finalNetWorth).toBeLessThan(10000); // Should be lower than initial due to expenses
  
  // Validate expenses were applied each month
  expect(results.monthlyData[0].expensesThisMonth).toBe(2500);
  expect(results.monthlyData[1].expensesThisMonth).toBe(2500);
  expect(results.monthlyData[2].expensesThisMonth).toBe(2500);
  
  // Net worth should decrease each month due to expenses
  expect(results.monthlyData[0].netWorth).toBeLessThan(10000);
  expect(results.monthlyData[1].netWorth).toBeLessThan(results.monthlyData[0].netWorth);
  expect(results.monthlyData[2].netWorth).toBeLessThan(results.monthlyData[1].netWorth);
  
  // Final net worth should be roughly initial - (3 * 2500) + some returns
  const expectedApproximateReduction = 2500 * 3; // 7500
  const actualReduction = 10000 - results.finalNetWorth;
  expect(actualReduction).toBeGreaterThan(7000); // Account for some positive returns
  expect(actualReduction).toBeLessThan(8000); // Shouldn't be too much more than expenses
  
  console.log('✅ EXPENSE event test passed - recurring monthly expenses working correctly');
});