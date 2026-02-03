/**
 * wasmBridge.ts - Canonical WASM ↔ UI Translation Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CANONICAL WASM BOUNDARY - READ THIS BEFORE EDITING
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RULES (enforced by ESLint + CI):
 * 1. NO code outside this file may call window.wasm* functions
 * 2. NO UI component may JSON.stringify() WASM payloads
 * 3. ALL Go ↔ TS shape conversions live here
 *
 * ALLOWED in this file:
 * ✅ Normalize accounts (various formats → WasmAccount)
 * ✅ Coerce types (dates, enums, money formats)
 * ✅ Shape results (WASM output → typed result)
 * ✅ Handle WASM exit/retry
 *
 * FORBIDDEN in this file:
 * ❌ NO derived metrics or calculations
 * ❌ NO UI-specific transformations
 * ❌ NO "helpful defaults" beyond determinism requirements
 * ❌ NO business logic whatsoever
 *
 * See: docs/WASM_BRIDGE_MIGRATION.md for full architecture
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   import { wasmBridge } from '@/services/wasmBridge';
 *   const result = await wasmBridge.runDeterministicSimulation(input);
 */

import { logger } from '@/utils/logger';
import { loadMainThreadWASM, resetWASM } from './wasmMainThreadLoader';
import { DEFAULT_STOCHASTIC_CONFIG } from '@/config/appConfig';

// =============================================================================
// TYPE DEFINITIONS - Canonical shapes for WASM boundary
// =============================================================================

/** WASM-compatible Account structure */
export interface WasmAccount {
  totalValue: number;
  holdings: WasmHolding[];
}

/** WASM-compatible Holding structure */
export interface WasmHolding {
  symbol?: string;
  assetClass: string;
  currentMarketValueTotal: number;
  costBasis?: number;
}

/** WASM-compatible initial accounts */
export interface WasmInitialAccounts {
  cash: number;
  taxable: WasmAccount;
  tax_deferred: WasmAccount;
  roth: WasmAccount;
  five29?: WasmAccount;
}

/** WASM-compatible stochastic config */
export interface WasmStochasticConfig {
  simulationMode: 'deterministic' | 'stochastic';
  randomSeed: number;
  cashFloor: number;
  stockReturnMean?: number;
  stockReturnStd?: number;
  bondReturnMean?: number;
  bondReturnStd?: number;
  inflationMean?: number;
  inflationStd?: number;
  // GARCH parameters
  garchAlpha?: number;
  garchBeta?: number;
  garchOmega?: number;
  longRunVariance?: number;
  regimeSwitchingEnabled?: boolean;
}

/** Canonical WASM simulation input */
export interface WasmSimulationInput {
  initialAccounts: WasmInitialAccounts;
  events: any[]; // FinancialEvent[] - kept as any for flexibility
  config: WasmStochasticConfig;
  monthsToRun: number;
  initialAge: number;
  startYear: number;
  withdrawalStrategy: string;
  goals?: any[];
}

/** Monte Carlo results from WASM */
export interface WasmMonteCarloResults {
  success: boolean;
  error?: string;
  numberOfRuns: number;
  baseSeed?: number;
  finalNetWorthP5?: number;
  finalNetWorthP10?: number;
  finalNetWorthP50?: number;
  finalNetWorthP90?: number;
  finalNetWorthP95?: number;
  minCashP5?: number;
  minCashP50?: number;
  minCashP95?: number;
  everBreachProbability?: number;
  probabilityOfBankruptcy?: number;
  probabilityOfSuccess?: number;
  breachedPathCount?: number;
  runwayP5?: number;
  runwayP50?: number;
  runwayP95?: number;
  exemplarPath?: {
    pathIndex: number;
    pathSeed: number;
    terminalWealth: number;
  };
}

/** Deterministic results from WASM */
export interface WasmDeterministicResults {
  success: boolean;
  error?: string;
  yearlyData: any[];
  monthlySnapshots: any[];
  eventTrace: any[];
  finalNetWorth: number;
  isBankrupt: boolean;
  simulationMode: string;
  seed: number;
  assumptions?: any;
  comprehensiveMonthlyStates?: any[];
  modelDescription?: string;
  realizedPathVariables?: any;
}

// =============================================================================
// INPUT NORMALIZERS - Convert UI shapes to WASM shapes
// =============================================================================

/**
 * Convert various holdings formats to WASM-compatible Account object.
 * Handles: number, Holding[], Account, undefined/null
 */
