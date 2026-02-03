/**
 * PARALLEL MONTE CARLO SIMULATION RUNNER WITH WEBWORKERS
 *
 * This module orchestrates multiple Monte Carlo simulation runs using
 * a pool of WebWorkers running WASM simulation instances. This approach:
 *
 * - Prevents UI blocking by running simulations in separate threads
 * - Maximizes performance through parallel execution
 * - Provides better mobile device performance
 * - Enables real-time progress reporting
 */

import { MonthlyData, InitialStateEvent, FinancialEvent, AppConfig, AccountHoldingsMonthEnd, AssetClass } from '@/types';
import { wasmWorkerPool } from '@/services/wasmWorkerPool';
import { logger } from '@/utils/logger';
// import { debugSimulation } from '@/utils/simulationDebugger';

/**
 * Progress callback interface for monitoring simulation progress
 */
export interface SimulationProgressCallback {
  onProgress?: (completed: number, total: number, workerIndex?: number) => void;
  onWorkerComplete?: (workerIndex: number, results: any[]) => void;
  onComplete?: (allResults: MonthlyData[][]) => void;
  onError?: (error: Error) => void;
}

/**
 * Run Monte Carlo simulation in parallel using WebWorker pool
 */
export async function runMonteCarloParallel(
  initialStateEvent: InitialStateEvent,
  ledger: FinancialEvent[],
  config: AppConfig,
  runs: number,
  progressCallback?: SimulationProgressCallback
): Promise<MonthlyData[][]> {
  const startTime = Date.now();

  logger.simulationLog(`Running Monte Carlo parallel with ${runs} runs`);
  try {
    // Initialize worker pool
    await wasmWorkerPool.initialize();
    logger.wasmLog('Worker pool initialized successfully');

    // Convert InitialStateEvent to AccountHoldingsMonthEnd format
    const initialAccounts: AccountHoldingsMonthEnd = convertInitialState(initialStateEvent);
    logger.dataLog('Initial accounts converted for WASM');

    // Calculate simulation duration properly using config settings
    const simulationEndAge = config.simulationEndAge || 85;
    const currentAge = config.currentAge || 35;
    const simulationMonths = (simulationEndAge - currentAge) * 12; // Full simulation duration

    // For event processing, use maximum of event offsets and simulation duration
    const maxMonthOffset = Math.max(
      ...ledger.map(event => event.monthOffset || 0),
      ...ledger.map(event => (event as any).endDateOffset || 0),
      simulationMonths
    );

    // TRACE: Critical monthsToRun debugging
    logger.info(`🔍 [ORCHESTRATOR→WORKER] monthsToRun calculation:`);
    logger.info(`   currentAge: ${currentAge}`);
    logger.info(`   simulationEndAge: ${simulationEndAge}`);
    logger.info(`   simulationMonths: ${simulationMonths} (expecting ~780 for 65 years)`);
    logger.info(`   maxMonthOffset: ${maxMonthOffset}`);
    logger.info(`   Will pass simulationMonths=${simulationMonths} to WASM worker pool`);

    logger.dataLog(`MONTHS_TO_RUN_WORKER_DEBUG: currentAge=${currentAge}, simulationEndAge=${simulationEndAge}, simulationMonths=${simulationMonths}, maxMonthOffset=${maxMonthOffset}`);

    // CENTRALIZED EVENT PROCESSING: Use EventProcessingService for consistent preprocessing
    // This eliminates double processing and ensures memory safety
    const { eventProcessingService } = await import('../services/eventProcessingService');

    // Check if events are already preprocessed to avoid redundant processing
    let preprocessedLedger: FinancialEvent[];

    if (eventProcessingService.isAlreadyPreprocessed(ledger)) {
      logger.performanceLog(`Using ${ledger.length} preprocessed recurring patterns (no processing needed)`);
      preprocessedLedger = ledger; // Use events as-is
    } else {
      // Process events using centralized service with memory safety
      const processingResult = await eventProcessingService.processEvents(ledger, {
        maxMonthOffset,
        useRecurringPatterns: false, // Force expanded events for proper 70-year simulation
        memoryLimit: 50000, // Support 70-year simulations (raised from 5000)
        skipValidation: false // Ensure validation runs
      });

      preprocessedLedger = processingResult.processedEvents;

      logger.performanceLog(
        `${processingResult.processingStats.inputEventCount} → ` +
        `${processingResult.processingStats.outputEventCount} events ` +
        `(${processingResult.processingStats.processingMode} mode, ` +
        `${Math.round(processingResult.processingStats.processingTimeMs)}ms)`
      );

      // Log validation results - only for significant warning counts
      if (processingResult.validationReport.warnings.length > 5) {
        logger.warn(`⚠️ [WORKER-RUNNER-VALIDATION] ${processingResult.validationReport.warnings.length} warnings during processing`);
      } else if (processingResult.validationReport.warnings.length > 0) {
        logger.dataLog(`${processingResult.validationReport.warnings.length} validation warnings during processing`);
      }
    }


    // Set up progress reporting
    const workerProgressCallback = {
      onProgress: (completed: number, total: number, workerIndex?: number) => {
        progressCallback?.onProgress?.(completed, total, workerIndex);

      },
      onComplete: (allResults: any[]) => {
        progressCallback?.onComplete?.(allResults);
      },
      onError: (error: Error) => {
        progressCallback?.onError?.(error);
      }
    };

    // Debug WASM input structure in development
    logger.wasmLog('FULL WASM INPUT STRUCTURE - Initial accounts:', initialAccounts);
    logger.wasmLog('FULL WASM INPUT STRUCTURE - Preprocessed events:', preprocessedLedger);
    logger.wasmLog('FULL WASM INPUT STRUCTURE - Simulation parameters:', {
      maxMonthOffset,
      runs,
      configStochastic: config.stochasticConfig ? 'PRESENT' : 'MISSING'
    });
    logger.wasmLog('FULL WASM INPUT STRUCTURE - Event analysis:', {
      totalEvents: preprocessedLedger.length,
      eventsByType: preprocessedLedger.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {}),
      incomeEvents: preprocessedLedger.filter(e => e.type === 'INCOME'),
      expenseEvents: preprocessedLedger.filter(e => e.type === 'EXPENSE'),
      contributionEvents: preprocessedLedger.filter(e => e.type === 'CONTRIBUTION')
    });

    // Log events going INTO simulation engine (ultra-compact)
    logger.dataLog('INPUT EVENTS:', preprocessedLedger.map(e => `${e.type}:$${Math.round(e.amount/1000)}k:${e.startDate?.slice(0,7)||'?'}`).join(' | '));

    // TRACE: Final monthsToRun being passed to WASM
    logger.info(`🚀 [WORKER→WASM] Calling wasmWorkerPool.runMonteCarloParallel with monthsToRun=${simulationMonths}`);

    const rawResults = await wasmWorkerPool.runMonteCarloParallel(
      initialAccounts,
      preprocessedLedger,
      config,
      simulationMonths, // Use full simulation duration, not just maxMonthOffset
      runs,
      workerProgressCallback
    );
    // Log ultra-compact WASM output structure
    const firstResult = rawResults[0];
    const sample = firstResult?.data?.[0];
    logger.dataLog('OUTPUT PATHS:', `${rawResults.length} paths, sample month:`, sample ? `netWorth:${Math.round(sample.netWorth/1000)}k incomeThisMonth:${sample.incomeThisMonth||0} empIncome:${sample.employmentIncomeThisMonth||0}` : 'NONE');

    // Check for WASM simulation errors before processing results
    const validResults: Array<{ pathIndex: number; data: any[] }> = [];
    const failedResults: Array<{ pathIndex: number; error: string }> = [];
    
    logger.simulationLog(`Processing ${rawResults.length} simulation results`);
    
    
    rawResults.forEach((wasmPath, pathIndex) => {
      // Check if this is an error object from WASM
      if (typeof wasmPath === 'object' && wasmPath && 'success' in wasmPath && !wasmPath.success) {
        const errorDetails = wasmPath.error || 'Unknown WASM error';
        // Reduce error spam - only log if it's not a common initialization issue
        if (!errorDetails.includes('Invalid JSON input') || failedResults.length === 0) {
          logger.error(`WASM simulation path ${pathIndex} failed: ${errorDetails}`);
        }
        failedResults.push({ pathIndex, error: errorDetails });
        return;
      }

      // FIXED: Extract monthlyData array from WASM result structure
      if (typeof wasmPath === 'object' && wasmPath && 'monthlyData' in wasmPath) {
        if (Array.isArray(wasmPath.monthlyData) && wasmPath.monthlyData.length > 0) {
          logger.dataLog(`Path ${pathIndex}: Found ${wasmPath.monthlyData.length} monthly data points`);
          validResults.push({ pathIndex, data: wasmPath.monthlyData });
          return;
        } else {
          logger.warn(`Path ${pathIndex}: monthlyData exists but is empty or invalid`);
        }
      }

      // Also try direct array format (legacy support)
      if (Array.isArray(wasmPath) && wasmPath.length > 0) {
        logger.dataLog(`Path ${pathIndex}: Using direct array format with ${wasmPath.length} data points`);
        validResults.push({ pathIndex, data: wasmPath });
        return;
      }

      logger.error(`Path ${pathIndex}: Unexpected result format - type: ${typeof wasmPath}, keys: ${typeof wasmPath === 'object' ? Object.keys(wasmPath) : 'N/A'}`);
      failedResults.push({ pathIndex, error: `Unexpected result format: ${typeof wasmPath}` });
    });

    // Report failure statistics
    if (failedResults.length > 0) {
      // Only log details if it's a reasonable failure rate
      if (failedResults.length <= rawResults.length * 0.1) {
        logger.warn(`${failedResults.length}/${rawResults.length} simulation paths failed`);
      } else {
        logger.error(`High failure rate: ${failedResults.length}/${rawResults.length} simulation paths failed`);
      }

      // If too many paths failed, throw error (increased threshold to 90%)
      if (failedResults.length > rawResults.length * 0.9) {
        throw new Error(`More than 90% of simulation paths failed. Common error: ${failedResults[0]?.error}`);
      }
    }

    if (validResults.length === 0) {
      logger.error('FAILURE: No valid simulation results!');
      throw new Error('No valid simulation results received from WASM engine');
    }
    
    logger.simulationLog(`${validResults.length}/${rawResults.length} paths valid, converting to MonthlyData format`);

    // Convert valid WASM results to expected MonthlyData format
    const convertedResults = validResults.map(({ pathIndex, data }) => {
      return convertWASMToMonthlyData(data, initialStateEvent, pathIndex === 0);
    });

    // Debug first path results
    if (convertedResults.length > 0) {
      debugFirstPath(convertedResults[0]);
    }

    logger.simulationLog(`Successfully returning ${convertedResults.length} converted results`);
    return convertedResults;

  } catch (error) {
    // Don't log if this is a known cascading error
    const errorMsg = (error as Error).message || error.toString();
    if (!errorMsg.includes('More than 90% of simulation paths failed')) {
      logger.error('ERROR in runMonteCarloParallel:', error);
    }
    progressCallback?.onError?.(error as Error);
    throw new Error(`WebWorker simulation failed: ${error}`);
  }
}

