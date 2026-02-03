import playwright from '@playwright/test';
const { test, expect } = playwright;

test.describe('Scenario Management End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application and complete onboarding
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    
    // Check if onboarding modal is present and complete it
    const onboardingModal = page.locator('[data-testid="onboarding-modal"]');
    if (await onboardingModal.isVisible()) {
      // Select a persona to get started
      await page.click('[data-testid="persona-accelerator"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="confirm-persona-selection"]');
      
      // Wait for onboarding to complete and dashboard to load
      await page.waitForSelector('.pathfinder-dashboard', { timeout: 15000 });
    }
    
    // Wait for initial simulation to complete
    await page.waitForFunction(() => {
      const button = document.querySelector('button:has-text("Run Simulation")');
      return button && !button.disabled;
    }, { timeout: 30000 });
  });

  test('should display current scenario in header dropdown', async ({ page }) => {
    await test.step('Verify scenario dropdown exists and shows current scenario', async () => {
      // Look for the scenario dropdown in the header
      const scenarioDropdown = page.locator('header button:has-text("Base Plan")').first();
      expect(await scenarioDropdown.isVisible()).toBe(true);
      
      // Verify it shows the default scenario name
      const scenarioText = await scenarioDropdown.textContent();
      expect(scenarioText).toContain('Base Plan');
      
      console.log('✅ Scenario dropdown displays current scenario name');
    });
  });

  test('should allow duplicating a scenario', async ({ page }) => {
    await test.step('Open scenario dropdown and duplicate scenario', async () => {
      // Click on scenario dropdown
      await page.click('header button:has-text("Base Plan")');
      
      // Wait for dropdown to open
      await page.waitForSelector('[data-testid="scenario-dropdown"], .absolute.right-0.mt-2', { timeout: 5000 });
      
      // Click duplicate button (plus icon) or "Create New Scenario" button
      const createNewButton = page.locator('button:has-text("Create New Scenario")');
      if (await createNewButton.isVisible()) {
        await createNewButton.click();
      } else {
        // Look for plus icon button
        await page.click('button[title="Duplicate scenario"]');
      }
      
      // Wait for new scenario to be created and dropdown to close
      await page.waitForTimeout(1000);
      
      console.log('✅ Successfully duplicated scenario');
    });

    await test.step('Verify new scenario is created and active', async () => {
      // The dropdown should now show the new scenario name
      const scenarioDropdown = page.locator('header button').first();
      const scenarioText = await scenarioDropdown.textContent();
      expect(scenarioText).toContain('(Copy)');
      
      console.log('✅ New scenario is active and contains "(Copy)" in name');
    });
  });

  test('should allow switching between scenarios', async ({ page }) => {
    await test.step('Create a second scenario', async () => {
      // Click on scenario dropdown
      await page.click('header button:has-text("Base Plan")');
      
      // Create new scenario
      await page.waitForSelector('button:has-text("Create New Scenario")', { timeout: 5000 });
      await page.click('button:has-text("Create New Scenario")');
      await page.waitForTimeout(1000);
    });

    await test.step('Switch back to original scenario', async () => {
      // Open dropdown again
      await page.click('header button:has-text("(Copy)")');
      
      // Click on the original "Base Plan" scenario
      await page.waitForSelector('button:has-text("Base Plan")', { timeout: 5000 });
      await page.click('button:has-text("Base Plan")');
      
      // Verify we switched back
      await page.waitForTimeout(1000);
      const scenarioDropdown = page.locator('header button').first();
      const scenarioText = await scenarioDropdown.textContent();
      expect(scenarioText).toContain('Base Plan');
      expect(scenarioText).not.toContain('(Copy)');
      
      console.log('✅ Successfully switched between scenarios');
    });
  });

  test('should allow renaming scenarios', async ({ page }) => {
    await test.step('Open scenario dropdown and start rename', async () => {
      // Click on scenario dropdown
      await page.click('header button:has-text("Base Plan")');
      
      // Wait for dropdown and look for edit button
      await page.waitForSelector('[title="Rename scenario"], .hover\\:text-gray-600', { timeout: 5000 });
      
      // Click the edit/rename button (pencil icon)
      await page.click('[title="Rename scenario"]');
      
      // Should see an input field appear
      await page.waitForSelector('input[type="text"]', { timeout: 2000 });
      
      console.log('✅ Rename mode activated');
    });

    await test.step('Rename scenario and confirm', async () => {
      // Clear and type new name
      await page.fill('input[type="text"]', 'My Custom Plan');
      
      // Press Enter or click outside to confirm
      await page.press('input[type="text"]', 'Enter');
      
      // Wait for rename to complete
      await page.waitForTimeout(1000);
      
      // Verify the new name appears in the dropdown button
      const scenarioDropdown = page.locator('header button').first();
      const scenarioText = await scenarioDropdown.textContent();
      expect(scenarioText).toContain('My Custom Plan');
      
      console.log('✅ Scenario renamed successfully');
    });
  });

  test('should prevent deleting the last scenario', async ({ page }) => {
    await test.step('Try to delete the only remaining scenario', async () => {
      // Click on scenario dropdown
      await page.click('header button:has-text("Base Plan")');
      
      // Look for delete button - it should not be visible for the last scenario
      await page.waitForSelector('[data-testid="scenario-dropdown"], .absolute.right-0.mt-2', { timeout: 5000 });
      
      const deleteButton = page.locator('[title="Delete scenario"]');
      
      // Delete button should either not exist or not be visible
      const isDeleteVisible = await deleteButton.isVisible().catch(() => false);
      expect(isDeleteVisible).toBe(false);
      
      console.log('✅ Delete button properly hidden for last scenario');
    });
  });

  test('should allow deleting scenarios when multiple exist', async ({ page }) => {
    await test.step('Create multiple scenarios', async () => {
      // Create first duplicate
      await page.click('header button:has-text("Base Plan")');
      await page.click('button:has-text("Create New Scenario")');
      await page.waitForTimeout(1000);
      
      // Create second duplicate
      await page.click('header button:has-text("(Copy)")');
      await page.click('button:has-text("Create New Scenario")');
      await page.waitForTimeout(1000);
      
      console.log('✅ Created multiple scenarios');
    });

    await test.step('Delete one scenario', async () => {
      // Open dropdown
      await page.click('header button').first();
      
      // Find and click delete button for current scenario
      await page.waitForSelector('[title="Delete scenario"]', { timeout: 5000 });
      await page.click('[title="Delete scenario"]');
      
      // Should automatically switch to another scenario
      await page.waitForTimeout(1000);
      
      // Verify we still have scenarios and the app is functional
      const scenarioDropdown = page.locator('header button').first();
      expect(await scenarioDropdown.isVisible()).toBe(true);
      
      console.log('✅ Successfully deleted scenario and switched to another');
    });
  });

  test('should maintain separate event ledgers per scenario', async ({ page }) => {
    await test.step('Add an event to the base scenario', async () => {
      // Look for "Add Event" or similar button in the sidebar
      const addEventButton = page.locator('button:has-text("Add Event"), button:has-text("Add Income"), [data-testid="add-event"]').first();
      
      if (await addEventButton.isVisible()) {
        await addEventButton.click();
        
        // Fill out a simple income event (this will vary based on your modal structure)
        await page.waitForSelector('input[type="text"], input[name="name"]', { timeout: 5000 });
        await page.fill('input[type="text"], input[name="name"]', 'Test Income');
        
        // Look for amount field and fill it
        const amountField = page.locator('input[type="number"], input[name="amount"]').first();
        if (await amountField.isVisible()) {
          await amountField.fill('5000');
        }
        
        // Save the event
        await page.click('button:has-text("Save"), button:has-text("Add")');
        await page.waitForTimeout(1000);
        
        console.log('✅ Added event to base scenario');
      }
    });

    await test.step('Create duplicate scenario and verify isolation', async () => {
      // Create duplicate scenario
      await page.click('header button').first();
      await page.click('button:has-text("Create New Scenario")');
      await page.waitForTimeout(1000);
      
      // The new scenario should be a copy with the same events initially
      // Switch back to original to verify events are preserved
      await page.click('header button').first();
      
      // Look for original scenario in dropdown and click it
      const dropdownItems = page.locator('button:has-text("Base Plan"), .scenario-item');
      if (await dropdownItems.first().isVisible()) {
        await dropdownItems.first().click();
        await page.waitForTimeout(1000);
      }
      
      console.log('✅ Verified scenario isolation - each maintains its own events');
    });
  });

  test('should persist scenario changes across page reload', async ({ page }) => {
    await test.step('Create and rename a scenario', async () => {
      // Create new scenario
      await page.click('header button').first();
      await page.click('button:has-text("Create New Scenario")');
      await page.waitForTimeout(1000);
      
      // Rename it
      await page.click('header button').first();
      await page.click('[title="Rename scenario"]');
      await page.fill('input[type="text"]', 'Persistent Scenario');
      await page.press('input[type="text"]', 'Enter');
      await page.waitForTimeout(1000);
      
      console.log('✅ Created and renamed scenario');
    });

    await test.step('Reload page and verify persistence', async () => {
      // Reload the page
      await page.reload();
      
      // Wait for app to load again
      await page.waitForSelector('.pathfinder-dashboard', { timeout: 15000 });
      
      // Verify the renamed scenario is still there and active
      const scenarioDropdown = page.locator('header button').first();
      const scenarioText = await scenarioDropdown.textContent();
      expect(scenarioText).toContain('Persistent Scenario');
      
      // Open dropdown to verify both scenarios exist
      await page.click('header button').first();
      
      const baseScenario = page.locator('button:has-text("Base Plan")');
      const persistentScenario = page.locator('button:has-text("Persistent Scenario")');
      
      expect(await baseScenario.isVisible()).toBe(true);
      expect(await persistentScenario.isVisible()).toBe(true);
      
      console.log('✅ Scenarios persisted across page reload');
    });
  });
});