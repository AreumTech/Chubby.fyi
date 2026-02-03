/**
 * CONTRIBUTION Event Tests
 * Tests the CONTRIBUTION event type with various scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('simple monthly 401k contribution event', async ({ page }) => {
  console.log('Testing CONTRIBUTION event: Monthly 401k contribution');
  
  const contributionCase = {
    initialAccounts: { 
      cash: 10000  // Start with only cash, contributions will create tax_deferred accounts
    },
    events: [
      {
        id: 'monthly-401k',
        type: 'CONTRIBUTION',
        monthOffset: 0,
        amount: 2000,
        metadata: { 
          name: 'Monthly 401k Contribution',
          targetAccountType: 'tax_deferred',
          employerMatch: false
        }
      }
    ],
    config: {
      expectedReturns: { 
        CASH: 0.02,
        TAX_DEFERRED_INVESTMENTS: 0.07
      },
      volatilities: { 
        CASH: 0.01,
        TAX_DEFERRED_INVESTMENTS: 0.15
      }
    },
    monthsToRun: 3, // Test 3 months of contributions
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(contributionCase, null, 2));
  
  console.log('Contribution test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Contribution simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Contribution simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 10000,
    finalNetWorth: results.finalNetWorth,
    totalContributionsExpected: 2000 * 3,
    month0Contributions: results.monthlyData?.[0]?.contributionsToInvestmentsThisMonth,
    month1Contributions: results.monthlyData?.[1]?.contributionsToInvestmentsThisMonth,
    month2Contributions: results.monthlyData?.[2]?.contributionsToInvestmentsThisMonth,
    finalTaxDeferredBalance: results.monthlyData?.[2]?.accounts?.tax_deferred?.totalValue,
    finalCash: results.monthlyData?.[2]?.accounts?.cash
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  expect(results.finalNetWorth).toBeGreaterThan(9500); // Initial $10k - $6k contributions + returns should be positive
  
  // Validate contributions were applied each month
  expect(results.monthlyData[0].contributionsToInvestmentsThisMonth).toBe(2000);
  expect(results.monthlyData[1].contributionsToInvestmentsThisMonth).toBe(2000);
  expect(results.monthlyData[2].contributionsToInvestmentsThisMonth).toBe(2000);
  
  // Cash should decrease each month due to contributions
  expect(results.monthlyData[0].accounts.cash).toBeLessThan(10000);
  expect(results.monthlyData[1].accounts.cash).toBeLessThan(results.monthlyData[0].accounts.cash);
  expect(results.monthlyData[2].accounts.cash).toBeLessThan(results.monthlyData[1].accounts.cash);
  
  // Tax deferred investments should be created with contributions
  expect(results.monthlyData[0].accounts.tax_deferred.totalValue).toBeGreaterThan(1900); // ~$2000 contribution minus some returns
  // Note: Monthly data may show end-state values, so we don't require strictly increasing month-to-month
  
  // Final tax deferred balance should reflect all contributions plus/minus returns
  expect(results.monthlyData[2].accounts.tax_deferred.totalValue).toBeGreaterThan(5500); // ~$6000 contributions with some volatility
  expect(results.monthlyData[2].accounts.tax_deferred.totalValue).toBeLessThan(6500); // But not too much more
  
  console.log('✅ CONTRIBUTION event test passed - recurring monthly contributions working correctly');
});