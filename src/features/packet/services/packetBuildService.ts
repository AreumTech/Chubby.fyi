/**
 * Packet Build Service
 *
 * Bridges the chat UI's PacketBuildRequest to the existing simulation orchestrator.
 * Transforms confirmed changes into simulation inputs and results into packets.
 *
 * PFOS-E Phase 1: Now wired to real WASM simulation engine via wasmBridge.
 * Uses wasmBridge.runMonteCarloSimulation() for MC paths.
 *
 * TODO Phase B (Workers Deployment): Refactor to use SimulationRunner interface.
 * Currently calls wasmBridge directly for simplicity. The SimulationRunner interface
 * exists in src/services/simulationRunner.ts but is not wired up yet. When deploying
 * to Cloudflare Workers, swap LocalWasmRunner for RemoteWorkerRunner to target
 * the Workers endpoint instead of local WASM.
 */

import {
  PacketBuildRequest,
  SimulationPacketV0,
  DataTier,
  generatePacketId,
  ScenarioResults,
  BlockedOutput,
} from '@/features/packet/types/packetSchema';
import { ConfirmedChange } from '@/features/chat/types/draftChangeSchema';
import { MonteCarloResults } from '@/types/api/payload';
import { logger } from '@/utils/logger';
import { wasmBridge } from '@/services/wasmBridge';

// =============================================================================
// TYPES
// =============================================================================

export interface PacketBuildResult {
  success: boolean;
  packet?: SimulationPacketV0;
  error?: string;
}

