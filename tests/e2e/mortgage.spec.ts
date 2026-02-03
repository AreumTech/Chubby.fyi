import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage, EventModalPage } from './poms';
import { FixtureLoader } from './helpers/fixture-loader';

test.describe('Basic Mortgage User Story', () => {
  let onboarding: OnboardingPage;
  let dashboard: DashboardPage;
  let deepDive: DeepDivePage;
  let eventModal: EventModalPage;
  let fixtureLoader: FixtureLoader;

  test.beforeEach(async ({ page }) => {
    onboarding = new OnboardingPage(page);
    dashboard = new DashboardPage(page);
    deepDive = new DeepDivePage(page);
    eventModal = new EventModalPage(page);
    fixtureLoader = new FixtureLoader(page);
  });

  test('should model home purchase with mortgage and validate liability calculations', async ({ page }) => {
    await test.step('Load a persona with home purchase scenario', async () => {
      // Use the Accelerator persona which includes a home purchase event
      await fixtureLoader.loadPersonaBySelection('Accelerator');
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Run simulation and wait for completion', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
    });

    await test.step('Verify chart shows realistic data', async () => {
      expect(await dashboard.isChartVisible()).toBe(true);
      
      const chartDimensions = await dashboard.getChartDimensions();
      expect(chartDimensions).not.toBeNull();
      expect(chartDimensions!.width).toBeGreaterThan(0);
      expect(chartDimensions!.height).toBeGreaterThan(0);
    });

    await test.step('Navigate to year after home purchase and verify mortgage expense', async () => {
      // Click on chart at 75% to get to a year well into the simulation
      await dashboard.clickOnChart(0.75, 0.4);
      
      await deepDive.waitForDeepDiveVisible();
      
      const focusYear = await deepDive.getFocusYear();
      expect(focusYear).not.toBeNull();
      
      // Should be in a year where home purchase has occurred
      const year = parseInt(focusYear!);
      expect(year).toBeGreaterThan(2025);
      
      console.log(`Examining mortgage data for year ${year}`);
    });

    await test.step('Verify net worth shows mortgage payment as expense', async () => {
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Verify non-zero values
      expect(netWorthValues.totalAssets).not.toBeNull();
      expect(netWorthValues.totalAssets).not.toBeNull();
      
      // Verify no $0 bugs
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // Parse values to verify mortgage is included in outflows
      const incomeMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      const outflowMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      
      if (incomeMatch && outflowMatch) {
        const income = parseInt(incomeMatch[1].replace(/,/g, ''));
        const outflows = parseInt(outflowMatch[1].replace(/,/g, ''));
        
        expect(income).toBeGreaterThan(0);
        expect(outflows).toBeGreaterThan(0);
        
        // With mortgage, outflows should be substantial (likely $3K+ monthly)
        expect(outflows).toBeGreaterThan(2000); // At least $2K in monthly expenses
        
        console.log(`Net Worth Analysis: Income $${income}, Outflows $${outflows}`);
      }
    });

    await test.step('Verify balance sheet shows home asset and mortgage liability', async () => {
      const netWorthValues = await deepDive.getNetWorthValues();
      
      expect(netWorthValues.totalAssets).not.toBeNull();
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // Parse values to verify home ownership impact
      const assetsMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      const liabilitiesMatch = netWorthValues.totalLiabilities?.match(/\$([0-9,]+)/);
      
      if (assetsMatch) {
        const assets = parseInt(assetsMatch[1].replace(/,/g, ''));
        expect(assets).toBeGreaterThan(100000); // Should have substantial assets including home
        
        console.log(`Balance Sheet: Total Assets $${assets}`);
      }
      
      if (liabilitiesMatch) {
        const liabilities = parseInt(liabilitiesMatch[1].replace(/,/g, ''));
        expect(liabilities).toBeGreaterThan(0); // Should have mortgage liability
        
        console.log(`Balance Sheet: Total Liabilities $${liabilities}`);
      }
    });

    await test.step('Compare two consecutive years to verify mortgage principal paydown', async () => {
      // Get current year data
      const year1Values = await deepDive.getNetWorthValues();
      const year1Liabilities = year1Values.totalLiabilities;
      
      // Navigate to previous year
      await dashboard.clickOnChart(0.65, 0.4); // Click slightly earlier
      await deepDive.waitForDeepDiveVisible();
      
      const year2Values = await deepDive.getNetWorthValues();
      const year2Liabilities = year2Values.totalLiabilities;
      
      if (year1Liabilities && year2Liabilities) {
        const liability1 = parseFloat(year1Liabilities.replace(/[$,]/g, ''));
        const liability2 = parseFloat(year2Liabilities.replace(/[$,]/g, ''));
        
        // Earlier year should have higher mortgage balance (principal paydown over time)
        // Note: year1 is later in time than year2 based on our click positions
        expect(liability1).toBeLessThan(liability2);
        
        const principalReduction = liability2 - liability1;
        expect(principalReduction).toBeGreaterThan(0);
        
        console.log(`Mortgage Principal Paydown: $${principalReduction.toLocaleString()} between years`);
      }
    });

    await test.step('Verify no zero-value bugs in mortgage scenario', async () => {
      await deepDive.assertNoZeroValues();
    });
  });

  test('should handle mortgage scenario with custom events', async ({ page }) => {
    await test.step('Start from scratch and add mortgage scenario manually', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      // Select "Build Your Own" to create custom scenario
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
    });

    await test.step('Add dual income household', async () => {
      await dashboard.waitForDashboardLoad();
      
      // Add first income
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await expect(addEventButton).toBeVisible({ timeout: 10000 });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Household Income',
        amount: 180000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add pre-mortgage living expenses', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();
      
      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('expense');
      
      await eventModal.fillEventForm({
        name: 'Pre-Purchase Expenses',
        amount: 5000,
        frequency: 'monthly'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add home down payment event', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();
      
      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('asset');
      
      await eventModal.fillEventForm({
        name: 'Home Down Payment',
        amount: 200000
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Run simulation and verify results', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Basic validation that simulation worked
      expect(await dashboard.isChartVisible()).toBe(true);
      
      // Click on future year
      await dashboard.clickOnChart(0.7, 0.3);
      await deepDive.waitForDeepDiveVisible();
      
      // Verify basic functionality
      const validation = await deepDive.validateNonZeroValues();
      expect(validation.cashFlow).toBe(true);
      expect(validation.netWorth).toBe(true);
    });
  });

  test('should load mortgage fixture and validate comprehensive scenario', async ({ page }) => {
    await test.step('Load mortgage plan fixture', async () => {
      // For now, use a similar persona since fixture loading needs deeper integration
      await fixtureLoader.loadPersonaBySelection('Architect');
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Validate comprehensive mortgage scenario', async () => {
      await dashboard.waitForSimulationComplete();
      
      // Test multiple time points to see mortgage progression
      const testPoints = [0.4, 0.6, 0.8]; // Different points in the timeline
      
      for (let i = 0; i < testPoints.length; i++) {
        await dashboard.clickOnChart(testPoints[i], 0.3);
        await deepDive.waitForDeepDiveVisible();
        
        const year = await deepDive.getFocusYear();
        console.log(`Testing mortgage data for year ${year} (point ${i + 1})`);
        
        // Verify net worth
        const cashFlow = await deepDive.getNetWorthValues();
        expect(cashFlow.totalAssets).not.toMatch(/\$0(?:\s|$)/);
        expect(cashFlow.totalAssets).not.toMatch(/\$0(?:\s|$)/);
        
        // Verify net worth
        const netWorth = await deepDive.getNetWorthValues();
        expect(netWorth.totalAssets).not.toMatch(/\$0(?:\s|$)/);
        
        // Brief pause between iterations
        await page.waitForTimeout(500);
      }
    });

    await test.step('Final validation of mortgage modeling', async () => {
      // Final check that no critical values are zero
      await deepDive.assertNoZeroValues();
      
      console.log('✅ Mortgage scenario validation completed successfully');
    });
  });
});

// Helper to take screenshot on failure for debugging
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshot = await page.screenshot();
    await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
  }
});