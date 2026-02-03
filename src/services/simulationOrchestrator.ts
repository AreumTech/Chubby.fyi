/**
 * NEW Simulation Orchestrator - Thin Backend Wrapper
 *
 * This orchestrator implements the "dumb display" architecture by acting as a thin
 * wrapper around the WASM backend's complete SimulationPayload transformer.
 *
 * ARCHITECTURAL PRINCIPLE:
 * - UI receives fully processed, ready-to-display SimulationPayload from WASM
 * - NO calculations, aggregations, or data transformations on the client side
 * - Backend does ALL business logic and returns complete UI-ready data
 *
 * WASM BOUNDARY:
 * - All WASM calls go through wasmBridge.ts (see docs/WASM_BRIDGE_MIGRATION.md)
 * - This file handles: validation, preprocessing, goal building
 * - wasmBridge handles: WASM calls, retry logic, account normalization
 */

import {
  SimulationPayload,
  InitialStateEvent,
  FinancialEvent,
  AppConfig
} from '@/types';
import { logger } from '@/utils/logger';
import { validateEventPipeline } from './eventValidationPipeline';
import { preprocessDynamicEventsForSimulation } from './dynamicEventPreprocessor';
import { wasmBridge, normalizeToWasmAccount } from './wasmBridge';

// Define the global worker pool interface (for fallback only)
declare global {
  interface Window {
    wasmWorkerPool?: any;
  }
}

export interface SimulationProgressCallback {
  onProgress?: (completed: number, total: number) => void;
  onComplete?: () => void;
}

/**
 * NEW ARCHITECTURE: Thin orchestrator that passes inputs to WASM and returns
 * the complete SimulationPayload without any client-side processing
 */
