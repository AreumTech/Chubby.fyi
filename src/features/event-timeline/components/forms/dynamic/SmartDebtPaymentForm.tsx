import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface SmartDebtPaymentFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

export const SmartDebtPaymentForm: React.FC<SmartDebtPaymentFormProps> = ({
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
    if (!formData.endDateOffset) return { year: currentYear + 10, month: 12 };
    const date = new Date(baseYear, baseMonth - 1);
    date.setMonth(date.getMonth() + formData.endDateOffset);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  };

  const startDate = getStartDateComponents();
  const endDate = getEndDateComponents();

  const accountTypes: { value: StandardAccountType; label: string; description: string }[] = [
    { value: 'tax_deferred', label: '401(k) / Traditional IRA', description: 'Pre-tax contributions, taxed on withdrawal' },
    { value: 'roth', label: 'Roth IRA / Roth 401(k)', description: 'After-tax contributions, tax-free growth' },
    { value: 'taxable', label: 'Taxable Brokerage', description: 'Flexible access, taxed on gains' },
    { value: '529', label: '529 Education', description: 'Tax-free for education expenses' },
  ];

  const strategies = [
    { value: 'AVALANCHE', label: 'Debt Avalanche', description: 'Pay highest interest rate first (mathematically optimal)' },
    { value: 'SNOWBALL', label: 'Debt Snowball', description: 'Pay smallest balance first (psychological motivation)' },
    { value: 'HIGHEST_PAYMENT', label: 'Highest Payment', description: 'Pay debt with highest minimum payment first' },
    { value: 'CUSTOM', label: 'Custom Order', description: 'Manually specify payment order' },
  ];

  return (
    <div className="space-y-6">
      {/* Event Name */}
      <div>
        <FormLabel>Event Name</FormLabel>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Aggressive Debt Payoff"
        />
        <Caption color="secondary" className="mt-1">
          Give this debt strategy a descriptive name
        </Caption>
      </div>

      {/* Debt Strategy */}
      <div className="bg-red-50 p-4 rounded-lg space-y-4">
        <H3>Debt Elimination Strategy</H3>

        <div>
          <FormLabel>Payment Strategy</FormLabel>
          <select
            value={formData.strategy || 'AVALANCHE'}
            onChange={(e) => onChange('strategy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {strategies.map((strategy) => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label}
              </option>
            ))}
          </select>
          <Caption color="secondary" className="mt-1">
            {strategies.find(s => s.value === (formData.strategy || 'AVALANCHE'))?.description}
          </Caption>
        </div>
      </div>

      {/* Extra Payment Configuration */}
      <div className="bg-orange-50 p-4 rounded-lg space-y-4">
        <H3>Extra Payment Amount</H3>

        <div>
          <FormLabel>How to Calculate Extra Payment</FormLabel>
          <select
            value={formData.extraPaymentType || 'FIXED_AMOUNT'}
            onChange={(e) => onChange('extraPaymentType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="FIXED_AMOUNT">Fixed monthly amount</option>
            <option value="PERCENTAGE_OF_INCOME">Percentage of monthly income</option>
            <option value="SURPLUS_AFTER_EXPENSES">All surplus after expenses</option>
          </select>
        </div>

        {formData.extraPaymentType === 'FIXED_AMOUNT' && (
          <div>
            <FormLabel>Extra Payment Amount</FormLabel>
            <div className="flex items-center space-x-2">
              <Caption color="secondary">$</Caption>
              <input
                type="number"
                value={formData.extraPaymentAmount || 500}
                onChange={(e) => onChange('extraPaymentAmount', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="500"
                min="0"
                step="50"
              />
              <Caption color="secondary">per month</Caption>
            </div>
            <Caption color="secondary" className="mt-1">
              This amount will be added to minimum payments
            </Caption>
          </div>
        )}

        {formData.extraPaymentType === 'PERCENTAGE_OF_INCOME' && (
          <div>
            <FormLabel>Percentage of Income for Extra Payments</FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.extraPaymentPercentage || 10}
                onChange={(e) => onChange('extraPaymentPercentage', parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="10"
                min="1"
                max="50"
                step="1"
              />
              <Caption color="secondary">% of gross income</Caption>
            </div>
            <Caption color="secondary" className="mt-1">
              Scales with income changes automatically
            </Caption>
          </div>
        )}
      </div>

      {/* Emergency Fund Protection */}
      <div className="bg-green-50 p-4 rounded-lg space-y-4">
        <H3>Emergency Fund Protection</H3>

        <div>
          <FormLabel>Minimum Cash to Maintain</FormLabel>
          <div className="flex items-center space-x-2">
            <Caption color="secondary">$</Caption>
            <input
              type="number"
              value={formData.emergencyFundTarget || 5000}
              onChange={(e) => onChange('emergencyFundTarget', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="5000"
              min="1000"
              step="500"
            />
          </div>
          <Caption color="secondary" className="mt-1">
            Never make extra debt payments if cash falls below this amount
          </Caption>
        </div>
      </div>

      {/* Completion Actions */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <H3>After Debts Are Paid Off</H3>

        <div>
          <FormLabel>Redirect Payment Amount To</FormLabel>
          <select
            value={formData.completionRedirectAccount || 'tax_deferred'}
            onChange={(e) => onChange('completionRedirectAccount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {accountTypes.map((account) => (
              <option key={account.value} value={account.value}>
                {account.label}
              </option>
            ))}
          </select>
          <Caption color="secondary" className="mt-1">
            {accountTypes.find(a => a.value === (formData.completionRedirectAccount || 'tax_deferred'))?.description}
          </Caption>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.continueFullAmount || true}
              onChange={(e) => onChange('continueFullAmount', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Caption color="primary">
              Continue investing the full payment amount
            </Caption>
          </label>
          <Caption color="secondary" className="mt-1 ml-6">
            Keep investing the same amount you were paying toward debt
          </Caption>
        </div>
      </div>

      {/* Evaluation Frequency */}
      <div>
        <FormLabel>Payment Frequency</FormLabel>
        <select
          value={formData.evaluationFrequency || 'MONTHLY'}
          onChange={(e) => onChange('evaluationFrequency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="MONTHLY">Monthly payments</option>
          <option value="QUARTERLY">Quarterly payments</option>
          <option value="ANNUALLY">Annual lump sum</option>
        </select>
        <Caption color="secondary" className="mt-1">
          How often to make extra debt payments
        </Caption>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel>Start Date</FormLabel>
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
          <FormLabel>End Date (Optional)</FormLabel>
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
            <FormLabel>Target Specific Debts (Optional)</FormLabel>
            <input
              type="text"
              value={formData.targetDebts?.join(', ') || ''}
              onChange={(e) => onChange('targetDebts', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Leave empty to target all debts"
            />
            <Caption color="secondary" className="mt-1">
              Comma-separated list of debt names to target (leave empty for all debts)
            </Caption>
          </div>

          <div>
            <FormLabel>Priority Level</FormLabel>
            <select
              value={formData.priority || 15}
              onChange={(e) => onChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>High Priority (before investments)</option>
              <option value={15}>Normal Priority (after fixed expenses)</option>
              <option value={20}>Low Priority (after other savings)</option>
            </select>
            <Caption color="secondary" className="mt-1">
              When to make debt payments relative to other financial events
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.pauseDuringDownturn || false}
                onChange={(e) => onChange('pauseDuringDownturn', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Caption color="primary">
                Pause extra payments during market downturns
              </Caption>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Redirect extra payments to investments when markets are down &gt;20%
            </Caption>
          </div>
        </div>
      </details>

      {/* Educational Help */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <H4 className="text-red-900 mb-2">
          💡 Smart Debt Payment Strategies
        </H4>
        <div className="text-xs text-red-700 space-y-2">
          <div>
            <strong>Debt Avalanche:</strong> Pay minimums on all debts, then put extra money toward highest interest rate.
            Saves the most money long-term.
          </div>
          <div>
            <strong>Debt Snowball:</strong> Pay minimums on all debts, then put extra money toward smallest balance.
            Provides quick wins for motivation.
          </div>
          <div>
            <strong>Key Benefits:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Automatically protects your emergency fund</li>
              <li>Redirects payments to investments once debt-free</li>
              <li>Adjusts payment amounts based on income changes</li>
              <li>Can pause during market downturns to take advantage of low prices</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
