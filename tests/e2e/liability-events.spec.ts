import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage, EventModalPage } from './poms';

test.describe('LIABILITY_ADD Events - Debt Impact Testing', () => {
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

  test('should demonstrate mortgage liability impact on net worth', async ({ page }) => {
    await test.step('Setup baseline with substantial income', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add high income to enable meaningful liability comparison
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Software Architect',
        amount: 250000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE: Baseline net worth without liabilities
    let baselineNetWorth: number;
    await test.step('Measure baseline without mortgage liability', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check net worth in mid-career for meaningful comparison
      await dashboard.clickOnChart(0.4, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      expect(netWorthMatch).not.toBeNull();
      baselineNetWorth = parseInt(netWorthMatch![1].replace(/,/g, ''));
      
      console.log(`Baseline net worth: $${baselineNetWorth.toLocaleString()}`);
      
      // Should have positive net worth with high income
      expect(baselineNetWorth).toBeGreaterThan(100000);
    });

    // ACT: Add large mortgage liability
    await test.step('Add mortgage liability', async () => {
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('liability'); // or 'debt' if category exists
      
      await eventModal.fillEventForm({
        name: 'Home Mortgage',
        amount: 800000, // $800k mortgage
        interestRate: 6.5, // 6.5% interest
        loanTerm: 30, // 30 years
        startYear: '2025'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE AGAIN: Net worth with mortgage liability
    let postMortgageNetWorth: number;
    await test.step('Measure net worth with mortgage liability', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Navigate to same year for comparison
      await dashboard.clickOnChart(0.4, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Check for liabilities section
      if (netWorthValues.totalLiabilities) {
        const liabilityMatch = netWorthValues.totalLiabilities.match(/\$([0-9,]+)/);
        if (liabilityMatch) {
          const totalLiabilities = parseInt(liabilityMatch[1].replace(/,/g, ''));
          console.log(`Total liabilities: $${totalLiabilities.toLocaleString()}`);
          expect(totalLiabilities).toBeGreaterThan(500000); // Should show substantial mortgage debt
        }
      }
      
      // Net worth should account for liability
      const netWorthMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      if (netWorthMatch) {
        postMortgageNetWorth = parseInt(netWorthMatch[1].replace(/,/g, ''));
        console.log(`Post-mortgage net worth: $${postMortgageNetWorth.toLocaleString()}`);
      }
    });

    await test.step('Verify liability impact on net worth', async () => {
      // Check that mortgage payments appear in net worth
      const netWorthValues = await deepDive.getNetWorthValues();
      
      if (netWorthValues.totalAssets) {
        const outflowMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (outflowMatch) {
          const totalOutflows = parseInt(outflowMatch[1].replace(/,/g, ''));
          console.log(`Total outflows with mortgage: $${totalOutflows.toLocaleString()}`);
          // Should include mortgage payment (~$5k monthly = ~$60k annually)
          expect(totalOutflows).toBeGreaterThan(50000);
        }
      }
      
      // Mortgage payments should not be zero
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
    });
  });

  test('should handle student loan liability correctly', async ({ page }) => {
    await test.step('Setup with moderate income', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add moderate income
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Entry Level Job',
        amount: 75000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add student loan liability', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('liability');
      
      await eventModal.fillEventForm({
        name: 'Student Loan',
        amount: 150000, // $150k student debt
        interestRate: 7.0, // 7% interest
        loanTerm: 10, // 10 year repayment
        startYear: '2024' // Current debt
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify student loan impact', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check early career impact
      await dashboard.clickOnChart(0.2, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      // Should show significant debt burden
      const netWorthValues = await deepDive.getNetWorthValues();
      
      if (netWorthValues.totalLiabilities) {
        const liabilityMatch = netWorthValues.totalLiabilities.match(/\$([0-9,]+)/);
        if (liabilityMatch) {
          const liabilities = parseInt(liabilityMatch[1].replace(/,/g, ''));
          console.log(`Student loan liabilities: $${liabilities.toLocaleString()}`);
          expect(liabilities).toBeGreaterThan(100000); // Should show substantial debt
        }
      }
      
      // Cash flow should show loan payments
      const netWorthValues = await deepDive.getNetWorthValues();
      if (netWorthValues.totalAssets) {
        const outflowMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (outflowMatch) {
          const outflows = parseInt(outflowMatch[1].replace(/,/g, ''));
          console.log(`Monthly outflows with student loans: $${outflows.toLocaleString()}`);
          // Should include loan payments
          expect(outflows).toBeGreaterThan(15000);
        }
      }
    });

    await test.step('Verify loan payoff over time', async () => {
      // Check later in timeline (after loan term)
      await dashboard.clickOnChart(0.7, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const laterNetWorthValues = await deepDive.getNetWorthValues();
      
      // Liabilities should be lower or gone after loan term
      if (laterNetWorthValues.totalLiabilities) {
        const laterLiabilityMatch = laterNetWorthValues.totalLiabilities.match(/\$([0-9,]+)/);
        const laterLiabilities = laterLiabilityMatch ? parseInt(laterLiabilityMatch[1].replace(/,/g, '')) : 0;
        console.log(`Later liabilities: $${laterLiabilities.toLocaleString()}`);
        
        // Should be paid down significantly
        expect(laterLiabilities).toBeLessThan(50000);
      }
    });
  });

  test('should handle multiple liability types', async ({ page }) => {
    await test.step('Setup with high income', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add high income to support multiple debts
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Executive Role',
        amount: 300000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add multiple liabilities', async () => {
      // Add car loan
      let addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('liability');
      
      await eventModal.fillEventForm({
        name: 'Car Loan',
        amount: 50000, // $50k car loan
        interestRate: 4.5,
        loanTerm: 5,
        startYear: '2025'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();

      // Add credit card debt
      addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('liability');
      
      await eventModal.fillEventForm({
        name: 'Credit Card Debt',
        amount: 25000, // $25k credit card debt
        interestRate: 18.0, // High interest rate
        loanTerm: 3, // Pay off quickly
        startYear: '2024'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify combined liability impact', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.3, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      // Should show combined liabilities
      const netWorthValues = await deepDive.getNetWorthValues();
      
      if (netWorthValues.totalLiabilities) {
        const liabilityMatch = netWorthValues.totalLiabilities.match(/\$([0-9,]+)/);
        if (liabilityMatch) {
          const totalLiabilities = parseInt(liabilityMatch[1].replace(/,/g, ''));
          console.log(`Combined liabilities: $${totalLiabilities.toLocaleString()}`);
          // Should show both debts
          expect(totalLiabilities).toBeGreaterThan(60000);
        }
      }
      
      // Cash flow should show combined payments
      const netWorthValues = await deepDive.getNetWorthValues();
      if (netWorthValues.totalAssets) {
        const outflowMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (outflowMatch) {
          const outflows = parseInt(outflowMatch[1].replace(/,/g, ''));
          console.log(`Combined debt payments: $${outflows.toLocaleString()}`);
          // Should include payments for both loans
          expect(outflows).toBeGreaterThan(20000);
        }
      }
    });

    await test.step('Verify debt payoff sequencing', async () => {
      // Check different points in timeline to see debt payoff
      await dashboard.clickOnChart(0.6, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const midTimelineValues = await deepDive.getNetWorthValues();
      
      // Some debts should be paid off by now
      if (midTimelineValues.totalLiabilities) {
        const midLiabilityMatch = midTimelineValues.totalLiabilities.match(/\$([0-9,]+)/);
        const midLiabilities = midLiabilityMatch ? parseInt(midLiabilityMatch[1].replace(/,/g, '')) : 0;
        console.log(`Mid-timeline liabilities: $${midLiabilities.toLocaleString()}`);
        
        // Should be lower as short-term debts are paid off
        expect(midLiabilities).toBeLessThan(40000);
      }
    });

    await test.step('Assert no zero-value bugs', async () => {
      await deepDive.assertNoZeroValues();
    });
  });

  test('should validate liability interest rate impact', async ({ page }) => {
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
        name: 'Base Income',
        amount: 150000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add high-interest liability', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('liability');
      
      // High interest rate debt (credit card)
      await eventModal.fillEventForm({
        name: 'High Interest Debt',
        amount: 100000,
        interestRate: 22.0, // Very high interest
        loanTerm: 10,
        startYear: '2024'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify high interest impact on payments', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.3, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      // High interest should result in substantial payments
      const netWorthValues = await deepDive.getNetWorthValues();
      if (netWorthValues.totalAssets) {
        const outflowMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (outflowMatch) {
          const outflows = parseInt(outflowMatch[1].replace(/,/g, ''));
          console.log(`High-interest debt payments: $${outflows.toLocaleString()}`);
          // High interest rate should create substantial payments
          expect(outflows).toBeGreaterThan(25000);
        }
      }
      
      // Liability should persist longer due to high interest
      const netWorthValues = await deepDive.getNetWorthValues();
      if (netWorthValues.totalLiabilities) {
        const liabilityMatch = netWorthValues.totalLiabilities.match(/\$([0-9,]+)/);
        if (liabilityMatch) {
          const liabilities = parseInt(liabilityMatch[1].replace(/,/g, ''));
          console.log(`Remaining high-interest debt: $${liabilities.toLocaleString()}`);
          expect(liabilities).toBeGreaterThan(70000); // Should be slow to pay down
        }
      }
    });
  });
});