/**
 * Simulation Trace View Types
 *
 * Implements the TRACE.md specification for a conservation-law UI
 * with visible invariants, two-bucket accounting (Cash/Invested),
 * and progressive disclosure.
 */

import type { EventTraceEntry } from '@/types/api/payload';

// =============================================================================
// PRIMITIVE TYPES
// =============================================================================

/**
 * Money type - stored as number (dollars), displayed with formatting
 * For reconciliation we use a tolerance of $0.01
 */
export type Money = number;

/**
 * Breach status based on End Cash vs Cash Floor
 * - 'No': End Cash >= Cash Floor
 * - 'Floor': 0 <= End Cash < Cash Floor
 * - 'Negative': End Cash < 0
 */
export type BreachStatus = 'No' | 'Floor' | 'Negative';

/**
 * Transfer reasons for attribution
 */
export type TransferReason =
  | 'Scheduled contribution'
  | 'Planned sale'
  | 'Auto-restore floor (derived)'
  | 'Rebalancing'
  | 'Roth conversion'
  | 'RMD withdrawal'
  | 'None';

/**
 * Flow item group for cash drivers breakdown
 */
export type FlowGroup = 'Income' | 'Spending' | 'Debt' | 'OneTime' | 'Other';

/**
 * Source of the flow item for verification
 */
export type FlowSource = 'Manual' | 'DraftConfirmed' | 'Derived';

/**
 * Per-account balances (cash + investment accounts)
 */
export interface AccountBalances {
  cash: Money;
  taxable: Money;
  taxDeferred: Money;
  roth: Money;
  hsa?: Money;
  fiveTwoNine?: Money;
}

// =============================================================================
// FLOW & TRANSFER TYPES
// =============================================================================

/**
 * Individual flow item in the cash drivers breakdown
 * Each flow item has a stable ID for diffing and export
 */
export interface FlowItem {
  /** Stable ID: {month}_{group}_{index} */
  id: string;
  /** Category for grouping */
  group: FlowGroup;
  /** Human-readable label */
  label: string;
  /** Amount in dollars (positive for inflows, negative for outflows) */
  amount: Money;
  /** Source for verification */
  source: FlowSource;
  /** Link to source event if applicable */
  eventId?: string;
}

/**
 * Transfer between Cash and Invested buckets
 * Sign convention:
 *   Negative = Cash → Invested (contribution/buy)
 *   Positive = Invested → Cash (sale/liquidation)
 */
export interface Transfer {
  /** Stable ID: {month}_transfer_{index} */
  id: string;
  /** Amount with sign convention as described */
  amount: Money;
  /** Reason for the transfer */
  reason: TransferReason;
  /** Source account (e.g., 'cash', 'taxable', 'tax_deferred') */
  sourceAccount?: string;
  /** Target account */
  targetAccount?: string;
  /** Link to source event if applicable */
  eventId?: string;
}

// =============================================================================
// WORLD VARIABLES & GROWTH
// =============================================================================

/**
 * World variables for a given month
 * Contains market returns and other stochastic variables
 *
 * Schema name kept as "WorldVars" for stability - UI displays as "Realized Path Variables"
 */
export interface WorldVars {
  /** SPY monthly return (decimal, e.g., -0.041 for -4.1%) */
  equity_return: number;
  /** BND monthly return (decimal) */
  bond_return: number;
  /** Inflation rate (optional, decimal) */
  inflation?: number;
  /** International stocks return (optional, decimal) */
  intl_return?: number;
  /** Other/alternative assets return (optional, decimal) */
  other_return?: number;
  /** Home value appreciation (optional, decimal) */
  home_return?: number;
  /** Rental income growth (optional, decimal) */
  rental_return?: number;
  /** Individual stock return (optional, decimal) */
  individual_stock_return?: number;
  /** Series IDs for audit trail */
  series_ids?: Record<string, string>;
  /** Volatility states for GARCH transparency */
  volatility_state?: { spy: number; bnd: number; intl?: number };

  // "Show the math" linkage (optional, only in stochastic mode)
  /** Invested value after transfers, before returns applied */
  invested_base_for_return?: number;
  /** Asset weights used for return calculation */
  asset_weights?: Record<string, number>;
  /** Weighted return (dot product of weights and returns) */
  weighted_return?: number;
  /** Computed growth dollars (base × weighted return) */
  computed_growth_dollars?: number;
}

/**
 * Growth component for invested drivers breakdown
 * Shows return attribution per asset class
 */
export interface GrowthComponent {
  /** Label like "Equity impact", "Bond impact" */
  label: string;
  /** Impact amount in dollars */
  amount: Money;
  /** Formula string for display, e.g., "$400,000 × 0.60 × (-0.041)" */
  formula: string;
}

// =============================================================================
// TRACE ROW (MAIN TABLE)
// =============================================================================

/**
 * Lightweight row for the main trace table
 * Contains only numeric values - detail maps hold FlowItems, etc.
 * This keeps virtualization smooth with 600+ rows.
 */
export interface TraceRow {
  /** Month identifier: YYYY-MM */
  month: string;
  /** Zero-based month index for ordering */
  monthIndex: number;

  // --- Cash Stream ---

  /** Cash at start of month (previous month's cash_end) */
  cash_start: Money;
  /** Net change from income/spending/debt/one-time events */
  operating_flow: Money;
  /** Net transfer between Cash and Invested (- = Cash→Inv, + = Inv→Cash) */
  transfer_cash: Money;
  /** Cash at end of month after all operations */
  cash_end: Money;
  /** User-defined cash floor threshold */
  cash_floor: Money;
  /** Breach status based on cash_end vs cash_floor */
  breach: BreachStatus;

