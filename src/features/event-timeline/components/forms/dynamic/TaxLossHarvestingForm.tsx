import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface TaxLossHarvestingFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

export const TaxLossHarvestingForm: React.FC<TaxLossHarvestingFormProps> = ({
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

  // Helper function to add/update substitute pair
  const updateSubstitutePair = (index: number, field: string, value: string) => {
    const substitutes = formData.substituteList || [];
    const updated = [...substitutes];
    if (!updated[index]) {
      updated[index] = {};
    }
    updated[index][field] = value;
    onChange('substituteList', updated);
  };

  const addSubstitutePair = () => {
    const substitutes = formData.substituteList || [];
    onChange('substituteList', [
      ...substitutes,
      { original: '', substitute: '' }
    ]);
  };

  const removeSubstitutePair = (index: number) => {
    const substitutes = formData.substituteList || [];
    onChange('substituteList', substitutes.filter((_: any, i: number) => i !== index));
  };

  const timingOptions = [
    { value: 'YEAR_END', label: 'Year-End Only', description: 'December tax loss harvesting' },
    { value: 'QUARTERLY', label: 'Quarterly', description: 'Every quarter throughout the year' },
    { value: 'CONTINUOUS', label: 'Continuous', description: 'Monitor and harvest losses as they occur' },
  ];

  const assetClasses = [
    { value: 'us_stocks', label: 'US Stocks', description: 'Large, mid, and small cap domestic stocks' },
    { value: 'international_stocks', label: 'International Stocks', description: 'Developed and emerging markets' },
    { value: 'bonds', label: 'Bonds', description: 'Government and corporate bonds' },
    { value: 'reits', label: 'REITs', description: 'Real estate investment trusts' },
    { value: 'commodities', label: 'Commodities', description: 'Commodity-based investments' },
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
          placeholder="e.g., Automated Tax Loss Harvesting"
        />
        <Caption color="secondary" className="mt-1">
          Give this tax optimization strategy a descriptive name
        </Caption>
      </div>

      {/* Important Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <div className="text-yellow-600 mt-0.5">⚠️</div>
          <div className="text-xs text-yellow-800">
            <strong>Important:</strong> Tax loss harvesting only applies to taxable brokerage accounts. 
            It's not available in tax-advantaged accounts like 401(k) or IRA. Consult a tax professional 
            for personalized advice.
          </div>
        </div>
      </div>

      {/* Harvesting Thresholds */}
      <div className="bg-green-50 p-4 rounded-lg space-y-4">
        <H3>Harvesting Thresholds</H3>

        <div>
          <FormLabel>
            Minimum Taxable Account Value
          </FormLabel>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={formData.minimumAccountValue || 25000}
              onChange={(e) => onChange('minimumAccountValue', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="25000"
              min="10000"
              step="5000"
            />
          </div>
          <Caption color="secondary" className="mt-1">
            Only harvest losses if taxable account value exceeds this threshold
          </Caption>
        </div>

        <div>
          <FormLabel>
            Minimum Tax Savings per Trade
          </FormLabel>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={formData.minimumTaxSavings || 100}
              onChange={(e) => onChange('minimumTaxSavings', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="100"
              min="25"
              step="25"
            />
          </div>
          <Caption color="secondary" className="mt-1">
            Skip trades that save less than this amount in taxes
          </Caption>
        </div>

        <div>
          <FormLabel>
            Maximum Annual Harvesting
          </FormLabel>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={formData.maxAnnualHarvesting || 25000}
              onChange={(e) => onChange('maxAnnualHarvesting', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="25000"
              min="3000"
              step="5000"
            />
          </div>
          <Caption color="secondary" className="mt-1">
            Cap total tax losses harvested per year (optional limit)
          </Caption>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <H3>Tax Rate Settings</H3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>
              Marginal Tax Rate
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.marginalTaxRate || 24}
                onChange={(e) => onChange('marginalTaxRate', parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="24"
                min="10"
                max="50"
                step="1"
              />
              <span className="text-gray-500">%</span>
            </div>
            <Caption color="secondary" className="mt-1">
              Your federal marginal tax rate
            </Caption>
          </div>

          <div>
            <FormLabel>
              Capital Gains Rate
            </FormLabel>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.capitalGainsRate || 15}
                onChange={(e) => onChange('capitalGainsRate', parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="15"
                min="0"
                max="25"
                step="1"
              />
              <span className="text-gray-500">%</span>
            </div>
            <Caption color="secondary" className="mt-1">
              Long-term capital gains rate
            </Caption>
          </div>
        </div>

        <div>
          <FormLabel>
            State Tax Rate (Optional)
          </FormLabel>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={formData.stateRate || 0}
              onChange={(e) => onChange('stateRate', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
              min="0"
              max="15"
              step="0.5"
            />
            <span className="text-gray-500">%</span>
          </div>
          <Caption color="secondary" className="mt-1">
            Your state income tax rate (0 for states with no income tax)
          </Caption>
        </div>
      </div>

      {/* Harvesting Rules */}
      <div className="bg-purple-50 p-4 rounded-lg space-y-4">
        <H3>Harvesting Rules</H3>

        <div>
          <FormLabel>
            Timing Strategy
          </FormLabel>
          <select
            value={formData.timing || 'YEAR_END'}
            onChange={(e) => onChange('timing', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {timingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Caption color="secondary" className="mt-1">
            {timingOptions.find(o => o.value === (formData.timing || 'YEAR_END'))?.description}
          </Caption>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.maintainAllocation !== false}
              onChange={(e) => onChange('maintainAllocation', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Maintain target allocation
            </span>
          </label>
          <Caption color="secondary" className="mt-1 ml-6">
            Try to keep portfolio allocation consistent while harvesting losses
          </Caption>
        </div>

        <div>
          <FormLabel className="mb-2">
            Allowed Asset Classes
          </FormLabel>
          <div className="space-y-2">
            {assetClasses.map((assetClass) => (
              <label key={assetClass.value} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={(formData.allowedAssetClasses || ['us_stocks', 'international_stocks']).includes(assetClass.value)}
                  onChange={(e) => {
                    const current = formData.allowedAssetClasses || ['us_stocks', 'international_stocks'];
                    const updated = e.target.checked
                      ? [...current, assetClass.value]
                      : current.filter((s: string) => s !== assetClass.value);
                    onChange('allowedAssetClasses', updated);
                  }}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">{assetClass.label}</div>
                  <div className="text-xs text-gray-500">{assetClass.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Wash Sale Protection */}
      <div className="bg-red-50 p-4 rounded-lg space-y-4">
        <H3>Wash Sale Protection</H3>
        
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.washSaleProtectionEnabled !== false}
              onChange={(e) => onChange('washSaleProtectionEnabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Enable wash sale protection
            </span>
          </label>
          <Caption color="secondary" className="mt-1 ml-6">
            Prevent buying substantially identical securities within 30 days
          </Caption>
        </div>

        {formData.washSaleProtectionEnabled !== false && (
          <div className="ml-6 space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.useSubstitutes !== false}
                  onChange={(e) => onChange('useSubstitutes', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Use substitute ETFs
                </span>
              </label>
              <Caption color="secondary" className="mt-1 ml-6">
                Purchase similar but not identical funds to maintain exposure
              </Caption>
            </div>

            <div>
              <FormLabel>
                Wait Period Before Repurchasing
              </FormLabel>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={formData.waitPeriod || 31}
                  onChange={(e) => onChange('waitPeriod', parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="31"
                  min="31"
                  max="90"
                  step="1"
                />
                <span className="text-gray-500">days</span>
              </div>
              <Caption color="secondary" className="mt-1">
                Wait this many days before repurchasing identical securities
              </Caption>
            </div>

            {formData.useSubstitutes !== false && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel>
                    Substitute Fund Pairs
                  </FormLabel>
                  <button
                    type="button"
                    onClick={addSubstitutePair}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    Add Pair
                  </button>
                </div>
                
                <div className="space-y-2">
                  {(formData.substituteList || [
                    { original: 'VTI', substitute: 'ITOT' },
                    { original: 'VTIAX', substitute: 'FTIHX' }
                  ]).map((pair: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border flex items-center space-x-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={pair.original || ''}
                          onChange={(e) => updateSubstitutePair(index, 'original', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Original fund (e.g., VTI)"
                        />
                      </div>
                      <div className="text-xs text-gray-500">→</div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={pair.substitute || ''}
                          onChange={(e) => updateSubstitutePair(index, 'substitute', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Substitute fund (e.g., ITOT)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSubstitutePair(index)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  Common substitutes: VTI↔ITOT, VTIAX↔FTIHX, VEA↔IEFA, BND↔AGG
                </p>
              </div>
            )}
          </div>
        )}
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
              value={formData.priority || 44}
              onChange={(e) => onChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={40}>High Priority (before other strategic trades)</option>
              <option value={44}>Normal Priority (with other tax optimization)</option>
              <option value={50}>Low Priority (after other portfolio activities)</option>
            </select>
            <Caption color="secondary" className="mt-1">
              When to execute tax loss harvesting relative to other activities
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.considerCarryforward || true}
                onChange={(e) => onChange('considerCarryforward', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Consider loss carryforward
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Account for existing tax loss carryforward when calculating benefits
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.optimizeForLongTerm || true}
                onChange={(e) => onChange('optimizeForLongTerm', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Optimize for long-term gains
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Prefer harvesting long-term losses over short-term for better tax rates
            </Caption>
          </div>
        </div>
      </details>

      {/* Educational Help */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <H4 className="text-green-900 mb-2">
          💡 Tax Loss Harvesting Strategy
        </H4>
        <div className="text-xs text-green-700 space-y-2">
          <div>
            <strong>How It Works:</strong> Sell investments that have lost value to offset taxable gains 
            and reduce your tax bill. The losses can offset up to $3,000 of ordinary income annually.
          </div>
          <div>
            <strong>Key Benefits:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Reduces current year tax liability from investment gains</li>
              <li>Excess losses carry forward to future years</li>
              <li>Can offset both capital gains and ordinary income (up to $3k/year)</li>
              <li>Maintains market exposure through substitute funds</li>
            </ul>
          </div>
          <div>
            <strong>Wash Sale Rule:</strong> You cannot claim a loss if you buy a "substantially identical" 
            security within 30 days before or after the sale. Use substitute ETFs to maintain exposure.
          </div>
          <div>
            <strong>Best Practices:</strong> Most effective in higher tax brackets, larger portfolios, 
            and when you have other taxable gains to offset. Consider transaction costs and maintain 
            desired asset allocation.
          </div>
        </div>
      </div>
    </div>
  );
};