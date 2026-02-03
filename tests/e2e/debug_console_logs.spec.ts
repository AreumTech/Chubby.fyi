import playwright from '@playwright/test';
const { test, expect } = playwright;
import { OnboardingPage, DashboardPage } from './poms';

test.describe('Debug Console Logs', () => {
  let onboarding: OnboardingPage;
  let dashboard: DashboardPage;
  let consoleLogs: Array<{ type: string; text: string }> = [];

  test.beforeEach(async ({ page }) => {
    onboarding = new OnboardingPage(page);
    dashboard = new DashboardPage(page);
    
    // Capture all console logs
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
    });
  });

  test('should capture console logs from Accelerator persona loading and simulation', async ({ page }) => {
    console.log('🎯 Starting console log capture test...');
    
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
      await page.waitForTimeout(15000); // Extra time for simulation
    });

    await test.step('Analyze console logs', async () => {
      console.log(`📋 Captured ${consoleLogs.length} console messages`);
      
      // Look for our debug messages
      const debugMessages = consoleLogs.filter(log => 
        log.text.includes('[WASM_BOUNDARY]') || 
        log.text.includes('[SIMULATION_SERVICE]') ||
        log.text.includes('[PersonaLoader]') ||
        log.text.includes('[INFLATION_FIX]') ||
        log.text.includes('[WorkerConversion]') ||
        log.text.includes('LARGE EVENTS DETECTED')
      );
      
      console.log(`🔍 Found ${debugMessages.length} debug messages:`);
      debugMessages.forEach((msg, i) => {
        console.log(`  ${i + 1}. [${msg.type}] ${msg.text}`);
      });
      
      // Look for any simulation-related logs
      const simulationLogs = consoleLogs.filter(log =>
        log.text.includes('simulation') ||
        log.text.includes('WASM') ||
        log.text.includes('preprocessing') ||
        log.text.includes('event')
      );
      
      console.log(`\n📊 Found ${simulationLogs.length} simulation-related messages:`);
      simulationLogs.slice(0, 10).forEach((msg, i) => {
        console.log(`  ${i + 1}. [${msg.type}] ${msg.text.substring(0, 100)}...`);
      });
      
      // Look for error messages
      const errorLogs = consoleLogs.filter(log => log.type === 'error');
      if (errorLogs.length > 0) {
        console.log(`\n❌ Found ${errorLogs.length} error messages:`);
        errorLogs.forEach((msg, i) => {
          console.log(`  ${i + 1}. ${msg.text}`);
        });
      }
      
      // Key test: Check if our debug logging is working
      const hasDebugLogs = debugMessages.length > 0;
      console.log(`\n🎯 Debug logging working: ${hasDebugLogs ? '✅ YES' : '❌ NO'}`);
      
      if (!hasDebugLogs) {
        console.log('❌ No debug logs found - our changes may not be deployed or used');
      }
    });
  });
});