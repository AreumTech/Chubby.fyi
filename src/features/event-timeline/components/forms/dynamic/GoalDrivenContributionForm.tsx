import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface GoalDrivenContributionFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

export const GoalDrivenContributionForm: React.FC<GoalDrivenContributionFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear,
  baseMonth,
  currentAge,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Get start date components
  const getStartDateComponents = () => {
    if (!formData.startDateOffset) return { year: currentYear, month: currentMonth };
    const date = new Date(baseYear, baseMonth - 1);
    date.setMonth(date.getMonth() + formData.startDateOffset);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  };

  // Get end date components
  const getEndDateComponents = () => {
    if (!formData.endDateOffset) return { year: currentYear + 30, month: 12 };
    const date = new Date(baseYear, baseMonth - 1);
    date.setMonth(date.getMonth() + formData.endDateOffset);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  };

  const startDate = getStartDateComponents();
  const endDate = getEndDateComponents();

  const accountTypes: { value: StandardAccountType; label: string; description: string }[] = [
    { value: 'cash', label: 'Cash / Savings', description: 'For short-term goals and emergency funds' },
    { value: 'taxable', label: 'Taxable Brokerage', description: 'Flexible access, for medium-term goals' },
    { value: 'tax_deferred', label: '401(k) / Traditional IRA', description: 'For retirement goals' },
    { value: 'roth', label: 'Roth IRA / Roth 401(k)', description: 'For long-term and retirement goals' },
    { value: '529', label: '529 Education', description: 'For education-related goals' },
  ];

  const adjustmentStrategies = [
    { value: 'PROGRESS_BASED', label: 'Progress-Based', description: 'Adjust based on current vs target progress' },
    { value: 'TIME_BASED', label: 'Time-Based', description: 'Adjust based on time remaining to goal' },
    { value: 'DEFICIT_BASED', label: 'Deficit-Based', description: 'Increase contributions when behind target' },
    { value: 'MARKET_RESPONSIVE', label: 'Market-Responsive', description: 'Adjust based on market performance' },
  ];

  const aggressivenessLevels = [
    { value: 'CONSERVATIVE', label: 'Conservative', description: 'Small, gradual adjustments' },
    { value: 'MODERATE', label: 'Moderate', description: 'Balanced adjustment approach' },
    { value: 'AGGRESSIVE', label: 'Aggressive', description: 'Large adjustments to stay on track' },
  ];

  return (
    <div className="space-y-6">
      {/* Event Name */}
      <div>
        <FormLabel>
          Event Name
        </FormLabel>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., House Down Payment Saver"
        />
        <Caption color="secondary" className="mt-1">
          Give this goal-driven savings strategy a descriptive name
        </Caption>
      </div>

      {/* Goal Selection */}
      <div className="bg-purple-50 p-4 rounded-lg space-y-4">
        <H3>Goal Configuration</H3>

        <div>
          <FormLabel>
            Target Goal
          </FormLabel>
          <input
            type="text"
            value={formData.targetGoalId || ''}
            onChange={(e) => onChange('targetGoalId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., house-down-payment, vacation-fund"
          />
          <Caption color="secondary" className="mt-1">
            Enter the ID or name of the goal you want to track progress for
          </Caption>
        </div>

        <div>
          <FormLabel>
            Target Account for Contributions
          </FormLabel>
          <select
            value={formData.targetAccountType || 'cash'}
            onChange={(e) => onChange('targetAccountType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {accountTypes.map((account) => (
              <option key={account.value} value={account.value}>
                {account.label}
              </option>
            ))}
          </select>
          <Caption color="secondary" className="mt-1">
            {accountTypes.find(a => a.value === (formData.targetAccountType || 'cash'))?.description}
          </Caption>
        </div>
      </div>

      {/* Adjustment Strategy */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <H3>Contribution Adjustment Strategy</H3>

        <div>
          <FormLabel>
            Adjustment Method
          </FormLabel>
          <select
            value={formData.adjustmentType || 'PROGRESS_BASED'}
            onChange={(e) => onChange('adjustmentType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {adjustmentStrategies.map((strategy) => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label}
              </option>
            ))}
          </select>
          <Caption color="secondary" className="mt-1">
            {adjustmentStrategies.find(s => s.value === (formData.adjustmentType || 'PROGRESS_BASED'))?.description}
          </Caption>
        </div>

        <div>
          <FormLabel>
            Adjustment Aggressiveness
          </FormLabel>
          <select
            value={formData.aggressiveness || 'MODERATE'}
            onChange={(e) => onChange('aggressiveness', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {aggressivenessLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          <Caption color="secondary" className="mt-1">
            {aggressivenessLevels.find(l => l.value === (formData.aggressiveness || 'MODERATE'))?.description}
          </Caption>
        </div>
      </div>

      {/* Base Contribution Settings */}
      <div className="bg-green-50 p-4 rounded-lg space-y-4">
        <H3>Contribution Amounts</H3>

        <div>
          <FormLabel>
            Base Monthly Contribution
          </FormLabel>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={formData.baseContribution || 1000}
              onChange={(e) => onChange('baseContribution', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="1000"
              min="0"
              step="50"
            />
            <span className="text-gray-500">per month</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Starting contribution amount when on track
          </Caption>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>
              Minimum Contribution
            </FormLabel>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={formData.minContribution || 200}
                onChange={(e) => onChange('minContribution', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="200"
                min="0"
                step="50"
              />
            </div>
            <Caption color="secondary" className="mt-1">
              Never go below this amount
            </Caption>
          </div>

          <div>
            <FormLabel>
              Maximum Contribution
            </FormLabel>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={formData.maxContribution || 3000}
                onChange={(e) => onChange('maxContribution', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="3000"
                min="0"
                step="50"
              />
            </div>
            <Caption color="secondary" className="mt-1">
              Cap contributions at this amount
            </Caption>
          </div>
        </div>
      </div>

      {/* Progress Thresholds */}
      <div className="bg-yellow-50 p-4 rounded-lg space-y-4">
        <H3>Progress-Based Adjustments</H3>

        <div>
          <FormLabel>
            Maximum Adjustment per Period
          </FormLabel>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.maxAdjustmentPercentage || 25}
              onChange={(e) => onChange('maxAdjustmentPercentage', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="25"
              min="5"
              max="100"
              step="5"
            />
            <span className="text-gray-500">% change per evaluation</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Limits how much contributions can change at once
          </Caption>
        </div>

        <div className="space-y-3">
          <H4>Adjustment Triggers</H4>
          
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-red-600">Behind Target (&lt;80%)</div>
              <div className="text-gray-600 mt-1">Increase contributions significantly</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-yellow-600">Slightly Behind (80-95%)</div>
              <div className="text-gray-600 mt-1">Increase contributions moderately</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-green-600">On Track (&gt;95%)</div>
              <div className="text-gray-600 mt-1">Maintain base contribution</div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Frequency */}
      <div>
        <FormLabel>
          Review Frequency
        </FormLabel>
        <select
          value={formData.evaluationFrequency || 'MONTHLY'}
          onChange={(e) => onChange('evaluationFrequency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="MONTHLY">Monthly review</option>
          <option value="QUARTERLY">Quarterly review</option>
          <option value="ANNUALLY">Annual review</option>
        </select>
        <Caption color="secondary" className="mt-1">
          How often to check goal progress and adjust contributions
        </Caption>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel>
            Start Date
          </FormLabel>
          <div className="flex space-x-2">
            <select
              value={startDate.month}
              onChange={(e) => onDateChange('startDateOffset', String(startDate.year), e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={startDate.year}
              onChange={(e) => onDateChange('startDateOffset', e.target.value, String(startDate.month))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              min={currentYear}
              max={currentYear + 50}
            />
          </div>
        </div>

        <div>
          <FormLabel>
            End Date (Goal Target Date)
          </FormLabel>
          <div className="flex space-x-2">
            <select
              value={endDate.month}
              onChange={(e) => onDateChange('endDateOffset', String(endDate.year), e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={endDate.year}
              onChange={(e) => onDateChange('endDateOffset', e.target.value, String(endDate.month))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              min={startDate.year}
              max={currentYear + 50}
            />
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <details className="border-t pt-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
          Advanced Options
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <FormLabel>
              Priority Level
            </FormLabel>
            <select
              value={formData.priority || 25}
              onChange={(e) => onChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={20}>High Priority (before other investments)</option>
              <option value={25}>Normal Priority</option>
              <option value={30}>Low Priority (after other savings)</option>
            </select>
            <Caption color="secondary" className="mt-1">
              When to make goal contributions relative to other financial events
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.considerMarketConditions || false}
                onChange={(e) => onChange('considerMarketConditions', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Consider market conditions in adjustments
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Increase contributions during market downturns for better long-term returns
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.smoothAdjustments || true}
                onChange={(e) => onChange('smoothAdjustments', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Smooth contribution adjustments
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Gradually adjust contributions over time instead of sudden changes
            </Caption>
          </div>
        </div>
      </details>

      {/* Educational Help */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <H4 className="text-purple-900 mb-2">
          💡 Goal-Driven Savings Strategies
        </H4>
        <div className="text-xs text-purple-700 space-y-2">
          <div>
            <strong>Smart Goal Tracking:</strong> Automatically adjusts your savings rate based on how close
            you are to your target goal and timeline.
          </div>
          <div>
            <strong>Adjustment Strategies:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><strong>Progress-Based:</strong> Behind target? Increase contributions proportionally</li>
              <li><strong>Time-Based:</strong> Running out of time? Ramp up savings aggressively</li>
              <li><strong>Deficit-Based:</strong> Focus on closing the gap to your target amount</li>
              <li><strong>Market-Responsive:</strong> Take advantage of market conditions</li>
            </ul>
          </div>
          <div>
            <strong>Example:</strong> Saving for a $100k house down payment in 5 years. If you're behind target
            after 2 years, automatically increase monthly contributions to get back on track.
          </div>
        </div>
      </div>
    </div>
  );
};