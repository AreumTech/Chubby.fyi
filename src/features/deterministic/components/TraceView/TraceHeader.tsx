/**
 * TraceHeader - Header section for the Simulation Trace View
 *
 * Displays:
 * - Scenario/Path/Ordering pills
 * - Invariant status with tooltip
 * - Reconcile status (clickable to jump to first mismatch)
 * - Educational banner
 * - Verify mode toggle
 */

import React from 'react';
import type { TraceRunMeta, TraceSummary } from '../../types/traceTypes';
import { RECONCILE_TOLERANCE } from '../../types/traceTypes';
import { formatCurrencyShort } from '@/utils/formatting';

interface TraceHeaderProps {
  meta: TraceRunMeta;
  summary: TraceSummary;
  verifyMode: boolean;
  onVerifyModeChange: (enabled: boolean) => void;
  onJumpToMonth?: (month: string) => void;
}

/**
 * Pill component for metadata display
 */
const Pill: React.FC<{
  label: string;
  value: string;
  tooltip?: string;
}> = ({ label, value, tooltip }) => (
  <div
    className="inline-flex items-center gap-1.5 px-2 py-1 bg-areum-canvas border border-areum-border rounded-sm-areum text-xs-areum"
    title={tooltip}
  >
    <span className="text-areum-text-tertiary">{label}:</span>
    <span className="text-areum-text-primary font-medium">{value}</span>
  </div>
);

/**
 * Reconcile status badge
 */
const ReconcileStatus: React.FC<{
  summary: TraceSummary;
  onJumpToMismatch?: () => void;
}> = ({ summary, onJumpToMismatch }) => {
  const allReconciled = summary.reconciledMonths === summary.totalMonths;
  const mismatchCount = summary.totalMonths - summary.reconciledMonths;

  if (allReconciled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-areum-success-bg border border-areum-success/30 rounded-sm-areum text-xs-areum">
        <span className="text-areum-success">✓</span>
        <span className="text-areum-success font-medium">
          {summary.totalMonths}/{summary.totalMonths} months reconcile
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onJumpToMismatch}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-areum-danger-bg border border-areum-danger/30 rounded-sm-areum text-xs-areum hover:bg-areum-danger/10 transition-colors"
    >
      <span className="text-areum-danger">✗</span>
      <span className="text-areum-danger font-medium">
        {mismatchCount} month{mismatchCount !== 1 ? 's' : ''} mismatch
      </span>
    </button>
  );
};

export const TraceHeader: React.FC<TraceHeaderProps> = ({
  meta,
  summary,
  verifyMode,
  onVerifyModeChange,
  onJumpToMonth,
}) => {
  const handleJumpToMismatch = () => {
    if (summary.firstMismatchMonth && onJumpToMonth) {
      onJumpToMonth(summary.firstMismatchMonth);
    }
  };

  return (
    <div className="space-y-3">
      {/* Educational banner */}
      <div className="px-3 py-2 bg-areum-canvas border border-areum-border rounded-sm-areum">
        <div className="text-xs-areum text-areum-text-secondary text-center">
          Educational simulation only • Results are conditional on assumptions • Not financial advice
        </div>
      </div>

      {/* Pills row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Left side: Metadata pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Pill
            label="Scenario"
            value={formatScenarioId(meta.scenario_id)}
            tooltip={`Scenario ID: ${meta.scenario_id}`}
          />
          <Pill
            label="Mode"
            value={formatSimulationMode(meta.simulation_mode, meta.seed)}
            tooltip={getSimulationModeTooltip(meta.simulation_mode, meta.seed, meta.model_description)}
          />
          <Pill
            label="Ordering"
            value={formatTimeConvention(meta.time_convention)}
            tooltip={meta.time_convention.replace(/->/g, ' → ').replace(/\(EOM\)/, '(End of Month)')}
          />
          <Pill
            label="Allocation"
            value={`${Math.round(meta.equity_allocation * 100)}/${Math.round((1 - meta.equity_allocation) * 100)}`}
            tooltip={`Equity/Bond allocation used for return attribution: ${(meta.equity_allocation * 100).toFixed(0)}% equity, ${((1 - meta.equity_allocation) * 100).toFixed(0)}% bonds`}
          />
          {meta.cash_floor > 0 && (
            <Pill
              label="Cash Floor"
              value={formatCurrencyShort(meta.cash_floor)}
              tooltip={`Configured cash reserve threshold. Breach = End Cash < ${formatCurrencyShort(meta.cash_floor)}`}
            />
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side: Status and toggle */}
        <div className="flex items-center gap-3">
          {/* Invariant text */}
          <div
            className="text-xs-areum text-areum-text-tertiary cursor-help"
            title={`Cash + Invested changes only via operating flow, transfers, and market return impact. Tolerance: $${RECONCILE_TOLERANCE.toFixed(2)}`}
          >
            Each month conserves value
          </div>

          {/* Reconcile status */}
          <ReconcileStatus
            summary={summary}
            onJumpToMismatch={handleJumpToMismatch}
          />

          {/* Verify mode toggle */}
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={verifyMode}
              onChange={(e) => onVerifyModeChange(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-areum-border text-areum-accent focus:ring-areum-accent/30"
            />
            <span className="text-xs-areum text-areum-text-secondary">
              Verify mode
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

/**
 * Format scenario ID for display
 */
function formatScenarioId(id: string): string {
  switch (id) {
    case 'baseline':
      return 'Baseline';
    case 'variant_a':
      return 'Variant A';
    case 'variant_b':
      return 'Variant B';
    default:
      return id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
  }
}

/**
 * Format time convention for short display
 * e.g., "OperatingFlow->Transfers->MarketReturnImpact(EOM)" -> "Flow → Transfer → Returns"
 */
function formatTimeConvention(convention: string): string {
  // Extract the main components and format them
  return convention
    .replace('OperatingFlow', 'Flow')
    .replace('Transfers', 'Transfer')
    .replace('MarketReturnImpact', 'Returns')
    .replace(/\(EOM\)/g, '')
    .replace(/->/g, ' → ')
    .trim();
}

/**
 * Format simulation mode for display
 */
function formatSimulationMode(mode?: 'deterministic' | 'stochastic', seed?: number): string {
  if (mode === 'stochastic') {
    return seed ? `Stochastic #${seed}` : 'Stochastic';
  }
  return 'Deterministic';
}

/**
 * Get tooltip for simulation mode
 */
function getSimulationModeTooltip(
  mode?: 'deterministic' | 'stochastic',
  seed?: number,
  modelDescription?: string
): string {
  if (mode === 'stochastic') {
    const parts = ['One illustrative path with seeded random returns'];
    if (seed) parts.push(`seed=${seed}`);
    if (modelDescription) parts.push(modelDescription);
    return parts.join(' • ');
  }
  return 'Uses mean expected returns (no randomness)';
}

export default TraceHeader;
