/**
 * Transform engine data to Trace View format
 *
 * Converts DeterministicMonthState[] + DeterministicAssumptions to TraceData
 * following the TRACE.md specification.
 *
 * Key transformation:
 * - Two-bucket model: Cash vs Invested (sum of all investment accounts)
 * - Operating Flow: income - expenses - debt payments
 * - Transfers: contributions (negative) and withdrawals (positive)
 * - Reconciliation: verify conservation law each month
 */

import type {
  DeterministicMonthState,
  DeterministicAssumptions,
  MonthlyFlowsDetail,
  StrategyExecution,
  StochasticReturns,
  ComprehensiveAccountState,
  EventTraceEntry,
  RealizedMonthVariables,
} from '@/types/api/payload';

import type {
  TraceData,
  TraceRow,
  TraceSummary,
  TraceRunMeta,
  FlowItem,
  FlowGroup,
  Transfer,
  TransferReason,
  WorldVars,
  GrowthComponent,
  BreachStatus,
  Money,
  AccountBalances,
} from '../types/traceTypes';

import {
  RECONCILE_TOLERANCE,
  DEFAULT_CASH_FLOOR,
  TIME_CONVENTION,
} from '../types/traceTypes';

// =============================================================================
// MAIN TRANSFORMATION FUNCTION
// =============================================================================

export interface TransformOptions {
  /** Scenario ID for metadata */
  scenarioId?: string;
  /** Random seed used */
  seed?: number;
  /** User-defined cash floor (default: 0) */
  cashFloor?: Money;
  /** Stock/bond allocation for return attribution (default: 60/40) */
  equityAllocation?: number;
  /** Event trace entries for Source Events lookup */
  eventTrace?: EventTraceEntry[];
  /**
   * Initial cash balance at simulation start (month 0 start value)
   * Required for correct reconciliation - avoids circular calculation
   */
  initialCash?: Money;
  /**
   * Initial invested balance at simulation start (month 0 start value)
   * Sum of all investment account values at t=0
   * Required for correct reconciliation - avoids circular calculation
   */
  initialInvested?: Money;
  /** Simulation mode: deterministic or stochastic */
  simulationMode?: 'deterministic' | 'stochastic';
  /** Model description for display in header */
  modelDescription?: string;
  /** Realized path variables with "show the math" linkage (stochastic mode) */
  realizedPathVariables?: RealizedMonthVariables[];
  /** Initial per-account balances for accurate month 0 starts */
  initialAccountBalances?: AccountBalances;
}

/**
 * Transform engine state to TraceData
 *
 * @param states - Monthly state snapshots from engine
 * @param assumptions - Simulation assumptions (growth rates)
 * @param options - Optional configuration
 * @returns TraceData for rendering
 */
