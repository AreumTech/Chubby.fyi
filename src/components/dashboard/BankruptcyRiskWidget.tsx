/**
 * Bankruptcy Risk Widget Component
 *
 * Dashboard widget that displays bankruptcy probability and risk analysis from Monte Carlo simulation.
 * Shows bankruptcy statistics as a risk metric alongside other financial goals.
 */

import React from 'react';
import { ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useDataService } from '@/hooks/useDataService';
import { formatPercentage } from '@/utils/formatting';
import { BankruptcyTimingBars } from '@/components/charts/BankruptcyTimingBars';
import { H2, H4, Body, BodyBase, Caption, MonoSmall, Label } from '@/components/ui/Typography';

interface BankruptcyRiskWidgetProps {
  className?: string;
  compact?: boolean; // For smaller inline displays
}

export const BankruptcyRiskWidget: React.FC<BankruptcyRiskWidgetProps> = ({
  className = '',
  compact = false
}) => {
  const { getBankruptcyData, getPlanSummary, hasData } = useDataService();

  // Extract bankruptcy data from data service
  const bankruptcyData = getBankruptcyData();
  const planSummary = getPlanSummary();

  // If compact mode and no data, don't show
  if (compact && !bankruptcyData) {
    return null;
  }

  // If no data at all, show empty state
  if (!hasData) {
    return (
      <div className={`bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm ${className}`}>
        <div className="flex items-center mb-3">
          <span className="text-2xl mr-3">🛡️</span>
          <div>
            <H4>Bankruptcy Risk</H4>
            <Caption color="tertiary" className="mt-0.5">
              Monte Carlo risk assessment
            </Caption>
          </div>
        </div>
        <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-300">
          <BodyBase color="secondary">Run a simulation to see bankruptcy risk analysis</BodyBase>
        </div>
      </div>
    );
  }

  // If we have data but no bankruptcy data structure, default to 0% risk
  const probability = bankruptcyData?.probability ?? 0;
  const pathsAffected = bankruptcyData?.pathsAffected ?? 0;

  // If compact mode and no risk, don't show
  if (compact && probability === 0) {
    return null;
  }

  // Compact rendering (from BankruptcyWarning)
  if (compact) {
    const getSeverity = (prob: number) => {
      if (prob >= 0.75) return 'critical';
      if (prob >= 0.5) return 'high';
      if (prob >= 0.25) return 'moderate';
      return 'low';
    };

    const severity = getSeverity(probability);
    const getSeverityStyles = (sev: string) => {
      switch (sev) {
        case 'critical':
          return { container: 'bg-red-50 border-red-200 text-red-900', icon: '🚨' };
        case 'high':
          return { container: 'bg-orange-50 border-orange-200 text-orange-900', icon: '⚠️' };
        case 'moderate':
          return { container: 'bg-yellow-50 border-yellow-200 text-yellow-900', icon: '⚡' };
        default:
          return { container: 'bg-blue-50 border-blue-200 text-blue-900', icon: 'ℹ️' };
      }
    };

    const styles = getSeverityStyles(severity);

    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${styles.container} ${className}`}>
        <span className="text-sm">{styles.icon}</span>
        <Caption weight="medium">
          {formatPercentage(probability)} bankruptcy risk
        </Caption>
      </div>
    );
  }

  // Determine risk level and styling (probability is 0.0-1.0, convert to percentage)
  const getRiskLevel = (prob: number) => {
    const percentage = prob * 100;
    if (percentage <= 5) return { level: 'Very Low', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-600', iconColor: 'text-green-500' };
    if (percentage <= 15) return { level: 'Low', color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-600', iconColor: 'text-blue-500' };
    if (percentage <= 30) return { level: 'Moderate', color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600', iconColor: 'text-yellow-500' };
    if (percentage <= 50) return { level: 'High', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-600', iconColor: 'text-orange-500' };
    return { level: 'Very High', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-600', iconColor: 'text-red-500' };
  };

  const riskLevel = getRiskLevel(probability);

  const getBankruptcyMessage = (prob: number) => {
    const percentage = prob * 100;
    if (percentage <= 5) return 'Your financial plan shows excellent resilience against extreme scenarios.';
    if (percentage <= 15) return 'Your plan has strong protection against financial distress.';
    if (percentage <= 30) return 'Consider building emergency reserves or reducing expenses to improve stability.';
    if (percentage <= 50) return 'Your plan faces significant bankruptcy risk - major adjustments recommended.';
    return 'High bankruptcy risk detected - immediate financial plan review needed.';
  };

  // Check if we have timing data
  const hasTimingData = planSummary?.bankruptcyMonthP50 !== undefined &&
                        planSummary?.bankruptcyMonthP10 !== undefined;

  return (
    <div className={`bg-areum-surface rounded-md-areum border ${
      probability > 0.3 ? 'border-areum-danger/40' :
      probability > 0.15 ? 'border-areum-warning/40' :
      'border-areum-success/40'
    } p-3 ${className}`}>
      {/* Header - compact single row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <div>
            <span className="text-sm-areum font-semibold text-areum-text-primary">Plan Resilience</span>
            <span className="text-xs-areum text-areum-text-tertiary ml-2">({pathsAffected}/100 failed)</span>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm-areum text-xs-areum font-medium ${
            probability <= 0.05 ? 'bg-areum-success-bg text-areum-success border border-areum-success/30' :
            probability <= 0.15 ? 'bg-areum-accent/10 text-areum-accent border border-areum-accent/30' :
            probability <= 0.3 ? 'bg-areum-warning-bg text-areum-warning border border-areum-warning/30' :
            'bg-areum-danger-bg text-areum-danger border border-areum-danger/30'
          }`}
        >
          {(probability * 100) <= 15 ? '✓' : '⚠️'} {riskLevel.level}
        </span>
      </div>

      {/* Main metric + timing inline */}
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-1">
          <span className={`text-lg-areum font-semibold ${riskLevel.textColor}`}>
            {formatPercentage(probability)}
          </span>
          <span className="text-xs-areum text-areum-text-tertiary">failure rate</span>
        </div>

        {/* Timing Distribution - compact inline */}
        {hasTimingData && probability > 0 && (
          <div className="flex-1 min-w-0">
            <BankruptcyTimingBars
              p10Month={planSummary?.bankruptcyMonthP10 || 0}
              p25Month={planSummary?.bankruptcyMonthP25 || 0}
              p50Month={planSummary?.bankruptcyMonthP50 || 0}
              p75Month={planSummary?.bankruptcyMonthP75 || 0}
              p90Month={planSummary?.bankruptcyMonthP90 || 0}
            />
          </div>
        )}
      </div>

      {/* Risk message - compact */}
      <div className="mt-2 pt-2 border-t border-areum-border">
        <span className="text-xs-areum text-areum-text-secondary">
          {getBankruptcyMessage(probability)}
        </span>
      </div>
    </div>
  );
};

export default BankruptcyRiskWidget;