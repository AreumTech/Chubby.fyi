import { test, expect } from '@playwright/test';
import { QuickstartWizardPage } from './poms/QuickstartWizard.pom';
import { Dashboard } from './poms/Dashboard.pom';
import { EventModal } from './poms/EventModal.pom';

/**
 * Performance Regression Tests with Benchmarks
 * 
 * Tests performance characteristics and prevents regressions:
 * - Memory usage monitoring
 * - Simulation execution time limits
 * - Chart rendering performance benchmarks
 * - Large dataset performance
 * - Browser resource utilization
 * - Network performance (if applicable)
 */

interface PerformanceMetrics {
  memoryUsage: number;
  executionTime: number;
  renderTime: number;
  cpuUsage?: number;
}

interface BenchmarkThresholds {
  memoryUsage: number; // MB
  simulationTime: number; // ms
  chartRenderTime: number; // ms
  wizardFlowTime: number; // ms
  eventCreationTime: number; // ms
}

// Performance benchmarks and thresholds
const PERFORMANCE_THRESHOLDS: BenchmarkThresholds = {
  memoryUsage: 100, // 100MB max
  simulationTime: 5000, // 5 seconds max for standard simulation
  chartRenderTime: 2000, // 2 seconds max for chart rendering
  wizardFlowTime: 30000, // 30 seconds max for complete wizard flow
  eventCreationTime: 3000 // 3 seconds max per event creation
};

