/**
 * Dynamic Event Registry
 * 
 * Central registry and coordination service for all dynamic events.
 * Handles event evaluation, execution, and integration with the simulation engine.
 */

import { AnyDynamicEvent, DynamicEventType, SimulationContext, EventAction, DynamicEventConfig } from '../../types/events/dynamicEvents';
import { ConditionalContributionProcessor } from './conditionalContribution';
import { WaterfallAllocationProcessor } from './waterfallAllocation';
import { PercentageContributionProcessor } from './percentageContribution';
import { SmartDebtPaymentProcessor } from './smartDebtPayment';
import { GoalDrivenContributionProcessor } from './goalDrivenContribution';
import { EmergencyFundMaintenanceProcessor } from './emergencyFundMaintenance';
import { AutomaticRebalancingProcessor } from './automaticRebalancing';
import { IncomeResponsiveSavingsProcessor } from './incomeResponsiveSavings';
import { LifecycleAdjustmentProcessor } from './lifecycleAdjustment';
import { TaxLossHarvestingProcessor } from './taxLossHarvesting';
import { validateDynamicEvent, ValidationResult } from '../validationService';
import { logger } from '@/utils/logger';

/**
 * Interface for dynamic event processors
 */
interface DynamicEventProcessor {
  evaluate(event: AnyDynamicEvent, context: SimulationContext): Promise<EventAction[]>;
  validateEvent(event: AnyDynamicEvent): ValidationResult;
}

/**
 * Registry of all dynamic event processors
 */
const DYNAMIC_EVENT_PROCESSORS: Record<DynamicEventType, DynamicEventProcessor> = {
  CONDITIONAL_CONTRIBUTION: ConditionalContributionProcessor,
  WATERFALL_ALLOCATION: WaterfallAllocationProcessor,
  PERCENTAGE_CONTRIBUTION: PercentageContributionProcessor,
  SMART_DEBT_PAYMENT: SmartDebtPaymentProcessor,
  GOAL_DRIVEN_CONTRIBUTION: GoalDrivenContributionProcessor,
  EMERGENCY_FUND_MAINTENANCE: EmergencyFundMaintenanceProcessor,
  AUTOMATIC_REBALANCING: AutomaticRebalancingProcessor,
  INCOME_RESPONSIVE_SAVINGS: IncomeResponsiveSavingsProcessor,
  LIFECYCLE_ADJUSTMENT: LifecycleAdjustmentProcessor,
  TAX_LOSS_HARVESTING: TaxLossHarvestingProcessor,
};

/**
 * Default configuration for dynamic event evaluation
 */
const DEFAULT_CONFIG: DynamicEventConfig = {
  debugMode: false,
  maxActionsPerEvaluation: 10,
  defaultFallback: 'SKIP',
  performance: {
    maxEvaluationTimeMs: 5000,
    maxMemoryUsageMB: 100
  }
};

/**
 * Dynamic Event Registry Service
 * 
 * Provides centralized management and evaluation of dynamic events
 */
export class DynamicEventRegistry {
  private config: DynamicEventConfig;
  private evaluationCache: Map<string, { timestamp: number; result: EventAction[] }>;
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache TTL

  constructor(config: Partial<DynamicEventConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.evaluationCache = new Map();
  }

