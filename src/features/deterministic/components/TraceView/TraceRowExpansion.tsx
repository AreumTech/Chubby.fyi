/**
 * TraceRowExpansion - 3-panel expansion drawer for trace rows
 *
 * Panel A: "Show the math" - equations with substituted values
 * Panel B: "Cash drivers" - grouped FlowItems with subtotals
 * Panel C: "Invested drivers" - world vars + return breakdown
 */

import React, { useState, useMemo } from 'react';
import type {
  TraceRow,
  FlowItem,
  FlowGroup,
  Transfer,
  GrowthComponent,
  WorldVars,
} from '../../types/traceTypes';
import type { EventTraceEntry } from '@/types/api/payload';
import { RECONCILE_TOLERANCE, TIME_CONVENTION } from '../../types/traceTypes';
import { formatCurrencyShort } from '@/utils/formatting';

interface TraceRowExpansionProps {
  row: TraceRow;
  flowItems: FlowItem[];
  transfers: Transfer[];
  growthComponents: GrowthComponent[];
  worldVars?: WorldVars;
  verifyMode: boolean;
  width: number;
  /** Equity allocation (0-1) for display in Panel C */
  equityAllocation: number;
  /** Event lookup for Source Events section */
  eventLookup: Map<string, EventTraceEntry>;
}

// =============================================================================
// SOURCE EVENT TYPES
// =============================================================================

/** Aggregated source event for display */
interface SourceEventDisplay {
  eventId: string;
  eventName: string;
  eventType: string;
  totalAmount: number;
  bucketImpact: 'Cash ↑' | 'Cash ↓' | 'Cash ↓ / Invested ↑' | 'Cash ↑ / Invested ↓' | '—';
  isStrategy: boolean;
  strategyTrace?: EventTraceEntry['strategyTrace'];
}

// =============================================================================
// PANEL A: SHOW THE MATH
// =============================================================================

