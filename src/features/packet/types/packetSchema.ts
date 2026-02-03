/**
 * SimulationPacket Schema v0 - PFOS-E Compliant
 *
 * The SimulationPacket is the core deliverable from the simulation engine.
 * It wraps existing engine outputs (MonteCarloResults, DeterministicPayload)
 * with packet-specific metadata for audit, replay, and UI rendering.
 *
 * PFOS-E Safety Rules Enforced:
 * 1. No rankings - scenarios array has fixed order, never sorted by "best"
 * 2. Symmetric language - overlap metrics show both directions
 * 3. Uncertainty first - every metric shows percentile range, never point estimate
 * 4. Blocked outputs visible - always rendered, never hidden
 */

import { MonteCarloResults } from '@/types/api/payload';
import { DriverKey, ConstraintCode } from '@/types/events/shared';
import { ConfirmedChange } from '@/features/chat/types/draftChangeSchema';

// =============================================================================
// DATA TIER - Determines what outputs are available
// =============================================================================

/**
 * DataTier - Determines confidence and output fidelity
 *
 * Bronze: Minimal inputs (~3 fields), wide uncertainty bands
 * Silver: Standard inputs (~15 fields), moderate precision
 * Gold: Full profile, maximum precision (Phase 2+)
 */
export type DataTier = 'bronze' | 'silver' | 'gold';

// =============================================================================
// SCENARIO DEFINITION
// =============================================================================

/**
 * ScenarioDefinition - A single scenario (baseline or variant)
 *
 * Max 3 scenarios per packet: baseline + 2 variants.
 * CRITICAL: Scenarios are NOT ranked. Order is fixed by creation order.
 */
export interface ScenarioDefinition {
  /** Unique scenario identifier */
  id: string;

  /** Display label: "BASELINE" | "VARIANT A" | "VARIANT B" */
  label: string;

  /** User-friendly description: "Continue Working" | "Retire at 55" */
  description: string;

  /** Changes applied to create this scenario (from confirmed DraftChanges) */
  appliedChanges: ConfirmedChange[];

  /** Results for this scenario (null if simulation blocked/failed) */
  results: ScenarioResults | null;
}

/**
 * ScenarioResults - Outcome metrics for a scenario
 *
 * All metrics show percentile ranges, never point estimates.
 * Missing values indicate blocked outputs (see blockedOutputs).
 */
export interface ScenarioResults {
  /** Years until portfolio depletion (P5/P50/P95) */
  yearsUntilDepletion: {
    p5: number | null;
    p50: number | null;
    p95: number | null;
  };

  /** Probability of depletion by a specific age */
  depletionProbability: {
    byAge: number;
    probability: number;
  } | null;

  /** Terminal wealth at end of horizon (P5/P50/P95) */
  terminalWealth: {
    p5: number;
    p50: number;
    p95: number;
  } | null;
}

// =============================================================================
// CONSTRAINT & BLOCKED OUTPUT TRACKING
// =============================================================================

/**
 * ConstraintViolation - A simulation constraint that was triggered
 *
 * Used for event trace highlighting and packet audit section.
 */
export interface ConstraintViolation {
  /** Month offset when constraint was violated */
  monthOffset: number;

  /** Constraint code from closed enum */
  constraintCode: ConstraintCode;

  /** Event ID that triggered the constraint (optional) */
  eventId?: string;

  /** Human-readable explanation */
  message: string;
}

/**
 * BlockedOutput - An output that could not be computed
 *
 * PFOS-E Rule: Blocked outputs are ALWAYS visible, never hidden.
 * Shows what's missing and how to unlock.
 */
export interface BlockedOutput {
  /** Name of the blocked output */
  outputName: string;

  /** Why it's blocked */
  reason: string;

  /** Steps to unlock this output */
  unlockPath: string[];
}

/**
 * BlockedScenario - A scenario that could not be simulated
 */
export interface BlockedScenario {
  /** Scenario name that was blocked */
  name: string;

  /** Why simulation was blocked */
  reason: string;

  /** What inputs are needed */
  requiredInputs: string[];
}

// =============================================================================
// SENSITIVITY ANALYSIS
// =============================================================================

/**
 * SensitivityDriver - A single driver's impact on outcomes
 *
 * Powers the PFOS-E sensitivity charts and packet narratives.
 */
export interface SensitivityDriver {
  /** Driver key from closed enum */
  driverKey: DriverKey;

  /** Normalized impact (0-1), larger = more sensitive */
  impact: number;

  /** Human-readable interpretation */
  interpretation: string;
}

/**
 * SensitivityAnalysis - Top drivers affecting outcomes
 */
export interface SensitivityAnalysis {
  /** Top 3-5 drivers ranked by impact */
  topDrivers: SensitivityDriver[];
}

// =============================================================================
// USER NOTES
// =============================================================================

/**
 * UserNote - User-authored annotation on a packet
 *
 * Notes are user-authored only, never system-generated.
 * This maintains PFOS-E's "no behavioral nudges" principle.
 */
export interface UserNote {
  id: string;
  text: string;
  createdAt: Date;
}

// =============================================================================
// EXEMPLAR PATH REFERENCE
// =============================================================================

