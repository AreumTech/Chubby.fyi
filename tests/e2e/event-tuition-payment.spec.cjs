/**
 * TUITION_PAYMENT Event Tests
 * Tests the TUITION_PAYMENT event type for education expense scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('tuition payment event', async ({ page }) => {
  console.log('Testing TUITION_PAYMENT event: Education expenses');
  
  const tuitionPaymentCase = {
    initialAccounts: { 
      cash: 30000  // Start with sufficient cash for tuition payment
    },
    events: [
      {
        id: 'annual-tuition',
        type: 'TUITION_PAYMENT',
        monthOffset: 0,
        amount: 8000,
        metadata: { 
          name: 'Annual University Tuition',
          institution: 'State University',
          semester: 'Fall',
          taxDeductible: true,
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
    monthsToRun: 3, // Test 3 months to see tuition payment impact
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(tuitionPaymentCase, null, 2));
  
  console.log('Tuition payment test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Tuition payment simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Tuition payment simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 30000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    expectedTuitionPayment: 8000,
    month0Expenses: results.monthlyData?.[0]?.expensesThisMonth,
    month1Expenses: results.monthlyData?.[1]?.expensesThisMonth,
    month2Expenses: results.monthlyData?.[2]?.expensesThisMonth,
    netWorthReduction: 30000 - results.finalNetWorth
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  
  // Final net worth should be initial cash minus tuition payment plus modest returns
  expect(results.finalNetWorth).toBeLessThan(30000); // Should be reduced by tuition payment
  expect(results.finalNetWorth).toBeGreaterThan(21500); // Should be around $22k ($30k - $8k + returns)
  
  // Validate tuition payment occurred in month 0 (monthOffset: 0)
  expect(results.monthlyData[0].expensesThisMonth).toBe(8000); // Month 0: tuition payment occurs
  expect(results.monthlyData[1].expensesThisMonth).toBe(0); // Month 1: no tuition payment
  expect(results.monthlyData[2].expensesThisMonth).toBe(0); // Month 2: no tuition payment
  
  // Final cash should reflect the tuition payment
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeLessThan(30000); // Initial cash reduced
  expect(finalCash).toBeGreaterThan(21500); // Approximately $30k - $8k + returns
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ TUITION_PAYMENT event test passed - tuition payments working correctly');
});