export function normalizeToWasmAccount(holdings: any): WasmAccount {
  // Empty/missing
  if (!holdings || (Array.isArray(holdings) && holdings.length === 0)) {
    return { totalValue: 0, holdings: [] };
  }

  // Simple number (e.g., taxable: 500000 from InitialStateForm)
  if (typeof holdings === 'number') {
    return { totalValue: holdings, holdings: [] };
  }

  // Already Account-shaped
  if (holdings.totalValue !== undefined || holdings.holdings !== undefined) {
    return {
      totalValue: holdings.totalValue ?? 0,
      holdings: holdings.holdings ?? [],
    };
  }

  // Holding[] array - sum up totalValue
  if (Array.isArray(holdings)) {
    const totalValue = holdings.reduce(
      (sum: number, h: any) => sum + (h.currentMarketValueTotal || h.value || 0),
      0
    );
    return { totalValue, holdings };
  }

  // Unknown format - log warning and return empty
  logger.warn('Unknown holdings format in normalizeToWasmAccount', 'WASM_BRIDGE', { holdings });
  return { totalValue: 0, holdings: [] };
}

/**
 * Normalize initial accounts from various UI formats to WASM format.
 */
export function normalizeInitialAccounts(initialState: any): WasmInitialAccounts {
  const accounts = initialState.initialAccounts || {};

  return {
    cash: initialState.initialCash ?? accounts.cash ?? 0,
    taxable: normalizeToWasmAccount(accounts.taxable),
    tax_deferred: normalizeToWasmAccount(accounts.tax_deferred ?? accounts.taxDeferred),
    roth: normalizeToWasmAccount(accounts.roth),
    five29: accounts.five29 ? normalizeToWasmAccount(accounts.five29) : undefined,
  };
}

/**
 * Normalize stochastic config with defaults.
 *
 * PFOS-E CRITICAL: randomSeed MUST be non-zero for stochastic mode.
 * Go will reject MC simulation with seed=0.
 */
export function normalizeStochasticConfig(
  config: any,
  mode: 'deterministic' | 'stochastic' = 'deterministic',
  seed?: number
): WasmStochasticConfig {
  const base = config?.stochasticConfig || config || DEFAULT_STOCHASTIC_CONFIG;

  // Determine the seed: explicit param > base config > generate new
  let effectiveSeed = seed ?? base.randomSeed ?? 0;

  // PFOS-E CRITICAL: For stochastic mode, seed MUST be non-zero
  if (mode === 'stochastic' && effectiveSeed === 0) {
    effectiveSeed = Math.floor(Math.random() * 2147483646) + 1;
    logger.warn('Generated random seed for stochastic mode (was 0)', 'WASM_BRIDGE', {
      newSeed: effectiveSeed,
    });
  }

  return {
    simulationMode: mode,
    randomSeed: effectiveSeed,
    cashFloor: base.cashFloor ?? 0,
    stockReturnMean: base.stockReturnMean,
    stockReturnStd: base.stockReturnStd,
    bondReturnMean: base.bondReturnMean,
    bondReturnStd: base.bondReturnStd,
    inflationMean: base.inflationMean,
    inflationStd: base.inflationStd,
    garchAlpha: base.garchAlpha,
    garchBeta: base.garchBeta,
    garchOmega: base.garchOmega,
    longRunVariance: base.longRunVariance,
    regimeSwitchingEnabled: base.regimeSwitchingEnabled,
  };
}

/**
 * Filter events for WASM - remove UI-only event types.
 */
export function normalizeEventsForWasm(events: any[]): any[] {
  const excludedTypes = ['INITIAL_STATE', 'GOAL_DEFINE'];
  return events.filter((e) => !excludedTypes.includes(e.type));
}

/**
 * Build complete WASM simulation input from UI state.
 */
export function buildWasmInput(
  initialState: any,
  events: any[],
  config: any,
  options: {
    mode?: 'deterministic' | 'stochastic';
    seed?: number;
    monthsToRun?: number;
  } = {}
): WasmSimulationInput {
  const currentAge = initialState.currentAge || config.currentAge || 35;
  const simulationEndAge = config.simulationEndAge ?? 95;
  const monthsToRun = options.monthsToRun ?? (simulationEndAge - currentAge) * 12;

  return {
    initialAccounts: normalizeInitialAccounts(initialState),
    events: normalizeEventsForWasm(events),
    config: normalizeStochasticConfig(config, options.mode, options.seed),
    monthsToRun,
    initialAge: currentAge,
    startYear: initialState.startYear || new Date().getFullYear(),
    withdrawalStrategy: config.withdrawalStrategy || 'TAX_EFFICIENT',
    goals: config.goals,
  };
}

// =============================================================================
// OUTPUT NORMALIZERS - Convert WASM results to UI-friendly format
// =============================================================================

