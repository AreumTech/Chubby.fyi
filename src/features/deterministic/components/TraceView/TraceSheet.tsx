/**
 * TraceSheet - Main virtualized table for Simulation Trace View
 *
 * Implements the 12-column structure from TRACE.md:
 * Cash Stream: Month, Start Cash, Operating Flow, Transfer, End Cash, Cash Floor, Breach?
 * Invested Stream: Start Inv, Market Return, End Inv
 * Totals: End NW, Reconcile Δ
 *
 * Uses react-window for virtualization with 600+ rows.
 */

import React, { useState, useCallback, useMemo, useRef, type ReactElement } from 'react';
import { List, type ListImperativeAPI, type RowComponentProps } from 'react-window';
import type { TraceData, TraceRow, BreachStatus } from '../../types/traceTypes';
import { RECONCILE_TOLERANCE } from '../../types/traceTypes';
import { formatCurrencyShort } from '@/utils/formatting';
import { TraceRowExpansion } from './TraceRowExpansion';

// =============================================================================
// TYPES
// =============================================================================

interface TraceSheetProps {
  data: TraceData;
  verifyMode: boolean;
  onJumpToMonth?: (month: string) => void;
  jumpToMonthRef?: React.MutableRefObject<((month: string) => void) | null>;
}

interface ColumnDef {
  key: keyof TraceRow | 'divider';
  label: string;
  width: number;
  minWidth: number;
  align: 'left' | 'right' | 'center';
  isDivider?: boolean;
  tooltip?: string;
}

