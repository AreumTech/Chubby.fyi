import { logger } from '@/utils/logger';
import { EventProcessingService } from './eventProcessingService';

/**
 * Centralized Simulation Service
 * 
 * This service enforces the API contract by providing a single interface for all simulation operations.
 * It ensures that the UI only receives complete SimulationPayload objects and cannot directly
 * manipulate the event ledger or access raw simulation data.
 */

import {
  SimulationPayload,
  InitialStateEvent,
  FinancialEvent,
  AppConfig,
  EventType,
  MonthlyData
} from '@/types';
import { orchestrateSimulation, orchestrateDeterministicSimulation } from '@/services/simulationOrchestrator';
import { useAppStore } from '@/store/appStore';
import type { DeterministicPayload } from '@/types/api/payload';
import { SimulationProgressCallback } from '@/hooks/monteCarloWorkerRunner';
import { dataService } from '@/services/dataService';
import { validateFinancialEventWithResult, validateSimulationInputWithResult } from './validationService';
import { productionErrorMonitoring } from './productionErrorMonitoring';
import { eventProcessingService } from './eventProcessingService';
import type { SimulationResults } from '@/types/generated/simulation-results';

/**
 * Main simulation service - the only interface the UI should use for running simulations
 */
export const runSimulation = async (
  initialState: InitialStateEvent,
  eventLedger: FinancialEvent[],
  config: AppConfig,
  progressCallback?: SimulationProgressCallback,
  enhancedGoals?: any[]
): Promise<SimulationPayload> => {
  logger.simulationLog(`runSimulation called with ${eventLedger.length} events`);
  
  try {
    // 1. Preprocess events for simulation
    // Filter out INITIAL_STATE and GOAL_DEFINE events - they're handled separately
    const eventsToProcess = eventLedger.filter(
      event => event.type !== EventType.INITIAL_STATE && event.type !== EventType.GOAL_DEFINE
    );

    logger.simulationLog(`Processing ${eventsToProcess.length} events for simulation (filtered from ${eventLedger.length} total)`);
    const eventProcessingService = new EventProcessingService();

    // Calculate appropriate max month offset for the simulation timeline
    // Use initialState.currentAge as primary source (from quickstart), fallback to config
    const currentAge = initialState.currentAge || config.currentAge || 35;

    // Use config.simulationEndAge if explicitly set, otherwise default to 95 (typical retirement planning)
    const simulationEndAge = config.simulationEndAge !== undefined
      ? config.simulationEndAge
      : 95;

    const maxMonthOffset = (simulationEndAge - currentAge) * 12;

    logger.info(`📊 [SIMULATION-SERVICE] currentAge=${currentAge}, simulationEndAge=${simulationEndAge}, duration=${maxMonthOffset/12} years`);

    const processingResult = await eventProcessingService.processEvents(eventsToProcess, {
      maxMonthOffset,
      useRecurringPatterns: false,
      skipValidation: false
    });

    const preprocessedEvents = processingResult.processedEvents;
    logger.simulationLog(`Preprocessed ${eventsToProcess.length} events into ${preprocessedEvents.length} simulation events`);

    // 2. Run simulation using orchestrator (which now uses main thread WASM)
    logger.simulationLog(`🔧 SIMULATION SERVICE: Calling orchestrator with ${preprocessedEvents.length} preprocessed events`);

    // Read Monte Carlo runs from the correct location where UI saves it
    const numberOfRuns = config.advancedSimulationSettings?.monteCarloSettings?.numSimulations
      || config.stochasticConfig?.monteCarloRuns
      || config.monteCarloRuns
      || 50;

    logger.info(`🎲 Monte Carlo Runs: ${numberOfRuns} (from advancedSimulationSettings: ${config.advancedSimulationSettings?.monteCarloSettings?.numSimulations}, stochasticConfig: ${config.stochasticConfig?.monteCarloRuns}, config: ${config.monteCarloRuns})`);

    const rawSimulationPayload = await orchestrateSimulation(
      initialState,
      eventLedger, // Pass original events, orchestrator will preprocess them
      config,
      numberOfRuns,
      progressCallback,
      enhancedGoals
    );

    // Debug: Check if charts data is properly structured
    const hasCharts = !!rawSimulationPayload.planProjection?.charts;
    const hasNetWorth = !!rawSimulationPayload.planProjection?.charts?.netWorth;
    const hasTimeSeries = !!rawSimulationPayload.planProjection?.charts?.netWorth?.timeSeries;
    logger.simulationLog(`Charts structure: hasCharts=${hasCharts}, hasNetWorth=${hasNetWorth}, hasTimeSeries=${hasTimeSeries}`);

    // The rawSimulationPayload is already a complete SimulationPayload from the UI transformer
    const finalPayload = rawSimulationPayload;

    // Populate the data service with the complete simulation payload
    logger.dataLog('Setting UI-transformed simulation payload in data service');

    dataService.setSimulationPayload(finalPayload);
    logger.dataLog('Data service updated with UI-ready simulation results');

    return finalPayload;
  } catch (error) {
    // Capture simulation errors for monitoring
    productionErrorMonitoring.captureSimulationError(
      error as Error,
      {
        eventCount: eventLedger.length,
        configMode: config.simulationMode,
        monteCarloRuns: config.monteCarloRuns
      }
    );
    throw error; // Re-throw to maintain existing error handling
  }
};

