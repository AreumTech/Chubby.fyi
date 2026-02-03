/**
 * DeterministicSpreadsheet - Collapsible yearly/monthly spreadsheet view
 *
 * Shows yearly summary rows that expand to reveal monthly detail.
 * Designed for mechanical transparency - shows exact numbers flowing through simulation.
 * Features resizable columns like Excel.
 */

import React, { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import type { DeterministicYearData, DeterministicMonthSnapshot } from '@/types/api/payload';
import { formatCurrencyShort } from '@/utils/formatting';

interface DeterministicSpreadsheetProps {
  data: DeterministicYearData[];
}

/**
 * Format change value with +/- sign
 */
const formatChange = (value: number): string => {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatCurrencyShort(value)}`;
};

/**
 * Month name helper
 */
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Column definitions with appropriate widths
 */
interface ColumnDef {
  key: string;
  label: string;
  width: number;
  minWidth: number;
  align: 'left' | 'right';
}

const COLUMNS: ColumnDef[] = [
  { key: 'year', label: 'Year', width: 80, minWidth: 60, align: 'left' },
  { key: 'age', label: 'Age', width: 55, minWidth: 45, align: 'left' },
  { key: 'netWorth', label: 'Net Worth', width: 110, minWidth: 80, align: 'right' },
  { key: 'income', label: 'Income', width: 95, minWidth: 70, align: 'right' },
  { key: 'expenses', label: 'Expenses', width: 95, minWidth: 70, align: 'right' },
  { key: 'taxes', label: 'Taxes', width: 85, minWidth: 60, align: 'right' },
  { key: 'growth', label: 'Growth', width: 95, minWidth: 70, align: 'right' },
  { key: 'change', label: 'Change', width: 95, minWidth: 70, align: 'right' },
];

/**
 * Resizable header with visual resize handles
 */
const ResizableHeader: React.FC<{
  columns: ColumnDef[];
  columnWidths: number[];
  onResize: (index: number, delta: number) => void;
}> = ({ columns, columnWidths, onResize }) => {
  const resizingRef = useRef<{ index: number; startX: number } | null>(null);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { index, startX: e.clientX };
    setResizingIndex(index);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (resizingRef.current) {
        const delta = moveEvent.clientX - resizingRef.current.startX;
        onResize(resizingRef.current.index, delta);
        resizingRef.current.startX = moveEvent.clientX;
      }
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      setResizingIndex(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [onResize]);

  return (
    <thead className="sticky top-0 z-10">
      <tr className="bg-areum-canvas border-b-2 border-areum-border">
        {columns.map((col, index) => (
          <th
            key={col.key}
            style={{ width: columnWidths[index] }}
            className={`px-3 py-2.5 text-xs-areum font-semibold text-areum-text-secondary relative ${
              col.align === 'right' ? 'text-right' : 'text-left'
            }`}
          >
            {col.label}
            {/* Resize handle - thin visible line with wide hit area */}
            {index < columns.length - 1 && (
              <div
                onMouseDown={(e) => handleMouseDown(index, e)}
                className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize group"
                style={{ transform: 'translateX(50%)' }}
                title="Drag to resize"
              >
                <div
                  className={`absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 transition-colors ${
                    resizingIndex === index
                      ? 'bg-areum-accent'
                      : 'bg-areum-border/60 group-hover:bg-areum-accent/70'
                  }`}
                />
              </div>
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
};

/**
 * Year row component - clickable to expand/collapse
 */
const YearRow: React.FC<{
  data: DeterministicYearData;
  isExpanded: boolean;
  onToggle: () => void;
  columnWidths: number[];
}> = ({ data, isExpanded, onToggle, columnWidths }) => {
  const changeColor = data.netWorthChange >= 0 ? 'text-areum-success' : 'text-areum-danger';

  return (
    <tr
      onClick={onToggle}
      className={`border-b border-areum-border cursor-pointer transition-colors ${
        isExpanded
          ? 'bg-areum-accent/10 border-l-2 border-l-areum-accent'
          : 'hover:bg-areum-canvas/50'
      }`}
    >
      <td style={{ width: columnWidths[0] }} className="px-3 py-2 text-sm-areum">
        <span className="flex items-center gap-2">
          <span className="text-areum-text-tertiary text-xs-areum">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className={`font-medium ${isExpanded ? 'text-areum-accent' : 'text-areum-text-primary'}`}>
            {data.year}
          </span>
        </span>
      </td>
      <td style={{ width: columnWidths[1] }} className="px-3 py-2 text-sm-areum text-areum-text-secondary">
        {Math.floor(data.age)}
      </td>
      <td style={{ width: columnWidths[2] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary font-semibold">
        {formatCurrencyShort(data.endNetWorth)}
      </td>
      <td style={{ width: columnWidths[3] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary">
        {formatCurrencyShort(data.totalIncome)}
      </td>
      <td style={{ width: columnWidths[4] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary">
        {formatCurrencyShort(data.totalExpenses)}
      </td>
      <td style={{ width: columnWidths[5] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary">
        {formatCurrencyShort(data.totalTaxes)}
      </td>
      <td style={{ width: columnWidths[6] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary">
        {formatCurrencyShort(data.investmentGrowth)}
      </td>
      <td style={{ width: columnWidths[7] }} className={`px-3 py-2 text-sm-areum font-mono text-right font-semibold ${changeColor}`}>
        {formatChange(data.netWorthChange)}
      </td>
    </tr>
  );
};

/**
 * Month row component - detailed monthly data
 */
const MonthRow: React.FC<{
  data: DeterministicMonthSnapshot;
  columnWidths: number[];
}> = ({ data, columnWidths }) => {
  const monthName = MONTH_NAMES[data.calendarMonth - 1] || 'N/A';

  return (
    <tr className="bg-areum-surface-alt/30 border-b border-areum-border/50">
      <td style={{ width: columnWidths[0] }} className="px-3 py-1.5 pl-10 text-sm-areum text-areum-text-tertiary">
        {monthName}
      </td>
      <td style={{ width: columnWidths[1] }} className="px-3 py-1.5 text-sm-areum text-areum-text-tertiary">
        {Math.floor(data.age)}
      </td>
      <td style={{ width: columnWidths[2] }} className="px-3 py-1.5 text-sm-areum font-mono text-right text-areum-text-secondary">
        {formatCurrencyShort(data.netWorth)}
      </td>
      <td style={{ width: columnWidths[3] }} className="px-3 py-1.5 text-sm-areum font-mono text-right text-areum-text-tertiary">
        {formatCurrencyShort(data.incomeThisMonth)}
      </td>
      <td style={{ width: columnWidths[4] }} className="px-3 py-1.5 text-sm-areum font-mono text-right text-areum-text-tertiary">
        {formatCurrencyShort(data.expensesThisMonth)}
      </td>
      <td style={{ width: columnWidths[5] }} className="px-3 py-1.5 text-sm-areum font-mono text-right text-areum-text-tertiary">
        {formatCurrencyShort(data.taxesThisMonth)}
      </td>
      <td style={{ width: columnWidths[6] }} className="px-3 py-1.5 text-sm-areum font-mono text-right text-areum-text-tertiary">
        {formatCurrencyShort(data.investmentGrowth)}
      </td>
      <td style={{ width: columnWidths[7] }} className="px-3 py-1.5 text-sm-areum text-right text-areum-text-tertiary">
        —
      </td>
    </tr>
  );
};

/**
 * Main spreadsheet component
 */
export const DeterministicSpreadsheet: React.FC<DeterministicSpreadsheetProps> = ({ data }) => {
  const { deterministicExpandedYears, toggleDeterministicYearExpansion } = useAppStore();
  const [columnWidths, setColumnWidths] = useState<number[]>(COLUMNS.map(c => c.width));

  const handleResize = useCallback((index: number, delta: number) => {
    setColumnWidths(prev => {
      const next = [...prev];
      next[index] = Math.max(COLUMNS[index].minWidth, next[index] + delta);
      return next;
    });
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-areum-text-secondary">
        No yearly data available.
      </div>
    );
  }

  return (
    <div className="border border-areum-border rounded-md-areum overflow-hidden bg-areum-surface">
      <div className="max-h-[500px] overflow-auto">
        <table className="min-w-full" style={{ tableLayout: 'fixed' }}>
          <ResizableHeader
            columns={COLUMNS}
            columnWidths={columnWidths}
            onResize={handleResize}
          />
          <tbody>
            {data.map((yearData) => {
              const isExpanded = deterministicExpandedYears.includes(yearData.year);

              return (
                <React.Fragment key={yearData.year}>
                  <YearRow
                    data={yearData}
                    isExpanded={isExpanded}
                    onToggle={() => toggleDeterministicYearExpansion(yearData.year)}
                    columnWidths={columnWidths}
                  />
                  {isExpanded && yearData.months && yearData.months.map(month => (
                    <MonthRow key={month.monthOffset} data={month} columnWidths={columnWidths} />
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
