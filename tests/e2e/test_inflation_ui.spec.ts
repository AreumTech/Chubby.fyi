import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage } from './poms';

test.describe('Inflation Bug Verification', () => {
  let onboarding: OnboardingPage;
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    onboarding = new OnboardingPage(page);
    dashboard = new DashboardPage(page);
  });

  test('should verify Accelerator persona shows realistic values, not inflated billions', async ({ page }) => {
    console.log('🎯 Testing for inflation bug in Accelerator persona...');
    
    await test.step('Load Accelerator persona', async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 15000 });
      
      await onboarding.selectPersona('Accelerator');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
    });

    await test.step('Wait for simulation to complete', async () => {
      await dashboard.waitForDashboardLoad();
      await page.waitForTimeout(10000); // Give simulation time to complete
    });

    await test.step('Check for inflation bug values', async () => {
      // Get the full page content
      const pageContent = await page.content();
      
      console.log('🔍 Checking page for inflation values...');
      
      // Check for billion dollar values (inflation bug indicators)
      const billionValues = pageContent.match(/\$[\d,]+\.?\d*B/g) || [];
      const specificInflationValues = [
        pageContent.includes('204.8B'),
        pageContent.includes('$204.8B'), 
        pageContent.includes('2.7B'),
        pageContent.includes('$2.7B')
      ];
      
      console.log('💰 Billion dollar values found:', billionValues);
      console.log('🚨 Specific inflation indicators:', specificInflationValues);
      
      // Log all significant dollar amounts for analysis
      const allDollarAmounts = pageContent.match(/\$[\d,]+\.?\d*[KMB]?/g) || [];
      console.log('💵 All dollar amounts (first 20):', allDollarAmounts.slice(0, 20));
      
      // THE KEY TEST: Should NOT see billion dollar values
      if (billionValues.length > 0) {
        console.log('❌ INFLATION BUG DETECTED: Found billion dollar values');
        billionValues.forEach(val => console.log(`   - ${val}`));
        
        // Fail the test if we find inflation values
        expect(billionValues.length).toBe(0);
      } else {
        console.log('✅ No billion dollar inflation values detected');
      }
      
      // Additional check: Look for FI goal specifically
      const fiGoalMatch = pageContent.match(/FI target: \$[\d\.]+[KMB] for \$[\d,]+[KMB]?\/month/);
      if (fiGoalMatch) {
        console.log('🎯 FI Goal found:', fiGoalMatch[0]);
        
        // Should NOT contain billion values in FI goal
        expect(fiGoalMatch[0]).not.toContain('B');
      }
      
      // Look for success probability range
      const rangeMatch = pageContent.match(/\$[\d\.]+[KMB]-\$[\d\.]+[KMB]/);
      if (rangeMatch) {
        console.log('📊 Range found:', rangeMatch[0]);
        
        // Should NOT contain billion values in range
        expect(rangeMatch[0]).not.toContain('B');
      }
    });
  });
});