/**
 * Run deterministic simulation - single path with constant growth rates
 * Gets data from store and saves result to dataService
 */
export const runDeterministicSimulation = async (): Promise<DeterministicPayload> => {
  logger.simulationLog('runDeterministicSimulation called');

  try {
    // Get data from store
    const state = useAppStore.getState();
    const activeScenario = state.getActiveScenario();

    if (!activeScenario) {
      throw new Error('No active scenario found');
    }

    const initialState = activeScenario.initialState;
    const eventLedger = state.getEventLedger();
    const config = state.config;
    const enhancedGoals = activeScenario.enhancedGoals;

    if (!initialState) {
      throw new Error('No initial state found in active scenario');
    }

    logger.info(`🎯 [DETERMINISTIC] Running with ${eventLedger.length} events`);

    // Filter out INITIAL_STATE and GOAL_DEFINE events
    const eventsToProcess = eventLedger.filter(
      event => event.type !== EventType.INITIAL_STATE && event.type !== EventType.GOAL_DEFINE
    );

    // Run deterministic simulation
    const deterministicPayload = await orchestrateDeterministicSimulation(
      initialState,
      eventsToProcess,
      config,
      enhancedGoals
    );

    // Save to data service
    logger.dataLog('Setting deterministic payload in data service');
    dataService.setDeterministicPayload(deterministicPayload);
    logger.dataLog('Data service updated with deterministic results');

    return deterministicPayload;
  } catch (error) {
    logger.error('Deterministic simulation failed:', error);
    throw error;
  }
};

/**
 * Preprocess events for WASM simulation engine
 * This function expands recurring events into individual occurrences for the simulation engine
 */
async function preprocessEventsForSimulation(
  eventLedger: FinancialEvent[],
  config: AppConfig
): Promise<FinancialEvent[]> {
  logger.dataLog(`Preprocessing ${eventLedger.length} events for simulation`);

  // Calculate simulation duration
  const simulationEndAge = config.simulationEndAge || 85;
  const currentAge = config.currentAge || 35;
  const monthOffsets = eventLedger.map(event => event.monthOffset || 0);
  const endOffsets = eventLedger.map(event => (event as any).endDateOffset || 0);
  const maxMonthOffset = Math.max(
    (simulationEndAge - currentAge) * 12,
    monthOffsets.length ? Math.max(...monthOffsets) : 0,
    endOffsets.length ? Math.max(...endOffsets) : 0
  );

  const processingResult = await eventProcessingService.processEvents(eventLedger, {
    maxMonthOffset,
    useRecurringPatterns: false, // Force expanded events for proper simulation
    memoryLimit: 50000, // Support 70-year simulations
    skipValidation: false
  });

  return processingResult.processedEvents;
}

/**
 * Aggregate simulation results into final UI-optimized payload
 * This function ensures the UI receives properly formatted event descriptions and goals
 * and generates chart data and analysis from raw simulation results
 */