export interface SimulationResult {
  success: boolean;
  mcResults?: MonteCarloResults;
  engineInputsHash?: string;
  blockedOutputs?: Array<{
    outputName: string;
    reason: string;
    unlockPath: string[];
  }>;
  error?: string;
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Build a simulation packet from a request
 *
 * This is an alternative entry point that builds the full packet.
 * Prefer using runSimulation() + store.createPacket() for better separation.
 *
 * PFOS-E Phase 1: Now wired to real WASM simulation engine.
 */
export async function buildPacket(
  request: PacketBuildRequest,
  packetSequence: number
): Promise<PacketBuildResult> {
  try {
    logger.info('[PacketBuildService] Building packet...', {
      dataTier: request.dataTier,
      confirmedChanges: request.confirmedChanges.length,
      scenarios: request.scenarios.length,
      seed: request.seed,
    });

    // Generate packet ID
    const packetId = generatePacketId(packetSequence);

    // Run simulation to get results
    const simulationResult = await runSimulation(request);

    if (!simulationResult.success || !simulationResult.mcResults) {
      return {
        success: false,
        error: simulationResult.error || 'Simulation failed to produce results',
      };
    }

    // Transform to packet
    const packet = transformToPacket(
      packetId,
      request,
      simulationResult.mcResults,
      simulationResult.blockedOutputs
    );

    logger.info('[PacketBuildService] Packet built successfully', {
      packetId,
      seed: packet.seed,
      baseSeed: packet.mcResults?.baseSeed,
    });

    return {
      success: true,
      packet,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[PacketBuildService] Failed to build packet:', error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Run simulation and return results without creating a packet
 *
 * This is the preferred entry point for SimulationTrigger.
 * The store's createPacket handles packet ID generation and storage.
 *
 * PFOS-E Phase 1: Wired to real WASM simulation engine via wasmBridge.
 */
export async function runSimulation(
  request: PacketBuildRequest
): Promise<SimulationResult> {
  try {
    // PFOS-E: Validate required fields for determinism
    if (!request.seed || request.seed <= 0) {
      throw new Error('PFOS-E: seed is required and must be > 0 for deterministic simulation');
    }
    if (!request.startYear || request.startYear < 1900) {
      throw new Error('PFOS-E: startYear is required for deterministic simulation');
    }

    logger.info('[PacketBuildService] Running simulation...', {
      dataTier: request.dataTier,
      confirmedChanges: request.confirmedChanges.length,
      scenarios: request.scenarios.length,
      seed: request.seed,
    });

    // Transform confirmed changes into simulation inputs
    const { initialState, events, config } = transformChangesToSimulationInputs(
      request.confirmedChanges,
      request.dataTier,
      request.horizon,
      request.seed,
      request.startYear
    );

    // Run actual simulation via wasmBridge
    // IMPORTANT: Keep paths VERY low to avoid freezing main thread
    // TODO: Migrate to wasmWorkerPool for parallel execution
    const numberOfPaths = request.mcPaths ?? 1;

    // Ensure WASM is ready
    await wasmBridge.ensureReady();

    logger.info('[PacketBuildService] Starting simulation', {
      paths: numberOfPaths,
      seed: request.seed,
    });

    // Use runSimulationWithUIPayload which applies default config values
    // runMonteCarloSimulation doesn't apply defaults and can freeze with empty config
    const uiResult = await wasmBridge.runSimulationWithUIPayload(
      initialState,
      events,
      config,
      numberOfPaths
    );

    // Extract MC results from UI payload
    // IMPORTANT: The UI payload structure uses "portfolioStats" with fields like:
    // - p5FinalValue, p10FinalValue, p50FinalValue, p75FinalValue, p90FinalValue, p95FinalValue
    // - successRate (not probabilityOfSuccess)
    // - minCashP5, minCashP50, minCashP95
    const portfolioStats = uiResult?.planProjection?.summary?.portfolioStats || {};
    const mcSummary = uiResult?.planProjection?.summary || {};

    const mcResult = {
      success: uiResult?.success ?? true,
      numberOfRuns: numberOfPaths,
      // Map portfolioStats field names (p5FinalValue, etc.) to our schema (finalNetWorthP5, etc.)
      finalNetWorthP5: portfolioStats.p5FinalValue ?? 0,
      finalNetWorthP10: portfolioStats.p10FinalValue ?? 0,
      finalNetWorthP50: portfolioStats.p50FinalValue ?? 0,
      finalNetWorthP75: portfolioStats.p75FinalValue ?? 0,
      finalNetWorthP90: portfolioStats.p90FinalValue ?? 0,
      finalNetWorthP95: portfolioStats.p95FinalValue ?? 0,
      probabilityOfSuccess: portfolioStats.successRate ?? 0,
      probabilityOfBankruptcy: 1 - (portfolioStats.successRate ?? 1),
      baseSeed: request.seed,
      // Additional fields from portfolioStats
      minCashP5: portfolioStats.minCashP5,
      minCashP50: portfolioStats.minCashP50,
      minCashP95: portfolioStats.minCashP95,
      // MC summary level fields
      breachedPathCount: mcSummary.breachedPathCount,
      everBreachProbability: mcSummary.everBreachProbability,
      runwayP5: mcSummary.runwayP5,
      runwayP50: mcSummary.runwayP50,
      runwayP95: mcSummary.runwayP95,
      exemplarPath: mcSummary.exemplarPath,
    };

    logger.info('[PacketBuildService] MC simulation complete', {
      success: mcResult.success,
      paths: mcResult.numberOfRuns,
    });

    // Map WASM results to MonteCarloResults format
    // PFOS-E: Only use actual values - no fake approximations
    const mcResults: MonteCarloResults = {
      success: mcResult.success,
      numberOfRuns: mcResult.numberOfRuns,
      finalNetWorthP5: mcResult.finalNetWorthP5,
      finalNetWorthP10: mcResult.finalNetWorthP10 ?? 0,
      finalNetWorthP25: portfolioStats.p25FinalValue, // undefined if not computed by engine
      finalNetWorthP50: mcResult.finalNetWorthP50 ?? 0,
      finalNetWorthP75: portfolioStats.p75FinalValue, // undefined if not computed by engine
      finalNetWorthP90: mcResult.finalNetWorthP90 ?? 0,
      finalNetWorthP95: mcResult.finalNetWorthP95,
      probabilityOfSuccess: mcResult.probabilityOfSuccess ?? (1 - (mcResult.probabilityOfBankruptcy ?? 0)),
      probabilityOfBankruptcy: mcResult.probabilityOfBankruptcy ?? 0,
      bankruptcyCount: mcResult.breachedPathCount ?? 0,
      minCashP5: mcResult.minCashP5,
      minCashP50: mcResult.minCashP50,
      minCashP95: mcResult.minCashP95,
      runwayP5: mcResult.runwayP5,
      runwayP50: mcResult.runwayP50,
      runwayP95: mcResult.runwayP95,
      breachedPathCount: mcResult.breachedPathCount,
      everBreachProbability: mcResult.everBreachProbability,
      baseSeed: mcResult.baseSeed ?? request.seed,
      exemplarPath: mcResult.exemplarPath ? {
        pathIndex: mcResult.exemplarPath.pathIndex,
        pathSeed: mcResult.exemplarPath.pathSeed,
        terminalWealth: mcResult.exemplarPath.terminalWealth,
        selectionCriterion: 'median_terminal_wealth',
      } : undefined,
    };

    // Generate blocked outputs based on data tier
    // These represent outputs that cannot be computed with Bronze tier
    const blockedOutputs = generateBlockedOutputs(request.dataTier);

    // Create engine inputs hash for replay verification
    const engineInputsHash = computeEngineInputsHash(request, request.seed);

    logger.info('[PacketBuildService] Simulation complete', {
      probabilityOfSuccess: mcResults.probabilityOfSuccess,
      finalNetWorthP50: mcResults.finalNetWorthP50,
      baseSeed: mcResults.baseSeed,
      exemplarPathSeed: mcResults.exemplarPath?.pathSeed,
    });

    return {
      success: true,
      mcResults,
      engineInputsHash,
      blockedOutputs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[PacketBuildService] Simulation failed:', error);
    return {
      success: false,
      error: message,
    };
  }
}

// =============================================================================
// TRANSFORMATION HELPERS
// =============================================================================

/**
 * Transform bronze-tier changes to simulation inputs
 *
 * Bronze tier expects:
 * - investableAssets → InitialStateEvent with account balances
 * - annualSpending → Recurring expense event
 * - expectedIncome → Income event (optional)
 * - currentAge → User's current age (optional, defaults to 35)
 */
function transformChangesToSimulationInputs(
  changes: ConfirmedChange[],
  dataTier: DataTier,
  horizon?: { startMonth: number; endMonth: number },
  seed?: number,
  startYear?: number
): { initialState: any; events: any[]; config: any } {
  // PFOS-E: Require seed and startYear for determinism
  if (!seed || seed <= 0) {
    throw new Error('PFOS-E: seed is required in transformChangesToSimulationInputs');
  }
  if (!startYear || startYear < 1900) {
    throw new Error('PFOS-E: startYear is required in transformChangesToSimulationInputs');
  }

  // Find bronze-tier values from confirmed changes
  // PFOS-E: Require these values - fail loudly if missing
  const investableAssets = findChangeValue(changes, 'investableAssets') as number | undefined;
  const annualSpending = findChangeValue(changes, 'annualSpending') as number | undefined;
  const expectedIncome = findChangeValue(changes, 'expectedIncome') as number || 0;
  const currentAge = findChangeValue(changes, 'currentAge') as number | undefined;

  if (investableAssets === undefined) {
    throw new Error('PFOS-E: investableAssets is required in confirmedChanges');
  }
  if (annualSpending === undefined) {
    throw new Error('PFOS-E: annualSpending is required in confirmedChanges');
  }
  if (currentAge === undefined) {
    throw new Error('PFOS-E: currentAge is required in confirmedChanges');
  }

  // Calculate simulation duration from horizon or default to 30 years
  const monthsToRun = horizon ? (horizon.endMonth - horizon.startMonth) : 360;
  const yearsToRun = Math.ceil(monthsToRun / 12);
  const simulationEndAge = currentAge + yearsToRun;

  // Cash allocation: 10% in cash, rest in taxable (simplified for Bronze tier)
  const cashAmount = investableAssets * 0.1;
  const taxableAmount = investableAssets * 0.9;

  // Create minimal initial state for bronze tier
  // Go requires Account struct with totalValue and holdings, not simple numbers
  const initialState = {
    currentAge,
    startYear, // PFOS-E: Use provided startYear (no Date.now())
    initialCash: cashAmount,
    initialAccounts: {
      cash: cashAmount,
      taxable: {
        totalValue: taxableAmount,
        holdings: [],
      },
      tax_deferred: {
        totalValue: 0,
        holdings: [],
      },
      roth: {
        totalValue: 0,
        holdings: [],
      },
    },
  };

  // Create events
  const events: any[] = [];

  // Annual spending as monthly recurring expense
  // IMPORTANT: Use RECURRING_EXPENSE type for Go engine to apply monthly
  // PFOS-E: Use deterministic event IDs based on seed (no Date.now())
  if (annualSpending > 0) {
    events.push({
      id: `expense-living-${seed}`,
      type: 'RECURRING_EXPENSE',
      monthOffset: 0,
      amount: annualSpending / 12,
      metadata: {
        name: 'Living Expenses',
        frequency: 'monthly',
        category: 'Living',
        essential: true,
      },
    });
  }

  // Add income if provided (recurring)
  // IMPORTANT: Use INCOME type with frequency: "monthly" for Go engine
  // PFOS-E: Use deterministic event IDs based on seed (no Date.now())
  if (expectedIncome > 0) {
    events.push({
      id: `income-expected-${seed}`,
      type: 'INCOME',
      monthOffset: 0,
      amount: expectedIncome / 12,
      frequency: 'monthly',
      metadata: {
        name: 'Expected Income',
      },
    });
  }

  // PFOS-E: seed is already validated at function entry
  // Config for bronze tier simulation
  const config = {
    currentAge,
    simulationEndAge,
    withdrawalStrategy: 'TAX_EFFICIENT',
    stochasticConfig: {
      simulationMode: 'stochastic' as const,
      randomSeed: seed,
      cashFloor: 0,
    },
  };

  logger.info('[PacketBuildService] Transformed inputs', {
    investableAssets,
    annualSpending,
    expectedIncome,
    currentAge,
    startYear,
    simulationEndAge,
    monthsToRun,
    eventCount: events.length,
    seed,
  });

  return { initialState, events, config };
}

/**
 * Find a value from confirmed changes by field path
 */
function findChangeValue(changes: ConfirmedChange[], fieldName: string): unknown {
  const change = changes.find(c => c.fieldPath.includes(fieldName));
  return change?.newValue;
}

/**
 * Transform simulation results into a SimulationPacketV0
 */
function transformToPacket(
  packetId: string,
  request: PacketBuildRequest,
  mcResults: MonteCarloResults,
  blockedOutputs?: BlockedOutput[]
): SimulationPacketV0 {
  // Build scenario results from MC results
  const baselineResults: ScenarioResults = {
    yearsUntilDepletion: {
      p5: null, // TODO: Compute from runway if available
      p50: null,
      p95: null,
    },
    depletionProbability: mcResults.probabilityOfBankruptcy > 0
      ? { byAge: 85, probability: mcResults.probabilityOfBankruptcy }
      : null,
    terminalWealth: {
      p5: mcResults.finalNetWorthP5 ?? mcResults.finalNetWorthP10 ?? 0,
      p50: mcResults.finalNetWorthP50 ?? 0,
      p95: mcResults.finalNetWorthP95 ?? mcResults.finalNetWorthP90 ?? 0,
    },
  };

  // Compute engine inputs hash for replay
  const engineInputsHash = computeEngineInputsHash(request, request.seed);

  return {
    id: packetId,
    createdAt: new Date(),
    engineInputsHash,
    engineVersion: 'PFOS-E v1.0',
    schemaVersion: 'v0',
    seed: request.seed,
    baseSeed: mcResults.baseSeed,
    question: request.question,
    horizon: request.horizon,
    dataTier: request.dataTier,
    scenarios: request.scenarios.map((s, index) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      appliedChanges: [...request.confirmedChanges, ...s.changeOverrides],
      results: index === 0 ? baselineResults : null,
    })),
    mcResults,
    traceRef: mcResults.exemplarPath
      ? {
          pathSeed: mcResults.exemplarPath.pathSeed,
          selectionCriterion: mcResults.exemplarPath.selectionCriterion || 'median_terminal_wealth',
        }
      : null,
    constraints: [],
    blockedOutputs: blockedOutputs ?? generateBlockedOutputs(request.dataTier),
    blockedScenarios: [],
    sensitivity: null, // Bronze tier: marked as blocked
    userNotes: [],
    isBookmarked: false,
  };
}

/**
 * Generate blocked outputs based on data tier
 * PFOS-E Rule: Blocked outputs are ALWAYS visible, never hidden.
 */
function generateBlockedOutputs(dataTier: DataTier): BlockedOutput[] {
  if (dataTier === 'bronze') {
    return [
      {
        outputName: 'Tax Impact Analysis',
        reason: 'Missing tax filing status and rates',
        unlockPath: ['Add estimated tax rate', 'Or upgrade to Silver tier'],
      },
      {
        outputName: 'Healthcare Cost Projection',
        reason: 'Healthcare assumptions not specified',
        unlockPath: ['Add expected healthcare costs', 'Or specify retirement age'],
      },
      {
        outputName: 'Sensitivity Analysis',
        reason: 'Insufficient inputs for driver attribution',
        unlockPath: ['Add more financial details', 'Upgrade to Silver tier for sensitivity'],
      },
    ];
  }
  if (dataTier === 'silver') {
    return [
      {
        outputName: 'Healthcare Cost Projection',
        reason: 'Healthcare assumptions not specified',
        unlockPath: ['Add expected healthcare costs', 'Upgrade to Gold tier'],
      },
    ];
  }
  return [];
}

/**
 * Compute engine inputs hash for replay verification
 * Creates a deterministic hash from (baselineHash + confirmedChanges + seed)
 */
function computeEngineInputsHash(request: PacketBuildRequest, seed: number): string {
  // Simple hash based on key inputs for reproducibility verification
  const hashInput = JSON.stringify({
    baselineHash: request.baselineHash,
    confirmedChanges: request.confirmedChanges.map(c => ({
      fieldPath: c.fieldPath,
      newValue: c.newValue,
    })),
    seed,
    startYear: request.startYear, // Required for determinism
    horizon: request.horizon,
    dataTier: request.dataTier,
  });

  // Simple hash function (for production, use a proper crypto hash)
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `pfos-${Math.abs(hash).toString(16)}-${seed}`;
}

export default {
  buildPacket,
  runSimulation,
};
