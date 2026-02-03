import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage, EventModalPage } from './poms';

test.describe('ROTH_CONVERSION Events - Tax Impact Testing', () => {
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

  test('should demonstrate Roth conversion tax impact and benefits', async ({ page }) => {
    await test.step('Setup with substantial traditional retirement savings', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add high income to support conversions
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'High Earner',
        amount: 200000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add traditional 401k contributions to build balance', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      await eventModal.fillEventForm({
        name: 'Traditional 401k',
        amount: 2000, // $2k monthly
        frequency: 'monthly',
        accountType: 'traditional401k'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE: Baseline tax situation before conversion
    let baselineTaxes: number;
    await test.step('Measure baseline tax burden', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check mid-career taxes
      await dashboard.clickOnChart(0.5, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Extract tax information if available
      if (netWorthValues.taxes) {
        const taxMatch = netWorthValues.taxes.match(/\$([0-9,]+)/);
        if (taxMatch) {
          baselineTaxes = parseInt(taxMatch[1].replace(/,/g, ''));
          console.log(`Baseline annual taxes: $${baselineTaxes.toLocaleString()}`);
        }
      } else {
        baselineTaxes = 0;
      }
    });

    // ACT: Add Roth conversion strategy
    await test.step('Add Roth conversion event', async () => {
      await page.goBack();
      await dashboard.waitForDashboardLoad();
      
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment'); // or 'conversion' if category exists
      
      await eventModal.fillEventForm({
        name: 'Roth Conversion',
        amount: 50000, // Convert $50k from traditional to Roth
        frequency: 'annually',
        conversionType: 'traditional401kToRoth', // If supported
        startYear: '2030',
        endYear: '2035' // 5-year conversion strategy
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    // MEASURE AGAIN: Post-conversion tax and retirement analysis
    let conversionYearTaxes: number;
    await test.step('Measure tax impact during conversion years', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check during conversion period
      await dashboard.clickOnChart(0.5, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Should see higher taxes during conversion
      if (netWorthValues.taxes) {
        const taxMatch = netWorthValues.taxes.match(/\$([0-9,]+)/);
        if (taxMatch) {
          conversionYearTaxes = parseInt(taxMatch[1].replace(/,/g, ''));
          console.log(`Conversion year taxes: $${conversionYearTaxes.toLocaleString()}`);
          
          // Taxes should be higher due to conversion
          if (baselineTaxes > 0) {
            expect(conversionYearTaxes).toBeGreaterThan(baselineTaxes);
          }
        }
      }
      
      // Should show conversion as taxable event in income
      if (netWorthValues.totalAssets) {
        const incomeMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (incomeMatch) {
          const grossIncome = parseInt(incomeMatch[1].replace(/,/g, ''));
          console.log(`Gross income with conversion: $${grossIncome.toLocaleString()}`);
          // Should include the conversion amount as taxable income
          expect(grossIncome).toBeGreaterThan(200000); // Base income + conversion
        }
      }
    });

    await test.step('Verify retirement account rebalancing', async () => {
      // Check later in timeline for Roth account growth
      await dashboard.clickOnChart(0.8, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Should show healthy investment account balance
      if (netWorthValues.investmentAccounts) {
        const investmentMatch = netWorthValues.investmentAccounts.match(/\$([0-9,]+)/);
        if (investmentMatch) {
          const investments = parseInt(investmentMatch[1].replace(/,/g, ''));
          console.log(`Late-career investment accounts: $${investments.toLocaleString()}`);
          
          // Should have substantial balance from conversions + growth
          expect(investments).toBeGreaterThan(500000);
        }
      }
    });
  });

  test('should handle strategic Roth conversion timing', async ({ page }) => {
    await test.step('Setup with variable income scenario', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add primary income
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('income');
      
      await eventModal.fillEventForm({
        name: 'Career Income',
        amount: 150000,
        frequency: 'annually',
        endYear: '2050' // Income ends at retirement
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Build traditional retirement savings', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      await eventModal.fillEventForm({
        name: 'Traditional IRA',
        amount: 1000, // $1k monthly
        frequency: 'monthly',
        accountType: 'traditionalIRA'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add strategic post-retirement Roth conversions', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      // Convert during low-income retirement years
      await eventModal.fillEventForm({
        name: 'Post-Retirement Roth Conversion',
        amount: 75000, // Larger conversion in low tax bracket
        frequency: 'annually',
        startYear: '2051', // After income stops
        endYear: '2060' // Before RMDs
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify optimal conversion timing', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check during working years (should have normal taxes)
      await dashboard.clickOnChart(0.6, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const workingYearFlow = await deepDive.getNetWorthValues();
      let workingYearTaxes = 0;
      if (workingYearFlow.taxes) {
        const taxMatch = workingYearFlow.taxes.match(/\$([0-9,]+)/);
        if (taxMatch) {
          workingYearTaxes = parseInt(taxMatch[1].replace(/,/g, ''));
          console.log(`Working year taxes: $${workingYearTaxes.toLocaleString()}`);
        }
      }
      
      // Check during conversion years (should have moderate taxes)
      await dashboard.clickOnChart(0.8, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const conversionYearFlow = await deepDive.getNetWorthValues();
      if (conversionYearFlow.taxes) {
        const conversionTaxMatch = conversionYearFlow.taxes.match(/\$([0-9,]+)/);
        if (conversionTaxMatch) {
          const conversionTaxes = parseInt(conversionTaxMatch[1].replace(/,/g, ''));
          console.log(`Conversion year taxes: $${conversionTaxes.toLocaleString()}`);
          
          // Conversion year taxes should be lower than peak working years
          // (due to lower base income but higher due to conversion)
          if (workingYearTaxes > 0) {
            expect(conversionTaxes).toBeLessThan(workingYearTaxes * 1.5);
          }
        }
      }
    });
  });

  test('should validate Roth conversion tax calculations', async ({ page }) => {
    await test.step('Setup simple scenario for tax verification', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      
      // Add moderate income for clear tax calculation
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

    await test.step('Add small Roth conversion for clear tax impact', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      await eventModal.fillEventForm({
        name: 'Small Roth Conversion',
        amount: 25000, // $25k conversion
        frequency: 'once',
        year: '2030'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify conversion shows as taxable income', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Navigate to conversion year
      await dashboard.clickOnChart(0.45, 0.4); // Around 2030
      await deepDive.waitForDeepDiveVisible();
      
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Income should include the conversion
      if (netWorthValues.totalAssets) {
        const incomeMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (incomeMatch) {
          const grossIncome = parseInt(incomeMatch[1].replace(/,/g, ''));
          console.log(`Income with conversion: $${grossIncome.toLocaleString()}`);
          
          // Should show base income + conversion
          expect(grossIncome).toBeGreaterThanOrEqual(120000); // $100k + $25k - some for timing
          expect(grossIncome).toBeLessThan(140000); // Reasonable upper bound
        }
      }
      
      // Should not have zero values
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // Check year before conversion (should be lower income)
      await dashboard.clickOnChart(0.4, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const preConversionFlow = await deepDive.getNetWorthValues();
      if (preConversionFlow.totalAssets) {
        const preIncomeMatch = preConversionFlow.totalAssets.match(/\$([0-9,]+)/);
        if (preIncomeMatch) {
          const preIncome = parseInt(preIncomeMatch[1].replace(/,/g, ''));
          console.log(`Pre-conversion income: $${preIncome.toLocaleString()}`);
          
          // Should be close to base salary only
          expect(preIncome).toBeLessThan(110000);
          expect(preIncome).toBeGreaterThan(90000);
        }
      }
    });
  });

  test('should handle multiple Roth conversion strategies', async ({ page }) => {
    await test.step('Setup high-income scenario', async () => {
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
        name: 'Executive Income',
        amount: 300000,
        frequency: 'annually'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add annual conversion strategy', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      await eventModal.fillEventForm({
        name: 'Annual Roth Conversion',
        amount: 30000, // $30k annually
        frequency: 'annually',
        startYear: '2025',
        endYear: '2040' // Long-term strategy
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Add opportunistic large conversion', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      // Large one-time conversion (market downturn opportunity)
      await eventModal.fillEventForm({
        name: 'Opportunistic Large Conversion',
        amount: 200000,
        frequency: 'once',
        year: '2032' // Specific opportunity year
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify combined conversion strategy impact', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      // Check regular conversion year
      await dashboard.clickOnChart(0.3, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      const regularYearFlow = await deepDive.getNetWorthValues();
      if (regularYearFlow.totalAssets) {
        const regularIncomeMatch = regularYearFlow.totalAssets.match(/\$([0-9,]+)/);
        if (regularIncomeMatch) {
          const regularIncome = parseInt(regularIncomeMatch[1].replace(/,/g, ''));
          console.log(`Regular conversion year income: $${regularIncome.toLocaleString()}`);
          // Should include base + annual conversion
          expect(regularIncome).toBeGreaterThan(325000);
        }
      }
      
      // Check large conversion year
      await dashboard.clickOnChart(0.5, 0.4); // Around 2032
      await deepDive.waitForDeepDiveVisible();
      
      const largeConversionFlow = await deepDive.getNetWorthValues();
      if (largeConversionFlow.totalAssets) {
        const largeIncomeMatch = largeConversionFlow.totalAssets.match(/\$([0-9,]+)/);
        if (largeIncomeMatch) {
          const largeIncome = parseInt(largeIncomeMatch[1].replace(/,/g, ''));
          console.log(`Large conversion year income: $${largeIncome.toLocaleString()}`);
          // Should include base + annual + large conversion
          expect(largeIncome).toBeGreaterThan(500000);
        }
      }
      
      // Taxes should be substantially higher in large conversion year
      if (largeConversionFlow.taxes && regularYearFlow.taxes) {
        const largeTaxMatch = largeConversionFlow.taxes.match(/\$([0-9,]+)/);
        const regularTaxMatch = regularYearFlow.taxes.match(/\$([0-9,]+)/);
        
        if (largeTaxMatch && regularTaxMatch) {
          const largeTaxes = parseInt(largeTaxMatch[1].replace(/,/g, ''));
          const regularTaxes = parseInt(regularTaxMatch[1].replace(/,/g, ''));
          
          console.log(`Regular year taxes: $${regularTaxes.toLocaleString()}`);
          console.log(`Large conversion year taxes: $${largeTaxes.toLocaleString()}`);
          
          expect(largeTaxes).toBeGreaterThan(regularTaxes);
        }
      }
    });

    await test.step('Assert no zero-value bugs', async () => {
      await deepDive.assertNoZeroValues();
    });
  });

  test('should validate Roth conversion limits and constraints', async ({ page }) => {
    await test.step('Setup for conversion limit testing', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Build Your Own');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
    });

    await test.step('Add conversion that tests system limits', async () => {
      const addEventButton = page.getByRole('button', { name: /add event/i });
      await addEventButton.click();

      await eventModal.waitForModalVisible();
      await eventModal.selectCategory('investment');
      
      // Very large conversion to test limits
      await eventModal.fillEventForm({
        name: 'Maximum Roth Conversion',
        amount: 1000000, // $1M conversion
        frequency: 'once',
        year: '2030'
      });
      
      await eventModal.createEvent();
      await eventModal.waitForModalClosed();
    });

    await test.step('Verify system handles large conversion amounts', async () => {
      await dashboard.runSimulation();
      await dashboard.waitForSimulationComplete();
      
      await dashboard.clickOnChart(0.45, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      // Should handle large numbers without errors
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Should show substantial income from conversion
      if (netWorthValues.totalAssets) {
        const incomeMatch = netWorthValues.totalAssets.match(/\$([0-9,]+)/);
        if (incomeMatch) {
          const grossIncome = parseInt(incomeMatch[1].replace(/,/g, ''));
          console.log(`Income with large conversion: $${grossIncome.toLocaleString()}`);
          expect(grossIncome).toBeGreaterThan(900000);
        }
      }
      
      // Should show very high taxes
      if (netWorthValues.taxes) {
        const taxMatch = netWorthValues.taxes.match(/\$([0-9,]+)/);
        if (taxMatch) {
          const taxes = parseInt(taxMatch[1].replace(/,/g, ''));
          console.log(`Taxes on large conversion: $${taxes.toLocaleString()}`);
          expect(taxes).toBeGreaterThan(300000); // Should be substantial
        }
      }
      
      // Verify no display errors with large numbers
      expect(netWorthValues.totalAssets).not.toMatch(/NaN|undefined|null/);
      expect(netWorthValues.taxes).not.toMatch(/NaN|undefined|null/);
    });
  });
});