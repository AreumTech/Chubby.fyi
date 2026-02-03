/**
 * WASM Boundary Schemas
 *
 * Zod schemas for runtime validation at the WASM boundary.
 * These provide type-safe validation for both input and output
 * of the WASM simulation functions.
 */

import { z } from 'zod';

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Account holdings schema - matches Go AccountHoldingsMonthEnd
 */
const AccountHoldingsSchema = z.object({
  totalValue: z.number().optional(),
  holdings: z.array(z.object({
    assetClass: z.string(),
    currentMarketValueTotal: z.number().optional(),
    value: z.number().optional(),
  })).optional(),
}).passthrough();

/**
 * Event schema for WASM input - minimal validation
 */
const WasmEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string().optional(),
  monthOffset: z.number(),
  amount: z.number().optional(),
  frequency: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).passthrough();

/**
 * Goal schema for WASM input
 */
const WasmGoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: z.number(),
  targetMonthOffset: z.number(),
  priority: z.number().optional(),
  category: z.string().optional(),
}).passthrough();

/**
 * Main WASM input schema
 */
export const WasmInputSchema = z.object({
  initialAccounts: z.object({
    cash: z.number(),
    taxable: AccountHoldingsSchema.optional(),
    tax_deferred: AccountHoldingsSchema.optional(),
    roth: AccountHoldingsSchema.optional(),
  }).passthrough(),
  events: z.array(WasmEventSchema),
  config: z.record(z.string(), z.any()),
  monthsToRun: z.number().min(1).max(1200),
  initialAge: z.number().min(18).max(100).optional(),
  startYear: z.number().min(2000).max(2100).optional(),
  withdrawalStrategy: z.string().optional(),
  goals: z.array(WasmGoalSchema).optional(),
}).passthrough();

export type WasmInput = z.infer<typeof WasmInputSchema>;

// =============================================================================
// OUTPUT SCHEMAS
// =============================================================================

/**
 * Goal outcome from simulation
 */
const GoalOutcomeSchema = z.object({
  goalId: z.string(),
  goalName: z.string(),
  probability: z.number().min(0).max(1),
  statusTag: z.string(), // 'excellent' | 'good' | 'concerning' | 'critical'
  shortDescription: z.string().optional(),
  targetAmount: z.number(),
  p10Amount: z.number(),
  p25Amount: z.number(),
  p50Amount: z.number(),
  p75Amount: z.number(),
  p90Amount: z.number(),
}).passthrough();

/**
 * Portfolio stats from simulation
 */
// MCBreachProbability schema for breach time series
const MCBreachProbabilitySchema = z.object({
  monthOffset: z.number(),
  cumulativeBreachProb: z.number(),
  newBreachesThisMonth: z.number(),
});

// ExemplarPath schema for median path reference
const ExemplarPathSchema = z.object({
  pathIndex: z.number(),
  pathSeed: z.number(),
  terminalWealth: z.number(),
  selectionCriterion: z.string(),
});

const PortfolioStatsSchema = z.object({
  p10FinalValue: z.number(),
  p25FinalValue: z.number(),
  p50FinalValue: z.number(),
  p75FinalValue: z.number(),
  p90FinalValue: z.number(),
  successRate: z.number().min(0).max(1),

  // Extended percentiles (MC enhancement)
  p5FinalValue: z.number().optional(),
  p95FinalValue: z.number().optional(),

  // Min cash KPIs
  minCashP5: z.number().optional(),
  minCashP50: z.number().optional(),
  minCashP95: z.number().optional(),

  // Runway KPIs (conditional on breach)
  runwayP5: z.number().optional(),
  runwayP50: z.number().optional(),
  runwayP95: z.number().optional(),
  breachedPathCount: z.number().optional(),

  // Breach probability time series
  breachProbabilityByMonth: z.array(MCBreachProbabilitySchema).optional(),

  // Ever-breach probability
  everBreachProbability: z.number().optional(),

  // Exemplar path reference
  exemplarPath: ExemplarPathSchema.optional(),

  // Audit fields
  baseSeed: z.number().optional(),
  successfulPaths: z.number().optional(),
  failedPaths: z.number().optional(),
}).passthrough();

