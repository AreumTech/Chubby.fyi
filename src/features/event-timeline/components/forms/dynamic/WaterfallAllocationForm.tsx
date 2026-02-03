import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface WaterfallAllocationFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

interface AllocationTier {
  name: string;
  targetAccount: StandardAccountType | 'emergency' | 'debt';
  monthlyLimit?: number;
  annualLimit?: number;
  description?: string;
}

export const WaterfallAllocationForm: React.FC<WaterfallAllocationFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear,
  baseMonth,
  currentAge,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Initialize tiers if not present
  React.useEffect(() => {
    if (!formData.allocationTiers || formData.allocationTiers.length === 0) {
      onChange('allocationTiers', [
        { name: 'Emergency Fund', targetAccount: 'emergency', monthlyLimit: 500, description: 'Build 6-month emergency fund' },
        { name: '401(k) Match', targetAccount: 'tax_deferred', monthlyLimit: 500, description: 'Get full employer match' },
        { name: 'High-Interest Debt', targetAccount: 'debt', monthlyLimit: 1000, description: 'Pay off credit cards' },
        { name: 'Max Roth IRA', targetAccount: 'roth', annualLimit: 7000, description: 'Tax-free growth' },
        { name: 'Max 401(k)', targetAccount: 'tax_deferred', annualLimit: 23500, description: 'Reduce taxable income' },
        { name: 'Taxable Investing', targetAccount: 'taxable', description: 'Everything else' }
      ]);
    }
  }, []);

  const tiers = formData.allocationTiers || [];

  const getStartDateComponents = () => {
    if (!formData.startDateOffset) return { year: currentYear, month: currentMonth };
    const date = new Date(baseYear, baseMonth - 1);
    date.setMonth(date.getMonth() + formData.startDateOffset);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  };

  const startDate = getStartDateComponents();

  const addTier = () => {
    const newTier: AllocationTier = {
      name: '',
      targetAccount: 'taxable',
      monthlyLimit: undefined,
      description: ''
    };
    onChange('allocationTiers', [...tiers, newTier]);
  };

  const updateTier = (index: number, field: keyof AllocationTier, value: any) => {
    const updatedTiers = [...tiers];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    onChange('allocationTiers', updatedTiers);
  };

  const removeTier = (index: number) => {
    onChange('allocationTiers', tiers.filter((_: any, i: number) => i !== index));
  };

  const moveTier = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tiers.length) return;
    
    const updatedTiers = [...tiers];
    [updatedTiers[index], updatedTiers[newIndex]] = [updatedTiers[newIndex], updatedTiers[index]];
    onChange('allocationTiers', updatedTiers);
  };

  const accountOptions = [
    { value: 'emergency', label: 'Emergency Fund', icon: '🛡️' },
    { value: 'debt', label: 'Debt Payment', icon: '💳' },
    { value: 'tax_deferred', label: '401(k) / Trad IRA', icon: '🏦' },
    { value: 'roth', label: 'Roth IRA / Roth 401(k)', icon: '💎' },
    { value: 'hsa', label: 'Health Savings Account', icon: '🏥' },
    { value: 'taxable', label: 'Taxable Brokerage', icon: '📈' },
    { value: '529', label: '529 Education', icon: '🎓' },
  ];

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
          placeholder="e.g., Max Out Everything Strategy"
        />
        <Caption color="secondary" className="mt-1">
          Name your savings waterfall strategy
        </Caption>
      </div>

      {/* Total Monthly Available */}
      <div>
        <FormLabel>
          Total Monthly Savings Available
        </FormLabel>
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">$</span>
          <input
            type="number"
            value={formData.totalMonthlyAmount || 5000}
            onChange={(e) => onChange('totalMonthlyAmount', parseFloat(e.target.value) || 0)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="5000"
            min="100"
            step="100"
          />
          <span className="text-sm text-gray-500">/month</span>
        </div>
        <Caption color="secondary" className="mt-1">
          Total amount to allocate across all priorities each month
        </Caption>
      </div>

      {/* Allocation Tiers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <FormLabel>
            Priority Allocation Tiers
          </FormLabel>
          <button
            type="button"
            onClick={addTier}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Tier
          </button>
        </div>
        
        <div className="space-y-3">
          {tiers.map((tier: AllocationTier, index: number) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-medium text-gray-700">#{index + 1}</span>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => moveTier(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTier(index, 'down')}
                      disabled={index === tiers.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeTier(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tier Name
                  </label>
                  <input
                    type="text"
                    value={tier.name || ''}
                    onChange={(e) => updateTier(index, 'name', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Emergency Fund"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Target Account
                  </label>
                  <select
                    value={tier.targetAccount || 'taxable'}
                    onChange={(e) => updateTier(index, 'targetAccount', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {accountOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Monthly Limit (Optional)
                  </label>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      value={tier.monthlyLimit || ''}
                      onChange={(e) => updateTier(index, 'monthlyLimit', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="No limit"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Annual Limit (Optional)
                  </label>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      value={tier.annualLimit || ''}
                      onChange={(e) => updateTier(index, 'annualLimit', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="No limit"
                      min="0"
                      step="500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={tier.description || ''}
                    onChange={(e) => updateTier(index, 'description', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Build 6-month emergency fund"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {tiers.length === 0 && (
          <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-2">No allocation tiers defined</p>
            <button
              type="button"
              onClick={addTier}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first tier
            </button>
          </div>
        )}
      </div>

      {/* Spillover Behavior */}
      <div>
        <FormLabel>
          When a Tier is Full
        </FormLabel>
        <select
          value={formData.spilloverBehavior || 'NEXT_TIER'}
          onChange={(e) => onChange('spilloverBehavior', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="NEXT_TIER">Flow to next tier (waterfall)</option>
          <option value="STOP">Stop allocating (save remainder)</option>
          <option value="PROPORTIONAL">Redistribute proportionally</option>
        </select>
        <Caption color="secondary" className="mt-1">
          What happens when a tier reaches its limit
        </Caption>
      </div>

      {/* Start Date */}
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

      {/* Example Calculation */}
      {tiers.length > 0 && formData.totalMonthlyAmount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <H4 className="text-green-900 mb-2">
            📊 Monthly Allocation Preview
          </H4>
          <div className="text-xs text-green-700 space-y-1">
            {(() => {
              let remaining = formData.totalMonthlyAmount || 0;
              return tiers.map((tier: AllocationTier, index: number) => {
                const allocated = tier.monthlyLimit 
                  ? Math.min(remaining, tier.monthlyLimit)
                  : tier.annualLimit
                  ? Math.min(remaining, tier.annualLimit / 12)
                  : remaining;
                remaining -= allocated;
                
                return (
                  <div key={index} className="flex justify-between">
                    <span>{tier.name || `Tier ${index + 1}`}:</span>
                    <span className="font-medium">${allocated.toFixed(0)}/mo</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Educational Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <H4 className="text-blue-900 mb-2">
          💧 How Waterfall Allocation Works
        </H4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Money flows through tiers in priority order, like water down steps</li>
          <li>• Each tier fills up to its limit before flowing to the next</li>
          <li>• Perfect for strategies like: Emergency fund → Get match → Pay debt → Max retirement</li>
          <li>• Automatically adjusts as goals are met (e.g., debt paid off)</li>
        </ul>
      </div>
    </div>
  );
};