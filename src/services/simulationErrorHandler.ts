/**
 * Simulation Error Handler
 * 
 * Provides sophisticated error handling specifically for simulation failures,
 * including automatic retry logic, graceful degradation, and user guidance.
 */

import { logger } from '@/utils/logger';
import { showWarning, showInfo, showSuccess, handleError } from '@/utils/notifications';
import { dataValidationService } from './dataValidationService';
import { wasmSimulationEngine } from './wasmSimulation';

export interface SimulationErrorContext {
  operation: 'single' | 'monteCarlo' | 'validation';
  input: any;
  attempt: number;
  maxAttempts: number;
  engineType: 'wasm' | 'fallback';
}

export interface SimulationRecoveryOptions {
  retryWithSimplified: boolean;
  switchToFallback: boolean;
  validateInputData: boolean;
  reduceComplexity: boolean;
  reportToUser: boolean;
}

export interface SimulationErrorAnalysis {
  category: 'input' | 'engine' | 'resource' | 'network' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRecoverable: boolean;
  suggestedActions: string[];
  recoveryOptions: SimulationRecoveryOptions;
}

class SimulationErrorHandler {
  private retryAttempts = new Map<string, number>();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Start with 1 second

  /**
   * Handle simulation error with comprehensive recovery strategy
   */
  async handleSimulationError(
    error: Error,
    context: SimulationErrorContext
  ): Promise<SimulationErrorAnalysis> {
    logger.error(`🚨 Simulation Error (${context.operation}):`, error);

    // Analyze the error
    const analysis = this.analyzeError(error, context);
    
    // Update retry tracking
    const retryKey = `${context.operation}-${context.engineType}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    this.retryAttempts.set(retryKey, currentAttempts + 1);

    // Log error details for debugging
    this.logErrorDetails(error, context, analysis);

    // Handle different error categories
    await this.handleErrorByCategory(error, context, analysis);

    // Provide user guidance
    if (analysis.recoveryOptions.reportToUser) {
      this.reportErrorToUser(error, context, analysis);
    }

    return analysis;
  }

  /**
   * Analyze error to determine category and recovery options
   */
  private analyzeError(error: Error, context: SimulationErrorContext): SimulationErrorAnalysis {
    const message = error.message.toLowerCase();
    let category: SimulationErrorAnalysis['category'] = 'unknown';
    let severity: SimulationErrorAnalysis['severity'] = 'medium';
    let isRecoverable = true;
    const suggestedActions: string[] = [];
    
    // Input/Data errors
    if (message.includes('validation') || 
        message.includes('invalid') || 
        message.includes('missing') ||
        message.includes('corrupt')) {
      category = 'input';
      severity = 'high';
      suggestedActions.push('Validate input data');
      suggestedActions.push('Check for missing required fields');
      suggestedActions.push('Review event and goal configurations');
    }
    
    // Engine errors (WASM/JavaScript)
    else if (message.includes('wasm') || 
             message.includes('webassembly') ||
             message.includes('fallback') ||
             message.includes('engine')) {
      category = 'engine';
      severity = context.engineType === 'wasm' ? 'medium' : 'high';
      suggestedActions.push('Switch to fallback engine');
      suggestedActions.push('Reduce simulation complexity');
    }
    
    // Resource errors (memory, timeout)
    else if (message.includes('memory') ||
             message.includes('timeout') ||
             message.includes('resource') ||
             message.includes('limit')) {
      category = 'resource';
      severity = 'medium';
      suggestedActions.push('Reduce Monte Carlo iterations');
      suggestedActions.push('Shorten simulation period');
      suggestedActions.push('Simplify financial plan');
    }
    
    // Network errors
    else if (message.includes('network') ||
             message.includes('fetch') ||
             message.includes('connection') ||
             message.includes('load')) {
      category = 'network';
      severity = 'low';
      suggestedActions.push('Check internet connection');
      suggestedActions.push('Retry simulation');
      suggestedActions.push('Switch to offline mode');
    }
    
    // Critical errors that may not be recoverable
    if (message.includes('critical') ||
        message.includes('fatal') ||
        context.attempt >= this.maxRetries) {
      severity = 'critical';
      isRecoverable = false;
    }

    // Determine recovery options
    const recoveryOptions: SimulationRecoveryOptions = {
      retryWithSimplified: category === 'resource' || category === 'engine',
      switchToFallback: category === 'engine' && context.engineType === 'wasm',
      validateInputData: category === 'input',
      reduceComplexity: category === 'resource',
      reportToUser: severity !== 'low' || context.attempt >= 2
    };

    return {
      category,
      severity,
      isRecoverable,
      suggestedActions,
      recoveryOptions
    };
  }

  /**
   * Handle error based on its category
   */
  private async handleErrorByCategory(
    error: Error,
    context: SimulationErrorContext,
    analysis: SimulationErrorAnalysis
  ): Promise<void> {
    switch (analysis.category) {
      case 'input':
        await this.handleInputError(error, context);
        break;
      
      case 'engine':
        await this.handleEngineError(error, context);
        break;
      
      case 'resource':
        await this.handleResourceError(error, context);
        break;
      
      case 'network':
        await this.handleNetworkError(error, context);
        break;
      
      default:
        await this.handleUnknownError(error, context);
        break;
    }
  }

  /**
   * Handle input/validation errors
   */
  private async handleInputError(error: Error, context: SimulationErrorContext): Promise<void> {
    logger.info('🔍 Handling input error...');

    // Run data validation
    try {
      const validationResult = dataValidationService.validateLocalStorageData();
      
      if (!validationResult.isValid) {
        showWarning(
          'Data Validation Issues',
          `Found ${validationResult.errors.length} data errors that may be causing simulation failures.`,
          8000
        );
        
        // Offer data cleaning
        if (validationResult.errors.length > 0) {
          setTimeout(() => {
            if (confirm('Data corruption detected. Would you like to run the data cleaning tool?')) {
              dataValidationService.cleanCorruptedData();
            }
          }, 2000);
        }
      }
    } catch (validationError) {
      logger.warn('Data validation failed:', validationError);
    }
  }

  /**
   * Handle engine-specific errors
   */
  private async handleEngineError(error: Error, context: SimulationErrorContext): Promise<void> {
    logger.info('⚙️ Handling engine error...');

    if (context.engineType === 'wasm') {
      // Try to force fallback mode
      wasmSimulationEngine.forceFallbackMode();
      
      showInfo(
        'Switching Engines',
        'High-performance engine unavailable. Switching to compatibility mode.',
        5000
      );
    } else {
      // Even fallback failed - this is serious
      showWarning(
        'Simulation Engine Error',
        'Both simulation engines encountered errors. Please try simplifying your financial plan.',
        10000
      );
    }
  }

  /**
   * Handle resource constraint errors
   */
  private async handleResourceError(error: Error, context: SimulationErrorContext): Promise<void> {
    logger.info('💾 Handling resource error...');

    const message = error.message.toLowerCase();
    
    if (message.includes('memory')) {
      showWarning(
        'Memory Limit Reached',
        'Simulation requires too much memory. Try reducing Monte Carlo iterations or simulation period.',
        8000
      );
      
      // Suggest specific reductions
      setTimeout(() => {
        showInfo(
          'Memory Optimization Tips',
          '• Reduce Monte Carlo runs to 1000 or fewer\n• Limit simulation to 30-40 years\n• Remove complex events temporarily',
          10000
        );
      }, 3000);
    }
    
    if (message.includes('timeout')) {
      showWarning(
        'Simulation Timeout',
        'Simulation is taking too long. Consider simplifying your financial plan.',
        8000
      );
    }
  }

  /**
   * Handle network-related errors
   */
  private async handleNetworkError(error: Error, context: SimulationErrorContext): Promise<void> {
    logger.info('🌐 Handling network error...');

    showInfo(
      'Network Issues Detected',
      'Simulation resources could not be loaded. Retrying with offline capabilities.',
      5000
    );

    // Wait a bit and try to reload WASM if needed
    if (context.engineType === 'wasm') {
      setTimeout(async () => {
        try {
          const success = await wasmSimulationEngine.resetAndRetryWASM();
          if (success) {
            showSuccess(
              'Engine Reconnected',
              'High-performance simulation engine is back online.',
              3000
            );
          }
        } catch (retryError) {
          logger.warn('WASM retry failed:', retryError);
        }
      }, 5000);
    }
  }

  /**
   * Handle unknown/unclassified errors
   */
  private async handleUnknownError(error: Error, context: SimulationErrorContext): Promise<void> {
    logger.info('❓ Handling unknown error...');

    showWarning(
      'Unexpected Error',
      'An unexpected error occurred during simulation. The application will attempt automatic recovery.',
      8000
    );

    // Try general recovery strategies
    if (context.attempt < this.maxRetries) {
      setTimeout(() => {
        showInfo(
          'Attempting Recovery',
          `Trying recovery strategy ${context.attempt + 1} of ${this.maxRetries}...`,
          3000
        );
      }, 2000);
    }
  }

  /**
   * Provide detailed error reporting to user
   */
  private reportErrorToUser(
    error: Error,
    context: SimulationErrorContext,
    analysis: SimulationErrorAnalysis
  ): void {
    const { category, severity, suggestedActions } = analysis;
    
    // Create user-friendly error report
    const title = this.getErrorTitle(category, severity);
    const message = this.getErrorMessage(error, context, analysis);
    const actions = this.getErrorActions(analysis);

    // Show appropriate notification type
    switch (severity) {
      case 'critical':
        handleError(error, `Simulation Error (${category})`, message);
        break;
      
      case 'high':
        showWarning(title, message, 10000);
        break;
      
      case 'medium':
        showWarning(title, message, 8000);
        break;
      
      case 'low':
        showInfo(title, message, 5000);
        break;
    }

    // Show suggested actions if available
    if (actions.length > 0) {
      setTimeout(() => {
        showInfo(
          'Suggested Solutions',
          actions.join('\n'),
          12000
        );
      }, 2000);
    }
  }

  /**
   * Generate user-friendly error title
   */
  private getErrorTitle(category: string, severity: string): string {
    const severityMap = {
      critical: 'Critical',
      high: 'Error',
      medium: 'Warning',
      low: 'Notice'
    };
    
    const categoryMap = {
      input: 'Data Issue',
      engine: 'Engine Problem',
      resource: 'Resource Limit',
      network: 'Connection Issue',
      unknown: 'Simulation Error'
    };

    return `${severityMap[severity]}: ${categoryMap[category]}`;
  }

  /**
   * Generate detailed error message for user
   */
  private getErrorMessage(
    error: Error,
    context: SimulationErrorContext,
    analysis: SimulationErrorAnalysis
  ): string {
    const { category } = analysis;
    const engineType = context.engineType === 'wasm' ? 'high-performance' : 'compatibility';
    
    switch (category) {
      case 'input':
        return `Your financial plan contains data that prevents simulation. This could be missing values, invalid numbers, or corrupted settings.`;
      
      case 'engine':
        return `The ${engineType} simulation engine encountered an error. The application will automatically switch to an alternative engine if available.`;
      
      case 'resource':
        return `The simulation requires more system resources than available. This often happens with complex plans or large numbers of scenarios.`;
      
      case 'network':
        return `Unable to load simulation resources due to connection issues. The application will work offline with reduced functionality.`;
      
      default:
        return `An unexpected error occurred during simulation. The application will attempt automatic recovery.`;
    }
  }

  /**
   * Generate actionable solutions for user
   */
  private getErrorActions(analysis: SimulationErrorAnalysis): string[] {
    const actions: string[] = [];
    
    if (analysis.recoveryOptions.validateInputData) {
      actions.push('• Review your events and goals for missing or invalid data');
      actions.push('• Use the data validation tool in Settings to check for corruption');
    }
    
    if (analysis.recoveryOptions.reduceComplexity) {
      actions.push('• Reduce Monte Carlo iterations in Advanced Settings');
      actions.push('• Shorten the simulation time period');
      actions.push('• Temporarily remove complex events');
    }
    
    if (analysis.recoveryOptions.switchToFallback) {
      actions.push('• The application will automatically use a backup simulation engine');
      actions.push('• Performance may be reduced but functionality is preserved');
    }
    
    if (analysis.recoveryOptions.retryWithSimplified) {
      actions.push('• Try running a simpler version of your plan first');
      actions.push('• Add complexity gradually to identify problematic elements');
    }
    
    if (actions.length === 0) {
      actions.push('• Try refreshing the page and running the simulation again');
      actions.push('• Contact support if the problem persists');
    }
    
    return actions;
  }

  /**
   * Log detailed error information for debugging
   */
  private logErrorDetails(
    error: Error,
    context: SimulationErrorContext,
    analysis: SimulationErrorAnalysis
  ): void {
    const errorDetails = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      analysis,
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: {
        size: this.getLocalStorageSize(),
        keys: Object.keys(localStorage)
      }
    };

    logger.error('🔍 Simulation Error Details', {
      error,
      context,
      analysis,
      fullDetails: errorDetails
    });
  }

  /**
   * Reset retry tracking for a specific operation
   */
  clearRetryTracking(operation?: string): void {
    if (operation) {
      const keysToRemove = Array.from(this.retryAttempts.keys())
        .filter(key => key.startsWith(operation));
      keysToRemove.forEach(key => this.retryAttempts.delete(key));
    } else {
      this.retryAttempts.clear();
    }
  }

  /**
   * Get current retry count for an operation
   */
  getRetryCount(operation: string, engineType: string): number {
    return this.retryAttempts.get(`${operation}-${engineType}`) || 0;
  }

  /**
   * Get localStorage size for debugging
   */
  private getLocalStorageSize(): number {
    try {
      return Object.keys(localStorage)
        .reduce((total, key) => {
          const value = localStorage.getItem(key);
          return total + (key.length + (value?.length || 0)) * 2;
        }, 0);
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const simulationErrorHandler = new SimulationErrorHandler();