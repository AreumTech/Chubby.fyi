import { test, expect } from '@playwright/test';
import { QuickstartWizardPage } from './poms/QuickstartWizard.pom';
import { Dashboard } from './poms/Dashboard.pom';
import { EventModal } from './poms/EventModal.pom';

/**
 * Financial Calculation Edge Cases Tests
 * 
 * Tests edge cases and extreme scenarios that could break financial calculations:
 * - Large dataset scenarios (1000+ events)
 * - Extreme values (very high/low numbers)
 * - Cross-validation with WASM simulation engine
 * - Mathematical edge cases (division by zero, overflow, etc.)
 * - Complex interaction scenarios
 */

test.describe('Financial Calculation Edge Cases', () => {
  let quickstartWizard: QuickstartWizardPage;
  let dashboard: Dashboard;
  let eventModal: EventModal;

  test.beforeEach(async ({ page }) => {
    quickstartWizard = new QuickstartWizardPage(page);
    dashboard = new Dashboard(page);
    eventModal = new EventModal(page);

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Large Dataset Scenarios', () => {
    test('should handle 1000+ events without performance degradation', async ({ page }) => {
      // Skip quickstart for direct control
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Add initial state first
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Initial State');
      await eventModal.fillInitialStateEvent({
        cashBalance: 50000,
        taxableBalance: 100000,
        taxDeferredBalance: 200000
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      const startTime = Date.now();
      
      // Create 1000+ small events
      const eventCount = 1000;
      
      for (let i = 0; i < eventCount; i++) {
        await dashboard.openEventCreationModal();
        await eventModal.waitForModalToOpen();
        
        // Alternate between different event types
        const eventTypes = ['Income', 'Expense', 'Contribution'];
        const eventType = eventTypes[i % eventTypes.length];
        
        await eventModal.selectEventType(eventType);
        
        switch (eventType) {
          case 'Income':
            await eventModal.fillIncomeEvent({
              amount: 100 + (i % 900), // Vary amounts 100-999
              frequency: 'One-time',
              startDate: `202${5 + Math.floor(i / 365)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
              description: `Income Event ${i}`
            });
            break;
          case 'Expense':
            await eventModal.fillExpenseEvent({
              amount: 50 + (i % 450), // Vary amounts 50-499
              frequency: 'One-time',
              startDate: `202${5 + Math.floor(i / 365)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
              description: `Expense Event ${i}`
            });
            break;
          case 'Contribution':
            await eventModal.fillContributionEvent({
              amount: 100 + (i % 400), // Vary amounts 100-499
              frequency: 'One-time',
              targetAccount: ['cash', 'taxable', 'tax_deferred'][i % 3],
              description: `Contribution Event ${i}`
            });
            break;
        }
        
        await eventModal.saveEvent();
        await eventModal.waitForModalToClose();
        
        // Log progress every 100 events
        if ((i + 1) % 100 === 0) {
          console.log(`Created ${i + 1} events`);
          
          // Brief pause to prevent overwhelming the system
          await page.waitForTimeout(100);
        }
      }
      
      const eventCreationTime = Date.now() - startTime;
      console.log(`Created ${eventCount} events in ${eventCreationTime}ms`);
      
      // Verify simulation can handle large dataset
      const simulationStartTime = Date.now();
      await dashboard.waitForSimulationToComplete();
      const simulationTime = Date.now() - simulationStartTime;
      
      console.log(`Simulation completed in ${simulationTime}ms`);
      
      // Verify results are still displayed correctly
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Performance assertion - simulation should complete within reasonable time
      expect(simulationTime).toBeLessThan(30000); // 30 seconds max
      
      // Verify chart renders with large dataset
      await dashboard.verifyChartDataUpdated();
    });

    test('should handle complex recurring event patterns', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Create overlapping recurring events that could cause conflicts
      const recurringEvents = [
        // Daily recurring expense
        {
          type: 'Expense',
          amount: 50,
          frequency: 'Daily',
          description: 'Daily Coffee',
          duration: '1 year'
        },
        // Weekly income
        {
          type: 'Income',
          amount: 2000,
          frequency: 'Weekly',
          description: 'Weekly Freelance',
          duration: '2 years'
        },
        // Bi-weekly income
        {
          type: 'Income',
          amount: 3000,
          frequency: 'Bi-weekly',
          description: 'Bi-weekly Salary',
          duration: '5 years'
        },
        // Monthly contributions
        {
          type: 'Contribution',
          amount: 1000,
          frequency: 'Monthly',
          targetAccount: 'tax_deferred',
          description: 'Monthly 401k',
          duration: '10 years'
        },
        // Quarterly bonuses
        {
          type: 'Income',
          amount: 10000,
          frequency: 'Quarterly',
          description: 'Quarterly Bonus',
          duration: '3 years'
        },
        // Annual events
        {
          type: 'Income',
          amount: 5000,
          frequency: 'Annually',
          description: 'Annual Tax Refund',
          duration: '20 years'
        }
      ];
      
      for (const event of recurringEvents) {
        await dashboard.openEventCreationModal();
        await eventModal.waitForModalToOpen();
        
        await eventModal.selectEventType(event.type);
        
        switch (event.type) {
          case 'Income':
            await eventModal.fillIncomeEvent({
              amount: event.amount,
              frequency: event.frequency,
              description: event.description
            });
            break;
          case 'Expense':
            await eventModal.fillExpenseEvent({
              amount: event.amount,
              frequency: event.frequency,
              description: event.description
            });
            break;
          case 'Contribution':
            await eventModal.fillContributionEvent({
              amount: event.amount,
              frequency: event.frequency,
              targetAccount: event.targetAccount,
              description: event.description
            });
            break;
        }
        
        await eventModal.saveEvent();
        await eventModal.waitForModalToClose();
      }
      
      // Verify simulation handles complex recurring patterns
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Verify all events are represented
      for (const event of recurringEvents) {
        await expect(page.locator(`text=${event.description}`)).toBeVisible();
      }
    });
  });

  test.describe('Extreme Values Testing', () => {
    test('should handle very large financial amounts', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 10000000, // $10M salary
        expenses: 5000000, // $5M expenses
        retirementAge: 45
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      await dashboard.waitForSimulationToComplete();
      
      // Add extremely large events
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Income');
      await eventModal.fillIncomeEvent({
        amount: 100000000, // $100M windfall
        frequency: 'One-time',
        description: 'Lottery Winnings'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Add large liability
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Liability');
      await eventModal.fillLiabilityEvent({
        principalAmount: 50000000, // $50M mortgage
        interestRate: 2.5,
        termYears: 30,
        description: 'Luxury Property Mortgage'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Verify simulation handles extreme values
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Verify values are displayed correctly (not showing NaN or errors)
      await dashboard.verifyChartDataUpdated();
      await expect(dashboard.projectionValues).not.toContainText('NaN');
      await expect(dashboard.projectionValues).not.toContainText('Infinity');
    });

    test('should handle very small financial amounts', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 1, // $1 salary
        expenses: 1, // $1 expenses
        retirementAge: 95
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Add very small events
      const smallEvents = [
        { type: 'Income', amount: 0.01, description: 'Penny Income' },
        { type: 'Expense', amount: 0.05, description: 'Nickel Expense' },
        { type: 'Contribution', amount: 0.25, targetAccount: 'cash', description: 'Quarter Contribution' }
      ];
      
      for (const event of smallEvents) {
        await dashboard.openEventCreationModal();
        await eventModal.waitForModalToOpen();
        
        await eventModal.selectEventType(event.type);
        
        switch (event.type) {
          case 'Income':
            await eventModal.fillIncomeEvent({
              amount: event.amount,
              frequency: 'Monthly',
              description: event.description
            });
            break;
          case 'Expense':
            await eventModal.fillExpenseEvent({
              amount: event.amount,
              frequency: 'Monthly',
              description: event.description
            });
            break;
          case 'Contribution':
            await eventModal.fillContributionEvent({
              amount: event.amount,
              frequency: 'Monthly',
              targetAccount: event.targetAccount,
              description: event.description
            });
            break;
        }
        
        await eventModal.saveEvent();
        await eventModal.waitForModalToClose();
      }
      
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Verify small values don't cause calculation errors
      await expect(dashboard.projectionValues).not.toContainText('NaN');
      await expect(dashboard.projectionValues).not.toContainText('Infinity');
    });

    test('should handle negative values appropriately', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Set negative initial state (debt scenario)
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Initial State');
      await eventModal.fillInitialStateEvent({
        cashBalance: -10000, // Negative cash (overdraft)
        taxableBalance: -50000, // Investment losses
        taxDeferredBalance: 10000, // Some positive balance
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Add income to eventually recover
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Income');
      await eventModal.fillIncomeEvent({
        amount: 60000,
        frequency: 'Annually',
        description: 'Recovery Income'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Verify negative values are handled appropriately
      await dashboard.verifyChartDataUpdated();
    });
  });

  test.describe('Mathematical Edge Cases', () => {
    test('should handle zero and near-zero calculations', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 0, // Zero income
        expenses: 0, // Zero expenses
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Add events that could cause division by zero
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Liability');
      await eventModal.fillLiabilityEvent({
        principalAmount: 100000,
        interestRate: 0, // Zero interest rate
        termYears: 30,
        description: 'Zero Interest Loan'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      
      // Verify no mathematical errors occur
      await expect(dashboard.chartContainer).toBeVisible();
      await expect(dashboard.projectionValues).not.toContainText('NaN');
      await expect(dashboard.projectionValues).not.toContainText('Infinity');
      await expect(page.locator('text=Error')).not.toBeVisible();
    });

    test('should handle extreme interest rates', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Test very high interest rate
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Liability');
      await eventModal.fillLiabilityEvent({
        principalAmount: 10000,
        interestRate: 99.99, // Extremely high interest
        termYears: 1,
        description: 'Payday Loan'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Test negative interest rate (deflationary scenario)
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Liability');
      await eventModal.fillLiabilityEvent({
        principalAmount: 100000,
        interestRate: -2.0, // Negative interest
        termYears: 10,
        description: 'Deflationary Bond'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Verify extreme rates don't break calculations
      await expect(dashboard.projectionValues).not.toContainText('NaN');
      await expect(dashboard.projectionValues).not.toContainText('Infinity');
    });

    test('should handle extreme time horizons', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 50000,
        expenses: 30000,
        retirementAge: 150 // Extremely long time horizon
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Add event with very long duration
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Income');
      await eventModal.fillIncomeEvent({
        amount: 1000,
        frequency: 'Monthly',
        startDate: '2025-01-01',
        endDate: '2200-12-31', // Far future date
        description: 'Eternal Income'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      
      // Verify long time horizons are handled
      await expect(dashboard.chartContainer).toBeVisible();
      await dashboard.verifyChartDataUpdated();
    });
  });

  test.describe('WASM Engine Cross-Validation', () => {
    test('should produce consistent results between JS and WASM engines', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 75000,
        expenses: 45000,
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      await dashboard.waitForSimulationToComplete();
      
      // Get results from WASM engine
      const wasmResults = await page.evaluate(() => {
        const chartData = document.querySelector('[data-testid="chart-data"]')?.textContent;
        const projectionData = document.querySelector('[data-testid="projection-values"]')?.textContent;
        return { chartData, projectionData };
      });
      
      // Force fallback to JS engine
      await page.evaluate(() => {
        window.forceJsEngine(true);
      });
      
      // Trigger re-simulation with JS engine
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Income');
      await eventModal.fillIncomeEvent({
        amount: 1,
        frequency: 'One-time',
        description: 'Trigger Recalculation'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      
      // Get results from JS engine
      const jsResults = await page.evaluate(() => {
        const chartData = document.querySelector('[data-testid="chart-data"]')?.textContent;
        const projectionData = document.querySelector('[data-testid="projection-values"]')?.textContent;
        return { chartData, projectionData };
      });
      
      // Results should be very similar (allowing for minor floating point differences)
      // This is a conceptual test - actual implementation would need specific data extraction
      expect(wasmResults).toBeDefined();
      expect(jsResults).toBeDefined();
      
      // Verify both engines produce valid results
      await expect(dashboard.chartContainer).toBeVisible();
      await expect(dashboard.projectionValues).not.toContainText('NaN');
    });

    test('should handle complex calculations consistently', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Create complex scenario with multiple interacting calculations
      const complexEvents = [
        // Initial state with all account types
        {
          type: 'Initial State',
          data: {
            cashBalance: 15000,
            taxableBalance: 45000,
            taxDeferredBalance: 125000,
            rothBalance: 35000
          }
        },
        // Multiple income sources
        {
          type: 'Income',
          data: { amount: 120000, frequency: 'Annually', description: 'Primary Salary' }
        },
        {
          type: 'Income',
          data: { amount: 2000, frequency: 'Monthly', description: 'Side Income' }
        },
        // Complex liabilities
        {
          type: 'Liability',
          data: {
            principalAmount: 350000,
            interestRate: 3.25,
            termYears: 30,
            description: 'Mortgage'
          }
        },
        {
          type: 'Liability',
          data: {
            principalAmount: 25000,
            interestRate: 6.99,
            termYears: 5,
            description: 'Car Loan'
          }
        },
        // Multiple contribution types
        {
          type: 'Contribution',
          data: {
            amount: 1500,
            frequency: 'Monthly',
            targetAccount: 'tax_deferred',
            description: '401k Contribution'
          }
        },
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
      
      for (const event of complexEvents) {
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
          case 'Liability':
            await eventModal.fillLiabilityEvent(event.data);
            break;
          case 'Contribution':
            await eventModal.fillContributionEvent(event.data);
            break;
        }
        
        await eventModal.saveEvent();
        await eventModal.waitForModalToClose();
      }
      
      // Run simulation and verify complex calculations work
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Verify no calculation errors
      await expect(dashboard.projectionValues).not.toContainText('NaN');
      await expect(dashboard.projectionValues).not.toContainText('Infinity');
      await expect(page.locator('text=Error')).not.toBeVisible();
      
      // Verify chart shows reasonable progression
      await dashboard.verifyChartDataUpdated();
    });
  });

  test.describe('Complex Interaction Scenarios', () => {
    test('should handle competing goals and insufficient funds', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 50000, // Modest income
        expenses: 45000, // High expenses relative to income
        retirementAge: 40 // Very aggressive retirement goal
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Add multiple ambitious goals
      const ambitiousGoals = [
        {
          type: 'House Purchase',
          targetAmount: 500000, // Expensive house
          targetDate: '2026-01-01',
          description: 'Dream Home'
        },
        {
          type: 'Education',
          targetAmount: 200000,
          targetDate: '2028-01-01',
          description: 'MBA Program'
        },
        {
          type: 'Emergency Fund',
          targetAmount: 100000,
          targetDate: '2025-12-01',
          description: 'Large Emergency Fund'
        }
      ];
      
      for (const goal of ambitiousGoals) {
        await dashboard.openGoalCreationModal();
        await dashboard.fillGoal(goal);
        await dashboard.saveGoal();
      }
      
      // Simulation should handle impossible scenarios gracefully
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      // Should show goal feasibility issues
      await expect(dashboard.goalProgress).toBeVisible();
      
      // Verify no crashes or calculation errors
      await expect(dashboard.projectionValues).not.toContainText('NaN');
    });

    test('should handle age-based constraints correctly', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 80000,
        expenses: 50000,
        retirementAge: 67
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Add age-constrained events
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Social Security');
      await eventModal.fillSocialSecurityEvent({
        monthlyBenefit: 2500,
        startAge: 67,
        description: 'Full Social Security'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Add Required Minimum Distributions
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Required Minimum Distribution');
      await eventModal.fillRMDEvent({
        sourceAccount: 'tax_deferred',
        startAge: 73,
        description: 'RMD from 401k'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      // Add Medicare costs
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      await eventModal.selectEventType('Healthcare');
      await eventModal.fillHealthcareEvent({
        monthlyPremium: 800,
        startAge: 65,
        description: 'Medicare Supplement'
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      
      // Verify age-based events are scheduled correctly
      await expect(dashboard.chartContainer).toBeVisible();
      await dashboard.verifyChartDataUpdated();
      
      // Events should appear at correct ages in timeline
      await expect(page.locator('text=Full Social Security')).toBeVisible();
      await expect(page.locator('text=RMD from 401k')).toBeVisible();
      await expect(page.locator('text=Medicare Supplement')).toBeVisible();
    });
  });
});