export function transformToTraceData(
  states: DeterministicMonthState[],
  assumptions: DeterministicAssumptions,
  options: TransformOptions = {}
): TraceData {
  const {
    scenarioId = 'baseline',
    seed = 1234,
    cashFloor = DEFAULT_CASH_FLOOR,
    equityAllocation = 0.6,
    eventTrace = [],
    initialCash,
    initialInvested,
    simulationMode = 'deterministic',
    modelDescription,
    realizedPathVariables = [],
    initialAccountBalances,
  } = options;

  // Build lookup map for realized path variables by month offset
  const realizedPathByMonth = new Map<number, RealizedMonthVariables>();
  for (const rpv of realizedPathVariables) {
    realizedPathByMonth.set(rpv.monthOffset, rpv);
  }

  // Build event lookup map for Source Events display
  const eventLookup = new Map<string, EventTraceEntry>();
  for (const event of eventTrace) {
    // Key by eventId - events may appear multiple times (different months)
    // We store the first occurrence for metadata; postings link via eventId
    if (!eventLookup.has(event.eventId)) {
      eventLookup.set(event.eventId, event);
    }
  }

  // Initialize data structures
  const rows: TraceRow[] = [];
  const flowItemsByMonth = new Map<string, FlowItem[]>();
  const transfersByMonth = new Map<string, Transfer[]>();
  const growthComponentsByMonth = new Map<string, GrowthComponent[]>();
  const worldVarsByMonth = new Map<string, WorldVars>();
  const accountStartsByMonth = new Map<string, AccountBalances>();
  const accountEndsByMonth = new Map<string, AccountBalances>();

  // Summary tracking
  let firstBreachMonth: string | null = null;
  let firstNegativeCashMonth: string | null = null;
  let firstMismatchMonth: string | null = null;
  let worstCashDrawdownMonth: string | null = null;
  let largestTransferMonth: string | null = null;
  let largestNegativeReturnMonth: string | null = null;

  let worstCashDrawdownValue = 0; // Track largest cash decline (negative = decline)
  let largestTransferValue = 0;
  let largestNegativeReturnValue = 0;
  let reconciledMonths = 0;

  // Previous month values for start calculations
  let prevCashEnd = 0;
  let prevInvEnd = 0;

  // Process each month
  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    const month = formatMonth(state.calendarYear, state.calendarMonth);

    // Calculate bucket values
    const cashEnd = state.cash;
    const invEnd = calculateInvestedTotal(state);

    // Capture per-account end balances
    const accountEnd: AccountBalances = {
      cash: state.cash,
      taxable: state.taxable?.totalValue || 0,
      taxDeferred: state.taxDeferred?.totalValue || 0,
      roth: state.roth?.totalValue || 0,
      hsa: state.hsa?.totalValue,
      fiveTwoNine: state.fiveTwoNine?.totalValue,
    };

    // Start values: use initial values for month 0, previous end values for later months
    // IMPORTANT: For month 0, we MUST use the provided initial values to avoid circular
    // calculation. Deriving start from end - flows is mathematically unsound because
    // cashEnd = cashStart + flows, so solving for cashStart introduces circular dependency.
    let cashStart: Money;
    let invStart: Money;

    if (i === 0) {
      // Month 0: Use provided initial values, or fall back to deriving from flows (legacy behavior)
      if (initialCash !== undefined) {
        cashStart = initialCash;
      } else {
        // Fallback: derive from end - flows (may cause reconciliation errors)
        cashStart = cashEnd - getNetCashChange(state.flows);
      }

      if (initialInvested !== undefined) {
        invStart = initialInvested;
      } else {
        // Fallback: derive from end - flows (may cause reconciliation errors)
        invStart = invEnd - getNetInvestmentChange(state);
      }
    } else {
      // Later months: use previous month's end values (always correct)
      cashStart = prevCashEnd;
      invStart = prevInvEnd;
    }

    // Per-account starts (month 0 uses provided initial balances if available)
    let accountStart: AccountBalances;
    if (i === 0 && initialAccountBalances) {
      accountStart = {
        cash: initialAccountBalances.cash,
        taxable: initialAccountBalances.taxable,
        taxDeferred: initialAccountBalances.taxDeferred,
        roth: initialAccountBalances.roth,
        hsa: initialAccountBalances.hsa,
        fiveTwoNine: initialAccountBalances.fiveTwoNine,
      };
    } else if (i === 0) {
      // Fallback: use end balances for month 0 if no initial provided
      accountStart = { ...accountEnd };
    } else {
      const prevMonth = formatMonth(states[i - 1].calendarYear, states[i - 1].calendarMonth);
      accountStart = accountEndsByMonth.get(prevMonth) || { ...accountEnd };
    }

    accountStartsByMonth.set(month, accountStart);
    accountEndsByMonth.set(month, accountEnd);

    // Operating flow: income - expenses - debt
    const operatingFlow = calculateOperatingFlow(state.flows);

    // Build flow items for drill-down
    const flowItems = buildFlowItems(month, state.monthOffset, state.flows, state.eventIds || [], eventTrace);
    flowItemsByMonth.set(month, flowItems);

    // Transfers: use flows data for accuracy (positive = Invested→Cash, negative = Cash→Invested)
    // Sign convention: withdrawals add to cash, contributions subtract from cash
    const transferCash = state.flows.totalWithdrawals - state.flows.totalContributions;

    // Build transfer items for drill-down (still useful for attribution)
    const transfers = buildTransfers(month, state.monthOffset, state.flows, state.strategyExecutions || [], eventTrace, state.eventIds || []);
    transfersByMonth.set(month, transfers);

    // Market return impact: use engine's calculated value directly
    // Per TRACE ordering: returns apply after transfers, engine computes this correctly
    const marketReturnImpact = state.flows.investmentGrowth;

    // World vars for display (with "show the math" linkage from realized path variables)
    const realizedPath = realizedPathByMonth.get(state.monthOffset);
    const worldVars = buildWorldVars(state.marketReturns, realizedPath);
    worldVarsByMonth.set(month, worldVars);

    // Growth components for breakdown (compute from post-transfer balance for accuracy)
    const invPostTransfer = invStart - transferCash; // After transfers applied
    const growthComponents = buildGrowthComponents(
      month,
      invPostTransfer,
      state.marketReturns,
      equityAllocation,
      marketReturnImpact // Pass actual impact for reconciliation
    );
    growthComponentsByMonth.set(month, growthComponents);

    // Net worth
    const netWorthEnd = cashEnd + invEnd;

    // Reconciliation checks
    const cashDelta = cashEnd - (cashStart + operatingFlow + transferCash);
    const invDelta = invEnd - (invStart + marketReturnImpact - transferCash);
    const nwDelta = netWorthEnd - (cashStart + invStart + operatingFlow + marketReturnImpact);
    const reconcileDelta = Math.max(Math.abs(cashDelta), Math.abs(invDelta), Math.abs(nwDelta));

    // Breach status
    const breach = determineBreachStatus(cashEnd, cashFloor);

    // Build row
    const row: TraceRow = {
      month,
      monthIndex: i,
      cash_start: cashStart,
      operating_flow: operatingFlow,
      transfer_cash: transferCash,
      cash_end: cashEnd,
      cash_floor: cashFloor,
      breach,
      inv_start: invStart,
      market_return_impact: marketReturnImpact,
      inv_end: invEnd,
      net_worth_end: netWorthEnd,
      cash_delta: cashDelta,
      inv_delta: invDelta,
      nw_delta: nwDelta,
      reconcile_delta: reconcileDelta,
      eventIds: state.eventIds || [],
    };
    rows.push(row);

    // Update summary tracking
    if (reconcileDelta <= RECONCILE_TOLERANCE) {
      reconciledMonths++;
    } else if (!firstMismatchMonth) {
      firstMismatchMonth = month;
    }

    if (breach !== 'No' && !firstBreachMonth) {
      firstBreachMonth = month;
    }

    if (cashEnd < 0 && !firstNegativeCashMonth) {
      firstNegativeCashMonth = month;
    }

    // Track worst cash drawdown (largest decline in cash balance)
    // A drawdown is when cash_end < cash_start (negative change)
    const cashChange = cashEnd - cashStart;
    if (cashChange < worstCashDrawdownValue) {
      worstCashDrawdownValue = cashChange;
      worstCashDrawdownMonth = month;
    }

    // Track largest transfer
    if (Math.abs(transferCash) > largestTransferValue) {
      largestTransferValue = Math.abs(transferCash);
      largestTransferMonth = month;
    }

    // Track largest negative return
    if (marketReturnImpact < largestNegativeReturnValue) {
      largestNegativeReturnValue = marketReturnImpact;
      largestNegativeReturnMonth = month;
    }

    // Save for next iteration
    prevCashEnd = cashEnd;
    prevInvEnd = invEnd;
  }

  // Build summary
  const summary: TraceSummary = {
    totalMonths: rows.length,
    reconciledMonths,
    firstBreachMonth,
    firstNegativeCashMonth,
    firstMismatchMonth,
    worstDrawdownMonth: worstCashDrawdownMonth,
    largestTransferMonth,
    largestNegativeReturnMonth,
  };

  // Build metadata
  const meta: TraceRunMeta = {
    scenario_id: scenarioId,
    seed,
    path_index: 0,
    time_convention: TIME_CONVENTION,
    reconcile_tolerance: RECONCILE_TOLERANCE,
    rounding_policy: 'StoreCents_DisplayRounded',
    equity_allocation: equityAllocation,
    cash_floor: cashFloor,
    simulation_mode: simulationMode,
    model_description: modelDescription,
  };

  return {
    meta,
    rows,
    flowItemsByMonth,
    transfersByMonth,
    growthComponentsByMonth,
    worldVarsByMonth,
    eventLookup,
    accountStartsByMonth,
    accountEndsByMonth,
    summary,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format month as YYYY-MM
 */
function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Calculate total invested from all investment accounts
 */
function calculateInvestedTotal(state: DeterministicMonthState): Money {
  let total = 0;
  if (state.taxable) total += state.taxable.totalValue;
  if (state.taxDeferred) total += state.taxDeferred.totalValue;
  if (state.roth) total += state.roth.totalValue;
  if (state.hsa) total += state.hsa.totalValue;
  if (state.fiveTwoNine) total += state.fiveTwoNine.totalValue;
  return total;
}

/**
 * Get net cash change from flows (for first month start calculation)
 */
function getNetCashChange(flows: MonthlyFlowsDetail): Money {
  return (
    flows.totalIncome -
    flows.totalExpenses -
    flows.debtPaymentsPrincipal -
    flows.debtPaymentsInterest +
    flows.totalWithdrawals -
    flows.totalContributions -
    flows.taxWithheld -
    flows.taxesPaid
  );
}

/**
 * Get net investment change (for first month start calculation)
 */
function getNetInvestmentChange(state: DeterministicMonthState): Money {
  const flows = state.flows;
  // Investment change = contributions - withdrawals + growth
  return flows.totalContributions - flows.totalWithdrawals + flows.investmentGrowth;
}

/**
 * Calculate operating flow from flows detail
 * Operating flow = income - spending - debt (affects cash, not investments)
 */
function calculateOperatingFlow(flows: MonthlyFlowsDetail): Money {
  return (
    flows.totalIncome -
    flows.totalExpenses -
    flows.debtPaymentsPrincipal -
    flows.debtPaymentsInterest -
    flows.taxWithheld -
    flows.taxesPaid
  );
}

/**
 * Build flow items for cash drivers breakdown
 */
function buildFlowItems(
  month: string,
  monthOffset: number,
  flows: MonthlyFlowsDetail,
  eventIds: string[],
  eventTrace: EventTraceEntry[]
): FlowItem[] {
  const items: FlowItem[] = [];
  let index = 0;

  // Helper to add item
  const addItem = (group: FlowGroup, label: string, amount: Money, eventId?: string) => {
    if (Math.abs(amount) > 0.001) {
      items.push({
        id: `${month}_${group}_${index++}`,
        group,
        label,
        amount,
        source: 'Derived',
        eventId,
      });
    }
  };

  // If event trace exists for this month, build per-event items for auditability
  const eventItems = buildFlowItemsFromEvents(month, monthOffset, eventIds, eventTrace);
  if (eventItems.length > 0) {
    // Add residual to keep operating flow consistent (e.g., tax withheld, interest)
    const operatingFlow = calculateOperatingFlow(flows);
    const eventSum = eventItems.reduce((sum, item) => sum + item.amount, 0);
    const residual = operatingFlow - eventSum;
    if (Math.abs(residual) > 0.01) {
      eventItems.push({
        id: `${month}_Other_${eventItems.length}`,
        group: 'Other',
        label: 'System adjustments',
        amount: residual,
        source: 'Derived',
      });
    }
    return eventItems;
  }

  // Income items (fallback to aggregate flows)
  if (flows.salaryIncome > 0) addItem('Income', 'Salary', flows.salaryIncome);
  if (flows.bonusIncome > 0) addItem('Income', 'Bonus', flows.bonusIncome);
  if (flows.rsuIncome > 0) addItem('Income', 'RSU', flows.rsuIncome);
  if (flows.socialSecurityIncome > 0) addItem('Income', 'Social Security', flows.socialSecurityIncome);
  if (flows.pensionIncome > 0) addItem('Income', 'Pension', flows.pensionIncome);
  if (flows.dividendIncome > 0) addItem('Income', 'Dividends', flows.dividendIncome);
  if (flows.interestIncome > 0) addItem('Income', 'Interest', flows.interestIncome);

  // Check for other income not captured above
  const capturedIncome =
    flows.salaryIncome +
    flows.bonusIncome +
    flows.rsuIncome +
    flows.socialSecurityIncome +
    flows.pensionIncome +
    flows.dividendIncome +
    flows.interestIncome;
  const otherIncome = flows.totalIncome - capturedIncome;
  if (otherIncome > 0.01) addItem('Income', 'Other Income', otherIncome);

  // Spending items (negative amounts)
  if (flows.housingExpenses > 0) addItem('Spending', 'Housing', -flows.housingExpenses);
  if (flows.transportationExpenses > 0) addItem('Spending', 'Transportation', -flows.transportationExpenses);
  if (flows.foodExpenses > 0) addItem('Spending', 'Food', -flows.foodExpenses);
  if (flows.otherExpenses > 0) addItem('Spending', 'Other', -flows.otherExpenses);

  // Check for other expenses not captured
  const capturedExpenses =
    flows.housingExpenses +
    flows.transportationExpenses +
    flows.foodExpenses +
    flows.otherExpenses;
  const remainingExpenses = flows.totalExpenses - capturedExpenses;
  if (remainingExpenses > 0.01) addItem('Spending', 'Miscellaneous', -remainingExpenses);

  // Debt items (negative amounts)
  if (flows.debtPaymentsPrincipal > 0 || flows.debtPaymentsInterest > 0) {
    const totalDebt = flows.debtPaymentsPrincipal + flows.debtPaymentsInterest;
    addItem('Debt', 'Debt Payment', -totalDebt);
  }

  // Tax items (negative amounts, under Other)
  if (flows.taxWithheld > 0) addItem('Other', 'Tax Withheld', -flows.taxWithheld);
  if (flows.taxesPaid > 0) addItem('Other', 'Taxes Paid', -flows.taxesPaid);

  return items;
}

/**
 * Build per-event flow items from event trace entries for a month
 * Uses cash deltas to reflect actual inflow/outflow by event id
 */
function buildFlowItemsFromEvents(
  month: string,
  monthOffset: number,
  eventIds: string[],
  eventTrace: EventTraceEntry[]
): FlowItem[] {
  const items: FlowItem[] = [];
  let index = 0;

  const traceById = new Map<string, EventTraceEntry[]>();
  for (const entry of eventTrace) {
    if (entry.monthOffset !== monthOffset) continue;
    if (!traceById.has(entry.eventId)) {
      traceById.set(entry.eventId, []);
    }
    traceById.get(entry.eventId)!.push(entry);
  }

  const addItem = (group: FlowGroup, label: string, amount: Money, eventId?: string) => {
    if (Math.abs(amount) > 0.001) {
      items.push({
        id: `${month}_${group}_${index++}`,
        group,
        label,
        amount,
        source: 'Derived',
        eventId,
      });
    }
  };

  for (const eventId of eventIds) {
    const entries = traceById.get(eventId) || [];
    for (const entry of entries) {
      const cashDelta = entry.cashAfter - entry.cashBefore;
      const invBefore = entry.taxableBefore + entry.taxDeferredBefore + entry.rothBefore;
      const invAfter = entry.taxableAfter + entry.taxDeferredAfter + entry.rothAfter;
      const invDelta = invAfter - invBefore;

      // Skip transfer-like events (handled in transfers panel)
      if (Math.abs(cashDelta) > 0.001 && Math.abs(invDelta) > 0.001 && Math.abs(cashDelta + invDelta) <= 0.01) {
        continue;
      }

      if (Math.abs(cashDelta) <= 0.001) {
        continue;
      }

      const group = classifyFlowGroup(entry.eventType, cashDelta);
      const label = entry.eventName || entry.eventType;
      addItem(group, label, cashDelta, entry.eventId);
    }
  }

  return items;
}

function classifyFlowGroup(eventType: string, cashDelta: Money): FlowGroup {
  const upper = eventType.toUpperCase();
  if (upper.includes('DEBT') || upper.includes('LIABILITY_PAYMENT')) return 'Debt';
  if (upper.includes('ONE_TIME') || upper.includes('TUITION') || upper.includes('VEHICLE') || upper.includes('INHERITANCE')) {
    return 'OneTime';
  }
  if (cashDelta >= 0) return 'Income';
  if (upper.includes('EXPENSE') || upper.includes('PAYMENT')) return 'Spending';
  return 'Other';
}

/**
 * Build transfers from flows data and strategy executions
 * Sign convention: Negative = Cash→Invested, Positive = Invested→Cash
 *
 * Primary source: flows.totalContributions and flows.totalWithdrawals
 * Secondary source: strategyExecutions for attribution detail
 */
function buildTransfers(
  month: string,
  monthOffset: number,
  flows: MonthlyFlowsDetail,
  executions: StrategyExecution[],
  eventTrace: EventTraceEntry[],
  eventIds: string[]
): Transfer[] {
  const transfers: Transfer[] = [];
  let index = 0;

  // Event-derived transfers for attribution
  const eventIdSet = new Set(eventIds);
  const monthEntries = eventTrace.filter(entry => entry.monthOffset === monthOffset && eventIdSet.has(entry.eventId));
  let hasEventWithdrawal = false;
  let hasEventContribution = false;
  for (const entry of monthEntries) {
    const cashDelta = entry.cashAfter - entry.cashBefore;
    const invBefore = entry.taxableBefore + entry.taxDeferredBefore + entry.rothBefore;
    const invAfter = entry.taxableAfter + entry.taxDeferredAfter + entry.rothAfter;
    const invDelta = invAfter - invBefore;

    if (Math.abs(cashDelta) > 0.001 && Math.abs(invDelta) > 0.001 && Math.abs(cashDelta + invDelta) <= 0.01) {
      const reason = inferTransferReason(entry.eventType, cashDelta);
      if (cashDelta > 0) {
        hasEventWithdrawal = true;
      } else {
        hasEventContribution = true;
      }
      transfers.push({
        id: `${month}_transfer_${index++}`,
        amount: cashDelta,
        reason,
        sourceAccount: cashDelta > 0 ? 'investment' : 'cash',
        targetAccount: cashDelta > 0 ? 'cash' : 'investment',
        eventId: entry.eventId,
      });
    }
  }

  // Add withdrawal transfers from flows (Invested → Cash = positive)
  // Distinguish between auto-shortfall cover and planned sales
  const autoShortfall = flows.autoShortfallCover || 0;
  const plannedSales = flows.totalWithdrawals - autoShortfall;

  // Auto-shortfall cover (derived transfer to restore cash floor)
  if (autoShortfall > 0.01) {
    transfers.push({
      id: `${month}_transfer_${index++}`,
      amount: autoShortfall,
      reason: 'Auto-restore floor (derived)',
      sourceAccount: 'investment',
      targetAccount: 'cash',
      eventId: undefined,
    });
  }

  // Planned sales (user-scheduled withdrawals) - if no event-derived entry exists
  if (plannedSales > 0.01 && !hasEventWithdrawal) {
    transfers.push({
      id: `${month}_transfer_${index++}`,
      amount: plannedSales,
      reason: 'Planned sale',
      sourceAccount: 'investment',
      targetAccount: 'cash',
      eventId: undefined,
    });
  }

  // Contribution transfer from flows (Cash → Invested) - if no event-derived entry exists
  if (flows.totalContributions > 0.01 && !hasEventContribution) {
    transfers.push({
      id: `${month}_transfer_${index++}`,
      amount: -flows.totalContributions,
      reason: 'Scheduled contribution',
      sourceAccount: 'cash',
      targetAccount: 'investment',
      eventId: undefined,
    });
  }

  // Add internal transfers from strategy executions (for attribution only, amount=0 for bucket math)
  for (const exec of executions) {
    switch (exec.strategyType) {
      case 'ROTH_CONVERSION':
        transfers.push({
          id: `${month}_transfer_${index++}`,
          amount: 0, // Internal transfer doesn't affect Cash/Invested split
          reason: 'Roth conversion',
          sourceAccount: 'tax_deferred',
          targetAccount: 'roth',
          eventId: undefined,
        });
        break;

      case 'REBALANCING':
        transfers.push({
          id: `${month}_transfer_${index++}`,
          amount: 0, // Internal transfer
          reason: 'Rebalancing',
          sourceAccount: undefined,
          targetAccount: undefined,
          eventId: undefined,
        });
        break;

      case 'RMD':
        // RMD is already captured in totalWithdrawals, add for attribution
        if (flows.rmdAmount > 0.01) {
          transfers.push({
            id: `${month}_transfer_${index++}`,
            amount: 0, // Already counted in totalWithdrawals above
            reason: 'RMD withdrawal',
            sourceAccount: 'tax_deferred',
            targetAccount: 'cash',
            eventId: undefined,
          });
        }
        break;

      // CONTRIBUTION, WITHDRAWAL already captured from flows
      // DEBT_PAYMENT, TAX_PAYMENT affect operating flow, not transfers
      default:
        break;
    }
  }

  return transfers;
}

function inferTransferReason(eventType: string, cashDelta: Money): TransferReason {
  const upper = eventType.toUpperCase();
  if (upper.includes('RMD')) return 'RMD withdrawal';
  if (upper.includes('ROTH_CONVERSION')) return 'Roth conversion';
  if (upper.includes('REBALANCE')) return 'Rebalancing';
  if (upper.includes('CONTRIBUTION')) return 'Scheduled contribution';
  if (upper.includes('WITHDRAWAL')) return 'Planned sale';
  return cashDelta > 0 ? 'Planned sale' : 'Scheduled contribution';
}


/**
 * Build world variables from market returns
 * Includes extended fields when available (stochastic mode)
 * Merges "show the math" linkage from realized path variables
 */
function buildWorldVars(
  returns: StochasticReturns,
  realizedPath?: RealizedMonthVariables
): WorldVars {
  const worldVars: WorldVars = {
    equity_return: returns.SPY || 0,
    bond_return: returns.BND || 0,
    inflation: returns.Inflation,
    series_ids: {
      equity: 'SPY',
      bond: 'BND',
    },
  };

  // Include extended asset class returns if available (stochastic mode)
  if (returns.Intl !== undefined) {
    worldVars.intl_return = returns.Intl;
  }
  if (returns.Other !== undefined) {
    worldVars.other_return = returns.Other;
  }
  if (returns.Home !== undefined) {
    worldVars.home_return = returns.Home;
  }
  if (returns.Rent !== undefined) {
    worldVars.rental_return = returns.Rent;
  }
  if (returns.IndividualStock !== undefined) {
    worldVars.individual_stock_return = returns.IndividualStock;
  }

  // Include "show the math" linkage from realized path variables
  if (realizedPath) {
    worldVars.invested_base_for_return = realizedPath.investedBaseForReturn;
    worldVars.asset_weights = realizedPath.assetWeights;
    worldVars.weighted_return = realizedPath.weightedReturn;
    worldVars.computed_growth_dollars = realizedPath.computedGrowthDollars;

    // Include volatility state if available
    if (realizedPath.spyVolatility !== undefined || realizedPath.bndVolatility !== undefined) {
      worldVars.volatility_state = {
        spy: realizedPath.spyVolatility || 0,
        bnd: realizedPath.bndVolatility || 0,
        intl: realizedPath.intlVolatility,
      };
    }
  }

  return worldVars;
}

/**
 * Build growth components for invested drivers breakdown
 *
 * @param invPostTransfer - Invested balance after transfers (before returns)
 * @param actualImpact - Engine's calculated investment growth (source of truth)
 */
function buildGrowthComponents(
  month: string,
  invPostTransfer: Money,
  returns: StochasticReturns,
  equityAllocation: number,
  actualImpact: Money
): GrowthComponent[] {
  const components: GrowthComponent[] = [];
  const bondAllocation = 1 - equityAllocation;

  const equityPortion = invPostTransfer * equityAllocation;
  const bondPortion = invPostTransfer * bondAllocation;

  const equityReturn = returns.SPY || 0;
  const bondReturn = returns.BND || 0;

  const equityImpact = equityPortion * equityReturn;
  const bondImpact = bondPortion * bondReturn;
  const calculatedImpact = equityImpact + bondImpact;

  if (Math.abs(equityImpact) > 0.001 || equityReturn !== 0) {
    components.push({
      label: 'Equity impact',
      amount: equityImpact,
      formula: `$${formatNumber(equityPortion)} × ${formatPercent(equityReturn)}`,
    });
  }

  if (Math.abs(bondImpact) > 0.001 || bondReturn !== 0) {
    components.push({
      label: 'Bond impact',
      amount: bondImpact,
      formula: `$${formatNumber(bondPortion)} × ${formatPercent(bondReturn)}`,
    });
  }

  // Add residual if calculated doesn't match actual (due to per-account allocations, etc.)
  const residual = actualImpact - calculatedImpact;
  if (Math.abs(residual) > 0.01) {
    components.push({
      label: 'Other/Residual',
      amount: residual,
      formula: `Engine value - (equity + bond)`,
    });
  }

  return components;
}

/**
 * Determine breach status based on cash end and floor
 */
function determineBreachStatus(cashEnd: Money, cashFloor: Money): BreachStatus {
  if (cashEnd < 0) return 'Negative';
  if (cashEnd < cashFloor) return 'Floor';
  return 'No';
}

/**
 * Format number for display in formulas
 */
function formatNumber(value: number): string {
  return Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format percent for display in formulas
 */
function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(2)}%`;
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { calculateInvestedTotal, calculateOperatingFlow, determineBreachStatus };
