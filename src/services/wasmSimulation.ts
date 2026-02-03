/**
 * WebAssembly Simulation Service
 *
 * This module provides a TypeScript interface to the Go-compiled WASM simulation engine.
 * It handles loading the WASM module and provides type-safe wrappers for simulation functions.
 */

import { AppConfig, SimulationEvent, AccountHoldingsMonthEnd, EventType, EventPriority } from '@/types';
import { showWarning, showInfo, showSuccess, handleError } from '@/utils/notifications';
import { fallbackSimulationEngine, FallbackSimulationResult, FallbackMonteCarloResult } from './fallbackSimulation';
import { logger } from '@/utils/logger';

// WASM module interface
interface WASMModule {
  runMonteCarloSimulation: (input: SimulationInput, numberOfRuns: number) => Promise<SimulationResults>;
  runSingleSimulation: (input: SimulationInput) => Promise<SimulationResult>;
  testMathFunctions: () => Promise<any>;
}

// Simulation input/output types matching Go structs
interface SimulationInput {
  initialAccounts: AccountHoldingsMonthEnd;
  events: SimulationEvent[]; // Changed from FinancialEvent to SimulationEvent
  config: AppConfig['stochasticConfig'];
  monthsToRun: number;
}

// Removed unused interfaces to satisfy linting requirements

/**
 * Core simulation state for a single month
 * This matches the Go MonthlyData struct exactly
 */
interface MonthlyData {
  monthOffset: number;
  netWorth: number;
  cashFlow: number;
  accounts: AccountHoldingsMonthEnd;
  returns: {
    spy: number;
    bnd: number;
    intl: number;
    home: number;
    rent: number;
    inflation: number;
  };
  
  // Monthly flow tracking (from Go struct)
  incomeThisMonth: number;
  expensesThisMonth: number;
  contributionsToInvestmentsThisMonth: number;
  debtPaymentsPrincipalThisMonth: number;
  debtPaymentsInterestThisMonth: number;
  rothConversionAmountThisMonth: number;
  oneTimeEventsImpactThisMonth: number;
  divestmentProceedsThisMonth: number;
  rebalancingTradesNetEffectThisMonth: number;
  taxWithheldThisMonth: number;
  dividendsReceivedThisMonth: {
    qualified: number;
    ordinary: number;
  };
  
  // YTD tax tracking (from Go struct)
  ordinaryIncomeForTaxYTD: number;
  stcgForTaxYTD: number;  // Note: Go uses "stcgForTaxYTD"
  ltcgForTaxYTD: number;  // Note: Go uses "ltcgForTaxYTD"
  qualifiedDividendIncomeYTD: number;
  ordinaryDividendIncomeYTD: number;
  itemizedDeductibleInterestPaidYTD: number;
  preTaxContributionsYTD: number;
  taxWithholdingYTD: number;
  
  // Annual tax results (pointers in Go, so optional in TypeScript)
  taxPaidAnnual?: number;
  rmdAmountAnnual?: number;
  irmaaMedicarePremiumAdjustment?: number;
  capitalLossCarryoverEndYear?: number;
  activeFilingStatus?: string;
  activeNumDependents?: number;
  
  // Detailed tax breakdown (pointers in Go, so optional in TypeScript)
  federalIncomeTaxAnnual?: number;
  stateIncomeTaxAnnual?: number;
  capitalGainsTaxShortTermAnnual?: number;
  capitalGainsTaxLongTermAnnual?: number;
  alternativeMinimumTaxAnnual?: number;
  effectiveTaxRateAnnual?: number;
  marginalTaxRateAnnual?: number;
  adjustedGrossIncomeAnnual?: number;
  taxableIncomeAnnual?: number;
}

interface SimulationResult {
  success: boolean;
  monthlyData: MonthlyData[];
  error?: string;
}

interface SimulationResults {
  success: boolean;
  numberOfRuns: number;
  finalNetWorthP10: number;
  finalNetWorthP25: number;
  finalNetWorthP50: number;
  finalNetWorthP75: number;
  finalNetWorthP90: number;
  probabilityOfSuccess: number;
  error?: string;
}

class WASMSimulationEngine {
  private wasmModule: WASMModule | null = null;
  private wasmLoaded = false;
  private loadingPromise: Promise<void> | null = null;
  private wasmFailed = false;
  private loadAttempts = 0;
  private maxLoadAttempts = 3;
  private useFallback = false;

