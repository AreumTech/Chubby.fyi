import { test, expect } from '@playwright/test';
import { QuickstartWizardPage } from './poms/QuickstartWizard.pom';

/**
 * Comprehensive E2E Tests for Quickstart Wizard
 * 
 * Tests cover:
 * - New user detection and automatic quickstart launch
 * - Complete wizard flow with data persistence
 * - Step navigation and validation
 * - Error handling and edge cases
 * - Browser refresh scenarios
 * - Cancellation and dismissal flows
 */

test.describe('Quickstart Wizard - Comprehensive Flow', () => {
  let quickstartWizard: QuickstartWizardPage;

  test.beforeEach(async ({ page }) => {
    quickstartWizard = new QuickstartWizardPage(page);
    
    // Clear any existing data to simulate new user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Reload to trigger new user detection
    await page.reload();
  });

  test.describe('New User Detection and Launch', () => {
    test('should automatically launch quickstart wizard for new users', async ({ page }) => {
      await page.goto('/');
      
      // Wait for quickstart wizard to appear automatically
      await quickstartWizard.waitForWizardToOpen();
      
      // Verify we're on the welcome step
      const stepTitle = await quickstartWizard.getCurrentStepTitle();
      expect(stepTitle).toContain('Welcome');
      
      // Verify step indicator shows 1/5
      const currentStep = await quickstartWizard.getCurrentStep();
      expect(currentStep).toContain('1/5');
    });

    test('should not launch quickstart for existing users', async ({ page }) => {
      // Simulate existing user by setting completion flag
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('pathfinder-quickstart-completed', 'true');
      });
      
      await page.reload();
      
      // Verify quickstart wizard does not appear
      await page.waitForTimeout(2000);
      expect(await quickstartWizard.isWizardOpen()).toBe(false);
    });

    test('should not launch quickstart for users who dismissed it', async ({ page }) => {
      // Simulate dismissed user
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('pathfinder-quickstart-dismissed', 'true');
      });
      
      await page.reload();
      
      // Verify quickstart wizard does not appear
      await page.waitForTimeout(2000);
      expect(await quickstartWizard.isWizardOpen()).toBe(false);
    });
  });

  test.describe('Complete Wizard Flow', () => {
    test('should complete full wizard flow successfully', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      const testData = {
        salary: 100000,
        expenses: 50000,
        retirementAge: 65,
        safetyMultiplier: 25
      };
      
      // Complete the full wizard flow
      await quickstartWizard.completeFullWizardFlow(testData);
      
      // Verify wizard closes
      await quickstartWizard.waitForWizardToClose();
      
      // Verify completion was tracked
      const completed = await page.evaluate(() => 
        localStorage.getItem('pathfinder-quickstart-completed')
      );
      expect(completed).toBe('true');
      
      // Verify we're now in the main app
      await expect(page.locator('.dashboard, .main-app')).toBeVisible({ timeout: 10000 });
    });

    test('should persist data across wizard steps', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Navigate to income step and fill data
      await quickstartWizard.clickNext(); // Welcome -> Income
      await quickstartWizard.fillIncomeStep(85000);
      
      // Navigate to expenses and back
      await quickstartWizard.clickNext(); // Income -> Expenses
      await quickstartWizard.fillExpensesStep(45000);
      await quickstartWizard.clickBack(); // Expenses -> Income
      
      // Verify income data persisted
      const persistedIncome = await quickstartWizard.getIncomeValue();
      expect(persistedIncome).toBe(85000);
      
      // Navigate forward again and verify expenses persisted
      await quickstartWizard.clickNext(); // Income -> Expenses
      const persistedExpenses = await quickstartWizard.getExpensesValue();
      expect(persistedExpenses).toBe(45000);
    });

    test('should generate events and run simulation on completion', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      await quickstartWizard.completeFullWizardFlow({
        salary: 120000,
        expenses: 60000,
        retirementAge: 60
      });
      
      await quickstartWizard.waitForWizardToClose();
      
      // Wait for simulation to complete and verify results appear
      await expect(page.locator('.chart, .simulation-results, .net-worth')).toBeVisible({ 
        timeout: 15000 
      });
      
      // Verify events were created (check event timeline or sidebar)
      await expect(page.locator('.event-timeline, .events-list')).toBeVisible({ 
        timeout: 10000 
      });
    });
  });

  test.describe('Step Navigation and Validation', () => {
    test('should validate step progression and navigation state', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Test step 1 (Welcome)
      await quickstartWizard.validateNavigationState(0);
      expect(await quickstartWizard.isBackButtonVisible()).toBe(false);
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(true);
      
      // Move to step 2 (Income)
      await quickstartWizard.clickNext();
      await quickstartWizard.validateNavigationState(1);
      expect(await quickstartWizard.isBackButtonVisible()).toBe(true);
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(false); // No income entered
      
      // Fill income and verify next becomes enabled
      await quickstartWizard.fillIncomeStep(75000);
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(true);
      
      // Continue through all steps
      await quickstartWizard.clickNext(); // Income -> Expenses
      await quickstartWizard.validateNavigationState(2);
      
      await quickstartWizard.fillExpensesStep(40000);
      await quickstartWizard.clickNext(); // Expenses -> Goal
      await quickstartWizard.validateNavigationState(3);
      
      await quickstartWizard.fillGoalStep(65);
      await quickstartWizard.clickNext(); // Goal -> Review
      await quickstartWizard.validateNavigationState(4);
    });

    test('should handle backward navigation correctly', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Fill out entire wizard
      await quickstartWizard.clickNext(); // Welcome -> Income
      await quickstartWizard.fillIncomeStep(90000);
      await quickstartWizard.clickNext(); // Income -> Expenses
      await quickstartWizard.fillExpensesStep(50000);
      await quickstartWizard.clickNext(); // Expenses -> Goal
      await quickstartWizard.fillGoalStep(62);
      await quickstartWizard.clickNext(); // Goal -> Review
      
      // Navigate backwards through all steps
      await quickstartWizard.clickBack(); // Review -> Goal
      expect(await quickstartWizard.getCurrentStepTitle()).toContain('Goal');
      expect(await quickstartWizard.getRetirementAge()).toBe(62);
      
      await quickstartWizard.clickBack(); // Goal -> Expenses
      expect(await quickstartWizard.getCurrentStepTitle()).toContain('Expenses');
      expect(await quickstartWizard.getExpensesValue()).toBe(50000);
      
      await quickstartWizard.clickBack(); // Expenses -> Income
      expect(await quickstartWizard.getCurrentStepTitle()).toContain('Income');
      expect(await quickstartWizard.getIncomeValue()).toBe(90000);
      
      await quickstartWizard.clickBack(); // Income -> Welcome
      expect(await quickstartWizard.getCurrentStepTitle()).toContain('Welcome');
    });

    test('should disable next button when required fields are empty', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Move to income step
      await quickstartWizard.clickNext();
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(false);
      
      // Fill invalid income (0)
      await quickstartWizard.fillIncomeStep(0);
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(false);
      
      // Fill valid income
      await quickstartWizard.fillIncomeStep(50000);
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(true);
      
      // Move to expenses step
      await quickstartWizard.clickNext();
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(false);
      
      // Fill valid expenses
      await quickstartWizard.fillExpensesStep(30000);
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(true);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle browser refresh during wizard', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Fill some data
      await quickstartWizard.clickNext();
      await quickstartWizard.fillIncomeStep(80000);
      await quickstartWizard.clickNext();
      await quickstartWizard.fillExpensesStep(40000);
      
      // Refresh browser
      await page.reload();
      
      // Verify wizard reopens for new user (data should be reset)
      await quickstartWizard.waitForWizardToOpen();
      const stepTitle = await quickstartWizard.getCurrentStepTitle();
      expect(stepTitle).toContain('Welcome');
    });

    test('should handle extreme values gracefully', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Test with very high income
      await quickstartWizard.clickNext();
      await quickstartWizard.fillIncomeStep(10000000);
      await quickstartWizard.clickNext();
      
      // Test with very high expenses
      await quickstartWizard.fillExpensesStep(5000000);
      await quickstartWizard.clickNext();
      
      // Test with edge retirement age
      await quickstartWizard.fillGoalStep(35); // Very early retirement
      await quickstartWizard.clickNext();
      
      // Should reach review step successfully
      await quickstartWizard.verifyReviewStep();
    });

    test('should handle invalid retirement age', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Navigate to goal step
      await quickstartWizard.clickNext(); // Welcome
      await quickstartWizard.fillIncomeStep(70000);
      await quickstartWizard.clickNext(); // Income
      await quickstartWizard.fillExpensesStep(35000);
      await quickstartWizard.clickNext(); // Expenses
      
      // Try to set retirement age lower than current age (assuming current age is ~30)
      await quickstartWizard.fillGoalStep(25);
      
      // Next button should be disabled due to invalid age
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(false);
      
      // Fix with valid age
      await quickstartWizard.fillGoalStep(65);
      expect(await quickstartWizard.isNextButtonEnabled()).toBe(true);
    });

    test('should handle simulation processing errors gracefully', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Complete wizard with potentially problematic data
      await quickstartWizard.completeFullWizardFlow({
        salary: 1, // Very low income
        expenses: 1000000, // Expenses higher than income
        retirementAge: 100 // Very high retirement age
      });
      
      // Even with problematic data, wizard should complete gracefully
      // (either with error handling or reasonable defaults)
      await quickstartWizard.waitForWizardToClose();
      
      // Verify we're in the main app, even if results are unusual
      await expect(page.locator('.dashboard, .main-app')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Cancellation and Dismissal Flows', () => {
    test('should handle cancellation correctly', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Fill some data first
      await quickstartWizard.clickNext();
      await quickstartWizard.fillIncomeStep(60000);
      
      // Cancel the wizard
      await quickstartWizard.clickCancel();
      await quickstartWizard.waitForWizardToClose();
      
      // Verify dismissal was tracked
      const dismissed = await page.evaluate(() => 
        localStorage.getItem('pathfinder-quickstart-dismissed')
      );
      expect(dismissed).toBe('true');
      
      // Verify wizard doesn't reopen on refresh
      await page.reload();
      await page.waitForTimeout(2000);
      expect(await quickstartWizard.isWizardOpen()).toBe(false);
    });

    test('should handle skip to advanced flow', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Use skip to advanced option
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      // Verify dismissal was tracked
      const dismissed = await page.evaluate(() => 
        localStorage.getItem('pathfinder-quickstart-dismissed')
      );
      expect(dismissed).toBe('true');
      
      // Should be in main app
      await expect(page.locator('.dashboard, .main-app')).toBeVisible({ timeout: 10000 });
    });

    test('should allow wizard to be reopened after dismissal', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Dismiss the wizard
      await quickstartWizard.clickCancel();
      await quickstartWizard.waitForWizardToClose();
      
      // Clear dismissal flag to simulate "try quickstart again" option
      await page.evaluate(() => {
        localStorage.removeItem('pathfinder-quickstart-dismissed');
      });
      
      await page.reload();
      
      // Wizard should reopen for new user
      await quickstartWizard.waitForWizardToOpen();
      expect(await quickstartWizard.getCurrentStepTitle()).toContain('Welcome');
    });
  });

  test.describe('Data Integration and Validation', () => {
    test('should create appropriate events for different scenarios', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      // Test high-income scenario
      await quickstartWizard.completeFullWizardFlow({
        salary: 250000,
        expenses: 80000,
        retirementAge: 50
      });
      
      await quickstartWizard.waitForWizardToClose();
      
      // Verify appropriate events were created for high earner
      // Should include income events, expense events, and FIRE goal
      await page.waitForTimeout(3000); // Allow for event creation
      
      // Check that events are visible in the UI
      const eventSelectors = [
        '.event-timeline',
        '.events-list', 
        '[data-testid="events"]',
        '.sidebar .event'
      ];
      
      let eventsVisible = false;
      for (const selector of eventSelectors) {
        if (await page.locator(selector).isVisible({ timeout: 2000 })) {
          eventsVisible = true;
          break;
        }
      }
      
      expect(eventsVisible).toBe(true);
    });

    test('should transition to main app with working simulation', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      await quickstartWizard.completeFullWizardFlow({
        salary: 100000,
        expenses: 60000,
        retirementAge: 65
      });
      
      await quickstartWizard.waitForWizardToClose();
      
      // Wait for simulation to run and verify charts appear
      await expect(page.locator('.chart, [class*="chart"], .recharts')).toBeVisible({ 
        timeout: 20000 
      });
      
      // Verify simulation data is present
      await expect(page.locator('.net-worth, .projection, .results')).toBeVisible({ 
        timeout: 10000 
      });
    });

    test('should preserve wizard completion state across sessions', async ({ page }) => {
      await page.goto('/');
      await quickstartWizard.waitForWizardToOpen();
      
      await quickstartWizard.completeFullWizardFlow({
        salary: 75000,
        expenses: 45000,
        retirementAge: 67
      });
      
      await quickstartWizard.waitForWizardToClose();
      
      // Simulate new session by clearing session storage but keeping localStorage
      await page.evaluate(() => {
        sessionStorage.clear();
      });
      
      await page.reload();
      
      // Wizard should not reappear
      await page.waitForTimeout(3000);
      expect(await quickstartWizard.isWizardOpen()).toBe(false);
      
      // Should be in main app with data preserved
      await expect(page.locator('.dashboard, .main-app')).toBeVisible();
    });
  });
});