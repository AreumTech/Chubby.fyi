/**
 * Performance Monitor Utility
 *
 * Provides real-time performance monitoring and memory usage tracking
 * for goal calculation operations.
 */

import { logger } from './logger';

export interface PerformanceSnapshot {
  timestamp: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  goalCalculationMetrics: {
    totalCalculations: number;
    averageCalculationTime: number;
    cacheHitRate: number;
    activeGoals: number;
  };
}

export interface PerformanceAlert {
  type: 'memory' | 'performance' | 'cache';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
  metrics: any;
}

export class PerformanceMonitor {
  private snapshots: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  private readonly MAX_SNAPSHOTS = 100;
  private readonly MEMORY_WARNING_THRESHOLD = 200 * 1024 * 1024; // 200MB
  private readonly MEMORY_CRITICAL_THRESHOLD = 500 * 1024 * 1024; // 500MB
  private readonly PERFORMANCE_WARNING_THRESHOLD = 2000; // 2 seconds
  private readonly CACHE_MISS_WARNING_THRESHOLD = 50; // 50% cache miss rate

  /**
   * Start monitoring performance metrics
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.captureSnapshot();
    }, intervalMs);
    
    logger.info('📊 Performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    
    logger.info('📊 Performance monitoring stopped');
  }

  /**
   * Capture a performance snapshot
   */
  captureSnapshot(): PerformanceSnapshot {
    const memoryUsage = this.getMemoryUsage();
    const goalCalculationMetrics = this.getGoalCalculationMetrics();
    
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      memoryUsage,
      goalCalculationMetrics
    };

    this.snapshots.push(snapshot);
    
    // Limit snapshot history
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    // Check for performance issues
    this.checkForAlerts(snapshot);
    