  /**
   * Load the WASM module from the public directory
   */
  async loadWASM(): Promise<void> {
    if (this.wasmLoaded) {
      return;
    }

    if (this.wasmFailed && this.loadAttempts >= this.maxLoadAttempts) {
      this.useFallback = true;
      showWarning(
        'Using Fallback Engine',
        'WASM failed to load after multiple attempts. Using JavaScript fallback.',
        8000
      );
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadAttempts++;
    this.loadingPromise = this.initializeWASM();
    return this.loadingPromise;
  }

  private async initializeWASM(): Promise<void> {
    try {
      logger.wasmLog(`Attempting to load WASM (attempt ${this.loadAttempts}/${this.maxLoadAttempts})...`);
      
      // Check if browser supports WASM
      if (!window.WebAssembly) {
        throw new Error('WebAssembly not supported in this browser');
      }

      // Load the WASM support script with timeout
      const wasmExecScript = document.createElement('script');
      wasmExecScript.src = '/wasm_exec.js';
      document.head.appendChild(wasmExecScript);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WASM exec script loading timeout'));
        }, 10000);

        wasmExecScript.onload = () => {
          clearTimeout(timeout);
          resolve(void 0);
        };
        wasmExecScript.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load wasm_exec.js: ${error}`));
        };
      });

      // Check if Go is available
      if (!(window as any).Go) {
        throw new Error('Go WASM runtime not available');
      }

      // Initialize Go WASM runtime
      const go = new (window as any).Go();

      // Load the WASM module with timeout and error handling
      let wasmResponse: Response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        wasmResponse = await fetch('/pathfinder.wasm', { 
          signal: controller.signal,
          cache: import.meta.env.DEV ? 'no-cache' : 'force-cache' // No cache in dev, cache in prod
        });
        
        clearTimeout(timeoutId);

        if (!wasmResponse.ok) {
          throw new Error(`HTTP ${wasmResponse.status}: ${wasmResponse.statusText}`);
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          throw new Error('WASM file loading timeout');
        }
        throw new Error(`Failed to fetch WASM file: ${fetchError}`);
      }

      // Convert to ArrayBuffer with size validation
      const wasmBytes = await wasmResponse.arrayBuffer();
      if (wasmBytes.byteLength === 0) {
        throw new Error('WASM file is empty');
      }

      logger.wasmLog(`WASM file loaded: ${(wasmBytes.byteLength / 1024 / 1024).toFixed(2)}MB`);

      // Instantiate WASM module
      let wasmModule;
      try {
        wasmModule = await WebAssembly.instantiate(wasmBytes, go.importObject);
      } catch (instantiateError) {
        throw new Error(`WASM instantiation failed: ${instantiateError}`);
      }

      // Run the Go program in the background (it will block with select{} to stay alive)
      go.run(wasmModule.instance).catch((error) => {
        logger.error('Go program execution error:', 'WASM', error);
      });

      // Wait for WASM to signal it's ready
      await this.waitForWASMReady(15000);

      // Validate exported functions
      const expectedFunctions = ['runMonteCarloSimulation', 'runSingleSimulation', 'testMathFunctions'];
      const missingFunctions = expectedFunctions.filter(fn => !(window as any)[fn]);
      
      if (missingFunctions.length > 0) {
        throw new Error(`Missing WASM functions: ${missingFunctions.join(', ')}`);
      }

      // Get references to exported functions
      this.wasmModule = {
        runMonteCarloSimulation: (window as any).runMonteCarloSimulation,
        runSingleSimulation: (window as any).runSingleSimulation,
        testMathFunctions: (window as any).testMathFunctions,
      };

      // Test basic functionality
      try {
        await this.wasmModule.testMathFunctions();
      } catch (testError) {
        throw new Error(`WASM function test failed: ${testError}`);
      }

      this.wasmLoaded = true;
      this.wasmFailed = false;
      this.loadingPromise = null;
      
      logger.wasmLog('WASM simulation engine loaded and tested successfully');
      
      showSuccess(
        'WASM Engine Ready',
        'High-performance simulation engine loaded successfully',
        3000
      );

    } catch (error) {
      this.wasmFailed = true;
      this.loadingPromise = null;
      
      logger.error(`WASM loading failed (attempt ${this.loadAttempts}):`, 'WASM', error);
      
      // Determine if we should attempt fallback
      if (this.loadAttempts >= this.maxLoadAttempts) {
        this.useFallback = true;
        
        handleError(
          error,
          'WASM Loading',
          `WASM failed to load after ${this.maxLoadAttempts} attempts. Falling back to JavaScript engine.`
        );
      } else {
        showWarning(
          'WASM Loading Failed',
          `Attempt ${this.loadAttempts}/${this.maxLoadAttempts} failed. Retrying...`,
          5000
        );
      }
      
      throw new Error(`WASM loading failed: ${error}`);
    }
  }

  private async waitForWASMReady(timeout = 10000): Promise<void> {
    const startTime = Date.now();

    while (!((window as any).wasmReady)) {
      if (Date.now() - startTime > timeout) {
        throw new Error('WASM module failed to initialize within timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Run a Monte Carlo simulation using the WASM engine or fallback
   */
  async runMonteCarloSimulation(
    initialAccounts: AccountHoldingsMonthEnd,
    events: SimulationEvent[],
    config: AppConfig,
    monthsToRun: number,
    numberOfRuns: number
  ): Promise<SimulationResults> {
    try {
      await this.loadWASM();

      // Use fallback if WASM is not available
      if (this.useFallback || !this.wasmModule) {
        return this.runFallbackMonteCarloSimulation(
          initialAccounts,
          events,
          config,
          monthsToRun,
          numberOfRuns
        );
      }

      const input: SimulationInput = {
        initialAccounts,
        events,
        config: config.stochasticConfig || this.getDefaultStochasticConfig(),
        monthsToRun,
      };

      const results = await this.wasmModule.runMonteCarloSimulation(input, numberOfRuns);

      if (!results.success) {
        throw new Error(results.error || 'WASM simulation failed');
      }

      return results;
    } catch (error) {
      logger.error('Monte Carlo simulation failed, trying fallback:', 'SIMULATION', error);
      
      // Try fallback on WASM failure
      showWarning(
        'Using Fallback Engine',
        'WASM simulation failed, switching to JavaScript engine',
        5000
      );
      
      return this.runFallbackMonteCarloSimulation(
        initialAccounts,
        events,
        config,
        monthsToRun,
        numberOfRuns
      );
    }
  }

  /**
   * Run a single simulation path using the WASM engine or fallback
   */
  async runSingleSimulation(
    initialAccounts: AccountHoldingsMonthEnd,
    events: SimulationEvent[],
    config: AppConfig,
    monthsToRun: number
  ): Promise<MonthlyData[]> {
    try {
      await this.loadWASM();

      // Use fallback if WASM is not available
      if (this.useFallback || !this.wasmModule) {
        return this.runFallbackSingleSimulation(
          initialAccounts,
          events,
          config,
          monthsToRun
        );
      }

      const input: SimulationInput = {
        initialAccounts,
        events,
        config: config.stochasticConfig || this.getDefaultStochasticConfig(),
        monthsToRun,
      };

      const result = await this.wasmModule.runSingleSimulation(input);

      if (!result.success) {
        throw new Error(result.error || 'WASM simulation failed');
      }

      return result.monthlyData;
    } catch (error) {
      logger.error('Single simulation failed, trying fallback:', 'SIMULATION', error);
      
      // Try fallback on WASM failure
      return this.runFallbackSingleSimulation(
        initialAccounts,
        events,
        config,
        monthsToRun
      );
    }
  }

  /**
   * Test mathematical functions (for debugging/validation)
   */
  async testMathFunctions(): Promise<any> {
    await this.loadWASM();

    if (!this.wasmModule) {
      throw new Error('WASM module not loaded');
    }

    return this.wasmModule.testMathFunctions();
  }

  /**
   * Run a comprehensive test of the WASM simulation engine
   */
  async runComprehensiveTest(): Promise<any> {
    logger.wasmLog('Starting comprehensive WASM test...');

    try {
      await this.loadWASM();

      if (!this.isLoaded()) {
        throw new Error('WASM engine not available');
      }

      // Test 1: Math functions
      logger.wasmLog('Testing math functions...');
      const mathResults = await this.testMathFunctions();
      logger.wasmLog('Math functions test passed:', mathResults);

      // Test 2: Simple simulation
      logger.wasmLog('Testing simulation engine...');
      const testAccounts = {
        taxable: undefined,
        tax_deferred: undefined,
        roth: undefined,
        cash: 100000
      };

      const testEvents: SimulationEvent[] = [
        {
          id: 'test-income',
          type: EventType.INCOME,
          name: 'Test Income',
          monthOffset: 0,
          priority: EventPriority.INCOME,
          amount: 5000
        },
        {
          id: 'test-expense',
          type: EventType.RECURRING_EXPENSE,
          name: 'Test Expense',
          monthOffset: 0,
          priority: EventPriority.RECURRING_EXPENSE,
          amount: 3000
        }
      ];

      const testConfig = {
        stochasticConfig: this.getDefaultStochasticConfig()
      };

      const simStart = performance.now();
      const simResults = await this.runSingleSimulation(
        testAccounts,
        testEvents,
        testConfig as any,
        12
      );
      const simDuration = performance.now() - simStart;

      logger.wasmLog('Simulation test completed:', {
        duration: `${simDuration.toFixed(2)}ms`,
        monthsSimulated: simResults.length,
        finalNetWorth: simResults.length > 0 ? simResults[simResults.length - 1].netWorth : 'N/A'
      });

      // Test 3: Performance test
      logger.performanceLog('Running performance test...');
      const perfStart = performance.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await this.testMathFunctions();
      }

      const perfDuration = performance.now() - perfStart;
      const opsPerSecond = (iterations / (perfDuration / 1000)).toFixed(0);

      logger.performanceLog('Performance test completed:', {
        iterations,
        totalTime: `${perfDuration.toFixed(2)}ms`,
        opsPerSecond: `${opsPerSecond} ops/sec`,
        avgTime: `${(perfDuration / iterations).toFixed(3)}ms per op`
      });

      return {
        success: true,
        mathTest: mathResults,
        simulationTest: {
          duration: simDuration,
          monthsSimulated: simResults.length,
          finalNetWorth: simResults.length > 0 ? simResults[simResults.length - 1].netWorth : 0
        },
        performanceTest: {
          iterations,
          totalTime: perfDuration,
          opsPerSecond: parseInt(opsPerSecond),
          avgTime: perfDuration / iterations
        }
      };

    } catch (error) {
      logger.error('WASM comprehensive test failed:', 'WASM', error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Run fallback Monte Carlo simulation
   */
  private async runFallbackMonteCarloSimulation(
    initialAccounts: AccountHoldingsMonthEnd,
    events: SimulationEvent[],
    config: AppConfig,
    monthsToRun: number,
    numberOfRuns: number
  ): Promise<SimulationResults> {
    try {
      const fallbackResult = await fallbackSimulationEngine.runMonteCarloSimulation(
        initialAccounts,
        events,
        config,
        monthsToRun,
        numberOfRuns
      );

      if (!fallbackResult.success) {
        throw new Error(fallbackResult.error || 'Fallback simulation failed');
      }

      return {
        success: true,
        numberOfRuns: fallbackResult.numberOfRuns,
        finalNetWorthP10: fallbackResult.finalNetWorthP10,
        finalNetWorthP25: fallbackResult.finalNetWorthP25,
        finalNetWorthP50: fallbackResult.finalNetWorthP50,
        finalNetWorthP75: fallbackResult.finalNetWorthP75,
        finalNetWorthP90: fallbackResult.finalNetWorthP90,
        probabilityOfSuccess: fallbackResult.probabilityOfSuccess
      };
    } catch (error) {
      logger.error('Fallback Monte Carlo simulation failed:', 'SIMULATION', error);
      throw new Error(`Both WASM and fallback simulations failed: ${error}`);
    }
  }

  /**
   * Run fallback single simulation
   */
  private async runFallbackSingleSimulation(
    initialAccounts: AccountHoldingsMonthEnd,
    events: SimulationEvent[],
    config: AppConfig,
    monthsToRun: number
  ): Promise<MonthlyData[]> {
    try {
      const fallbackResult = await fallbackSimulationEngine.runSingleSimulation(
        initialAccounts,
        events,
        config,
        monthsToRun
      );

      // Convert fallback format to WASM format
      return fallbackResult.map(fallbackData => ({
        ...fallbackData,
        // Ensure all required fields are present with defaults
        federalIncomeTaxAnnual: fallbackData.taxPaidAnnual ? fallbackData.taxPaidAnnual * 0.7 : undefined,
        stateIncomeTaxAnnual: fallbackData.taxPaidAnnual ? fallbackData.taxPaidAnnual * 0.2 : undefined,
        capitalGainsTaxShortTermAnnual: undefined,
        capitalGainsTaxLongTermAnnual: undefined,
        alternativeMinimumTaxAnnual: undefined,
        effectiveTaxRateAnnual: undefined,
        marginalTaxRateAnnual: undefined,
        adjustedGrossIncomeAnnual: undefined,
        taxableIncomeAnnual: undefined
      }));
    } catch (error) {
      logger.error('Fallback single simulation failed:', 'SIMULATION', error);
      throw new Error(`Both WASM and fallback simulations failed: ${error}`);
    }
  }

  /**
   * Force fallback mode (for testing or when WASM consistently fails)
   */
  forceFallbackMode(): void {
    this.useFallback = true;
    this.wasmFailed = true;
    
    showInfo(
      'Fallback Mode Enabled',
      'Simulation engine switched to JavaScript fallback',
      3000
    );
  }

  /**
   * Reset and retry WASM loading
   */
  async resetAndRetryWASM(): Promise<boolean> {
    this.wasmLoaded = false;
    this.wasmFailed = false;
    this.wasmModule = null;
    this.loadingPromise = null;
    this.loadAttempts = 0;
    this.useFallback = false;

    try {
      await this.loadWASM();
      return this.wasmLoaded;
    } catch (error) {
      logger.error('WASM retry failed:', 'WASM', error);
      return false;
    }
  }

  /**
   * Check if WASM is loaded and ready
   */
  isLoaded(): boolean {
    return this.wasmLoaded && this.wasmModule !== null;
  }

  /**
   * Check if using fallback mode
   */
  isUsingFallback(): boolean {
    return this.useFallback;
  }

  /**
   * Get status information about WASM engine
   */
  getStatus(): { loaded: boolean; available: boolean; error?: string } {
    return {
      loaded: this.wasmLoaded,
      available: this.wasmModule !== null,
      error: this.wasmLoaded ? undefined : 'WASM module not loaded'
    };
  }

  /**
   * Force reload the WASM module (useful for testing)
   */
  async forceReload(): Promise<void> {
    this.wasmLoaded = false;
    this.wasmModule = null;
    this.loadingPromise = null;
    await this.loadWASM();
  }

  /**
   * Get default stochastic configuration
   */
  private getDefaultStochasticConfig() {
    return {
      // Required simulation parameters
      simulationYears: 30, // Reduced for better performance
      monteCarloRuns: 25, // Significantly reduced for testing

      // Asset returns
      meanSpyReturn: 0.08,
      meanBondReturn: 0.04,
      meanIntlStockReturn: 0.07,
      meanInflation: 0.025,
      meanHomeValueAppreciation: 0.04,
      meanRentalIncomeGrowth: 0.03,

      // Volatilities
      volatilitySpy: 0.175,
      volatilityBond: 0.045,
      volatilityIntlStock: 0.20,
      volatilityInflation: 0.015,
      volatilityHomeValue: 0.10,
      volatilityRentalIncomeGrowth: 0.08,

      // GARCH parameters for SPY
      garchSpyOmega: 0.0001,
      garchSpyAlpha: 0.1,
      garchSpyBeta: 0.85,

      // GARCH parameters for Bonds
      garchBondOmega: 0.00005,
      garchBondAlpha: 0.05,
      garchBondBeta: 0.90,

      // GARCH parameters for International Stocks
      garchIntlStockOmega: 0.00015,
      garchIntlStockAlpha: 0.12,
      garchIntlStockBeta: 0.80,

      // GARCH parameters for Other assets
      garchOtherOmega: 0.0001,
      garchOtherAlpha: 0.12,
      garchOtherBeta: 0.86,

      // GARCH parameters for Individual Stock assets
      garchIndividualStockOmega: 0.00015,
      garchIndividualStockAlpha: 0.15,
      garchIndividualStockBeta: 0.82,

      // AR(1) parameters
      ar1InflationConstant: 0.005,
      ar1InflationPhi: 0.7,
      ar1HomeValueConstant: 0.01,
      ar1HomeValuePhi: 0.6,
      ar1RentalIncomeGrowthConstant: 0.008,
      ar1RentalIncomeGrowthPhi: 0.5,

      // Fat tail parameter
      fatTailParameter: 5.0,

      // Correlation matrix (6x6: SPY, BND, INFL, INTL, HOME, RENT)
      correlationMatrix: [
        [1.00, -0.15, 0.05, 0.75, 0.20, 0.30],
        [-0.15, 1.00, -0.25, -0.10, -0.05, 0.10],
        [0.05, -0.25, 1.00, 0.10, 0.40, 0.50],
        [0.75, -0.10, 0.10, 1.00, 0.25, 0.35],
        [0.20, -0.05, 0.40, 0.25, 1.00, 0.60],
        [0.30, 0.10, 0.50, 0.35, 0.60, 1.00]
      ],

      // Cost parameters
      costLeveragedEtf: 0.012,

      // Guardrails configuration
      guardrails: {
        upperGuardrail: 0.06,
        lowerGuardrail: 0.03,
        spendingCutPct: 0.1,
        spendingBonusPct: 0.05,
      },
    };
  }
}

// Create singleton instance
export const wasmSimulationEngine = new WASMSimulationEngine();

// Export types for use in other modules
export type {
  SimulationInput,
  SimulationResult,
  SimulationResults,
  MonthlyData,
};
