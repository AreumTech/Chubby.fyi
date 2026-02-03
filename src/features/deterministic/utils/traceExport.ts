/**
 * Trace Export - 4-Tab Sheet Pack for Simulation Trace
 *
 * Generates export files for Google Sheets:
 * 1. TRACE_SUMMARY.tsv - Main 12 columns
 * 2. TRACE_FLOWS.tsv - Normalized flow items per month
 * 3. TRACE_WORLD_VARS.tsv - Market returns per month
 * 4. TRACE_META.json - Seed, path, ordering, rounding policy
 */

import type {
  TraceData,
  TraceRow,
  FlowItem,
  WorldVars,
  TraceRunMeta,
} from '../types/traceTypes';
import { formatCurrencyShort } from '@/utils/formatting';

export interface TraceExportPack {
  summary: string;
  flows: string;
  worldVars: string;
  meta: string;
}

/**
 * Generate the complete 4-tab export pack
 */
export function generateTraceExport(data: TraceData): TraceExportPack {
  return {
    summary: generateSummaryTSV(data.rows),
    flows: generateFlowsTSV(data),
    worldVars: generateWorldVarsTSV(data),
    meta: generateMetaJSON(data.meta, data.summary),
  };
}

/**
 * TRACE_SUMMARY.tsv - Main 12 columns
 */
function generateSummaryTSV(rows: TraceRow[]): string {
  const headers = [
    'Month',
    'Start Cash',
    'Operating Flow',
    'Transfer',
    'End Cash',
    'Cash Floor',
    'Breach',
    'Start Inv',
    'Market Return',
    'End Inv',
    'End NW',
    'Reconcile Δ',
  ];

  const dataRows = rows.map((row) => [
    row.month,
    Math.round(row.cash_start),
    Math.round(row.operating_flow),
    Math.round(row.transfer_cash),
    Math.round(row.cash_end),
    Math.round(row.cash_floor),
    row.breach,
    Math.round(row.inv_start),
    Math.round(row.market_return_impact),
    Math.round(row.inv_end),
    Math.round(row.net_worth_end),
    row.reconcile_delta.toFixed(2),
  ].join('\t'));

  return [headers.join('\t'), ...dataRows].join('\n');
}

/**
 * TRACE_FLOWS.tsv - Normalized flow items per month
 */
function generateFlowsTSV(data: TraceData): string {
  const headers = [
    'Month',
    'Posting ID',
    'Group',
    'Label',
    'Amount',
    'Source',
    'Event ID',
  ];

  const dataRows: string[] = [];

  for (const [month, items] of data.flowItemsByMonth) {
    for (const item of items) {
      dataRows.push([
        month,
        item.id,
        item.group,
        item.label,
        Math.round(item.amount),
        item.source,
        item.eventId || '',
      ].join('\t'));
    }
  }

  return [headers.join('\t'), ...dataRows].join('\n');
}

/**
 * TRACE_WORLD_VARS.tsv - Market returns per month
 */
function generateWorldVarsTSV(data: TraceData): string {
  const headers = [
    'Month',
    'Equity Return',
    'Bond Return',
    'Inflation',
  ];

  const dataRows: string[] = [];

  for (const [month, vars] of data.worldVarsByMonth) {
    dataRows.push([
      month,
      (vars.equity_return * 100).toFixed(4) + '%',
      (vars.bond_return * 100).toFixed(4) + '%',
      vars.inflation !== undefined ? (vars.inflation * 100).toFixed(4) + '%' : '',
    ].join('\t'));
  }

  return [headers.join('\t'), ...dataRows].join('\n');
}

/**
 * TRACE_META.json - Full metadata object
 */
function generateMetaJSON(
  meta: TraceRunMeta,
  summary: TraceData['summary']
): string {
  const metaObject = {
    ...meta,
    summary: {
      totalMonths: summary.totalMonths,
      reconciledMonths: summary.reconciledMonths,
      allReconciled: summary.reconciledMonths === summary.totalMonths,
      interestingMonths: {
        firstBreachMonth: summary.firstBreachMonth,
        firstNegativeCashMonth: summary.firstNegativeCashMonth,
        firstMismatchMonth: summary.firstMismatchMonth,
        worstDrawdownMonth: summary.worstDrawdownMonth,
        largestTransferMonth: summary.largestTransferMonth,
        largestNegativeReturnMonth: summary.largestNegativeReturnMonth,
      },
    },
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };

  return JSON.stringify(metaObject, null, 2);
}

/**
 * Helper to download all files as a zip (requires JSZip or similar)
 * For now, just provides individual file contents
 */
export function getExportFilenames(): {
  summary: string;
  flows: string;
  worldVars: string;
  meta: string;
} {
  return {
    summary: 'TRACE_SUMMARY.tsv',
    flows: 'TRACE_FLOWS.tsv',
    worldVars: 'TRACE_WORLD_VARS.tsv',
    meta: 'TRACE_META.json',
  };
}

/**
 * Copy trace summary to clipboard (primary use case)
 */
export async function copyTraceSummaryToClipboard(data: TraceData): Promise<boolean> {
  try {
    const tsv = generateSummaryTSV(data.rows);
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
