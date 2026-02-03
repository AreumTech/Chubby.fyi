/**
 * Goal Performance Optimization Demo
 * 
 * Demonstrates the performance improvements achieved through optimizations
 */

import { dataService } from '@/services/dataService';
import { goalPerformanceReporter } from './goalPerformanceReport';
import { performanceMonitor } from './performanceMonitor';
import { EnhancedGoal, StandardAccountType } from '@/types/enhanced-goal';
import type { SimulationPayload, YearlyData } from '@/types/index';
import { logger } from './logger';

export class PerformanceDemo {
  /**
   * Run comprehensive performance demonstration
   */
  async runDemo(): Promise<void> {
    logger.info('🚀 Starting Goal Performance Optimization Demo\n');
    
    // Start performance monitoring
    performanceMonitor.startMonitoring(5000);
    
    try {
      // Test 1: Small scale (realistic user scenario)
      await this.runSmallScaleDemo();
      
      // Test 2: Medium scale (power user scenario)
      await this.runMediumScaleDemo();
      
      // Test 3: Large scale (stress test)
      await this.runLargeScaleDemo();
      
      // Generate final report
      await this.generateFinalReport();
      
    } catch (error) {
      logger.error('Demo failed:', error);
    } finally {
      performanceMonitor.stopMonitoring();
    }
  }

  /**
   * Small scale demo: 5 goals, 100 paths, 20 years
   */
  private async runSmallScaleDemo(): Promise<void> {
    logger.info('📊 Test 1: Small Scale (Typical User)');
    logger.info('   - 5 goals, 100 simulation paths, 20 years');
    
    const goals = this.generateGoals(5);
    const { payload, allPaths } = this.generateSimulationData(100, 20);
    
    dataService.setSimulationPayload(payload);
    dataService['_allPaths'] = allPaths;
    
    const report = await goalPerformanceReporter.generatePerformanceReport(goals, 100, 20);
    logger.info(`   ✅ Speed improvement: ${report.improvements.speedImprovement.toFixed(1)}%`);
    logger.info(`   ✅ Cache hit rate: ${report.improvements.cacheEfficiency.toFixed(1)}%`);
    logger.info(`   ✅ Memory usage: ${(report.afterOptimization.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`);
    
    // Test lazy loading
    logger.info('   🔄 Testing lazy loading...');
    const lazyStart = performance.now();
    for (const goal of goals) {
      await dataService.getGoalAchievementLazy(goal.id);
    }
    const lazyEnd = performance.now();
    logger.info(`   ✅ Lazy loading completed in ${(lazyEnd - lazyStart).toFixed(2)}ms\n`);
  }

  /**
   * Medium scale demo: 15 goals, 500 paths, 30 years
   */
  private async runMediumScaleDemo(): Promise<void> {
    logger.info('📊 Test 2: Medium Scale (Power User)');
    logger.info('   - 15 goals, 500 simulation paths, 30 years');
    
    const goals = this.generateGoals(15);
    const { payload, allPaths } = this.generateSimulationData(500, 30);
    
    dataService.setSimulationPayload(payload);
    dataService['_allPaths'] = allPaths;
    
    const report = await goalPerformanceReporter.generatePerformanceReport(goals, 500, 30);
    logger.info(`   ✅ Speed improvement: ${report.improvements.speedImprovement.toFixed(1)}%`);
    logger.info(`   ✅ Cache hit rate: ${report.improvements.cacheEfficiency.toFixed(1)}%`);
    logger.info(`   ✅ Memory usage: ${(report.afterOptimization.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`);
    
    // Test batch processing
    logger.info('   🔄 Testing batch processing...');
    const batchStart = performance.now();
    const goalIds = goals.map(g => g.id);
    await dataService.processBatchGoals(goalIds, 'achievement', 5);
    const batchEnd = performance.now();
    logger.info(`   ✅ Batch processing completed in ${(batchEnd - batchStart).toFixed(2)}ms\n`);
  }

  /**
   * Large scale demo: 25 goals, 1000 paths, 40 years
   */
  private async runLargeScaleDemo(): Promise<void> {
    logger.info('📊 Test 3: Large Scale (Stress Test)');
    logger.info('   - 25 goals, 1000 simulation paths, 40 years');
    
    const goals = this.generateGoals(25);
    const { payload, allPaths } = this.generateSimulationData(1000, 40);
    
    dataService.setSimulationPayload(payload);
    dataService['_allPaths'] = allPaths;
    
    const report = await goalPerformanceReporter.generatePerformanceReport(goals, 1000, 40);
    logger.info(`   ✅ Speed improvement: ${report.improvements.speedImprovement.toFixed(1)}%`);
    logger.info(`   ✅ Cache hit rate: ${report.improvements.cacheEfficiency.toFixed(1)}%`);
    logger.info(`   ✅ Memory usage: ${(report.afterOptimization.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`);
    
    // Test memory optimization
    logger.info('   🔄 Testing memory optimization...');
    const memoryBefore = this.getCurrentMemoryUsage();
    dataService.optimizeMemoryUsage();
    const memoryAfter = this.getCurrentMemoryUsage();
    const memorySaved = (memoryBefore - memoryAfter) / 1024 / 1024;
    logger.info(`   ✅ Memory optimization saved ${memorySaved.toFixed(2)}MB\n`);
  }