async function aggregateSimulationResults(
  rawPayload: SimulationPayload | any, // Can be SimulationPayload or raw WASM result
  originalEventLedger: FinancialEvent[],
  config: AppConfig
): Promise<SimulationPayload> {
  // Update event descriptions using the latest event data
  const updatedEvents = updateEventDescriptions(
    originalEventLedger,
    config.simulationStartYear,
    config.currentMonth
  );

  // Process goals from the original event ledger
  const updatedGoals = processGoalsFromEventLedger(originalEventLedger, config);

  // Extract monthly data from rawPaths or existing data
  const rawPathsData = (rawPayload as any).rawPaths;
  let monthlyData: MonthlyData[] = [];
  let yearlyData: MonthlyData[] = [];

  if (rawPathsData && rawPathsData.length > 0 && rawPathsData[0].length > 0) {
    // Use the median path for monthly data (or first path if only one)
    const medianPathIndex = Math.floor(rawPathsData.length / 2);
    monthlyData = rawPathsData[medianPathIndex] || [];
    logger.dataLog(`Extracted monthly data: ${monthlyData.length} months from simulation paths`);
  } else if (rawPayload.planProjection?.monthlyData && rawPayload.planProjection.monthlyData.length > 0) {
    monthlyData = rawPayload.planProjection.monthlyData;
    logger.dataLog(`Using existing monthly data: ${monthlyData.length} months`);
  } else if (rawPayload.monthlyData && rawPayload.monthlyData.length > 0) {
    // Standard WASM simulation result format - use the monthlyData directly
    monthlyData = rawPayload.monthlyData;
    logger.dataLog(`Using WASM monthly data: ${monthlyData.length} months from standard simulation result`);
    logger.dataLog(`WASM result success: ${rawPayload.success}, finalNetWorth: ${rawPayload.finalNetWorth}`);
  } else if (rawPayload.success === true && rawPayload.monthlyData && Array.isArray(rawPayload.monthlyData)) {
    // Handle case where success=true but monthlyData check above failed (array length might be 0)
    monthlyData = rawPayload.monthlyData;
    logger.dataLog(`Using WASM monthly data (success=true case): ${monthlyData.length} months`);
  } else {
    // WASM backend must provide monthly data - no fallback allowed
    logger.error(`WASM backend failed to provide monthly data - rawPayload structure:`, 'WASM', {
      keys: Object.keys(rawPayload || {}),
      type: typeof rawPayload,
      hasSuccess: !!(rawPayload as any)?.success,
      hasMonthlyData: !!(rawPayload as any)?.monthlyData,
      hasBankruptcyMonth: !!(rawPayload as any)?.bankruptcyMonth,
      errorMessage: (rawPayload as any)?.error,
      success: (rawPayload as any)?.success,
      fullStructure: rawPayload
    });
    // Log the actual keys and first few values
    logger.error(`WASM payload keys and values:`, 'WASM',
      Object.entries(rawPayload || {}).slice(0, 5).map(([k, v]) => ({
        key: k,
        valueType: typeof v,
        value: v === null ? 'null' : v === undefined ? 'undefined' :
               Array.isArray(v) ? `Array(${v.length})` :
               typeof v === 'object' ? 'Object' :
               typeof v === 'string' && v.length > 100 ? v.substring(0, 100) + '...' : v
      }))
    );

    // CRITICAL: Log the actual error message from WASM
    if ((rawPayload as any)?.error) {
      logger.error(`🚨 WASM ERROR MESSAGE:`, 'WASM', (rawPayload as any).error);
    }
    if ((rawPayload as any)?.success === false) {
      logger.error(`🚨 WASM FAILURE - Full result:`, 'WASM', {
        success: (rawPayload as any).success,
        error: (rawPayload as any).error,
        hasMonthlyData: !!(rawPayload as any).monthlyData,
        monthlyDataLength: (rawPayload as any).monthlyData?.length
      });
    }

    // If WASM returned an error, show that error
    const wasmError = (rawPayload as any)?.error;
    if (wasmError) {
      throw new Error(`WASM simulation failed: ${wasmError}`);
    }
    throw new Error('WASM backend returned no monthly simulation data - backend must be fixed to generate complete payload');
  }

  // Generate yearly data from monthly data (December of each year)
  if (monthlyData.length > 0) {
    const startYear = config.simulationStartYear || 2025;
    yearlyData = monthlyData.filter(month => month.calendarMonth === 11).map(month => ({
      ...month,
      monthOffset: (month.calendarYear - startYear) * 12 + 11
    }));
    logger.dataLog(`Generated yearly data: ${yearlyData.length} years`);
  }

  // Generate chart data from monthly/yearly data
  const charts = generateChartData(monthlyData, yearlyData, rawPathsData || [], config);

  // Generate analysis data including annual snapshots
  const analysis = generateAnalysisData(yearlyData, config);

  // Generate summary data
  const summary = generateSummaryData(monthlyData, yearlyData, rawPathsData, updatedGoals);

  // Return the complete simulation payload with generated structure
  return {
    planInputs: {
      ...rawPayload.planInputs,
      events: updatedEvents,
      goals: updatedGoals
    },
    planProjection: {
      monthlyData,
      yearlyData,
      charts,
      analysis,
      summary
    }
  };
}


