/**
 * Centralized Event Processing Service
 *
 * ARCHITECTURAL PRINCIPLE:
 * Single source of truth for all event preprocessing to prevent:
 * - Double processing (simulationService + monteCarloWorkerRunner)
 * - Field loss (endDateOffset, targetAccountType, etc.)
 * - Memory leaks (2800+ expanded events causing OOM)
 * - Inconsistent validation
 */

import type { FinancialEvent } from '@/types';
import { validateEventPipeline, type ValidationReport } from './eventValidationPipeline';
import { preprocessEventsForWASM } from './eventNormalization';
import { logger } from '@/utils/logger';

export interface ProcessingOptions {
  maxMonthOffset: number;
  useRecurringPatterns?: boolean;
  memoryLimit?: number;
  skipValidation?: boolean;
}

export interface ProcessingResult {
  processedEvents: FinancialEvent[];
  validationReport: ValidationReport;
  processingStats: {
    inputEventCount: number;
    outputEventCount: number;
    processingMode: 'recurring' | 'expanded';
    memoryUsageEstimate: number;
    processingTimeMs: number;
  };
}

/**
 * SINGLE POINT OF ENTRY for all event preprocessing
 * Eliminates double processing and ensures consistent validation
 */
export class EventProcessingService {
  private static instance: EventProcessingService;
  private processingHistory: Map<string, ProcessingResult> = new Map();

  static getInstance(): EventProcessingService {
    if (!EventProcessingService.instance) {
      EventProcessingService.instance = new EventProcessingService();
    }
    return EventProcessingService.instance;
  }

  /**
   * Main preprocessing entry point - prevents double processing
   */
  async processEvents(
    events: FinancialEvent[],
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = performance.now();

    // Generate cache key to prevent duplicate processing
    const cacheKey = this.generateCacheKey(events, options);
    const cached = this.processingHistory.get(cacheKey);
    if (cached) {
      logger.performanceLog(`♻️ Using cached event processing result (${cached.processingStats.outputEventCount} events)`);
      return cached;
    }

    logger.dataLog(`🔄 Starting event processing: ${events.length} input events`);

    // Step 1: Validation (unless skipped)
    let validationReport: ValidationReport;
    if (options.skipValidation) {
      validationReport = {
        valid: true,
        errors: [],
        warnings: [],
        stats: { totalEvents: events.length, validEvents: events.length, fixedMappings: 0, unknownAccounts: 0 }
      };
    } else {
      validationReport = validateEventPipeline(events);
      if (!validationReport.valid) {
        logger.error('🚨 Event validation failed', validationReport.errors);
        throw new Error(`Event validation failed: ${validationReport.errors.length} critical errors`);
      }
    }

    // Step 2: Memory estimation and processing mode selection
    const memoryEstimate = this.estimateMemoryUsage(events, options.maxMonthOffset);
    const memoryLimit = options.memoryLimit || 50000; // Raised from 5000 to 50000 to support 70-year simulations
    const useRecurring = options.useRecurringPatterns || memoryEstimate.totalEvents > memoryLimit;

    logger.performanceLog(
      `📊 Memory estimation: ${memoryEstimate.totalEvents} events, ` +
      `${Math.round(memoryEstimate.memoryMB)}MB, using ${useRecurring ? 'recurring' : 'expanded'} mode`
    );

    // Step 3: Process events using appropriate strategy
    let processedEvents: FinancialEvent[];
    let processingMode: 'recurring' | 'expanded';

    if (useRecurring) {
      processedEvents = this.convertToRecurringPatterns(events, options.maxMonthOffset);
      processingMode = 'recurring';
    } else {
      processedEvents = preprocessEventsForWASM(events, 2025, options.maxMonthOffset);
      processingMode = 'expanded';
    }

    const endTime = performance.now();

    // Step 4: Build result with comprehensive stats
    const result: ProcessingResult = {
      processedEvents,
      validationReport,
      processingStats: {
        inputEventCount: events.length,
        outputEventCount: processedEvents.length,
        processingMode,
        memoryUsageEstimate: memoryEstimate.memoryMB,
        processingTimeMs: endTime - startTime
      }
    };

    // Cache result and log completion
    this.processingHistory.set(cacheKey, result);

    logger.dataLog(
      `✅ Event processing complete: ${events.length} → ${processedEvents.length} events ` +
      `(${processingMode} mode, ${Math.round(result.processingStats.processingTimeMs)}ms)`
    );

    return result;
  }

