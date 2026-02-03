/**
 * Trace Simulation Hang - Capture all console output
 */

const { test } = require('@playwright/test');

test('trace simulation execution and hang', async ({ page }) => {
  // Capture ALL console messages, not just specific ones
  const allConsoleMessages = [];
  page.on('console', msg => {
    const message = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    allConsoleMessages.push(message);
    console.log(message); // Also log to test output immediately
  });

  await page.goto('/test-harness');
  
  // Wait for app to initialize
  await page.waitForTimeout(5000);
  
  // Remove modals aggressively
  await page.evaluate(() => {
    document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop, .modal').forEach(el => el.remove());
  });
  
  console.log('=== WAITING FOR WASM ===');
  
  // Wait for WASM to be available
  await page.waitForTimeout(15000);
  const wasmAvailable = await page.locator('text=Available').count() > 0;
  console.log('WASM Available:', wasmAvailable);
  
  if (!wasmAvailable) {
    console.log('WASM not available - cannot test simulation hang');
    return;
  }
  
  console.log('=== CREATING ULTRA-MINIMAL TEST CASE ===');
  
  // Ultra-minimal: just cash, no events, 1 month
  const ultraMinimal = {
    initialAccounts: { 
      cash: 1000 
    },
    events: [], // NO EVENTS - just test the basic month loop
    config: {
      expectedReturns: { CASH: 0.02 },
      volatilities: { CASH: 0.01 }
    },
    monthsToRun: 1,
    withdrawalStrategy: { strategy: 'taxable_first' }
  };
  
  const jsonEditor = page.locator('textarea[placeholder*="SimulationInput"]');
  await jsonEditor.fill(JSON.stringify(ultraMinimal, null, 2));
  
  console.log('=== STARTING SIMULATION (NO EVENTS, 1 MONTH) ===');
  
  // Start simulation and monitor
  await page.evaluate(() => {
    document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop').forEach(el => el.remove());
  });
  
  const runButton = page.locator('button:has-text("Run Simulation from JSON")');
  await runButton.click({ force: true });
  
  console.log('=== SIMULATION STARTED - WAITING 20 SECONDS ===');
  
  // Wait exactly 20 seconds and check if it completed
  await page.waitForTimeout(20000);
  
  const completed = await page.locator('text=✅ Simulation Completed').count() > 0;
  const errored = await page.locator('text=❌ Error').count() > 0;
  const running = await page.locator('text=Running...').count() > 0;
  
  console.log('=== FINAL STATUS ===');
  console.log('Completed:', completed);
  console.log('Errored:', errored);
  console.log('Still Running:', running);
  
  if (!completed && !errored) {
    console.log('🚨 CONFIRMED: Even 0-event, 1-month simulation hangs');
    console.log('This proves the hang is in the basic month loop or initialization');
  }
  
  console.log('\n=== ALL CONSOLE MESSAGES ===');
  allConsoleMessages.forEach((msg, i) => {
    console.log(`${i+1}: ${msg}`);
  });
});