/**
 * Generate chart data from simulation results
 */
function generateChartData(monthlyData: MonthlyData[], yearlyData: MonthlyData[], rawPaths: MonthlyData[][], config: AppConfig) {
  if (!monthlyData.length && !yearlyData.length) {
    return null;
  }

  // Generate net worth chart data
  const netWorthTimeSeries = yearlyData.map(data => ({
    year: data.calendarYear,
    p10: data.netWorth * 0.7,  // Simplified percentiles for now
    p25: data.netWorth * 0.85,
    p50: data.netWorth,
    p75: data.netWorth * 1.15,
    p90: data.netWorth * 1.3,
    mean: data.netWorth
  }));

  // Generate sample paths from rawPaths (limit to first 5 for performance)
  const samplePaths = rawPaths.slice(0, 5).map(path =>
    path.map(data => data.netWorth || 0)
  );

  // Calculate Y-axis bounds
  const allValues = netWorthTimeSeries.flatMap(point => [point.p10, point.p90]);
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues, 0);

  // Generate cash flow chart data
  const cashFlowTimeSeries = yearlyData.map(data => ({
    year: data.calendarYear,
    income: data.totalIncome || 0,
    expenses: data.totalExpenses || 0,
    taxBreakdown: {
      federal: (data.taxWithheldThisMonth || 0) * 12 * 0.7,
      state: (data.taxWithheldThisMonth || 0) * 12 * 0.2,
      payroll: (data.taxWithheldThisMonth || 0) * 12 * 0.1,
      total: (data.taxWithheldThisMonth || 0) * 12
    }
  }));

  return {
    netWorth: {
      timeSeries: netWorthTimeSeries,
      samplePaths: samplePaths,
      summary: {
        recommendedYAxisMax: maxValue * 1.1,
        recommendedYAxisMin: minValue * 0.9
      },
      eventMarkers: []
    },
    cashFlow: {
      timeSeries: cashFlowTimeSeries
    },
    assetAllocation: {
      timeSeries: yearlyData.map(data => ({
        year: data.calendarYear,
        cash: data.cashBalance || 0,
        taxable: data.taxableAccountValue || 0,
        taxDeferred: data.taxDeferredAccountValue || 0,
        roth: data.rothAccountValue || 0
      }))
    },
    eventMarkers: []
  };
}

/**
 * Generate analysis data including annual snapshots
 */
function generateAnalysisData(yearlyData: MonthlyData[], config: AppConfig) {
  const annualSnapshots: Record<number, any> = {};

  yearlyData.forEach((data, index) => {
    const prevData = index > 0 ? yearlyData[index - 1] : null;
    const netWorthChangeYoY = prevData ? data.netWorth - prevData.netWorth : 0;

    annualSnapshots[data.calendarYear] = {
      netWorth: data.netWorth,
      netWorthChangeYoY,
      balanceSheet: {
        cashEquivalents: {
          total: data.cashBalance || 0
        },
        investmentAccounts: {
          taxableBrokerage: data.taxableAccountValue || 0,
          account401k: data.taxDeferredAccountValue || 0,
          rothIRA: data.rothAccountValue || 0,
          traditionalIRA: 0
        }
      },
      cashFlow: {
        grossIncome: data.totalIncome || 0,
        totalExpenses: data.totalExpenses || 0,
        taxes: {
          total: (data.taxWithheldThisMonth || 0) * 12
        },
        netCashFlow: (data.totalIncome || 0) - (data.totalExpenses || 0) - ((data.taxWithheldThisMonth || 0) * 12)
      },
      divestmentProceeds: 0
    };
  });

  return {
    annualSnapshots
  };
}

/**
 * Generate summary data for the simulation
 */
