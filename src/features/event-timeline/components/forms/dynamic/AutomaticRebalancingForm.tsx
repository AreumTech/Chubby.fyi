import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface AutomaticRebalancingFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

export const AutomaticRebalancingForm: React.FC<AutomaticRebalancingFormProps> = ({
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
    { value: 'taxable', label: 'Taxable Brokerage', description: 'Most tax-efficient for rebalancing' },
    { value: 'tax_deferred', label: '401(k) / Traditional IRA', description: 'Tax-free rebalancing within account' },
    { value: 'roth', label: 'Roth IRA / Roth 401(k)', description: 'Tax-free rebalancing and growth' },
  ];

  // Helper function to update target allocation
  const updateAllocation = (assetClass: string, value: number) => {
    const currentAllocation = formData.targetAllocation || {
      stocks: 70,
      bonds: 20,
      international: 10,
      realEstate: 0,
      commodities: 0,
      cash: 0,
    };
    onChange('targetAllocation', {
      ...currentAllocation,
      [assetClass]: value,
    });
  };

  // Calculate total allocation percentage
  const getTotalAllocation = () => {
    const allocation = formData.targetAllocation || {
      stocks: 70,
      bonds: 20,
      international: 10,
      realEstate: 0,
      commodities: 0,
      cash: 0,
    };
    return Object.values(allocation as Record<string, number>).reduce((sum: number, val: number) => sum + val, 0);
  };

  const totalAllocation = getTotalAllocation();
  const allocationError = Math.abs(totalAllocation - 100) > 0.1;

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
          placeholder="e.g., Monthly Portfolio Rebalancing"
        />
        <Caption color="secondary" className="mt-1">
          Give this rebalancing strategy a descriptive name
        </Caption>
      </div>

      {/* Target Asset Allocation */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <H3>Target Asset Allocation</H3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>
              Stocks (US)
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.targetAllocation?.stocks || 70}
                onChange={(e) => updateAllocation('stocks', parseFloat(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="70"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>

          <div>
            <FormLabel>
              Bonds
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.targetAllocation?.bonds || 20}
                onChange={(e) => updateAllocation('bonds', parseFloat(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="20"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>

          <div>
            <FormLabel>
              International
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.targetAllocation?.international || 10}
                onChange={(e) => updateAllocation('international', parseFloat(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="10"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>

          <div>
            <FormLabel>
              Real Estate (REITs)
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.targetAllocation?.realEstate || 0}
                onChange={(e) => updateAllocation('realEstate', parseFloat(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>

          <div>
            <FormLabel>
              Commodities
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.targetAllocation?.commodities || 0}
                onChange={(e) => updateAllocation('commodities', parseFloat(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>

          <div>
            <FormLabel>
              Cash
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.targetAllocation?.cash || 0}
                onChange={(e) => updateAllocation('cash', parseFloat(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>
        </div>

        <div className={`text-sm ${allocationError ? 'text-red-600' : 'text-green-600'}`}>
          Total: {totalAllocation.toFixed(1)}%
          {allocationError && ' (Must equal 100%)'}
        </div>
      </div>

      {/* Rebalancing Triggers */}
      <div className="bg-orange-50 p-4 rounded-lg space-y-4">
        <H3>Rebalancing Triggers</H3>

        <div>
          <FormLabel>
            Drift Threshold
          </FormLabel>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.driftThreshold || 5}
              onChange={(e) => onChange('driftThreshold', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="5"
              min="1"
              max="20"
              step="1"
            />
            <span className="text-gray-500">% drift from target</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Trigger rebalancing when any asset class drifts this far from target
          </Caption>
        </div>

        <div>
          <FormLabel>
            Time-Based Frequency
          </FormLabel>
          <select
            value={formData.evaluationFrequency || 'QUARTERLY'}
            onChange={(e) => onChange('evaluationFrequency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUALLY">Annually</option>
          </select>
          <Caption color="secondary" className="mt-1">
            Check for rebalancing opportunities this often (even if drift threshold not met)
          </Caption>
        </div>

        <div>
          <FormLabel>
            Minimum Trade Amount
          </FormLabel>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={formData.minimumTradeAmount || 1000}
              onChange={(e) => onChange('minimumTradeAmount', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="1000"
              min="100"
              step="100"
            />
          </div>
          <Caption color="secondary" className="mt-1">
            Skip rebalancing if total trades would be less than this amount
          </Caption>
        </div>
      </div>

      {/* Account Scope */}
      <div className="bg-purple-50 p-4 rounded-lg space-y-4">
        <H3>Account Scope</H3>

        <div>
          <FormLabel className="mb-2">
            Accounts to Include
          </FormLabel>
          <div className="space-y-2">
            {accountTypes.map((account) => (
              <label key={account.value} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={(formData.includedAccounts || ['taxable']).includes(account.value)}
                  onChange={(e) => {
                    const current = formData.includedAccounts || ['taxable'];
                    const updated = e.target.checked
                      ? [...current, account.value]
                      : current.filter((s: string) => s !== account.value);
                    onChange('includedAccounts', updated);
                  }}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">{account.label}</div>
                  <div className="text-xs text-gray-500">{account.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.treatAsOnePortfolio || true}
              onChange={(e) => onChange('treatAsOnePortfolio', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Treat all accounts as one portfolio
            </span>
          </label>
          <Caption color="secondary" className="mt-1 ml-6">
            Asset location optimization: place tax-efficient assets in taxable accounts
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
            <FormLabel>
              Maximum Trades per Rebalance
            </FormLabel>
            <input
              type="number"
              value={formData.maxTradesPerRebalance || 10}
              onChange={(e) => onChange('maxTradesPerRebalance', parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="10"
              min="1"
              max="50"
            />
            <Caption color="secondary" className="mt-1">
              Limit complexity and transaction costs
            </Caption>
          </div>

          <div>
            <FormLabel>
              Minimum Cash Reserve
            </FormLabel>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={formData.minimumCashReserve || 5000}
                onChange={(e) => onChange('minimumCashReserve', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="5000"
                min="0"
                step="1000"
              />
            </div>
            <Caption color="secondary" className="mt-1">
              Always keep this much cash available, don't invest it all
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.avoidWashSales || true}
                onChange={(e) => onChange('avoidWashSales', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Avoid wash sale violations
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Don't repurchase assets sold at a loss within 30 days
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.preferNewContributions || true}
                onChange={(e) => onChange('preferNewContributions', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Prefer rebalancing with new contributions
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Use new money to rebalance before selling existing holdings
            </Caption>
          </div>

          <div>
            <FormLabel>
              Priority Level
            </FormLabel>
            <select
              value={formData.priority || 41}
              onChange={(e) => onChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={35}>High Priority (before other strategic trades)</option>
              <option value={41}>Normal Priority (with other portfolio activities)</option>
              <option value={45}>Low Priority (after other strategic activities)</option>
            </select>
            <Caption color="secondary" className="mt-1">
              When to rebalance relative to other portfolio activities
            </Caption>
          </div>
        </div>
      </details>

      {/* Educational Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <H4 className="text-blue-900 mb-2">
          💡 Portfolio Rebalancing Strategy
        </H4>
        <div className="text-xs text-blue-700 space-y-2">
          <div>
            <strong>Why Rebalance:</strong> Maintains your target risk level and enforces "buy low, sell high" 
            by selling outperforming assets and buying underperforming ones.
          </div>
          <div>
            <strong>Optimal Triggers:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><strong>5% drift:</strong> Good balance between performance and trading costs</li>
              <li><strong>Quarterly timing:</strong> Regular schedule prevents emotional decisions</li>
              <li><strong>$1000+ trades:</strong> Avoids tiny rebalances that waste on fees</li>
            </ul>
          </div>
          <div>
            <strong>Tax Efficiency:</strong> Rebalance in tax-advantaged accounts first (401k, IRA) to avoid 
            taxable events. Use new contributions when possible instead of selling.
          </div>
          <div>
            <strong>Asset Location:</strong> Keep tax-inefficient assets (bonds, REITs) in tax-deferred accounts 
            and tax-efficient assets (index funds) in taxable accounts.
          </div>
        </div>
      </div>
    </div>
  );
};