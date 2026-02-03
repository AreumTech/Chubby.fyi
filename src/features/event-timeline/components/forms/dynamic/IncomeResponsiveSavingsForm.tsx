import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface IncomeResponsiveSavingsFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

export const IncomeResponsiveSavingsForm: React.FC<IncomeResponsiveSavingsFormProps> = ({
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
    { value: 'tax_deferred', label: '401(k) / Traditional IRA', description: 'Pre-tax contributions, automatically reduce taxable income' },
    { value: 'roth', label: 'Roth IRA / Roth 401(k)', description: 'After-tax contributions, tax-free growth' },
    { value: 'taxable', label: 'Taxable Brokerage', description: 'Flexible access for income fluctuations' },
    { value: '529', label: '529 Education', description: 'Tax-free for education expenses' },
  ];

  // Helper function to add/update income threshold
  const updateIncomeThreshold = (index: number, field: string, value: any) => {
    const thresholds = formData.incomeThresholds || [];
    const updated = [...thresholds];
    if (!updated[index]) {
      updated[index] = {};
    }
    updated[index][field] = value;
    onChange('incomeThresholds', updated);
  };

  const addIncomeThreshold = () => {
    const thresholds = formData.incomeThresholds || [];
    onChange('incomeThresholds', [
      ...thresholds,
      { incomeIncrease: 10000, savingsRateAdjustment: 1, description: 'New threshold' }
    ]);
  };

  const removeIncomeThreshold = (index: number) => {
    const thresholds = formData.incomeThresholds || [];
    onChange('incomeThresholds', thresholds.filter((_: any, i: number) => i !== index));
  };

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
          placeholder="e.g., Auto-Scaling Retirement Savings"
        />
        <Caption color="secondary" className="mt-1">
          Give this income-responsive savings strategy a descriptive name
        </Caption>
      </div>

      {/* Base Savings Configuration */}
      <div className="bg-green-50 p-4 rounded-lg space-y-4">
        <H3>Base Savings Configuration</H3>

        <div>
          <FormLabel>
            Starting Savings Rate
          </FormLabel>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.baseSavingsRate || 15}
              onChange={(e) => onChange('baseSavingsRate', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="15"
              min="0"
              max="50"
              step="0.5"
            />
            <span className="text-gray-500">% of gross income</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Your baseline savings rate at current income level
          </Caption>
        </div>

        <div>
          <FormLabel>
            Target Account
          </FormLabel>
          <select
            value={formData.targetAccountType || 'tax_deferred'}
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
            {accountTypes.find(a => a.value === (formData.targetAccountType || 'tax_deferred'))?.description}
          </Caption>
        </div>
      </div>

      {/* Income Response Rules */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <H3>Income Response Rules</H3>
          <button
            type="button"
            onClick={addIncomeThreshold}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Add Rule
          </button>
        </div>
        
        <div className="space-y-3">
          {(formData.incomeThresholds || [
            { incomeIncrease: 10000, savingsRateAdjustment: 1, description: 'First $10k raise' },
            { incomeIncrease: 25000, savingsRateAdjustment: 2, description: 'Major promotion' }
          ]).map((threshold: any, index: number) => (
            <div key={index} className="bg-white p-3 rounded border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Rule {index + 1}</span>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeIncomeThreshold(index)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FormLabel className="text-xs mb-1">
                    Income Increase
                  </FormLabel>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">$</span>
                    <input
                      type="number"
                      value={threshold.incomeIncrease || 0}
                      onChange={(e) => updateIncomeThreshold(index, 'incomeIncrease', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10000"
                      min="1000"
                      step="1000"
                    />
                  </div>
                </div>

                <div>
                  <FormLabel className="text-xs mb-1">
                    Rate Adjustment
                  </FormLabel>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">+</span>
                    <input
                      type="number"
                      value={threshold.savingsRateAdjustment || 0}
                      onChange={(e) => updateIncomeThreshold(index, 'savingsRateAdjustment', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1"
                      min="0.5"
                      max="10"
                      step="0.5"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>

                <div>
                  <FormLabel className="text-xs mb-1">
                    Description
                  </FormLabel>
                  <input
                    type="text"
                    value={threshold.description || ''}
                    onChange={(e) => updateIncomeThreshold(index, 'description', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Annual raise"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-blue-700">
          <strong>Example:</strong> With a $10k income increase and +1% adjustment, your savings rate 
          would increase from 15% to 16% of total income.
        </div>
      </div>

      {/* Savings Rate Limits */}
      <div className="bg-yellow-50 p-4 rounded-lg space-y-4">
        <H3>Savings Rate Constraints</H3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>
              Minimum Savings Rate
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.minSavingsRate || 5}
                onChange={(e) => onChange('minSavingsRate', parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="5"
                min="0"
                max="30"
                step="0.5"
              />
              <span className="text-gray-500">%</span>
            </div>
            <Caption color="secondary" className="mt-1">
              Never go below this rate, even if income drops
            </Caption>
          </div>

          <div>
            <FormLabel>
              Maximum Savings Rate
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.maxSavingsRate || 50}
                onChange={(e) => onChange('maxSavingsRate', parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="50"
                min="10"
                max="80"
                step="1"
              />
              <span className="text-gray-500">%</span>
            </div>
            <Caption color="secondary" className="mt-1">
              Cap savings rate for lifestyle balance
            </Caption>
          </div>
        </div>

        <div>
          <FormLabel>
            Income Smoothing Period
          </FormLabel>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.smoothingPeriod || 3}
              onChange={(e) => onChange('smoothingPeriod', parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="3"
              min="1"
              max="12"
              step="1"
            />
            <span className="text-gray-500">months</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Average income changes over this period to avoid reacting to temporary fluctuations
          </Caption>
        </div>
      </div>

      {/* Income Calculation Settings */}
      <div className="bg-purple-50 p-4 rounded-lg space-y-4">
        <H3>Income Calculation Settings</H3>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.useGrossIncome !== false}
              onChange={(e) => onChange('useGrossIncome', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Use gross income (before taxes)
            </span>
          </label>
          <Caption color="secondary" className="mt-1 ml-6">
            Recommended: Calculate savings rate based on pre-tax income
          </Caption>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.includeBonus || true}
              onChange={(e) => onChange('includeBonus', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Include bonuses and variable income
            </span>
          </label>
          <Caption color="secondary" className="mt-1 ml-6">
            Include irregular income like bonuses, commissions, and overtime
          </Caption>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.excludeOneTimeEvents || true}
              onChange={(e) => onChange('excludeOneTimeEvents', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Exclude one-time income events
            </span>
          </label>
          <Caption color="secondary" className="mt-1 ml-6">
            Don't adjust savings rate for inheritance, stock sales, etc.
          </Caption>
        </div>

        <div>
          <FormLabel>
            Rolling Average Period
          </FormLabel>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.rollingAveragePeriod || 6}
              onChange={(e) => onChange('rollingAveragePeriod', parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="6"
              min="3"
              max="24"
              step="1"
            />
            <span className="text-gray-500">months for income calculation</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Use this many months to calculate average income for rate adjustments
          </Caption>
        </div>
      </div>

      {/* Evaluation Frequency */}
      <div>
        <FormLabel>
          Review Frequency
        </FormLabel>
        <select
          value={formData.evaluationFrequency || 'QUARTERLY'}
          onChange={(e) => onChange('evaluationFrequency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="MONTHLY">Monthly review</option>
          <option value="QUARTERLY">Quarterly review</option>
          <option value="ANNUALLY">Annual review</option>
        </select>
        <Caption color="secondary" className="mt-1">
          How often to check income changes and adjust savings rates
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
              value={formData.priority || 22}
              onChange={(e) => onChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={20}>High Priority (before other investments)</option>
              <option value={22}>Normal Priority (with regular contributions)</option>
              <option value={25}>Low Priority (after other savings)</option>
            </select>
            <Caption color="secondary" className="mt-1">
              When to make income-responsive adjustments relative to other events
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.gradualAdjustments || true}
                onChange={(e) => onChange('gradualAdjustments', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Make gradual rate adjustments
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Spread rate increases over 3-6 months instead of immediate jumps
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.considerLifestyleInflation || true}
                onChange={(e) => onChange('considerLifestyleInflation', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Account for lifestyle inflation
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Allow some income increases to go toward lifestyle improvements
            </Caption>
          </div>
        </div>
      </details>

      {/* Educational Help */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <H4 className="text-green-900 mb-2">
          💡 Income-Responsive Savings Strategy
        </H4>
        <div className="text-xs text-green-700 space-y-2">
          <div>
            <strong>Smart Scaling:</strong> Automatically increase your savings rate as your income grows,
            helping you avoid lifestyle inflation while building wealth faster.
          </div>
          <div>
            <strong>Key Benefits:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Captures windfalls: Bonuses and raises go toward savings, not just spending</li>
              <li>Prevents lifestyle inflation by automating "pay yourself first"</li>
              <li>Scales smoothly: Uses rolling averages to avoid reacting to temporary changes</li>
              <li>Built-in safeguards: Minimum and maximum rates protect your budget</li>
            </ul>
          </div>
          <div>
            <strong>Example Strategy:</strong> Start at 15% savings rate. For every $10k income increase,
            raise rate by 1%. This way a $80k → $100k raise would increase your rate from 15% to 17%,
            investing an extra $2k annually while still enjoying some lifestyle improvement.
          </div>
        </div>
      </div>
    </div>
  );
};