function generateSummaryData(monthlyData: MonthlyData[], yearlyData: MonthlyData[], rawPaths: MonthlyData[][], goals: any[]) {
  const finalNetWorth = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1].netWorth : 0;
  const initialNetWorth = yearlyData.length > 0 ? yearlyData[0].netWorth : 0;

  // Calculate success rate based on whether final net worth is positive
  const successRate = finalNetWorth > 0 ? 95 : 10; // Simplified calculation

  return {
    portfolioStats: {
      successRate,
      finalNetWorthP50: finalNetWorth
    },
    probabilityOfBankruptcy: finalNetWorth > 0 ? 0.05 : 0.9,
    goalOutcomes: goals.map(goal => ({
      goalId: goal.id,
      achievementProbability: successRate / 100,
      status: successRate > 70 ? 'on_track' : 'at_risk'
    })),
    quickActions: [
      {
        type: 'increase_savings',
        title: 'Consider increasing savings rate',
        description: 'Small increases in savings can significantly impact long-term results',
        priority: 'HIGH',
        confidence: 75,
        suggestedGoal: {
          name: 'Increase Savings Rate',
          description: 'Boost your savings rate to improve long-term financial security',
          targetAmount: Math.round(finalNetWorth * 0.1),
          targetAccount: {
            type: 'tax_deferred'
          }
        }
      }
    ]
  };
}

/**
 * Compute aggregate simulation metrics consumed by widgets such as bankruptcy risk.
 */
export function computeSimulationResults(
  rawPaths: MonthlyData[][] | undefined,
  payload?: SimulationPayload
): SimulationResults | null {
  if (!rawPaths || rawPaths.length === 0) {
    const successRate = payload?.planProjection?.summary?.portfolioStats?.successRate;
    if (successRate == null) {
      return null;
    }

    return {
      success: true,
      numberOfRuns: 0,
      probabilityOfSuccess: successRate / 100,
      probabilityOfBankruptcy: 0,
      bankruptcyCount: 0
    };
  }

  const numberOfRuns = rawPaths.length;
  const finalNetWorths = rawPaths
    .map(path => (path.length ? path[path.length - 1]?.netWorth ?? 0 : 0))
    .filter((value) => Number.isFinite(value));

  const sortedNetWorths = [...finalNetWorths].sort((a, b) => a - b);
  const percentile = (list: number[], p: number): number => {
    if (!list.length) return 0;
    const clamped = Math.min(list.length - 1, Math.max(0, Math.round(p * (list.length - 1))));
    return list[clamped];
  };

  let bankruptcyCount = 0;
  for (const path of rawPaths) {
    const didGoBankrupt = detectPathBankruptcy(path);
    if (didGoBankrupt) {
      bankruptcyCount += 1;
    }
  }

  const probabilityOfBankruptcy = numberOfRuns > 0 ? bankruptcyCount / numberOfRuns : 0;

  let probabilityOfSuccess = payload?.planProjection?.summary?.portfolioStats?.successRate;
  if (typeof probabilityOfSuccess === 'number') {
    probabilityOfSuccess = probabilityOfSuccess / 100;
  } else {
    probabilityOfSuccess = numberOfRuns > 0 ? (numberOfRuns - bankruptcyCount) / numberOfRuns : 0;
  }

  return {
    success: true,
    numberOfRuns,
    finalNetWorthP10: percentile(sortedNetWorths, 0.1),
    finalNetWorthP25: percentile(sortedNetWorths, 0.25),
    finalNetWorthP50: percentile(sortedNetWorths, 0.5),
    finalNetWorthP75: percentile(sortedNetWorths, 0.75),
    finalNetWorthP90: percentile(sortedNetWorths, 0.9),
    probabilityOfSuccess,
    probabilityOfBankruptcy,
    bankruptcyCount
  };
}

/**
 * Process goals from event ledger into UI-optimized format
 */
