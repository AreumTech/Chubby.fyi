/**
 * ConsistencyPanel - Verify mode summary panel
 *
 * Appears above the trace table when Verify Mode is enabled.
 * Shows:
 * - Global reconciliation status
 * - Jump links to "interesting months"
 * - Rounding policy info
 */

import React, { useState, useCallback } from 'react';
import type { TraceSummary, TraceRow, TraceData } from '../../types/traceTypes';
import { RECONCILE_TOLERANCE } from '../../types/traceTypes';
import { formatCurrencyShort } from '@/utils/formatting';
import { generateTraceExport, getExportFilenames } from '../../utils/traceExport';

interface ConsistencyPanelProps {
  summary: TraceSummary;
  rows: TraceRow[];
  onJumpToMonth: (month: string) => void;
  /** Full trace data for advanced audit export */
  traceData: TraceData;
}

/**
 * Jump link component
 */
const JumpLink: React.FC<{
  label: string;
  month: string | null;
  value?: string;
  onClick: (month: string) => void;
}> = ({ label, month, value, onClick }) => {
  if (!month) {
    return (
      <div className="flex items-center gap-2 text-xs-areum text-areum-text-tertiary">
        <span>{label}:</span>
        <span className="text-areum-success">None</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs-areum">
      <span className="text-areum-text-tertiary">{label}:</span>
      <button
        onClick={() => onClick(month)}
        className="text-areum-accent hover:underline"
      >
        {month}
      </button>
      {value && (
        <span className="text-areum-text-tertiary">({value})</span>
      )}
    </div>
  );
};

export const ConsistencyPanel: React.FC<ConsistencyPanelProps> = ({
  summary,
  rows,
  onJumpToMonth,
  traceData,
}) => {
  const [showRoundingPolicy, setShowRoundingPolicy] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'done'>('idle');

  // Advanced audit export - downloads all 4 files
  const handleAuditExport = useCallback(async () => {
    setExportStatus('exporting');
    try {
      const exportPack = generateTraceExport(traceData);
      const filenames = getExportFilenames();

      // Download each file
      const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      // Small delay between downloads to prevent browser blocking
      downloadFile(exportPack.summary, filenames.summary, 'text/tab-separated-values');
      await new Promise((r) => setTimeout(r, 100));
      downloadFile(exportPack.flows, filenames.flows, 'text/tab-separated-values');
      await new Promise((r) => setTimeout(r, 100));
      downloadFile(exportPack.worldVars, filenames.worldVars, 'text/tab-separated-values');
      await new Promise((r) => setTimeout(r, 100));
      downloadFile(exportPack.meta, filenames.meta, 'application/json');

      setExportStatus('done');
      setTimeout(() => setExportStatus('idle'), 2000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('idle');
    }
  }, [traceData]);

  const allReconciled = summary.reconciledMonths === summary.totalMonths;
  const mismatchCount = summary.totalMonths - summary.reconciledMonths;

  // Find values for display
  const largestTransferRow = summary.largestTransferMonth
    ? rows.find((r) => r.month === summary.largestTransferMonth)
    : null;
  const largestTransferValue = largestTransferRow?.transfer_cash ?? null;

  const largestNegativeReturnRow = summary.largestNegativeReturnMonth
    ? rows.find((r) => r.month === summary.largestNegativeReturnMonth)
    : null;
  const largestNegativeReturnValue = largestNegativeReturnRow?.market_return_impact ?? null;

  return (
    <div className="mb-4 p-3 bg-areum-canvas border border-areum-border rounded-md-areum">
      <div className="flex flex-wrap items-start gap-6">
        {/* Global status */}
        <div className="flex-shrink-0">
          <div className="text-xs-areum font-semibold text-areum-text-secondary uppercase tracking-wide mb-1">
            Consistency
          </div>
          {allReconciled ? (
            <div className="flex items-center gap-1.5 text-sm-areum text-areum-success">
              <span>✓</span>
              <span>All months reconcile within tolerance</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm-areum text-areum-danger">
              <span>✗</span>
              <span>Mismatch in {mismatchCount} month{mismatchCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Jump links */}
        <div className="flex-1">
          <div className="text-xs-areum font-semibold text-areum-text-secondary uppercase tracking-wide mb-1">
            Jump to
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
            <JumpLink
              label="First floor breach"
              month={summary.firstBreachMonth}
              onClick={onJumpToMonth}
            />
            <JumpLink
              label="First negative cash"
              month={summary.firstNegativeCashMonth}
              onClick={onJumpToMonth}
            />
            <JumpLink
              label="First mismatch"
              month={summary.firstMismatchMonth}
              onClick={onJumpToMonth}
            />
            <JumpLink
              label="Largest transfer"
              month={summary.largestTransferMonth}
              value={largestTransferValue !== null ? formatCurrencyShort(Math.abs(largestTransferValue)) : undefined}
              onClick={onJumpToMonth}
            />
            <JumpLink
              label="Largest negative return"
              month={summary.largestNegativeReturnMonth}
              value={largestNegativeReturnValue !== null ? formatCurrencyShort(largestNegativeReturnValue) : undefined}
              onClick={onJumpToMonth}
            />
            <JumpLink
              label="Worst drawdown"
              month={summary.worstDrawdownMonth}
              onClick={onJumpToMonth}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-3">
          <button
            onClick={() => setShowRoundingPolicy(!showRoundingPolicy)}
            className="text-xs-areum text-areum-accent hover:underline"
          >
            {showRoundingPolicy ? 'Hide' : 'Show'} rounding policy
          </button>
          <button
            onClick={handleAuditExport}
            disabled={exportStatus === 'exporting'}
            className="text-xs-areum text-areum-accent hover:underline disabled:opacity-50"
          >
            {exportStatus === 'exporting' ? 'Exporting...' : exportStatus === 'done' ? 'Exported ✓' : 'Export audit data'}
          </button>
        </div>
      </div>

      {/* Rounding policy details */}
      {showRoundingPolicy && (
        <div className="mt-3 pt-3 border-t border-areum-border/50">
          <div className="text-xs-areum text-areum-text-tertiary space-y-1">
            <p>
              <strong>Storage:</strong> Values are stored in cents (integer precision) to avoid floating-point errors.
            </p>
            <p>
              <strong>Display:</strong> Values are rounded to whole dollars for display; full precision preserved for calculations.
            </p>
            <p>
              <strong>Tolerance:</strong> Reconciliation allows up to ${RECONCILE_TOLERANCE.toFixed(2)} difference
              due to cent-level rounding across operations.
            </p>
            <p>
              <strong>Invariant:</strong> Each month, Cash + Invested changes only via operating flow,
              transfers, and market return impact.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsistencyPanel;
