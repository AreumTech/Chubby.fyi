import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDataService } from '@/hooks/useDataService';
import { formatCurrencyShort } from '@/utils/formatting';
import { Section } from '@/components/ui/Section';
import { Meta } from '@/components/ui/Typography';
import type { SpreadsheetYearData } from '@/types/api/payload';

/**
 * Generates tab-separated values (TSV) for Google Sheets copy/paste
 * Exports full data including percentiles for power users
 */
function generateTSV(data: SpreadsheetYearData[]): string {
  const headers = [
    'Year',
    'Age',
    'Income',
    'Expenses',
    'Taxes',
    'Savings',
    'Net Worth',
  ];

  const rows = data.map((row) => [
    row.year.toString(),
    row.age.toString(),
    Math.round(row.income.p50).toString(),
    Math.round(row.expenses.p50).toString(),
    Math.round(row.taxes.p50).toString(),
    Math.round(row.savings.p50).toString(),
    Math.round(row.netWorth.p50).toString(),
  ]);

  return [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
}

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
  { key: 'year', label: 'Year', width: 70, minWidth: 55, align: 'left' },
  { key: 'age', label: 'Age', width: 55, minWidth: 45, align: 'left' },
  { key: 'income', label: 'Income', width: 95, minWidth: 70, align: 'right' },
  { key: 'expenses', label: 'Expenses', width: 95, minWidth: 70, align: 'right' },
  { key: 'taxes', label: 'Taxes', width: 85, minWidth: 60, align: 'right' },
  { key: 'savings', label: 'Savings', width: 95, minWidth: 70, align: 'right' },
  { key: 'netWorth', label: 'Net Worth', width: 110, minWidth: 80, align: 'right' },
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

interface SpreadsheetSectionProps {
  activeYear: number;
  onYearChange: (year: number) => void;
}

export const SpreadsheetSection: React.FC<SpreadsheetSectionProps> = ({
  activeYear,
  onYearChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [columnWidths, setColumnWidths] = useState<number[]>(COLUMNS.map(c => c.width));
  const { hasData, getSpreadsheetData } = useDataService();
  const tableRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement>(null);

  const handleResize = useCallback((index: number, delta: number) => {
    setColumnWidths(prev => {
      const next = [...prev];
      next[index] = Math.max(COLUMNS[index].minWidth, next[index] + delta);
      return next;
    });
  }, []);

  // Scroll to active row when activeYear changes
  useEffect(() => {
    if (activeRowRef.current && tableRef.current) {
      const row = activeRowRef.current;
      const container = tableRef.current;
      const rowTop = row.offsetTop;
      const rowHeight = row.offsetHeight;
      const containerHeight = container.clientHeight;
      const scrollTop = container.scrollTop;

      // Only scroll if row is not visible
      if (rowTop < scrollTop || rowTop + rowHeight > scrollTop + containerHeight) {
        container.scrollTo({
          top: rowTop - containerHeight / 2 + rowHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [activeYear]);

  const handleCopy = useCallback(async () => {
    const data = getSpreadsheetData();
    if (!data?.years) return;

    try {
      const tsv = generateTSV(data.years);
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [getSpreadsheetData]);

  if (!hasData) {
    return null;
  }

  const spreadsheetData = getSpreadsheetData();
  if (!spreadsheetData?.years?.length) {
    return null;
  }

  const years = spreadsheetData.years;

  return (
    <Section number={4} title="SPREADSHEET" className="mb-4" dense>
      {/* Controls row */}
      <div className="flex items-center justify-between mb-2">
        <Meta>{years.length} years • Click row to select • Drag column borders to resize</Meta>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 text-xs-areum font-medium rounded-sm-areum border border-areum-border bg-areum-surface hover:bg-areum-canvas transition-colors"
        >
          {copied ? (
            <>
              <span className="text-areum-success">✓</span>
              Copied!
            </>
          ) : (
            <>
              <span>📋</span>
              Copy for Sheets
            </>
          )}
        </button>
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        className="border border-areum-border rounded-md-areum overflow-hidden bg-areum-surface max-h-[400px] overflow-y-auto"
      >
        <table className="min-w-full" style={{ tableLayout: 'fixed' }}>
          <ResizableHeader
            columns={COLUMNS}
            columnWidths={columnWidths}
            onResize={handleResize}
          />
          <tbody>
            {years.map((row) => {
              const isActive = row.year === activeYear;
              return (
                <tr
                  key={row.year}
                  ref={isActive ? activeRowRef : null}
                  onClick={() => onYearChange(row.year)}
                  className={`border-b border-areum-border last:border-b-0 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-areum-accent/10 border-l-2 border-l-areum-accent'
                      : 'hover:bg-areum-canvas/50'
                  }`}
                >
                  <td
                    style={{ width: columnWidths[0] }}
                    className={`px-3 py-2 text-sm-areum font-medium ${
                      isActive ? 'text-areum-accent' : 'text-areum-text-primary'
                    }`}
                  >
                    {row.year}
                  </td>
                  <td style={{ width: columnWidths[1] }} className="px-3 py-2 text-sm-areum text-areum-text-secondary">
                    {row.age}
                  </td>
                  <td style={{ width: columnWidths[2] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary">
                    {formatCurrencyShort(row.income.p50)}
                  </td>
                  <td style={{ width: columnWidths[3] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary">
                    {formatCurrencyShort(row.expenses.p50)}
                  </td>
                  <td style={{ width: columnWidths[4] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary">
                    {formatCurrencyShort(row.taxes.p50)}
                  </td>
                  <td style={{ width: columnWidths[5] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary">
                    {formatCurrencyShort(row.savings.p50)}
                  </td>
                  <td style={{ width: columnWidths[6] }} className="px-3 py-2 text-sm-areum font-mono text-right text-areum-text-primary font-semibold">
                    {formatCurrencyShort(row.netWorth.p50)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="mt-2 text-xs-areum text-areum-text-tertiary">
        💡 Click row to sync with chart & deep dive
      </div>
    </Section>
  );
};
