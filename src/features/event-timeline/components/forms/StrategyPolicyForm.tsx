/**
 * StrategyPolicyForm - Form for creating/editing STRATEGY_POLICY events
 *
 * This form allows users to create duration-based strategy events that appear
 * on the timeline visualization. Strategies are "meta-events" that define
 * when a financial strategy is active and configure its behavior.
 */

import React, { useEffect } from 'react';
import { Input, Select } from '@/components/ui';
import { H4, BodyBase, Caption } from '@/components/ui/Typography';
import { FinancialEvent, EventType, EventPriority } from '@/types';
import { getCalendarYearAndMonthFromMonthOffset } from '@/utils/financialCalculations';
import { useStartDate } from '@/hooks/useDateSettings';
import {
  StrategyPhase,
  STRATEGY_PHASE_COLORS,
  getStrategyPhaseLabel,
} from '@/types/events/strategy-events';

interface StrategyPolicyFormProps {
  formData: Partial<FinancialEvent>;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear?: number;
  baseMonth?: number;
  currentAge?: number;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
}

// Available strategy types for selection
const STRATEGY_TYPES = [
  { value: 'tax-loss-harvesting', label: 'Tax Loss Harvesting', phase: 'maintenance' as StrategyPhase },
  { value: 'asset-allocation', label: 'Asset Allocation', phase: 'rebalancing' as StrategyPhase },
  { value: 'roth-conversion', label: 'Roth Conversion Ladder', phase: 'conversion' as StrategyPhase },
  { value: 'retirement-withdrawal', label: 'Retirement Withdrawal', phase: 'withdrawal' as StrategyPhase },
  { value: 'contribution-optimization', label: 'Contribution Optimization', phase: 'accumulation' as StrategyPhase },
  { value: 'rebalancing', label: 'Portfolio Rebalancing', phase: 'rebalancing' as StrategyPhase },
];

// Strategy type to category mapping
const STRATEGY_TYPE_CATEGORIES: Record<string, string> = {
  'tax-loss-harvesting': 'TAX_OPTIMIZATION',
  'asset-allocation': 'INVESTMENT',
  'roth-conversion': 'TAX_OPTIMIZATION',
  'retirement-withdrawal': 'RETIREMENT',
  'contribution-optimization': 'INVESTMENT',
  'rebalancing': 'INVESTMENT',
};

// Phase options for manual override
const PHASE_OPTIONS = [
  { value: 'accumulation', label: 'Accumulation (Building wealth)' },
  { value: 'conversion', label: 'Conversion (Tax optimization)' },
  { value: 'withdrawal', label: 'Withdrawal (Decumulation)' },
  { value: 'rebalancing', label: 'Rebalancing (Portfolio management)' },
  { value: 'maintenance', label: 'Maintenance (Ongoing)' },
];