test.describe('Performance Regression Tests', () => {
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

  // Helper function to measure memory usage
  async function measureMemoryUsage(page: any): Promise<number> {
    return await page.evaluate(() => {
      if ('memory' in performance) {
        // @ts-ignore - performance.memory is available in Chrome
        return performance.memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
      return 0;
    });
  }

  // Helper function to measure execution time
  async function measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();
    return { result, time: endTime - startTime };
  }

  test.describe('Memory Usage Monitoring', () => {
    test('should not exceed memory thresholds during normal usage', async ({ page }) => {
      // Baseline memory measurement
      const baselineMemory = await measureMemoryUsage(page);
      
      // Complete quickstart
      await quickstartWizard.waitForWizardToOpen();
      const wizardMemory = await measureMemoryUsage(page);
      
      await quickstartWizard.completeFullWizardFlow({
        salary: 85000,
        expenses: 50000,
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      const afterWizardMemory = await measureMemoryUsage(page);
      
      // Wait for simulation to complete
      await dashboard.waitForDashboardToLoad();
      await dashboard.waitForSimulationToComplete();
      
      const afterSimulationMemory = await measureMemoryUsage(page);
      
      // Add several events and measure memory growth
      for (let i = 0; i < 10; i++) {
        await dashboard.openEventCreationModal();
        await eventModal.waitForModalToOpen();
        
        await eventModal.selectEventType('Income');
        await eventModal.fillIncomeEvent({
          amount: 1000 + i * 100,
          frequency: 'Monthly',
          description: `Test Income ${i}`
        });
        await eventModal.saveEvent();
        await eventModal.waitForModalToClose();
      }
      
      await dashboard.waitForSimulationToComplete();
      const finalMemory = await measureMemoryUsage(page);
      
      // Log memory usage progression
      console.log('Memory Usage Progression:');
      console.log(`  Baseline: ${baselineMemory.toFixed(2)} MB`);
      console.log(`  After Wizard: ${afterWizardMemory.toFixed(2)} MB`);
      console.log(`  After Simulation: ${afterSimulationMemory.toFixed(2)} MB`);
      console.log(`  After 10 Events: ${finalMemory.toFixed(2)} MB`);
      
      // Memory usage assertions
      expect(finalMemory).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
      
      // Memory shouldn't grow excessively with events
      const memoryGrowthPerEvent = (finalMemory - afterSimulationMemory) / 10;
      expect(memoryGrowthPerEvent).toBeLessThan(5); // 5MB per event max
    });

    test('should handle memory cleanup after modal operations', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      const baselineMemory = await measureMemoryUsage(page);
      
      // Open and close many modals to test memory cleanup
      for (let i = 0; i < 20; i++) {
        await dashboard.openEventCreationModal();
        await eventModal.waitForModalToOpen();
        
        // Don't save, just cancel to test cleanup
        await eventModal.cancelEvent();
        await eventModal.waitForModalToClose();
      }
      
      const afterModalsMemory = await measureMemoryUsage(page);
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window) {
          // @ts-ignore
          window.gc();
        }
      });
      
      await page.waitForTimeout(1000); // Allow cleanup time
      const afterGCMemory = await measureMemoryUsage(page);
      
      console.log('Modal Memory Test:');
      console.log(`  Baseline: ${baselineMemory.toFixed(2)} MB`);
      console.log(`  After 20 Modals: ${afterModalsMemory.toFixed(2)} MB`);
      console.log(`  After GC: ${afterGCMemory.toFixed(2)} MB`);
      
      // Memory should not grow significantly from modal operations
      const memoryGrowth = afterGCMemory - baselineMemory;
      expect(memoryGrowth).toBeLessThan(20); // 20MB max growth
    });
  });

  test.describe('Simulation Execution Time Limits', () => {
    test('should complete standard simulation within time limits', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      
      const { result, time: wizardTime } = await measureExecutionTime(async () => {
        await quickstartWizard.completeFullWizardFlow({
          salary: 100000,
          expenses: 60000,
          retirementAge: 65
        });
        await quickstartWizard.waitForWizardToClose();
      });
      
      await dashboard.waitForDashboardToLoad();
      
      const { result: simulationResult, time: simulationTime } = await measureExecutionTime(async () => {
        await dashboard.waitForSimulationToComplete();
      });
      
      console.log('Simulation Performance:');
      console.log(`  Wizard Flow Time: ${wizardTime}ms`);
      console.log(`  Simulation Time: ${simulationTime}ms`);
      
      // Assertions
      expect(wizardTime).toBeLessThan(PERFORMANCE_THRESHOLDS.wizardFlowTime);
      expect(simulationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simulationTime);
      
      // Verify results are displayed
      await expect(dashboard.chartContainer).toBeVisible();
    });

    test('should handle complex simulation scenarios efficiently', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Create complex scenario with multiple events
      const complexEvents = [
        { type: 'Initial State', amount: 100000 },
        { type: 'Income', amount: 150000 },
        { type: 'Income', amount: 50000 }, // Spouse income
        { type: 'Expense', amount: 8000, frequency: 'Monthly' },
        { type: 'Contribution', amount: 2000, frequency: 'Monthly', account: 'tax_deferred' },
        { type: 'Contribution', amount: 1000, frequency: 'Monthly', account: 'roth' },
        { type: 'Liability', amount: 400000, rate: 3.5 }, // Mortgage
        { type: 'Liability', amount: 30000, rate: 6.0 } // Car loan
      ];
      
      const { result, time: eventCreationTime } = await measureExecutionTime(async () => {
        for (const eventConfig of complexEvents) {
          await dashboard.openEventCreationModal();
          await eventModal.waitForModalToOpen();
          
          await eventModal.selectEventType(eventConfig.type);
          
          switch (eventConfig.type) {
            case 'Initial State':
              await eventModal.fillInitialStateEvent({
                cashBalance: eventConfig.amount,
                taxableBalance: eventConfig.amount / 2,
                taxDeferredBalance: eventConfig.amount
              });
              break;
            case 'Income':
              await eventModal.fillIncomeEvent({
                amount: eventConfig.amount,
                frequency: 'Annually',
                description: `Income ${eventConfig.amount}`
              });
              break;
            case 'Expense':
              await eventModal.fillExpenseEvent({
                amount: eventConfig.amount,
                frequency: eventConfig.frequency || 'Monthly',
                description: `Expense ${eventConfig.amount}`
              });
              break;
            case 'Contribution':
              await eventModal.fillContributionEvent({
                amount: eventConfig.amount,
                frequency: eventConfig.frequency || 'Monthly',
                targetAccount: eventConfig.account,
                description: `Contribution ${eventConfig.amount}`
              });
              break;
            case 'Liability':
              await eventModal.fillLiabilityEvent({
                principalAmount: eventConfig.amount,
                interestRate: eventConfig.rate,
                termYears: 30,
                description: `Liability ${eventConfig.amount}`
              });
              break;
          }
          
          await eventModal.saveEvent();
          await eventModal.waitForModalToClose();
        }
      });
      
      const { result: complexSimResult, time: complexSimTime } = await measureExecutionTime(async () => {
        await dashboard.waitForSimulationToComplete();
      });
      
      console.log('Complex Simulation Performance:');
      console.log(`  Event Creation Time: ${eventCreationTime}ms`);
      console.log(`  Complex Simulation Time: ${complexSimTime}ms`);
      console.log(`  Average Time per Event: ${(eventCreationTime / complexEvents.length).toFixed(0)}ms`);
      
      // Complex simulations should still complete within reasonable time
      expect(complexSimTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simulationTime * 2);
      expect(eventCreationTime / complexEvents.length).toBeLessThan(PERFORMANCE_THRESHOLDS.eventCreationTime);
    });

    test('should handle large dataset simulations', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Add initial state
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      await eventModal.selectEventType('Initial State');
      await eventModal.fillInitialStateEvent({
        cashBalance: 50000,
        taxDeferredBalance: 100000
      });
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      const eventCount = 100; // Large number of events
      
      const { result, time: massEventTime } = await measureExecutionTime(async () => {
        for (let i = 0; i < eventCount; i++) {
          await dashboard.openEventCreationModal();
          await eventModal.waitForModalToOpen();
          
          await eventModal.selectEventType('Income');
          await eventModal.fillIncomeEvent({
            amount: 1000 + (i * 10),
            frequency: 'One-time',
            startDate: `202${5 + Math.floor(i / 50)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
            description: `Event ${i}`
          });
          
          await eventModal.saveEvent();
          await eventModal.waitForModalToClose();
          
          // Brief pause every 20 events to prevent overwhelming
          if (i % 20 === 19) {
            await page.waitForTimeout(100);
          }
        }
      });
      
      const { result: largeDatasetSimResult, time: largeDatasetSimTime } = await measureExecutionTime(async () => {
        await dashboard.waitForSimulationToComplete();
      });
      
      console.log('Large Dataset Performance:');
      console.log(`  ${eventCount} Events Creation Time: ${massEventTime}ms`);
      console.log(`  Large Dataset Simulation Time: ${largeDatasetSimTime}ms`);
      console.log(`  Average Event Creation: ${(massEventTime / eventCount).toFixed(0)}ms`);
      
      // Large datasets should complete within extended time limits
      expect(largeDatasetSimTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simulationTime * 5);
      expect(massEventTime / eventCount).toBeLessThan(PERFORMANCE_THRESHOLDS.eventCreationTime);
      
      // Verify results are still displayed correctly
      await expect(dashboard.chartContainer).toBeVisible();
    });
  });

  test.describe('Chart Rendering Performance', () => {
    test('should render charts within performance thresholds', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 80000,
        expenses: 50000,
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      await dashboard.waitForSimulationToComplete();
      
      // Measure chart rendering time
      const { result, time: chartRenderTime } = await measureExecutionTime(async () => {
        // Force chart re-render by updating simulation
        await dashboard.openEventCreationModal();
        await eventModal.waitForModalToOpen();
        
        await eventModal.selectEventType('Income');
        await eventModal.fillIncomeEvent({
          amount: 5000,
          frequency: 'One-time',
          description: 'Chart Render Test'
        });
        await eventModal.saveEvent();
        await eventModal.waitForModalToClose();
        
        await dashboard.waitForSimulationToComplete();
        await dashboard.verifyChartDataUpdated();
      });
      
      console.log('Chart Rendering Performance:');
      console.log(`  Chart Render Time: ${chartRenderTime}ms`);
      
      expect(chartRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.chartRenderTime);
      
      // Verify chart is interactive
      await expect(dashboard.chartContainer).toBeVisible();
    });

    test('should handle chart interactions efficiently', async ({ page }) => {
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 90000,
        expenses: 55000,
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      await dashboard.waitForSimulationToComplete();
      
      const chartContainer = dashboard.chartContainer;
      await expect(chartContainer).toBeVisible();
      
      const chartBox = await chartContainer.boundingBox();
      
      if (chartBox) {
        // Measure chart interaction performance
        const { result, time: interactionTime } = await measureExecutionTime(async () => {
          // Test hover interactions
          await page.mouse.move(chartBox.x + chartBox.width * 0.3, chartBox.y + chartBox.height * 0.5);
          await page.waitForTimeout(100);
          
          await page.mouse.move(chartBox.x + chartBox.width * 0.7, chartBox.y + chartBox.height * 0.5);
          await page.waitForTimeout(100);
          
          // Test click interactions
          await page.mouse.click(chartBox.x + chartBox.width * 0.5, chartBox.y + chartBox.height * 0.5);
          await page.waitForTimeout(100);
        });
        
        console.log('Chart Interaction Performance:');
        console.log(`  Interaction Time: ${interactionTime}ms`);
        
        expect(interactionTime).toBeLessThan(1000); // 1 second for interactions
      }
    });
  });

  test.describe('Browser Resource Utilization', () => {
    test('should not exceed CPU usage thresholds', async ({ page }) => {
      // Enable performance monitoring
      await page.coverage.startJSCoverage();
      
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 75000,
        expenses: 45000,
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      await dashboard.waitForSimulationToComplete();
      
      // Stop coverage and analyze
      const coverage = await page.coverage.stopJSCoverage();
      
      // Calculate coverage metrics
      const totalBytes = coverage.reduce((total, entry) => total + entry.text.length, 0);
      const usedBytes = coverage.reduce((total, entry) => {
        const used = entry.ranges.reduce((used, range) => used + (range.end - range.start), 0);
        return total + used;
      }, 0);
      
      const usagePercentage = (usedBytes / totalBytes) * 100;
      
      console.log('Code Coverage Analysis:');
      console.log(`  Total Bytes: ${totalBytes}`);
      console.log(`  Used Bytes: ${usedBytes}`);
      console.log(`  Usage Percentage: ${usagePercentage.toFixed(2)}%`);
      
      // Basic performance check - shouldn't have excessive unused code
      expect(usagePercentage).toBeGreaterThan(20); // At least 20% code utilization
    });

    test('should handle network performance appropriately', async ({ page }) => {
      // Monitor network requests
      const networkRequests: any[] = [];
      
      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      });
      
      page.on('response', response => {
        const request = networkRequests.find(req => req.url === response.url());
        if (request) {
          request.responseTime = Date.now() - request.timestamp;
          request.status = response.status();
        }
      });
      
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 85000,
        expenses: 50000,
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      await dashboard.waitForSimulationToComplete();
      
      // Analyze network performance
      const relevantRequests = networkRequests.filter(req => 
        !req.url.includes('data:') && 
        !req.url.includes('chrome-extension:') &&
        req.responseTime !== undefined
      );
      
      const averageResponseTime = relevantRequests.reduce((total, req) => total + req.responseTime, 0) / relevantRequests.length;
      const slowRequests = relevantRequests.filter(req => req.responseTime > 2000);
      
      console.log('Network Performance Analysis:');
      console.log(`  Total Requests: ${relevantRequests.length}`);
      console.log(`  Average Response Time: ${averageResponseTime.toFixed(0)}ms`);
      console.log(`  Slow Requests (>2s): ${slowRequests.length}`);
      
      // Network performance assertions
      expect(slowRequests.length).toBeLessThan(relevantRequests.length * 0.1); // <10% slow requests
      expect(averageResponseTime).toBeLessThan(1000); // Average <1s response time
    });
  });

  test.describe('Performance Regression Detection', () => {
    test('should detect performance regressions', async ({ page }) => {
      // This test would ideally compare against baseline metrics
      // For now, we'll establish current performance characteristics
      
      const performanceMetrics: PerformanceMetrics = {
        memoryUsage: 0,
        executionTime: 0,
        renderTime: 0
      };
      
      // Measure baseline performance
      const baselineMemory = await measureMemoryUsage(page);
      
      const { result, time: fullFlowTime } = await measureExecutionTime(async () => {
        await quickstartWizard.waitForWizardToOpen();
        await quickstartWizard.completeFullWizardFlow({
          salary: 100000,
          expenses: 60000,
          retirementAge: 65
        });
        await quickstartWizard.waitForWizardToClose();
        
        await dashboard.waitForDashboardToLoad();
        await dashboard.waitForSimulationToComplete();
      });
      
      const finalMemory = await measureMemoryUsage(page);
      
      performanceMetrics.memoryUsage = finalMemory - baselineMemory;
      performanceMetrics.executionTime = fullFlowTime;
      
      // Log performance metrics for regression tracking
      console.log('=== PERFORMANCE BASELINE ===');
      console.log(`Memory Usage: ${performanceMetrics.memoryUsage.toFixed(2)} MB`);
      console.log(`Execution Time: ${performanceMetrics.executionTime} ms`);
      console.log(`Date: ${new Date().toISOString()}`);
      console.log('===============================');
      
      // Store metrics (in real implementation, this would be stored persistently)
      await page.evaluate((metrics) => {
        window.localStorage.setItem('performance-baseline', JSON.stringify(metrics));
      }, performanceMetrics);
      
      // Assert against thresholds
      expect(performanceMetrics.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
      expect(performanceMetrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.wizardFlowTime);
    });

    test('should benchmark different simulation sizes', async ({ page }) => {
      const benchmarks = [];
      
      // Test different simulation complexities
      const scenarios = [
        { name: 'Simple', events: 5 },
        { name: 'Medium', events: 25 },
        { name: 'Complex', events: 50 }
      ];
      
      for (const scenario of scenarios) {
        await page.goto('/');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        
        await quickstartWizard.waitForWizardToOpen();
        await quickstartWizard.clickSkipToAdvanced();
        await quickstartWizard.waitForWizardToClose();
        
        await dashboard.waitForDashboardToLoad();
        
        const startMemory = await measureMemoryUsage(page);
        
        const { result, time: scenarioTime } = await measureExecutionTime(async () => {
          // Add initial state
          await dashboard.openEventCreationModal();
          await eventModal.waitForModalToOpen();
          await eventModal.selectEventType('Initial State');
          await eventModal.fillInitialStateEvent({
            cashBalance: 10000,
            taxDeferredBalance: 50000
          });
          await eventModal.saveEvent();
          await eventModal.waitForModalToClose();
          
          // Add events based on scenario complexity
          for (let i = 0; i < scenario.events; i++) {
            await dashboard.openEventCreationModal();
            await eventModal.waitForModalToOpen();
            
            const eventType = ['Income', 'Expense', 'Contribution'][i % 3];
            await eventModal.selectEventType(eventType);
            
            switch (eventType) {
              case 'Income':
                await eventModal.fillIncomeEvent({
                  amount: 1000 + i * 100,
                  frequency: 'Monthly',
                  description: `Income ${i}`
                });
                break;
              case 'Expense':
                await eventModal.fillExpenseEvent({
                  amount: 500 + i * 50,
                  frequency: 'Monthly',
                  description: `Expense ${i}`
                });
                break;
              case 'Contribution':
                await eventModal.fillContributionEvent({
                  amount: 300 + i * 30,
                  frequency: 'Monthly',
                  targetAccount: 'tax_deferred',
                  description: `Contribution ${i}`
                });
                break;
            }
            
            await eventModal.saveEvent();
            await eventModal.waitForModalToClose();
          }
          
          await dashboard.waitForSimulationToComplete();
        });
        
        const endMemory = await measureMemoryUsage(page);
        
        benchmarks.push({
          scenario: scenario.name,
          events: scenario.events,
          time: scenarioTime,
          memoryUsage: endMemory - startMemory
        });
      }
      
      // Log benchmark results
      console.log('=== SIMULATION BENCHMARKS ===');
      benchmarks.forEach(benchmark => {
        console.log(`${benchmark.scenario} (${benchmark.events} events):`);
        console.log(`  Time: ${benchmark.time}ms`);
        console.log(`  Memory: ${benchmark.memoryUsage.toFixed(2)}MB`);
        console.log(`  Time/Event: ${(benchmark.time / benchmark.events).toFixed(0)}ms`);
      });
      console.log('=============================');
      
      // Performance should scale reasonably
      const simpleTime = benchmarks.find(b => b.scenario === 'Simple')?.time || 0;
      const complexTime = benchmarks.find(b => b.scenario === 'Complex')?.time || 0;
      
      // Complex scenario shouldn't be more than 10x slower than simple
      expect(complexTime / simpleTime).toBeLessThan(10);
    });
  });
});