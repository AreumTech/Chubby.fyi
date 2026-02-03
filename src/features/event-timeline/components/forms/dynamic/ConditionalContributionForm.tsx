import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface ConditionalContributionFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

export const ConditionalContributionForm: React.FC<ConditionalContributionFormProps> = ({
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
    if (!formData.endDateOffset) return { year: currentYear + 40, month: 12 };
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
          placeholder="e.g., Emergency Fund First Savings"
        />
        <Caption color="secondary" className="mt-1">
          Give this strategy a descriptive name
        </Caption>
      </div>

      {/* Cash Balance Condition */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <H3>Cash Balance Condition</H3>

        <div>
          <FormLabel>Minimum Cash to Maintain</FormLabel>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={formData.cashThreshold || 10000}
              onChange={(e) => onChange('cashThreshold', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="10000"
              min="0"
              step="1000"
            />
          </div>
          <Caption color="secondary" className="mt-1">
            Only invest money above this cash cushion
          </Caption>
        </div>

        <div>
          <FormLabel>How to Handle Excess Cash</FormLabel>
          <select
            value={formData.excessHandling || 'ALL'}
            onChange={(e) => onChange('excessHandling', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">Invest all excess cash</option>
            <option value="PERCENTAGE">Invest a percentage of excess</option>
            <option value="FIXED">Invest a fixed amount when available</option>
          </select>
        </div>

        {formData.excessHandling === 'PERCENTAGE' && (
          <div>
            <FormLabel>
              Percentage of Excess to Invest
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.excessPercentage || 50}
                onChange={(e) => onChange('excessPercentage', parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="50"
                min="1"
                max="100"
                step="5"
              />
              <Caption color="secondary">%</Caption>
            </div>
            <Caption color="secondary" className="mt-1">
              Keep some excess as additional buffer
            </Caption>
          </div>
        )}

        {formData.excessHandling === 'FIXED' && (
          <div>
            <FormLabel>
              Fixed Amount to Invest
            </FormLabel>
            <div className="flex items-center space-x-2">
              <Caption color="secondary">$</Caption>
              <input
                type="number"
                value={formData.fixedAmount || 1000}
                onChange={(e) => onChange('fixedAmount', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="1000"
                min="100"
                step="100"
              />
            </div>
            <Caption color="secondary" className="mt-1">
              Invest this amount whenever excess is available
            </Caption>
          </div>
        )}
      </div>

      {/* Target Account */}
      <div>
        <FormLabel>
          Investment Account
        </FormLabel>
        <select
          value={formData.targetAccountType || 'taxable'}
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
          {accountTypes.find(a => a.value === (formData.targetAccountType || 'taxable'))?.description}
        </Caption>
      </div>

      {/* Evaluation Frequency */}
      <div>
        <FormLabel>
          How Often to Check
        </FormLabel>
        <select
          value={formData.evaluationFrequency || 'MONTHLY'}
          onChange={(e) => onChange('evaluationFrequency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="MONTHLY">Every month</option>
          <option value="QUARTERLY">Every quarter</option>
          <option value="ANNUALLY">Once a year</option>
        </select>
        <Caption color="secondary" className="mt-1">
          How frequently to evaluate if conditions are met
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
            End Date (Optional)
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
              value={formData.priority || 50}
              onChange={(e) => onChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>High Priority (executes first)</option>
              <option value={50}>Normal Priority</option>
              <option value={90}>Low Priority (executes last)</option>
            </select>
            <Caption color="secondary" className="mt-1">
              When multiple conditional events trigger, priority determines order
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
                Pause during market downturns
              </Caption>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Stop contributions if market is down &gt;20% from peak
            </Caption>
          </div>
        </div>
      </details>

      {/* Educational Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <H4 className="text-blue-900 mb-2">
          💡 How This Works
        </H4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Automatically invests money only when your cash balance exceeds your threshold</li>
          <li>• Perfect for maintaining an emergency fund while maximizing investments</li>
          <li>• Prevents over-investing that could leave you cash-poor</li>
          <li>• Example: Keep $10k in cash, invest everything above that amount</li>
        </ul>
      </div>
    </div>
  );
};