  /**
   * Generate final performance report
   */
  private async generateFinalReport(): Promise<void> {
    logger.info('📋 Final Performance Report');
    logger.info('=' * 50);
    
    const trendAnalysis = goalPerformanceReporter.getTrendAnalysis();
    logger.info(`Average Speed Improvement: ${trendAnalysis.averageSpeedImprovement.toFixed(1)}%`);
    logger.info(`Average Cache Hit Rate: ${trendAnalysis.averageCacheHitRate.toFixed(1)}%`);
    logger.info(`Average Memory Change: ${trendAnalysis.averageMemoryReduction.toFixed(1)}%\n`);
    
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    logger.info('Current System Status:');
    logger.info(`- Memory Usage: ${(performanceSummary.currentMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    logger.info(`- Memory Trend: ${performanceSummary.memoryTrend}`);
    logger.info(`- Recent Alerts: ${performanceSummary.recentAlerts}`);
    
    if (trendAnalysis.bestPerformingConfiguration) {
      const best = trendAnalysis.bestPerformingConfiguration;
      logger.info('\nBest Performing Configuration:');
      logger.info(`- Goals: ${best.testConfiguration.goalCount}`);
      logger.info(`- Paths: ${best.testConfiguration.pathCount}`);
      logger.info(`- Speed Improvement: ${best.improvements.speedImprovement.toFixed(1)}%`);
    }
    
    logger.info('\n🎉 Performance Demo Completed Successfully!');
  }

  /**
   * Generate test goals
   */
  private generateGoals(count: number): EnhancedGoal[] {
    const accountTypes: StandardAccountType[] = ['cash', 'taxable', 'tax_deferred', 'roth', '529', 'hsa'];
    const goals: EnhancedGoal[] = [];
    const currentDate = new Date();
    
    for (let i = 0; i < count; i++) {
      const accountType = accountTypes[i % accountTypes.length];
      const targetDate = new Date(currentDate);
      targetDate.setFullYear(currentDate.getFullYear() + Math.random() * 10 + 1);
      
      goals.push({
        id: `demo-goal-${i}`,
        name: `Goal ${i + 1}`,
        description: `Demo goal for performance testing`,
        targetAmount: Math.random() * 500000 + 10000,
        targetDate,
        targetAccount: {
          type: accountType,
          name: `Account ${i + 1}`
        },
        category: 'CUSTOM',
        priority: 'MEDIUM',
        currentAmount: Math.random() * 50000,
        createdAt: currentDate,
        updatedAt: currentDate,
        isActive: true
      });
    }
    
    return goals;
  }

  /**
   * Generate simulation data for testing
   */
  private generateSimulationData(pathCount: number, yearRange: number): {
    payload: SimulationPayload;
    allPaths: YearlyData[][];
  } {
    const currentYear = new Date().getFullYear();
    const allPaths: YearlyData[][] = [];
    
    for (let pathIndex = 0; pathIndex < pathCount; pathIndex++) {
      const path: YearlyData[] = [];
      
      for (let yearOffset = 0; yearOffset < yearRange; yearOffset++) {
        const year = currentYear + yearOffset;
        const baseAmount = 50000 + (pathIndex * 1000);
        const yearGrowth = Math.pow(1.07, yearOffset);
        const volatility = (Math.random() - 0.5) * 0.4;
        
        const yearData: YearlyData = {
          calendarYear: year,
          ageAtYearEnd: 35 + yearOffset,
          netWorthEndOfYear: baseAmount * yearGrowth * (1 + volatility),
          assetsEndOfYear: {
            cash: baseAmount * 0.1 * yearGrowth * (1 + volatility * 0.5),
            taxable: baseAmount * 0.4 * yearGrowth * (1 + volatility),
            tax_deferred: baseAmount * 0.3 * yearGrowth * (1 + volatility),
            roth: baseAmount * 0.15 * yearGrowth * (1 + volatility),
            hsa: baseAmount * 0.05 * yearGrowth * (1 + volatility),
            education529: baseAmount * 0.05 * yearGrowth * (1 + volatility)
          },
          totalIncomeAnnual: 100000 + (pathIndex * 100),
          totalExpensesAnnual: 70000 + (pathIndex * 50),
          taxPaidAnnual: 20000 + (pathIndex * 20),
          totalContributionsToInvestmentsAnnual: 15000,
          totalDebtPaymentsPrincipalAnnual: 5000,
          totalQualifiedDividendsAnnual: 2000,
          totalOrdinaryDividendsAnnual: 1000
        };
        
        path.push(yearData);
      }
      
      allPaths.push(path);
    }
    
    const payload: SimulationPayload = {
      planProjection: {
        charts: {
          netWorth: { timeSeries: [], samplePaths: [], summary: { recommendedYAxisMax: 1000000, recommendedYAxisMin: 0, volatilityPeriods: [] }},
          cashFlow: { timeSeries: [], summary: { averageAnnualSavings: 0, averageSavingsRate: 0, peakSavingsYear: currentYear, lowestSavingsYear: currentYear }},
          assetAllocation: { timeSeries: [], targetBands: [], summary: { currentAllocation: [], targetAllocation: [], driftFromTarget: [] }},
          eventMarkers: []
        },
        analysis: { annualSnapshots: {} },
        summary: {
          goalOutcomes: [],
          portfolioStats: { p10FinalValue: 0, p25FinalValue: 0, p50FinalValue: 0, p75FinalValue: 0, p90FinalValue: 0, successRate: 75 },
          planHealth: { overallScore: 75, riskLevel: 'moderate', confidenceLevel: 'medium', keyRisks: [], keyStrengths: [] },
          quickActions: []
        }
      },
      planInputs: { goals: [], events: [], strategies: [], accounts: [] }
    };
    
    return { payload, allPaths };
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
}

// Export demo runner function
export async function runPerformanceDemo(): Promise<void> {
  const demo = new PerformanceDemo();
  await demo.runDemo();
}