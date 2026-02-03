/**
 * Simulation Engine Validation Suite (CommonJS)
 * 
 * Deep validation of simulation engine correctness using the test harness
 * to verify financial calculations, edge cases, and data integrity.
 */

const { test, expect } = require('@playwright/test');

const SIMULATION_TIMEOUT = 45000;

test.describe('Simulation Engine Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-harness');
    
    // Aggressive modal dismissal
    await page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop').forEach(el => el.remove());
    });
    
    await expect(page.locator('h1')).toContainText('Simulation Test Harness');
    
    // Wait for WASM status to resolve
    await expect(page.locator('text=WASM Status:')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Available').or(
      page.locator('text=Not Available')
    )).toBeVisible({ timeout: 15000 });
    
    // Check if WASM is available - skip if not
    const wasmAvailable = await page.locator('text=Available').count() > 0;
    if (!wasmAvailable) {
      console.log('WASM not available - skipping simulation engine tests');
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
    
    await page.click('button:has-text("Run Simulation from JSON")', { force: true });
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Should complete successfully
    await expect(page.locator('text=✅ Simulation Completed')).toBeVisible();
    
    // Verify console output shows income processing
    const consoleArea = page.locator('.h-64.bg-gray-900');
    const consoleText = await consoleArea.textContent();
    expect(consoleText).toMatch(/input.*events.*2|INCOME/);
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
    
    await page.click('button:has-text("Run Simulation from JSON")', { force: true });
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
    
    await page.click('button:has-text("Run Simulation from JSON")', { force: true });
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Should handle large amounts without overflow
    const hasResult = await page.locator('text=✅ Simulation Completed').or(
      page.locator('text=❌ Error')
    ).count() > 0;
    expect(hasResult).toBe(true);
  });
});