export const StrategyPolicyForm: React.FC<StrategyPolicyFormProps> = ({
  formData,
  onChange,
  onDateChange,
  currentAge = 30,
  onValidationChange,
}) => {
  const { startYear, startMonth } = useStartDate();

  // Set defaults on mount
  useEffect(() => {
    if (!formData.strategyId) {
      onChange('strategyId', 'tax-loss-harvesting');
    }
    if (!formData.phase) {
      onChange('phase', 'maintenance');
    }
    if (!formData.strategyType) {
      onChange('strategyType', 'TAX_OPTIMIZATION');
    }
    if (formData.priority === undefined) {
      onChange('priority', EventPriority.STRATEGY_POLICY);
    }
    // Generate a unique ID if not present
    if (!formData.id) {
      onChange('id', `strategy-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`);
    }
  }, []);

  // Validate form
  useEffect(() => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Strategy name is required';
      isValid = false;
    }

    if (!formData.strategyId) {
      errors.strategyId = 'Please select a strategy type';
      isValid = false;
    }

    if (formData.startDateOffset === undefined || formData.startDateOffset < 0) {
      errors.startDateOffset = 'Start date is required';
      isValid = false;
    }

    // End date is optional, but if provided must be after start
    if (
      formData.endDateOffset !== undefined &&
      formData.startDateOffset !== undefined &&
      formData.endDateOffset <= formData.startDateOffset
    ) {
      errors.endDateOffset = 'End date must be after start date';
      isValid = false;
    }

    onValidationChange?.(isValid, errors);
  }, [formData, onValidationChange]);

  const getYearMonth = (offset?: number) => {
    if (offset === undefined) return { year: '', month: '' };
    const result = getCalendarYearAndMonthFromMonthOffset(startYear, startMonth, offset, currentAge);
    return {
      year: result.year.toString(),
      month: result.monthInYear.toString().padStart(2, '0'),
    };
  };

  const handleYearMonthChange = (field: string, year: string, month: string) => {
    if (year && month) {
      onDateChange(field, year, month);
    }
  };

  // When strategy type changes, update related fields
  const handleStrategyTypeChange = (strategyId: string) => {
    onChange('strategyId', strategyId);

    // Find the strategy definition
    const strategyDef = STRATEGY_TYPES.find((s) => s.value === strategyId);
    if (strategyDef) {
      // Update phase to match strategy type
      onChange('phase', strategyDef.phase);
      // Update strategy type category
      onChange('strategyType', STRATEGY_TYPE_CATEGORIES[strategyId] || 'GENERAL');
      // Update visualization color
      onChange('visualizationColor', STRATEGY_PHASE_COLORS[strategyDef.phase]);
      // Auto-set name if empty
      if (!formData.name || formData.name === '') {
        onChange('name', strategyDef.label);
      }
    }
  };

  const currentPhase = (formData.phase as StrategyPhase) || 'maintenance';
  const phaseColor = STRATEGY_PHASE_COLORS[currentPhase] || STRATEGY_PHASE_COLORS.maintenance;

  return (
    <div className="space-y-6">
      {/* Strategy Type Selection */}
      <div>
        <H4 className="mb-4 flex items-center">
          <div
            className="w-2 h-2 rounded-full mr-3"
            style={{ backgroundColor: phaseColor }}
          />
          Strategy Type
        </H4>
        <div className="space-y-4">
          <Select
            label="Strategy"
            options={STRATEGY_TYPES.map((s) => ({ value: s.value, label: s.label }))}
            value={formData.strategyId || 'tax-loss-harvesting'}
            onChange={handleStrategyTypeChange}
            helperText="Select the type of financial strategy"
          />

          <Input
            label="Strategy Name"
            value={formData.name || ''}
            onChange={(e) => onChange('name', (e.target as HTMLInputElement).value)}
            placeholder="e.g., Tax Loss Harvesting 2025-2030"
            helperText="A descriptive name for this strategy"
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-areum-accent rounded-full mr-3" />
          Strategy Duration
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="month"
              value={
                formData.startDateOffset !== undefined
                  ? `${getYearMonth(formData.startDateOffset).year}-${getYearMonth(formData.startDateOffset).month}`
                  : ''
              }
              onChange={(e) => {
                const [year, month] = (e.target as HTMLInputElement).value.split('-');
                handleYearMonthChange('startDateOffset', year, month);
              }}
              helperText="When strategy becomes active"
            />

            <Input
              label="End Date (Optional)"
              type="month"
              value={
                formData.endDateOffset !== undefined
                  ? `${getYearMonth(formData.endDateOffset).year}-${getYearMonth(formData.endDateOffset).month}`
                  : ''
              }
              onChange={(e) => {
                const value = (e.target as HTMLInputElement).value;
                if (value) {
                  const [year, month] = value.split('-');
                  handleYearMonthChange('endDateOffset', year, month);
                } else {
                  onChange('endDateOffset', undefined);
                }
              }}
              helperText="Leave empty for ongoing strategy"
            />
          </div>
        </div>
      </div>

      {/* Phase & Configuration */}
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-violet-500 rounded-full mr-3" />
          Strategy Phase
        </H4>
        <div className="space-y-4">
          <Select
            label="Phase"
            options={PHASE_OPTIONS}
            value={formData.phase || 'maintenance'}
            onChange={(value) => {
              onChange('phase', value);
              onChange('visualizationColor', STRATEGY_PHASE_COLORS[value as StrategyPhase]);
            }}
            helperText="The financial lifecycle phase of this strategy"
          />

          <Input
            label="Policy Summary"
            value={formData.policySummary || ''}
            onChange={(e) => onChange('policySummary', (e.target as HTMLInputElement).value)}
            placeholder="e.g., Harvest losses quarterly when threshold exceeds $3,000"
            helperText="Brief description of the strategy policy"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-areum-accent/10 border border-areum-accent/30 rounded-md-areum p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-areum-accent">📊</span>
          </div>
          <div className="ml-3">
            <BodyBase weight="medium" className="text-areum-text-primary">
              Strategy Policies
            </BodyBase>
            <BodyBase className="mt-1 text-areum-text-secondary">
              Strategy policies define when automated financial decisions are active. They appear as
              colored bands on your projection chart and help visualize your financial lifecycle
              phases.
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyPolicyForm;
