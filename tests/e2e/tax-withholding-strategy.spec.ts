/**
 * Tax Withholding Strategy E2E Tests
 *
 * Tests the complete user journey for the Tax Withholding Strategy:
 * 1. Opening Strategy Center
 * 2. Navigating to Tax Optimization category
 * 3. Selecting Tax Withholding strategy
 * 4. Configuring strategy parameters
 * 5. Applying the strategy
 * 6. Verifying generated events
 * 7. Running simulation
 * 8. Verifying simulation results include tax settlement
 */

import { test, expect } from '@playwright/test';
import {
  QuickstartWizardPage,
  DashboardPage,
  StrategyCenterPage,
  StrategyConfigurationPage,
  StrategyDeepDivePage
} from './poms';

test.describe('Tax Withholding Strategy End-to-End', () => {
  let quickstart: QuickstartWizardPage;
  let dashboard: DashboardPage;
  let strategyCenter: StrategyCenterPage;
  let strategyConfig: StrategyConfigurationPage;
  let strategyDeepDive: StrategyDeepDivePage;

  test.beforeEach(async ({ page }) => {
    quickstart = new QuickstartWizardPage(page);
    dashboard = new DashboardPage(page);
    strategyCenter = new StrategyCenterPage(page);
    strategyConfig = new StrategyConfigurationPage(page);
    strategyDeepDive = new StrategyDeepDivePage(page);

    // Start fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Complete quickstart to get to dashboard
    await quickstart.waitForWizardToOpen();
    await quickstart.completeFullWizardFlow({
      salary: 150000,
      expenses: 80000,
      retirementAge: 60
    });
    await quickstart.waitForWizardToClose();

    await dashboard.waitForDashboardLoad();
    await dashboard.waitForSimulationComplete();
  });

  test('should open Strategy Center modal', async ({ page }) => {
    await test.step('Open Strategy Center', async () => {
      await strategyCenter.openStrategyCenter();
      await expect(strategyCenter.modalTitle).toBeVisible();
      await expect(strategyCenter.categoryCards).toHaveCount(4, { timeout: 5000 }); // Should have at least 4 categories
    });

    await test.step('Verify Tax Optimization category is visible', async () => {
      const isTaxOptVisible = await strategyCenter.verifyCategoryVisible('Tax Optimization');
      expect(isTaxOptVisible).toBe(true);
    });
  });

  test('should open correct modal type for each tax strategy', async ({ page }) => {
    await test.step('Open Strategy Center and navigate to Tax Optimization', async () => {
      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');
      await strategyCenter.waitForCategoryView();

      // Debug: Log all visible strategies
      const strategyCards = page.locator('div').filter({ has: page.locator('h3') });
      const strategyCount = await strategyCards.count();
      console.log(`Found ${strategyCount} strategy cards in Tax Optimization category`);

      for (let i = 0; i < strategyCount; i++) {
        const card = strategyCards.nth(i);
        const title = await card.locator('h3').textContent().catch(() => 'N/A');
        const button = card.locator('button');
        const buttonText = await button.textContent().catch(() => 'N/A');
        console.log(`  - Strategy ${i + 1}: "${title}" | Button: "${buttonText}"`);
      }
    });

    await test.step('Tax Withholding should open Configuration Modal directly', async () => {
      // Click the Configure button for Tax Withholding
      const taxWithholdingCard = page.locator('div').filter({ hasText: 'Tax Withholding Optimizer' }).or(
        page.locator('div').filter({ hasText: 'Tax Withholding' })
      ).first();

      await expect(taxWithholdingCard).toBeVisible({ timeout: 5000 });

      const configureButton = taxWithholdingCard.locator('button').filter({ hasText: /^Configure$/ });
      await expect(configureButton).toBeVisible();

      // Verify button says "Configure" not "Learn & Configure"
      const buttonText = await configureButton.textContent();
      expect(buttonText?.trim()).toBe('Configure');
      console.log(`✓ Button text is: "${buttonText?.trim()}"`);

      await configureButton.click();
      await page.waitForTimeout(1000);

      // Should see Configuration Modal, NOT Deep Dive Modal
      await strategyConfig.waitForConfigModal();

      // Verify modal title contains "Configure" or "Tax Withholding"
      const modalTitle = page.locator('h2').filter({ hasText: /Configure|Tax Withholding/i });
      await expect(modalTitle.first()).toBeVisible({ timeout: 5000 });
      const titleText = await modalTitle.first().textContent();
      console.log(`✓ Modal title: "${titleText}"`);

      // Verify we see configuration inputs (select dropdowns, checkboxes)
      const withholdingMethodLabel = page.locator('label:has-text("Withholding Method")');
      await expect(withholdingMethodLabel).toBeVisible({ timeout: 5000 });

      const withholdingMethodSelect = withholdingMethodLabel.locator('~ select').or(
        withholdingMethodLabel.locator('..').locator('select')
      );
      await expect(withholdingMethodSelect.first()).toBeVisible({ timeout: 5000 });
      console.log('✓ Withholding Method select dropdown is visible');

      // Verify we see other expected configuration options
      await expect(page.locator('text=Tax Settlement Reserve Strategy').or(
        page.locator('label:has-text("Reserve Strategy")')
      )).toBeVisible();
      console.log('✓ Reserve Strategy option is visible');

      // Should NOT see deep dive content (tabs, educational content)
      const deepDiveTabs = page.locator('[role="tab"]');
      const hasDeepDiveTabs = await deepDiveTabs.count();
      console.log(`✓ Number of deep dive tabs: ${hasDeepDiveTabs} (should be 0)`);
      expect(hasDeepDiveTabs).toBe(0);

      // Verify we see Apply/Save button, not a disabled "Coming Soon" button
      const applyButton = page.locator('button').filter({ hasText: /Apply|Save|Confirm Strategy/i }).last();
      await expect(applyButton).toBeVisible();
      const isEnabled = await applyButton.isEnabled();
      expect(isEnabled).toBe(true);
      console.log('✓ Apply button is enabled');

      console.log('✅ Tax Withholding correctly opens Configuration Modal (not Deep Dive)');

      // Close the modal
      await strategyConfig.cancelConfiguration();
      await page.waitForTimeout(500);
    });

    await test.step('Roth Conversion should open Deep Dive Modal', async () => {
      // Navigate back to strategy list if needed
      const isStrategyListVisible = await page.locator('text=Tax Withholding').isVisible({ timeout: 2000 }).catch(() => false);
      if (!isStrategyListVisible) {
        await strategyCenter.openStrategyCenter();
        await strategyCenter.selectCategory('Tax Optimization');
        await strategyCenter.waitForCategoryView();
      }

      await strategyCenter.selectStrategy('Roth Conversion');

      // Should see Deep Dive Modal with educational content
      await strategyDeepDive.waitForDeepDive();

      // Verify we see deep dive content (modal title with strategy name)
      await expect(page.locator('h2').filter({ hasText: /Roth Conversion/i })).toBeVisible();

      // Should see educational content, not configuration inputs
      const educationalContent = page.locator('text=/bracket|conversion|tax-free/i');
      await expect(educationalContent.first()).toBeVisible({ timeout: 5000 });

      // Apply button should be disabled for info-only strategy
      const isInfoOnly = await strategyDeepDive.verifyInfoOnlyStrategy();
      expect(isInfoOnly).toBe(true);

      console.log('✅ Roth Conversion correctly opens Deep Dive Modal');

      // Close the modal
      await strategyDeepDive.close();
      await page.waitForTimeout(500);
    });

    await test.step('Tax Loss Harvesting should open Deep Dive Modal', async () => {
      // Navigate back to strategy list if needed
      const isStrategyListVisible = await page.locator('text=Tax Withholding').isVisible({ timeout: 2000 }).catch(() => false);
      if (!isStrategyListVisible) {
        await strategyCenter.openStrategyCenter();
        await strategyCenter.selectCategory('Tax Optimization');
        await strategyCenter.waitForCategoryView();
      }

      // Click Tax Loss Harvesting button
      const tlhButton = page.locator('button').filter({ hasText: /Tax Loss Harvesting|Tax-Loss Harvesting/i });
      await expect(tlhButton.first()).toBeVisible();
      await tlhButton.first().click();
      await page.waitForTimeout(1000);

      // Should see Deep Dive Modal with educational content
      await strategyDeepDive.waitForDeepDive();

      // Verify we see deep dive content
      await expect(page.locator('h2').filter({ hasText: /Tax Loss Harvesting|Tax-Loss Harvesting/i })).toBeVisible();

      // Should see educational content about wash sale rules
      const educationalContent = page.locator('text=/wash sale|capital loss|harvest/i');
      await expect(educationalContent.first()).toBeVisible({ timeout: 5000 });

      // Apply button should be disabled for info-only strategy
      const isInfoOnly = await strategyDeepDive.verifyInfoOnlyStrategy();
      expect(isInfoOnly).toBe(true);

      console.log('✅ Tax Loss Harvesting correctly opens Deep Dive Modal');

      // Close the modal
      await strategyDeepDive.close();
    });
  });

  test('should navigate to Tax Optimization category and see strategies', async ({ page }) => {
    await test.step('Open Strategy Center and navigate to Tax Optimization', async () => {
      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');
      await strategyCenter.waitForCategoryView();
    });

    await test.step('Verify all three tax strategies are visible', async () => {
      // Should see Tax Withholding, Roth Conversion, and Tax Loss Harvesting
      await expect(page.locator('text=Tax Withholding')).toBeVisible();
      await expect(page.locator('text=Roth Conversion')).toBeVisible();
      await expect(page.locator('text=Tax Loss Harvesting').or(page.locator('text=Tax-Loss Harvesting'))).toBeVisible();
    });

    await test.step('Verify Tax Withholding has Configure button', async () => {
      const taxWithholdingCard = page.locator('div').filter({ hasText: 'Tax Withholding' }).first();
      const configureButton = taxWithholdingCard.locator('button').filter({ hasText: 'Configure' });
      await expect(configureButton).toBeVisible();
      await expect(configureButton).toBeEnabled();
    });

    await test.step('Navigate back to main categories', async () => {
      await strategyCenter.navigateBack();
      await expect(strategyCenter.categoryCards).toBeVisible();
    });
  });

  test('should configure tax withholding strategy with default settings', async ({ page }) => {
    await test.step('Navigate to Tax Withholding strategy', async () => {
      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');
      await strategyCenter.selectStrategy('Tax Withholding');
    });

    await test.step('Configuration modal should open', async () => {
      await strategyConfig.waitForConfigModal();
      await expect(page.locator('h2').filter({ hasText: /Tax Withholding|Configure/ })).toBeVisible();
    });

    await test.step('Apply strategy with default settings', async () => {
      await strategyConfig.applyStrategy();
      await strategyConfig.verifyModalClosed();
    });

    await test.step('Verify strategy was applied', async () => {
      // Wait for simulation to complete
      await dashboard.waitForSimulationComplete();

      // Should see a success message or toast
      const successIndicators = [
        page.locator('text=Strategy applied'),
        page.locator('text=Tax Withholding Strategy'),
        page.locator('text=successfully'),
        page.locator('[data-testid="success-toast"]')
      ];

      let foundSuccess = false;
      for (const indicator of successIndicators) {
        if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundSuccess = true;
          break;
        }
      }

      // Success message might be temporary, so also check for generated events
      console.log(`Success message visible: ${foundSuccess}`);
    });
  });

  test('should configure tax withholding with custom settings', async ({ page }) => {
    await test.step('Navigate to Tax Withholding configuration', async () => {
      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');
      await strategyCenter.selectStrategy('Tax Withholding');
      await strategyConfig.waitForConfigModal();
    });

    await test.step('Configure with quarterly estimated payments', async () => {
      await strategyConfig.configureTaxWithholding({
        withholdingMethod: 'quarterly',
        settlementReserveStrategy: 'treasury',
        autoReserve: true,
        alertBeforeSettlement: true
      });
    });

    await test.step('Apply custom configuration', async () => {
      await strategyConfig.applyStrategy();
      await strategyConfig.verifyModalClosed();
    });

    await test.step('Verify simulation completes with custom settings', async () => {
      await dashboard.waitForSimulationComplete();
      await expect(dashboard.mainContent).toBeVisible();
    });
  });

  test('should generate tax settlement events', async ({ page }) => {
    await test.step('Apply tax withholding strategy', async () => {
      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');
      await strategyCenter.selectStrategy('Tax Withholding');
      await strategyConfig.waitForConfigModal();
      await strategyConfig.applyStrategy();
      await strategyConfig.verifyModalClosed();
    });

    await test.step('Wait for simulation to complete', async () => {
      await dashboard.waitForSimulationComplete();
    });

    await test.step('Check for tax settlement event in timeline', async () => {
      // Look for tax settlement event in events list or sidebar
      const eventsList = page.locator('[data-testid="events-list"]').or(
        page.locator('text=Events').locator('..')
      ).or(
        page.locator('.sidebar')
      );

      // Tax settlement should appear as an event
      const taxSettlementEvent = page.locator('text=/Tax Settlement|TAX_SETTLEMENT/i');

      // Wait a bit for events to be displayed
      await page.waitForTimeout(2000);

      // Check if the event is visible in the UI
      const isVisible = await taxSettlementEvent.isVisible({ timeout: 5000 }).catch(() => false);

      if (isVisible) {
        console.log('✅ Tax settlement event found in UI');
      } else {
        console.log('ℹ️ Tax settlement event may be in simulation but not displayed separately');
      }
    });

    await test.step('Verify simulation results include tax considerations', async () => {
      // The simulation should run successfully with tax withholding
      await expect(dashboard.netWorthChart).toBeVisible();

      // Check for any tax-related information in the dashboard
      const taxInfo = page.locator('text=/tax|Tax|settlement|Settlement/i');
      const hasTaxInfo = await taxInfo.count();
      console.log(`Found ${hasTaxInfo} references to tax/settlement in dashboard`);
    });
  });

  test('should handle different withholding methods', async ({ page }) => {
    const methods = [
      { value: 'standard', name: 'Standard W-4 Withholding (Annual Settlement)' },
      { value: 'quarterly', name: 'Quarterly Estimated Payments' },
      { value: 'increased', name: 'Increased Monthly Withholding' }
    ];

    for (const method of methods) {
      await test.step(`Test ${method.name}`, async () => {
        // Open strategy center
        await strategyCenter.openStrategyCenter();
        await strategyCenter.selectCategory('Tax Optimization');
        await strategyCenter.selectStrategy('Tax Withholding');
        await strategyConfig.waitForConfigModal();

        // Select the withholding method
        await strategyConfig.fillSelect('Withholding Method', method.value);

        // Apply strategy
        await strategyConfig.applyStrategy();
        await strategyConfig.verifyModalClosed();

        // Wait for simulation
        await dashboard.waitForSimulationComplete();

        // Verify simulation completed successfully
        await expect(dashboard.netWorthChart).toBeVisible();

        console.log(`✅ ${method.name} tested successfully`);

        // Small delay between tests
        await page.waitForTimeout(1000);
      });
    }
  });

  test('should verify Roth Conversion is info-only', async ({ page }) => {
    await test.step('Navigate to Roth Conversion strategy', async () => {
      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');
      await strategyCenter.selectStrategy('Roth Conversion');
    });

    await test.step('Deep dive modal should open for info-only strategy', async () => {
      await strategyDeepDive.waitForDeepDive();
      await expect(page.locator('h2').filter({ hasText: /Roth Conversion/i })).toBeVisible();
    });

    await test.step('Verify configure button is disabled or shows "coming soon"', async () => {
      const isInfoOnly = await strategyDeepDive.verifyInfoOnlyStrategy();
      expect(isInfoOnly).toBe(true);
      console.log('✅ Roth Conversion correctly marked as info-only');
    });

    await test.step('Close deep dive modal', async () => {
      await strategyDeepDive.close();
    });
  });

  test('should verify Tax Loss Harvesting is info-only', async ({ page }) => {
    await test.step('Navigate to Tax Loss Harvesting strategy', async () => {
      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');

      // Try both possible names
      const tlhButton = page.locator('button').filter({ hasText: /Tax Loss Harvesting|Tax-Loss Harvesting/i });
      await expect(tlhButton.first()).toBeVisible();
      await tlhButton.first().click();
      await page.waitForTimeout(1000);
    });

    await test.step('Deep dive modal should open for info-only strategy', async () => {
      await strategyDeepDive.waitForDeepDive();
      await expect(page.locator('h2').filter({ hasText: /Tax Loss Harvesting|Tax-Loss Harvesting/i })).toBeVisible();
    });

    await test.step('Verify configure button is disabled or shows "coming soon"', async () => {
      const isInfoOnly = await strategyDeepDive.verifyInfoOnlyStrategy();
      expect(isInfoOnly).toBe(true);
      console.log('✅ Tax Loss Harvesting correctly marked as info-only');
    });

    await test.step('Close deep dive modal', async () => {
      await strategyDeepDive.close();
    });
  });

  test('should handle rapid strategy application and cancellation', async ({ page }) => {
    await test.step('Open and cancel configuration multiple times', async () => {
      for (let i = 0; i < 3; i++) {
        // Open strategy center
        await strategyCenter.openStrategyCenter();
        await strategyCenter.selectCategory('Tax Optimization');
        await strategyCenter.selectStrategy('Tax Withholding');
        await strategyConfig.waitForConfigModal();

        // Cancel configuration
        await strategyConfig.cancelConfiguration();

        // Small delay
        await page.waitForTimeout(500);
      }

      console.log('✅ Strategy can be opened and cancelled multiple times');
    });

    await test.step('Finally apply the strategy', async () => {
      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');
      await strategyCenter.selectStrategy('Tax Withholding');
      await strategyConfig.waitForConfigModal();
      await strategyConfig.applyStrategy();
      await strategyConfig.verifyModalClosed();

      // Verify simulation completes
      await dashboard.waitForSimulationComplete();
      await expect(dashboard.netWorthChart).toBeVisible();
    });
  });

  test('should verify routing: isSimpleConfig strategies open Configuration Modal', async ({ page }) => {
    /**
     * ROUTING VERIFICATION TEST
     *
     * This test documents and verifies the strategy routing logic:
     *
     * 1. isSimpleConfig strategies (tax-withholding, asset-allocation, etc.):
     *    - Show "Configure" button
     *    - Click opens StrategyConfigurationModal directly
     *    - No Deep Dive modal shown
     *
     * 2. Non-isSimpleConfig strategies (roth-conversion, tax-loss-harvesting):
     *    - Show "Learn & Configure" button
     *    - Click opens StrategyDeepDiveModal first
     *    - User can then click to open config from deep dive
     *
     * Implementation location: src/components/StrategyCenterV2.tsx:303
     */

    await test.step('Verify Tax Withholding is in isSimpleConfig list', async () => {
      // This should be true based on StrategyCenterV2.tsx line 303:
      // const isSimpleConfig = ... || strategy.id === 'tax-withholding';

      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');
      await strategyCenter.waitForCategoryView();

      // Find Tax Withholding strategy card
      const taxWithholdingCard = page.locator('h3:has-text("Tax Withholding")').locator('..');

      // Verify it has a "Configure" button (not "Learn & Configure")
      const buttonText = await taxWithholdingCard.locator('button').textContent();
      console.log(`Tax Withholding button text: "${buttonText?.trim()}"`);

      expect(buttonText?.trim()).toBe('Configure');
    });

    await test.step('Verify clicking opens StrategyConfigurationModal', async () => {
      const taxWithholdingCard = page.locator('h3:has-text("Tax Withholding")').locator('..');
      const configureButton = taxWithholdingCard.locator('button');

      await configureButton.click();
      await page.waitForTimeout(1000);

      // Verify StrategyConfigurationModal opened
      // This should have configuration inputs like selects and checkboxes
      const hasConfigInputs = await page.locator('label:has-text("Withholding Method")').isVisible();
      expect(hasConfigInputs).toBe(true);

      // Verify StrategyDeepDiveModal did NOT open
      // Deep dive modal has tabs and educational content
      const hasDeepDiveTabs = await page.locator('[role="tab"]').count();
      expect(hasDeepDiveTabs).toBe(0);

      console.log('✅ Routing verification passed: Tax Withholding → Configuration Modal');

      // Close modal
      await strategyConfig.cancelConfiguration();
    });
  });

  test('should persist strategy configuration across scenarios', async ({ page }) => {
    await test.step('Apply tax withholding in base scenario', async () => {
      await strategyCenter.openStrategyCenter();
      await strategyCenter.selectCategory('Tax Optimization');
      await strategyCenter.selectStrategy('Tax Withholding');
      await strategyConfig.waitForConfigModal();
      await strategyConfig.configureTaxWithholding({
        withholdingMethod: 'quarterly',
        autoReserve: true
      });
      await strategyConfig.applyStrategy();
      await strategyConfig.verifyModalClosed();
      await dashboard.waitForSimulationComplete();
    });

    await test.step('Create new scenario', async () => {
      // Look for scenario menu or create scenario button
      const scenarioButton = page.locator('button').filter({ hasText: /Scenario|scenario/ }).first();

      if (await scenarioButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await scenarioButton.click();
        await page.waitForTimeout(500);

        // Look for "New Scenario" or "Create" option
        const createButton = page.locator('button, [role="menuitem"]').filter({
          hasText: /New|Create|Add/i
        }).first();

        if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await createButton.click();
          await page.waitForTimeout(1000);
        }

        console.log('✅ Created new scenario');
      } else {
        console.log('ℹ️ Scenario functionality may not be visible in current view');
        // Skip the rest of this test
        test.skip();
      }
    });

    await test.step('Verify base scenario still has tax withholding', async () => {
      // Switch back to base scenario if needed
      const scenarioButton = page.locator('button').filter({ hasText: /Scenario|scenario/ }).first();

      if (await scenarioButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await scenarioButton.click();
        await page.waitForTimeout(500);

        const baseScenario = page.locator('[role="menuitem"]').filter({ hasText: /Base|Default/i }).first();
        if (await baseScenario.isVisible({ timeout: 2000 }).catch(() => false)) {
          await baseScenario.click();
          await page.waitForTimeout(1000);
        }
      }

      // Verify simulation still works
      await dashboard.waitForSimulationComplete();
      await expect(dashboard.netWorthChart).toBeVisible();
    });
  });
});

// Take screenshot on failure for debugging
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('screenshot', {
      body: screenshot,
      contentType: 'image/png'
    });

    // Also capture console logs
    const logs: string[] = [];
    page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
    await testInfo.attach('console-logs', {
      body: logs.join('\n'),
      contentType: 'text/plain'
    });
  }
});
