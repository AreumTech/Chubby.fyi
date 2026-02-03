import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { Button } from '@/components/ui';
import { formatNumberWithCommas } from '@/utils/formatting';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface PercentageContributionFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

export const PercentageContributionForm: React.FC<PercentageContributionFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear,
  baseMonth,
  currentAge,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const getStartDateComponents = () => {
    if (!formData.startDateOffset) return { year: currentYear, month: currentMonth };
    const date = new Date(baseYear, baseMonth - 1);
    date.setMonth(date.getMonth() + formData.startDateOffset);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  };

  const getEndDateComponents = () => {
    if (!formData.endDateOffset) return { year: currentYear + 40, month: 12 };
    const date = new Date(baseYear, baseMonth - 1);
    date.setMonth(date.getMonth() + formData.endDateOffset);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  };

  const startDate = getStartDateComponents();
  const endDate = getEndDateComponents();

  const accountTypes: { value: StandardAccountType; label: string; description: string }[] = [
    { value: 'tax_deferred', label: '401(k) / Traditional IRA', description: 'Pre-tax contributions, reduces current taxes' },
    { value: 'roth', label: 'Roth IRA / Roth 401(k)', description: 'After-tax contributions, tax-free growth' },
    { value: 'taxable', label: 'Taxable Brokerage', description: 'Flexible access, taxed on gains' },
    { value: '529', label: '529 Education', description: 'Tax-free for education expenses' },
  ];

  const incomeTypes = [
    { value: 'GROSS', label: 'Gross Income (before taxes)', description: 'Calculate from total salary' },
    { value: 'NET', label: 'Net Income (after taxes)', description: 'Calculate from take-home pay' },
    { value: 'BONUS_ONLY', label: 'Bonuses Only', description: 'Save percentage of bonuses' },
    { value: 'RAISE_ONLY', label: 'Raises Only', description: 'Save percentage of salary increases' },
  ];

  // Quick percentage buttons helper
  const handleQuickPercentage = (percentage: number) => {
    onChange('percentage', percentage);
  };
  
  // Calculate example amounts
  const calculateExample = () => {
    const percentage = formData.percentage || 20;
    const baseIncome = formData.incomeBase === 'NET' ? 5000 : 8000;
    const monthly = (baseIncome * percentage / 100).toFixed(0);
    const annual = (baseIncome * 12 * percentage / 100).toFixed(0);
    return { monthly, annual };
  };

  const example = calculateExample();
  
  // Contribution limits for max button
  const getMaxContribution = () => {
    const accountType = formData.targetAccountType || 'tax_deferred';
    const limits = {
      'tax_deferred': 23500,
      'roth': 7000,
      '529': 19000
    };
    return limits[accountType as keyof typeof limits] || Infinity;
  };

  return (
    <div className="space-y-6">
      {/* Event Name */}
      <div>
        <FormLabel>
          Strategy Name
        </FormLabel>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., 20% Automatic Savings"
        />
        <Caption color="secondary" className="mt-1">
          Name your percentage-based savings strategy
        </Caption>
      </div>

      {/* Savings Percentage */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <H3>Savings Rate</H3>

        <div>
          <FormLabel>
            Percentage to Save
          </FormLabel>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="range"
                value={formData.percentage || 20}
                onChange={(e) => onChange('percentage', parseFloat(e.target.value))}
                className="flex-1"
                min="1"
                max="50"
                step="1"
              />
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  value={formData.percentage || 20}
                  onChange={(e) => onChange('percentage', parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="100"
                  step="1"
                />
                <span className="text-gray-500">%</span>
              </div>
            </div>
            
            {/* Quick Percentage Buttons */}
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-600 mb-2">Quick Percentages</p>
              <div className="flex flex-wrap gap-1">
                {[10, 15, 20, 25, 30].map(percent => (
                  <Button
                    key={percent}
                    size="sm"
                    variant={formData.percentage === percent ? "primary" : "secondary"}
                    onClick={() => handleQuickPercentage(percent)}
                    className="text-xs px-3 py-1"
                  >
                    {percent}%
                  </Button>
                ))}
              </div>
              
              {getMaxContribution() !== Infinity && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Max Contribution Limit</p>
                  <p className="text-xs text-gray-500">
                    {formData.targetAccountType || 'tax_deferred'}: ${formatNumberWithCommas(getMaxContribution())}/year
                  </p>
                </div>
              )}
            </div>
          </div>
          <Caption color="secondary" className="mt-1">
            Automatically save this percentage of income
          </Caption>
        </div>

        <div>
          <FormLabel>
            Calculate From
          </FormLabel>
          <select
            value={formData.incomeBase || 'GROSS'}
            onChange={(e) => onChange('incomeBase', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {incomeTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <Caption color="secondary" className="mt-1">
            {incomeTypes.find(t => t.value === (formData.incomeBase || 'GROSS'))?.description}
          </Caption>
        </div>

        {formData.incomeBase === 'RAISE_ONLY' && (
          <div>
            <FormLabel>
              Current Base Salary
            </FormLabel>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={formData.currentBaseSalary || 80000}
                onChange={(e) => onChange('currentBaseSalary', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="80000"
                min="0"
                step="1000"
              />
              <span className="text-sm text-gray-500">/year</span>
            </div>
            <Caption color="secondary" className="mt-1">
              Only income above this amount will be saved
            </Caption>
          </div>
        )}
      </div>

      {/* Target Account */}
      <div>
        <FormLabel>
          Save To Account
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

      {/* Contribution Limits */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel>
            Monthly Cap (Optional)
          </FormLabel>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={formData.monthlyMax || ''}
              onChange={(e) => onChange('monthlyMax', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="No limit"
              min="0"
              step="100"
            />
          </div>
          <Caption color="secondary" className="mt-1">
            Maximum per month
          </Caption>
        </div>

        <div>
          <FormLabel>
            Annual Cap (Optional)
          </FormLabel>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={formData.annualMax || ''}
              onChange={(e) => onChange('annualMax', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="No limit"
              min="0"
              step="500"
            />
          </div>
          <Caption color="secondary" className="mt-1">
            Maximum per year (e.g., IRA limit)
          </Caption>
        </div>
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
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.roundUpContributions || false}
                onChange={(e) => onChange('roundUpContributions', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Round up to nearest $100
              </span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.autoIncrease || false}
                onChange={(e) => onChange('autoIncrease', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Increase by 1%/yr
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Automatically increase savings rate each year
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.includeEmployerMatch || false}
                onChange={(e) => onChange('includeEmployerMatch', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Include employer match in percentage
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Count employer contributions toward your savings rate
            </Caption>
          </div>
        </div>
      </details>

      {/* Savings Preview */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <H4 className="text-green-900 mb-2">
          💰 Estimated Savings
        </H4>
        <div className="text-xs text-green-700 space-y-1">
          <p>Based on example {formData.incomeBase === 'NET' ? '$5,000/mo take-home' : '$8,000/mo gross'}:</p>
          <div className="flex justify-between mt-2">
            <span>Monthly contribution:</span>
            <span className="font-medium">${example.monthly}</span>
          </div>
          <div className="flex justify-between">
            <span>Annual contribution:</span>
            <span className="font-medium">${example.annual}</span>
          </div>
        </div>
      </div>

      {/* Educational Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <H4 className="text-blue-900 mb-2">
          💡 Pay Yourself First Strategy
        </H4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Automatically saves a percentage before you can spend it</li>
          <li>• Adjusts with income changes - raises automatically increase savings</li>
          <li>• Recommended rates: 10% minimum, 15-20% for comfortable retirement, 25%+ for FIRE</li>
          <li>• Start small and increase 1%/yr until you reach your target</li>
        </ul>
      </div>
    </div>
  );
};