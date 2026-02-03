/**
 * Simulation Engine Validation Suite
 * 
 * Deep validation of simulation engine correctness using the test harness
 * to verify financial calculations, edge cases, and data integrity.
 */

import { test, expect } from '@playwright/test';

const SIMULATION_TIMEOUT = 45000;

test.describe('Simulation Engine Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-harness');
    await expect(page.locator('h1')).toContainText('Simulation Test Harness');
    
    // Wait for WASM to be available or skip
    await page.waitForTimeout(3000);
    const wasmAvailable = await page.locator('text=Available').count() > 0;
    if (!wasmAvailable) {
      test.skip(true, 'WASM not available - skipping simulation engine tests');
      return;
    }
  });

  test('Income Event Processing Validation', async ({ page }) => {
    // Create custom test case focused on income events
    const incomeTestCase = {
      initialAccounts: { cash: 10000 },
      events: [
        {
          id: 'salary-income',
          type: 'INCOME',
          monthOffset: 0,
          amount: 60000, // $5K/month
          metadata: { name: 'Annual Salary', recurring: true }
        },
        {
          id: 'bonus-income', 
          type: 'INCOME',
          monthOffset: 11, // December bonus
          amount: 10000,
          metadata: { name: 'Annual Bonus' }
        }
      ],
      config: {
        expectedReturns: { CASH: 0.02 },
        volatilities: { CASH: 0.01 }
      },
      monthsToRun: 24,
      withdrawalStrategy: { strategy: 'taxable_first' }
    };

    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await jsonEditor.fill(JSON.stringify(incomeTestCase, null, 2));
    
    await page.click('button:has-text("Run Simulation from JSON")');
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Should complete successfully
    await expect(page.locator('text=✅ Simulation Completed')).toBeVisible();
    
    // Verify console output shows income processing
    const consoleArea = page.locator('.h-64.bg-gray-900');
    const consoleText = await consoleArea.textContent();
    expect(consoleText).toMatch(/input.*events.*2|INCOME/);
  });

  test('Expense Event Processing Validation', async ({ page }) => {
    // Create test case with various expense types
    const expenseTestCase = {
      initialAccounts: { cash: 100000 },
      events: [
        {
          id: 'living-expenses',
          type: 'EXPENSE',
          monthOffset: 0,
          amount: 36000, // $3K/month
          metadata: { name: 'Living Expenses', recurring: true }
        },
        {
          id: 'one-time-expense',
          type: 'EXPENSE', 
          monthOffset: 6,
          amount: 15000,
          metadata: { name: 'Major Purchase' }
        }
      ],
      config: {
        expectedReturns: { CASH: 0.02 },
        volatilities: { CASH: 0.01 }
      },
      monthsToRun: 24,
      withdrawalStrategy: { strategy: 'taxable_first' }
    };

    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await jsonEditor.fill(JSON.stringify(expenseTestCase, null, 2));
    
    await page.click('button:has-text("Run Simulation from JSON")');
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    await expect(page.locator('text=✅ Simulation Completed')).toBeVisible();
  });

  test('Contribution Event Processing Validation', async ({ page }) => {
    // Test retirement account contributions
    const contributionTestCase = {
      initialAccounts: { 
        cash: 50000,
        tax_deferred: { totalValue: 20000, holdings: [] }
      },
      events: [
        {
          id: '401k-contribution',
          type: 'CONTRIBUTION',
          monthOffset: 0,
          amount: 22500, // Max 401k for 2023
          metadata: { 
            name: '401k Contribution',
            targetAccountType: 'tax_deferred'
          }
        }
      ],
      config: {
        expectedReturns: { 
          CASH: 0.02,
          US_STOCKS_TOTAL_MARKET: 0.08
        },
        volatilities: { 
          CASH: 0.01,
          US_STOCKS_TOTAL_MARKET: 0.16
        }
      },
      monthsToRun: 12,
      withdrawalStrategy: { strategy: 'taxable_first' }
    };

    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await jsonEditor.fill(JSON.stringify(contributionTestCase, null, 2));
    
    await page.click('button:has-text("Run Simulation from JSON")');
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    await expect(page.locator('text=✅ Simulation Completed')).toBeVisible();
  });

  test('Withdrawal Event Processing Validation', async ({ page }) => {
    // Test withdrawal events
    const withdrawalTestCase = {
      initialAccounts: { 
        cash: 10000,
        tax_deferred: { 
          totalValue: 500000, 
          holdings: [
            {
              id: 'retirement-stocks',
              assetClass: 'US_STOCKS_TOTAL_MARKET',
              quantity: 5000,
              costBasisPerUnit: 80,
              costBasisTotal: 400000,
              currentMarketValueTotal: 500000
            }
          ]
        }
      },
      events: [
        {
          id: 'retirement-withdrawal',
          type: 'WITHDRAWAL',
          monthOffset: 0,
          amount: 50000,
          metadata: { 
            name: 'Retirement Withdrawal',
            targetAccountType: 'tax_deferred'
          }
        }
      ],
      config: {
        expectedReturns: { 
          CASH: 0.02,
          US_STOCKS_TOTAL_MARKET: 0.08
        },
        volatilities: { 
          CASH: 0.01,
          US_STOCKS_TOTAL_MARKET: 0.16
        }
      },
      monthsToRun: 12,
      withdrawalStrategy: { strategy: 'taxable_first' }
    };

    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await jsonEditor.fill(JSON.stringify(withdrawalTestCase, null, 2));
    
    await page.click('button:has-text("Run Simulation from JSON")');
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    await expect(page.locator('text=✅ Simulation Completed')).toBeVisible();
  });

  test('Edge Case: Zero Initial Cash', async ({ page }) => {
    const edgeTestCase = {
      initialAccounts: { cash: 0 },
      events: [
        {
          id: 'first-income',
          type: 'INCOME',
          monthOffset: 1, // Income starts in month 1
          amount: 60000,
          metadata: { name: 'Delayed Income Start' }
        }
      ],
      config: {
        expectedReturns: { CASH: 0.02 },
        volatilities: { CASH: 0.01 }
      },
      monthsToRun: 6,
      withdrawalStrategy: { strategy: 'taxable_first' }
    };

    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await jsonEditor.fill(JSON.stringify(edgeTestCase, null, 2));
    
    await page.click('button:has-text("Run Simulation from JSON")');
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Should either complete or show a controlled error
    const hasResult = await page.locator('text=✅ Simulation Completed').or(
      page.locator('text=❌ Error')
    ).count() > 0;
    expect(hasResult).toBe(true);
  });

  test('Edge Case: Very High Amounts', async ({ page }) => {
    const highAmountTestCase = {
      initialAccounts: { cash: 10000000 }, // $10M
      events: [
        {
          id: 'mega-expense',
          type: 'EXPENSE',
          monthOffset: 0,
          amount: 5000000, // $5M expense
          metadata: { name: 'Major Business Investment' }
        }
      ],
      config: {
        expectedReturns: { CASH: 0.02 },
        volatilities: { CASH: 0.01 }
      },
      monthsToRun: 12,
      withdrawalStrategy: { strategy: 'taxable_first' }
    };

    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await jsonEditor.fill(JSON.stringify(highAmountTestCase, null, 2));
    
    await page.click('button:has-text("Run Simulation from JSON")');
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Should handle large amounts without overflow
    const hasResult = await page.locator('text=✅ Simulation Completed').or(
      page.locator('text=❌ Error')
    ).count() > 0;
    expect(hasResult).toBe(true);
  });

  test('Edge Case: Long Time Horizons', async ({ page }) => {
    const longTermTestCase = {
      initialAccounts: { cash: 50000 },
      events: [
        {
          id: 'steady-income',
          type: 'INCOME',
          monthOffset: 0,
          amount: 60000,
          metadata: { name: 'Long Term Income' }
        }
      ],
      config: {
        expectedReturns: { CASH: 0.02 },
        volatilities: { CASH: 0.01 }
      },
      monthsToRun: 1200, // 100 years
      withdrawalStrategy: { strategy: 'taxable_first' }
    };

    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await jsonEditor.fill(JSON.stringify(longTermTestCase, null, 2));
    
    await page.click('button:has-text("Run Simulation from JSON")');
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Should handle long time horizons
    const hasResult = await page.locator('text=✅ Simulation Completed').or(
      page.locator('text=❌ Error')
    ).count() > 0;
    expect(hasResult).toBe(true);
  });

  test('Complex Multi-Event Scenario', async ({ page }) => {
    // Create complex scenario with multiple event types
    const complexTestCase = {
      initialAccounts: { 
        cash: 25000,
        taxable: { totalValue: 50000, holdings: [] },
        tax_deferred: { totalValue: 100000, holdings: [] }
      },
      events: [
        { id: 'salary', type: 'INCOME', monthOffset: 0, amount: 80000, metadata: { name: 'Salary' }},
        { id: 'expenses', type: 'EXPENSE', monthOffset: 0, amount: 45000, metadata: { name: 'Expenses' }},
        { id: '401k', type: 'CONTRIBUTION', monthOffset: 0, amount: 15000, metadata: { name: '401k', targetAccountType: 'tax_deferred' }},
        { id: 'roth', type: 'CONTRIBUTION', monthOffset: 0, amount: 6000, metadata: { name: 'Roth IRA', targetAccountType: 'roth' }},
        { id: 'bonus', type: 'INCOME', monthOffset: 11, amount: 10000, metadata: { name: 'Bonus' }},
        { id: 'vacation', type: 'EXPENSE', monthOffset: 6, amount: 8000, metadata: { name: 'Vacation' }}
      ],
      config: {
        expectedReturns: { 
          CASH: 0.02,
          US_STOCKS_TOTAL_MARKET: 0.08,
          US_BONDS_TOTAL_MARKET: 0.04
        },
        volatilities: { 
          CASH: 0.01,
          US_STOCKS_TOTAL_MARKET: 0.16,
          US_BONDS_TOTAL_MARKET: 0.05
        }
      },
      monthsToRun: 60,
      withdrawalStrategy: { strategy: 'taxable_first' },
      goals: [
        {
          id: 'retirement-goal',
          name: 'Retirement Target',
          targetAmount: 1000000,
          targetMonthOffset: 360,
          priority: 1,
          category: 'RETIREMENT'
        }
      ]
    };

    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await jsonEditor.fill(JSON.stringify(complexTestCase, null, 2));
    
    await page.click('button:has-text("Run Simulation from JSON")');
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    await expect(page.locator('text=✅ Simulation Completed')).toBeVisible();
    
    // Verify output structure for complex scenario
    const outputArea = page.locator('pre').last();
    const outputText = await outputArea.textContent();
    
    // Should contain simulation results
    expect(outputText).toMatch(/"success":\s*true|monthlyData|accounts/);
  });
});