/**
 * SimulationRunner - Pure Function Contract for PFOS-E
 *
 * This module defines the interface for running simulations as pure functions.
 * The simulation engine is treated as a remote, versioned service boundary,
 * even when run locally via WASM.
 *
 * PFOS-E Architecture:
 * - TestHarness is UI-only
 * - packetBuildService remains the single simulation entrypoint for chat/packet flow
 * - This runner provides the pure function interface for both
 *
 * Key Principles:
 * - No Date.now() or time-based values - fully deterministic
 * - Same seed = identical output
 * - Blocked outputs are propagated, never hidden
 */

import {
  WasmInitialAccounts,
  WasmStochasticConfig,
  WasmMonteCarloResults,
  WasmDeterministicResults,
} from './wasmBridge';

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * RunSimulationRequest - Pure function input matching WASM engine shape
 *
 * No app-level convenience fields - those belong in packetBuildService.
 * This matches what the WASM engine actually receives.
 */
export interface RunSimulationRequest {
  /** Random seed for reproducibility (required, must be > 0) */
  seed: number;

  /** Number of months to simulate */
  monthsToRun: number;

  /** Initial state for simulation */
  initialState: {
    currentAge: number;
    startYear: number;
    initialCash: number;
    initialAccounts: WasmInitialAccounts;
  };

  /** Events to process during simulation */
  events: SimulationEvent[];

  /** Stochastic configuration */
  config: WasmStochasticConfig;

  /** Number of Monte Carlo paths (optional, defaults to 1) */
  mcPaths?: number;
}

/**
 * SimulationEvent - Event shape for simulation engine
 */
export interface SimulationEvent {
  id: string;
  type: string;
  monthOffset: number;
  amount?: number;
  frequency?: string;
  metadata?: Record<string, unknown>;
}

/**
 * BlockedOutput - An output that could not be computed
 */
export interface BlockedOutput {
  outputName: string;
  reason: string;
  unlockPath: string[];
}

/**
 * RunSimulationResponse - Pure function output
 */
export interface RunSimulationResponse {
  /** Whether simulation completed successfully */
  success: boolean;

  /** Error message if simulation failed */
  error?: string;

  /** Monte Carlo results (for stochastic mode) */
  mc?: WasmMonteCarloResults;

  /** Deterministic results (for single-path or trace fetch) */
  deterministic?: WasmDeterministicResults;

  /** Outputs that could not be computed (PFOS-E: always visible) */
  blockedOutputs: BlockedOutput[];

  /** Engine metadata for audit */
  engineMeta: {
    version: string;
    schemaVersion: string;
    inputsHash: string;
  };
}

// =============================================================================
// SIMULATION RUNNER INTERFACE
// =============================================================================

/**
 * SimulationRunner - Pure function interface for running simulations
 *
 * Implementations:
 * - LocalWasmRunner: Runs via local WASM (current)
 * - RemoteWorkerRunner: Runs via Cloudflare Worker (future)
 */
export interface SimulationRunner {
  /**
   * Run Monte Carlo simulation
   */
  runMonteCarlo(req: RunSimulationRequest): Promise<RunSimulationResponse>;

  /**
   * Run deterministic (single-path) simulation
   * Used for exemplar path traces and "show the math" functionality
   */
  runDeterministic(req: RunSimulationRequest): Promise<RunSimulationResponse>;

  /**
   * Check if runner is ready (WASM loaded, worker connected, etc.)
   */
  isReady(): Promise<boolean>;
}

// =============================================================================
// LOCAL WASM IMPLEMENTATION
// =============================================================================

import { wasmBridge } from './wasmBridge';

/**
 * LocalWasmRunner - Implementation using local WASM engine
 */
export class LocalWasmRunner implements SimulationRunner {
  private engineVersion = 'PFOS-E v1.0';
  private schemaVersion = 'v0';

  async isReady(): Promise<boolean> {
    try {
      await wasmBridge.ensureReady();
      return true;
    } catch {
      return false;
    }
  }