interface RowCustomProps {
  data: TraceData;
  rows: TraceRow[];
  expandedMonth: string | null;
  onRowClick: (month: string) => void;
  verifyMode: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ROW_HEIGHT = 32;
// Base height for expansion panels (headers + equations + margins)
const EXPANDED_BASE_HEIGHT = 180;
// Height per flow item line
const FLOW_ITEM_HEIGHT = 18;
// Minimum expanded height to ensure layout works
const MIN_EXPANDED_HEIGHT = 220;

const COLUMNS: ColumnDef[] = [
  // Cash stream
  { key: 'month', label: 'Month', width: 85, minWidth: 70, align: 'left' },
  { key: 'cash_start', label: 'Start Cash', width: 100, minWidth: 80, align: 'right' },
  { key: 'operating_flow', label: 'Operating Flow', width: 110, minWidth: 90, align: 'right', tooltip: 'Net change from income/spending/debt' },
  { key: 'transfer_cash', label: 'Transfer', width: 95, minWidth: 75, align: 'right', tooltip: '- = Cash→Invested, + = Invested→Cash' },
  { key: 'cash_end', label: 'End Cash', width: 100, minWidth: 80, align: 'right' },
  { key: 'cash_floor', label: 'Cash Floor', width: 90, minWidth: 70, align: 'right' },
  { key: 'breach', label: 'Breach?', width: 75, minWidth: 60, align: 'center' },
  // Divider
  { key: 'divider', label: '', width: 2, minWidth: 2, align: 'center', isDivider: true },
  // Invested stream
  { key: 'inv_start', label: 'Start Inv', width: 100, minWidth: 80, align: 'right' },
  { key: 'market_return_impact', label: 'Market Return', width: 110, minWidth: 90, align: 'right', tooltip: 'Change from market returns only' },
  { key: 'inv_end', label: 'End Inv', width: 100, minWidth: 80, align: 'right' },
  // Divider
  { key: 'divider', label: '', width: 2, minWidth: 2, align: 'center', isDivider: true },
  // Totals
  { key: 'net_worth_end', label: 'End NW', width: 100, minWidth: 80, align: 'right' },
  { key: 'reconcile_delta', label: 'Reconcile Δ', width: 95, minWidth: 80, align: 'right' },
];

// =============================================================================
// HELPERS
// =============================================================================

function formatValue(key: string, row: TraceRow): string {
  switch (key) {
    case 'month':
      return row.month;
    case 'breach':
      return row.breach;
    case 'cash_start':
    case 'operating_flow':
    case 'transfer_cash':
    case 'cash_end':
    case 'cash_floor':
    case 'inv_start':
    case 'market_return_impact':
    case 'inv_end':
    case 'net_worth_end':
      return formatCurrencyShort(row[key as keyof TraceRow] as number);
    case 'reconcile_delta':
      return formatReconcileDelta(row.reconcile_delta);
    default:
      return '';
  }
}

function formatReconcileDelta(delta: number): string {
  if (Math.abs(delta) <= RECONCILE_TOLERANCE) {
    return '0.00 ✓';
  }
  // Show sign per TRACE.md spec: "0.00 ✅ or ±$X ❌"
  const sign = delta >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(delta).toFixed(2)} ✗`;
}

function getBreachBadgeClass(breach: BreachStatus): string {
  switch (breach) {
    case 'No':
      return 'text-areum-success';
    case 'Floor':
      return 'text-areum-warning';
    case 'Negative':
      return 'text-areum-danger font-medium';
  }
}

function getReconcileClass(delta: number): string {
  if (Math.abs(delta) <= RECONCILE_TOLERANCE) {
    return 'text-areum-success';
  }
  return 'text-areum-danger font-medium';
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TraceSheet: React.FC<TraceSheetProps> = ({
  data,
  verifyMode,
  onJumpToMonth,
  jumpToMonthRef,
}) => {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const listRef = useRef<ListImperativeAPI>(null);

  // Calculate column widths
  const columnWidths = useMemo(() => COLUMNS.map((c) => c.width), []);
  const totalWidth = useMemo(() => columnWidths.reduce((sum, w) => sum + w, 0), [columnWidths]);

  // Handle row click
  const handleRowClick = useCallback((month: string) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  }, []);

  // Jump to month function - scrolls to row and expands it
  const jumpToMonth = useCallback((month: string) => {
    const index = data.rows.findIndex((r) => r.month === month);
    if (index >= 0) {
      // Scroll to the row first
      if (listRef.current) {
        listRef.current.scrollToRow({
          index,
          align: 'start',
          behavior: 'smooth',
        });
      }
      // Expand the row after a brief delay to allow scroll to complete
      setTimeout(() => {
        setExpandedMonth(month);
      }, 100);
    }
  }, [data.rows]);

  // Expose jump function via ref
  React.useEffect(() => {
    if (jumpToMonthRef) {
      jumpToMonthRef.current = jumpToMonth;
    }
  }, [jumpToMonth, jumpToMonthRef]);

  // Calculate row height based on expansion state and content
  const getRowHeight = useCallback(
    (index: number): number => {
      const row = data.rows[index];
      if (!row) return ROW_HEIGHT;

      if (expandedMonth === row.month) {
        // Calculate dynamic height based on content
        const flowItems = data.flowItemsByMonth.get(row.month) || [];
        const transfers = data.transfersByMonth.get(row.month) || [];
        const growthComponents = data.growthComponentsByMonth.get(row.month) || [];

        // Count items that will be displayed
        const flowItemCount = flowItems.length;
        const transferCount = transfers.filter((t) => Math.abs(t.amount) > 0.01).length;
        const growthCount = growthComponents.length;

        // Source Events section has max-h-32 (128px), so fixed height contribution
        const hasSourceEvents = (row.eventIds || []).length > 0;
        const sourceEventsHeight = hasSourceEvents ? 160 : 0; // 128px max-h + header + padding

        // Estimate content height: take the max across all 3 panels
        const panelALines = 6; // Fixed: 2 equations + reconcile + ordering
        // Panel B: flow items + transfers + subtotals (Source Events handled separately)
        const panelBLines = flowItemCount + transferCount + 6;
        const panelCLines = growthCount + 4; // +4 for world vars/headers

        const maxLines = Math.max(panelALines, panelBLines, panelCLines);
        const contentHeight = EXPANDED_BASE_HEIGHT + maxLines * FLOW_ITEM_HEIGHT + sourceEventsHeight;

        return ROW_HEIGHT + Math.max(contentHeight, MIN_EXPANDED_HEIGHT);
      }
      return ROW_HEIGHT;
    },
    [data.rows, data.flowItemsByMonth, data.transfersByMonth, data.growthComponentsByMonth, expandedMonth]
  );

  // Row props for virtualization
  const rowProps: RowCustomProps = useMemo(
    () => ({
      data,
      rows: data.rows,
      expandedMonth,
      onRowClick: handleRowClick,
      verifyMode,
    }),
    [data, expandedMonth, handleRowClick, verifyMode]
  );

  return (
    <div className="overflow-hidden border border-areum-border rounded-md-areum">
      {/* Fixed Header */}
      <div
        className="bg-areum-canvas border-b border-areum-border overflow-x-auto"
        style={{ minWidth: totalWidth }}
      >
        <div className="flex" style={{ width: totalWidth }}>
          {COLUMNS.map((col, index) => {
            if (col.isDivider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="bg-areum-border"
                  style={{ width: col.width, minWidth: col.minWidth }}
                />
              );
            }
            return (
              <div
                key={col.key}
                className="px-2 py-2 text-xs-areum font-semibold text-areum-text-secondary uppercase tracking-wide flex-shrink-0"
                style={{ width: columnWidths[index], minWidth: col.minWidth }}
                title={col.tooltip}
              >
                <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                  {col.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Virtualized Body */}
      <List
        listRef={listRef}
        rowCount={data.rows.length}
        rowHeight={getRowHeight}
        rowComponent={RowComponent}
        rowProps={rowProps}
        overscanCount={5}
        className="overflow-x-auto"
        style={{ height: 568, width: '100%' }}
      />
    </div>
  );
};

// =============================================================================
// ROW COMPONENT
// =============================================================================

const RowComponent = ({
  index,
  style,
  data: traceData,
  rows,
  expandedMonth,
  onRowClick,
  verifyMode,
}: RowComponentProps<RowCustomProps>): ReactElement => {
  const row = rows[index];
  if (!row) return <div style={style} />;

  const isExpanded = expandedMonth === row.month;
  const totalWidth = COLUMNS.reduce((sum, c) => sum + c.width, 0);

  return (
    <div style={style}>
      {/* Main Row */}
      <div
        className={`flex border-b border-areum-border/50 cursor-pointer transition-colors ${
          isExpanded ? 'bg-areum-accent/10 border-l-2 border-l-areum-accent' : 'hover:bg-areum-canvas/50'
        }`}
        style={{ width: totalWidth, height: ROW_HEIGHT }}
        onClick={() => onRowClick(row.month)}
      >
        {COLUMNS.map((col, colIndex) => {
          if (col.isDivider) {
            return (
              <div
                key={`divider-${colIndex}`}
                className="bg-areum-border/50"
                style={{ width: col.width }}
              />
            );
          }

          const value = formatValue(col.key, row);
          let className = 'px-2 py-1.5 flex items-center flex-shrink-0 text-sm-areum';
          className += col.align === 'right' ? ' justify-end' : col.align === 'center' ? ' justify-center' : ' justify-start';

          // Special styling for certain columns
          if (col.key === 'breach') {
            className += ` ${getBreachBadgeClass(row.breach)}`;
          } else if (col.key === 'reconcile_delta') {
            className += ` ${getReconcileClass(row.reconcile_delta)}`;
          } else if (col.key === 'net_worth_end') {
            className += ' font-semibold';
          } else if (col.key === 'operating_flow' || col.key === 'transfer_cash' || col.key === 'market_return_impact') {
            // Color code positive/negative
            const numValue = row[col.key as keyof TraceRow] as number;
            if (numValue > 0) className += ' text-areum-success';
            else if (numValue < 0) className += ' text-areum-danger';
          }

          return (
            <div
              key={col.key}
              className={className}
              style={{ width: col.width }}
            >
              {value}
            </div>
          );
        })}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <TraceRowExpansion
          row={row}
          flowItems={traceData.flowItemsByMonth.get(row.month) || []}
          transfers={traceData.transfersByMonth.get(row.month) || []}
          growthComponents={traceData.growthComponentsByMonth.get(row.month) || []}
          worldVars={traceData.worldVarsByMonth.get(row.month)}
          verifyMode={verifyMode}
          width={totalWidth}
          equityAllocation={traceData.meta.equity_allocation}
          eventLookup={traceData.eventLookup}
        />
      )}
    </div>
  );
};

export default TraceSheet;
