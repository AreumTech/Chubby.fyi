/**
 * Production Error Monitoring Service
 * 
 * Provides basic error tracking and monitoring for production deployments.
 * Captures unhandled errors, failed simulations, and critical user actions.
 */

import { logger } from '@/utils/logger';

interface ErrorReport {
  timestamp: string;
  error: string;
  stack?: string;
  context?: string;
  userAgent: string;
  url: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ProductionErrorMonitoring {
  private isProduction: boolean;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 50;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    if (!this.isProduction) return;

    // Global unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError({
        error: event.message,
        stack: event.error?.stack,
        context: 'Global Error Handler',
        severity: 'high'
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        error: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        context: 'Unhandled Promise Rejection',
        severity: 'high'
      });
    });

    // React error boundary integration
    window.__PATHFINDER_ERROR_BOUNDARY__ = (error: Error, errorInfo: any) => {
      this.captureError({
        error: error.message,
        stack: error.stack,
        context: `React Error Boundary: ${errorInfo.componentStack}`,
        severity: 'critical'
      });
    };
  }

  captureError(errorData: Partial<ErrorReport>) {
    if (!this.isProduction) {
      logger.warn('Error captured (dev mode):', errorData);
      return;
    }

    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      error: errorData.error || 'Unknown error',
      stack: errorData.stack,
      context: errorData.context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: errorData.severity || 'medium'
    };

    this.errorQueue.push(report);

    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // For critical errors, attempt immediate reporting
    if (report.severity === 'critical') {
      this.flushErrors();
    }
  }

  captureSimulationError(error: Error, simulationContext: any) {
    this.captureError({
      error: `Simulation Error: ${error.message}`,
      stack: error.stack,
      context: `Simulation failed with context: ${JSON.stringify(simulationContext, null, 2)}`,
      severity: 'high'
    });
  }

  captureUserAction(action: string, success: boolean, details?: any) {
    if (!success) {
      this.captureError({
        error: `User action failed: ${action}`,
        context: `Action details: ${JSON.stringify(details, null, 2)}`,
        severity: 'medium'
      });
    }
  }

  private async flushErrors() {
    if (this.errorQueue.length === 0) return;

    try {
      // Store errors in localStorage as backup
      const existingErrors = JSON.parse(localStorage.getItem('pathfinder-error-reports') || '[]');
      const allErrors = [...existingErrors, ...this.errorQueue];
      
      // Keep only recent errors (last 100)
      const recentErrors = allErrors.slice(-100);
      localStorage.setItem('pathfinder-error-reports', JSON.stringify(recentErrors));

      // Clear the queue
      this.errorQueue = [];

      // In a real implementation, you would send errors to a monitoring service:
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(recentErrors)
      // });

    } catch (err) {
      logger.error('Failed to flush error reports:', err);
    }
  }

  getStoredErrors(): ErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem('pathfinder-error-reports') || '[]');
    } catch {
      return [];
    }
  }

  clearStoredErrors() {
    localStorage.removeItem('pathfinder-error-reports');
    this.errorQueue = [];
  }

  // Periodically flush errors
  startPeriodicFlush() {
    if (!this.isProduction) return;

    setInterval(() => {
      this.flushErrors();
    }, 30000); // Flush every 30 seconds
  }
}

// Create singleton instance
export const productionErrorMonitoring = new ProductionErrorMonitoring();

// Start periodic flushing
productionErrorMonitoring.startPeriodicFlush();

// Export for manual usage
export default productionErrorMonitoring;