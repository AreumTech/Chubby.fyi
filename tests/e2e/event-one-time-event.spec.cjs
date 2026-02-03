/**
 * ONE_TIME_EVENT Event Tests
 * Tests the ONE_TIME_EVENT event type for one-time financial events
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('one-time windfall event', async ({ page }) => {
  console.log('Testing ONE_TIME_EVENT event: One-time windfall');
  
  const oneTimeEventCase = {
    initialAccounts: { 
      cash: 10000  // Start with some cash, one-time event will add to it
    },
    events: [
      {
        id: 'bonus-windfall',
        type: 'ONE_TIME_EVENT',
        monthOffset: 0,
        amount: 5000,
        metadata: { 
          name: 'Year-end Bonus Windfall',
          eventType: 'bonus',
          taxable: true,
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
    monthsToRun: 3, // Test 3 months - should occur in month 0 only
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  // Fill the JSON editor
  const jsonEditor = page.getByRole('textbox', { name: 'Paste or edit SimulationInput' });
  await jsonEditor.fill(JSON.stringify(oneTimeEventCase, null, 2));
  
  console.log('One-time event test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('One-time event simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('One-time event simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 10000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    oneTimeEventAmount: 5000,
    netWorthGrowth: results.finalNetWorth - 10000
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  
  // Final net worth should be initial cash plus one-time event amount plus modest returns
  expect(results.finalNetWorth).toBeGreaterThan(10000); // Should be higher than initial
  expect(results.finalNetWorth).toBeGreaterThan(14500); // Should be around $15k ($10k + $5k + returns)
  expect(results.finalNetWorth).toBeLessThan(16000); // But not too much more (allowing for volatility)
  
  // Net worth should grow starting from month 0 when event occurs
  expect(results.monthlyData[0].netWorth).toBeGreaterThan(10000);
  
  // Final cash should reflect the one-time event plus returns
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeGreaterThan(14500); // Approximately $10k initial + $5k event + returns
  expect(finalCash).toBeLessThan(16000); // But not too much more (allowing for volatility)
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ ONE_TIME_EVENT test passed - one-time events working correctly');
});