    return snapshot;
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    
    // Browser fallback (limited information)
    return {
      heapUsed: (performance as any).memory?.usedJSHeapSize || 0,
      heapTotal: (performance as any).memory?.totalJSHeapSize || 0,
      external: 0,
      rss: 0
    };
  }

  /**
   * Get goal calculation metrics from dataService
   */
  private getGoalCalculationMetrics() {
    try {
      // Import dynamically to avoid circular dependencies
      const { dataService } = require('@/services/dataService');
      const metrics = dataService.getPerformanceMetrics();
      
      return {
        totalCalculations: metrics.totalGoalsProcessed,
        averageCalculationTime: metrics.goalCalculationTime,
        cacheHitRate: metrics.cacheHitRate,
        activeGoals: metrics.totalGoalsProcessed
      };
    } catch (error) {
      return {
        totalCalculations: 0,
        averageCalculationTime: 0,
        cacheHitRate: 0,
        activeGoals: 0
      };
    }
  }

  /**
   * Check for performance alerts
   */
  private checkForAlerts(snapshot: PerformanceSnapshot): void {
    // Memory usage alerts
    const heapUsed = snapshot.memoryUsage.heapUsed;
    
    if (heapUsed > this.MEMORY_CRITICAL_THRESHOLD) {
      this.addAlert({
        type: 'memory',
        severity: 'high',
        message: `Critical memory usage: ${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
        timestamp: snapshot.timestamp,
        metrics: { heapUsed }
      });
    } else if (heapUsed > this.MEMORY_WARNING_THRESHOLD) {
      this.addAlert({
        type: 'memory',
        severity: 'medium',
        message: `High memory usage: ${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
        timestamp: snapshot.timestamp,
        metrics: { heapUsed }
      });
    }

    // Performance alerts
    const avgCalculationTime = snapshot.goalCalculationMetrics.averageCalculationTime;
    if (avgCalculationTime > this.PERFORMANCE_WARNING_THRESHOLD) {
      this.addAlert({
        type: 'performance',
        severity: 'medium',
        message: `Slow goal calculations: ${avgCalculationTime.toFixed(2)}ms average`,
        timestamp: snapshot.timestamp,
        metrics: { avgCalculationTime }
      });
    }

    // Cache performance alerts
    const cacheHitRate = snapshot.goalCalculationMetrics.cacheHitRate;
    if (cacheHitRate < this.CACHE_MISS_WARNING_THRESHOLD && snapshot.goalCalculationMetrics.totalCalculations > 10) {
      this.addAlert({
        type: 'cache',
        severity: 'low',
        message: `Low cache hit rate: ${cacheHitRate.toFixed(1)}%`,
        timestamp: snapshot.timestamp,
        metrics: { cacheHitRate }
      });
    }
  }

  /**
   * Add a performance alert
   */
  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Limit alert history
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    // Log critical alerts immediately
    if (alert.severity === 'high') {
      logger.error(`🚨 [Performance Alert] ${alert.message}`);
    } else if (alert.severity === 'medium') {
      logger.warn(`⚠️ [Performance Alert] ${alert.message}`);
    }
  }

  /**
   * Get recent performance snapshots
   */
  getSnapshots(count?: number): PerformanceSnapshot[] {
    if (count) {
      return this.snapshots.slice(-count);
    }
    return [...this.snapshots];
  }

  /**
   * Get recent alerts
   */
  getAlerts(severityFilter?: PerformanceAlert['severity']): PerformanceAlert[] {
    if (severityFilter) {
      return this.alerts.filter(alert => alert.severity === severityFilter);
    }
    return [...this.alerts];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    currentMemoryUsage: number;
    averageCalculationTime: number;
    cacheHitRate: number;
    recentAlerts: number;
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    const latest = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];
    
    if (!latest) {
      return {
        currentMemoryUsage: 0,
        averageCalculationTime: 0,
        cacheHitRate: 0,
        recentAlerts: 0,
        memoryTrend: 'stable'
      };
    }

    // Calculate memory trend
    let memoryTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (previous) {
      const memoryDiff = latest.memoryUsage.heapUsed - previous.memoryUsage.heapUsed;
      const threshold = 10 * 1024 * 1024; // 10MB threshold
      
      if (memoryDiff > threshold) {
        memoryTrend = 'increasing';
      } else if (memoryDiff < -threshold) {
        memoryTrend = 'decreasing';
      }
    }

    // Count recent alerts (last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentAlerts = this.alerts.filter(alert => alert.timestamp > fiveMinutesAgo).length;

    return {
      currentMemoryUsage: latest.memoryUsage.heapUsed,
      averageCalculationTime: latest.goalCalculationMetrics.averageCalculationTime,
      cacheHitRate: latest.goalCalculationMetrics.cacheHitRate,
      recentAlerts,
      memoryTrend
    };
  }

  /**
   * Clear all monitoring data
   */
  clearData(): void {
    this.snapshots = [];
    this.alerts = [];
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const summary = this.getPerformanceSummary();
    const recentSnapshots = this.getSnapshots(10);
    const criticalAlerts = this.getAlerts('high');
    
    let report = '📊 Performance Monitoring Report\n';
    report += '=' * 40 + '\n\n';
    
    report += `Current Status:\n`;
    report += `- Memory Usage: ${(summary.currentMemoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- Average Calculation Time: ${summary.averageCalculationTime.toFixed(2)}ms\n`;
    report += `- Cache Hit Rate: ${summary.cacheHitRate.toFixed(1)}%\n`;
    report += `- Memory Trend: ${summary.memoryTrend}\n`;
    report += `- Recent Alerts: ${summary.recentAlerts}\n\n`;
    
    if (criticalAlerts.length > 0) {
      report += `🚨 Critical Alerts:\n`;
      criticalAlerts.forEach(alert => {
        report += `- ${alert.message} (${new Date(alert.timestamp).toLocaleTimeString()})\n`;
      });
      report += '\n';
    }
    
    if (recentSnapshots.length > 0) {
      report += `📈 Recent Performance Trend:\n`;
      recentSnapshots.forEach((snapshot, index) => {
        const time = new Date(snapshot.timestamp).toLocaleTimeString();
        const memory = (snapshot.memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
        const calcTime = snapshot.goalCalculationMetrics.averageCalculationTime.toFixed(1);
        report += `${index + 1}. ${time}: ${memory}MB, ${calcTime}ms avg\n`;
      });
    }
    
    return report;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();