  async runMonteCarlo(req: RunSimulationRequest): Promise<RunSimulationResponse> {
    // Validate determinism requirements
    if (!req.seed || req.seed <= 0) {
      return {
        success: false,
        error: 'PFOS-E: seed is required and must be > 0',
        blockedOutputs: [],
        engineMeta: this.createEngineMeta(req, ''),
      };
    }

    try {
      await wasmBridge.ensureReady();

      // Run via wasmBridge
      const result = await wasmBridge.runSimulationWithUIPayload(
        {
          currentAge: req.initialState.currentAge,
          startYear: req.initialState.startYear,
          initialCash: req.initialState.initialCash,
          initialAccounts: req.initialState.initialAccounts,
        },
        req.events,
        {
          currentAge: req.initialState.currentAge,
          simulationEndAge: req.initialState.currentAge + Math.ceil(req.monthsToRun / 12),
          withdrawalStrategy: 'TAX_EFFICIENT',
          stochasticConfig: req.config,
        },
        req.mcPaths ?? 1
      );

      // Extract MC results from UI payload structure
      const portfolioStats = result?.planProjection?.summary?.portfolioStats || {};

      const mcResults: WasmMonteCarloResults = {
        success: true,
        numberOfRuns: req.mcPaths ?? 1,
        baseSeed: req.seed,
        finalNetWorthP5: portfolioStats.p5FinalValue,
        finalNetWorthP10: portfolioStats.p10FinalValue,
        finalNetWorthP50: portfolioStats.p50FinalValue,
        finalNetWorthP90: portfolioStats.p90FinalValue,
        finalNetWorthP95: portfolioStats.p95FinalValue,
        probabilityOfSuccess: portfolioStats.successRate,
        probabilityOfBankruptcy: 1 - (portfolioStats.successRate ?? 1),
        minCashP5: portfolioStats.minCashP5,
        minCashP50: portfolioStats.minCashP50,
        minCashP95: portfolioStats.minCashP95,
        everBreachProbability: portfolioStats.everBreachProbability,
        breachedPathCount: portfolioStats.breachedPathCount,
        exemplarPath: portfolioStats.exemplarPath,
      };

      const inputsHash = this.computeInputsHash(req);

      return {
        success: true,
        mc: mcResults,
        blockedOutputs: [],
        engineMeta: this.createEngineMeta(req, inputsHash),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        blockedOutputs: [],
        engineMeta: this.createEngineMeta(req, ''),
      };
    }
  }

  async runDeterministic(req: RunSimulationRequest): Promise<RunSimulationResponse> {
    // Validate determinism requirements
    if (!req.seed || req.seed <= 0) {
      return {
        success: false,
        error: 'PFOS-E: seed is required and must be > 0',
        blockedOutputs: [],
        engineMeta: this.createEngineMeta(req, ''),
      };
    }

    try {
      await wasmBridge.ensureReady();

      // Build initial state for WASM
      const initialState = {
        currentAge: req.initialState.currentAge,
        startYear: req.initialState.startYear,
        initialCash: req.initialState.initialCash,
        initialAccounts: req.initialState.initialAccounts,
      };

      // Build config for deterministic mode
      const config = {
        currentAge: req.initialState.currentAge,
        simulationEndAge: req.initialState.currentAge + Math.ceil(req.monthsToRun / 12),
        withdrawalStrategy: 'TAX_EFFICIENT',
        stochasticConfig: {
          ...req.config,
          simulationMode: 'deterministic' as const,
        },
      };

      const result = await wasmBridge.runDeterministicSimulation(
        initialState,
        req.events,
        config,
        { mode: 'deterministic', seed: req.seed }
      );

      const inputsHash = this.computeInputsHash(req);

      return {
        success: result.success,
        error: result.error,
        deterministic: result,
        blockedOutputs: [],
        engineMeta: this.createEngineMeta(req, inputsHash),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        blockedOutputs: [],
        engineMeta: this.createEngineMeta(req, ''),
      };
    }
  }

  private createEngineMeta(req: RunSimulationRequest, inputsHash: string) {
    return {
      version: this.engineVersion,
      schemaVersion: this.schemaVersion,
      inputsHash: inputsHash || `pfos-pending-${req.seed}`,
    };
  }

  private computeInputsHash(req: RunSimulationRequest): string {
    // Simple deterministic hash based on key inputs
    const hashInput = JSON.stringify({
      seed: req.seed,
      monthsToRun: req.monthsToRun,
      currentAge: req.initialState.currentAge,
      startYear: req.initialState.startYear,
      eventCount: req.events.length,
      mcPaths: req.mcPaths,
    });

    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return `pfos-${Math.abs(hash).toString(16)}-${req.seed}`;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/** Default simulation runner using local WASM */
export const simulationRunner = new LocalWasmRunner();
