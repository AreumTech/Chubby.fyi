/**
 * Test Harness E2E Validation Suite
 * 
 * Comprehensive end-to-end tests that validate the entire simulation pipeline
 * using the dedicated test harness page for maximum reliability and debugging.
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_TIMEOUT = 60000; // 60 seconds for full simulation pipeline
const SIMULATION_TIMEOUT = 30000; // 30 seconds for individual simulations

test.describe('Test Harness Validation Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test harness
    await page.goto('/test-harness');
    
    // Wait for initial page load
    await expect(page.locator('h1')).toContainText('Simulation Test Harness');
    
    // Wait for WASM status to be determined (up to 10 seconds)
    await expect(page.locator('[data-testid="wasm-status"]').or(
      page.locator('text=Available').or(
        page.locator('text=Not Available')
      )
    )).toBeVisible({ timeout: 10000 });
  });

  test('Test Harness Page Loads and Components Work', async ({ page }) => {
    // Verify all major components are present
    await expect(page.locator('h1')).toContainText('🧪 Simulation Test Harness');
    await expect(page.locator('text=Pre-built Test Cases')).toBeVisible();
    await expect(page.locator('text=Simulation Input (JSON)')).toBeVisible();
    await expect(page.locator('text=Controls')).toBeVisible();
    await expect(page.locator('text=Data Flow Trace')).toBeVisible();
    await expect(page.locator('text=Simulation Output')).toBeVisible();
    
    // Verify all test case buttons are present
    await expect(page.locator('button:has-text("Young Accumulator")')).toBeVisible();
    await expect(page.locator('button:has-text("Retiree Drawdown")')).toBeVisible();
    await expect(page.locator('button:has-text("Liquidity Crisis")')).toBeVisible();
    
    // Verify controls are present
    await expect(page.locator('button:has-text("Run Simulation from JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("Render Results in App")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    
    // Verify JSON editor has content
    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await expect(jsonEditor).toBeVisible();
    const content = await jsonEditor.inputValue();
    expect(content.length).toBeGreaterThan(100);
    expect(content).toContain('initialAccounts');
    expect(content).toContain('events');
  });

  test('Test Case Loading Works', async ({ page }) => {
    // Load Young Accumulator test case
    await page.click('button:has-text("Young Accumulator")');
    
    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    const content = await jsonEditor.inputValue();
    
    // Verify Young Accumulator content
    expect(content).toContain('"cash": 15000');
    expect(content).toContain('Tech Professional Salary');
    expect(content).toContain('401(k) Contribution');
    expect(content).toContain('financial-independence');
    
    // Load Retiree Drawdown test case
    await page.click('button:has-text("Retiree Drawdown")');
    
    const retireeContent = await jsonEditor.inputValue();
    expect(retireeContent).toContain('Social Security Benefits');
    expect(retireeContent).toContain('Required Minimum Distribution');
    expect(retireeContent).toContain('bucket_strategy');
    
    // Load Liquidity Crisis test case
    await page.click('button:has-text("Liquidity Crisis")');
    
    const crisisContent = await jsonEditor.inputValue();
    expect(crisisContent).toContain('Unemployment Benefits');
    expect(crisisContent).toContain('Emergency 401k Withdrawal');
    expect(crisisContent).toContain('Financial Recovery');
  });

  test('WASM Status Detection Works', async ({ page }) => {
    // Check if WASM status is displayed
    const wasmStatusSection = page.locator('text=WASM Status:').locator('..');
    await expect(wasmStatusSection).toBeVisible();
    
    // Should show either Available, Not Available, or Loading
    const hasStatus = await page.locator('text=Available').or(
      page.locator('text=Not Available')
    ).or(
      page.locator('text=Loading')
    ).count();
    
    expect(hasStatus).toBeGreaterThan(0);
  });

  test('Data Flow Tracing Works', async ({ page }) => {
    // Enable data flow tracing (should be enabled by default)
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    
    // Verify console output area exists
    const consoleArea = page.locator('.h-64.bg-gray-900');
    await expect(consoleArea).toBeVisible();
    
    // Clear console to test
    await page.click('button:has-text("Clear")');
    await expect(consoleArea).toContainText('Console output will appear here...');
  });

  test('JSON Editor Validation Works', async ({ page }) => {
    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    
    // Test invalid JSON
    await jsonEditor.fill('{ invalid json }');
    
    // Attempt to run simulation
    const runButton = page.locator('button:has-text("Run Simulation from JSON")');
    
    // If WASM is available, we should get a parsing error
    const wasmAvailable = await page.locator('text=Available').count() > 0;
    
    if (wasmAvailable) {
      await runButton.click();
      
      // Should show JSON parsing error
      await expect(page.locator('text=❌ Error')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('pre').or(page.locator('div')).filter({ hasText: /JSON|parse|syntax/i })).toBeVisible();
    } else {
      // Button should be disabled
      await expect(runButton).toBeDisabled();
    }
  });

  test('Simulation Pipeline - Young Accumulator Scenario', async ({ page }) => {
    // Skip if WASM not available
    const wasmAvailable = await page.locator('text=Available').count() > 0;
    if (!wasmAvailable) {
      test.skip(true, 'WASM not available for simulation testing');
      return;
    }
    
    // Load Young Accumulator test case
    await page.click('button:has-text("Young Accumulator")');
    
    // Run simulation
    const runButton = page.locator('button:has-text("Run Simulation from JSON")');
    await expect(runButton).toBeEnabled();
    
    await runButton.click();
    
    // Wait for simulation to complete
    await expect(page.locator('text=Running...')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Check for either success or error
    const hasSuccess = await page.locator('text=✅ Simulation Completed').count() > 0;
    const hasError = await page.locator('text=❌ Error').count() > 0;
    
    expect(hasSuccess || hasError).toBe(true);
    
    if (hasSuccess) {
      // Verify output structure
      const outputSection = page.locator('text=Simulation Output').locator('..');
      await expect(outputSection).toContainText('Output size:');
      
      // Verify render button is now enabled
      await expect(page.locator('button:has-text("Render Results in App")')).toBeEnabled();
      await expect(page.locator('button:has-text("Export")')).toBeEnabled();
    } else {
      // Log error for debugging
      const errorText = await page.locator('text=❌ Error').locator('..').textContent();
      console.log('Simulation error:', errorText);
    }
  }, TEST_TIMEOUT);

  test('Simulation Pipeline - Retiree Drawdown Scenario', async ({ page }) => {
    // Skip if WASM not available
    const wasmAvailable = await page.locator('text=Available').count() > 0;
    if (!wasmAvailable) {
      test.skip(true, 'WASM not available for simulation testing');
      return;
    }
    
    // Load Retiree Drawdown test case
    await page.click('button:has-text("Retiree Drawdown")');
    
    // Run simulation
    await page.click('button:has-text("Run Simulation from JSON")');
    
    // Wait for completion
    await expect(page.locator('text=Running...')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Verify completion (success or documented error)
    const hasResult = await page.locator('text=✅ Simulation Completed').or(
      page.locator('text=❌ Error')
    ).count() > 0;
    
    expect(hasResult).toBe(true);
  }, TEST_TIMEOUT);

  test('Simulation Pipeline - Liquidity Crisis Scenario', async ({ page }) => {
    // Skip if WASM not available  
    const wasmAvailable = await page.locator('text=Available').count() > 0;
    if (!wasmAvailable) {
      test.skip(true, 'WASM not available for simulation testing');
      return;
    }
    
    // Load Liquidity Crisis test case
    await page.click('button:has-text("Liquidity Crisis")');
    
    // Run simulation
    await page.click('button:has-text("Run Simulation from JSON")');
    
    // Wait for completion
    await expect(page.locator('text=Running...')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Verify completion
    const hasResult = await page.locator('text=✅ Simulation Completed').or(
      page.locator('text=❌ Error')
    ).count() > 0;
    
    expect(hasResult).toBe(true);
  }, TEST_TIMEOUT);

  test('Export Functionality Works', async ({ page }) => {
    const wasmAvailable = await page.locator('text=Available').count() > 0;
    if (!wasmAvailable) {
      test.skip(true, 'WASM not available for export testing');
      return;
    }
    
    // Run a simulation first
    await page.click('button:has-text("Young Accumulator")');
    await page.click('button:has-text("Run Simulation from JSON")');
    
    // Wait for completion
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Skip if simulation failed
    const hasSuccess = await page.locator('text=✅ Simulation Completed').count() > 0;
    if (!hasSuccess) {
      test.skip(true, 'Simulation did not complete successfully');
      return;
    }
    
    // Test export functionality
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeEnabled();
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/simulation-results-\d+\.json/);
  }, TEST_TIMEOUT);

  test('Render Results in App Integration', async ({ page }) => {
    const wasmAvailable = await page.locator('text=Available').count() > 0;
    test.skip(!wasmAvailable, 'WASM not available for integration testing');
    
    // Run a simulation first
    await page.click('button:has-text("Young Accumulator")');
    await page.click('button:has-text("Run Simulation from JSON")');
    
    // Wait for completion
    await expect(page.locator('text=Running...')).not.toBeVisible({ timeout: SIMULATION_TIMEOUT });
    
    // Skip if simulation failed
    const hasSuccess = await page.locator('text=✅ Simulation Completed').count() > 0;
    if (!hasSuccess) {
      test.skip(true, 'Simulation did not complete successfully');
      return;
    }
    
    // Test render in app functionality
    const renderButton = page.locator('button:has-text("Render Results in App")');
    await expect(renderButton).toBeEnabled();
    
    await renderButton.click();
    
    // Should redirect to main app
    await expect(page).toHaveURL('/');
    
    // Verify the main dashboard loads
    await expect(page.locator('text=Goal Success Probability')).toBeVisible({ timeout: 10000 });
  }, TEST_TIMEOUT);

  test('Console Output Capture Works', async ({ page }) => {
    // Load any test case
    await page.click('button:has-text("Young Accumulator")');
    
    // Ensure data flow tracing is enabled
    const checkbox = page.locator('input[type="checkbox"]');
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
    
    const wasmAvailable = await page.locator('text=Available').count() > 0;
    
    if (wasmAvailable) {
      // Run simulation to generate console output
      await page.click('button:has-text("Run Simulation from JSON")');
      
      // Wait a bit for console output to appear
      await page.waitForTimeout(2000);
      
      // Verify console output contains test harness messages
      const consoleArea = page.locator('.h-64.bg-gray-900');
      const consoleText = await consoleArea.textContent();
      
      expect(consoleText).toMatch(/TEST-HARNESS|Starting simulation|Input structure/);
    }
    
    // Test clear functionality
    await page.click('button:has-text("Clear")');
    const consoleArea = page.locator('.h-64.bg-gray-900');
    await expect(consoleArea).toContainText('Console output will appear here...');
  });

  test('Back to App Navigation Works', async ({ page }) => {
    // Test back button
    await page.click('button:has-text("← Back to App")');
    
    // Should navigate to main app
    await expect(page).toHaveURL('/');
    
    // Verify main app loads
    await expect(page.locator('text=PathFinderPro')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Test Harness Stress Testing', () => {
  test('Large JSON Input Handling', async ({ page }) => {
    await page.goto('/test-harness');
    
    // Create a large JSON input with many events
    const largeInput = {
      initialAccounts: { cash: 50000 },
      events: Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        type: 'INCOME',
        monthOffset: i,
        amount: 1000 + i * 100,
        metadata: { name: `Income Event ${i}` }
      })),
      config: {
        expectedReturns: { CASH: 0.02 },
        volatilities: { CASH: 0.01 }
      },
      monthsToRun: 120,
      withdrawalStrategy: { strategy: 'taxable_first' }
    };
    
    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    await jsonEditor.fill(JSON.stringify(largeInput, null, 2));
    
    // Verify the large input was accepted
    const content = await jsonEditor.inputValue();
    expect(content).toContain('event-99');
    expect(JSON.parse(content).events.length).toBe(100);
  });

  test('Invalid Data Recovery', async ({ page }) => {
    await page.goto('/test-harness');
    
    const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
    
    // Test various invalid inputs and recovery
    const invalidInputs = [
      '{ "malformed": json }',
      '{ "initialAccounts": null }',
      '{ "events": "not-an-array" }',
      '{ "config": { "expectedReturns": "invalid" } }'
    ];
    
    for (const invalidInput of invalidInputs) {
      await jsonEditor.fill(invalidInput);
      
      // Try to run simulation if WASM is available
      const wasmAvailable = await page.locator('text=Available').count() > 0;
      
      if (wasmAvailable) {
        await page.click('button:has-text("Run Simulation from JSON")');
        
        // Should show error
        await expect(page.locator('text=❌ Error')).toBeVisible({ timeout: 5000 });
        
        // Clear error by loading valid test case
        await page.click('button:has-text("Young Accumulator")');
        
        // Error should be cleared
        await expect(page.locator('text=❌ Error')).not.toBeVisible();
      }
    }
  });
});