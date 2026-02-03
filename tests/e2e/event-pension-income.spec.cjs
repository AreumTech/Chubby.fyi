/**
 * PENSION_INCOME Event Tests
 * Tests the PENSION_INCOME event type for monthly pension income scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('monthly pension income event', async ({ page }) => {
  console.log('Testing PENSION_INCOME event: Monthly pension income');
  
  const pensionIncomeCase = {
    initialAccounts: { 
      cash: 3000  // Start with some cash, pension will add to it
    },
    events: [
      {
        id: 'monthly-pension',
        type: 'PENSION_INCOME',
        monthOffset: 0,
        amount: 2200,
        metadata: { 
          name: 'Monthly Pension Income',
          pensionType: 'corporate',
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
    monthsToRun: 3, // Test 3 months of pension income
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(pensionIncomeCase, null, 2));
  
  console.log('Pension income test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Pension income simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Pension income simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 3000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    totalPensionIncomeExpected: 2200 * 3, // 3 months at $2200/month
    month0Income: results.monthlyData?.[0]?.incomeThisMonth,
    month1Income: results.monthlyData?.[1]?.incomeThisMonth,
    month2Income: results.monthlyData?.[2]?.incomeThisMonth,
    netWorthGrowth: results.finalNetWorth - 3000
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  
  // Final net worth should be initial cash plus total pension income plus modest returns
  expect(results.finalNetWorth).toBeGreaterThan(3000); // Should be higher than initial due to income
  expect(results.finalNetWorth).toBeGreaterThan(9000); // Should be around $9.6k ($3k + $6.6k + returns)
  
  // Validate income was applied each month
  expect(results.monthlyData[0].incomeThisMonth).toBe(2200);
  expect(results.monthlyData[1].incomeThisMonth).toBe(2200);
  expect(results.monthlyData[2].incomeThisMonth).toBe(2200);
  
  // Net worth should increase each month due to income
  expect(results.monthlyData[0].netWorth).toBeGreaterThan(3000);
  expect(results.monthlyData[1].netWorth).toBeGreaterThan(results.monthlyData[0].netWorth);
  expect(results.monthlyData[2].netWorth).toBeGreaterThan(results.monthlyData[1].netWorth);
  
  // Final cash should reflect all pension income plus returns
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeGreaterThan(9000); // Approximately $3k initial + $6.6k income + returns
  expect(finalCash).toBeLessThan(11000); // But not too much more (allowing for returns)
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ PENSION_INCOME event test passed - pension income working correctly');
});