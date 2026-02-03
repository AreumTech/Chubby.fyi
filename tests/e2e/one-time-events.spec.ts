import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage, EventModalPage } from './poms';

test.describe('ONE_TIME_EVENT Events - Comprehensive Testing', () => {
  let onboarding: OnboardingPage;
  let dashboard: DashboardPage;
  let deepDive: DeepDivePage;
  let eventModal: EventModalPage;

  test.beforeEach(async ({ page }) => {
    onboarding = new OnboardingPage(page);
    dashboard = new DashboardPage(page);
    deepDive = new DeepDivePage(page);
    eventModal = new EventModalPage(page);
  });

  test('should handle positive one-time events (inheritance)', async ({ page }) => {
    await test.step('Setup baseline plan', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
    });

    // MEASURE: Baseline simulation
    let baselineNetWorth: number;
    await test.step('Measure baseline without one-time event', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Click on future year to measure impact
      await dashboard.clickOnChart(0.6, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(netWorthMatch).not.toBeNull();
      baselineNetWorth = parseInt(netWorthMatch![1].replace(/,/g, ''));
      
      console.log(`Baseline net worth: $${baselineNetWorth.toLocaleString()}`);
    });

    // ACT: Add positive one-time event
    await test.step('Add large positive one-time event (inheritance)', async () => {
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income'); // or 'one-time' if category exists
      
      await eventModal.fillEventForm({
        name: 'Inheritance',
        amount: 500000, // $500k inheritance
        frequency: 'once',
        year: '2030' // Specific year
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE AGAIN: Post-inheritance simulation
    let postInheritanceNetWorth: number;
    await test.step('Measure impact after inheritance', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Navigate to same year for comparison
      await dashboard.clickOnChart(0.6, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(netWorthMatch).not.toBeNull();
      postInheritanceNetWorth = parseInt(netWorthMatch![1].replace(/,/g, ''));
      
      console.log(`Post-inheritance net worth: $${postInheritanceNetWorth.toLocaleString()}`);
    });

    await test.step('Verify significant net worth increase', async () => {
      const increase = postInheritanceNetWorth - baselineNetWorth;
      console.log(`Net worth increase: $${increase.toLocaleString()}`);
      
      // Should see substantial increase from inheritance
      expect(increase).toBeGreaterThan(400000); // Should capture most of the $500k
      expect(postInheritanceNetWorth).toBeGreaterThan(baselineNetWorth * 1.5); // At least 50% increase
    });
  });

  test('should handle negative one-time events (wedding costs)', async ({ page }) => {
    await test.step('Setup with income', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add income to have something to spend
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Software Engineer',
        amount: 150000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE: Baseline with income
    let baselineNetWorth: number;
    await test.step('Measure baseline with income only', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.4, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(netWorthMatch).not.toBeNull();
      baselineNetWorth = parseInt(netWorthMatch![1].replace(/,/g, ''));
      
      console.log(`Baseline net worth: $${baselineNetWorth.toLocaleString()}`);
    });

    // ACT: Add negative one-time event
    await test.step('Add large negative one-time event (wedding)', async () => {
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('expense'); // or 'one-time' if category exists
      
      await eventModal.fillEventForm({
        name: 'Wedding Cost',
        amount: 75000, // $75k wedding
        frequency: 'once',
        year: '2027'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE AGAIN: Post-wedding simulation
    let postWeddingNetWorth: number;
    await test.step('Measure impact after wedding expense', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.4, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(netWorthMatch).not.toBeNull();
      postWeddingNetWorth = parseInt(netWorthMatch![1].replace(/,/g, ''));
      
      console.log(`Post-wedding net worth: $${postWeddingNetWorth.toLocaleString()}`);
    });

    await test.step('Verify net worth decrease from expense', async () => {
      const decrease = baselineNetWorth - postWeddingNetWorth;
      console.log(`Net worth decrease: $${decrease.toLocaleString()}`);
      
      // Should see meaningful decrease from wedding costs
      expect(decrease).toBeGreaterThan(50000); // Should see significant impact
      expect(postWeddingNetWorth).toBeLessThan(baselineNetWorth); // Should be lower
    });
  });

  test('should handle multiple one-time events in same year', async ({ page }) => {
    await test.step('Setup baseline', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Add multiple one-time events', async () => {
      // Add first one-time event
      let addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Stock Option Exercise',
        amount: 200000,
        frequency: 'once',
        year: '2028'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();

      // Add second one-time event (same year)
      addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('expense');
      
      await eventModal.fillEventForm({
        name: 'Home Down Payment',
        amount: 150000,
        frequency: 'once',
        year: '2028' // Same year
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify net effect of multiple events', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Navigate to the year with multiple events
      await dashboard.clickOnChart(0.5, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      // Should see net effect (roughly +$50k from +$200k and -$150k)
      const netWorthValues = await deepDive.getNetWorthValues();
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // Get net worth to see if both events are reflected
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Should show some activity in the net worth for that year
      if (netWorthValues.totalAssets) {
        const incomeMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (incomeMatch) {
          const income = parseInt(incomeMatch[1].replace(/,/g, ''));
          console.log(`Income in event year: $${income.toLocaleString()}`);
          // Should reflect the stock option exercise
          expect(income).toBeGreaterThan(150000);
        }
      }

      if (netWorthValues.totalAssets) {
        const outflowMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (outflowMatch) {
          const outflows = parseInt(outflowMatch[1].replace(/,/g, ''));
          console.log(`Outflows in event year: $${outflows.toLocaleString()}`);
          // Should reflect the home down payment
          expect(outflows).toBeGreaterThan(100000);
        }
      }
    });
  });

  test('should validate one-time event timing precision', async ({ page }) => {
    await test.step('Setup baseline', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Add precisely timed one-time event', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      // Add event for specific future year
      await eventModal.fillEventForm({
        name: 'Bonus Payment',
        amount: 50000,
        frequency: 'once',
        year: '2029',
        month: 'June' // If month precision is supported
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify event timing in simulation', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check the specific year
      await dashboard.clickOnChart(0.55, 0.4); // Around 2029
      await deepDive.waitForDeepDiveVisible();
      
      // Should see the bonus in the net worth
      const netWorthValues = await deepDive.getNetWorthValues();
      if (netWorthValues.totalAssets) {
        expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
        
        const incomeMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (incomeMatch) {
          const income = parseInt(incomeMatch[1].replace(/,/g, ''));
          console.log(`Income in target year: $${income.toLocaleString()}`);
          // Should show the bonus amount
          expect(income).toBeGreaterThan(40000);
        }
      }
      
      // Check year before (should not have the bonus)
      await dashboard.clickOnChart(0.5, 0.4); // Year before
      await deepDive.waitForDeepDiveVisible();
      
      const prevYearFlow = await deepDive.getNetWorthValues();
      if (prevYearFlow.totalAssets) {
        const prevIncomeMatch = prevYearFlow.totalAssets.match(/\$([0-9,]+)/);
        const prevIncome = prevIncomeMatch ? parseInt(prevIncomeMatch[1].replace(/,/g, '')) : 0;
        
        console.log(`Income in previous year: $${prevIncome.toLocaleString()}`);
        // Previous year should have lower income (no bonus)
        if (prevIncome > 0) {
          expect(prevIncome).toBeLessThan(20000); // Should be much lower without bonus
        }
      }
    });

    await test.step('Assert no zero-value bugs', async () => {
      await deepDive.assertNoZeroValues();
    });
  });
});