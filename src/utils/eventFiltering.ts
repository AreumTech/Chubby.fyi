/**
 * Event filtering utilities for deterministic simulation views
 *
 * Filters out "no-op" events - events that execute but have zero impact
 * on any account balances or net worth.
 */

import type { EventTraceEntry, StrategyExecution } from '@/types/api/payload';

/**
 * Determine if an event trace entry had meaningful impact
 *
 * An event is meaningful if ANY of these changed:
 * - Net worth
 * - Cash balance
 * - Taxable account balance
 * - Tax-deferred account balance
 * - Roth account balance
 * - Has strategy transactions with non-zero amounts
 */
export function isEventMeaningful(event: EventTraceEntry): boolean {
  // Check net worth change
  if (event.netWorthAfter !== event.netWorthBefore) return true;

  // Check any account balance change
  if (event.cashAfter !== event.cashBefore) return true;
  if (event.taxableAfter !== event.taxableBefore) return true;
  if (event.taxDeferredAfter !== event.taxDeferredBefore) return true;
  if (event.rothAfter !== event.rothBefore) return true;

  // For strategy events, check for actual transactions
  if (event.strategyTrace?.transactions?.length) {
    const hasNonZeroTransaction = event.strategyTrace.transactions.some(
      tx => tx.amount !== 0 || (tx.taxImpact !== undefined && tx.taxImpact !== 0)
    );
    if (hasNonZeroTransaction) return true;
  }

  return false;
}

/**
 * Determine if a strategy execution had meaningful impact
 */
export function isStrategyExecutionMeaningful(exec: StrategyExecution): boolean {
  return exec.amount !== 0 || (exec.taxImpact !== undefined && exec.taxImpact !== 0);
}

/**
 * Filter event trace to only meaningful events
 */
export function filterMeaningfulEvents(events: EventTraceEntry[]): EventTraceEntry[] {
  return events.filter(isEventMeaningful);
}

/**
 * Filter strategy executions to only meaningful ones
 */
export function filterMeaningfulStrategyExecutions(executions: StrategyExecution[]): StrategyExecution[] {
  return executions.filter(isStrategyExecutionMeaningful);
}
