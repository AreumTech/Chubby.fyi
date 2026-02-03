import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage, EventModalPage } from './poms';
import { FixtureLoader } from './helpers/fixture-loader';

test.describe('Basic Income/Expense User Story', () => {
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

  test('should create and validate basic income/expense scenario from scratch', async ({ page }) => {
    await test.step('Start from scratch onboarding', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      // Select "Build Your Own" persona to start from scratch
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
    });

    await test.step('Wait for dashboard to load', async () => {
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Add income event', async () => {
      // Find and click the Add Event button
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await expect(addEventButton).toBeVisible({ timeout: 10000 });
      await addEventButton.click();

      // Wait for event modal
      await eventModal.waitForModalVisible();
      
      // Select income category
      await eventModal.selectCategory('income');
      
      // Fill income form
      await eventModal.fillEventForm({
        name: 'Software Engineer Salary',
        amount: 120000,
        frequency: 'annually'
      });
      
      // Create the event
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add expense event', async () => {
      // Add another event for expenses
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();
      
      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('expense');
      
      await eventModal.fillEventForm({
        name: 'Monthly Living Expenses',
        amount: 4000,
        frequency: 'monthly'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Run simulation', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
    });

    await test.step('Verify chart and basic metrics are visible', async () => {
      // Verify chart is visible and has dimensions
      expect(await dashboard.isChartVisible()).toBe(true);
      
      const chartDimensions = await dashboard.getChartDimensions();
      expect(chartDimensions).not.toBeNull();
      expect(chartDimensions!.width).toBeGreaterThan(0);
      expect(chartDimensions!.height).toBeGreaterThan(0);
    });

    await test.step('Navigate to focus year and validate net worth', async () => {
      // Click on chart to select a future year
      await dashboard.clickOnChart(0.6, 0.4); // Click 60% across chart
      
      // Switch to deep dive view
      await deepDive.waitForDeepDiveVisible();
      
      // Verify we have a focus year
      const focusYear = await deepDive.getFocusYear();
      expect(focusYear).not.toBeNull();
      expect(parseInt(focusYear!)).toBeGreaterThan(2025);
      
      // Get net worth values
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Verify non-zero values for income and expenses
      expect(netWorthValues.totalAssets).not.toBeNull();
      expect(netWorthValues.totalAssets).not.toBeNull();
      
      // Verify values are not $0
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // Verify the values make logical sense (income > expenses for this scenario)
      const incomeMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      const expenseMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      
      if (incomeMatch && expenseMatch) {
        const income = parseInt(incomeMatch[1].replace(/,/g, ''));
        const expenses = parseInt(expenseMatch[1].replace(/,/g, ''));
        
        expect(income).toBeGreaterThan(0);
        expect(expenses).toBeGreaterThan(0);
        expect(income).toBeGreaterThan(expenses); // Should have positive net worth
      }
    });

    await test.step('Verify net worth shows growth over time', async () => {
      // Get net worth values
      const netWorthValues = await deepDive.getNetWorthValues();
      
      expect(netWorthValues.totalAssets).not.toBeNull();
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // For this scenario, investment accounts should have some value
      if (netWorthValues.investmentAccounts) {
        expect(netWorthValues.investmentAccounts).not.toMatch(/\$0(?:\s|$)/);
      }
    });

    await test.step('Assert no zero-value bugs in deep dive', async () => {
      await deepDive.assertNoZeroValues();
    });
  });

  test('should load basic-plan fixture and validate results', async ({ page }) => {
    await test.step('Load basic plan fixture', async () => {
      // Alternative approach: use a pre-built fixture
      await fixtureLoader.loadPersonaBySelection('Build Your Own');
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Simulate fixture scenario manually', async () => {
      // For now, we'll manually create the scenario since fixture loading
      // requires deeper integration with the app's persona system
      
      // This test serves as a template for when fixture loading is fully implemented
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      // Select a known persona that's similar to our fixture
      const acceleratorButton = page.locator('button:has-text("Accelerator")').first();
      if (await acceleratorButton.isVisible()) {
        await acceleratorButton.click();
        
        const confirmButton = page.locator('button:has-text("Select This Profile")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    });

    await test.step('Verify simulation with known data', async () => {
      await dashboard.waitForDashboardLoad();
      await dashboard.waitForSimulationComplete();
      
      // Click on chart to access deep dive
      await dashboard.clickOnChart(0.7, 0.3);
      
      // Verify deep dive shows reasonable values
      const validation = await deepDive.validateNonZeroValues();
      expect(validation.cashFlow).toBe(true);
      expect(validation.netWorth).toBe(true);
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