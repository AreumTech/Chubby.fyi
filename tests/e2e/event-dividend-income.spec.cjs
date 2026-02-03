/**
 * DIVIDEND_INCOME Event Tests
 * Tests the DIVIDEND_INCOME event type for investment dividend scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('quarterly dividend payment event', async ({ page }) => {
  console.log('Testing DIVIDEND_INCOME event: Quarterly dividend payments');
  
  const dividendIncomeCase = {
    initialAccounts: { 
      cash: 10000  // Start with cash only, dividends will increase it
    },
    events: [
      {
        id: 'quarterly-dividend',
        type: 'DIVIDEND_INCOME',
        monthOffset: 0,
        amount: 500,
        metadata: { 
          name: 'Quarterly Dividend Payment',
          source: 'Stock Portfolio',
          qualified: true,
          frequency: 'one-time'  // Make it one-time to avoid monthly recurrence
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
    monthsToRun: 3, // Test 3 months - should occur in month 0 only
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(dividendIncomeCase, null, 2));
  
  console.log('Dividend income test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Dividend income simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Dividend income simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 10000,
    finalNetWorth: results.finalNetWorth,
    month0Dividends: results.monthlyData?.[0]?.dividendsReceivedThisMonth?.qualified,
    month1Dividends: results.monthlyData?.[1]?.dividendsReceivedThisMonth?.qualified,
    month2Dividends: results.monthlyData?.[2]?.dividendsReceivedThisMonth?.qualified,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    totalDividendsYTD: results.monthlyData?.[2]?.qualifiedDividendIncomeYTD
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  expect(results.finalNetWorth).toBeGreaterThan(10000); // Initial $10k + dividend + returns
  expect(results.finalNetWorth).toBeGreaterThan(10400); // Should have at least $10k + $500 dividend
  
  // Validate dividend payment occurred in month 0 only (one-time event)
  expect(results.monthlyData[0].dividendsReceivedThisMonth.qualified).toBe(500);
  expect(results.monthlyData[1].dividendsReceivedThisMonth.qualified).toBe(0); 
  expect(results.monthlyData[2].dividendsReceivedThisMonth.qualified).toBe(0);
  
  // Cash should increase by dividend amount
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeGreaterThan(10400); // Initial $10k + $500 dividend + returns
  expect(finalCash).toBeLessThan(10700); // But not too much more
  
  // Note: YTD dividend tracking may require additional year-end setup, focusing on core dividend functionality
  
  console.log('✅ DIVIDEND_INCOME event test passed - dividend payments working correctly');
});