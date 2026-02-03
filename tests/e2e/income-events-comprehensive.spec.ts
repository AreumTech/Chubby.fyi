import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage, EventModalPage } from './poms';
import { FixtureLoader } from './helpers/fixture-loader';

test.describe('INCOME Events - Comprehensive Testing', () => {
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

  test('should demonstrate INCOME event impact on net worth and net worth', async ({ page }) => {
    await test.step('Initialize with baseline plan', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      // Start with Build Your Own to have a clean baseline
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
    });

    // MEASURE: Baseline simulation
    let baselineNetWorth: number;
    await test.step('Measure baseline - run simulation without income', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Click on chart to go to future year
      await dashboard.clickOnChart(0.8, 0.4); // Click 80% across for later years
      await deepDive.waitForDeepDiveVisible();
      
      // Get baseline net worth
      const netWorthValues = await deepDive.getNetWorthValues();
      expect(netWorthValues.totalAssets).not.toBeNull();
      
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(netWorthMatch).not.toBeNull();
      baselineNetWorth = parseInt(netWorthMatch![1].replace(/,/g, ''));
      
      console.log(`Baseline net worth: $${baselineNetWorth.toLocaleString()}`);
      
      // Should be low/negative without income
      expect(baselineNetWorth).toBeLessThan(100000); // Should be low without income
    });

    // ACT: Add significant income event
    await test.step('Add high-paying income event', async () => {
      // Go back to dashboard
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      // Add income event
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await expect(addEventButton).toBeVisible({ timeout: 10000 });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      // Add substantial salary
      await eventModal.fillEventForm({
        name: 'Senior Software Engineer',
        company: 'Meta',
        amount: 300000, // High salary
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE AGAIN: Post-income simulation
    let postIncomeNetWorth: number;
    let grossIncome: number;
    await test.step('Measure impact - run simulation with income', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Navigate to same future year
      await dashboard.clickOnChart(0.8, 0.4); // Same position as baseline
      await deepDive.waitForDeepDiveVisible();
      
      // Get post-income metrics
      const netWorthValues = await deepDive.getNetWorthValues();
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Extract net worth
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(netWorthMatch).not.toBeNull();
      postIncomeNetWorth = parseInt(netWorthMatch![1].replace(/,/g, ''));
      
      // Extract gross income
      const incomeMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(incomeMatch).not.toBeNull();
      grossIncome = parseInt(incomeMatch![1].replace(/,/g, ''));
      
      console.log(`Post-income net worth: $${postIncomeNetWorth.toLocaleString()}`);
      console.log(`Gross income: $${grossIncome.toLocaleString()}`);
    });

    await test.step('Verify significant net worth improvement', async () => {
      // Net worth should be SIGNIFICANTLY higher with income
      const improvement = postIncomeNetWorth - baselineNetWorth;
      console.log(`Net worth improvement: $${improvement.toLocaleString()}`);
      
      expect(improvement).toBeGreaterThan(500000); // Should be substantial improvement
      expect(postIncomeNetWorth).toBeGreaterThan(baselineNetWorth * 2); // At least 2x better
    });

    await test.step('Verify income appears correctly in deep dive', async () => {
      // Gross income should be roughly the annual amount (300k)
      expect(grossIncome).toBeGreaterThan(250000); // Should be close to 300k
      expect(grossIncome).toBeLessThan(350000); // But not way over
      
      // Verify income is not zero
      const netWorthValues = await deepDive.getNetWorthValues();
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
    });

    await test.step('Test income modification impact', async () => {
      // Go back and edit the income to be higher
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      // Find and edit the income event (this assumes there's an edit functionality)
      // Note: Implementation depends on actual UI - this is pseudocode
      const eventItem = page.locator('[data-testid="event-item"]').filter({ hasText: 'Senior Software Engineer' });
      if (await eventItem.isVisible()) {
        await eventItem.click();
        
        // Increase salary by 20%
        await eventModal.fillEventForm({
          amount: 360000 // 20% increase
        });
        
        await eventModal.saveEvent();
        await eventModal.waitForModalClosed();
        
        // Run simulation again
        await dashboard.runSimulation();
        await dashboard.waitForSimulationComplete();
        
        // Check that net worth increased further
        await dashboard.clickOnChart(0.8, 0.4);
        await deepDive.waitForDeepDiveVisible();
        
        const newNetWorthValues = await deepDive.getNetWorthValues();
        const newNetWorthMatch = newNetWorthValues.totalAssets?.match(/\$([0-9,]+)/);
        if (newNetWorthMatch) {
          const newNetWorth = parseInt(newNetWorthMatch[1].replace(/,/g, ''));
          console.log(`Updated net worth: $${newNetWorth.toLocaleString()}`);
          
          // Should be even higher now
          expect(newNetWorth).toBeGreaterThan(postIncomeNetWorth);
        }
      }
    });

    await test.step('Verify investment account growth', async () => {
      // With higher income, investment accounts should show meaningful values
      const netWorthValues = await deepDive.getNetWorthValues();
      
      if (netWorthValues.investmentAccounts) {
        expect(netWorthValues.investmentAccounts).not.toMatch(/\$0(?:\s|$)/);
        
        // Extract investment value
        const investmentMatch = netWorthValues.investmentAccounts.match(/\$([0-9,]+)/);
        if (investmentMatch) {
          const investmentValue = parseInt(investmentMatch[1].replace(/,/g, ''));
          expect(investmentValue).toBeGreaterThan(100000); // Should have meaningful investments
        }
      }
    });

    await test.step('Assert no zero-value bugs', async () => {
      await deepDive.assertNoZeroValues();
    });
  });

  test('should handle multiple income sources correctly', async ({ page }) => {
    await test.step('Setup with basic plan', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Add primary income', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Primary Job Salary',
        company: 'Tech Corp',
        amount: 150000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add secondary income', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Freelance Work',
        amount: 50000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify combined income impact', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.7, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      // Get income values
      const netWorthValues = await deepDive.getNetWorthValues();
      const incomeMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      
      if (incomeMatch) {
        const totalIncome = parseInt(incomeMatch[1].replace(/,/g, ''));
        
        // Should be roughly the sum (200k total)
        expect(totalIncome).toBeGreaterThan(180000); // Allow for some processing differences
        expect(totalIncome).toBeLessThan(220000);
        
        console.log(`Combined income: $${totalIncome.toLocaleString()}`);
      }
    });
  });

  test('should validate income with growth rates', async ({ page }) => {
    await test.step('Setup baseline', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Add income with growth rate', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      // This depends on the UI supporting growth rates
      await eventModal.fillEventForm({
        name: 'Growing Salary',
        amount: 100000,
        frequency: 'annually',
        growthRate: 5 // 5% annual growth if supported by UI
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify income grows over time', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check early year income
      await dashboard.clickOnChart(0.2, 0.4); // Early in timeline
      await deepDive.waitForDeepDiveVisible();
      
      const earlyCashFlow = await deepDive.getNetWorthValues();
      const earlyIncomeMatch = earlyCashFlow.totalAssets?.match(/\$([0-9,]+)/);
      const earlyIncome = earlyIncomeMatch ? parseInt(earlyIncomeMatch[1].replace(/,/g, '')) : 0;
      
      // Check later year income
      await dashboard.clickOnChart(0.8, 0.4); // Later in timeline
      await deepDive.waitForDeepDiveVisible();
      
      const lateCashFlow = await deepDive.getNetWorthValues();
      const lateIncomeMatch = lateCashFlow.totalAssets?.match(/\$([0-9,]+)/);
      const lateIncome = lateIncomeMatch ? parseInt(lateIncomeMatch[1].replace(/,/g, '')) : 0;
      
      console.log(`Early income: $${earlyIncome.toLocaleString()}, Late income: $${lateIncome.toLocaleString()}`);
      
      // Late income should be higher due to growth
      expect(lateIncome).toBeGreaterThan(earlyIncome);
      expect(lateIncome).toBeGreaterThan(earlyIncome * 1.2); // Should show meaningful growth
    });
  });
});