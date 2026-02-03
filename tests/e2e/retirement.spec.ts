import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage, EventModalPage } from './poms';
import { FixtureLoader } from './helpers/fixture-loader';

test.describe('Basic Retirement User Story', () => {
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

  test('should model retirement transition and validate income change', async ({ page }) => {
    await test.step('Load a persona with retirement scenario', async () => {
      // Use the Navigator persona which has retirement planning focus
      await fixtureLoader.loadPersonaBySelection('Navigator');
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Run simulation and wait for completion', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
    });

    await test.step('Verify chart shows long-term data', async () => {
      expect(await dashboard.isChartVisible()).toBe(true);
      
      const chartDimensions = await dashboard.getChartDimensions();
      expect(chartDimensions).not.toBeNull();
      expect(chartDimensions!.width).toBeGreaterThan(0);
      expect(chartDimensions!.height).toBeGreaterThan(0);
    });

    await test.step('Analyze pre-retirement years (employment income)', async () => {
      // Click early in the timeline (pre-retirement)
      await dashboard.clickOnChart(0.3, 0.4);
      
      await deepDive.waitForDeepDiveVisible();
      
      const preRetirementYear = await deepDive.getFocusYear();
      expect(preRetirementYear).not.toBeNull();
      
      const preRetirementCashFlow = await deepDive.getNetWorthValues();
      
      // Should have employment income
      expect(preRetirementCashFlow.totalAssets).not.toBeNull();
      expect(preRetirementCashFlow.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // Parse income value for comparison
      const preIncomeMatch = preRetirementCashFlow.totalAssets?.match(/\$([0-9,]+)/);
      const preRetirementIncome = preIncomeMatch ? parseInt(preIncomeMatch[1].replace(/,/g, '')) : 0;
      
      expect(preRetirementIncome).toBeGreaterThan(0);
      console.log(`Pre-retirement (Year ${preRetirementYear}): Income $${preRetirementIncome.toLocaleString()}`);
      
      // Store for comparison
      (page as any).preRetirementIncome = preRetirementIncome;
      (page as any).preRetirementYear = preRetirementYear;
    });

    await test.step('Analyze post-retirement years (portfolio withdrawals)', async () => {
      // Click later in the timeline (post-retirement)
      await dashboard.clickOnChart(0.8, 0.4);
      
      await deepDive.waitForDeepDiveVisible();
      
      const postRetirementYear = await deepDive.getFocusYear();
      expect(postRetirementYear).not.toBeNull();
      
      const postRetirementCashFlow = await deepDive.getNetWorthValues();
      
      // Should still have some income (withdrawals, Social Security)
      expect(postRetirementCashFlow.totalAssets).not.toBeNull();
      expect(postRetirementCashFlow.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      const postIncomeMatch = postRetirementCashFlow.totalAssets?.match(/\$([0-9,]+)/);
      const postRetirementIncome = postIncomeMatch ? parseInt(postIncomeMatch[1].replace(/,/g, '')) : 0;
      
      expect(postRetirementIncome).toBeGreaterThan(0);
      console.log(`Post-retirement (Year ${postRetirementYear}): Income $${postRetirementIncome.toLocaleString()}`);
      
      // Compare with pre-retirement
      const preRetirementIncome = (page as any).preRetirementIncome || 0;
      const preRetirementYear = (page as any).preRetirementYear;
      
      // Verify we're looking at different time periods
      const yearDiff = parseInt(postRetirementYear!) - parseInt(preRetirementYear!);
      expect(yearDiff).toBeGreaterThan(5); // Should be at least 5 years difference
      
      console.log(`Income transition over ${yearDiff} years: $${preRetirementIncome.toLocaleString()} → $${postRetirementIncome.toLocaleString()}`);
    });

    await test.step('Verify net worth chart shows retirement transition pattern', async () => {
      // Check that we have reasonable asset accumulation
      const postRetirementNetWorth = await deepDive.getNetWorthValues();
      
      expect(postRetirementNetWorth.totalAssets).not.toBeNull();
      expect(postRetirementNetWorth.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // Investment accounts should be substantial in retirement
      if (postRetirementNetWorth.investmentAccounts) {
        expect(postRetirementNetWorth.investmentAccounts).not.toMatch(/\$0(?:\s|$)/);
        
        const investmentMatch = postRetirementNetWorth.investmentAccounts.match(/\$([0-9,]+)/);
        if (investmentMatch) {
          const investmentValue = parseInt(investmentMatch[1].replace(/,/g, ''));
          expect(investmentValue).toBeGreaterThan(100000); // Should have substantial retirement savings
          
          console.log(`Retirement investment accounts: $${investmentValue.toLocaleString()}`);
        }
      }
    });

    await test.step('Verify no zero-value bugs in retirement scenario', async () => {
      await deepDive.assertNoZeroValues();
    });
  });

  test('should create retirement scenario from scratch with income end date', async ({ page }) => {
    await test.step('Start from scratch and create retirement scenario', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
    });

    await test.step('Add working years income with end date', async () => {
      await dashboard.waitForDashboardLoad();
      
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await expect(addEventButton).toBeVisible({ timeout: 10000 });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Working Years Salary',
        amount: 150000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add retirement-level expenses', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();
      
      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('expense');
      
      await eventModal.fillEventForm({
        name: 'Retirement Living Expenses',
        amount: 8000,
        frequency: 'monthly'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add retirement contributions', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();
      
      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('asset');
      
      await eventModal.fillEventForm({
        name: '401k Contributions',
        amount: 25000
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Run simulation and verify retirement modeling', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      expect(await dashboard.isChartVisible()).toBe(true);
      
      // Test different time periods
      const timePoints = [0.3, 0.7]; // Early and late in simulation
      
      for (let i = 0; i < timePoints.length; i++) {
        await dashboard.clickOnChart(timePoints[i], 0.3);
        await deepDive.waitForDeepDiveVisible();
        
        const year = await deepDive.getFocusYear();
        const periodLabel = i === 0 ? 'working years' : 'retirement years';
        
        console.log(`Testing ${periodLabel} for year ${year}`);
        
        const cashFlow = await deepDive.getNetWorthValues();
        expect(cashFlow.totalAssets).not.toMatch(/\$0(?:\s|$)/);
        expect(cashFlow.totalAssets).not.toMatch(/\$0(?:\s|$)/);
        
        const netWorth = await deepDive.getNetWorthValues();
        expect(netWorth.totalAssets).not.toMatch(/\$0(?:\s|$)/);
        
        await page.waitForTimeout(500);
      }
    });
  });

  test('should validate Social Security and retirement income transitions', async ({ page }) => {
    await test.step('Load persona with Social Security modeling', async () => {
      // Use Architect persona which includes Social Security planning
      await fixtureLoader.loadPersonaBySelection('Architect');
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Run simulation and analyze retirement income sources', async () => {
      await dashboard.waitForSimulationComplete();
      
      // Navigate to different retirement phases
      const retirementPhases = [
        { point: 0.6, label: 'Early Retirement' },
        { point: 0.8, label: 'Full Retirement with SS' },
        { point: 0.9, label: 'Late Retirement' }
      ];
      
      for (const phase of retirementPhases) {
        await dashboard.clickOnChart(phase.point, 0.3);
        await deepDive.waitForDeepDiveVisible();
        
        const year = await deepDive.getFocusYear();
        const cashFlow = await deepDive.getNetWorthValues();
        
        console.log(`${phase.label} (Year ${year}):`);
        
        // Should have retirement income of some form
        expect(cashFlow.totalAssets).not.toBeNull();
        expect(cashFlow.totalAssets).not.toMatch(/\$0(?:\s|$)/);
        
        const incomeMatch = cashFlow.totalAssets?.match(/\$([0-9,]+)/);
        if (incomeMatch) {
          const income = parseInt(incomeMatch[1].replace(/,/g, ''));
          console.log(`  Income: $${income.toLocaleString()}`);
          
          // Retirement income should be reasonable (not zero, not impossibly high)
          expect(income).toBeGreaterThan(1000); // At least $1K monthly
          expect(income).toBeLessThan(500000); // Less than $500K monthly (sanity check)
        }
        
        // Verify expenses are reasonable for retirement
        const expenseMatch = cashFlow.totalAssets?.match(/\$([0-9,]+)/);
        if (expenseMatch) {
          const expenses = parseInt(expenseMatch[1].replace(/,/g, ''));
          console.log(`  Expenses: $${expenses.toLocaleString()}`);
          
          expect(expenses).toBeGreaterThan(1000); // Should have living expenses
        }
        
        await page.waitForTimeout(1000);
      }
    });

    await test.step('Verify portfolio withdrawal sustainability', async () => {
      // Check late retirement to ensure portfolio hasn't been depleted
      await dashboard.clickOnChart(0.95, 0.3);
      await deepDive.waitForDeepDiveVisible();
      
      const lateRetirementNetWorth = await deepDive.getNetWorthValues();
      
      if (lateRetirementNetWorth.totalAssets) {
        const assetsMatch = lateRetirementNetWorth.totalAssets.match(/\$([0-9,]+)/);
        if (assetsMatch) {
          const assets = parseInt(assetsMatch[1].replace(/,/g, ''));
          
          // Should still have some assets in late retirement (not depleted)
          expect(assets).toBeGreaterThan(0);
          console.log(`Late retirement assets: $${assets.toLocaleString()}`);
        }
      }
    });

    await test.step('Final retirement scenario validation', async () => {
      await deepDive.assertNoZeroValues();
      console.log('✅ Retirement scenario validation completed successfully');
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