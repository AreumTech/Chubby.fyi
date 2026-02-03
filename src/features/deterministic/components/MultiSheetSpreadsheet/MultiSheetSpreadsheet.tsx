/**
 * SimulationTraceView - TRACE.md compliant simulation trace display
 *
 * Implements the split-stream, month-by-month simulation trace per TRACE.md:
 * - Two-bucket model: Cash (liquidity) vs Invested (market-exposed)
 * - Conservation-law invariants with visible reconciliation
 * - Progressive disclosure (expandable rows, Verify mode)
 * - 12-column main table with cash stream, invested stream, and reconciliation
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { DeterministicMonthState, DeterministicAssumptions, EventTraceEntry, RealizedMonthVariables } from '@/types/api/payload';
import { CopyButton } from './components/CopyButton';
import { TraceHeader, TraceSheet, ConsistencyPanel } from '../TraceView';
import { transformToTraceData } from '../../utils/transformToTraceData';
import { generateTraceExport } from '../../utils/traceExport';
import { useAppStore } from '@/store/appStore';

interface SimulationTraceViewProps {
  comprehensiveStates?: DeterministicMonthState[];
  assumptions?: DeterministicAssumptions;
  eventTrace?: EventTraceEntry[];
  className?: string;
  /** Simulation mode: deterministic (mean returns) or stochastic (seeded random) */
  simulationMode?: 'deterministic' | 'stochastic';
  /** Random seed used for stochastic simulation (enables reproducibility) */
  seed?: number;
  /** Model description for stochastic mode display */
  modelDescription?: string;
  /** Realized path variables for stochastic mode - per-month market realizations with "show the math" linkage */
  realizedPathVariables?: RealizedMonthVariables[];
}

/**
 * SimulationTraceView: TRACE.md compliant simulation trace
 *
 * Features per TRACE.md spec:
 * - 12-column virtualized table (Cash/Invested/Totals)
 * - Progressive disclosure (3-panel row expansion)
 * - Verify mode with consistency checks
 * - Copy-to-clipboard for Google Sheets
 * - Conservation law invariants
 */
