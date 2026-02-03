/**
 * Goal Percentile Bars - Distribution Visualization
 *
 * Shows the range of possible outcomes from Monte Carlo simulations
 * Answers: "What's the range of outcomes for this goal?"
 *
 * Visual Design:
 * ┌─────────────────────────────────────────────┐
 * │  P10        P25    P50    P75        P90    │
 * │   │          │      │      │          │     │
 * │   ├──────────┼──────┼──────┼──────────┤     │
 * │   $35K            $50K            $68K      │
 * │                    ▲                        │
 * │                 Target                      │
 * │                  $50K                       │
 * └─────────────────────────────────────────────┘
 */

import React from 'react';
import { formatCurrencyShort } from '@/utils/formatting';
import { Body, BodyBase, Caption } from '@/components/ui/Typography';

interface GoalPercentilebarsProps {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  targetAmount: number;
  probability: number; // 0.0 to 1.0
  compact?: boolean; // Ultra-compact mode for dense layouts
  className?: string;
}

/**
 * Determine target line color based on where target sits in distribution
 *
 * Key insight: Lower target in distribution = easier to achieve = GOOD
 * - Target < P25: >75% of simulations achieve it → GREEN
 * - Target < P50: >50% of simulations achieve it → LIGHT GREEN
 * - Target < P75: >25% of simulations achieve it → AMBER
 * - Target ≥ P75: <25% of simulations achieve it → RED
 */
function getTargetLineColor(targetAmount: number, p50: number, p25: number, p75: number): string {
  // Target below P25 = >75% achieve it = excellent
  if (targetAmount < p25) return 'bg-green-600';

  // Target between P25-P50 = >50% achieve it = good
  if (targetAmount < p50) return 'bg-green-500';

  // Target between P50-P75 = >25% achieve it = needs attention
  if (targetAmount < p75) return 'bg-amber-500';

  // Target at or above P75 = <25% achieve it = at risk
  return 'bg-red-500';
}

function getTargetTextColor(targetAmount: number, p50: number, p25: number, p75: number): string {
  if (targetAmount < p25) return 'text-green-700';
  if (targetAmount < p50) return 'text-green-600';
  if (targetAmount < p75) return 'text-amber-600';
  return 'text-red-600';
}

export const GoalPercentileBars: React.FC<GoalPercentilebarsProps> = ({
  p10,
  p25,
  p50,
  p75,
  p90,
  targetAmount,
  probability,
  compact = false,
  className = ''
}) => {
  // Extend range to include target if it's outside P10-P90
  const minValue = Math.min(p10, targetAmount);
  const maxValue = Math.max(p90, targetAmount);
  const range = maxValue - minValue;

  // Calculate all positions relative to extended range
  const p10Position = range > 0 ? ((p10 - minValue) / range) * 100 : 10;
  const p25Position = range > 0 ? ((p25 - minValue) / range) * 100 : 25;
  const p50Position = range > 0 ? ((p50 - minValue) / range) * 100 : 50;
  const p75Position = range > 0 ? ((p75 - minValue) / range) * 100 : 75;
  const p90Position = range > 0 ? ((p90 - minValue) / range) * 100 : 90;
  const targetPosition = range > 0 ? ((targetAmount - minValue) / range) * 100 : 50;

  // Get target colors
  const targetLineColor = getTargetLineColor(targetAmount, p50, p25, p75);
  const targetTextColor = getTargetTextColor(targetAmount, p50, p25, p75);

  // Probability percentage
  const probabilityPercent = Math.round(probability * 100);

  // Compact mode: simplified inline bar
  if (compact) {
    return (
      <div className={className}>
        <div className="relative h-4 bg-areum-canvas rounded border border-areum-border">
          {/* P10-P90 range */}
          <div
            className="absolute top-0 bottom-0 bg-areum-border/30"
            style={{
              left: `${p10Position}%`,
              width: `${p90Position - p10Position}%`
            }}
          />
          {/* P25-P75 band */}
          <div
            className="absolute top-0 bottom-0 bg-areum-border/60"
            style={{
              left: `${p25Position}%`,
              width: `${p75Position - p25Position}%`
            }}
          />
          {/* Target line */}
          <div
            className={`absolute top-0 bottom-0 w-0.5 ${targetLineColor}`}
            style={{ left: `${targetPosition}%` }}
          />
          {/* P50 marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-areum-text-primary/60"
            style={{ left: `${p50Position}%` }}
          />
        </div>
        {/* Compact labels */}
        <div className="flex justify-between mt-0.5 text-[10px] text-areum-text-tertiary">
          <span>{formatCurrencyShort(p10)}</span>
          <span className="font-medium text-areum-text-secondary">{formatCurrencyShort(p50)}</span>
          <span>{formatCurrencyShort(p90)}</span>
        </div>
      </div>
    );
  }

  // Full mode: detailed visualization
  return (
    <div className={className}>
      {/* Percentile bar visualization */}
      <div className="relative h-12 mb-3">
        {/* Full range bar */}
        <div className="absolute inset-0 bg-areum-canvas rounded-md-areum border border-areum-border">
          {/* P10-P90 distribution band - highlighted */}
          <div
            className="absolute top-0 bottom-0 bg-areum-border/20 border-l border-r border-areum-border"
            style={{
              left: `${p10Position}%`,
              width: `${p90Position - p10Position}%`
            }}
          >
            {/* P25-P75 band (middle 50%) - darker */}
            <div
              className="absolute top-0 bottom-0 bg-areum-border/40"
              style={{
                left: `${((p25Position - p10Position) / (p90Position - p10Position)) * 100}%`,
                width: `${((p75Position - p25Position) / (p90Position - p10Position)) * 100}%`
              }}
            />
          </div>

          {/* Target line with label */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${targetPosition}%` }}
          >
            {/* Target marker line */}
            <div className={`absolute top-0 bottom-0 w-1 ${targetLineColor} rounded-full shadow-sm`} />

            {/* Target label above bar */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <Caption className={`font-semibold ${targetTextColor}`}>
                Target: {formatCurrencyShort(targetAmount)}
              </Caption>
            </div>
          </div>
        </div>

        {/* Percentile labels below bar */}
        <div className="absolute -bottom-5 left-0 right-0 flex items-center justify-between text-[10px]">
          <span className="absolute -translate-x-1/2 text-areum-text-tertiary" style={{ left: `${p10Position}%` }}>
            {formatCurrencyShort(p10)}
          </span>
          <span className="absolute -translate-x-1/2 text-areum-text-secondary" style={{ left: `${p25Position}%` }}>
            {formatCurrencyShort(p25)}
          </span>
          <span className="absolute -translate-x-1/2 font-semibold text-areum-text-primary" style={{ left: `${p50Position}%` }}>
            {formatCurrencyShort(p50)}
          </span>
          <span className="absolute -translate-x-1/2 text-areum-text-secondary" style={{ left: `${p75Position}%` }}>
            {formatCurrencyShort(p75)}
          </span>
          <span className="absolute -translate-x-1/2 text-areum-text-tertiary" style={{ left: `${p90Position}%` }}>
            {formatCurrencyShort(p90)}
          </span>
        </div>
      </div>

      {/* Probability explanation - neutral background */}
      <div className="text-center p-2 rounded-md-areum bg-areum-canvas border border-areum-border mt-6">
        <Body weight="semibold" className={targetTextColor}>
          {probabilityPercent}% of simulations achieve target or higher
        </Body>
        <Caption color="secondary" className="mt-0.5">
          Based on 100 Monte Carlo simulations
        </Caption>
      </div>
    </div>
  );
};