/**
 * Convert InitialStateEvent to AccountHoldingsMonthEnd format
 */
function convertInitialState(initialStateEvent: InitialStateEvent): AccountHoldingsMonthEnd {
  // 🔧 FIELD MAPPING FIX: Ensure costBasisPerUnit is properly mapped for WASM
  const mapHoldingsForWASM = (holdings: any[]): any[] => {
    return holdings.map(holding => ({
      ...holding,
      // Ensure WASM gets the costBasisPerUnit field it expects
      costBasisPerUnit: holding.costBasisPerUnit || holding.purchasePricePerUnit || 0
    }));
  };

  const result = {
    taxable: initialStateEvent.initialAccounts?.taxable ? {
      holdings: mapHoldingsForWASM(initialStateEvent.initialAccounts.taxable),
      totalValue: initialStateEvent.initialAccounts.taxable.reduce((sum, h) => sum + h.currentMarketValueTotal, 0),
      cash: 0,
      totalCostBasis: initialStateEvent.initialAccounts.taxable.reduce((sum, h) => sum + h.costBasisTotal, 0),
      totalUnrealizedGains: initialStateEvent.initialAccounts.taxable.reduce((sum, h) => sum + h.unrealizedGainLossTotal, 0)
    } : undefined,
    // 🔧 MAPPING FIX: Map '401k' to tax_deferred and 'rothIra' to roth
    tax_deferred: initialStateEvent.initialAccounts?.tax_deferred ? {
      holdings: mapHoldingsForWASM(initialStateEvent.initialAccounts.tax_deferred),
      totalValue: initialStateEvent.initialAccounts.tax_deferred.reduce((sum, h) => sum + h.currentMarketValueTotal, 0),
      cash: 0,
      totalCostBasis: initialStateEvent.initialAccounts.tax_deferred.reduce((sum, h) => sum + h.costBasisTotal, 0),
      totalUnrealizedGains: initialStateEvent.initialAccounts.tax_deferred.reduce((sum, h) => sum + h.unrealizedGainLossTotal, 0)
    } : (initialStateEvent.initialAccounts?.['401k'] ? {
      // 🔧 MAPPING FIX: Map '401k' to tax_deferred
      holdings: mapHoldingsForWASM(initialStateEvent.initialAccounts['401k']),
      totalValue: initialStateEvent.initialAccounts['401k'].reduce((sum, h) => sum + h.currentMarketValueTotal, 0),
      cash: 0,
      totalCostBasis: initialStateEvent.initialAccounts['401k'].reduce((sum, h) => sum + h.costBasisTotal, 0),
      totalUnrealizedGains: initialStateEvent.initialAccounts['401k'].reduce((sum, h) => sum + h.unrealizedGainLossTotal, 0)
    } : undefined),
    roth: initialStateEvent.initialAccounts?.roth ? {
      holdings: mapHoldingsForWASM(initialStateEvent.initialAccounts.roth),
      totalValue: initialStateEvent.initialAccounts.roth.reduce((sum, h) => sum + h.currentMarketValueTotal, 0),
      cash: 0,
      totalCostBasis: initialStateEvent.initialAccounts.roth.reduce((sum, h) => sum + h.costBasisTotal, 0),
      totalUnrealizedGains: initialStateEvent.initialAccounts.roth.reduce((sum, h) => sum + h.unrealizedGainLossTotal, 0)
    } : (initialStateEvent.initialAccounts?.rothIra ? {
      // 🔧 MAPPING FIX: Map 'rothIra' to roth
      holdings: mapHoldingsForWASM(initialStateEvent.initialAccounts.rothIra),
      totalValue: initialStateEvent.initialAccounts.rothIra.reduce((sum, h) => sum + h.currentMarketValueTotal, 0),
      cash: 0,
      totalCostBasis: initialStateEvent.initialAccounts.rothIra.reduce((sum, h) => sum + h.costBasisTotal, 0),
      totalUnrealizedGains: initialStateEvent.initialAccounts.rothIra.reduce((sum, h) => sum + h.unrealizedGainLossTotal, 0)
    } : undefined),
    cash: initialStateEvent.initialCash || 0,
  };
  
  
  return result;
}


