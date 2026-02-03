/**
 * Goal Analysis Section - Hybrid Style (Option C)
 *
 * Simplified cards with status badge and probability percentage
 * No complex visualizations - clean and scannable
 */

import React, { useMemo } from 'react';
import { useDataService } from '@/hooks/useDataService';
import { useAppStore } from '@/store/appStore';
import { formatCurrencyShort } from '@/utils/formatting';
import { getGoalIcon } from '@/utils/eventIcons';
import {
  determineGoalStatus,
  getStatusLabel,
} from '@/utils/goalStatusHelpers';
import { Text } from '@/components/ui/Typography';
import { Section } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * Get Tailwind color class based on probability percentage
 */
function getProbabilityColorClass(probabilityPercent: number): string {
  if (probabilityPercent >= 70) return 'text-areum-success';
  if (probabilityPercent >= 50) return 'text-areum-warning';
  return 'text-areum-danger';
}

/**
 * Formats account type for display
 */
function formatAccountType(accountType?: string): string {
  if (!accountType) return '';
  const mapping: Record<string, string> = {
    'tax_deferred': '401k/IRA',
    'taxDeferred': '401k/IRA',
    '401k': '401k',
    'ira': 'IRA',
    'roth': 'Roth',
    'rothIra': 'Roth',
    'taxable': 'Taxable',
    'cash': 'Cash',
    '529': '529',
    'total': 'All accounts',
  };
  return mapping[accountType] || accountType;
}

export const GoalAnalysisSection: React.FC = () => {
  const {
    hasData,
    getGoalOutcomes,
  } = useDataService();
  const { getActiveScenario } = useAppStore();

  const activeScenario = getActiveScenario();
  const enhancedGoals = activeScenario?.enhancedGoals || [];

  const rawGoalOutcomes = hasData ? getGoalOutcomes() : [];

  // Filter out bankruptcy goal (shown in separate widget)
  const goalOutcomes = useMemo(() => {
    return rawGoalOutcomes.filter(outcome => outcome.goalId !== 'default-bankruptcy-avoidance');
  }, [rawGoalOutcomes]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    const total = goalOutcomes.length;
    const onTrack = goalOutcomes.filter(g => determineGoalStatus(g.statusTag) === 'on-track').length;
    const needsAttention = goalOutcomes.filter(g => determineGoalStatus(g.statusTag) === 'at-risk').length;
    const critical = goalOutcomes.filter(g => determineGoalStatus(g.statusTag) === 'critical').length;
    return { total, onTrack, needsAttention, critical };
  }, [goalOutcomes]);

  // Enrich goal data with metadata
  const enrichedGoals = useMemo(() => {
    const goalMetaById = new Map(enhancedGoals.map(goal => [goal.id, goal]));

    return goalOutcomes.map(outcome => {
      const meta = goalMetaById.get(outcome.goalId);
      const status = determineGoalStatus(outcome.statusTag);
      const targetDate = meta?.targetDate;
      const targetYear = targetDate ? (targetDate instanceof Date ? targetDate.getFullYear() : new Date(targetDate).getFullYear()) : null;

      return {
        id: outcome.goalId,
        name: outcome.goalName || meta?.name || 'Financial Goal',
        icon: getGoalIcon(meta?.category || 'CUSTOM'),
        targetAmount: outcome.targetAmount || 0,
        status,
        statusLabel: getStatusLabel(status),
        targetYear,
        probability: outcome.probability || 0,
        accountType: meta?.targetAccount?.type,
      };
    });
  }, [goalOutcomes, enhancedGoals]);

  if (!hasData) {
    return (
      <Section number={1} title="FINANCIAL GOALS" className="mb-6">
        <div className="text-center py-8">
          <Text size="sm" color="secondary">Run a simulation to see how you're tracking toward your goals</Text>
        </div>
      </Section>
    );
  }

  if (goalOutcomes.length === 0) {
    return (
      <Section number={1} title="FINANCIAL GOALS" className="mb-6">
        <div className="text-center py-8">
          <Text size="base" weight="medium" className="mb-2">No goals yet</Text>
          <Text size="sm" color="secondary" className="mb-4">Set your first financial goal to start tracking progress</Text>
          <Text size="sm" color="secondary">
            Popular starting goals: 🏠 House Down Payment • 🔥 Retirement Fund • 🚗 Emergency Fund
          </Text>
        </div>
      </Section>
    );
  }

  return (
    <Section number={1} title="FINANCIAL GOALS" className="mb-4" dense>
      {/* Summary badges */}
      <div className="flex items-center gap-1.5 mb-2">
        {summary.onTrack > 0 && <StatusBadge variant="success" size="sm">{summary.onTrack} On Track</StatusBadge>}
        {summary.needsAttention > 0 && <StatusBadge variant="warning" size="sm">{summary.needsAttention} Needs Attention</StatusBadge>}
        {summary.critical > 0 && <StatusBadge variant="danger" size="sm">{summary.critical} Behind</StatusBadge>}
      </div>

      {/* Goal cards - hybrid style */}
      <div className="space-y-1.5">
        {enrichedGoals.map(goal => {
          const amount = formatCurrencyShort(goal.targetAmount);
          const account = formatAccountType(goal.accountType);
          const year = goal.targetYear?.toString();
          const details = [amount, account, year].filter(Boolean).join(' • ');
          const probabilityPercent = Math.round(goal.probability * 100);

          return (
            <div
              key={goal.id}
              className="group relative px-2.5 py-2 rounded-md-areum cursor-pointer bg-areum-surface border border-areum-border hover:border-areum-accent/30 hover:bg-areum-canvas/50 transition-colors"
            >
              {/* Left accent bar based on status */}
              <div className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full ${
                goal.status === 'on-track' ? 'bg-areum-success' :
                goal.status === 'at-risk' ? 'bg-areum-warning' :
                goal.status === 'critical' ? 'bg-areum-danger' :
                'bg-areum-text-tertiary'
              }`} />

              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">{goal.icon}</span>
                <div className="flex-1 min-w-0">
                  {/* Top row: name + probability + status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm-areum font-medium text-areum-text-primary truncate">
                      {goal.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Probability % */}
                      <span className={`text-xs-areum font-semibold ${getProbabilityColorClass(probabilityPercent)}`}>
                        {probabilityPercent}%
                      </span>
                      {/* Status badge */}
                      <StatusBadge
                        variant={
                          goal.status === 'on-track' ? 'success' :
                          goal.status === 'at-risk' ? 'warning' :
                          goal.status === 'critical' ? 'danger' :
                          'neutral'
                        }
                        size="sm"
                      >
                        {goal.statusLabel}
                      </StatusBadge>
                    </div>
                  </div>
                  {/* Bottom row: details */}
                  {details && (
                    <div className="text-xs-areum text-areum-text-secondary mt-0.5">
                      {details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
