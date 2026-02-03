import { test, expect } from '@playwright/test';
import { QuickstartWizardPage } from './poms/QuickstartWizard.pom';
import { OnboardingPage } from './poms/Onboarding.pom';
import { Dashboard } from './poms/Dashboard.pom';
import { EventModal } from './poms/EventModal.pom';

/**
 * User Journey Integration Tests
 * 
 * Tests complete end-to-end user flows:
 * - Complete onboarding → event creation → simulation flow
 * - Goal creation → event addition → results viewing
 * - Scenario creation → data duplication → comparison
 * - Advanced user workflows with complex event combinations
 */

test.describe('User Journey Integration Tests', () => {
  let quickstartWizard: QuickstartWizardPage;
  let onboarding: OnboardingPage;
  let dashboard: Dashboard;
  let eventModal: EventModal;

  test.beforeEach(async ({ page }) => {
    quickstartWizard = new QuickstartWizardPage(page);
    onboarding = new OnboardingPage(page);
    dashboard = new Dashboard(page);
    eventModal = new EventModal(page);

    // Start fresh for each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Complete Onboarding → Event Creation → Simulation Flow', () => {
    test('should complete full new user journey from quickstart to working simulation', async ({ page }) => {
      await page.goto('/');
      
      // Step 1: Complete quickstart wizard
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 85000,
        expenses: 50000,
        retirementAge: 62
      });
      await quickstartWizard.waitForWizardToClose();
      
      // Step 2: Verify we're in the main dashboard
      await dashboard.waitForDashboardToLoad();
      await expect(dashboard.mainContent).toBeVisible();
      
      // Step 3: Verify initial simulation ran
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Step 4: Add additional event
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      // Create a one-time bonus income event
      await eventModal.selectEventType('Income');
      await eventModal.fillIncomeEvent({
        amount: 10000,
        frequency: 'One-time',
        startDate: '2025-06-01',
        description: 'Annual Bonus'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Step 5: Verify simulation updates with new event
      await dashboard.waitForSimulationToComplete();
      
      // Step 6: Verify event appears in timeline/sidebar
      await expect(dashboard.eventsList.or(dashboard.sidebar)).toContainText('Annual Bonus');
      
      // Step 7: Check that results make sense
      await expect(dashboard.chartContainer).toBeVisible();
      await expect(dashboard.projectionValues).toBeVisible();
    });

    test('should handle persona-based onboarding flow', async ({ page }) => {
      // Simulate scenario where user chooses persona instead of quickstart
      await page.goto('/');
      
      // If onboarding appears instead of quickstart
      if (await onboarding.isVisible()) {
        await onboarding.selectPersona('The Accelerator');
        await onboarding.waitForPersonaSelection();
        await onboarding.confirmPersonaSelection();
        await onboarding.waitForOnboardingComplete();
      } else {
        // Skip quickstart to get to persona selection
        await quickstartWizard.waitForWizardToOpen();
        await quickstartWizard.clickSkipToAdvanced();
        await quickstartWizard.waitForWizardToClose();
      }
      
      // Continue with main app flow
      await dashboard.waitForDashboardToLoad();
      
      // Verify persona-specific data was loaded
      await expect(dashboard.mainContent).toBeVisible();
      
      // Add custom event to persona plan
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Contribution');
      await eventModal.fillContributionEvent({
        amount: 500,
        frequency: 'Monthly',
        targetAccount: 'tax_deferred',
        description: 'Additional 401k Contribution'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Verify simulation incorporates both persona and custom events
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
    });

    test('should handle build-from-scratch onboarding flow', async ({ page }) => {
      await page.goto('/');
      
      // Check if we get onboarding or quickstart
      const hasOnboarding = await onboarding.isVisible();
      
      if (hasOnboarding) {
        // Select "Start from Scratch" persona
        await onboarding.selectPersona('Start from Scratch');
        await onboarding.waitForPersonaSelection();
        await onboarding.confirmPersonaSelection();
        await onboarding.waitForOnboardingComplete();
      } else {
        // Use quickstart skip to advanced
        await quickstartWizard.waitForWizardToOpen();
        await quickstartWizard.clickSkipToAdvanced();
        await quickstartWizard.waitForWizardToClose();
      }
      
      await dashboard.waitForDashboardToLoad();
      
      // Build plan step by step
      // 1. Add initial state
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Initial State');
      await eventModal.fillInitialStateEvent({
        cashBalance: 10000,
        taxableBalance: 25000,
        taxDeferredBalance: 45000,
        rothBalance: 15000
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // 2. Add income
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Income');
      await eventModal.fillIncomeEvent({
        amount: 75000,
        frequency: 'Annually',
        description: 'Primary Salary'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // 3. Add expenses
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Expense');
      await eventModal.fillExpenseEvent({
        amount: 4000,
        frequency: 'Monthly',
        description: 'Living Expenses'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // 4. Add retirement goal
      await dashboard.openGoalCreationModal();
      await dashboard.fillRetirementGoal({
        targetAge: 65,
        targetAmount: 1500000,
        description: 'Retirement Goal'
      });
      await dashboard.saveGoal();
      
      // Verify complete plan simulation
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      await expect(dashboard.goalProgress).toBeVisible();
    });
  });

  test.describe('Goal Creation → Event Addition → Results Viewing', () => {
    test('should create goal and add supporting events', async ({ page }) => {
      await page.goto('/');
      
      // Complete basic setup first
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 90000,
        expenses: 55000,
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Create additional financial goal
      await dashboard.openGoalCreationModal();
      await dashboard.fillGoal({
        type: 'House Purchase',
        targetAmount: 400000,
        targetDate: '2027-06-01',
        description: 'First Home Purchase'
      });
      await dashboard.saveGoal();
      
      // Add events to support the goal
      // 1. Extra savings for house
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Contribution');
      await eventModal.fillContributionEvent({
        amount: 1500,
        frequency: 'Monthly',
        targetAccount: 'taxable',
        description: 'House Down Payment Savings'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // 2. Side income for house fund
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Income');
      await eventModal.fillIncomeEvent({
        amount: 2000,
        frequency: 'Monthly',
        startDate: '2025-01-01',
        endDate: '2027-05-31',
        description: 'Side Business Income'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Wait for simulation and verify goal progress
      await dashboard.waitForSimulationToComplete();
      
      // Check goal feasibility and progress
      await expect(dashboard.goalProgress).toBeVisible();
      await expect(dashboard.goalStatus).toContainText('House Purchase');
      
      // Verify chart shows impact of additional events
      await expect(dashboard.chartContainer).toBeVisible();
      await dashboard.verifyChartDataUpdated();
    });

    test('should handle multiple competing goals', async ({ page }) => {
      await page.goto('/');
      
      // Start with quickstart
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 120000,
        expenses: 70000,
        retirementAge: 60
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Add multiple goals
      const goals = [
        {
          type: 'House Purchase',
          targetAmount: 300000,
          targetDate: '2026-12-01',
          description: 'Family Home'
        },
        {
          type: 'Education',
          targetAmount: 200000,
          targetDate: '2030-09-01',
          description: 'Children\'s College Fund'
        },
        {
          type: 'Emergency Fund',
          targetAmount: 50000,
          targetDate: '2025-12-01',
          description: '6-Month Emergency Fund'
        }
      ];
      
      for (const goal of goals) {
        await dashboard.openGoalCreationModal();
        await dashboard.fillGoal(goal);
        await dashboard.saveGoal();
        await page.waitForTimeout(1000); // Allow UI to update
      }
      
      // Add events to support multiple goals
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Contribution');
      await eventModal.fillContributionEvent({
        amount: 2500,
        frequency: 'Monthly',
        targetAccount: 'taxable',
        description: 'Multi-Goal Savings'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Verify simulation handles multiple goals
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.goalProgress).toBeVisible();
      
      // Check that all goals are displayed
      for (const goal of goals) {
        await expect(page.locator('text=' + goal.description)).toBeVisible();
      }
    });
  });

  test.describe('Scenario Creation → Data Duplication → Comparison', () => {
    test('should create and compare multiple scenarios', async ({ page }) => {
      await page.goto('/');
      
      // Set up base scenario
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 100000,
        expenses: 60000,
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Add some additional complexity to base scenario
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Contribution');
      await eventModal.fillContributionEvent({
        amount: 800,
        frequency: 'Monthly',
        targetAccount: 'tax_deferred',
        description: 'Base 401k Contribution'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      
      // Create new scenario (duplicate current)
      await dashboard.openScenarioMenu();
      await dashboard.createNewScenario('Aggressive Savings');
      
      // Modify the new scenario
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Contribution');
      await eventModal.fillContributionEvent({
        amount: 1500,
        frequency: 'Monthly',
        targetAccount: 'tax_deferred',
        description: 'Aggressive 401k Contribution'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Add side income to aggressive scenario
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Income');
      await eventModal.fillIncomeEvent({
        amount: 1000,
        frequency: 'Monthly',
        description: 'Freelance Income'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      
      // Create third scenario for early retirement
      await dashboard.openScenarioMenu();
      await dashboard.createNewScenario('Early Retirement');
      
      // Modify retirement age goal
      await dashboard.openGoalEditModal();
      await dashboard.updateRetirementAge(55);
      await dashboard.saveGoal();
      
      // Add aggressive savings for early retirement
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Contribution');
      await eventModal.fillContributionEvent({
        amount: 2000,
        frequency: 'Monthly',
        targetAccount: 'tax_deferred',
        description: 'Max 401k for Early Retirement'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      
      // Compare scenarios
      await dashboard.openScenarioComparison();
      
      // Verify all scenarios are listed
      await expect(page.locator('text=Base Scenario')).toBeVisible();
      await expect(page.locator('text=Aggressive Savings')).toBeVisible();
      await expect(page.locator('text=Early Retirement')).toBeVisible();
      
      // Verify comparison charts/data
      await expect(dashboard.comparisonChart).toBeVisible();
      await expect(dashboard.scenarioResults).toBeVisible();
      
      // Switch between scenarios to verify data integrity
      await dashboard.switchToScenario('Base Scenario');
      await expect(page.locator('text=Base 401k Contribution')).toBeVisible();
      
      await dashboard.switchToScenario('Aggressive Savings');
      await expect(page.locator('text=Aggressive 401k Contribution')).toBeVisible();
      await expect(page.locator('text=Freelance Income')).toBeVisible();
      
      await dashboard.switchToScenario('Early Retirement');
      await expect(page.locator('text=Max 401k for Early Retirement')).toBeVisible();
    });

    test('should handle scenario data isolation', async ({ page }) => {
      await page.goto('/');
      
      // Create base scenario
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 80000,
        expenses: 50000,
        retirementAge: 67
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Create scenario with conflicting events
      await dashboard.openScenarioMenu();
      await dashboard.createNewScenario('High Expense Scenario');
      
      // Add high expense to new scenario only
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Expense');
      await eventModal.fillExpenseEvent({
        amount: 2000,
        frequency: 'Monthly',
        description: 'Luxury Car Payment'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      
      // Verify this event only exists in current scenario
      await expect(page.locator('text=Luxury Car Payment')).toBeVisible();
      
      // Switch back to base scenario
      await dashboard.switchToScenario('Base Scenario');
      
      // Verify luxury expense is NOT in base scenario
      await expect(page.locator('text=Luxury Car Payment')).not.toBeVisible();
      
      // Add different event to base scenario
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Income');
      await eventModal.fillIncomeEvent({
        amount: 5000,
        frequency: 'One-time',
        description: 'Tax Refund'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Switch back to high expense scenario
      await dashboard.switchToScenario('High Expense Scenario');
      
      // Verify tax refund is NOT in high expense scenario
      await expect(page.locator('text=Tax Refund')).not.toBeVisible();
      await expect(page.locator('text=Luxury Car Payment')).toBeVisible();
    });
  });

  test.describe('Advanced User Workflows', () => {
    test('should handle complex financial planning workflow', async ({ page }) => {
      await page.goto('/');
      
      // Skip quickstart for advanced workflow
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Build comprehensive financial plan
      const events = [
        // Initial state
        {
          type: 'Initial State',
          data: {
            cashBalance: 25000,
            taxableBalance: 50000,
            taxDeferredBalance: 75000,
            rothBalance: 30000
          }
        },
        // Primary income
        {
          type: 'Income',
          data: {
            amount: 150000,
            frequency: 'Annually',
            description: 'Primary Salary'
          }
        },
        // Spouse income
        {
          type: 'Income',
          data: {
            amount: 80000,
            frequency: 'Annually',
            description: 'Spouse Salary'
          }
        },
        // Living expenses
        {
          type: 'Expense',
          data: {
            amount: 8000,
            frequency: 'Monthly',
            description: 'Living Expenses'
          }
        },
        // Mortgage
        {
          type: 'Liability',
          data: {
            principalAmount: 400000,
            interestRate: 3.5,
            termYears: 30,
            description: 'Primary Residence Mortgage'
          }
        },
        // 401k contributions
        {
          type: 'Contribution',
          data: {
            amount: 2000,
            frequency: 'Monthly',
            targetAccount: 'tax_deferred',
            description: 'Primary 401k'
          }
        },
        // Spouse 401k
        {
          type: 'Contribution',
          data: {
            amount: 1200,
            frequency: 'Monthly',
            targetAccount: 'tax_deferred',
            description: 'Spouse 401k'
          }
        },
        // Roth IRA
        {
          type: 'Contribution',
          data: {
            amount: 500,
            frequency: 'Monthly',
            targetAccount: 'roth',
            description: 'Roth IRA'
          }
        }
      ];
      
      // Add all events
      for (const event of events) {
        await dashboard.openEventCreationModal();
        await eventModal.waitForModalToOpen();
        
        await eventModal.selectEventType(event.type);
        
        switch (event.type) {
          case 'Initial State':
            await eventModal.fillInitialStateEvent(event.data);
            break;
          case 'Income':
            await eventModal.fillIncomeEvent(event.data);
            break;
          case 'Expense':
            await eventModal.fillExpenseEvent(event.data);
            break;
          case 'Liability':
            await eventModal.fillLiabilityEvent(event.data);
            break;
          case 'Contribution':
            await eventModal.fillContributionEvent(event.data);
            break;
        }
        
        await eventModal.saveEvent();
        await eventModal.waitForModalToClose();
        await page.waitForTimeout(500); // Brief pause between events
      }
      
      // Add multiple goals
      const goals = [
        {
          type: 'Retirement',
          targetAge: 60,
          targetAmount: 2500000,
          description: 'Early Retirement'
        },
        {
          type: 'Education',
          targetAmount: 300000,
          targetDate: '2035-08-01',
          description: 'Children\'s Education'
        }
      ];
      
      for (const goal of goals) {
        await dashboard.openGoalCreationModal();
        await dashboard.fillGoal(goal);
        await dashboard.saveGoal();
      }
      
      // Wait for comprehensive simulation
      await dashboard.waitForSimulationToComplete();
      
      // Verify complex plan works
      await expect(dashboard.chartContainer).toBeVisible();
      await expect(dashboard.goalProgress).toBeVisible();
      await expect(dashboard.eventsList).toContainText('Primary Salary');
      await expect(dashboard.eventsList).toContainText('Primary Residence Mortgage');
      
      // Test editing complex plan
      await dashboard.editEvent('Primary Salary');
      await eventModal.waitForModalToOpen();
      await eventModal.updateIncomeAmount(160000);
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Verify simulation updates
      await dashboard.waitForSimulationToComplete();
      await dashboard.verifyChartDataUpdated();
    });

    test('should handle stress testing with many events', async ({ page }) => {
      await page.goto('/');
      
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Create many similar events to test performance
      const eventCount = 20;
      
      for (let i = 0; i < eventCount; i++) {
        await dashboard.openEventCreationModal();
        await eventModal.waitForModalToOpen();
        
        await eventModal.selectEventType('Income');
        await eventModal.fillIncomeEvent({
          amount: 1000 + (i * 100),
          frequency: 'One-time',
          startDate: `2025-${String(i % 12 + 1).padStart(2, '0')}-15`,
          description: `Bonus Income ${i + 1}`
        });
        
        await eventModal.saveEvent();
        await eventModal.waitForModalToClose();
        
        // Brief pause to avoid overwhelming the system
        if (i % 5 === 0) {
          await page.waitForTimeout(1000);
        }
      }
      
      // Verify simulation completes with many events
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Verify events are listed (should handle large lists)
      await expect(dashboard.eventsList).toBeVisible();
      
      // Test that editing still works with many events
      await dashboard.editEvent('Bonus Income 1');
      await eventModal.waitForModalToOpen();
      await eventModal.updateIncomeAmount(2000);
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
    });
  });
});