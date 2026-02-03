/**
 * HEALTHCARE_COST Event Tests
 * Tests the HEALTHCARE_COST event type for medical expense scenarios
 */

const { test, expect } = require('@playwright/test');
const { setupTestHarness } = require('./helpers/modalHelpers.cjs');

test.beforeEach(async ({ page }) => {
  await setupTestHarness(page);
});

test('monthly healthcare cost event', async ({ page }) => {
  console.log('Testing HEALTHCARE_COST event: Monthly medical expenses');
  
  const healthcareCostCase = {
    initialAccounts: { 
      cash: 15000  // Start with sufficient cash for multiple months of healthcare costs
    },
    events: [
      {
        id: 'monthly-medical',
        type: 'HEALTHCARE_COST',
        monthOffset: 0,
        amount: 1200,
        metadata: { 
          name: 'Monthly Medical Expenses',
          category: 'Healthcare',
          deductible: true
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
  await jsonEditor.fill(JSON.stringify(healthcareCostCase, null, 2));
  
  console.log('Healthcare cost test case loaded');
  
  // Click run button
  const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
  await runButton.click();
  
  console.log('Healthcare cost simulation started...');
  
  // Wait for completion
  await expect(page.locator('text=✅ Simulation Completed')).toBeVisible({ timeout: 20000 });
  
  // Get results and validate
  const outputElement = await page.locator('pre').textContent();
  expect(outputElement).toBeTruthy();
  
  const results = JSON.parse(outputElement);
  console.log('Healthcare cost simulation results:', {
    success: results.success,
    monthCount: results.monthlyData?.length,
    initialCash: 15000,
    finalNetWorth: results.finalNetWorth,
    finalCash: results.monthlyData?.[2]?.accounts?.cash,
    totalHealthcareCosts: 1200 * 3, // 3 months at $1200/month
    cashFlowImpact: results.finalNetWorth - 15000
  });
  
  // Validate results
  expect(results.success).toBe(true);
  expect(results.monthlyData).toHaveLength(3);
  
  // Final net worth should be initial cash minus total healthcare costs plus modest returns
  expect(results.finalNetWorth).toBeLessThan(15000); // Should be reduced by healthcare costs
  expect(results.finalNetWorth).toBeGreaterThan(11300); // Should be around $11.4k ($15k - $3.6k + returns, allowing for volatility)
  
  // Validate cash decreased appropriately  
  const finalCash = results.monthlyData[2].accounts.cash;
  expect(finalCash).toBeLessThan(15000); // Initial cash reduced
  expect(finalCash).toBeGreaterThan(11300); // Approximately $15k - $3.6k + returns, allowing for volatility
  
  // Net worth should approximately equal final cash (only account type)
  expect(Math.abs(results.finalNetWorth - finalCash)).toBeLessThan(1); // Should be nearly identical
  
  console.log('✅ HEALTHCARE_COST event test passed - healthcare expenses working correctly');
});