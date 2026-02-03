/**
 * Goal Achievement Timing Distribution Bars
 *
 * Shows WHEN a goal is achieved across Monte Carlo simulations
 * "Solving for TIME" - given a target amount, when will I reach it?
 *
 * Mode 1: Fixed Amount, Solve for Time
 * Example: "Save $1M - when will I reach it?"
 * Shows: P10-P90 of months/years when the target is achieved
 */

import React from 'react';
import { Body, BodyBase, Caption } from '@/components/ui/Typography';

interface GoalAchievementTimingBarsProps {
  p10Month: number; // Earliest 10% of achievements
  p25Month: number;
  p50Month: number; // Median achievement month
  p75Month: number;
  p90Month: number; // Latest 10% of achievements
  achievementRate: number; // 0.0 to 1.0 - percentage of paths that achieved goal
  targetAmount: number; // For display
  className?: string;
}

/**
 * Convert month offset to "Year X" label
 */
function monthToYearLabel(month: number): string {
  if (month === 0) return 'Year 0';
  const year = Math.floor(month / 12);
  const remainingMonths = month % 12;

  if (remainingMonths === 0) {
    return `Year ${year}`;
  }
  return `Year ${year}.${Math.floor((remainingMonths / 12) * 10)}`; // Show as decimal (e.g., Year 10.5)
}

function monthToYear(month: number): number {
  return Math.floor(month / 12);
}

export const GoalAchievementTimingBars: React.FC<GoalAchievementTimingBarsProps> = ({
  p10Month,
  p25Month,
  p50Month,
  p75Month,
  p90Month,
  achievementRate,
  targetAmount,
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

  const achievementPercent = Math.round(achievementRate * 100);

  // Determine color based on achievement rate
  const getColor = () => {
    if (achievementRate >= 0.85) return 'green';
    if (achievementRate >= 0.70) return 'green';
    if (achievementRate >= 0.50) return 'amber';
    return 'red';
  };

  const color = getColor();
  const colorClasses = {
    green: {
      line: 'bg-green-600',
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    amber: {
      line: 'bg-amber-500',
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    },
    red: {
      line: 'bg-red-500',
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200'
    }
  };

  const colors = colorClasses[color];

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
            <div className={`absolute top-0 bottom-0 w-1 ${colors.line} rounded-full shadow-md`} />

            {/* Median label above bar */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <Caption className={`font-semibold ${colors.text}`}>
                Median: {monthToYearLabel(p50Month)}
              </Caption>
            </div>

            {/* Arrow pointing down */}
            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${colors.line.replace('bg-', 'border-t-')}`} />
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
      <div className={`text-center p-3 rounded ${colors.bg} border ${colors.border} mt-8`}>
        <Body weight="semibold" className={colors.text}>
          {achievementPercent}% of simulations achieve goal
        </Body>
        <BodyBase color="secondary" className="mt-1">
          Median achievement: {monthToYearLabel(p50Month)}
        </BodyBase>
        <Caption color="tertiary" className="mt-1">
          Range: {monthToYearLabel(p10Month)} to {monthToYearLabel(p90Month)}
        </Caption>
      </div>
    </div>
  );
};
