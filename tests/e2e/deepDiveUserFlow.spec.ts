/**
 * Deep Dive User Flow E2E Tests
 * 
 * Tests the complete user journey that would reveal the deep dive $0 issue.
 * Simulates the exact scenario: select accelerator persona → click year in chart → check deep dive values.
 */

import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage, DeepDivePage } from './poms';

test.describe('Deep Dive Analysis User Flow', () => {
  let onboarding: OnboardingPage;
  let dashboard: DashboardPage;
  let deepDive: DeepDivePage;
  
  test.beforeEach(async ({ page }) => {
    onboarding = new OnboardingPage(page);
    dashboard = new DashboardPage(page);
    deepDive = new DeepDivePage(page);
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should show non-zero values in deep dive after selecting accelerator persona', async ({ page }) => {
    // Step 1: Select the Accelerator persona
    await test.step('Select Accelerator persona', async () => {
      await onboarding.selectPersona('Accelerator');
      await onboarding.waitForPersonaSelection();
      await onboarding.confirmPersonaSelection();
      await onboarding.waitForOnboardingComplete();
    });

    // Step 2: Wait for simulation to complete
    await test.step('Wait for simulation completion', async () => {
      await dashboard.waitForDashboardLoad();
      await dashboard.waitForSimulationComplete();
    });

    // Step 3: Click on a year in the net worth chart
    await test.step('Click on net worth chart', async () => {
      await dashboard.clickOnChart(0.7, 0.3);
    });

    // Step 4: Verify deep dive analysis shows non-zero values
    await test.step('Verify deep dive shows non-zero financial values', async () => {
      await deepDive.waitForDeepDiveVisible();
      
      // Verify non-zero values using POM
      const validation = await deepDive.validateNonZeroValues();
      expect(validation.cashFlow).toBe(true);
      expect(validation.netWorth).toBe(true);
      
      // Assert no zero-value bugs
      await deepDive.assertNoZeroValues();

      // Log success for debugging
      console.log('✅ Deep dive shows non-zero financial values');
    });
  });

  test('should detect and report simulation data issues in development mode', async ({ page }) => {
    // Only run in development mode
    if (process.env.NODE_ENV === 'production') {
      test.skip();
    }

    // Enable debug mode if available
    await page.addInitScript(() => {
      (window as any).DEBUG_SIMULATION = true;
    });

    await test.step('Load app with debug mode', async () => {
      await page.goto('/?debug=true');
      await page.waitForSelector('[data-testid="app-container"]');
    });

    await test.step('Check for simulation debug panel', async () => {
      // Look for our debug panel
      const debugPanel = page.locator('[data-testid="simulation-debug-panel"]').or(
        page.locator('text=Simulation Debug')
      );

      // Click accelerator to trigger simulation
      const acceleratorButton = page.locator('button:has-text("Accelerator")').first();
      if (await acceleratorButton.isVisible()) {
        await acceleratorButton.click();
        await page.waitForTimeout(3000);
      }

      // Check if debug panel appears and shows status
      if (await debugPanel.isVisible()) {
        // Verify debug panel shows good status
        await expect(debugPanel).not.toContainText('ALL ZERO');
        await expect(debugPanel).not.toContainText('FAIL');
        
        console.log('✅ Debug panel shows healthy simulation data');
      } else {
        console.log('ℹ️ Debug panel not visible (may not be enabled)');
      }
    });
  });

  test('should handle different personas without showing $0 in deep dive', async ({ page }) => {
    const personas = ['Accelerator', 'Conservative', 'Early Retirement'];
    
    for (const persona of personas) {
      await test.step(`Test ${persona} persona deep dive`, async () => {
        // Select persona
        const personaButton = page.locator(`button:has-text("${persona}")`).first();
        
        if (await personaButton.isVisible()) {
          await personaButton.click();
          await page.waitForTimeout(2000);
          
          // Wait for simulation
          await page.waitForTimeout(3000);
          
          // Click somewhere on chart or select a year
          const chart = page.locator('canvas').first();
          if (await chart.isVisible()) {
            const box = await chart.boundingBox();
            if (box) {
              await chart.click({ position: { x: box.width * 0.6, y: box.height * 0.4 } });
              await page.waitForTimeout(1000);
            }
          }
          
          // Check for non-zero values
          const pageContent = await page.textContent('body');
          
          // Should not see $0 for Total Income or Total Expenses
          expect(pageContent).not.toMatch(/Total Income.*\$0(?:\s|$)/);
          expect(pageContent).not.toMatch(/Total Expenses.*\$0(?:\s|$)/);
          
          console.log(`✅ ${persona} persona shows non-zero deep dive values`);
        } else {
          console.log(`⚠️ ${persona} persona button not found`);
        }
      });
    }
  });

  test('should provide useful error messages when simulation data is missing', async ({ page }) => {
    await test.step('Intercept and block simulation data', async () => {
      // Block or mock simulation endpoints to simulate data loading issues
      await page.route('**/api/simulation/**', route => route.abort());
      await page.route('**/pathfinder.wasm', route => route.abort());
    });

    await test.step('Attempt to use app with blocked data', async () => {
      await page.goto('/');
      
      // Try to select a persona
      const acceleratorButton = page.locator('button:has-text("Accelerator")').first();
      if (await acceleratorButton.isVisible()) {
        await acceleratorButton.click();
        await page.waitForTimeout(3000);
      }
      
      // Should see some kind of error or loading state
      const errorIndicators = [
        page.locator('text=Error'),
        page.locator('text=Failed'),
        page.locator('text=Loading'),
        page.locator('text=Unable to load'),
        page.locator('[data-testid="error-message"]')
      ];
      
      let errorFound = false;
      for (const indicator of errorIndicators) {
        if (await indicator.isVisible()) {
          errorFound = true;
          break;
        }
      }
      
      // Either we should see an error, or the app should gracefully degrade
      // without showing misleading $0 values
      if (!errorFound) {
        const pageContent = await page.textContent('body');
        // If no error shown, at least shouldn't see $0 everywhere
        expect(pageContent).not.toMatch(/\$0.*\$0.*\$0/); // Multiple $0s suggesting broken data
      }
      
      console.log('✅ App handles missing simulation data appropriately');
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