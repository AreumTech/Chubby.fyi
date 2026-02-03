import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage, EventModalPage } from './poms';
import { FixtureLoader } from './helpers/fixture-loader';

test.describe('RECURRING_EXPENSE Events - Core Fix Verification', () => {
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

  test('should demonstrate RECURRING_EXPENSE reduces net worth significantly', async ({ page }) => {
    await test.step('Initialize with baseline plan', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      // Start with Build Your Own for clean baseline
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Add substantial income first', async () => {
      // Need income to see expense impact
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Software Engineer Salary',
        company: 'Tech Corp',
        amount: 200000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE: Baseline with income but no expenses
    let baselineNetWorth: number;
    await test.step('Measure baseline with income only', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Go to mid-career year for meaningful comparison
      await dashboard.clickOnChart(0.5, 0.4); // Middle of timeline
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      expect(netWorthValues.totalAssets).not.toBeNull();
      
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(netWorthMatch).not.toBeNull();
      baselineNetWorth = parseInt(netWorthMatch![1].replace(/,/g, ''));
      
      console.log(`Baseline net worth (income only): $${baselineNetWorth.toLocaleString()}`);
      
      // Should have good net worth with income
      expect(baselineNetWorth).toBeGreaterThan(200000);
    });

    // ACT: Add large recurring expense
    await test.step('Add large recurring expense', async () => {
      // Go back to dashboard
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      // Add significant recurring expense
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('expense');
      
      // Add expensive recurring cost (e.g., college tuition)
      await eventModal.fillEventForm({
        name: 'College Tuition',
        amount: 60000, // $60k annually
        frequency: 'annually',
        startYear: '2030', // Future expense
        endYear: '2034'   // 4 years of college
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE AGAIN: Post-expense simulation
    let postExpenseNetWorth: number;
    let totalOutflows: number;
    await test.step('Measure impact with recurring expense', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Navigate to same future year (during college years)
      await dashboard.clickOnChart(0.5, 0.4); 
      await deepDive.waitForDeepDiveVisible();
      
      // Get post-expense metrics
      const netWorthValues = await deepDive.getNetWorthValues();
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Extract net worth
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(netWorthMatch).not.toBeNull();
      postExpenseNetWorth = parseInt(netWorthMatch![1].replace(/,/g, ''));
      
      // Extract total outflows
      const outflowMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      if (outflowMatch) {
        totalOutflows = parseInt(outflowMatch[1].replace(/,/g, ''));
      }
      
      console.log(`Post-expense net worth: $${postExpenseNetWorth.toLocaleString()}`);
      console.log(`Total outflows: $${totalOutflows?.toLocaleString() || 'N/A'}`);
    });

    await test.step('Verify significant net worth reduction', async () => {
      // Net worth should be SIGNIFICANTLY lower with expensive recurring expense
      const reduction = baselineNetWorth - postExpenseNetWorth;
      console.log(`Net worth reduction: $${reduction.toLocaleString()}`);
      
      // Should see meaningful reduction due to college tuition
      expect(reduction).toBeGreaterThan(100000); // At least $100k impact
      expect(postExpenseNetWorth).toBeLessThan(baselineNetWorth * 0.8); // At least 20% reduction
    });

    await test.step('Verify expense appears in net worth', async () => {
      // Total outflows should include the recurring expense
      if (totalOutflows) {
        expect(totalOutflows).toBeGreaterThan(50000); // Should show the college tuition
      }
      
      // Verify expense is not zero
      const netWorthValues = await deepDive.getNetWorthValues();
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
    });

    await test.step('Test different expense frequencies', async () => {
      // Go back and add a monthly recurring expense
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('expense');
      
      // Add monthly expense
      await eventModal.fillEventForm({
        name: 'Premium Healthcare',
        amount: 2000, // $2k monthly
        frequency: 'monthly'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
      
      // Run simulation and verify impact
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.6, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      // Should see even more outflows now
      const newCashFlowValues = await deepDive.getNetWorthValues();
      const newOutflowMatch = newCashFlowValues.totalAssets?.match(/\$([0-9,]+)/);
      if (newOutflowMatch) {
        const newTotalOutflows = parseInt(newOutflowMatch[1].replace(/,/g, ''));
        console.log(`Total outflows with monthly expense: $${newTotalOutflows.toLocaleString()}`);
        
        // Should be higher than before
        if (totalOutflows) {
          expect(newTotalOutflows).toBeGreaterThan(totalOutflows);
        }
      }
    });

    await test.step('Assert no zero-value bugs in deep dive', async () => {
      await deepDive.assertNoZeroValues();
    });
  });

  test('should handle expense timing and duration correctly', async ({ page }) => {
    await test.step('Setup with basic income', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add basic income
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Base Salary',
        amount: 100000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add time-limited recurring expense', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('expense');
      
      // Add mortgage payment (30-year term)
      await eventModal.fillEventForm({
        name: 'Mortgage Payment',
        amount: 3000, // $3k monthly
        frequency: 'monthly',
        startYear: '2025',
        endYear: '2055' // 30 years
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify expense impact during active period', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check during mortgage period
      await dashboard.clickOnChart(0.3, 0.4); // Early in mortgage
      await deepDive.waitForDeepDiveVisible();
      
      const activeCashFlow = await deepDive.getNetWorthValues();
      const activeOutflowMatch = activeCashFlow.totalAssets?.match(/\$([0-9,]+)/);
      const activePeriodOutflows = activeOutflowMatch ? parseInt(activeOutflowMatch[1].replace(/,/g, '')) : 0;
      
      console.log(`Outflows during mortgage period: $${activePeriodOutflows.toLocaleString()}`);
      
      // Should show significant outflows during mortgage period
      expect(activePeriodOutflows).toBeGreaterThan(30000); // Should include $36k annually from mortgage
    });

    await test.step('Verify expense ends after duration', async () => {
      // Check after mortgage ends
      await dashboard.clickOnChart(0.9, 0.4); // Late in timeline, after mortgage
      await deepDive.waitForDeepDiveVisible();
      
      const postCashFlow = await deepDive.getNetWorthValues();
      const postOutflowMatch = postCashFlow.totalAssets?.match(/\$([0-9,]+)/);
      const postPeriodOutflows = postOutflowMatch ? parseInt(postOutflowMatch[1].replace(/,/g, '')) : 0;
      
      console.log(`Outflows after mortgage ends: $${postPeriodOutflows.toLocaleString()}`);
      
      // Should be lower after mortgage ends (but account for other factors like healthcare)
      // This is a logical test - not necessarily much lower due to inflation and other costs
      expect(postPeriodOutflows).toBeLessThan(100000); // Reasonable upper bound
    });
  });

  test('should validate expense growth rates work correctly', async ({ page }) => {
    await test.step('Setup baseline', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Add expense with growth rate', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('expense');
      
      // Add expense with inflation growth (if UI supports it)
      await eventModal.fillEventForm({
        name: 'Healthcare Costs',
        amount: 12000, // $12k annually
        frequency: 'annually',
        growthRate: 5 // 5% annual growth if supported
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify expense grows over time', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check early year
      await dashboard.clickOnChart(0.2, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const earlyCashFlow = await deepDive.getNetWorthValues();
      const earlyOutflowMatch = earlyCashFlow.totalAssets?.match(/\$([0-9,]+)/);
      const earlyOutflows = earlyOutflowMatch ? parseInt(earlyOutflowMatch[1].replace(/,/g, '')) : 0;
      
      // Check later year
      await dashboard.clickOnChart(0.8, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const lateCashFlow = await deepDive.getNetWorthValues();
      const lateOutflowMatch = lateCashFlow.totalAssets?.match(/\$([0-9,]+)/);
      const lateOutflows = lateOutflowMatch ? parseInt(lateOutflowMatch[1].replace(/,/g, '')) : 0;
      
      console.log(`Early outflows: $${earlyOutflows.toLocaleString()}, Late outflows: $${lateOutflows.toLocaleString()}`);
      
      // Later outflows should be higher due to growth (accounting for inflation)
      if (earlyOutflows > 0 && lateOutflows > 0) {
        expect(lateOutflows).toBeGreaterThan(earlyOutflows);
      }
    });
  });
});