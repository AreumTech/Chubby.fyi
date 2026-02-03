/**
 * Reusable helpers for E2E tests
 */

/**
 * Checks for any lingering onboarding modal and dismisses it
 * This should no longer be needed since we disabled it at the router level,
 * but kept as a safety fallback
 */
async function dismissOnboardingModal(page) {
  // Quick check - modal should not appear anymore
  await page.waitForTimeout(500);
  
  const modalBackdrop = page.locator('.modal-backdrop, .onboarding-choice-backdrop');
  if (await modalBackdrop.count() > 0) {
    console.log('Unexpected modal detected - removing as fallback');
    await page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop, .onboarding-choice-backdrop').forEach(el => el.remove());
    });
    await page.waitForTimeout(500);
  }
}

/**
 * Standard setup for test harness E2E tests
 * - Navigates to test harness
 * - Waits for page to load
 * - Dismisses onboarding modal
 * - Confirms WASM is available
 */
async function setupTestHarness(page) {
  await page.goto('http://localhost:5175/test-harness');
  
  // Wait for page to load
  await page.getByRole('button', { name: '🚀 Run Simulation from JSON' }).waitFor({ timeout: 10000 });
  
  // Dismiss modal
  await dismissOnboardingModal(page);
  
  // Confirm WASM is available
  await page.locator('text=Available').waitFor({ timeout: 15000 });
  console.log('Test harness setup complete - WASM available');
}

module.exports = {
  dismissOnboardingModal,
  setupTestHarness
};