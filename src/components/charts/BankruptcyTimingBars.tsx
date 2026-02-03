/**
 * Bankruptcy Timing Distribution Bars
 *
 * Shows WHEN bankruptcy happens across Monte Carlo simulations
 * "Solving for TIME" - shows distribution of bankruptcy timing
 *
 * Complements goal distribution which solves for MONEY at fixed time
 */

import React from 'react';
import { Body, BodyBase, Caption } from '@/components/ui/Typography';

interface BankruptcyTimingBarsProps {
  p10Month: number; // Earliest 10% of bankruptcies
  p25Month: number;
  p50Month: number; // Median bankruptcy month
  p75Month: number;
  p90Month: number; // Latest 10% of bankruptcies
  className?: string;
}

/**
 * Convert month offset to "Year X" label
 */
function monthToYearLabel(month: number): string {
  if (month === 0) return 'Year 0';
  const year = Math.floor(month / 12);
  return `Year ${year}`;
}

/**
 * Get short year label
 */
function monthToYear(month: number): number {
  return Math.floor(month / 12);
}

export const BankruptcyTimingBars: React.FC<BankruptcyTimingBarsProps> = ({
  p10Month,
  p25Month,
  p50Month,
  p75Month,
  p90Month,
  className = ''
}) => {
  // Calculate range and positions
  const minMonth = p10Month;
  const maxMonth = p90Month;
  const range = maxMonth - minMonth;

  // Calculate positions as percentages
  const p10Position = 0; // Always at left
  const p25Position = range > 0 ? ((p25Month - minMonth) / range) * 100 : 25;
  const p50Position = range > 0 ? ((p50Month - minMonth) / range) * 100 : 50;
  const p75Position = range > 0 ? ((p75Month - minMonth) / range) * 100 : 75;
  const p90Position = 100; // Always at right

  const bandWidth = p75Position - p25Position;

  return (
    <div className={className}>
      {/* Timing bar visualization */}
      <div className="relative h-16 mb-4">
        {/* Full range bar (P10-P90) */}
        <div className="absolute inset-0 bg-gray-100 rounded-lg border border-gray-300">
          {/* P25-P75 band (middle 50%) - darker */}
          <div
            className="absolute top-0 bottom-0 bg-gray-200"
            style={{
              left: `${p25Position}%`,
              width: `${bandWidth}%`
            }}
          />

          {/* Median marker (P50) */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${p50Position}%` }}
          >
            {/* Median line */}
            <div className="absolute top-0 bottom-0 w-1 bg-red-500 rounded-full shadow-md" />

            {/* Median label above bar */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <Caption className="font-semibold text-red-600">
                Median: {monthToYearLabel(p50Month)}
              </Caption>
            </div>

            {/* Arrow pointing down */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500" />
          </div>
        </div>

        {/* Percentile labels below bar */}
        <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-between text-xs">
          <Caption color="tertiary">{monthToYearLabel(p10Month)}</Caption>
          <Caption color="secondary" style={{ marginLeft: `${p25Position}%` }} className="absolute -translate-x-1/2">
            {monthToYearLabel(p25Month)}
          </Caption>
          <Caption color="secondary" style={{ marginLeft: `${p75Position}%` }} className="absolute -translate-x-1/2">
            {monthToYearLabel(p75Month)}
          </Caption>
          <Caption color="tertiary" className="absolute right-0">
            {monthToYearLabel(p90Month)}
          </Caption>
        </div>
      </div>

      {/* Explanation */}
      <div className="text-center p-3 rounded bg-gray-50 border border-gray-200 mt-8">
        <Body weight="semibold" className="text-red-600">
          When does bankruptcy happen?
        </Body>
        <BodyBase color="secondary" className="mt-1">
          Median bankruptcy occurs around {monthToYearLabel(p50Month)}
        </BodyBase>
        <Caption color="tertiary" className="mt-1">
          Range: {monthToYearLabel(p10Month)} to {monthToYearLabel(p90Month)} across failed paths
        </Caption>
      </div>
    </div>
  );
};
