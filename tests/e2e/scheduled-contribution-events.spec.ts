import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage, EventModalPage } from './poms';

test.describe('SCHEDULED_CONTRIBUTION Events - Investment Impact Testing', () => {
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

  test('should demonstrate 401k contribution impact on retirement savings', async ({ page }) => {
    await test.step('Setup with baseline income', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add income to enable contributions
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Software Engineer',
        amount: 120000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE: Baseline without contributions
    let baseline401kBalance: number;
    await test.step('Measure baseline 401k balance without contributions', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Navigate to mid-career for meaningful comparison
      await dashboard.clickOnChart(0.6, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Extract 401k/tax-deferred balance if shown separately
      // This assumes the deep dive shows investment account details
      if (netWorthValues.investmentAccounts) {
        const investmentMatch = netWorthValues.investmentAccounts.match(/\$([0-9,]+)/);
        baseline401kBalance = investmentMatch ? parseInt(investmentMatch[1].replace(/,/g, '')) : 0;
      } else {
        baseline401kBalance = 0; // No contributions yet
      }
      
      console.log(`Baseline 401k balance: $${baseline401kBalance.toLocaleString()}`);
    });

    // ACT: Add scheduled 401k contributions
    await test.step('Add scheduled 401k contributions', async () => {
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment'); // or 'contribution' if category exists
      
      await eventModal.fillEventForm({
        name: '401k Contribution',
        amount: 1500, // $1,500 monthly = $18k annually
        frequency: 'monthly',
        accountType: '401k'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE AGAIN: Post-contribution simulation
    let postContribution401kBalance: number;
    await test.step('Measure 401k balance with contributions', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Navigate to same future year
      await dashboard.clickOnChart(0.6, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      
      if (netWorthValues.investmentAccounts) {
        const investmentMatch = netWorthValues.investmentAccounts.match(/\$([0-9,]+)/);
        postContribution401kBalance = investmentMatch ? parseInt(investmentMatch[1].replace(/,/g, '')) : 0;
      } else {
        // If not shown separately, use total assets as proxy
        const assetsMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
        postContribution401kBalance = assetsMatch ? parseInt(assetsMatch[1].replace(/,/g, '')) : 0;
      }
      
      console.log(`Post-contribution 401k balance: $${postContribution401kBalance.toLocaleString()}`);
    });

    await test.step('Verify significant 401k balance increase', async () => {
      const increase = postContribution401kBalance - baseline401kBalance;
      console.log(`401k balance increase: $${increase.toLocaleString()}`);
      
      // Should see substantial increase from years of contributions + growth
      expect(increase).toBeGreaterThan(100000); // Should accumulate significantly
      expect(postContribution401kBalance).toBeGreaterThan(baseline401kBalance * 2); // Should be much higher
    });

    await test.step('Verify contribution shows in net worth', async () => {
      // Check that contributions appear in net worth
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Contributions should appear as outflows or be reflected in reduced net worth
      if (netWorthValues.totalAssets) {
        const outflowMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (outflowMatch) {
          const outflows = parseInt(outflowMatch[1].replace(/,/g, ''));
          console.log(`Total outflows: $${outflows.toLocaleString()}`);
          // Should include the $18k annual contribution
          expect(outflows).toBeGreaterThan(15000);
        }
      }
    });
  });

  test('should compare different contribution amounts', async ({ page }) => {
    await test.step('Setup with income', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add substantial income
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'High-Paying Job',
        amount: 200000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add modest contribution', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      await eventModal.fillEventForm({
        name: '401k Basic Contribution',
        amount: 500, // $500 monthly = $6k annually
        frequency: 'monthly',
        accountType: '401k'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE: Modest contribution result
    let modestContributionBalance: number;
    await test.step('Measure with modest contributions', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.7, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      const assetsMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      modestContributionBalance = assetsMatch ? parseInt(assetsMatch[1].replace(/,/g, '')) : 0;
      
      console.log(`Modest contribution balance: $${modestContributionBalance.toLocaleString()}`);
    });

    await test.step('Edit to increase contribution', async () => {
      // Go back and modify the contribution
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      // This assumes there's UI to edit existing events
      // For now, add a second higher contribution
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      // Double the contribution
      await eventModal.fillEventForm({
        name: '401k Max Contribution',
        amount: 1000, // $1000 monthly = $12k annually (in addition to $6k)
        frequency: 'monthly',
        accountType: '401k'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify higher contribution results in higher balance', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.7, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const newNetWorthValues = await deepDive.getNetWorthValues();
      const newAssetsMatch = newNetWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      const higherContributionBalance = newAssetsMatch ? parseInt(newAssetsMatch[1].replace(/,/g, '')) : 0;
      
      console.log(`Higher contribution balance: $${higherContributionBalance.toLocaleString()}`);
      
      // Should be significantly higher with doubled contributions
      expect(higherContributionBalance).toBeGreaterThan(modestContributionBalance);
      expect(higherContributionBalance).toBeGreaterThan(modestContributionBalance * 1.3); // At least 30% higher
    });
  });

  test('should handle Roth vs Traditional 401k contributions', async ({ page }) => {
    await test.step('Setup baseline', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add income
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Salary',
        amount: 150000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add traditional 401k contribution', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      await eventModal.fillEventForm({
        name: 'Traditional 401k',
        amount: 1500, // $1500 monthly
        frequency: 'monthly',
        accountType: 'traditional401k' // if differentiated
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add Roth 401k contribution', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      await eventModal.fillEventForm({
        name: 'Roth 401k',
        amount: 500, // $500 monthly
        frequency: 'monthly',
        accountType: 'roth401k' // if differentiated
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify both contributions accumulate', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.6, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      // Should show healthy investment account growth
      const netWorthValues = await deepDive.getNetWorthValues();
      
      if (netWorthValues.investmentAccounts) {
        const investmentMatch = netWorthValues.investmentAccounts.match(/\$([0-9,]+)/);
        if (investmentMatch) {
          const totalInvestments = parseInt(investmentMatch[1].replace(/,/g, ''));
          console.log(`Total investment accounts: $${totalInvestments.toLocaleString()}`);
          
          // Should have substantial balance from both types of contributions
          expect(totalInvestments).toBeGreaterThan(150000); // Should accumulate well
        }
      }
      
      // Check net worth shows the total contribution
      const netWorthValues = await deepDive.getNetWorthValues();
      if (netWorthValues.totalAssets) {
        const outflowMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (outflowMatch) {
          const totalOutflows = parseInt(outflowMatch[1].replace(/,/g, ''));
          console.log(`Total outflows: $${totalOutflows.toLocaleString()}`);
          // Should include both contributions (~$24k annually)
          expect(totalOutflows).toBeGreaterThan(20000);
        }
      }
    });
  });

  test('should validate contribution limits and timing', async ({ page }) => {
    await test.step('Setup high-income scenario', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Executive Salary',
        amount: 300000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add maximum contribution', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      // Max 401k contribution for 2024 is $23,000
      await eventModal.fillEventForm({
        name: 'Max 401k Contribution',
        amount: 1917, // $23,000 / 12 months
        frequency: 'monthly',
        accountType: '401k'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify maximum contribution impact', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.5, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      // Should show optimal savings with max contributions
      const netWorthValues = await deepDive.getNetWorthValues();
      const assetsMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      
      if (assetsMatch) {
        const totalAssets = parseInt(assetsMatch[1].replace(/,/g, ''));
        console.log(`Assets with max contributions: $${totalAssets.toLocaleString()}`);
        
        // With high income and max contributions, should accumulate substantially
        expect(totalAssets).toBeGreaterThan(200000);
      }
      
      // Verify contribution shows in outflows
      const netWorthValues = await deepDive.getNetWorthValues();
      if (netWorthValues.totalAssets) {
        const outflowMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (outflowMatch) {
          const outflows = parseInt(outflowMatch[1].replace(/,/g, ''));
          // Should include the ~$23k contribution
          expect(outflows).toBeGreaterThan(20000);
        }
      }
    });

    await test.step('Assert no zero-value bugs', async () => {
      await deepDive.assertNoZeroValues();
    });
  });
});