  /**
   * Evaluates a dynamic event and returns actions to execute
   */
  async evaluateEvent(
    event: AnyDynamicEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    const startTime = Date.now();

    try {
      // Validate the event first
      const validation = this.validateEvent(event);
      if (!validation.isValid) {
        if (this.config.debugMode) {
          logger.error(`Validation failed for event ${event.id}:`, 'DATA', validation.errorMessage);
        }
        return this.handleFallback(event, 'Validation failed');
      }

      // Check cache first
      const cacheKey = this.getCacheKey(event, context);
      const cached = this.evaluationCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
        if (this.config.debugMode) {
          logger.debug(`Cache hit for event ${event.id}`, 'PERFORMANCE');
        }
        return cached.result;
      }

      // Get the appropriate processor
      const processor = this.getProcessor(event.type);
      if (!processor) {
        logger.error(`No processor found for event type: ${event.type}`, 'DATA');
        return this.handleFallback(event, 'No processor available');
      }

      // Evaluate the event
      const actions = await processor.evaluate(event, context);

      // Validate action count
      if (actions.length > this.config.maxActionsPerEvaluation) {
        logger.warn(`Event ${event.id} generated ${actions.length} actions, limiting to ${this.config.maxActionsPerEvaluation}`, 'PERFORMANCE');
        return actions.slice(0, this.config.maxActionsPerEvaluation);
      }

      // Cache the result
      this.evaluationCache.set(cacheKey, {
        timestamp: Date.now(),
        result: actions
      });

      // Performance monitoring
      const evaluationTime = Date.now() - startTime;
      if (evaluationTime > this.config.performance.maxEvaluationTimeMs) {
        logger.warn(`Event ${event.id} evaluation took ${evaluationTime}ms, exceeding limit of ${this.config.performance.maxEvaluationTimeMs}ms`, 'PERFORMANCE');
      }

      if (this.config.debugMode) {
        logger.debug(`Evaluated event ${event.id} in ${evaluationTime}ms, generated ${actions.length} actions`, 'PERFORMANCE');
      }

      return actions;

    } catch (error) {
      logger.error(`Error evaluating event ${event.id}:`, 'DATA', error);
      return this.handleFallback(event, `Evaluation error: ${error}`);
    }
  }

  /**
   * Evaluates multiple dynamic events in batch
   */
  async evaluateEvents(
    events: AnyDynamicEvent[],
    context: SimulationContext
  ): Promise<Map<string, EventAction[]>> {
    const results = new Map<string, EventAction[]>();
    
    // Process events in parallel for better performance
    const evaluationPromises = events.map(async (event) => {
      const actions = await this.evaluateEvent(event, context);
      return { eventId: event.id, actions };
    });

    const evaluationResults = await Promise.all(evaluationPromises);
    
    for (const { eventId, actions } of evaluationResults) {
      results.set(eventId, actions);
    }

    return results;
  }

  /**
   * Validates a dynamic event
   */
  validateEvent(event: AnyDynamicEvent): ValidationResult {
    // First do basic dynamic event validation
    const baseValidation = validateDynamicEvent(event);
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Then use processor-specific validation if available
    const processor = this.getProcessor(event.type);
    if (processor && processor.validateEvent) {
      return processor.validateEvent(event);
    }

    return { isValid: true };
  }

  /**
   * Checks if an event should be evaluated based on its frequency
   */
  shouldEvaluateEvent(event: AnyDynamicEvent, context: SimulationContext): boolean {
    const currentMonth = context.currentMonth;

    switch (event.evaluationFrequency) {
      case 'MONTHLY':
        return true; // Always evaluate monthly events
      
      case 'QUARTERLY':
        return currentMonth % 3 === 0; // Every 3 months
      
      case 'ANNUALLY':
        return currentMonth % 12 === 0; // Every 12 months
      
      case 'ON_TRIGGER':
        // TODO: Implement trigger-based evaluation
        return false; // For now, don't evaluate trigger-based events
      
      default:
        return false;
    }
  }

  /**
   * Filters events that should be evaluated in the current context
   */
  getActiveEvents(events: AnyDynamicEvent[], context: SimulationContext): AnyDynamicEvent[] {
    return events.filter(event => this.shouldEvaluateEvent(event, context));
  }

  /**
   * Gets the processor for a specific event type
   */
  private getProcessor(eventType: DynamicEventType): DynamicEventProcessor | null {
    const processor = DYNAMIC_EVENT_PROCESSORS[eventType];
    
    // Check if processor is implemented (not a placeholder)
    if (processor && typeof processor.evaluate === 'function') {
      return processor;
    }
    
    return null;
  }

  /**
   * Handles fallback behavior when event evaluation fails
   */
  private handleFallback(event: AnyDynamicEvent, reason: string): EventAction[] {
    const fallback = event.fallbackBehavior || this.config.defaultFallback;
    
    if (this.config.debugMode) {
      logger.debug(`Applying fallback '${fallback}' for event ${event.id}: ${reason}`, 'DATA');
    }

    switch (fallback) {
      case 'SKIP':
        return []; // No actions
      
      case 'REDUCE_AMOUNT':
        // TODO: Implement amount reduction logic
        return [];
      
      case 'DEFER_TO_NEXT_PERIOD':
        // TODO: Implement deferral logic
        return [];
      
      case 'USE_ALTERNATIVE_SOURCE':
        // TODO: Implement alternative source logic
        return [];
      
      case 'NOTIFY_USER':
        // TODO: Implement user notification
        return [];
      
      default:
        return [];
    }
  }

  /**
   * Generates a cache key for event evaluation results
   */
  private getCacheKey(event: AnyDynamicEvent, context: SimulationContext): string {
    // Create a hash of key context properties that affect evaluation
    const keyData = {
      eventId: event.id,
      eventHash: this.hashEvent(event),
      month: context.currentMonth,
      cashBalance: Math.floor(context.cashBalance / 1000), // Round to nearest $1k for cache efficiency
      monthlyIncome: Math.floor(context.monthlyIncome / 100), // Round to nearest $100
      age: context.currentAge
    };
    
    return JSON.stringify(keyData);
  }

  /**
   * Creates a simple hash of an event for cache purposes
   */
  private hashEvent(event: AnyDynamicEvent): string {
    // Create a simple hash of the event configuration
    const relevantFields = {
      type: event.type,
      evaluationFrequency: event.evaluationFrequency,
      // Add type-specific fields
      ...(event.type === 'CONDITIONAL_CONTRIBUTION' && {
        targetAmount: event.targetAmount,
        cashThreshold: event.cashThreshold,
        strategy: event.contributionStrategy.type
      })
    };
    
    return btoa(JSON.stringify(relevantFields)).slice(0, 16);
  }

  /**
   * Clears the evaluation cache
   */
  clearCache(): void {
    this.evaluationCache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.evaluationCache.size
      // TODO: Implement hit rate tracking
    };
  }

  /**
   * Updates the configuration
   */
  updateConfig(newConfig: Partial<DynamicEventConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): DynamicEventConfig {
    return { ...this.config };
  }
}