export async function orchestrateSimulation(
  initialState: InitialStateEvent,
  eventLedger: FinancialEvent[],
  config: AppConfig,
  numberOfRuns: number = 50,
  progressCallback?: SimulationProgressCallback,
  enhancedGoals?: any[]
): Promise<SimulationPayload> {
  try {
    // 1. VALIDATION ONLY - No processing
    const validationReport = validateEventPipeline(eventLedger);
    if (!validationReport.valid) {
      const errorMessages = validationReport.errors.map(e => `${e.eventName}: ${e.message}`).join('; ');
      throw new Error(`Event validation failed: ${errorMessages}`);
    }

    // 2. PREPROCESSING ONLY - Convert dynamic events to static
    // Use initialState.currentAge as primary source (from quickstart), fallback to config
    const currentAge = initialState.currentAge || config.currentAge || 35;

    // Use config.simulationEndAge if explicitly set, otherwise default to 95 (typical retirement planning)
    const simulationEndAge = config.simulationEndAge !== undefined
      ? config.simulationEndAge
      : 95;

    // CRITICAL: Use age settings as the FINAL authority for simulation duration
    // Events beyond this duration will be truncated
    const maxMonthOffset = (simulationEndAge - currentAge) * 12;

    logger.info(`🎯 [SIMULATION-DURATION] currentAge=${currentAge}, simulationEndAge=${simulationEndAge}, maxMonthOffset=${maxMonthOffset} months (${maxMonthOffset/12} years)`);


    const { allEvents: processedEvents } = await preprocessDynamicEventsForSimulation(
      initialState,
      eventLedger,
      initialState.startYear,
      maxMonthOffset,
      config.debugMode || false
    );

    // 3. TRANSFORM EVENTS FOR WASM - Ensure frequency and date offsets are at top level
    // Go preprocessor checks event.Frequency first, then falls back to metadata["frequency"]
    const wasmReadyEvents = processedEvents.map(event => {
      const transformedEvent: any = { ...event };

      // Initialize metadata if it doesn't exist
      if (!transformedEvent.metadata) {
        transformedEvent.metadata = {};
      }

      // Move accountType to metadata.targetAccountType for contributions
      if (event.type === 'SCHEDULED_CONTRIBUTION' && (event as any).accountType) {
        transformedEvent.metadata.targetAccountType = (event as any).accountType;
      }

      // CRITICAL FIX: Preserve cadence data for recurring event expansion
      // Go preprocessor (wasm/event_preprocessor.go:112-119) checks:
      // 1. event.Frequency field first
      // 2. Falls back to metadata["frequency"]
      // 3. Defaults to "once" if neither exists

      // Set top-level frequency with explicit fallback
      const eventFrequency = (event as any).frequency || (event as any).metadata?.frequency;
      if (eventFrequency) {
        transformedEvent.frequency = eventFrequency;
      }

      // Preserve date offsets for recurring event range calculation
      // Go uses these to determine start/end months for expansion
      const startOffset = (event as any).startDateOffset ?? (event as any).metadata?.startDateOffset;
      const endOffset = (event as any).endDateOffset ?? (event as any).metadata?.endDateOffset;

      if (startOffset !== undefined) {
        transformedEvent.startDateOffset = startOffset;
        transformedEvent.metadata.startDateOffset = startOffset;
      }
      if (endOffset !== undefined) {
        transformedEvent.endDateOffset = endOffset;
        transformedEvent.metadata.endDateOffset = endOffset;
      }

      // Also preserve other fields in metadata for backward compatibility
      if (event.name) transformedEvent.metadata.name = event.name;
      if ((event as any).source) transformedEvent.metadata.source = (event as any).source;
      if (eventFrequency) transformedEvent.metadata.frequency = eventFrequency;
      if ((event as any).annualGrowthRate !== undefined) transformedEvent.metadata.annualGrowthRate = (event as any).annualGrowthRate;
      if ((event as any).priority !== undefined) transformedEvent.metadata.priority = (event as any).priority;

      return transformedEvent;
    });

    // DEBUG: Log a sample transformed event to verify frequency preservation
    if (wasmReadyEvents.length > 0 && config.debugMode) {
      const sampleEvent = wasmReadyEvents.find(e => e.frequency) || wasmReadyEvents[0];
      logger.dataLog('📋 [EVENT-TRANSFORM-SAMPLE] Sample transformed event:', {
        type: sampleEvent.type,
        monthOffset: sampleEvent.monthOffset,
        frequency: sampleEvent.frequency,
        metadata: {
          frequency: sampleEvent.metadata?.frequency,
          startDateOffset: sampleEvent.metadata?.startDateOffset,
          endDateOffset: sampleEvent.metadata?.endDateOffset
        }
      });
    }

    // 4. PREPARE INPUT FOR WASM - Simple data marshaling
    // Use DEFAULT_STOCHASTIC_CONFIG to ensure all GARCH parameters are valid
    // The Go layer will also apply defaults as a safety net
    // Build goals array in WASM-compatible format (domain Goal struct)
    const toIntPriority = (p: any): number => {
      if (typeof p === 'number') return p;
      switch ((p || '').toString().toUpperCase()) {
        case 'HIGH': return 3;
        case 'MEDIUM': return 2;
        case 'LOW': return 1;
        default: return 2;
      }
    };
    const toCategory = (c: any): string => {
      if (!c) return 'other';
      const s = (c || '').toString().toUpperCase();
      if (s.includes('RETIRE')) return 'retirement';
      if (s.includes('EMERGENCY')) return 'emergency';
      if (s.includes('HOUSE') || s.includes('HOME')) return 'purchase';
      if (s.includes('EDUCATION') || s === '529') return 'education';
      return 'other';
    };
    const getTargetMonthOffsetFromDate = (d: any): number => {
      try {
        if (!d) return 0;
        const date = new Date(d);
        if (Number.isNaN(date.getTime())) return 0;
        const startYear = initialState.startYear || new Date().getFullYear();
        const startMonth = 0; // assume Jan start for offset calc (engine groups by years)
        const months = (date.getFullYear() - startYear) * 12 + (date.getMonth() - startMonth);
        return Math.max(0, months);
      } catch {
        return 0;
      }
    };

    const wasmGoals = (Array.isArray(enhancedGoals) && enhancedGoals.length > 0)
      ? enhancedGoals.map((g: any) => ({
          id: g.id,
          name: g.name || 'Financial Goal',
          description: g.description || '',
          targetAmount: Number(g.targetAmount) || 0,
          targetMonthOffset: getTargetMonthOffsetFromDate(g.targetDate),
          priority: toIntPriority(g.priority),
          category: toCategory(g.category),
          targetAccountType: g.targetAccount?.type || 'taxable',  // ✅ FIX: Pass target account type for goal tracking
        }))
      : eventLedger
          .filter(event => event.type === 'GOAL_DEFINE')
          .map(event => ({
            id: event.id,
            name: event.name || 'Financial Goal',
            description: (event as any).description || 'Important financial milestone',
            targetAmount: Number((event as any).targetAmount) || 0,
            targetMonthOffset: Number((event as any).targetDateOffset || (event as any).targetMonthOffset || 0) || 0,
            priority: toIntPriority((event as any).goalPriority),
            category: mapGoalTypeToCategory((event as any).goalType),
          }));

    // 4. CALL WASM BACKEND via wasmBridge
    // wasmBridge handles: account normalization, WASM calls, retry logic
    const payload = await callWasmSimulationWithUIPayload(
      initialState,
      wasmReadyEvents,
      config,
      numberOfRuns,
      maxMonthOffset,
      wasmGoals,
      progressCallback
    );

    return payload;

  } catch (error) {
    console.error('❌ SIMULATION FAILED:', error);
    throw new Error(`Simulation orchestration failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Call WASM backend to get complete SimulationPayload via wasmBridge.
 * This replaces ALL client-side aggregation and processing.
 *
 * The wasmBridge handles:
 * - Account normalization (various formats → WasmAccount)
 * - WASM function calls with retry logic
 * - Result normalization
 *
 * This function handles:
 * - Progress callbacks
 * - Fallback to worker pool if needed
 */
async function callWasmSimulationWithUIPayload(
  initialState: InitialStateEvent,
  events: any[],
  config: AppConfig,
  numberOfRuns: number,
  monthsToRun: number,
  goals: any[],
  progressCallback?: SimulationProgressCallback
): Promise<SimulationPayload> {
  if (typeof window === 'undefined') {
    throw new Error('WASM simulation requires browser environment');
  }

  progressCallback?.onProgress?.(10, 100);  // Phase: Preparing

  try {
    // Ensure WASM is ready via bridge
    progressCallback?.onProgress?.(20, 100);  // Phase: Initializing WASM
    await wasmBridge.ensureReady();

    // Check config state via bridge
    const configState = wasmBridge.checkConfigState();
    if (configState && !configState.loaded) {
      logger.warn('Configuration not fully loaded, attempting reload...', 'ORCHESTRATOR');
      await wasmBridge.ensureReady();
    }

    progressCallback?.onProgress?.(30, 100);  // Phase: Running simulation

    // Call WASM via bridge - it handles normalization, retry, etc.
    // Build a minimal config object for the bridge
    const bridgeConfig = {
      ...config,
      stochasticConfig: {
        ...(config.stochasticConfig || {}),
        simulationMode: 'stochastic' as const,
        randomSeed: config.stochasticConfig?.randomSeed || Math.floor(Date.now() / 1000),
      },
      simulationEndAge: config.simulationEndAge,
      currentAge: initialState.currentAge || config.currentAge || 35,
    };

    const result = await wasmBridge.runSimulationWithUIPayload(
      initialState,
      events,
      bridgeConfig,
      numberOfRuns,
      { goals }
    );

    progressCallback?.onProgress?.(80, 100);  // Phase: Processing results

    // Validate result structure
    const isObject = !!result && typeof result === 'object';
    const hasPlanProjection = isObject && result.planProjection && typeof result.planProjection === 'object';

    if (!isObject || !hasPlanProjection) {
      // Try worker pool fallback
      return await tryWorkerPoolFallback(initialState, events, config, numberOfRuns, monthsToRun, goals, progressCallback);
    }

    progressCallback?.onProgress?.(100, 100);
    progressCallback?.onComplete?.();

    return result as SimulationPayload;

  } catch (error) {
    logger.warn('Primary WASM call failed, attempting worker fallback', 'ORCHESTRATOR', error);
    return await tryWorkerPoolFallback(initialState, events, config, numberOfRuns, monthsToRun, goals, progressCallback);
  }
}

/**
 * Fallback to worker pool when main thread WASM fails.
 */
async function tryWorkerPoolFallback(
  initialState: InitialStateEvent,
  events: any[],
  config: AppConfig,
  numberOfRuns: number,
  monthsToRun: number,
  goals: any[],
  progressCallback?: SimulationProgressCallback
): Promise<SimulationPayload> {
  if (typeof window === 'undefined' || !window.wasmWorkerPool) {
    throw new Error('No WASM simulation method available. Please refresh the application.');
  }

  logger.info('Using worker pool fallback for simulation', 'ORCHESTRATOR');
  progressCallback?.onProgress?.(40, 100);

  try {
    await window.wasmWorkerPool.initialize();
    progressCallback?.onProgress?.(50, 100);

    // Build input using bridge normalizers
    const wasmInput = {
      initialAccounts: {
        cash: initialState.initialCash || 0,
        taxable: normalizeToWasmAccount(initialState.initialAccounts?.taxable),
        tax_deferred: normalizeToWasmAccount(initialState.initialAccounts?.tax_deferred),
        roth: normalizeToWasmAccount(initialState.initialAccounts?.roth),
      },
      events,
      config: config.stochasticConfig || {},
      monthsToRun,
      goals,
    };

    // Try full UI payload from worker
    try {
      const workerPayload = await window.wasmWorkerPool.runSimulationWithUIPayload(wasmInput, numberOfRuns);
      progressCallback?.onProgress?.(100, 100);
      progressCallback?.onComplete?.();
      return workerPayload as SimulationPayload;
    } catch (uiErr) {
      // Minimal fallback
      logger.warn('Worker runSimulationWithUIPayload failed, using minimal fallback', 'ORCHESTRATOR', uiErr);
      progressCallback?.onProgress?.(100, 100);
      progressCallback?.onComplete?.();

      return createMinimalPayload(goals);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Worker pool fallback failed completely', 'ORCHESTRATOR', error);
    throw new Error(`Worker pool simulation failed: ${errorMessage}`);
  }
}

/**
 * Create minimal payload structure when worker fallback provides no chart data.
 */
function createMinimalPayload(goals: any[]): SimulationPayload {
  return {
    planInputs: {
      goals: goals || [],
      events: [],
      strategies: [],
      accounts: []
    },
    planProjection: {
      summary: {
        goalOutcomes: [],
        portfolioStats: {
          p10FinalValue: 0,
          p25FinalValue: 0,
          p50FinalValue: 0,
          p75FinalValue: 0,
          p90FinalValue: 0,
          successRate: 0
        },
        planHealth: {
          overallScore: 0,
          riskLevel: 'high',
          confidenceLevel: 'low',
          keyRisks: ['Chart data not available - using worker pool fallback'],
          keyStrengths: []
        },
        alerts: []
      },
      charts: {
        netWorth: { timeSeries: null, samplePaths: null, summary: { recommendedYAxisMax: 0, recommendedYAxisMin: 0, volatilityPeriods: null } },
        cashFlow: { timeSeries: null, summary: { averageAnnualSavings: 0, averageSavingsRate: 0, peakSavingsYear: 2024, lowestSavingsYear: 2024 } },
        assetAllocation: { timeSeries: null, targetBands: null, summary: { currentAllocation: null, targetAllocation: null, driftFromTarget: null } },
        goalProgress: [],
        eventMarkers: []
      },
      analysis: {
        goalBreakdowns: [],
        annualSnapshots: {},
        advancedAnalysisPanels: [],
        riskAnalysis: null
      },
      spreadsheet: {
        years: []
      }
    }
  } as SimulationPayload;
}

/**
 * Helper function to map goal types to categories
 */
function mapGoalTypeToCategory(goalType: string): string {
  const typeMap = {
    'RETIREMENT': 'retirement',
    'MAJOR_PURCHASE': 'purchase',
    'EDUCATION': 'education',
    'EMERGENCY_FUND': 'emergency',
    'CUSTOM': 'other'
  };
  return typeMap[goalType] || 'other';
}

// =============================================================================
// DETERMINISTIC SIMULATION ORCHESTRATOR
// =============================================================================

// Type for deterministic payload (imported from types)
import { DeterministicPayload } from '@/types/api/payload';

/**
 * Orchestrate deterministic simulation - single path with constant growth rates
 * Returns detailed monthly snapshots and event-by-event trace
 */
export async function orchestrateDeterministicSimulation(
  initialState: InitialStateEvent,
  eventLedger: FinancialEvent[],
  config: AppConfig,
  _enhancedGoals?: any[] // Reserved for future use
): Promise<DeterministicPayload> {
  try {
    // 1. VALIDATION - Same as Monte Carlo
    const validationReport = validateEventPipeline(eventLedger);
    if (!validationReport.valid) {
      const errorMessages = validationReport.errors.map(e => `${e.eventName}: ${e.message}`).join('; ');
      throw new Error(`Event validation failed: ${errorMessages}`);
    }

    // 2. PREPROCESSING - Same as Monte Carlo
    const currentAge = initialState.currentAge || config.currentAge || 35;
    const simulationEndAge = config.simulationEndAge !== undefined ? config.simulationEndAge : 95;
    const maxMonthOffset = (simulationEndAge - currentAge) * 12;

    logger.info(`🎯 [DETERMINISTIC] currentAge=${currentAge}, simulationEndAge=${simulationEndAge}, maxMonths=${maxMonthOffset}`);

    const { allEvents: processedEvents } = await preprocessDynamicEventsForSimulation(
      initialState,
      eventLedger,
      initialState.startYear,
      maxMonthOffset,
      config.debugMode || false
    );

    // 3. TRANSFORM EVENTS FOR WASM
    const wasmReadyEvents = processedEvents.map(event => {
      const transformedEvent: any = { ...event };
      if (!transformedEvent.metadata) {
        transformedEvent.metadata = {};
      }

      if (event.type === 'SCHEDULED_CONTRIBUTION' && (event as any).accountType) {
        transformedEvent.metadata.targetAccountType = (event as any).accountType;
      }

      const eventFrequency = (event as any).frequency || (event as any).metadata?.frequency;
      if (eventFrequency) {
        transformedEvent.frequency = eventFrequency;
        transformedEvent.metadata.frequency = eventFrequency;
      }

      const startOffset = (event as any).startDateOffset ?? (event as any).metadata?.startDateOffset;
      const endOffset = (event as any).endDateOffset ?? (event as any).metadata?.endDateOffset;

      if (startOffset !== undefined) {
        transformedEvent.startDateOffset = startOffset;
        transformedEvent.metadata.startDateOffset = startOffset;
      }
      if (endOffset !== undefined) {
        transformedEvent.endDateOffset = endOffset;
        transformedEvent.metadata.endDateOffset = endOffset;
      }

      if (event.name) transformedEvent.metadata.name = event.name;
      if ((event as any).source) transformedEvent.metadata.source = (event as any).source;
      if ((event as any).annualGrowthRate !== undefined) transformedEvent.metadata.annualGrowthRate = (event as any).annualGrowthRate;
      if ((event as any).priority !== undefined) transformedEvent.metadata.priority = (event as any).priority;

      return transformedEvent;
    });

    // 4. Determine simulation mode
    const isStochasticMode = config.simulationMode === 'stochastic' ||
                             (config.stochasticConfig?.simulationMode === 'stochastic');

    const randomSeed = isStochasticMode
      ? (config.stochasticConfig?.randomSeed || Math.floor(Date.now() / 1000))
      : 0;

    // 5. CALL WASM DETERMINISTIC SIMULATION via wasmBridge
    try {
      const result = await wasmBridge.runDeterministicSimulation(
        initialState,
        wasmReadyEvents,
        {
          ...config,
          stochasticConfig: {
            ...(config.stochasticConfig || {}),
            simulationMode: isStochasticMode ? 'stochastic' : 'deterministic',
            randomSeed,
            cashFloor: config.stochasticConfig?.cashFloor ?? 0,
          },
          currentAge,
          simulationEndAge,
        },
        {
          mode: isStochasticMode ? 'stochastic' : 'deterministic',
          seed: randomSeed,
        }
      );

      logger.info('[DETERMINISTIC] Simulation complete via wasmBridge', {
        yearsCount: result.yearlyData?.length || 0,
        monthsCount: result.monthlySnapshots?.length || 0,
        eventsTraced: result.eventTrace?.length || 0,
        finalNetWorth: result.finalNetWorth,
        simulationMode: result.simulationMode,
        seed: result.seed,
      });

      return result as DeterministicPayload;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Deterministic simulation failed', 'ORCHESTRATOR', error);
      throw new Error(`Deterministic simulation failed: ${errorMessage}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Deterministic simulation orchestration failed', 'ORCHESTRATOR', error);
    throw new Error(`Deterministic simulation orchestration failed: ${errorMessage}`);
  }
}

