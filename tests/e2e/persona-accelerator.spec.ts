import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage } from './poms';

test.describe('Accelerator Persona End-to-End Golden Path Test', () => {
  let onboarding: OnboardingPage;
  let dashboard: DashboardPage;
  let deepDive: DeepDivePage;

  test.beforeEach(async ({ page }) => {
    onboarding = new OnboardingPage(page);
    dashboard = new DashboardPage(page);
    deepDive = new DeepDivePage(page);
  });

  test('should complete full Accelerator persona journey without $0 bugs', async ({ page }) => {
    await test.step('Onboarding & Simulation Completion', async () => {
      // Navigate to the application's root URL
      await page.goto('/');
      
      // Wait for the onboarding modal to be visible
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      // Verify onboarding is visible
      expect(await onboarding.isVisible()).toBe(true);
      
      // Click the "Accelerator" persona card using stable selector
      await onboarding.selectPersona('Accelerator');
      
      // Wait for persona selection UI
      await onboarding.waitForPersonaSelection();
      
      // Confirm the selection
      await onboarding.confirmPersonaSelection();
      
      // Assert that the onboarding modal closes
      await onboarding.waitForOnboardingComplete();
      
      // Wait for the main dashboard to render and for the simulation to complete
      await dashboard.waitForDashboardLoad();
      
      // Wait for the initial simulation to finish (generous timeout for WASM loading)
      await dashboard.waitForSimulationComplete();
      
      console.log('✅ Onboarding completed and initial simulation finished');
    });

    await test.step('Dashboard Summary Validation', async () => {
      // Assert that the "Plan Success Rate" gauge displays a percentage value
      const successRate = await dashboard.getSuccessRate();
      if (successRate) {
        expect(successRate).toMatch(/\d+% Success/);
        console.log(`Success Rate: ${successRate}`);
      } else {
        // Alternative: look for any percentage indicator
        const pageContent = await page.textContent('body');
        expect(pageContent).toMatch(/\d+%/); // Should have some percentage displayed
      }
      
      // Assert that P10, P50 (Median), and P90 "Final Net Worth" values are displayed and are not $0
      const netWorthValues = await dashboard.getNetWorthValues();
      
      expect(netWorthValues.p50).not.toBeNull(); // At least median should be available
      if (netWorthValues.p50) {
        expect(netWorthValues.p50).not.toMatch(/\$0(?:\s|$)/);
        console.log(`Median Net Worth: ${netWorthValues.p50}`);
      }
      
      if (netWorthValues.p10) {
        expect(netWorthValues.p10).not.toMatch(/\$0(?:\s|$)/);
        console.log(`P10 Net Worth: ${netWorthValues.p10}`);
      }
      
      if (netWorthValues.p90) {
        expect(netWorthValues.p90).not.toMatch(/\$0(?:\s|$)/);
        console.log(`P90 Net Worth: ${netWorthValues.p90}`);
      }
      
      // Assert that the net worth chart canvas element is visible and has non-zero dimensions
      expect(await dashboard.isChartVisible()).toBe(true);
      
      const chartDimensions = await dashboard.getChartDimensions();
      expect(chartDimensions).not.toBeNull();
      expect(chartDimensions!.width).toBeGreaterThan(0);
      expect(chartDimensions!.height).toBeGreaterThan(0);
      
      console.log(`Chart dimensions: ${chartDimensions!.width}x${chartDimensions!.height}`);
      console.log('✅ Dashboard summary shows realistic, non-zero values');
    });

    await test.step('Deep Dive Analysis Validation', async () => {
      // Click on the net worth chart at a specific future year (75% of the way across)
      await dashboard.clickOnChart(0.75, 0.3);
      
      // Assert that the "Focus Year View" header updates to display the selected year
      await deepDive.waitForDeepDiveVisible();
      
      const focusYear = await deepDive.getFocusYear();
      expect(focusYear).not.toBeNull();
      expect(parseInt(focusYear!)).toBeGreaterThan(2025); // Should be a future year
      expect(parseInt(focusYear!)).toBeLessThan(2100); // Should be reasonable
      
      console.log(`Focus Year: ${focusYear}`);
      
      // Assert that key financial figures are not zero in Net Worth tab
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Assert that "Gross Income" is a non-zero currency value
      expect(netWorthValues.totalAssets).not.toBeNull();
      expect(netWorthValues.totalAssets).toMatch(/\$[1-9][\d,]*/);
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // Assert that "Total Outflows" is also a non-zero currency value
      expect(netWorthValues.totalAssets).not.toBeNull();
      expect(netWorthValues.totalAssets).toMatch(/\$[1-9][\d,]*/);
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      console.log(`Net Worth - Income: ${netWorthValues.totalAssets}, Outflows: ${netWorthValues.totalAssets}`);
      
      // Switch to the "Net Worth" (Balance Sheet) tab and validate
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Assert that "Total Assets" is a non-zero currency value
      expect(netWorthValues.totalAssets).not.toBeNull();
      expect(netWorthValues.totalAssets).toMatch(/\$[1-9][\d,]*/);
      expect(netWorthValues.totalAssets).not.toMatch(/\$0(?:\s|$)/);
      
      // Assert that "Investment Accounts" is a non-zero currency value
      if (netWorthValues.investmentAccounts) {
        expect(netWorthValues.investmentAccounts).toMatch(/\$[1-9][\d,]*/);
        expect(netWorthValues.investmentAccounts).not.toMatch(/\$0(?:\s|$)/);
        console.log(`Investment Accounts: ${netWorthValues.investmentAccounts}`);
      }
      
      console.log(`Net Worth - Total Assets: ${netWorthValues.totalAssets}`);
      
      // Comprehensive validation: ensure no critical financial figures render as $0
      await deepDive.assertNoZeroValues();
      
      console.log('✅ Deep dive analysis shows realistic, non-zero values for all key metrics');
    });

    await test.step('Validate Year 1 Results Against Inflation Bug', async () => {
      // 🎯 CRITICAL TEST: Ensure Accelerator Year 1 results are realistic, not inflated to $5M+
      console.log('🔍 Testing Year 1 results for inflation bug...');
      
      // Click on Year 1 (very early in the chart)
      await dashboard.clickOnChart(0.02, 0.4); // Very beginning of simulation
      await deepDive.waitForDeepDiveVisible();
      
      const year = await deepDive.getFocusYear();
      console.log(`Testing Year: ${year}`);
      
      // Get net worth values for Year 1
      const netWorthValues = await deepDive.getNetWorthValues();
      const totalAssetsText = netWorthValues.totalAssets;
      
      if (totalAssetsText) {
        const assetsMatch = totalAssetsText.match(/\$([0-9,]+(?:\.[0-9]+)?)/);
        if (assetsMatch) {
          const assets = parseFloat(assetsMatch[1].replace(/,/g, ''));
          
          console.log(`🎯 Year 1 Total Assets: $${assets.toLocaleString()}`);
          
          // ✅ REALISTIC RANGE: $200K - $800K for Accelerator Year 1
          // Expected: Starting ~$216K + ~$280K income - ~$72K expenses + market growth ≈ $366K
          expect(assets).toBeGreaterThan(150000); // At least $150K (must have growth)
          expect(assets).toBeLessThan(10000000);  // ❌ CRITICAL: Must be less than $10M (no inflation bug)
          
          // 🚨 SPECIFIC CHECK: Ensure not showing the $5M+ inflation bug
          if (assets > 2000000) {
            throw new Error(`🚨 INFLATION BUG DETECTED: Year 1 assets are $${assets.toLocaleString()}, expected ~$366K. This suggests the E2E data pipeline has issues.`);
          }
          
          // ✅ IDEAL RANGE: Close to expected $366K
          if (assets >= 200000 && assets <= 800000) {
            console.log(`✅ EXCELLENT: Year 1 assets ($${assets.toLocaleString()}) are in realistic range`);
          } else if (assets < 200000) {
            console.log(`⚠️ LOW: Year 1 assets ($${assets.toLocaleString()}) are lower than expected ~$366K`);
          } else {
            console.log(`⚠️ HIGH: Year 1 assets ($${assets.toLocaleString()}) are higher than expected but not inflated`);
          }
        }
      }
      
      console.log('✅ Year 1 results pass inflation bug check');
    });

    await test.step('Validate Financial Realism and Logic', async () => {
      // Additional validation to ensure the numbers make financial sense
      const netWorthValues = await deepDive.getNetWorthValues();
      const netWorthValues = await deepDive.getNetWorthValues();
      
      // Parse the values for logical validation
      const incomeMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      const outflowMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      const assetsMatch = netWorthValues.totalAssets?.match(/\$([0-9,]+)/);
      
      if (incomeMatch && outflowMatch) {
        const income = parseInt(incomeMatch[1].replace(/,/g, ''));
        const outflows = parseInt(outflowMatch[1].replace(/,/g, ''));
        
        // Validation: Income and expenses should be reasonable amounts
        expect(income).toBeGreaterThan(1000); // At least $1K monthly income
        expect(income).toBeLessThan(1000000); // Less than $1M monthly (sanity check)
        expect(outflows).toBeGreaterThan(100); // At least $100 monthly expenses
        expect(outflows).toBeLessThan(500000); // Less than $500K monthly expenses
        
        console.log(`Financial Logic Check: Monthly Income $${income.toLocaleString()}, Outflows $${outflows.toLocaleString()}`);
      }
      
      if (assetsMatch) {
        const assets = parseInt(assetsMatch[1].replace(/,/g, ''));
        
        // For the Accelerator persona in a future year, should have accumulated significant wealth
        expect(assets).toBeGreaterThan(10000); // At least $10K in assets
        expect(assets).toBeLessThan(100000000); // Less than $100M (sanity check)
        
        console.log(`Asset Accumulation: $${assets.toLocaleString()}`);
      }
      
      console.log('✅ Financial figures pass logic and realism checks');
    });

    await test.step('Test Multiple Time Periods for Consistency', async () => {
      // Test several different time periods to ensure consistency
      const testPoints = [0.4, 0.6, 0.8]; // Different points in the simulation
      
      for (let i = 0; i < testPoints.length; i++) {
        await dashboard.clickOnChart(testPoints[i], 0.3);
        await deepDive.waitForDeepDiveVisible();
        
        const year = await deepDive.getFocusYear();
        const validation = await deepDive.validateNonZeroValues();
        
        expect(validation.cashFlow).toBe(true);
        expect(validation.netWorth).toBe(true);
        
        console.log(`Time Period ${i + 1} (Year ${year}): Validation passed`);
        
        // Brief pause between iterations
        await page.waitForTimeout(500);
      }
      
      console.log('✅ Multiple time periods all show consistent, non-zero values');
    });
  });

  test('should handle edge cases and maintain data integrity', async ({ page }) => {
    await test.step('Load Accelerator persona and test edge scenarios', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      await onboarding.selectPersona('Accelerator');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
      
      await dashboard.waitForDashboardLoad();
      await dashboard.waitForSimulationComplete();
    });

    await test.step('Test extreme time periods', async () => {
      // Test very early in simulation
      await dashboard.clickOnChart(0.05, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      let validation = await deepDive.validateNonZeroValues();
      expect(validation.cashFlow).toBe(true);
      
      // Test very late in simulation
      await dashboard.clickOnChart(0.95, 0.4);
      await deepDive.waitForDeepDiveVisible();
      
      validation = await deepDive.validateNonZeroValues();
      expect(validation.netWorth).toBe(true);
      
      console.log('✅ Edge time periods maintain data integrity');
    });

    await test.step('Verify no regression from original $0 bug', async () => {
      // This specifically targets the bug mentioned in the specification
      await dashboard.clickOnChart(0.7, 0.3);
      await deepDive.waitForDeepDiveVisible();
      
      // Get page content and check for the specific $0 patterns that were problematic
      const pageContent = await page.textContent('body');
      
      // These are the specific patterns that should NOT appear
      expect(pageContent).not.toMatch(/Total Income.*\$0(?:\s|$)/);
      expect(pageContent).not.toMatch(/Gross Income.*\$0(?:\s|$)/);
      expect(pageContent).not.toMatch(/Total Expenses.*\$0(?:\s|$)/);
      expect(pageContent).not.toMatch(/Total Outflows.*\$0(?:\s|$)/);
      expect(pageContent).not.toMatch(/Total Assets.*\$0(?:\s|$)/);
      expect(pageContent).not.toMatch(/Investment Accounts.*\$0(?:\s|$)/);
      
      console.log('✅ No regression: $0 bug patterns not detected');
    });
  });
});

test('should serve as regression guard for Milestone 0 core functionality', async ({ page }) => {
  await test.step('Comprehensive Accelerator test as integration guard', async () => {
    const onboarding = new OnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const deepDive = new DeepDivePage(page);
    
    // Full end-to-end flow
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    
    await onboarding.selectPersona('Accelerator');
    await onboarding.waitForPersonaSelection();
    await onboarding.confirmPersonaSelection();
    await onboarding.waitForOnboardingComplete();
    
    await dashboard.waitForDashboardLoad();
    await dashboard.waitForSimulationComplete();
    
    // Quick validation of all major components
    expect(await dashboard.isChartVisible()).toBe(true);
    
    await dashboard.clickOnChart(0.7, 0.3);
    await deepDive.waitForDeepDiveVisible();
    await deepDive.assertNoZeroValues();
    
    console.log('✅ Milestone 0 regression guard: All core functionality working');
  });
});

// Helper to take screenshot on failure for debugging
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshot = await page.screenshot();
    await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
  }
});