import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface EmergencyFundMaintenanceFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

export const EmergencyFundMaintenanceForm: React.FC<EmergencyFundMaintenanceFormProps> = ({
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

  const emergencyFundAccounts: { value: StandardAccountType; label: string; description: string }[] = [
    { value: 'cash', label: 'High-Yield Savings', description: 'FDIC insured, instant access' },
    { value: 'taxable', label: 'Money Market Fund', description: 'Slightly higher yield, very liquid' },
  ];

  const investmentAccounts: { value: StandardAccountType; label: string; description: string }[] = [
    { value: 'tax_deferred', label: '401(k) / Traditional IRA', description: 'Pre-tax contributions, taxed on withdrawal' },
    { value: 'roth', label: 'Roth IRA / Roth 401(k)', description: 'After-tax contributions, tax-free growth' },
    { value: 'taxable', label: 'Taxable Brokerage', description: 'Flexible access, taxed on gains' },
    { value: '529', label: '529 Education', description: 'Tax-free for education expenses' },
  ];

  const fundingSources = [
    { value: 'income', label: 'Regular Income', description: 'Use part of monthly income to top up' },
    { value: 'surplus', label: 'Budget Surplus', description: 'Use leftover money after expenses' },
    { value: 'other_savings', label: 'Other Savings', description: 'Redirect from other savings accounts' },
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
          placeholder="e.g., Auto Emergency Fund Maintenance"
        />
        <Caption color="secondary" className="mt-1">
          Give this emergency fund strategy a descriptive name
        </Caption>
      </div>

      {/* Emergency Fund Target */}
      <div className="bg-green-50 p-4 rounded-lg space-y-4">
        <H3>Emergency Fund Target</H3>

        <div>
          <FormLabel>
            Target Emergency Fund Size
          </FormLabel>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.targetMonths || 6}
              onChange={(e) => onChange('targetMonths', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="6"
              min="1"
              max="24"
              step="0.5"
            />
            <span className="text-gray-700">months of expenses</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Recommended: 3-6 months for stable income, 6-12 months for variable income
          </Caption>
        </div>

        <div>
          <FormLabel>
            Emergency Fund Account
          </FormLabel>
          <select
            value={formData.emergencyFundAccount || 'cash'}
            onChange={(e) => onChange('emergencyFundAccount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {emergencyFundAccounts.map((account) => (
              <option key={account.value} value={account.value}>
                {account.label}
              </option>
            ))}
          </select>
          <Caption color="secondary" className="mt-1">
            {emergencyFundAccounts.find(a => a.value === (formData.emergencyFundAccount || 'cash'))?.description}
          </Caption>
        </div>
      </div>

      {/* Funding Sources */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <H3>Funding Sources</H3>

        <div>
          <FormLabel className="mb-2">
            How to Fund Top-Ups
          </FormLabel>
          <div className="space-y-2">
            {fundingSources.map((source) => (
              <label key={source.value} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={(formData.fundingSources || ['income']).includes(source.value)}
                  onChange={(e) => {
                    const current = formData.fundingSources || ['income'];
                    const updated = e.target.checked
                      ? [...current, source.value]
                      : current.filter((s: string) => s !== source.value);
                    onChange('fundingSources', updated);
                  }}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">{source.label}</div>
                  <div className="text-xs text-gray-500">{source.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Top-Up Limits */}
      <div className="bg-yellow-50 p-4 rounded-lg space-y-4">
        <H3>Top-Up Constraints</H3>

        <div>
          <FormLabel>
            Maximum Monthly Top-Up
          </FormLabel>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={formData.maxMonthlyTopUp || 1000}
              onChange={(e) => onChange('maxMonthlyTopUp', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="1000"
              min="0"
              step="50"
            />
            <span className="text-gray-500">per month</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Limits how much can be diverted to emergency fund per month
          </Caption>
        </div>

        <div>
          <FormLabel>
            Maximum Percentage of Income
          </FormLabel>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.maxPercentageOfIncome || 20}
              onChange={(e) => onChange('maxPercentageOfIncome', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="20"
              min="1"
              max="50"
              step="1"
            />
            <span className="text-gray-500">% of monthly income</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Never use more than this percentage of income for emergency fund top-ups
          </Caption>
        </div>
      </div>

      {/* Rebalancing */}
      <div className="bg-orange-50 p-4 rounded-lg space-y-4">
        <H3>Automatic Rebalancing</H3>

        <div>
          <FormLabel>
            Rebalancing Threshold
          </FormLabel>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.rebalancingThreshold || 10}
              onChange={(e) => onChange('rebalancingThreshold', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="10"
              min="5"
              max="50"
              step="5"
            />
            <span className="text-gray-500">% deviation from target</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Trigger rebalancing when emergency fund is this far from target
          </Caption>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.drainExcessEnabled || true}
              onChange={(e) => onChange('drainExcessEnabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Invest excess emergency fund
            </span>
          </label>
          <Caption color="secondary" className="mt-1 ml-6">
            Automatically invest money if emergency fund exceeds target
          </Caption>
        </div>

        {formData.drainExcessEnabled && (
          <div className="ml-6 space-y-3">
            <div>
              <FormLabel>
                Invest Excess Into
              </FormLabel>
              <select
                value={formData.excessInvestmentAccount || 'taxable'}
                onChange={(e) => onChange('excessInvestmentAccount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {investmentAccounts.map((account) => (
                  <option key={account.value} value={account.value}>
                    {account.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FormLabel>
                Maximum Excess to Drain
              </FormLabel>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={formData.maxDrainPercentage || 50}
                  onChange={(e) => onChange('maxDrainPercentage', parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="50"
                  min="10"
                  max="90"
                  step="10"
                />
                <span className="text-gray-500">% of excess per month</span>
              </div>
              <Caption color="secondary" className="mt-1">
                Gradually move excess to investments rather than all at once
              </Caption>
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Frequency */}
      <div>
        <FormLabel>
          Check Frequency
        </FormLabel>
        <select
          value={formData.evaluationFrequency || 'MONTHLY'}
          onChange={(e) => onChange('evaluationFrequency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="MONTHLY">Monthly check</option>
          <option value="QUARTERLY">Quarterly check</option>
          <option value="ANNUALLY">Annual check</option>
        </select>
        <Caption color="secondary" className="mt-1">
          How often to check and maintain the emergency fund
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
              value={formData.priority || 12}
              onChange={(e) => onChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={5}>Highest Priority (before all other savings)</option>
              <option value={12}>High Priority (after basic expenses)</option>
              <option value={20}>Normal Priority (with other savings)</option>
            </select>
            <Caption color="secondary" className="mt-1">
              Emergency funds typically should have high priority over investments
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.adjustForInflation || true}
                onChange={(e) => onChange('adjustForInflation', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Adjust target for inflation
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Automatically increase emergency fund target as expenses grow with inflation
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.pauseDuringUrgentGoals || false}
                onChange={(e) => onChange('pauseDuringUrgentGoals', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Pause during urgent financial goals
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Temporarily reduce emergency fund contributions for time-sensitive goals
            </Caption>
          </div>
        </div>
      </details>

      {/* Educational Help */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <H4 className="text-green-900 mb-2">
          💡 Emergency Fund Best Practices
        </H4>
        <div className="text-xs text-green-700 space-y-2">
          <div>
            <strong>Optimal Size:</strong> 3-6 months of expenses for stable employment, 6-12 months for variable income,
            contractors, or single-income households.
          </div>
          <div>
            <strong>Smart Automation:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Automatically tops up when below target (job loss, large expenses)</li>
              <li>Invests excess when above target (don't let cash drag down returns)</li>
              <li>Adjusts target as your expenses change over time</li>
              <li>Protects other financial goals by ensuring adequate safety net</li>
            </ul>
          </div>
          <div>
            <strong>Account Selection:</strong> Keep in high-yield savings or money market accounts for
            immediate access during emergencies. Don't invest emergency funds in stocks or bonds.
          </div>
        </div>
      </div>
    </div>
  );
};