function processGoalsFromEventLedger(eventLedger: FinancialEvent[], config: AppConfig) {
  return eventLedger
    .filter(event => event.type === EventType.GOAL_DEFINE)
    .map(event => {
      const goalEvent = event as any;
      
      // Map goal type to category
      const goalTypeToCategory = {
        'RETIREMENT': 'retirement',
        'MAJOR_PURCHASE': 'purchase', 
        'EDUCATION': 'education',
        'EMERGENCY_FUND': 'other',
        'CUSTOM': 'other'
      };
      
      // Map priority to number (1=High, 2=Medium, 3=Low)
      const priorityToNumber = {
        'HIGH': 1,
        'MEDIUM': 2, 
        'LOW': 3
      };
      
      return {
        id: event.id,
        name: event.name || 'Financial Goal',
        icon: goalEvent.goalType === 'RETIREMENT' ? '🏖️' : 
              goalEvent.goalType === 'MAJOR_PURCHASE' ? '🏠' :
              goalEvent.goalType === 'EDUCATION' ? '🎓' : '🎯',
        description: event.description || 'Important financial milestone',
        targetYear: config.simulationStartYear + Math.floor((goalEvent.targetDateOffset || goalEvent.targetMonthOffset || 0) / 12),
        targetAmount: goalEvent.targetAmount,
        priority: priorityToNumber[goalEvent.goalPriority] || 2,
        category: goalTypeToCategory[goalEvent.goalType] || 'other',
        sourceAccountCategory: goalEvent.sourceAccountCategory,
        isFlexible: goalEvent.isFlexible,
        goalPriority: goalEvent.goalPriority
      };
    });
}

/**
 * Generate dynamic description for an event based on its current values
 * This ensures descriptions always reflect the latest event data
 */
function generateEventDescription(event: any): string {
  const eventAny = event as any;

  switch (event.type) {
    case EventType.INCOME:
      const totalComp = (eventAny.amount || 0) + (eventAny.bonus || 0) + (eventAny.rsuValue || 0);
      if (totalComp > 0) {
        return `$${totalComp.toLocaleString()}/year total comp`;
      }
      return `$${(eventAny.amount || 0).toLocaleString()}/year`;

    case EventType.RECURRING_EXPENSE:
      const frequency = eventAny.frequency || 'monthly';
      let displayAmount = eventAny.amount || 0;
      let displayFreq = frequency;

      // Convert to most readable format
      if (frequency === 'annually' && displayAmount >= 12000) {
        displayAmount = Math.round(displayAmount / 12);
        displayFreq = 'month';
      } else if (frequency === 'quarterly') {
        displayAmount = Math.round(displayAmount / 3);
        displayFreq = 'month';
      }

      return `$${displayAmount.toLocaleString()}/${displayFreq}`;

    case EventType.ONE_TIME_EVENT:
      return `$${(eventAny.amount || 0).toLocaleString()} one-time`;

    case EventType.SCHEDULED_CONTRIBUTION:
      const accountType = eventAny.accountType || 'investment';
      const contribFreq = eventAny.frequency || 'monthly';
      return `$${(eventAny.amount || 0).toLocaleString()} to ${accountType} ${contribFreq}`;

    case EventType.ROTH_CONVERSION:
      return `$${(eventAny.amount || 0).toLocaleString()} Roth conversion`;

    case EventType.GOAL_DEFINE:
      const targetAmount = eventAny.targetAmount || 0;
      return `Target: $${targetAmount.toLocaleString()}`;

    case EventType.SOCIAL_SECURITY_INCOME:
      return `$${(eventAny.amount || 0).toLocaleString()}/year SSI`;

    case EventType.HEALTHCARE_COST:
      const healthFreq = eventAny.frequency || 'monthly';
      return `$${(eventAny.amount || 0).toLocaleString()}/${healthFreq} healthcare`;

    case EventType.LIABILITY_ADD:
      const principal = eventAny.liability?.principalAmount || eventAny.amount || 0;
      return `$${principal.toLocaleString()} loan`;

    default:
      return eventAny.description || 'Financial event';
  }
}

/**
 * Generate icon for an event based on its type
 */
function generateEventIcon(eventType: EventType): string {
  switch (eventType) {
    case EventType.INCOME:
    case EventType.SOCIAL_SECURITY_INCOME:
      return '💼';
    case EventType.RECURRING_EXPENSE:
    case EventType.HEALTHCARE_COST:
      return '💸';
    case EventType.ONE_TIME_EVENT:
      return '💳';
    case EventType.SCHEDULED_CONTRIBUTION:
      return '📈';
    case EventType.ROTH_CONVERSION:
      return '🔄';
    case EventType.GOAL_DEFINE:
      return '🎯';
    case EventType.LIABILITY_ADD:
      return '🏠';
    default:
      return '📝';
  }
}

/**
 * Update simulation payload with fresh event descriptions
 */