/**
 * Normalize WASM output - handle both PascalCase and camelCase,
 * break proxy references, parse JSON strings.
 */
export function normalizeWasmResult<T>(result: any): T {
  // Parse JSON string if needed
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch (e) {
      logger.error('Failed to parse WASM JSON result', 'WASM_BRIDGE', e);
      throw new Error(`Invalid WASM JSON response: ${e}`);
    }
  }

  // Break proxy references (WASM results can have JS proxy objects)
  try {
    result = JSON.parse(JSON.stringify(result));
  } catch (e) {
    logger.warn('Failed to break proxy references', 'WASM_BRIDGE', e);
  }

  return result as T;
}

// =============================================================================
// WASM FUNCTION REGISTRY - All available WASM functions
// =============================================================================

type WasmFunctionName =
  | 'runDeterministicSimulation'
  | 'runMonteCarloSimulation'
  | 'runSimulationWithUIPayload'
  | 'runSingleSimulation'
  | 'loadConfigurationData'
  | 'checkConfigState'
  | 'goPreviewFireTarget'
  | 'goCalculateQuickstartGoalAnalysis'
  | 'goCalculateGoalFormSuggestions'
  | 'goGenerateQuickstartPlan'
  | 'goInitializeStochasticState'
  | 'goGenerateStochasticReturns'
  | 'setSimulationVerbosity';

/**
 * Check if a WASM function is available.
 */
function isWasmFunctionAvailable(name: WasmFunctionName): boolean {
  return typeof window !== 'undefined' && typeof (window as any)[name] === 'function';
}

/**
 * Get WASM function with type assertion.
 */
function getWasmFunction(name: WasmFunctionName): Function | null {
  if (!isWasmFunctionAvailable(name)) {
    return null;
  }
  return (window as any)[name];
}

// =============================================================================
// WASM BRIDGE - Main interface
// =============================================================================

class WasmBridge {
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;