const PanelA: React.FC<{
  row: TraceRow;
  verifyMode: boolean;
}> = ({ row, verifyMode }) => {
  const cashOk = Math.abs(row.cash_delta) <= RECONCILE_TOLERANCE;
  const invOk = Math.abs(row.inv_delta) <= RECONCILE_TOLERANCE;
  const reconcileOk = row.reconcile_delta <= RECONCILE_TOLERANCE;

  return (
    <div className="space-y-1.5">
      <div className="font-semibold text-areum-text-secondary text-xs-areum uppercase tracking-wide">
        Show the math
      </div>

      {/* Cash equation: start + opFlow + xfer = end */}
      <div className="text-xs-areum font-mono leading-snug">
        <span className="text-areum-text-tertiary">Cash </span>
        <span className="text-areum-text-primary">{formatCurrencyShort(row.cash_start)}</span>
        <span className="text-areum-text-tertiary"> + </span>
        <span className={row.operating_flow >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
          {formatCurrencyShort(row.operating_flow)}
        </span>
        <span className="text-areum-text-tertiary"> + </span>
        <span className={row.transfer_cash >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
          {formatCurrencyShort(row.transfer_cash)}
        </span>
        <span className="text-areum-text-tertiary"> = </span>
        <span className="text-areum-text-primary">{formatCurrencyShort(row.cash_end)}</span>
        {' '}
        {cashOk ? (
          <span className="text-areum-success">✓</span>
        ) : (
          <span className="text-areum-danger">✗Δ{formatCurrencyShort(row.cash_delta)}</span>
        )}
      </div>

      {/* Invested equation: start + mkt − xfer = end */}
      <div className="text-xs-areum font-mono leading-snug">
        <span className="text-areum-text-tertiary">Inv </span>
        <span className="text-areum-text-primary">{formatCurrencyShort(row.inv_start)}</span>
        <span className="text-areum-text-tertiary"> + </span>
        <span className={row.market_return_impact >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
          {formatCurrencyShort(row.market_return_impact)}
        </span>
        <span className="text-areum-text-tertiary"> − </span>
        <span className={row.transfer_cash >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
          {formatCurrencyShort(row.transfer_cash)}
        </span>
        <span className="text-areum-text-tertiary"> = </span>
        <span className="text-areum-text-primary">{formatCurrencyShort(row.inv_end)}</span>
        {' '}
        {invOk ? (
          <span className="text-areum-success">✓</span>
        ) : (
          <span className="text-areum-danger">✗Δ{formatCurrencyShort(row.inv_delta)}</span>
        )}
      </div>

      {/* Reconcile + ordering on one line */}
      <div className="flex items-center gap-3 text-xs-areum text-areum-text-tertiary pt-1 border-t border-areum-border/20">
        <span className="font-mono">
          Δ{' '}
          <span className={reconcileOk ? 'text-areum-success' : 'text-areum-danger'}>
            {reconcileOk ? '$0 ✓' : `$${row.reconcile_delta.toFixed(2)} ✗`}
          </span>
        </span>
        <span className="truncate" title={TIME_CONVENTION.replace(/->/g, ' → ')}>
          {TIME_CONVENTION.replace(/->/g, '→')}
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// PANEL B: CASH DRIVERS
// =============================================================================

const PanelB: React.FC<{
  flowItems: FlowItem[];
  transfers: Transfer[];
  operatingFlow: number;
  verifyMode: boolean;
  eventLookup: Map<string, EventTraceEntry>;
  eventIds: string[];
}> = ({ flowItems, transfers, operatingFlow, verifyMode, eventLookup, eventIds }) => {
  const [showSourceEvents, setShowSourceEvents] = useState(true); // Default expanded
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Build source events directly from row's eventIds + eventLookup
  const sourceEvents = useMemo<SourceEventDisplay[]>(() => {
    const events: SourceEventDisplay[] = [];
    const seenIds = new Set<string>();

    for (const eventId of eventIds) {
      // Skip duplicates (same event can appear multiple times)
      if (seenIds.has(eventId)) continue;
      seenIds.add(eventId);

      const eventMeta = eventLookup.get(eventId);
      if (!eventMeta) continue;

      const isStrategy = eventMeta.eventType === 'STRATEGY_POLICY' || eventMeta.eventType === 'STRATEGY_EXECUTION';
      const cashDelta = (eventMeta.cashAfter ?? 0) - (eventMeta.cashBefore ?? 0);
      const invBefore = (eventMeta.taxableBefore ?? 0) + (eventMeta.taxDeferredBefore ?? 0) + (eventMeta.rothBefore ?? 0);
      const invAfter = (eventMeta.taxableAfter ?? 0) + (eventMeta.taxDeferredAfter ?? 0) + (eventMeta.rothAfter ?? 0);
      const invDelta = invAfter - invBefore;
      const amount = cashDelta;

      // Determine bucket impact from event type
      let bucketImpact: SourceEventDisplay['bucketImpact'];
      const eventType = eventMeta.eventType;

      if (Math.abs(cashDelta) > 0.001 && Math.abs(invDelta) > 0.001 && Math.abs(cashDelta + invDelta) <= 0.01) {
        bucketImpact = cashDelta > 0 ? 'Cash ↑ / Invested ↓' : 'Cash ↓ / Invested ↑';
      } else if (eventType === 'SCHEDULED_CONTRIBUTION' || eventType === 'CONTRIBUTION') {
        bucketImpact = 'Cash ↓ / Invested ↑';
      } else if (eventType === 'WITHDRAWAL') {
        bucketImpact = 'Cash ↑ / Invested ↓';
      } else if (eventType === 'INCOME' || eventType === 'CASHFLOW_INCOME') {
        bucketImpact = 'Cash ↑';
      } else if (eventType === 'EXPENSE' || eventType === 'CASHFLOW_EXPENSE' || eventType === 'RECURRING_EXPENSE' || eventType.includes('EXPENSE')) {
        bucketImpact = 'Cash ↓';
      } else if (eventType.includes('ADJUST_CASH_RESERVE')) {
        // Cash management strategies
        bucketImpact = eventType.includes('SELL') ? 'Cash ↑ / Invested ↓' : 'Cash ↓ / Invested ↑';
      } else if (isStrategy) {
        bucketImpact = '—';
      } else {
        // Infer from amount sign
        bucketImpact = amount >= 0 ? 'Cash ↑' : 'Cash ↓';
      }

      events.push({
        eventId,
        eventName: eventMeta.eventName,
        eventType: eventMeta.eventType,
        totalAmount: amount,
        bucketImpact,
        isStrategy,
        strategyTrace: eventMeta.strategyTrace,
      });
    }

    // Sort by absolute amount (largest impact first), strategies last
    return events.sort((a, b) => {
      if (a.isStrategy && !b.isStrategy) return 1;
      if (!a.isStrategy && b.isStrategy) return -1;
      return Math.abs(b.totalAmount) - Math.abs(a.totalAmount);
    });
  }, [eventIds, eventLookup]);

  // Limit display to first 8 unless expanded
  const displayLimit = 8;
  const visibleEvents = showSourceEvents ? sourceEvents : sourceEvents.slice(0, displayLimit);
  const hasMore = sourceEvents.length > displayLimit;
  // Group flow items
  const groups: Record<FlowGroup, FlowItem[]> = {
    Income: [],
    Spending: [],
    Debt: [],
    OneTime: [],
    Other: [],
  };

  for (const item of flowItems) {
    groups[item.group].push(item);
  }

  // Calculate subtotals
  const subtotals = {
    Income: groups.Income.reduce((sum, i) => sum + i.amount, 0),
    Spending: groups.Spending.reduce((sum, i) => sum + i.amount, 0),
    Debt: groups.Debt.reduce((sum, i) => sum + i.amount, 0),
    OneTime: groups.OneTime.reduce((sum, i) => sum + i.amount, 0),
    Other: groups.Other.reduce((sum, i) => sum + i.amount, 0),
  };

  const calculatedOperatingFlow =
    subtotals.Income + subtotals.Spending + subtotals.Debt + subtotals.OneTime + subtotals.Other;
  const subtotalOk = Math.abs(calculatedOperatingFlow - operatingFlow) <= RECONCILE_TOLERANCE;

  return (
    <div className="space-y-3">
      <div className="font-semibold text-areum-text-secondary text-xs-areum uppercase tracking-wide">
        Cash drivers
      </div>

      {/* Flow item groups */}
      <div className="space-y-2 text-xs-areum">
        {(['Income', 'Spending', 'Debt', 'OneTime', 'Other'] as FlowGroup[]).map((group) => {
          const items = groups[group];
          if (items.length === 0) return null;

          return (
            <div key={group}>
              <div className="font-medium text-areum-text-secondary mb-0.5">{group}</div>
              <div className="space-y-0.5 text-areum-text-tertiary pl-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="flex items-center gap-1">
                      {item.label}
                      {verifyMode && (
                        <span className="text-areum-text-tertiary/50 text-[10px]">
                          [{item.source}]
                        </span>
                      )}
                    </span>
                    <span className={item.amount >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                      {item.amount >= 0 ? '+' : ''}{formatCurrencyShort(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transfers (if any significant ones) */}
      {transfers.length > 0 && transfers.some((t) => Math.abs(t.amount) > 0.01) && (
        <div>
          <div className="font-medium text-areum-text-secondary text-xs-areum mb-0.5">Transfers</div>
          <div className="space-y-0.5 text-areum-text-tertiary text-xs-areum pl-2">
            {transfers.filter((t) => Math.abs(t.amount) > 0.01).map((transfer) => (
              <div key={transfer.id} className="flex justify-between">
                <span>{transfer.reason}</span>
                <span className={transfer.amount >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                  {transfer.amount >= 0 ? '+' : ''}{formatCurrencyShort(transfer.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtotal check */}
      <div className="flex items-center gap-2 pt-2 border-t border-areum-border/30">
        <span className="text-xs-areum text-areum-text-tertiary">Subtotal check:</span>
        <span className={`text-xs-areum font-mono ${subtotalOk ? 'text-areum-success' : 'text-areum-danger'}`}>
          {subtotalOk ? '✓' : '✗'}
        </span>
      </div>

      {/* Source Events - collapsible section */}
      {sourceEvents.length > 0 && (
        <div className="pt-2 border-t border-areum-border/30 overflow-hidden">
          <button
            onClick={() => setShowSourceEvents(!showSourceEvents)}
            className="flex items-center gap-1.5 text-xs-areum font-medium text-areum-text-secondary hover:text-areum-accent transition-colors w-full"
          >
            <span className="text-areum-text-tertiary flex-shrink-0">
              {showSourceEvents ? '▼' : '▶'}
            </span>
            <span className="uppercase tracking-wide flex-shrink-0">Source events</span>
            <span className="text-areum-text-tertiary flex-shrink-0">({sourceEvents.length})</span>
          </button>

          {showSourceEvents && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {visibleEvents.map((event) => (
                <div
                  key={event.eventId}
                  className={`text-xs-areum rounded overflow-hidden ${
                    event.isStrategy ? 'bg-violet-50/50' : 'bg-areum-canvas/50'
                  }`}
                >
                  {/* Event row */}
                  <div
                    className={`p-1.5 flex items-center gap-2 ${
                      event.isStrategy ? 'cursor-pointer hover:bg-violet-100/50' : ''
                    }`}
                    onClick={event.isStrategy ? () => setExpandedEventId(
                      expandedEventId === event.eventId ? null : event.eventId
                    ) : undefined}
                  >
                    {event.isStrategy && (
                      <span className="text-areum-text-tertiary text-[10px] flex-shrink-0">
                        {expandedEventId === event.eventId ? '▼' : '▶'}
                      </span>
                    )}
                    <span className="truncate text-areum-text-primary flex-1 min-w-0">
                      {event.eventName}
                    </span>
                    <span className={`font-mono flex-shrink-0 ${
                      event.totalAmount >= 0 ? 'text-areum-success' : 'text-areum-danger'
                    }`}>
                      {event.totalAmount >= 0 ? '+' : ''}{formatCurrencyShort(event.totalAmount)}
                    </span>
                  </div>
                  <div className="px-1.5 pb-1 text-[10px] text-areum-text-tertiary truncate">
                    {event.bucketImpact}
                  </div>

                  {/* Strategy expansion */}
                  {event.isStrategy && expandedEventId === event.eventId && event.strategyTrace && (
                    <div className="px-2 pb-2 border-t border-violet-100">
                      <div className="pt-1.5 space-y-1">
                        {event.strategyTrace.phase && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-medium">
                              {event.strategyTrace.phase}
                            </span>
                          </div>
                        )}
                        {event.strategyTrace.executionReason && (
                          <div className="text-areum-text-secondary">
                            {event.strategyTrace.executionReason}
                          </div>
                        )}
                        {event.strategyTrace.transactions && event.strategyTrace.transactions.length > 0 && (
                          <div className="space-y-0.5 pl-2">
                            {event.strategyTrace.transactions.map((tx, i) => (
                              <div key={i} className="flex justify-between text-[10px]">
                                <span>{tx.description}</span>
                                <span className="font-mono">
                                  {formatCurrencyShort(tx.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Show all button */}
              {hasMore && !showSourceEvents && (
                <button
                  onClick={() => setShowSourceEvents(true)}
                  className="text-xs-areum text-areum-accent hover:underline"
                >
                  Show all {sourceEvents.length} events
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// PANEL C: INVESTED DRIVERS
// =============================================================================

const PanelC: React.FC<{
  worldVars?: WorldVars;
  growthComponents: GrowthComponent[];
  marketReturnImpact: number;
  verifyMode: boolean;
  equityAllocation: number;
}> = ({ worldVars, growthComponents, marketReturnImpact, verifyMode, equityAllocation }) => {
  const bondAllocation = 1 - equityAllocation;
  const calculatedImpact = growthComponents.reduce((sum, gc) => sum + gc.amount, 0);
  const impactOk = Math.abs(calculatedImpact - marketReturnImpact) <= RECONCILE_TOLERANCE;

  // Check if we have extended stochastic data
  const hasExtendedReturns = worldVars && (
    worldVars.intl_return !== undefined ||
    worldVars.other_return !== undefined ||
    worldVars.home_return !== undefined
  );
  const hasShowTheMath = worldVars && worldVars.invested_base_for_return !== undefined;

  // Format return value for display
  const formatReturn = (value: number | undefined) => {
    if (value === undefined) return null;
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-3">
      <div
        className="font-semibold text-areum-text-secondary text-xs-areum uppercase tracking-wide cursor-help"
        title="Seeded random realizations used for this simulation path"
      >
        Realized Path Variables
      </div>

      {/* Market returns */}
      {worldVars && (
        <div>
          <div className="font-medium text-areum-text-secondary text-xs-areum mb-0.5">
            Market returns (this month)
          </div>
          <div className="space-y-0.5 text-areum-text-tertiary text-xs-areum pl-2">
            {/* Core returns - always shown */}
            <div className="flex justify-between">
              <span>SPY (US Equity):</span>
              <span className={worldVars.equity_return >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                {formatReturn(worldVars.equity_return)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>BND (US Bonds):</span>
              <span className={worldVars.bond_return >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                {formatReturn(worldVars.bond_return)}
              </span>
            </div>

            {/* Extended returns - shown if available */}
            {worldVars.intl_return !== undefined && (
              <div className="flex justify-between">
                <span>Intl Stocks:</span>
                <span className={worldVars.intl_return >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                  {formatReturn(worldVars.intl_return)}
                </span>
              </div>
            )}
            {worldVars.other_return !== undefined && (
              <div className="flex justify-between">
                <span>Other Assets:</span>
                <span className={worldVars.other_return >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                  {formatReturn(worldVars.other_return)}
                </span>
              </div>
            )}
            {worldVars.individual_stock_return !== undefined && (
              <div className="flex justify-between">
                <span>Individual Stock:</span>
                <span className={worldVars.individual_stock_return >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                  {formatReturn(worldVars.individual_stock_return)}
                </span>
              </div>
            )}
            {worldVars.home_return !== undefined && (
              <div className="flex justify-between">
                <span>Home Value:</span>
                <span className={worldVars.home_return >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                  {formatReturn(worldVars.home_return)}
                </span>
              </div>
            )}
            {worldVars.rental_return !== undefined && (
              <div className="flex justify-between">
                <span>Rental Income:</span>
                <span className={worldVars.rental_return >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                  {formatReturn(worldVars.rental_return)}
                </span>
              </div>
            )}

            {/* Inflation */}
            {worldVars.inflation !== undefined && (
              <div className="flex justify-between">
                <span>Inflation:</span>
                <span>{formatReturn(worldVars.inflation)}</span>
              </div>
            )}

            {/* Portfolio weights */}
            <div className="flex justify-between pt-1 border-t border-areum-border/20 mt-1">
              <span>Portfolio weights:</span>
              <span className="text-areum-text-primary">
                {Math.round(equityAllocation * 100)}/{Math.round(bondAllocation * 100)}
              </span>
            </div>

            {/* Volatility state in Verify mode */}
            {verifyMode && worldVars.volatility_state && (
              <div className="text-areum-text-tertiary/70 text-[10px] mt-1 pt-1 border-t border-areum-border/10">
                <div>Volatility state (GARCH):</div>
                <div className="pl-2">
                  SPY σ: {(worldVars.volatility_state.spy * 100).toFixed(1)}%
                  {' · '}
                  BND σ: {(worldVars.volatility_state.bnd * 100).toFixed(1)}%
                  {worldVars.volatility_state.intl !== undefined && (
                    <>{' · '}Intl σ: {(worldVars.volatility_state.intl * 100).toFixed(1)}%</>
                  )}
                </div>
              </div>
            )}

            {verifyMode && worldVars.series_ids && (
              <div className="text-areum-text-tertiary/70 text-[10px] mt-1">
                Series: {Object.entries(worldVars.series_ids).map(([k, v]) => `${k}=${v}`).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show the Math linkage section - only in stochastic mode with full data */}
      {hasShowTheMath && worldVars && (
        <div>
          <div className="font-medium text-areum-text-secondary text-xs-areum mb-0.5">
            Return Impact Breakdown
          </div>
          <div className="space-y-0.5 text-areum-text-tertiary text-xs-areum pl-2">
            <div className="flex justify-between">
              <span>Base invested (after transfers):</span>
              <span className="text-areum-text-primary font-mono">
                {formatCurrencyShort(worldVars.invested_base_for_return ?? 0)}
              </span>
            </div>

            {/* Asset weights breakdown */}
            {worldVars.asset_weights && Object.keys(worldVars.asset_weights).length > 0 && (
              <div className="pt-1 space-y-0.5">
                <div className="text-areum-text-tertiary/70 text-[10px]">Asset weights used:</div>
                {Object.entries(worldVars.asset_weights).map(([asset, weight]) => {
                  const returnValue = asset === 'SPY' ? worldVars.equity_return :
                    asset === 'BND' ? worldVars.bond_return :
                    asset === 'Intl' ? worldVars.intl_return :
                    asset === 'Other' ? worldVars.other_return :
                    asset === 'IndividualStock' ? worldVars.individual_stock_return : 0;
                  const impact = (worldVars.invested_base_for_return ?? 0) * weight * (returnValue ?? 0);
                  return (
                    <div key={asset} className="flex justify-between text-[10px] font-mono">
                      <span>{asset}: {(weight * 100).toFixed(1)}% × {formatReturn(returnValue)}</span>
                      <span className={impact >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                        {impact >= 0 ? '+' : ''}{formatCurrencyShort(impact)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Weighted return and computed growth */}
            {worldVars.weighted_return !== undefined && (
              <div className="flex justify-between pt-1 border-t border-areum-border/10 mt-1">
                <span>Weighted return:</span>
                <span className={worldVars.weighted_return >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                  {formatReturn(worldVars.weighted_return)}
                </span>
              </div>
            )}
            {worldVars.computed_growth_dollars !== undefined && (
              <div className="flex justify-between">
                <span>Computed growth:</span>
                <span className={`font-mono ${worldVars.computed_growth_dollars >= 0 ? 'text-areum-success' : 'text-areum-danger'}`}>
                  {worldVars.computed_growth_dollars >= 0 ? '+' : ''}{formatCurrencyShort(worldVars.computed_growth_dollars)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Growth components - legacy/fallback view */}
      {!hasShowTheMath && growthComponents.length > 0 && (
        <div>
          <div className="font-medium text-areum-text-secondary text-xs-areum mb-0.5">
            Return impact breakdown
          </div>
          <div className="space-y-0.5 text-areum-text-tertiary text-xs-areum pl-2">
            {growthComponents.map((gc, index) => (
              <div key={index} className="flex justify-between gap-4">
                <span className="flex items-center gap-1">
                  {gc.label}:
                  {verifyMode && (
                    <span className="text-areum-text-tertiary/50 text-[10px] font-mono">
                      {gc.formula}
                    </span>
                  )}
                </span>
                <span className={gc.amount >= 0 ? 'text-areum-success' : 'text-areum-danger'}>
                  {gc.amount >= 0 ? '+' : ''}{formatCurrencyShort(gc.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total check */}
      <div className="flex items-center gap-2 pt-2 border-t border-areum-border/30">
        <span className="text-xs-areum text-areum-text-tertiary">Market Return Impact:</span>
        <span className={`text-sm-areum font-mono ${marketReturnImpact >= 0 ? 'text-areum-success' : 'text-areum-danger'}`}>
          {marketReturnImpact >= 0 ? '+' : ''}{formatCurrencyShort(marketReturnImpact)}
        </span>
        <span className={`text-xs-areum ${impactOk ? 'text-areum-success' : 'text-areum-danger'}`}>
          {impactOk ? '✓' : '✗'}
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TraceRowExpansion: React.FC<TraceRowExpansionProps> = ({
  row,
  flowItems,
  transfers,
  growthComponents,
  worldVars,
  verifyMode,
  width,
  equityAllocation,
  eventLookup,
}) => {
  return (
    <div
      className="bg-areum-surface-alt/30 px-4 py-3 border-t border-areum-border/30"
      style={{ width }}
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Panel A: Show the math */}
        <div className="border-r border-areum-border/30 pr-4">
          <PanelA row={row} verifyMode={verifyMode} />
        </div>

        {/* Panel B: Cash drivers */}
        <div className="border-r border-areum-border/30 pr-4">
          <PanelB
            flowItems={flowItems}
            transfers={transfers}
            operatingFlow={row.operating_flow}
            verifyMode={verifyMode}
            eventLookup={eventLookup}
            eventIds={row.eventIds}
          />
        </div>

        {/* Panel C: Invested drivers */}
        <div>
          <PanelC
            worldVars={worldVars}
            growthComponents={growthComponents}
            marketReturnImpact={row.market_return_impact}
            verifyMode={verifyMode}
            equityAllocation={equityAllocation}
          />
        </div>
      </div>
    </div>
  );
};

export default TraceRowExpansion;