  /**
   * Detect if events are already preprocessed to avoid double processing
   */
  isAlreadyPreprocessed(events: FinancialEvent[]): boolean {
    if (events.length === 0) return false;

    // Check if events have preprocessing signatures
    const hasPreprocessingSignatures = events.every(event =>
      event.hasOwnProperty('frequency') &&
      event.hasOwnProperty('monthOffset') &&
      event.hasOwnProperty('amount') &&
      typeof (event as any).frequency === 'string' &&
      typeof (event as any).monthOffset === 'number'
    );

    // Check if events are expanded (many events with consecutive monthOffsets)
    const hasConsecutiveOffsets = events.length > 10 &&
      events.slice(0, 5).every((event, i) =>
        (event as any).monthOffset === i
      );

    const isPreprocessed = hasPreprocessingSignatures && !hasConsecutiveOffsets;

    if (isPreprocessed) {
      logger.dataLog(`🎯 Events already preprocessed as recurring patterns (${events.length} events)`);
    }

    return isPreprocessed;
  }

  /**
   * Estimate memory usage and event count after expansion
   */
  private estimateMemoryUsage(events: FinancialEvent[], maxMonthOffset: number): {
    totalEvents: number;
    memoryMB: number;
  } {
    let totalEstimatedEvents = 0;

    for (const event of events) {
      // Check for recurring events (exclude 'one-time' and 'once')
      const hasRecurringPattern = 'frequency' in event && event.frequency &&
                                   event.frequency !== 'one-time' && event.frequency !== 'once';

      if (hasRecurringPattern) {
        const frequency = (event as any).frequency;
        let eventsPerYear = 12; // monthly default

        switch (frequency) {
          case 'weekly': eventsPerYear = 52; break;
          case 'biweekly': eventsPerYear = 26; break;
          case 'monthly': eventsPerYear = 12; break;
          case 'quarterly': eventsPerYear = 4; break;
          case 'annually': eventsPerYear = 1; break;
        }

        const totalYears = maxMonthOffset / 12;
        totalEstimatedEvents += eventsPerYear * totalYears;
      } else {
        totalEstimatedEvents += 1; // One-time event
      }
    }

    // Estimate ~1KB per event object
    const memoryMB = (totalEstimatedEvents * 1024) / (1024 * 1024);

    return { totalEvents: totalEstimatedEvents, memoryMB };
  }

  /**
   * Convert events to recurring patterns for memory efficiency
   */
  private convertToRecurringPatterns(events: FinancialEvent[], maxMonthOffset: number): FinancialEvent[] {
    return events.map(event => {
      // Ensure events have proper endDateOffset defaults
      if ('frequency' in event && event.frequency &&
          event.frequency !== 'one-time' && event.frequency !== 'once') {
        const eventWithDefaults = { ...event };

        // No default endDateOffset values - undefined means indefinite recurrence
        // UI should properly set endDateOffset when user specifies an end date

        return eventWithDefaults;
      }

      return event;
    });
  }

  /**
   * Generate cache key for deduplication
   * ENHANCED: Includes event content digest to detect amount/frequency changes
   */
  private generateCacheKey(events: FinancialEvent[], options: ProcessingOptions): string {
    // Include event metadata that affects processing
    const eventHash = events.map(e => {
      // Create content digest including critical fields that affect processing
      const amount = (e as any).amount || (e as any).annualAmount || 0;
      const frequency = (e as any).frequency || 'one-time';
      const targetAccount = (e as any).targetAccountType || (e as any).accountType || '';
      const monthOffset = e.monthOffset || 0;

      // Include lifecycle event-specific fields
      let contentHash = `${e.type}-${e.id}-${amount}-${frequency}-${targetAccount}-${monthOffset}`;

      // Add type-specific fields that affect cash flow
      if (e.type === 'RELOCATION') {
        contentHash += `-${(e as any).movingCosts || 0}`;
      } else if (e.type === 'PROPERTY_MAINTENANCE') {
        contentHash += `-${(e as any).annualMaintenanceCost || 0}`;
      } else if (e.type === 'HEALTHCARE_TRANSITION') {
        contentHash += `-${(e as any).bridgeCosts?.monthlyPremium || 0}`;
      } else if (e.type === 'CAREER_CHANGE') {
        const incomeChange = (e as any).incomeChange;
        contentHash += `-${incomeChange?.newIncome || 0}-${incomeChange?.currentIncome || 0}`;
      }

      return contentHash;
    }).join(',');

    const optionsHash = `${options.maxMonthOffset}-${options.useRecurringPatterns}-${options.memoryLimit}`;
    return `${eventHash}-${optionsHash}`;
  }

  /**
   * Clear processing cache (useful for testing)
   */
  clearCache(): void {
    this.processingHistory.clear();
    logger.dataLog('🧹 Event processing cache cleared');
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    cacheSize: number;
    totalProcessingTimeMs: number;
    averageProcessingTimeMs: number;
  } {
    const results = Array.from(this.processingHistory.values());
    const totalTime = results.reduce((sum, r) => sum + r.processingStats.processingTimeMs, 0);

    return {
      cacheSize: this.processingHistory.size,
      totalProcessingTimeMs: totalTime,
      averageProcessingTimeMs: results.length > 0 ? totalTime / results.length : 0
    };
  }
}

// Singleton instance
export const eventProcessingService = EventProcessingService.getInstance();