  /**
   * Ensure WASM is loaded and ready.
   */
  async ensureReady(): Promise<boolean> {
    if (this.initialized) return true;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const loaded = await loadMainThreadWASM();
        this.initialized = loaded;
        return loaded;
      } catch (e) {
        logger.error('Failed to initialize WASM', 'WASM_BRIDGE', e);
        this.initPromise = null;
        return false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Handle WASM program exit and retry.
   */
  private async handleWasmExitAndRetry<T>(
    fn: () => T,
    fnName: string
  ): Promise<T> {
    try {
      return fn();
    } catch (e: any) {
      if (e?.message?.includes('Go program has already exited')) {
        logger.warn(`WASM program exited during ${fnName}, reloading...`, 'WASM_BRIDGE');
        resetWASM();
        this.initialized = false;
        this.initPromise = null;

        const reloaded = await this.ensureReady();
        if (!reloaded) {
          throw new Error(`Failed to reload WASM after exit in ${fnName}`);
        }

        return fn();
      }
      throw e;
    }
  }

  // ===========================================================================
  // PUBLIC API - Type-safe WASM function wrappers
  // ===========================================================================

  /**
   * Run deterministic simulation (single path, constant or seeded returns).
   */
  async runDeterministicSimulation(
    initialState: any,
    events: any[],
    config: any,
    options: { mode?: 'deterministic' | 'stochastic'; seed?: number } = {}
  ): Promise<WasmDeterministicResults> {
    await this.ensureReady();

    const fn = getWasmFunction('runDeterministicSimulation');
    if (!fn) {
      throw new Error('runDeterministicSimulation WASM function not available');
    }

    const wasmInput = buildWasmInput(initialState, events, config, options);

    logger.info('Running deterministic simulation', 'WASM_BRIDGE', {
      eventsCount: wasmInput.events.length,
      monthsToRun: wasmInput.monthsToRun,
      mode: wasmInput.config.simulationMode,
      seed: wasmInput.config.randomSeed,
    });

    const result = await this.handleWasmExitAndRetry(
      () => fn(wasmInput),
      'runDeterministicSimulation'
    );

    const normalized = normalizeWasmResult<WasmDeterministicResults>(result);

    if (!normalized.success && normalized.error) {
      throw new Error(`Deterministic simulation failed: ${normalized.error}`);
    }

    return normalized;
  }

  /**
   * Run Monte Carlo simulation (N stochastic paths).
   */
  async runMonteCarloSimulation(
    initialState: any,
    events: any[],
    config: any,
    numberOfPaths: number,
    options: { seed?: number } = {}
  ): Promise<WasmMonteCarloResults> {
    await this.ensureReady();

    const fn = getWasmFunction('runMonteCarloSimulation');
    if (!fn) {
      throw new Error('runMonteCarloSimulation WASM function not available');
    }

    // MC always uses stochastic mode
    const seed = options.seed ?? Math.floor(Date.now() / 1000);
    const wasmInput = buildWasmInput(initialState, events, config, {
      mode: 'stochastic',
      seed,
    });

    logger.info('Running Monte Carlo simulation', 'WASM_BRIDGE', {
      numberOfPaths,
      seed,
      eventsCount: wasmInput.events.length,
      monthsToRun: wasmInput.monthsToRun,
    });

    // WASM MC function expects JSON string + numberOfRuns
    const inputJSON = JSON.stringify(wasmInput);

    // DEBUG: Log full JSON to identify issues
    console.log('[WASM DEBUG] MC Input JSON length:', inputJSON.length);
    console.log('[WASM DEBUG] MC wasmInput:', {
      monthsToRun: wasmInput.monthsToRun,
      initialAge: wasmInput.initialAge,
      config: wasmInput.config,
      eventsCount: wasmInput.events.length,
      events: wasmInput.events,
    });

    const result = await this.handleWasmExitAndRetry(
      () => fn(inputJSON, numberOfPaths),
      'runMonteCarloSimulation'
    );

    const normalized = normalizeWasmResult<WasmMonteCarloResults>(result);

    if (!normalized.success && normalized.error) {
      throw new Error(`Monte Carlo simulation failed: ${normalized.error}`);
    }

    return normalized;
  }

  /**
   * Run full simulation with UI payload (charts, analysis, etc.).
   */
  async runSimulationWithUIPayload(
    initialState: any,
    events: any[],
    config: any,
    numberOfRuns: number,
    options: { goals?: any[] } = {}
  ): Promise<any> {
    await this.ensureReady();

    const fn = getWasmFunction('runSimulationWithUIPayload');
    if (!fn) {
      throw new Error('runSimulationWithUIPayload WASM function not available');
    }

    // Extract seed from config.stochasticConfig if available
    const seedFromConfig = config?.stochasticConfig?.randomSeed;

    const wasmInput = {
      ...buildWasmInput(initialState, events, config, {
        mode: 'stochastic',
        seed: seedFromConfig, // Pass seed explicitly to ensure it's not lost
      }),
      goals: options.goals || [],
    };

    logger.info('Running simulation with UI payload', 'WASM_BRIDGE', {
      numberOfRuns,
      eventsCount: wasmInput.events.length,
      monthsToRun: wasmInput.monthsToRun,
      seed: wasmInput.config?.randomSeed,
    });

    // CRITICAL: Must stringify in TypeScript before passing to Go WASM.
    // Go's js.Global().Get("JSON").Call("stringify", ...) doesn't properly
    // preserve nested object values when called on JS proxy objects.
    // This matches the pattern used in runMonteCarloSimulation().
    const inputJSON = JSON.stringify(wasmInput);

    console.log('[WASM_BRIDGE DEBUG] inputJSON seed check:',
      JSON.parse(inputJSON).config?.randomSeed);

    const result = await this.handleWasmExitAndRetry(
      () => fn(inputJSON, numberOfRuns),
      'runSimulationWithUIPayload'
    );

    return normalizeWasmResult<any>(result);
  }

  /**
   * Preview FIRE target calculation.
   */
  async previewFireTarget(input: any): Promise<any> {
    await this.ensureReady();

    const fn = getWasmFunction('goPreviewFireTarget');
    if (!fn) {
      throw new Error('goPreviewFireTarget WASM function not available');
    }

    const result = fn(JSON.stringify(input));
    return normalizeWasmResult<any>(result);
  }

  /**
   * Calculate quickstart goal analysis.
   */
  async calculateQuickstartGoalAnalysis(input: any): Promise<any> {
    await this.ensureReady();

    const fn = getWasmFunction('goCalculateQuickstartGoalAnalysis');
    if (!fn) {
      throw new Error('goCalculateQuickstartGoalAnalysis WASM function not available');
    }

    const result = fn(JSON.stringify(input));
    return normalizeWasmResult<any>(result);
  }

  /**
   * Calculate goal form suggestions.
   */
  async calculateGoalFormSuggestions(input: any): Promise<any> {
    await this.ensureReady();

    const fn = getWasmFunction('goCalculateGoalFormSuggestions');
    if (!fn) {
      throw new Error('goCalculateGoalFormSuggestions WASM function not available');
    }

    const result = fn(JSON.stringify(input));
    return normalizeWasmResult<any>(result);
  }

  /**
   * Generate quickstart plan from user inputs.
   */
  async generateQuickstartPlan(inputs: any): Promise<any> {
    await this.ensureReady();

    const fn = getWasmFunction('goGenerateQuickstartPlan');
    if (!fn) {
      throw new Error('goGenerateQuickstartPlan WASM function not available');
    }

    logger.info('Generating quickstart plan via bridge', 'WASM_BRIDGE', {
      hasInputs: !!inputs,
    });

    const result = await this.handleWasmExitAndRetry(
      () => fn(JSON.stringify(inputs)),
      'goGenerateQuickstartPlan'
    );

    return normalizeWasmResult<any>(result);
  }

  /**
   * Initialize stochastic state for path generation.
   */
  async initializeStochasticState(config: any): Promise<any> {
    await this.ensureReady();

    const fn = getWasmFunction('goInitializeStochasticState');
    if (!fn) {
      throw new Error('goInitializeStochasticState WASM function not available');
    }

    return fn(JSON.stringify(config));
  }

  /**
   * Generate stochastic returns for a single time step.
   */
  async generateStochasticReturns(state: any, config: any): Promise<any> {
    await this.ensureReady();

    const fn = getWasmFunction('goGenerateStochasticReturns');
    if (!fn) {
      throw new Error('goGenerateStochasticReturns WASM function not available');
    }

    const result = fn(JSON.stringify(state), JSON.stringify(config));
    return normalizeWasmResult<any>(result);
  }

  /**
   * Set simulation verbosity level (0-3).
   */
  setSimulationVerbosity(level: number): boolean {
    const fn = getWasmFunction('setSimulationVerbosity');
    if (!fn) {
      logger.warn('setSimulationVerbosity not available', 'WASM_BRIDGE');
      return false;
    }

    try {
      fn(level);
      return true;
    } catch (e) {
      logger.error('Failed to set simulation verbosity', 'WASM_BRIDGE', e);
      return false;
    }
  }

  /**
   * Check if WASM configuration is loaded.
   */
  checkConfigState(): { loaded: boolean; [key: string]: any } | null {
    const fn = getWasmFunction('checkConfigState');
    if (!fn) return null;

    try {
      return fn();
    } catch {
      return null;
    }
  }

  /**
   * Check if bridge is ready.
   */
  isReady(): boolean {
    return this.initialized && isWasmFunctionAvailable('runDeterministicSimulation');
  }

  /**
   * Get list of available WASM functions.
   */
  getAvailableFunctions(): WasmFunctionName[] {
    const allFunctions: WasmFunctionName[] = [
      'runDeterministicSimulation',
      'runMonteCarloSimulation',
      'runSimulationWithUIPayload',
      'runSingleSimulation',
      'loadConfigurationData',
      'checkConfigState',
      'goPreviewFireTarget',
      'goCalculateQuickstartGoalAnalysis',
      'goCalculateGoalFormSuggestions',
      'goGenerateQuickstartPlan',
      'goInitializeStochasticState',
      'goGenerateStochasticReturns',
      'setSimulationVerbosity',
    ];

    return allFunctions.filter(isWasmFunctionAvailable);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const wasmBridge = new WasmBridge();

// =============================================================================
// COMPILE-TIME ENTRYPOINT COVERAGE CHECK
// =============================================================================
// If Go adds a new WASM function, this will fail to compile until the bridge
// is updated to handle it. This prevents half-migrations.

type WasmEntrypoint =
  | 'runDeterministicSimulation'
  | 'runMonteCarloSimulation'
  | 'runSimulationWithUIPayload'
  | 'goPreviewFireTarget'
  | 'goCalculateQuickstartGoalAnalysis'
  | 'goCalculateGoalFormSuggestions'
  | 'goGenerateQuickstartPlan'
  | 'goInitializeStochasticState'
  | 'goGenerateStochasticReturns'
  | 'setSimulationVerbosity'
  | 'checkConfigState';

// This object must have all entrypoints - TypeScript will error if any are missing
const _entrypointCoverage: Record<WasmEntrypoint, boolean> = {
  runDeterministicSimulation: true,
  runMonteCarloSimulation: true,
  runSimulationWithUIPayload: true,
  goPreviewFireTarget: true,
  goCalculateQuickstartGoalAnalysis: true,
  goCalculateGoalFormSuggestions: true,
  goGenerateQuickstartPlan: true,
  goInitializeStochasticState: true,
  goGenerateStochasticReturns: true,
  setSimulationVerbosity: true,
  checkConfigState: true,
};

// Suppress unused variable warning - this is intentional compile-time check
void _entrypointCoverage;