/**
 * TraceReference - Reference to an exemplar path for detailed trace
 *
 * The trace is fetched separately via RunDeterministicSimulation(seed=pathSeed).
 * This keeps the packet size small while enabling deep-dive exploration.
 */
export interface TraceReference {
  /** Seed to reproduce this specific path */
  pathSeed: number;

  /** How this path was selected */
  selectionCriterion: string;
}

// =============================================================================
// SIMULATION PACKET V0
// =============================================================================

/**
 * SimulationPacketV0 - The core deliverable
 *
 * Contains everything needed to render the packet UI and enable
 * deterministic replay. Wraps existing engine types without reinventing them.
 */
export interface SimulationPacketV0 {
  // === Identity & Audit ===

  /** Packet identifier: "AF-001", "AF-002", etc. */
  id: string;

  /** When packet was created */
  createdAt: Date;

  /** SHA-256 hash of (baseline + confirmedChanges + seed) for replay */
  engineInputsHash: string;

  /** Engine version: "PFOS-E v1.0" */
  engineVersion: string;

  /** Schema version for forward compatibility */
  schemaVersion: 'v0';

  /** Random seed for deterministic replay */
  seed: number;

  /** Base seed for MC paths (optional) */
  baseSeed?: number;

  // === Question Context ===

  /** Original user question */
  question: string;

  /** Simulation horizon */
  horizon: {
    startMonth: number;
    endMonth: number;
  };

  /** Data tier determines output precision */
  dataTier: DataTier;

  // === Scenario Definitions ===

  /**
   * Scenarios: baseline + up to 2 variants
   * CRITICAL: Fixed order, NEVER sorted by "best"
   */
  scenarios: ScenarioDefinition[];

  // === Engine Results (wrapped, not reinvented) ===

  /** Full MC results from existing engine (null if deterministic only) */
  mcResults: MonteCarloResults | null;

  /** Reference to exemplar path trace (fetched separately via seed) */
  traceRef: TraceReference | null;

  // === Constraints & Blocked Outputs ===

  /** Constraint violations during simulation */
  constraints: ConstraintViolation[];

  /** Outputs that could not be computed (ALWAYS visible) */
  blockedOutputs: BlockedOutput[];

  /** Scenarios that could not be simulated */
  blockedScenarios: BlockedScenario[];

  // === Sensitivity Analysis ===

  /** Top drivers affecting outcomes (null if insufficient data) */
  sensitivity: SensitivityAnalysis | null;

  // === User Annotations ===

  /** User-authored notes (never system-generated) */
  userNotes: UserNote[];

  /** Whether user has bookmarked this packet */
  isBookmarked: boolean;
}

// =============================================================================
// PACKET BUILD REQUEST
// =============================================================================

/**
 * PacketBuildRequest - Input to create a new packet
 *
 * Sent from chat UI to simulation orchestrator.
 */
export interface PacketBuildRequest {
  /** Hash of baseline snapshot for immutability verification */
  baselineHash: string;

  /** Confirmed changes to apply */
  confirmedChanges: ConfirmedChange[];

  /** Scenario definitions (baseline required, variants optional) */
  scenarios: Array<{
    id: string;
    label: string;
    description: string;
    /** Scenario-specific change overrides */
    changeOverrides: ConfirmedChange[];
  }>;

  /** Simulation parameters */
  seed: number;

  /** Start year for simulation (required for determinism - no Date.now()) */
  startYear: number;

  horizon: {
    startMonth: number;
    endMonth: number;
  };

  /** Number of MC paths (default: 1000) */
  mcPaths?: number;

  /** Context */
  question: string;
  dataTier: DataTier;
}

// =============================================================================
// PACKET SECTION TYPES (for data-driven rendering)
// =============================================================================

/**
 * PacketSectionType - Types of sections in a packet
 *
 * Packet viewer renders sections dynamically based on these types.
 */
export type PacketSectionType =
  | 'header'      // Sticky banner with disclaimer + metadata
  | 'summary'     // Question + top drivers + uncertainty summary
  | 'scenario'    // Baseline or variant scenario results
  | 'sensitivity' // Sensitivity waterfall chart
  | 'blocked'     // Blocked outputs listing
  | 'trace'       // Illustrative math trace
  | 'audit';      // Engine version, seed, hash, export

/**
 * PacketSectionData - Generic section data container
 */
export interface PacketSectionData {
  type: PacketSectionType;
  payload: unknown;
  collapsed: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a new packet ID
 */
export function generatePacketId(sequenceNumber: number): string {
  return `AF-${String(sequenceNumber).padStart(3, '0')}`;
}

/**
 * Create an empty packet with required fields
 */
export function createEmptyPacket(
  id: string,
  question: string,
  dataTier: DataTier,
  seed: number
): SimulationPacketV0 {
  return {
    id,
    createdAt: new Date(),
    engineInputsHash: '',
    engineVersion: 'PFOS-E v1.0',
    schemaVersion: 'v0',
    seed,
    question,
    horizon: { startMonth: 0, endMonth: 360 },
    dataTier,
    scenarios: [],
    mcResults: null,
    traceRef: null,
    constraints: [],
    blockedOutputs: [],
    blockedScenarios: [],
    sensitivity: null,
    userNotes: [],
    isBookmarked: false,
  };
}