  // --- Invested Stream ---

  /** Invested at start of month (previous month's inv_end) */
  inv_start: Money;
  /** Change from market returns only (after flows/transfers) */
  market_return_impact: Money;
  /** Invested at end of month */
  inv_end: Money;

  // --- Totals & Verification ---

  /** Net worth at end of month (cash_end + inv_end) */
  net_worth_end: Money;

  /**
   * Cash equation residual
   * cash_delta = cash_end - (cash_start + operating_flow + transfer_cash)
   * Should be 0 (within tolerance)
   */
  cash_delta: Money;

  /**
   * Invested equation residual
   * inv_delta = inv_end - (inv_start + market_return_impact - transfer_cash)
   * Should be 0 (within tolerance)
   */
  inv_delta: Money;

  /**
   * Net worth equation residual (catches sign mistakes)
   * nw_delta = (cash_end + inv_end) - (cash_start + inv_start + operating_flow + market_return_impact)
   * Transfer cancels out, so this is an additional check
   */
  nw_delta: Money;

  /**
   * Maximum reconciliation error
   * reconcile_delta = max(|cash_delta|, |inv_delta|, |nw_delta|)
   * Should be <= tolerance (0.01)
   */
  reconcile_delta: Money;

  // --- IDs for Drill-down ---

  /** Event IDs processed this month */
  eventIds: string[];
}

// =============================================================================
// SUMMARY & METADATA
// =============================================================================

/**
 * Summary of interesting months for Verify Mode
 * These power the jump links in ConsistencyPanel
 */
export interface TraceSummary {
  /** Total number of months in trace */
  totalMonths: number;
  /** Number of months that reconcile within tolerance */
  reconciledMonths: number;
  /** First month where cash_end < cash_floor (if any) */
  firstBreachMonth: string | null;
  /** First month where cash_end < 0 (if any) */
  firstNegativeCashMonth: string | null;
  /** First month with reconcile_delta > tolerance (if any) */
  firstMismatchMonth: string | null;
  /** Month with worst cash drawdown (largest negative change) */
  worstDrawdownMonth: string | null;
  /** Month with largest absolute transfer */
  largestTransferMonth: string | null;
  /** Month with largest negative market return impact */
  largestNegativeReturnMonth: string | null;
}

/**
 * Metadata for the trace run
 * Immutable per packet, displayed in header
 */
export interface TraceRunMeta {
  /** Scenario identifier (e.g., 'baseline', 'variant_a') */
  scenario_id: string;
  /** Random seed used (for deterministic replay) */
  seed: number;
  /** Path index (always 0 for deterministic single-path) */
  path_index: number;
  /** Time convention stamp */
  time_convention: 'OperatingFlow->Transfers->MarketReturnImpact(EOM)';
  /** Reconciliation tolerance in dollars (0.01) */
  reconcile_tolerance: Money;
  /** Rounding policy description */
  rounding_policy: 'StoreCents_DisplayRounded';
  /** Assumed equity allocation for return attribution (0-1) */
  equity_allocation: number;
  /** User-configured cash floor for breach detection */
  cash_floor: Money;
  /** Simulation mode: deterministic (mean returns) or stochastic (seeded random) */
  simulation_mode?: 'deterministic' | 'stochastic';
  /** Model description for display (e.g., "PCG32 seeded GARCH(1,1) with Student-t(5)") */
  model_description?: string;
}

// =============================================================================
// TRACE DATA (TOP-LEVEL CONTAINER)
// =============================================================================

/**
 * Complete trace data structure
 *
 * Design decision: Detail is stored in Maps keyed by month string,
 * not embedded in rows. This keeps virtualization smooth and allows
 * expansion to load detail on demand.
 */
export interface TraceData {
  /** Immutable run metadata */
  meta: TraceRunMeta;

  /** Lightweight rows for main table (12 columns) */
  rows: TraceRow[];

  /** Flow items keyed by month (for Cash drivers panel) */
  flowItemsByMonth: Map<string, FlowItem[]>;

  /** Transfers keyed by month (for transfer attribution) */
  transfersByMonth: Map<string, Transfer[]>;

  /** Growth components keyed by month (for Invested drivers panel) */
  growthComponentsByMonth: Map<string, GrowthComponent[]>;

  /** World variables keyed by month (for Invested drivers panel) */
  worldVarsByMonth: Map<string, WorldVars>;

  /** Event lookup by eventId (for Source Events in Panel B) */
  eventLookup: Map<string, EventTraceEntry>;

  /** Per-account start balances keyed by month */
  accountStartsByMonth: Map<string, AccountBalances>;

  /** Per-account end balances keyed by month */
  accountEndsByMonth: Map<string, AccountBalances>;

  /** Summary for Verify Mode jump links */
  summary: TraceSummary;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Reconciliation tolerance in dollars
 * Matches TRACE.md: "Reconcile Δ allows up to $0.01 due to rounding"
 */
export const RECONCILE_TOLERANCE: Money = 0.01;

/**
 * Default cash floor when not specified by user
 */
export const DEFAULT_CASH_FLOOR: Money = 0;

/**
 * Canonical time convention string
 */
export const TIME_CONVENTION = 'OperatingFlow->Transfers->MarketReturnImpact(EOM)' as const;
