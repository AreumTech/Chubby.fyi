/**
 * SOCIAL_SECURITY_INCOME Event Tests
 * Tests the SOCIAL_SECURITY_INCOME event type for monthly social security income scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('monthly social security income event', async ({ page }) => {
  console.log('Testing SOCIAL_SECURITY_INCOME event: Monthly social security income');
  
  const socialSecurityCase = {
    initialAccounts: { 
      cash: 5000  // Start with some cash, social security will add to it
    },
    events: [
      {
        id: 'monthly-ss-income',
        type: 'SOCIAL_SECURITY_INCOME',
        monthOffset: 0,
        amount: 1800,
        metadata: { 
          name: 'Monthly Social Security Income',
          benefitType: 'retirement',
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
    monthsToRun: 3, // Test 3 months of social security income
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(socialSecurityCase, null, 2));
  
  console.log('Social security income test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Social security income simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Social security income simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 5000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    totalSSIncomeExpected: 1800 * 3, // 3 months at $1800/month
    month0Income: results.monthlyData?.[0]?.incomeThisMonth,
    month1Income: results.monthlyData?.[1]?.incomeThisMonth,
    month2Income: results.monthlyData?.[2]?.incomeThisMonth,
    netWorthGrowth: results.finalNetWorth - 5000
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  
  // Final net worth should be initial cash plus total social security income plus modest returns
  expect(results.finalNetWorth).toBeGreaterThan(5000); // Should be higher than initial due to income
  expect(results.finalNetWorth).toBeGreaterThan(10000); // Should be around $10.4k ($5k + $5.4k + returns)
  
  // Validate income was applied each month
  expect(results.monthlyData[0].incomeThisMonth).toBe(1800);
  expect(results.monthlyData[1].incomeThisMonth).toBe(1800);
  expect(results.monthlyData[2].incomeThisMonth).toBe(1800);
  
  // Net worth should increase each month due to income
  expect(results.monthlyData[0].netWorth).toBeGreaterThan(5000);
  expect(results.monthlyData[1].netWorth).toBeGreaterThan(results.monthlyData[0].netWorth);
  expect(results.monthlyData[2].netWorth).toBeGreaterThan(results.monthlyData[1].netWorth);
  
  // Final cash should reflect all social security income plus returns
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeGreaterThan(10000); // Approximately $5k initial + $5.4k income + returns
  expect(finalCash).toBeLessThan(12000); // But not too much more (allowing for returns)
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ SOCIAL_SECURITY_INCOME event test passed - social security income working correctly');
});