function updateEventDescriptions(events: any[], simulationStartYear?: number, simulationStartMonth?: number): any[] {
  // Get simulation parameters from the initial state event if not provided
  const baseYear = simulationStartYear || (() => {
    const initialStateEvent = events.find(e => e.type === EventType.INITIAL_STATE) as any;
    return initialStateEvent?.startYear || new Date().getFullYear();
  })();

  const baseMonth = simulationStartMonth || (() => {
    const initialStateEvent = events.find(e => e.type === EventType.INITIAL_STATE) as any;
    return initialStateEvent?.initialMonth || 1;
  })();

  return events
    .filter(event => event.type !== EventType.GOAL_DEFINE && event.type !== EventType.INITIAL_STATE)
    .map(event => {
      // Use the proper calculation that accounts for the base start month
      const totalMonthsFromSimStartEpoch = (baseMonth - 1) + (event.monthOffset || 0);
      const startYear = baseYear + Math.floor(totalMonthsFromSimStartEpoch / 12);

      let endYear = startYear;
      if (event.endDateOffset) {
        const endTotalMonths = (baseMonth - 1) + event.endDateOffset;
        endYear = baseYear + Math.floor(endTotalMonths / 12);
      }

      return {
        id: event.id,
        name: event.name,
        icon: generateEventIcon(event.type),
        startYear,
        endYear,
        description: generateEventDescription(event)
      };
    });
}

/**
 * Service-level validation to ensure data integrity
 */
export function validateSimulationInputs(
  initialState: InitialStateEvent,
  eventLedger: FinancialEvent[],
  config: AppConfig
): string[] {
  const errors: string[] = [];

  // Basic null checks
  if (!initialState) {
    errors.push('Initial state is required');
  }

  if (!eventLedger || eventLedger.length === 0) {
    errors.push('Event ledger cannot be empty');
  }

  if (!config) {
    errors.push('Configuration is required');
  }

  if (config && config.monteCarloRuns <= 0) {
    errors.push('Monte Carlo runs must be greater than 0');
  }

  // Enhanced validation using JSON Schema validation service
  if (eventLedger && eventLedger.length > 0) {
    eventLedger.forEach((event, index) => {
      const validation = validateFinancialEventWithResult(event);
      if (!validation.isValid) {
        errors.push(`Event ${index + 1} (${event.id || 'unknown'}): ${validation.errorMessage}`);
      }
    });
  }

  // Validate the complete simulation input structure
  if (initialState && eventLedger && config) {
    const simulationInput = {
      initialAccounts: initialState,
      events: eventLedger,
      config: config,
      monthsToRun: config.monthsToRun || 480 // Default simulation length (40 years)
    };
    
    const validation = validateSimulationInputWithResult(simulationInput);
    if (!validation.isValid) {
      errors.push(`Simulation input validation failed: ${validation.errorMessage}`);
    }
  }

  return errors;
}

/**
 * Detect bankruptcy in a simulation path using formal insolvency rules
 * This implements a more sophisticated bankruptcy detection than simple net worth <= 0
 */
function detectPathBankruptcy(path: MonthlyData[]): boolean {
  // Rule 1: Net worth goes below -50% of peak (financial stress threshold)
  let peakNetWorth = 0;
  let consecutiveLowCashMonths = 0;
  const LOW_CASH_THRESHOLD = 1000; // $1,000 minimum cash buffer
  const CONSECUTIVE_MONTHS_THRESHOLD = 6; // 6 months of low cash

  for (const month of path) {
    const netWorth = month.netWorth ?? 0;
    const cashBalance = month.cashBalance ?? 0;

    // Track peak net worth
    if (netWorth > peakNetWorth) {
      peakNetWorth = netWorth;
    }

    // Rule 1: Severe net worth decline (bankruptcy)
    if (peakNetWorth > 0 && netWorth < -peakNetWorth * 0.5) {
      return true;
    }

    // Rule 2: Sustained liquidity crisis
    if (cashBalance < LOW_CASH_THRESHOLD) {
      consecutiveLowCashMonths++;
      if (consecutiveLowCashMonths >= CONSECUTIVE_MONTHS_THRESHOLD && netWorth < 0) {
        return true;
      }
    } else {
      consecutiveLowCashMonths = 0;
    }

    // Rule 3: Extreme negative net worth (classic bankruptcy)
    if (netWorth < -100000) { // -$100k absolute threshold
      return true;
    }
  }

  return false;
}
