import React from 'react';
import { StandardAccountType } from '@/types/accountTypes';
import { H3, H4, FormLabel, Caption } from '@/components/ui/Typography';

interface LifecycleAdjustmentFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

export const LifecycleAdjustmentForm: React.FC<LifecycleAdjustmentFormProps> = ({
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
    { value: 'taxable', label: 'Taxable Brokerage', description: 'Most flexible for lifecycle changes' },
    { value: 'tax_deferred', label: '401(k) / Traditional IRA', description: 'Great for age-based allocation' },
    { value: 'roth', label: 'Roth IRA / Roth 401(k)', description: 'Tax-free growth and withdrawals' },
  ];

  // Default lifecycle stages based on common advice
  const getDefaultLifecycleStages = () => [
    {
      ageRange: { min: 20, max: 35 },
      targetAllocation: { stocks: 90, bonds: 5, international: 5, cash: 0 },
      stageName: 'Early Career',
      description: 'High growth potential, long time horizon'
    },
    {
      ageRange: { min: 36, max: 50 },
      targetAllocation: { stocks: 80, bonds: 15, international: 5, cash: 0 },
      stageName: 'Mid Career',
      description: 'Strong growth with moderate risk reduction'
    },
    {
      ageRange: { min: 51, max: 65 },
      targetAllocation: { stocks: 65, bonds: 30, international: 5, cash: 0 },
      stageName: 'Pre-Retirement',
      description: 'Gradual shift toward capital preservation'
    },
    {
      ageRange: { min: 66, max: 100 },
      targetAllocation: { stocks: 40, bonds: 50, international: 5, cash: 5 },
      stageName: 'Retirement',
      description: 'Capital preservation with income generation'
    }
  ];

  // Helper function to update lifecycle stage
  const updateLifecycleStage = (index: number, field: string, value: any) => {
    const stages = formData.lifecycleStages || getDefaultLifecycleStages();
    const updated = [...stages];
    if (field.includes('.')) {
      const [parentField, childField] = field.split('.');
      updated[index] = {
        ...updated[index],
        [parentField]: {
          ...updated[index][parentField],
          [childField]: value
        }
      };
    } else {
      updated[index][field] = value;
    }
    onChange('lifecycleStages', updated);
  };

  const addLifecycleStage = () => {
    const stages = formData.lifecycleStages || getDefaultLifecycleStages();
    const lastStage = stages[stages.length - 1];
    const newStage = {
      ageRange: { min: lastStage.ageRange.max + 1, max: lastStage.ageRange.max + 10 },
      targetAllocation: { stocks: 60, bonds: 35, international: 5, cash: 0 },
      stageName: 'Custom Stage',
      description: 'Custom lifecycle stage'
    };
    onChange('lifecycleStages', [...stages, newStage]);
  };

  const removeLifecycleStage = (index: number) => {
    const stages = formData.lifecycleStages || getDefaultLifecycleStages();
    if (stages.length > 1) {
      onChange('lifecycleStages', stages.filter((_: any, i: number) => i !== index));
    }
  };

  const lifecycleStages = formData.lifecycleStages || getDefaultLifecycleStages();

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
          placeholder="e.g., Age-Based Asset Allocation"
        />
        <Caption color="secondary" className="mt-1">
          Give this lifecycle investment strategy a descriptive name
        </Caption>
      </div>

      {/* Current Age Info */}
      <div className="bg-indigo-50 p-4 rounded-lg">
        <H3 className="mb-2">Current Status</H3>
        <div className="text-sm text-gray-700">
          <p>Current Age: <strong>{currentAge} years old</strong></p>
          <p>Current Stage: <strong>
            {lifecycleStages.find((stage: any) => 
              currentAge >= stage.ageRange.min && currentAge <= stage.ageRange.max
            )?.stageName || 'Custom'}
          </strong></p>
        </div>
      </div>

      {/* Lifecycle Stages */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <H3>Lifecycle Stages</H3>
          <button
            type="button"
            onClick={addLifecycleStage}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Add Stage
          </button>
        </div>
        
        <div className="space-y-4">
          {lifecycleStages.map((stage: any, index: number) => {
            const isCurrentStage = currentAge >= stage.ageRange.min && currentAge <= stage.ageRange.max;
            const totalAllocation = Object.values(stage.targetAllocation as Record<string, number>).reduce((sum: number, val: number) => sum + val, 0);
            const allocationError = Math.abs(totalAllocation - 100) > 0.1;
            
            return (
              <div key={index} className={`bg-white p-4 rounded border-2 space-y-3 ${
                isCurrentStage ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Stage {index + 1}</span>
                    {isCurrentStage && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Current</span>
                    )}
                  </div>
                  {lifecycleStages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLifecycleStage(index)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Stage Name
                    </label>
                    <input
                      type="text"
                      value={stage.stageName || ''}
                      onChange={(e) => updateLifecycleStage(index, 'stageName', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Early Career"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Age Range
                    </label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={stage.ageRange.min || 0}
                        onChange={(e) => updateLifecycleStage(index, 'ageRange.min', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                        min="18"
                        max="100"
                      />
                      <span className="text-xs text-gray-500">to</span>
                      <input
                        type="number"
                        value={stage.ageRange.max || 0}
                        onChange={(e) => updateLifecycleStage(index, 'ageRange.max', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                        min="18"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={stage.description || ''}
                    onChange={(e) => updateLifecycleStage(index, 'description', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., High growth potential with long time horizon"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Target Asset Allocation
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Stocks</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={stage.targetAllocation.stocks || 0}
                          onChange={(e) => updateLifecycleStage(index, 'targetAllocation.stocks', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          max="100"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Bonds</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={stage.targetAllocation.bonds || 0}
                          onChange={(e) => updateLifecycleStage(index, 'targetAllocation.bonds', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          max="100"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Intl</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={stage.targetAllocation.international || 0}
                          onChange={(e) => updateLifecycleStage(index, 'targetAllocation.international', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          max="100"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cash</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={stage.targetAllocation.cash || 0}
                          onChange={(e) => updateLifecycleStage(index, 'targetAllocation.cash', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          max="100"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs mt-1 ${allocationError ? 'text-red-600' : 'text-green-600'}`}>
                    Total: {totalAllocation}% {allocationError && '(Must equal 100%)'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Adjustment Rules */}
      <div className="bg-orange-50 p-4 rounded-lg space-y-4">
        <H3>Adjustment Rules</H3>

        <div>
          <FormLabel>
            Adjustment Frequency
          </FormLabel>
          <select
            value={formData.adjustmentFrequency || 'ANNUAL'}
            onChange={(e) => onChange('adjustmentFrequency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="QUARTERLY">Quarterly adjustments</option>
            <option value="ANNUAL">Annual adjustments</option>
            <option value="ON_BIRTHDAY">On birthday</option>
          </select>
          <Caption color="secondary" className="mt-1">
            How often to check age and adjust portfolio allocation
          </Caption>
        </div>

        <div>
          <FormLabel>
            Glide Path Formula
          </FormLabel>
          <select
            value={formData.glidePathFormula || 'LINEAR'}
            onChange={(e) => onChange('glidePathFormula', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="LINEAR">Linear transition between stages</option>
            <option value="CUSTOM">Step changes at stage boundaries</option>
          </select>
          <Caption color="secondary" className="mt-1">
            How to transition between lifecycle stages
          </Caption>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.smoothTransitions !== false}
              onChange={(e) => onChange('smoothTransitions', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Smooth transitions between stages
            </span>
          </label>
          <Caption color="secondary" className="mt-1 ml-6">
            Gradually adjust allocation over 6-12 months when changing stages
          </Caption>
        </div>
      </div>

      {/* Implementation Settings */}
      <div className="bg-purple-50 p-4 rounded-lg space-y-4">
        <H3>Implementation Settings</H3>

        <div>
          <FormLabel className="mb-2">
            Accounts to Include
          </FormLabel>
          <div className="space-y-2">
            {accountTypes.map((account) => (
              <label key={account.value} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={(formData.accountScope || ['taxable', 'tax_deferred', 'roth']).includes(account.value)}
                  onChange={(e) => {
                    const current = formData.accountScope || ['taxable', 'tax_deferred', 'roth'];
                    const updated = e.target.checked
                      ? [...current, account.value]
                      : current.filter((s: string) => s !== account.value);
                    onChange('accountScope', updated);
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
          <FormLabel>
            Rebalancing Method
          </FormLabel>
          <select
            value={formData.rebalancingMethod || 'NEW_CONTRIBUTIONS'}
            onChange={(e) => onChange('rebalancingMethod', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="NEW_CONTRIBUTIONS">Use new contributions only</option>
            <option value="FULL_REBALANCE">Full portfolio rebalancing</option>
            <option value="HYBRID">Hybrid approach (new money first, then rebalance)</option>
          </select>
          <Caption color="secondary" className="mt-1">
            How to implement allocation changes
          </Caption>
        </div>

        <div>
          <FormLabel>
            Drift Threshold for Adjustments
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
            Only adjust if current allocation drifts this far from age-appropriate target
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
              Priority Level
            </FormLabel>
            <select
              value={formData.priority || 42}
              onChange={(e) => onChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={40}>High Priority (before other portfolio changes)</option>
              <option value={42}>Normal Priority (with other strategic activities)</option>
              <option value={45}>Low Priority (after other portfolio management)</option>
            </select>
            <Caption color="secondary" className="mt-1">
              When to make lifecycle adjustments relative to other portfolio activities
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
                Consider market conditions
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Delay risk reduction during market downturns (opportunistic approach)
            </Caption>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.maintainMinimumEquity || true}
                onChange={(e) => onChange('maintainMinimumEquity', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Maintain minimum equity allocation
              </span>
            </label>
            <Caption color="secondary" className="mt-1 ml-6">
              Never go below 30% stocks, even in retirement (inflation protection)
            </Caption>
          </div>
        </div>
      </details>

      {/* Educational Help */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <H4 className="text-indigo-900 mb-2">
          💡 Lifecycle Investment Strategy
        </H4>
        <div className="text-xs text-indigo-700 space-y-2">
          <div>
            <strong>Age-Based Allocation:</strong> Automatically adjusts your portfolio risk as you age, 
            starting aggressive for growth and becoming conservative for capital preservation.
          </div>
          <div>
            <strong>Common Rules of Thumb:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><strong>"100 minus age" rule:</strong> Stock percentage = 100 - your age</li>
              <li><strong>"120 minus age" rule:</strong> More aggressive version for longer retirements</li>
              <li><strong>Target-date funds:</strong> Professional lifecycle management</li>
            </ul>
          </div>
          <div>
            <strong>Key Benefits:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Maximizes growth potential when young (time to recover from downturns)</li>
              <li>Reduces risk as retirement approaches (capital preservation)</li>
              <li>Automates rebalancing decisions to remove emotion</li>
              <li>Maintains some equity exposure for inflation protection</li>
            </ul>
          </div>
          <div>
            <strong>Customization:</strong> Adjust stages based on your risk tolerance, retirement timeline, 
            and other financial goals. Conservative investors might reduce equity exposure faster.
          </div>
        </div>
      </div>
    </div>
  );
};