export const MultiSheetSpreadsheet: React.FC<SimulationTraceViewProps> = ({
  comprehensiveStates,
  assumptions,
  eventTrace = [],
  className = '',
  simulationMode = 'deterministic',
  seed,
  modelDescription,
  realizedPathVariables,
}) => {
  const [verifyMode, setVerifyMode] = useState(false);

  // Ref for jump-to-month functionality
  const jumpToMonthRef = useRef<((month: string) => void) | null>(null);

  // Get policy settings from store for cash floor and allocation
  // Note: Select raw scenario data to avoid infinite re-render from getter returning new object
  const activeScenarioId = useAppStore((state) => state.activeScenarioId);
  const scenarios = useAppStore((state) => state.scenarios);
  const policySettings = useMemo(() => {
    const activeScenario = scenarios[activeScenarioId];
    return activeScenario?.policySettings || {
      cashManagement: { enabled: false },
      assetAllocation: { enabled: false },
    };
  }, [scenarios, activeScenarioId]);

  const hasComprehensiveData = comprehensiveStates && comprehensiveStates.length > 0;

  // Compute cash floor from user's targetReserveMonths × average monthly expenses
  const cashFloor = useMemo(() => {
    const targetMonths = policySettings.cashManagement?.targetReserveMonths;
    if (!targetMonths || !hasComprehensiveData) return 0;

    // Calculate average monthly expenses from the simulation data
    const totalExpenses = comprehensiveStates!.reduce(
      (sum, state) => sum + state.flows.totalExpenses,
      0
    );
    const avgMonthlyExpenses = totalExpenses / comprehensiveStates!.length;
    return targetMonths * avgMonthlyExpenses;
  }, [policySettings.cashManagement?.targetReserveMonths, comprehensiveStates, hasComprehensiveData]);

  // Compute equity allocation from user's asset allocation settings
  const equityAllocation = useMemo(() => {
    const allocation = policySettings.assetAllocation?.targetAllocation;
    if (!allocation || !policySettings.assetAllocation?.enabled) {
      return 0.6; // Default 60/40
    }

    // Sum domestic and international stock allocations
    const domesticStock = allocation['domesticStock'] || allocation['domestic_stock'] || 0;
    const internationalStock = allocation['internationalStock'] || allocation['international_stock'] || 0;
    const totalEquity = domesticStock + internationalStock;

    // If no allocation configured, use default
    return totalEquity > 0 ? totalEquity : 0.6;
  }, [policySettings.assetAllocation]);

  // Get initial account values from scenario for correct month 0 reconciliation
  // This avoids the circular calculation bug where start values were derived from end - flows
  const { initialCash, initialInvested, initialAccountBalances } = useMemo(() => {
    const activeScenario = scenarios[activeScenarioId];
    const initialState = activeScenario?.initialState;

    if (!initialState) {
      return { initialCash: undefined, initialInvested: undefined, initialAccountBalances: undefined };
    }

    // Initial cash from the InitialStateEvent
    const cash = initialState.initialCash || 0;

    // Sum investment accounts: taxable + tax_deferred + roth
    // Each account is an array of Holding objects with currentMarketValueTotal
    const accounts = initialState.initialAccounts || {};
    let invested = 0;

    // Helper to sum holdings in an account
    const sumHoldings = (holdings: any): number => {
      if (typeof holdings === 'number') return holdings;
      if (!holdings) return 0;
      if (Array.isArray(holdings)) {
        return holdings.reduce((sum, h) => sum + (h.currentMarketValueTotal || 0), 0);
      }
      if (typeof holdings === 'object' && holdings.totalValue !== undefined) {
        return Number(holdings.totalValue) || 0;
      }
      return 0;
    };

    const taxable = sumHoldings(accounts.taxable);
    const taxDeferred = sumHoldings(accounts.tax_deferred);
    const roth = sumHoldings(accounts.roth);
    const hsa = sumHoldings(accounts.hsa);
    const fiveTwoNine = sumHoldings(accounts.fiveTwoNine);

    invested += taxable + taxDeferred + roth + hsa + fiveTwoNine;

    return {
      initialCash: cash,
      initialInvested: invested,
      initialAccountBalances: {
        cash,
        taxable,
        taxDeferred,
        roth,
        hsa,
        fiveTwoNine,
      },
    };
  }, [scenarios, activeScenarioId]);

  // Transform data for trace view
  const traceData = useMemo(() => {
    if (!hasComprehensiveData || !assumptions) return null;
    return transformToTraceData(comprehensiveStates!, assumptions, {
      scenarioId: 'baseline', // Future: from scenario selection UI
      seed: seed ?? 1234,
      cashFloor,
      equityAllocation,
      eventTrace,
      // Pass initial values for correct month 0 reconciliation
      initialCash,
      initialInvested,
      initialAccountBalances,
      // Simulation mode for header display and world vars formatting
      simulationMode,
      modelDescription,
      // Realized path variables with "show the math" linkage (stochastic mode)
      realizedPathVariables,
    });
  }, [comprehensiveStates, assumptions, hasComprehensiveData, cashFloor, equityAllocation, eventTrace, initialCash, initialInvested, simulationMode, seed, modelDescription, realizedPathVariables]);

  // Handle copy to clipboard (TSV format for Google Sheets)
  const handleCopy = useCallback(() => {
    if (!traceData) return '';
    return generateTraceExport(traceData).summary;
  }, [traceData]);

  // Handle jump to month from header or consistency panel
  const handleJumpToMonth = useCallback((month: string) => {
    if (jumpToMonthRef.current) {
      jumpToMonthRef.current(month);
    }
  }, []);

  // Empty state when no data
  if (!traceData) {
    return (
      <div className={`bg-areum-surface rounded-md-areum border border-areum-border ${className}`}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-sm-areum text-areum-text-secondary">
            Run simulation to see the trace view
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-areum-surface rounded-md-areum border border-areum-border ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-areum-border">
        <div className="text-sm-areum font-semibold text-areum-text-primary">
          Simulation Trace
        </div>

        <div className="flex items-center gap-3">
          {/* Copy button */}
          <CopyButton
            onCopy={handleCopy}
            label="Copy to Sheets"
          />
        </div>
      </div>

      {/* Trace content */}
      <div className="p-4 space-y-4">
        {/* Trace header with scenario/path info and verify toggle */}
        <TraceHeader
          meta={traceData.meta}
          summary={traceData.summary}
          verifyMode={verifyMode}
          onVerifyModeChange={setVerifyMode}
          onJumpToMonth={handleJumpToMonth}
        />

        {/* Consistency panel (Verify mode) */}
        {verifyMode && (
          <ConsistencyPanel
            summary={traceData.summary}
            rows={traceData.rows}
            onJumpToMonth={handleJumpToMonth}
            traceData={traceData}
          />
        )}

        {/* Main trace table */}
        <TraceSheet
          data={traceData}
          verifyMode={verifyMode}
          jumpToMonthRef={jumpToMonthRef}
        />
      </div>

      {/* Footer with TRACE.md educational banner */}
      <div className="px-4 py-2 border-t border-areum-border bg-areum-canvas/50">
        <div className="text-xs-areum text-areum-text-tertiary text-center">
          Educational simulation only. Results are conditional on assumptions and are not advice, recommendations, or predictions.
        </div>
      </div>
    </div>
  );
};

export default MultiSheetSpreadsheet;