/**
 * Plan health metrics
 */
const PlanHealthSchema = z.object({
  overallScore: z.number().min(0).max(100),
  riskLevel: z.string(), // 'low' | 'moderate' | 'high'
  confidenceLevel: z.string(), // 'high' | 'medium' | 'low'
  keyRisks: z.array(z.string()).optional(),
  keyStrengths: z.array(z.string()).optional(),
}).passthrough();

/**
 * Plan summary from simulation
 */
const PlanSummarySchema = z.object({
  goalOutcomes: z.array(GoalOutcomeSchema),
  portfolioStats: PortfolioStatsSchema,
  planHealth: PlanHealthSchema,
  alerts: z.array(z.unknown()).optional(),
  probabilityOfBankruptcy: z.number().optional(),
  bankruptcyMonthP50: z.number().optional(),
}).passthrough();

/**
 * Charts data - loosely validated
 */
const ProjectionChartsSchema = z.object({
  netWorth: z.unknown().nullable(),
  cashFlow: z.unknown().nullable(),
  assetAllocation: z.unknown().nullable(),
  goalProgress: z.array(z.unknown()).optional(),
  eventMarkers: z.array(z.unknown()).optional(),
}).passthrough();

/**
 * Detailed analysis data
 */
const DetailedAnalysisSchema = z.object({
  goalBreakdowns: z.array(z.unknown()).optional(),
  annualSnapshots: z.record(z.string(), z.unknown()).optional(),
  advancedAnalysisPanels: z.array(z.unknown()).optional(),
  riskAnalysis: z.unknown().nullable(),
}).passthrough();

/**
 * Plan projection - simulation output
 */
const PlanProjectionSchema = z.object({
  summary: PlanSummarySchema,
  charts: ProjectionChartsSchema,
  analysis: DetailedAnalysisSchema,
}).passthrough();

/**
 * Plan inputs - echoed back from simulation
 */
const PlanInputsSchema = z.object({
  goals: z.array(z.unknown()).optional(),
  events: z.array(z.unknown()).optional(),
  strategies: z.array(z.unknown()).optional(),
  accounts: z.array(z.unknown()).optional(),
}).passthrough();

/**
 * Complete simulation payload schema
 */
export const SimulationPayloadSchema = z.object({
  planInputs: PlanInputsSchema,
  planProjection: PlanProjectionSchema,
});

// Also allow capitalized version (Go uses PascalCase)
export const SimulationPayloadSchemaCaseInsensitive = z.union([
  SimulationPayloadSchema,
  z.object({
    PlanInputs: PlanInputsSchema,
    PlanProjection: PlanProjectionSchema,
  }),
]);

export type WasmOutput = z.infer<typeof SimulationPayloadSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Result type for safe parsing
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * Validate WASM input and return typed result
 */
export function validateWasmInput(input: unknown): ValidationResult<WasmInput> {
  return WasmInputSchema.safeParse(input) as ValidationResult<WasmInput>;
}

/**
 * Validate WASM output and return typed result
 */
export function validateWasmOutput(output: unknown): ValidationResult<WasmOutput> {
  return SimulationPayloadSchemaCaseInsensitive.safeParse(output) as ValidationResult<WasmOutput>;
}

/**
 * Normalize WASM output casing (Go uses PascalCase, JS uses camelCase)
 */
export function normalizeWasmOutput(output: unknown): unknown {
  if (typeof output !== 'object' || output === null) {
    return output;
  }

  const obj = output as Record<string, unknown>;

  // Handle PascalCase from Go
  if ('PlanInputs' in obj && 'PlanProjection' in obj) {
    return {
      planInputs: obj.PlanInputs,
      planProjection: obj.PlanProjection,
    };
  }

  return output;
}