/**
 * Singleton instance for global use
 */
let globalRegistry: DynamicEventRegistry | null = null;

/**
 * Gets the global dynamic event registry instance
 */
export function getDynamicEventRegistry(): DynamicEventRegistry {
  if (!globalRegistry) {
    globalRegistry = new DynamicEventRegistry();
  }
  return globalRegistry;
}

/**
 * Initializes the global registry with custom configuration
 */
export function initializeDynamicEventRegistry(config: Partial<DynamicEventConfig>): DynamicEventRegistry {
  globalRegistry = new DynamicEventRegistry(config);
  return globalRegistry;
}

/**
 * Utility functions for working with dynamic events
 */
export const DynamicEventUtils = {
  /**
   * Checks if an event is a dynamic event
   */
  isDynamicEvent(event: any): event is AnyDynamicEvent {
    return event && event.isDynamic === true && event.type && event.evaluationFrequency;
  },

  /**
   * Extracts dynamic events from a list of events
   */
  filterDynamicEvents(events: any[]): AnyDynamicEvent[] {
    return events.filter(this.isDynamicEvent);
  },

  /**
   * Groups dynamic events by type
   */
  groupEventsByType(events: AnyDynamicEvent[]): Map<DynamicEventType, AnyDynamicEvent[]> {
    const groups = new Map<DynamicEventType, AnyDynamicEvent[]>();
    
    for (const event of events) {
      const existing = groups.get(event.type) || [];
      existing.push(event);
      groups.set(event.type, existing);
    }
    
    return groups;
  },

  /**
   * Gets events that should be evaluated in the current month
   */
  getEventsForMonth(events: AnyDynamicEvent[], month: number): AnyDynamicEvent[] {
    return events.filter(event => {
      switch (event.evaluationFrequency) {
        case 'MONTHLY':
          return true;
        case 'QUARTERLY':
          return month % 3 === 0;
        case 'ANNUALLY':
          return month % 12 === 0;
        case 'ON_TRIGGER':
          return false; // Handle separately
        default:
          return false;
      }
    });
  }
};