/**
 * Convert WASM MonthlyData to expected TypeScript MonthlyData format
 */
function convertWASMToMonthlyData(wasmPath: any[], initialStateEvent: InitialStateEvent, isFirstPath = false): MonthlyData[] {
  if (!Array.isArray(wasmPath)) {
    throw new Error(`convertWASMToMonthlyData received non-array: ${typeof wasmPath}`);
  }


  return wasmPath.map((wasmData: any) => {
    const calendarYear = (initialStateEvent.startYear || new Date().getFullYear()) + Math.floor(wasmData.monthOffset / 12);
    const calendarMonth = wasmData.monthOffset % 12;
    const ageMonthsTotal = (initialStateEvent.currentAge * 12) + wasmData.monthOffset;

    // DEBUG: Log WASM data structure to understand what we're receiving
    if (wasmData.monthOffset === 0 && isFirstPath) {
      logger.wasmLog('Raw WASM data for month 0:', {
        hasAccounts: !!wasmData.accounts,
        accountsKeys: wasmData.accounts ? Object.keys(wasmData.accounts) : 'no accounts',
        netWorth: wasmData.netWorth,
        cashFlow: wasmData.cashFlow
      });

      logger.wasmLog('All WASM fields:', Object.keys(wasmData));

      if (wasmData.accounts) {
        logger.wasmLog('Account details:', {
          cash: wasmData.accounts.cash,
          taxable: wasmData.accounts.taxable,
          tax_deferred: wasmData.accounts.tax_deferred,
          taxDeferred: wasmData.accounts.taxDeferred,
          roth: wasmData.accounts.roth
        });
      }
    }

    // PERFORMANCE: Shallow copy accounts data - deep clone is expensive and unnecessary
    const accountsSnapshot = {
      cash: wasmData.accounts?.cash || 0,
      taxable: wasmData.accounts?.taxable ? {
        totalValue: wasmData.accounts.taxable.totalValue || 0,
        holdings: wasmData.accounts.taxable.holdings || undefined
      } : undefined,
      tax_deferred: wasmData.accounts?.tax_deferred ? {
        totalValue: wasmData.accounts.tax_deferred.totalValue || 0,
        holdings: wasmData.accounts.tax_deferred.holdings || undefined
      } : undefined,
      roth: wasmData.accounts?.roth ? {
        totalValue: wasmData.accounts.roth.totalValue || 0,
        holdings: wasmData.accounts.roth.holdings || undefined
      } : undefined
    };

    // DEBUG: Log the converted accounts structure
    if (wasmData.monthOffset === 0 && isFirstPath) {
      logger.wasmLog('Converted accounts for month 0:', accountsSnapshot);
      // Also log to our logger for visibility
      logger.dataLog(`WASM conversion - accounts for month 0: taxable=${accountsSnapshot.taxable?.totalValue || 0}, tax_deferred=${accountsSnapshot.tax_deferred?.totalValue || 0}, roth=${accountsSnapshot.roth?.totalValue || 0}, cash=${accountsSnapshot.cash}`);
    }

    // Debug WASM income data (removed for performance)

    const monthlyData: MonthlyData = {
      monthOffset: wasmData.monthOffset,
      calendarYear,
      calendarMonth,
      ageYears: Math.floor(ageMonthsTotal / 12),
      ageMonths: ageMonthsTotal % 12,
      netWorth: wasmData.netWorth,
      cashBalance: accountsSnapshot.cash,
      // Use deep copied values to avoid reference issues
      taxableAccountValue: accountsSnapshot.taxable?.totalValue || 0,
      taxDeferredAccountValue: accountsSnapshot.tax_deferred?.totalValue || 0,
      rothAccountValue: accountsSnapshot.roth?.totalValue || 0,
      totalLiabilitiesValue: 0,

      // Flow fields from WASM
      grossIncome: wasmData.incomeThisMonth || 0,
      preTaxContributions: wasmData.contributionsToInvestmentsThisMonth || 0,
      postTaxContributions: 0,
      taxesPaid: wasmData.taxWithheldThisMonth || 0,
      expenses: wasmData.expensesThisMonth || 0,
      debtPaymentsPrincipal: wasmData.debtPaymentsPrincipalThisMonth || 0,
      debtPaymentsInterest: wasmData.debtPaymentsInterestThisMonth || 0,
      rothConversions: wasmData.rothConversionAmountThisMonth || 0,
      dividendsReceivedQualified: 0,
      dividendsReceivedOrdinary: 0,
      interestReceivedTaxable: 0,
      interestReceivedTaxExempt: 0,
      realizedGainsShortTerm: 0,
      realizedGainsLongTerm: 0,
      withdrawalsFromTaxable: 0,
      withdrawalsFromTaxDeferred: 0,
      withdrawalsFromRoth: 0,
      rmdAmountTaken: 0,
      qcdAmount: 0,

      // Monthly tracking fields
      incomeThisMonth: wasmData.incomeThisMonth || 0,
      employmentIncomeThisMonth: wasmData.employmentIncomeThisMonth || wasmData.incomeThisMonth || 0,
      expensesThisMonth: wasmData.expensesThisMonth || 0,
      contributionsToInvestmentsThisMonth: wasmData.contributionsToInvestmentsThisMonth || 0,
      debtPaymentsPrincipalThisMonth: wasmData.debtPaymentsPrincipalThisMonth || 0,
      debtPaymentsInterestThisMonth: wasmData.debtPaymentsInterestThisMonth || 0,
      rothConversionAmountThisMonth: wasmData.rothConversionAmountThisMonth || 0,
      oneTimeEventsImpactThisMonth: wasmData.oneTimeEventsImpactThisMonth || 0,
      divestmentProceedsThisMonth: wasmData.divestmentProceedsThisMonth || 0,
      rebalancingTradesNetEffectThisMonth: wasmData.rebalancingTradesNetEffectThisMonth || 0,
      taxWithheldThisMonth: wasmData.taxWithheldThisMonth || 0,
      dividendsReceivedThisMonth: wasmData.dividendsReceivedThisMonth || { qualified: 0, ordinary: 0 },

      // YTD tax tracking
      ordinaryIncomeForTaxYTD: wasmData.ordinaryIncomeForTaxYTD || 0,
      stcgForTaxYTD: wasmData.stcgForTaxYTD || 0,
      ltcgForTaxYTD: wasmData.ltcgForTaxYTD || 0,
      qualifiedDividendIncomeYTD: wasmData.qualifiedDividendIncomeYTD || 0,
      ordinaryDividendIncomeYTD: wasmData.ordinaryDividendIncomeYTD || 0,
      itemizedDeductibleInterestPaidYTD: wasmData.itemizedDeductibleInterestPaidYTD || 0,
      preTaxContributionsYTD: wasmData.preTaxContributionsYTD || 0,
      taxWithholdingYTD: wasmData.taxWithholdingYTD || 0,

      // Annual tax results (optional)
      taxPaidAnnual: wasmData.taxPaidAnnual,
      rmdAmountAnnual: wasmData.rmdAmountAnnual,
      irmaaMedicarePremiumAdjustment: wasmData.irmaaMedicarePremiumAdjustment,
      capitalLossCarryoverEndYear: wasmData.capitalLossCarryoverEndYear,
      activeFilingStatus: wasmData.activeFilingStatus,
      activeNumDependents: wasmData.activeNumDependents,

      // Optional fields
      assets: accountsSnapshot,
      accounts: accountsSnapshot, // This is what the orchestrator expects
      inflationRateMonthlyApplied: wasmData.returns?.inflation,
      marketReturnsApplied: {
        [AssetClass.US_STOCKS_TOTAL_MARKET]: wasmData.returns?.spy,
        [AssetClass.US_BONDS_TOTAL_MARKET]: wasmData.returns?.bnd,
        [AssetClass.INTERNATIONAL_STOCKS]: wasmData.returns?.intl,
        [AssetClass.REAL_ESTATE_PRIMARY_HOME]: wasmData.returns?.home,
        [AssetClass.CASH]: wasmData.returns?.inflation * 0.3,
        [AssetClass.OTHER_ASSETS]: (wasmData.returns?.spy * 0.6) + (wasmData.returns?.bnd * 0.4),
        [AssetClass.LEVERAGED_SPY]: wasmData.returns?.spy * 2,
        [AssetClass.INDIVIDUAL_STOCK]: wasmData.returns?.spy,
      }
    };

    return monthlyData;
  });
}

/**
 * Debug first simulation path for validation
 */
function debugFirstPath(firstPath: MonthlyData[]) {
  if (firstPath.length === 0) {
    logger.warn('First simulation path is empty', 'SIMULATION');
    return;
  }
}

/**
 * Test WebWorker pool functionality
 */
export async function testWorkerPool(): Promise<void> {
  try {
    await wasmWorkerPool.initialize();

    const stats = wasmWorkerPool.getStats();

    // Test math functions
    const mathResult = await wasmWorkerPool.testMathFunctions();
  } catch (error) {
    logger.error(`WebWorker pool test failed: ${error}`);
    throw error;
  }
}