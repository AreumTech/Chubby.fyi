/**
 * DEBT_PAYMENT Event Tests
 * Tests the DEBT_PAYMENT event type for monthly debt payment scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('monthly debt payment event', async ({ page }) => {
  console.log('Testing DEBT_PAYMENT event: Monthly loan payments');
  
  const debtPaymentCase = {
    initialAccounts: { 
      cash: 12000  // Start with sufficient cash for debt payments
    },
    events: [
      {
        id: 'monthly-loan-payment',
        type: 'DEBT_PAYMENT',
        monthOffset: 0,
        amount: 850,
        metadata: { 
          name: 'Monthly Loan Payment',
          loanType: 'Personal Loan',
          principal: 850,
          interest: 0  // Simplified - treating full amount as principal
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
    monthsToRun: 4, // Test 4 months of debt payments
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(debtPaymentCase, null, 2));
  
  console.log('Debt payment test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Debt payment simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Debt payment simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 12000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[3]?.accounts?.cash,
    totalDebtPayments: 850 * 4, // 4 months at $850/month
    month0DebtPayments: results.monthlyData?.[0]?.debtPaymentsPrincipalThisMonth,
    month3DebtPayments: results.monthlyData?.[3]?.debtPaymentsPrincipalThisMonth,
    cashFlowImpact: results.finalNetWorth - 12000
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(4);
  
  // Final net worth should be initial cash minus total debt payments plus modest returns
  expect(results.finalNetWorth).toBeLessThan(12000); // Should be reduced by debt payments
  expect(results.finalNetWorth).toBeGreaterThan(8500); // Should be around $8.6k ($12k - $3.4k + returns)
  
  // Validate debt payments are tracked each month
  expect(results.monthlyData[0].debtPaymentsPrincipalThisMonth).toBe(850);
  expect(results.monthlyData[1].debtPaymentsPrincipalThisMonth).toBe(850);
  expect(results.monthlyData[2].debtPaymentsPrincipalThisMonth).toBe(850);
  expect(results.monthlyData[3].debtPaymentsPrincipalThisMonth).toBe(850);
  
  // Validate cash decreased appropriately  
  const finalCash = results.monthlyData[3].accounts.cash;
  expect(finalCash).toBeLessThan(12000); // Initial cash reduced
  expect(finalCash).toBeGreaterThan(8500); // Approximately $12k - $3.4k + returns
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ DEBT_PAYMENT event test passed - debt payments working correctly');
});