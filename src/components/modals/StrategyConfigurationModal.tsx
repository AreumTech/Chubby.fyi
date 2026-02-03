// Strategy config modal

import React, { useState, useEffect } from 'react';
import { Modal, WideModal } from '../ui';
import { Button } from '../ui';
import { Input, Select } from '../ui';
import type { StrategyEngine, StrategyExecutionContext } from '../../types/strategy';

interface StrategyConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: StrategyConfig) => void;
  strategy: StrategyEngine | null;
  context: StrategyExecutionContext | null;
}

interface StrategyConfig {
  [key: string]: any;
}

export const StrategyConfigurationModal: React.FC<StrategyConfigurationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  strategy,
  context
}) => {
  const [config, setConfig] = useState<StrategyConfig>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset config when modal opens or strategy changes
  useEffect(() => {
    if (isOpen && strategy) {
      // Initialize with default configuration
      const defaultConfig = getDefaultConfig(strategy.id);
      setConfig(defaultConfig);
      setErrors({});
    }
  }, [isOpen, strategy]);

  if (!strategy) return null;

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSave = () => {
    // Validate configuration
    const validation = validateConfig(strategy.id, config);
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSave(config);
    onClose();
  };

  const renderConfigurationFields = () => {
    switch (strategy.id) {
      case 'emergency-fund':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Fund Settings</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Target Months of Expenses"
                    type="number"
                    value={config.monthsOfExpenses || 6}
                    onChange={(e) => handleConfigChange('monthsOfExpenses', parseFloat(e.target.value))}
                    error={errors.monthsOfExpenses}
                    helperText="Typically 3-9 months"
                  />
                  
                  <Input
                    label="Monthly Contribution ($)"
                    type="number"
                    value={config.monthlyContribution || 500}
                    onChange={(e) => handleConfigChange('monthlyContribution', parseFloat(e.target.value))}
                    error={errors.monthlyContribution}
                    helperText="Amount to save monthly"
                  />
                </div>
                
                <Select
                  label="Account Type"
                  value={config.accountType || 'high_yield_savings'}
                  onChange={(value) => handleConfigChange('accountType', value)}
                  options={[
                    { value: 'high_yield_savings', label: 'High-Yield Savings Account' },
                    { value: 'money_market', label: 'Money Market Account' },
                    { value: 'cash', label: 'Regular Cash Account' }
                  ]}
                />
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoReplenish"
                    checked={config.autoReplenish || false}
                    onChange={(e) => handleConfigChange('autoReplenish', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="autoReplenish" className="text-sm text-gray-700">
                    Automatically replenish when used
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'retirement-optimization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Retirement Settings</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Target Retirement Age"
                    type="number"
                    value={config.retirementAge || 65}
                    onChange={(e) => handleConfigChange('retirementAge', parseInt(e.target.value))}
                    error={errors.retirementAge}
                    helperText="When you plan to retire"
                  />
                  
                  <Input
                    label="Contribution Rate (%)"
                    type="number"
                    value={config.contributionRate || 15}
                    onChange={(e) => handleConfigChange('contributionRate', parseFloat(e.target.value))}
                    error={errors.contributionRate}
                    helperText="% of salary to save"
                  />
                </div>
                
                <Select
                  label="Risk Tolerance"
                  value={config.riskTolerance || 'moderate'}
                  onChange={(value) => handleConfigChange('riskTolerance', value)}
                  options={[
                    { value: 'conservative', label: 'Conservative' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'aggressive', label: 'Aggressive' }
                  ]}
                />
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="maxOut401k"
                    checked={config.maxOut401k || false}
                    onChange={(e) => handleConfigChange('maxOut401k', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="maxOut401k" className="text-sm text-gray-700">
                    Maximize 401(k) contributions when possible
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tax-optimization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Optimization Settings</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Annual Roth Conversion ($)"
                    type="number"
                    value={config.annualRothConversion || 10000}
                    onChange={(e) => handleConfigChange('annualRothConversion', parseFloat(e.target.value))}
                    error={errors.annualRothConversion}
                    helperText="Amount to convert yearly"
                  />
                  
                  <Select
                    label="Tax Loss Harvesting"
                    value={config.taxLossHarvesting || 'automatic'}
                    onChange={(value) => handleConfigChange('taxLossHarvesting', value)}
                    options={[
                      { value: 'automatic', label: 'Automatic' },
                      { value: 'manual', label: 'Manual Review' },
                      { value: 'disabled', label: 'Disabled' }
                    ]}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="backdoorRoth"
                      checked={config.backdoorRoth || false}
                      onChange={(e) => handleConfigChange('backdoorRoth', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="backdoorRoth" className="text-sm text-gray-700">
                      Execute backdoor Roth IRA strategy
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="megaBackdoorRoth"
                      checked={config.megaBackdoorRoth || false}
                      onChange={(e) => handleConfigChange('megaBackdoorRoth', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="megaBackdoorRoth" className="text-sm text-gray-700">
                      Execute mega backdoor Roth strategy
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'retirement-withdrawal': {
        // Retirement Withdrawal Configuration
        const withdrawalStrategy = config.withdrawalStrategy || 'dynamic_4_percent';
        const initialWithdrawalRate = config.initialWithdrawalRate || 0.04;
        const retirementAge = config.retirementAge || 65;
        const expectedLifespan = config.expectedLifespan || 30;
        const annualExpenses = config.annualExpenses || 80000;
        const inflationAdjustment = config.inflationAdjustment !== false;
        const taxWithholdingRate = config.taxWithholdingRate || 0.15;
        const emergencyBuffer = config.emergencyBuffer || 12;
        const guardrailsEnabled = config.guardrailsEnabled !== false;
        const guardrailLowerBound = config.guardrailLowerBound || 0.80;
        const guardrailUpperBound = config.guardrailUpperBound || 1.20;
        const currentAge = context?.currentAge || 35;

        // Calculate annual withdrawal amount
        const portfolioValue = 1000000; // Example value - will be calculated from actual portfolio
        const annualWithdrawal = portfolioValue * initialWithdrawalRate;
        const afterTaxWithdrawal = annualWithdrawal * (1 - taxWithholdingRate);

        return (
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Panel - Configuration */}
            <div className="flex-1 lg:w-1/2 p-6 overflow-y-auto border-r border-gray-200">
              {/* Header region with improved styling */}
              <div className="mb-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 -mx-6 -mt-6 px-6 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl">
                        🏖️
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Retirement Withdrawal Optimizer</h2>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 ml-13">
                      Design a sustainable withdrawal strategy for retirement income.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Configuration Form */}
              <div className="space-y-5">
                {/* Withdrawal Strategy */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Withdrawal Strategy
                  </label>
                  <select
                    value={withdrawalStrategy}
                    onChange={(e) => setConfig({ ...config, withdrawalStrategy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="fixed_4_percent">Fixed 4% Rule (Classic)</option>
                    <option value="dynamic_4_percent">Dynamic 4% with Guardrails (Recommended)</option>
                    <option value="bucket_strategy">Bucket Strategy (3-bucket approach)</option>
                    <option value="bond_ladder">Bond Ladder Strategy</option>
                    <option value="hybrid">Hybrid (Bucket + Dynamic)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {withdrawalStrategy === 'fixed_4_percent' && 'Withdraw fixed 4% of initial portfolio annually'}
                    {withdrawalStrategy === 'dynamic_4_percent' && 'Adjust withdrawals based on portfolio performance with guardrails'}
                    {withdrawalStrategy === 'bucket_strategy' && 'Divide portfolio into cash, income, and growth buckets'}
                    {withdrawalStrategy === 'bond_ladder' && 'Build bond ladder for predictable income stream'}
                    {withdrawalStrategy === 'hybrid' && 'Combine bucket strategy with dynamic adjustments'}
                  </p>
                </div>

                {/* Basic Settings */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Basic Settings</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Retirement Age
                      </label>
                      <input
                        type="number"
                        value={retirementAge}
                        onChange={(e) => setConfig({ ...config, retirementAge: parseInt(e.target.value) })}
                        min={55}
                        max={75}
                        step={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Years until retirement: {Math.max(0, retirementAge - currentAge)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Planning Horizon (Years)
                      </label>
                      <input
                        type="number"
                        value={expectedLifespan}
                        onChange={(e) => setConfig({ ...config, expectedLifespan: parseInt(e.target.value) })}
                        min={20}
                        max={40}
                        step={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Plan until age {retirementAge + expectedLifespan}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Initial Withdrawal Rate: {(initialWithdrawalRate * 100).toFixed(2)}%
                    </label>
                    <input
                      type="range"
                      min="2.5"
                      max="6.0"
                      step="0.25"
                      value={initialWithdrawalRate * 100}
                      onChange={(e) => setConfig({ ...config, initialWithdrawalRate: parseFloat(e.target.value) / 100 })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Recommended: 3.5-4.5% for 30-year retirement
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Annual Retirement Expenses
                    </label>
                    <input
                      type="number"
                      value={annualExpenses}
                      onChange={(e) => setConfig({ ...config, annualExpenses: parseFloat(e.target.value) })}
                      min={30000}
                      max={300000}
                      step={5000}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Expected annual spending in retirement
                    </p>
                  </div>
                </div>

                {/* Guardrails Configuration (for dynamic strategy) */}
                {(withdrawalStrategy === 'dynamic_4_percent' || withdrawalStrategy === 'hybrid') && (
                  <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="guardrailsEnabled"
                        checked={guardrailsEnabled}
                        onChange={(e) => setConfig({ ...config, guardrailsEnabled: e.target.checked })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label htmlFor="guardrailsEnabled" className="text-sm font-medium text-gray-900 cursor-pointer">
                          Enable Guardrails
                        </label>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Automatically adjust withdrawals based on portfolio performance
                        </p>
                      </div>
                    </div>

                    {guardrailsEnabled && (
                      <div className="space-y-3 pl-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Lower Guardrail: {Math.round(guardrailLowerBound * 100)}%
                          </label>
                          <input
                            type="range"
                            min="70"
                            max="90"
                            step="5"
                            value={guardrailLowerBound * 100}
                            onChange={(e) => setConfig({ ...config, guardrailLowerBound: parseInt(e.target.value) / 100 })}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-600 mt-1">
                            Reduce withdrawals if portfolio drops below this threshold
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Upper Guardrail: {Math.round(guardrailUpperBound * 100)}%
                          </label>
                          <input
                            type="range"
                            min="110"
                            max="150"
                            step="5"
                            value={guardrailUpperBound * 100}
                            onChange={(e) => setConfig({ ...config, guardrailUpperBound: parseInt(e.target.value) / 100 })}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-600 mt-1">
                            Increase withdrawals if portfolio exceeds this threshold
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tax & Buffer Settings */}
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Tax & Safety Settings</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Tax Withholding Rate: {Math.round(taxWithholdingRate * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={taxWithholdingRate * 100}
                      onChange={(e) => setConfig({ ...config, taxWithholdingRate: parseInt(e.target.value) / 100 })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Percentage to withhold for federal and state taxes
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Emergency Buffer: {emergencyBuffer} months
                    </label>
                    <input
                      type="range"
                      min="6"
                      max="24"
                      step="1"
                      value={emergencyBuffer}
                      onChange={(e) => setConfig({ ...config, emergencyBuffer: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Keep {Math.round((emergencyBuffer / 12) * annualExpenses).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} in cash reserve
                    </p>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="inflationAdjustment"
                      checked={inflationAdjustment}
                      onChange={(e) => setConfig({ ...config, inflationAdjustment: e.target.checked })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="inflationAdjustment" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Inflation Adjustments
                      </label>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Adjust withdrawals annually for inflation (recommended)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 lg:w-1/2 p-6 bg-gray-50 overflow-y-auto">
              <div className="space-y-5">
                {/* Withdrawal Summary */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
                  <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    Withdrawal Summary
                  </h3>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Annual Withdrawal</span>
                      <span className="text-lg font-bold text-blue-600">
                        {annualWithdrawal.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Less: Taxes ({Math.round(taxWithholdingRate * 100)}%)</span>
                      <span className="text-red-600 font-medium">
                        -{(annualWithdrawal * taxWithholdingRate).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-700">After-Tax Income</span>
                      <span className="text-lg font-bold text-green-600">
                        {afterTaxWithdrawal.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Strategy Details */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    Strategy Details
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                      <span className="text-gray-600 w-32 flex-shrink-0">Strategy:</span>
                      <span className="text-gray-900 font-medium">
                        {withdrawalStrategy === 'fixed_4_percent' && 'Fixed 4% Rule'}
                        {withdrawalStrategy === 'dynamic_4_percent' && 'Dynamic 4% with Guardrails'}
                        {withdrawalStrategy === 'bucket_strategy' && 'Bucket Strategy'}
                        {withdrawalStrategy === 'bond_ladder' && 'Bond Ladder'}
                        {withdrawalStrategy === 'hybrid' && 'Hybrid Approach'}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-gray-600 w-32 flex-shrink-0">Retirement Age:</span>
                      <span className="text-gray-900">{retirementAge} years old</span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-gray-600 w-32 flex-shrink-0">Planning Horizon:</span>
                      <span className="text-gray-900">{expectedLifespan} years (until age {retirementAge + expectedLifespan})</span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-gray-600 w-32 flex-shrink-0">Withdrawal Rate:</span>
                      <span className="text-gray-900">{(initialWithdrawalRate * 100).toFixed(2)}%</span>
                    </div>

                    {guardrailsEnabled && (
                      <div className="flex items-start">
                        <span className="text-gray-600 w-32 flex-shrink-0">Guardrails:</span>
                        <span className="text-gray-900">
                          {Math.round(guardrailLowerBound * 100)}% - {Math.round(guardrailUpperBound * 100)}%
                        </span>
                      </div>
                    )}

                    <div className="flex items-start">
                      <span className="text-gray-600 w-32 flex-shrink-0">Emergency Buffer:</span>
                      <span className="text-gray-900">{emergencyBuffer} months of expenses</span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-gray-600 w-32 flex-shrink-0">Inflation Adj:</span>
                      <span className="text-gray-900">{inflationAdjustment ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {/* Sustainability Metrics */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Sustainability Indicators
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Historical Success Rate</span>
                      <span className="font-bold text-green-700">
                        {initialWithdrawalRate <= 0.04 ? '95%' : initialWithdrawalRate <= 0.05 ? '85%' : '70%'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Risk Level</span>
                      <span className={`font-medium ${
                        initialWithdrawalRate <= 0.035 ? 'text-green-600' :
                        initialWithdrawalRate <= 0.045 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {initialWithdrawalRate <= 0.035 ? 'Conservative' :
                         initialWithdrawalRate <= 0.045 ? 'Moderate' :
                         'Aggressive'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Portfolio Longevity</span>
                      <span className="font-medium text-gray-900">
                        {expectedLifespan}+ years
                      </span>
                    </div>
                  </div>
                </div>

                {/* Retirement Income Timeline */}
                {context && (
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-5">
                    <h3 className="font-semibold text-indigo-900 mb-4 flex items-center">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                      Retirement Income Timeline
                    </h3>

                    <div className="bg-white rounded-lg p-4 space-y-3">
                      {(() => {
                        const currentAge = context.currentAge || context.config.currentAge || 30;
                        const timelinePoints = [];

                        // Create timeline points every 5 years from retirement through end
                        for (let yearsFromRetirement = 0; yearsFromRetirement <= expectedLifespan; yearsFromRetirement += 5) {
                          const age = retirementAge + yearsFromRetirement;
                          const year = new Date().getFullYear() + (retirementAge - currentAge) + yearsFromRetirement;
                          const withdrawalAmount = annualWithdrawal * Math.pow(1.03, inflationAdjustment ? yearsFromRetirement : 0);

                          // Determine primary account source based on age
                          let primarySource = 'Taxable';
                          if (age >= 73) {
                            primarySource = 'Tax-Deferred (RMD)';
                          } else if (age >= 60) {
                            primarySource = 'Tax-Deferred';
                          }

                          timelinePoints.push({
                            age,
                            year,
                            amount: withdrawalAmount,
                            source: primarySource,
                            label: yearsFromRetirement === 0 ? 'Start' : null
                          });
                        }

                        return timelinePoints.map((point, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${point.label ? 'text-indigo-700' : 'text-gray-600'}`}>
                                  Age {point.age}
                                  {point.label && ` (${point.label})`}
                                </span>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-xs text-gray-600">{point.source}</span>
                              </div>
                              <div className="text-sm font-semibold text-indigo-700">
                                {point.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/yr
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>

                    <div className="mt-3 text-xs text-indigo-700 bg-white rounded-lg p-3">
                      <strong>Note:</strong> Timeline shows tax-efficient withdrawal order. System automatically switches to next available account if one depletes.
                    </div>
                  </div>
                )}

                {/* Key Benefits */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    Key Benefits
                  </h3>

                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>Sustainable income for {expectedLifespan} years of retirement</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>Tax-efficient withdrawal sequencing across account types</span>
                    </li>
                    {guardrailsEnabled && (
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2 mt-0.5">✓</span>
                        <span>Dynamic adjustments protect against market downturns</span>
                      </li>
                    )}
                    {inflationAdjustment && (
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2 mt-0.5">✓</span>
                        <span>Inflation protection maintains purchasing power</span>
                      </li>
                    )}
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>{emergencyBuffer}-month emergency buffer for unexpected expenses</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'asset-allocation': {
        // Asset Allocation & Rebalancing Configuration
        const allocationStrategy = config.allocationStrategy || 'age_based_enhanced';
        const riskTolerance = config.riskTolerance || 'moderate';
        const targetRetirementAge = config.targetRetirementAge || 65;
        const currentAge = context?.currentAge || 35;
        const includeInternational = config.includeInternational !== false;
        const internationalPercentage = config.internationalPercentage || 0.30;
        const includeAlternatives = config.includeAlternatives || false;
        const alternativesPercentage = config.alternativesPercentage || 0.10;
        const rebalanceFrequency = config.rebalanceFrequency || 'quarterly';
        const rebalanceThreshold = config.rebalanceThreshold || 0.05;
        const customStockPercentage = config.customStockPercentage || 0.60;
        const customBondPercentage = config.customBondPercentage || 0.40;

        // Calculate planning horizon for rebalancing events
        const planningYears = Math.max(30, (targetRetirementAge - currentAge) + 15);
        const planningMonths = planningYears * 12;

        // Calculate target allocation based on strategy
        let stockPercentage = 0.60;
        let bondPercentage = 0.40;

        switch (allocationStrategy) {
          case 'age_based_simple':
            stockPercentage = Math.max(0.2, Math.min(0.9, (100 - currentAge) / 100));
            bondPercentage = 1 - stockPercentage;
            break;
          case 'age_based_enhanced':
            stockPercentage = Math.max(0.2, Math.min(0.9, (120 - currentAge) / 100));
            bondPercentage = 1 - stockPercentage;
            break;
          case 'risk_based':
            const riskAllocations: Record<string, { stock: number; bond: number }> = {
              very_conservative: { stock: 0.20, bond: 0.80 },
              conservative: { stock: 0.30, bond: 0.70 },
              moderate_conservative: { stock: 0.40, bond: 0.60 },
              moderate: { stock: 0.60, bond: 0.40 },
              moderate_aggressive: { stock: 0.70, bond: 0.30 },
              aggressive: { stock: 0.80, bond: 0.20 },
              very_aggressive: { stock: 0.90, bond: 0.10 }
            };
            const riskAllocation = riskAllocations[riskTolerance];
            if (riskAllocation) {
              stockPercentage = riskAllocation.stock;
              bondPercentage = riskAllocation.bond;
            }
            break;
          case 'target_date':
            const yearsToRetirement = targetRetirementAge - currentAge;
            stockPercentage = Math.max(0.3, Math.min(0.9, 0.9 - (0.6 / 45) * (45 - yearsToRetirement)));
            bondPercentage = 1 - stockPercentage;
            break;
          case 'three_fund':
            stockPercentage = 0.70;
            bondPercentage = 0.30;
            break;
          case 'custom':
            stockPercentage = customStockPercentage;
            bondPercentage = customBondPercentage;
            break;

          case 'glide_path':
            // Get glide path parameters
            const glidePathType = config.glidePathType || 'moderate';
            const startingStockPercentage = config.startingStockPercentage || 0.90;
            const retirementStockPercentage = config.retirementStockPercentage || 0.50;
            const postRetirementStockPercentage = config.postRetirementStockPercentage || 0.40;

            // Apply presets if not custom
            if (glidePathType !== 'custom') {
              const presets: Record<string, { start: number; retirement: number; post: number }> = {
                conservative: { start: 0.70, retirement: 0.40, post: 0.30 },
                moderate: { start: 0.85, retirement: 0.50, post: 0.40 },
                aggressive: { start: 0.95, retirement: 0.60, post: 0.50 },
                target_date: { start: 0.90, retirement: 0.45, post: 0.35 }
              };
              const preset = presets[glidePathType];
              if (preset) {
                if (currentAge <= targetRetirementAge) {
                  const progressToRetirement = (currentAge - (targetRetirementAge - 40)) / 40;
                  stockPercentage = preset.start + (preset.retirement - preset.start) * Math.max(0, Math.min(1, progressToRetirement));
                } else {
                  const yearsPostRetirement = currentAge - targetRetirementAge;
                  const progressPostRetirement = Math.min(1, yearsPostRetirement / 15);
                  stockPercentage = preset.retirement + (preset.post - preset.retirement) * progressPostRetirement;
                }
              }
            } else {
              // Custom glide path
              if (currentAge <= targetRetirementAge) {
                const progressToRetirement = (currentAge - (targetRetirementAge - 40)) / 40;
                stockPercentage = startingStockPercentage + (retirementStockPercentage - startingStockPercentage) * Math.max(0, Math.min(1, progressToRetirement));
              } else {
                const yearsPostRetirement = currentAge - targetRetirementAge;
                const progressPostRetirement = Math.min(1, yearsPostRetirement / 15);
                stockPercentage = retirementStockPercentage + (postRetirementStockPercentage - retirementStockPercentage) * progressPostRetirement;
              }
            }

            stockPercentage = Math.max(0.15, Math.min(0.95, stockPercentage));
            bondPercentage = 1 - stockPercentage;
            break;
        }

        // Adjust for alternatives
        if (includeAlternatives) {
          stockPercentage = stockPercentage * (1 - alternativesPercentage);
          bondPercentage = bondPercentage * (1 - alternativesPercentage);
        }

        // Calculate domestic vs international split
        const domesticStockPercentage = includeInternational
          ? stockPercentage * (1 - internationalPercentage)
          : stockPercentage;
        const internationalStockPercentage = includeInternational
          ? stockPercentage * internationalPercentage
          : 0;

        // Rebalancing frequency in months
        const frequencyMonths: Record<string, number> = {
          monthly: 1,
          quarterly: 3,
          semi_annually: 6,
          annually: 12
        };
        const rebalanceMonths = frequencyMonths[rebalanceFrequency];

        // Determine if this is a dynamic strategy that creates multiple allocation events
        const isDynamicStrategy = ['age_based_simple', 'age_based_enhanced', 'target_date', 'glide_path'].includes(allocationStrategy);

        // Calculate number of allocation adjustment events for dynamic strategies
        const numAllocationEvents = isDynamicStrategy
          ? Math.ceil(planningYears / 5) // Every 5 years
          : 1; // Static strategies get 1 event

        return (
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Panel - Configuration */}
            <div className="flex-1 lg:w-1/2 p-6 overflow-y-auto border-r border-gray-200">
              {/* Header region with improved styling */}
              <div className="mb-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 -mx-6 -mt-6 px-6 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xl">
                        📊
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Asset Allocation & Rebalancing</h2>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 ml-13">
                      Set your target investment mix and automatic rebalancing schedule.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Configuration Form */}
              <div className="space-y-5">
                {/* Allocation Strategy */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Allocation Strategy
                  </label>
                  <select
                    value={allocationStrategy}
                    onChange={(e) => setConfig({ ...config, allocationStrategy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="age_based_simple">100 minus Age (Simple)</option>
                    <option value="age_based_enhanced">120 minus Age (Enhanced)</option>
                    <option value="risk_based">Risk Tolerance Based</option>
                    <option value="target_date">Target Date Approach</option>
                    <option value="glide_path">Custom Glide Path (Advanced)</option>
                    <option value="three_fund">Three-Fund Portfolio (70/30)</option>
                    <option value="custom">Custom Static Allocation</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {allocationStrategy === 'age_based_enhanced' && 'Allocates 120 minus your age to stocks'}
                    {allocationStrategy === 'age_based_simple' && 'Allocates 100 minus your age to stocks'}
                    {allocationStrategy === 'risk_based' && 'Based on your risk tolerance preference'}
                    {allocationStrategy === 'target_date' && 'Gradually reduces stock allocation as you near retirement'}
                    {allocationStrategy === 'glide_path' && 'Advanced custom glide path with multiple lifecycle stages'}
                    {allocationStrategy === 'three_fund' && 'Simple 70% stock / 30% bond split'}
                    {allocationStrategy === 'custom' && 'Customize your own fixed stock/bond allocation'}
                  </p>
                </div>

                {/* Risk Tolerance (shown for risk-based) */}
                {allocationStrategy === 'risk_based' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Risk Tolerance
                    </label>
                    <select
                      value={riskTolerance}
                      onChange={(e) => setConfig({ ...config, riskTolerance: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="very_conservative">Very Conservative (20% stocks)</option>
                      <option value="conservative">Conservative (30% stocks)</option>
                      <option value="moderate_conservative">Moderate Conservative (40% stocks)</option>
                      <option value="moderate">Moderate (60% stocks)</option>
                      <option value="moderate_aggressive">Moderate Aggressive (70% stocks)</option>
                      <option value="aggressive">Aggressive (80% stocks)</option>
                      <option value="very_aggressive">Very Aggressive (90% stocks)</option>
                    </select>
                  </div>
                )}

                {/* Custom Allocation Sliders (shown for custom) */}
                {allocationStrategy === 'custom' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Stock Allocation: {Math.round(customStockPercentage * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={customStockPercentage * 100}
                        onChange={(e) => {
                          const stockPct = parseInt(e.target.value) / 100;
                          setConfig({
                            ...config,
                            customStockPercentage: stockPct,
                            customBondPercentage: 1 - stockPct
                          });
                        }}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Bond Allocation: {Math.round(customBondPercentage * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={customBondPercentage * 100}
                        onChange={(e) => {
                          const bondPct = parseInt(e.target.value) / 100;
                          setConfig({
                            ...config,
                            customBondPercentage: bondPct,
                            customStockPercentage: 1 - bondPct
                          });
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Glide Path Configuration (shown for glide_path) */}
                {allocationStrategy === 'glide_path' && (
                  <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      Custom Glide Path Configuration
                    </h3>

                    {/* Glide Path Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Glide Path Type
                      </label>
                      <select
                        value={config.glidePathType || 'moderate'}
                        onChange={(e) => setConfig({ ...config, glidePathType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      >
                        <option value="conservative">Conservative (Lower starting equity)</option>
                        <option value="moderate">Moderate (Balanced approach)</option>
                        <option value="aggressive">Aggressive (Higher starting equity)</option>
                        <option value="target_date">Target Date Fund Style</option>
                        <option value="custom">Custom (Specify exact percentages)</option>
                      </select>
                    </div>

                    {/* Custom Percentages (shown when glidePathType is 'custom') */}
                    {config.glidePathType === 'custom' && (
                      <div className="space-y-3 p-3 bg-white rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Starting Stock Allocation: {Math.round((config.startingStockPercentage || 0.90) * 100)}%
                          </label>
                          <input
                            type="range"
                            min="60"
                            max="100"
                            step="5"
                            value={(config.startingStockPercentage || 0.90) * 100}
                            onChange={(e) => setConfig({ ...config, startingStockPercentage: parseInt(e.target.value) / 100 })}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">Allocation at current age</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Retirement Stock Allocation: {Math.round((config.retirementStockPercentage || 0.50) * 100)}%
                          </label>
                          <input
                            type="range"
                            min="20"
                            max="70"
                            step="5"
                            value={(config.retirementStockPercentage || 0.50) * 100}
                            onChange={(e) => setConfig({ ...config, retirementStockPercentage: parseInt(e.target.value) / 100 })}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">Allocation at retirement age</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Post-Retirement Stock Allocation: {Math.round((config.postRetirementStockPercentage || 0.40) * 100)}%
                          </label>
                          <input
                            type="range"
                            min="15"
                            max="60"
                            step="5"
                            value={(config.postRetirementStockPercentage || 0.40) * 100}
                            onChange={(e) => setConfig({ ...config, postRetirementStockPercentage: parseInt(e.target.value) / 100 })}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">Final allocation 15+ years post-retirement</p>
                        </div>
                      </div>
                    )}

                    {/* Smoothing Factor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Glide Path Curve Shape
                      </label>
                      <select
                        value={config.glidePathSmoothingFactor || 'moderate'}
                        onChange={(e) => setConfig({ ...config, glidePathSmoothingFactor: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      >
                        <option value="aggressive">Aggressive (Rapid early adjustment)</option>
                        <option value="moderate">Moderate (Steady linear adjustment)</option>
                        <option value="conservative">Conservative (Gradual late adjustment)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Controls how quickly allocation changes over time</p>
                    </div>

                    {/* Adjustment Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Adjustment Frequency
                      </label>
                      <select
                        value={config.glidePathAdjustmentFrequency || 'annually'}
                        onChange={(e) => setConfig({ ...config, glidePathAdjustmentFrequency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      >
                        <option value="quarterly">Quarterly</option>
                        <option value="semi_annually">Semi-Annually</option>
                        <option value="annually">Annually</option>
                        <option value="every_2_years">Every 2 Years</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">How often to review and adjust allocation</p>
                    </div>

                    {/* Minimum Adjustment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Minimum Adjustment Threshold: {Math.round((config.minimumGlidePathAdjustment || 0.05) * 100)}%
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={(config.minimumGlidePathAdjustment || 0.05) * 100}
                        onChange={(e) => setConfig({ ...config, minimumGlidePathAdjustment: parseInt(e.target.value) / 100 })}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Only adjust if change exceeds this threshold</p>
                    </div>
                  </div>
                )}

                {/* Target Retirement Age (for target_date and glide_path) */}
                {(allocationStrategy === 'target_date' || allocationStrategy === 'glide_path' || allocationStrategy === 'age_based_simple' || allocationStrategy === 'age_based_enhanced') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Target Retirement Age
                    </label>
                    <input
                      type="number"
                      value={targetRetirementAge}
                      onChange={(e) => setConfig({ ...config, targetRetirementAge: parseInt(e.target.value) })}
                      min={50}
                      max={75}
                      step={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Current age: {currentAge} • Years to retirement: {targetRetirementAge - currentAge}
                    </p>
                  </div>
                )}

                {/* Diversification Options */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Diversification Options</h3>

                  {/* International Exposure */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="includeInternational"
                      checked={includeInternational}
                      onChange={(e) => setConfig({ ...config, includeInternational: e.target.checked })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="includeInternational" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Include International Stocks
                      </label>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Diversify globally with international equity exposure
                      </p>
                      {includeInternational && (
                        <div className="mt-2">
                          <label className="block text-xs text-gray-700 mb-1">
                            International % of stocks: {Math.round(internationalPercentage * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="5"
                            value={internationalPercentage * 100}
                            onChange={(e) => setConfig({ ...config, internationalPercentage: parseInt(e.target.value) / 100 })}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alternatives */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="includeAlternatives"
                      checked={includeAlternatives}
                      onChange={(e) => setConfig({ ...config, includeAlternatives: e.target.checked })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="includeAlternatives" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Include Alternative Investments
                      </label>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Add REITs, commodities, or other alternatives
                      </p>
                      {includeAlternatives && (
                        <div className="mt-2">
                          <label className="block text-xs text-gray-700 mb-1">
                            Alternatives allocation: {Math.round(alternativesPercentage * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="20"
                            step="5"
                            value={alternativesPercentage * 100}
                            onChange={(e) => setConfig({ ...config, alternativesPercentage: parseInt(e.target.value) / 100 })}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rebalancing Settings */}
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Rebalancing Policy</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Rebalancing Frequency
                    </label>
                    <select
                      value={rebalanceFrequency}
                      onChange={(e) => setConfig({ ...config, rebalanceFrequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly (Recommended)</option>
                      <option value="semi_annually">Semi-Annually</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Rebalancing Threshold: {Math.round(rebalanceThreshold * 100)}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={rebalanceThreshold * 100}
                      onChange={(e) => setConfig({ ...config, rebalanceThreshold: parseInt(e.target.value) / 100 })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Rebalance when any asset class drifts by more than {Math.round(rebalanceThreshold * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 lg:w-1/2 p-6 bg-gray-50 overflow-y-auto">
              <div className="space-y-5">
                {/* Target Allocation Breakdown */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5">
                  <h3 className="font-semibold text-purple-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    Target Asset Allocation
                  </h3>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    {/* Domestic Stocks */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">🇺🇸 Domestic Stocks</span>
                        <span className="text-sm font-bold text-purple-600">{Math.round(domesticStockPercentage * 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                          style={{ width: `${domesticStockPercentage * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* International Stocks */}
                    {internationalStockPercentage > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">🌍 International Stocks</span>
                          <span className="text-sm font-bold text-purple-600">{Math.round(internationalStockPercentage * 100)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600"
                            style={{ width: `${internationalStockPercentage * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bonds */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">📊 Bonds</span>
                        <span className="text-sm font-bold text-purple-600">{Math.round(bondPercentage * 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-600"
                          style={{ width: `${bondPercentage * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Alternatives */}
                    {includeAlternatives && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">🏗️ Alternatives</span>
                          <span className="text-sm font-bold text-purple-600">{Math.round(alternativesPercentage * 100)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                            style={{ width: `${alternativesPercentage * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Total Stocks */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">Total Stocks</span>
                        <span className="text-sm font-bold text-blue-600">{Math.round((domesticStockPercentage + internationalStockPercentage) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Allocation Evolution Timeline - Only for Dynamic Strategies */}
                {isDynamicStrategy && context && (
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-5">
                    <h3 className="font-semibold text-indigo-900 mb-4 flex items-center">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                      Allocation Evolution Timeline
                    </h3>

                    <div className="bg-white rounded-lg p-4 space-y-3">
                      {(() => {
                        // Calculate allocation evolution for dynamic strategies
                        const timelinePoints = [];
                        const retirementAge = context.config.retirementYear || 67;
                        const currentAge = context.currentAge || context.config.currentAge || 30;
                        const planningYears = retirementAge - currentAge + 15; // Through retirement

                        for (let yearsFromNow = 0; yearsFromNow <= planningYears; yearsFromNow += 5) {
                          const futureAge = currentAge + yearsFromNow;
                          if (futureAge > retirementAge + 15) break; // Cap at 15 years post-retirement

                          let stockPercentage = 0;

                          // Calculate stock percentage based on strategy type
                          if (allocationStrategy === 'age_based_simple') {
                            stockPercentage = Math.max(0.15, Math.min(0.95, (100 - futureAge) / 100));
                          } else if (allocationStrategy === 'age_based_enhanced') {
                            stockPercentage = Math.max(0.15, Math.min(0.95, (120 - futureAge) / 100));
                          } else if (allocationStrategy === 'target_date') {
                            // Target date uses similar logic to 120-age but with smoother curve
                            const yearsToRetirement = retirementAge - futureAge;
                            stockPercentage = Math.max(0.3, Math.min(0.9, 0.9 - (0.6 / 45) * (45 - yearsToRetirement)));
                          } else if (allocationStrategy === 'glide_path') {
                            // Glide path calculation
                            const glidePathType = config.glidePathType || 'moderate';
                            const startingStockPercentage = config.startingStockPercentage || 0.90;
                            const retirementStockPercentage = config.retirementStockPercentage || 0.50;
                            const postRetirementStockPercentage = config.postRetirementStockPercentage || 0.40;

                            // Apply presets if not custom
                            if (glidePathType !== 'custom') {
                              const presets: Record<string, { start: number; retirement: number; post: number }> = {
                                conservative: { start: 0.70, retirement: 0.40, post: 0.30 },
                                moderate: { start: 0.85, retirement: 0.50, post: 0.40 },
                                aggressive: { start: 0.95, retirement: 0.60, post: 0.50 },
                                target_date: { start: 0.90, retirement: 0.45, post: 0.35 }
                              };
                              const preset = presets[glidePathType];
                              if (preset) {
                                if (futureAge <= retirementAge) {
                                  const progressToRetirement = (futureAge - (retirementAge - 40)) / 40;
                                  stockPercentage = preset.start + (preset.retirement - preset.start) * Math.max(0, Math.min(1, progressToRetirement));
                                } else {
                                  const yearsPostRetirement = futureAge - retirementAge;
                                  const progressPostRetirement = Math.min(1, yearsPostRetirement / 15);
                                  stockPercentage = preset.retirement + (preset.post - preset.retirement) * progressPostRetirement;
                                }
                              }
                            } else {
                              // Custom glide path
                              if (futureAge <= retirementAge) {
                                const progressToRetirement = (futureAge - (retirementAge - 40)) / 40;
                                stockPercentage = startingStockPercentage + (retirementStockPercentage - startingStockPercentage) * Math.max(0, Math.min(1, progressToRetirement));
                              } else {
                                const yearsPostRetirement = futureAge - retirementAge;
                                const progressPostRetirement = Math.min(1, yearsPostRetirement / 15);
                                stockPercentage = retirementStockPercentage + (postRetirementStockPercentage - retirementStockPercentage) * progressPostRetirement;
                              }
                            }

                            stockPercentage = Math.max(0.15, Math.min(0.95, stockPercentage));
                          }

                          timelinePoints.push({
                            age: futureAge,
                            year: new Date().getFullYear() + yearsFromNow,
                            stockPercentage: stockPercentage,
                            label: futureAge === currentAge ? 'Today' : futureAge === retirementAge ? 'Retirement' : null
                          });
                        }

                        return timelinePoints.map((point, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className={`text-xs font-medium ${point.label ? 'text-indigo-700' : 'text-gray-600'} w-24`}>
                                Age {point.age}
                                {point.label && ` (${point.label})`}
                              </div>
                              <div className="flex-1 min-w-[120px]">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                    style={{ width: `${point.stockPercentage * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="text-xs font-semibold text-indigo-700 ml-3">
                              {Math.round(point.stockPercentage * 100)}% stocks
                            </div>
                          </div>
                        ));
                      })()}

                      <div className="pt-2 text-xs text-indigo-600 font-medium">
                        💡 Your stock allocation automatically decreases as you age, becoming more conservative
                      </div>
                    </div>
                  </div>
                )}

                {/* Rebalancing Schedule */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
                  <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Rebalancing Schedule
                  </h3>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📅</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm mb-1">
                          {rebalanceFrequency.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Rebalancing
                        </div>
                        <div className="text-xs text-gray-600">
                          Check portfolio every {rebalanceMonths} month{rebalanceMonths > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="text-2xl">⚖️</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm mb-1">
                          {Math.round(rebalanceThreshold * 100)}% Drift Threshold
                        </div>
                        <div className="text-xs text-gray-600">
                          Rebalance if any asset class drifts beyond target
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        <strong>Next 12 months:</strong> Up to {Math.ceil(12 / rebalanceMonths)} rebalancing checks
                      </div>
                    </div>
                  </div>
                </div>

                {/* Events Created */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
                  <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    Events Created 📋
                  </h3>

                  <div className="bg-white rounded-lg p-4">
                    <div className="space-y-2.5">
                      {/* Set Allocation Event */}
                      <div className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="text-lg">🎯</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {isDynamicStrategy ? 'Dynamic Asset Allocation Adjustments' : 'Set Target Asset Allocation'}
                            </span>
                            <span className="text-xs text-purple-600 font-medium">
                              {isDynamicStrategy ? `${numAllocationEvents} events` : 'Month 1'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {isDynamicStrategy
                              ? `Allocation adjusts every 5 years as you age (${Math.round((domesticStockPercentage + internationalStockPercentage) * 100)}% stocks today → less over time)`
                              : `Implement ${Math.round((domesticStockPercentage + internationalStockPercentage) * 100)}% stocks / ${Math.round(bondPercentage * 100)}% bonds allocation`
                            }
                          </div>
                        </div>
                      </div>

                      {/* Rebalancing Events */}
                      <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-lg">🔄</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {rebalanceFrequency.replace('_', ' ').charAt(0).toUpperCase() + rebalanceFrequency.replace('_', ' ').slice(1)} Portfolio Rebalancing
                            </span>
                            <span className="text-xs text-green-600 font-medium">Recurring</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            Scheduled rebalancing every {rebalanceMonths} months for entire planning horizon
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                        <strong>Total Events:</strong> {numAllocationEvents + Math.floor(planningMonths / rebalanceMonths)} ({numAllocationEvents} allocation + {Math.floor(planningMonths / rebalanceMonths)} rebalancing over {planningYears} years)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Educational Note - Why Rebalance */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">💡</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-900 text-sm mb-1">Why Rebalance?</h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Rebalancing maintains your target risk level by selling winners and buying underperformers.
                        This disciplined approach helps you "buy low, sell high" automatically while keeping your
                        portfolio aligned with your goals.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Educational Note - Dynamic vs Static Strategies */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">🛤️</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 text-sm mb-2">Strategy Types</h4>
                      <div className="space-y-2 text-xs text-blue-800">
                        <p className="leading-relaxed">
                          <strong>Dynamic Strategies (Age-Based, Target Date):</strong> Automatically adjust allocation
                          every 5 years as you age. For example, "120 minus age" recalculates at ages 30, 35, 40, etc.,
                          gradually reducing stocks over time.
                        </p>
                        <p className="leading-relaxed">
                          <strong>Static Strategies (Risk-Based, Three-Fund, Custom):</strong> Set a fixed allocation
                          that stays constant. Rebalancing maintains this target but doesn't change the percentages.
                        </p>
                        <p className="leading-relaxed">
                          <strong>Glide Path Strategy (Separate):</strong> Most sophisticated option with custom
                          starting, retirement, and post-retirement allocations. Offers more control than age-based formulas.
                        </p>
                        <p className="leading-relaxed text-blue-700 font-medium">
                          💡 Tip: Age-based = automatic adjustments. Risk-based = stays the same. Glide Path = maximum control.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'glide-path': {
        // Glide Path Optimizer Configuration
        const glidePathType = config.glidePathType || 'target_date';
        const targetRetirementAge = config.targetRetirementAge || 65;
        const currentAge = context?.currentAge || 35;
        const startingStockPercentage = config.startingStockPercentage || 0.90;
        const retirementStockPercentage = config.retirementStockPercentage || 0.50;
        const postRetirementStockPercentage = config.postRetirementStockPercentage || 0.40;
        const adjustmentFrequency = config.adjustmentFrequency || 'annually';
        const minimumAdjustment = config.minimumAdjustment || 0.05;
        const includeLifeEventAdjustments = config.includeLifeEventAdjustments !== false;
        const smoothingFactor = config.smoothingFactor || 'moderate';
        const volatilityAdjustment = config.volatilityAdjustment || false;
        const internationalAllocation = config.internationalAllocation || 0.30;

        // Calculate glide path preview points
        const yearsToRetirement = targetRetirementAge - currentAge;
        const totalYears = Math.max(30, yearsToRetirement + 15);
        const previewPoints = [];

        // Generate preview allocation points every 5 years
        for (let year = 0; year <= totalYears; year += 5) {
          const age = currentAge + year;
          let stockPercentage = startingStockPercentage;

          if (age <= targetRetirementAge) {
            const progressToRetirement = (age - currentAge) / yearsToRetirement;
            stockPercentage = startingStockPercentage +
              (retirementStockPercentage - startingStockPercentage) * progressToRetirement;
          } else {
            const yearsPostRetirement = age - targetRetirementAge;
            const progressPostRetirement = Math.min(1, yearsPostRetirement / 15);
            stockPercentage = retirementStockPercentage +
              (postRetirementStockPercentage - retirementStockPercentage) * progressPostRetirement;
          }

          previewPoints.push({
            age,
            year: currentAge + year,
            stockPercentage: Math.max(0.15, Math.min(0.95, stockPercentage)),
            bondPercentage: 1 - stockPercentage
          });
        }

        // Calculate number of adjustment events
        const frequencyYears: Record<string, number> = {
          quarterly: 0.25,
          semi_annually: 0.5,
          annually: 1,
          every_2_years: 2
        };
        const yearInterval = frequencyYears[adjustmentFrequency];
        const numAdjustments = Math.floor(totalYears / yearInterval);

        return (
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Panel - Configuration */}
            <div className="flex-1 lg:w-1/2 p-6 overflow-y-auto border-r border-gray-200">
              {/* Header */}
              <div className="mb-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 -mx-6 -mt-6 px-6 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xl">
                        🛤️
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Glide Path Optimizer</h2>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 ml-13">
                      Automatically evolve your allocation over decades, becoming more conservative as you approach retirement.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Configuration Form */}
              <div className="space-y-5">
                {/* Glide Path Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Glide Path Type
                  </label>
                  <select
                    value={glidePathType}
                    onChange={(e) => setConfig({ ...config, glidePathType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="conservative">Conservative (Gradual decrease in stocks)</option>
                    <option value="moderate">Moderate (Standard target date approach)</option>
                    <option value="aggressive">Aggressive (Higher stocks longer)</option>
                    <option value="target_date">Target Date Fund Style</option>
                    <option value="custom">Custom Glide Path</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {glidePathType === 'conservative' && 'Gradual reduction in stocks from the start'}
                    {glidePathType === 'moderate' && 'Balanced approach similar to target-date funds'}
                    {glidePathType === 'aggressive' && 'Maintain higher stocks until closer to retirement'}
                    {glidePathType === 'target_date' && 'S-curve transition typical of target-date funds'}
                    {glidePathType === 'custom' && 'Customize every aspect of your glide path'}
                  </p>
                </div>

                {/* Target Retirement Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Target Retirement Age
                  </label>
                  <input
                    type="number"
                    value={targetRetirementAge}
                    onChange={(e) => setConfig({ ...config, targetRetirementAge: parseInt(e.target.value) })}
                    min={50}
                    max={75}
                    step={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current age: {currentAge} • Years to retirement: {targetRetirementAge - currentAge}
                  </p>
                </div>

                {/* Allocation Points */}
                <div className="space-y-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Allocation Waypoints</h3>

                  {/* Starting Allocation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Starting Stock Allocation: {Math.round(startingStockPercentage * 100)}%
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="100"
                      step="5"
                      value={startingStockPercentage * 100}
                      onChange={(e) => setConfig({ ...config, startingStockPercentage: parseInt(e.target.value) / 100 })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-600 mt-1">Your initial allocation (today)</p>
                  </div>

                  {/* Retirement Allocation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      At Retirement (Age {targetRetirementAge}): {Math.round(retirementStockPercentage * 100)}%
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="70"
                      step="5"
                      value={retirementStockPercentage * 100}
                      onChange={(e) => setConfig({ ...config, retirementStockPercentage: parseInt(e.target.value) / 100 })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-600 mt-1">Target allocation when you retire</p>
                  </div>

                  {/* Post-Retirement Allocation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Post-Retirement (Age {targetRetirementAge + 10}): {Math.round(postRetirementStockPercentage * 100)}%
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="60"
                      step="5"
                      value={postRetirementStockPercentage * 100}
                      onChange={(e) => setConfig({ ...config, postRetirementStockPercentage: parseInt(e.target.value) / 100 })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-600 mt-1">Final allocation 10 years after retirement</p>
                  </div>
                </div>

                {/* Adjustment Settings */}
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Adjustment Settings</h3>

                  {/* Adjustment Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Review Frequency
                    </label>
                    <select
                      value={adjustmentFrequency}
                      onChange={(e) => setConfig({ ...config, adjustmentFrequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="quarterly">Quarterly</option>
                      <option value="semi_annually">Semi-Annually</option>
                      <option value="annually">Annually</option>
                      <option value="every_2_years">Every 2 Years</option>
                    </select>
                  </div>

                  {/* Minimum Adjustment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Minimum Adjustment: {Math.round(minimumAdjustment * 100)}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={minimumAdjustment * 100}
                      onChange={(e) => setConfig({ ...config, minimumAdjustment: parseInt(e.target.value) / 100 })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Only adjust if change exceeds this threshold
                    </p>
                  </div>

                  {/* Smoothing Factor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Transition Smoothing
                    </label>
                    <select
                      value={smoothingFactor}
                      onChange={(e) => setConfig({ ...config, smoothingFactor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="aggressive">Aggressive (Sharp changes)</option>
                      <option value="moderate">Moderate (Balanced)</option>
                      <option value="conservative">Conservative (Very gradual)</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-sm">Advanced Options</h3>

                  {/* International Allocation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      International Stocks: {Math.round(internationalAllocation * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={internationalAllocation * 100}
                      onChange={(e) => setConfig({ ...config, internationalAllocation: parseInt(e.target.value) / 100 })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Percentage of stock allocation for international markets
                    </p>
                  </div>

                  {/* Life Event Adjustments */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="includeLifeEventAdjustments"
                      checked={includeLifeEventAdjustments}
                      onChange={(e) => setConfig({ ...config, includeLifeEventAdjustments: e.target.checked })}
                      className="mt-1"
                    />
                    <label htmlFor="includeLifeEventAdjustments" className="flex-1 text-sm text-gray-700">
                      <span className="font-medium">Include Life Event Checkpoints</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Add review points for major life events (marriage, children, etc.)
                      </p>
                    </label>
                  </div>

                  {/* Volatility Adjustment */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="volatilityAdjustment"
                      checked={volatilityAdjustment}
                      onChange={(e) => setConfig({ ...config, volatilityAdjustment: e.target.checked })}
                      className="mt-1"
                    />
                    <label htmlFor="volatilityAdjustment" className="flex-1 text-sm text-gray-700">
                      <span className="font-medium">Market Volatility Adjustments</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Temporarily adjust based on market conditions (advanced)
                      </p>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 lg:w-1/2 p-6 bg-gray-50 overflow-y-auto">
              <div className="space-y-5">
                {/* Glide Path Curve Preview */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-5">
                  <h3 className="font-semibold text-indigo-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                    Your Glide Path Curve
                  </h3>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    {previewPoints.map((point, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            Age {point.age} {point.age === currentAge && '(Today)'}
                            {point.age === targetRetirementAge && '(Retirement)'}
                          </span>
                          <span className="text-sm font-bold text-indigo-600">
                            {Math.round(point.stockPercentage * 100)}% stocks
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600"
                            style={{ width: `${point.stockPercentage * 100}%` }}
                          />
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600"
                            style={{ width: `${point.bondPercentage * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Adjustment Schedule */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
                  <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Adjustment Schedule
                  </h3>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📅</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm mb-1">
                          {adjustmentFrequency.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Reviews
                        </div>
                        <div className="text-xs text-gray-600">
                          Automatic allocation adjustments every {yearInterval} year{yearInterval > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🎯</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm mb-1">
                          {Math.round(minimumAdjustment * 100)}% Minimum Change
                        </div>
                        <div className="text-xs text-gray-600">
                          Only adjust when allocation change exceeds threshold
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        <strong>Total Events:</strong> Up to {numAdjustments} allocation adjustments over {totalYears} years
                      </div>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
                  <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    Key Benefits
                  </h3>

                  <div className="bg-white rounded-lg p-4 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <div className="text-lg">✅</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Automatic Age-Appropriate Risk</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          Your portfolio naturally becomes more conservative as you approach retirement
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="text-lg">✅</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Set It and Forget It</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          No need to manually adjust your allocation every few years
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="text-lg">✅</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Smooth Transitions</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          Gradual changes prevent sudden shifts in your portfolio
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Educational Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">💡</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-900 text-sm mb-1">Like Target-Date Funds</h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Glide paths work like target-date retirement funds (e.g., "Target 2050"). They start aggressive
                        for growth, then gradually shift to conservative for capital preservation. The difference? You
                        control every parameter instead of accepting a fund company's formula.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'contribution-optimization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contribution Optimization Settings</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Annual Income ($)"
                    type="number"
                    value={config.annualIncome || 100000}
                    onChange={(e) => handleConfigChange('annualIncome', parseFloat(e.target.value))}
                    error={errors.annualIncome}
                    helperText="Your total annual income"
                  />

                  <Input
                    label="Target Savings Rate (%)"
                    type="number"
                    value={(config.targetSavingsRate || 0.15) * 100}
                    onChange={(e) => handleConfigChange('targetSavingsRate', parseFloat(e.target.value) / 100)}
                    error={errors.targetSavingsRate}
                    helperText="Percentage of income to save"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Employer Match (%)"
                    type="number"
                    value={(config.employerMatch || 0.03) * 100}
                    onChange={(e) => handleConfigChange('employerMatch', parseFloat(e.target.value) / 100)}
                    error={errors.employerMatch}
                    helperText="Employer 401(k) match rate"
                  />

                  <Input
                    label="Match Limit (%)"
                    type="number"
                    value={(config.employerMatchLimit || 0.06) * 100}
                    onChange={(e) => handleConfigChange('employerMatchLimit', parseFloat(e.target.value) / 100)}
                    error={errors.employerMatchLimit}
                    helperText="Max salary % that gets matched"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="has401k"
                      checked={config.has401k || true}
                      onChange={(e) => handleConfigChange('has401k', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="has401k" className="text-sm text-gray-700">
                      Have 401(k) access
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasHSA"
                      checked={config.hasHSA || false}
                      onChange={(e) => handleConfigChange('hasHSA', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="hasHSA" className="text-sm text-gray-700">
                      Have HSA access
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'investment-optimization':
        const emergencyFundTarget = (config.emergencyFundMonths || 6) * (config.monthlyExpenses || 4000);
        const currentCashBalance = 10000; // TODO: Get from actual store.config.initialCash
        const emergencyFundComplete = currentCashBalance >= emergencyFundTarget;
        const emergencyFundShortfall = Math.max(0, emergencyFundTarget - currentCashBalance);
        const monthlyInvestment = config.monthlyInvestment || 2000;
        const maxRetirement401k = config.maxRetirement401k || 1833; // IRS monthly limit
        const maxRetirementIRA = config.maxRetirementIRA || 542;    // IRS monthly limit

        // PHASE-BASED PRIORITY SYSTEM (NOT simultaneous allocation)
        // Phase 1: Build emergency fund FIRST (100% to cash until target reached)
        // Phase 2: After emergency fund complete → Max out retirement accounts (401k prioritized)
        // Phase 3: Excess goes to taxable brokerage

        // Calculate what events WILL be created (regardless of current emergency fund status)
        let eventPlan_retirement401k = 0;
        let eventPlan_retirementIRA = 0;
        let eventPlan_taxableAllocation = 0;

        let remaining = monthlyInvestment;

        // Calculate final event allocation (what happens after emergency fund complete)
        if (config.has401k !== false) {
          eventPlan_retirement401k = Math.min(remaining, maxRetirement401k);
          remaining -= eventPlan_retirement401k;
        }

        if (config.hasIRA && remaining > 0) {
          eventPlan_retirementIRA = Math.min(remaining, maxRetirementIRA);
          remaining -= eventPlan_retirementIRA;
        }

        if (config.contributeTaxable !== false && remaining > 0) {
          eventPlan_taxableAllocation = remaining;
        }

        const totalRetirement = eventPlan_retirement401k + eventPlan_retirementIRA;

        return (
          <div>
            {/* Header region with improved styling */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl">
                      💰
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Cash Flow & Investment Policy</h2>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 ml-13">
                    Configure automated savings across emergency fund, retirement, and taxable accounts.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* LEFT PANEL: Configuration */}
              <div className="space-y-5">
              {/* Header */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Configure Your Cash Flow</h3>
                <p className="text-sm text-gray-600">
                  Set up automated savings: emergency fund, retirement, and taxable investments.
                </p>
              </div>

              {/* Monthly Savings */}
              <div>
                <Input
                  label="Total Monthly Savings"
                  type="number"
                  value={monthlyInvestment}
                  onChange={(e) => handleConfigChange('monthlyInvestment', parseFloat(e.target.value))}
                  error={errors.monthlyInvestment}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Total amount you'll save/invest every month across all accounts.
                </p>
              </div>

              {/* Emergency Fund */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                    <span className="text-base mr-2">🛡️</span>
                    Emergency Fund (Priority #1)
                  </h4>
                  <button
                    onClick={() => {
                      const isEnabled = (config.emergencyFundMonths || 0) > 0;
                      if (isEnabled) {
                        // Disable by setting to 0
                        handleConfigChange('emergencyFundMonths', 0);
                      } else {
                        // Enable with default value
                        handleConfigChange('emergencyFundMonths', 6);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      (config.emergencyFundMonths || 0) > 0 ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        (config.emergencyFundMonths || 0) > 0 ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {(config.emergencyFundMonths || 0) === 0 ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                    <p className="text-sm font-semibold text-orange-900">⚠️ Emergency Fund Disabled</p>
                    <p className="text-xs text-orange-700 mt-1">
                      All savings will go directly to retirement/taxable accounts. No minimum cash balance will be maintained.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <Input
                          label="Monthly Expenses"
                          type="number"
                          value={config.monthlyExpenses || 4000}
                          onChange={(e) => handleConfigChange('monthlyExpenses', parseFloat(e.target.value))}
                          error={errors.monthlyExpenses}
                        />
                      </div>
                      <div>
                        <Input
                          label="Months Coverage"
                          type="number"
                          value={config.emergencyFundMonths || 6}
                          onChange={(e) => handleConfigChange('emergencyFundMonths', parseFloat(e.target.value))}
                          error={errors.emergencyFundMonths}
                        />
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-900">Target</span>
                        <span className="text-lg font-bold text-green-800">${emergencyFundTarget.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">Once funded, all savings go to investments</p>
                    </div>
                  </>
                )}
              </div>

              {/* Priority System */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="text-base mr-2">📊</span>
                  Priority System (After Emergency Fund)
                </h4>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <div className="text-sm font-medium text-indigo-900">401(k) up to ${maxRetirement401k.toLocaleString()}/mo</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <div className="text-sm font-medium text-indigo-900">IRA up to ${maxRetirementIRA.toLocaleString()}/mo</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-indigo-400 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <div className="text-sm font-medium text-indigo-900">Taxable (remaining)</div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  IRS 2024 limits: 401(k) $22,000/year, IRA $6,500/year
                </p>
              </div>

              {/* Account Types */}
              <div className="border-t border-gray-200 pt-4">
                <label className="text-sm font-semibold text-gray-900 mb-3 block">Account Types</label>
                <div className="space-y-2.5">
                  <label className="flex items-start space-x-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="has401k"
                      checked={config.has401k !== undefined ? config.has401k : true}
                      onChange={(e) => handleConfigChange('has401k', e.target.checked)}
                      className="rounded mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">401(k)</div>
                      <p className="text-xs text-gray-600">Employer plan with match</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="hasIRA"
                      checked={config.hasIRA || false}
                      onChange={(e) => handleConfigChange('hasIRA', e.target.checked)}
                      className="rounded mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">IRA</div>
                      <p className="text-xs text-gray-600">Traditional or Roth IRA</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="contributeTaxable"
                      checked={config.contributeTaxable !== undefined ? config.contributeTaxable : true}
                      onChange={(e) => handleConfigChange('contributeTaxable', e.target.checked)}
                      className="rounded mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Taxable Brokerage</div>
                      <p className="text-xs text-gray-600">Complete flexibility, no penalties</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Preview & Education */}
            <div className="space-y-4">
              {/* Priority Waterfall Infographic */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-slate-500 rounded-full mr-2"></div>
                  Cash Flow Priority System
                </h3>

                {/* Visual Waterfall */}
                <div className="bg-white rounded-lg p-4 mb-3">
                  <div className="space-y-2">
                    {/* Step 1: Monthly Savings */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">1</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Monthly Savings Pool</div>
                        <div className="text-lg font-bold text-blue-600">${monthlyInvestment.toLocaleString()}/mo</div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="ml-4 text-gray-400">↓</div>

                    {/* Step 2: Emergency Fund Check */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">2</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">🛡️ Emergency Fund Check</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {!emergencyFundComplete ? (
                            <>💰 Builds to ${emergencyFundTarget.toLocaleString()} <span className="text-green-600 font-medium">(${currentCashBalance.toLocaleString()} / ${emergencyFundTarget.toLocaleString()})</span></>
                          ) : (
                            <span className="text-green-600 font-medium">✓ Target reached (${emergencyFundTarget.toLocaleString()})</span>
                          )}
                        </div>
                        {!emergencyFundComplete && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (currentCashBalance / emergencyFundTarget) * 100)}%` }}></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="ml-4 text-gray-400">↓</div>

                    {/* Step 3: Investment Priority */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">3</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Investment Priority</div>
                        {!emergencyFundComplete ? (
                          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                            ⏸️ Paused until emergency fund complete
                          </div>
                        ) : (
                          <div className="mt-2 space-y-1.5">
                            {eventPlan_retirement401k > 0 && (
                              <div className="flex items-center justify-between text-xs bg-blue-50 rounded px-2 py-1">
                                <span>🏦 401(k) first</span>
                                <span className="font-bold text-blue-700">${eventPlan_retirement401k.toLocaleString()}/mo</span>
                              </div>
                            )}
                            {eventPlan_retirementIRA > 0 && (
                              <div className="flex items-center justify-between text-xs bg-indigo-50 rounded px-2 py-1">
                                <span>🎯 IRA next</span>
                                <span className="font-bold text-indigo-700">${eventPlan_retirementIRA.toLocaleString()}/mo</span>
                              </div>
                            )}
                            {eventPlan_taxableAllocation > 0 && (
                              <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                <span>📈 Taxable (excess)</span>
                                <span className="font-bold text-purple-700">${eventPlan_taxableAllocation.toLocaleString()}/mo</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                  <strong>💡 How it works:</strong> Initially, all ${monthlyInvestment.toLocaleString()}/mo builds your cash account as an emergency fund. Once you hit ${emergencyFundTarget.toLocaleString()}, the strategy automatically switches to invest in retirement accounts.
                </div>
              </div>

              {/* Events Generated */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Events Created
                </h3>

                <div className="bg-white rounded-lg p-4">
                  <div className="space-y-2.5">
                    {eventPlan_retirement401k > 0 && (
                      <div className="flex items-start gap-2">
                        <div className="text-lg">🏦</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">401(k) Contribution</span>
                            <span className="text-sm font-bold text-blue-600">${eventPlan_retirement401k.toLocaleString()}/mo</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            ${(eventPlan_retirement401k * 12).toLocaleString()}/year (IRS limit: $22,000)
                          </div>
                        </div>
                      </div>
                    )}
                    {eventPlan_retirementIRA > 0 && (
                      <div className="flex items-start gap-2">
                        <div className="text-lg">🎯</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">IRA Contribution</span>
                            <span className="text-sm font-bold text-blue-600">${eventPlan_retirementIRA.toLocaleString()}/mo</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            ${(eventPlan_retirementIRA * 12).toLocaleString()}/year (IRS limit: $6,500)
                          </div>
                        </div>
                      </div>
                    )}
                    {eventPlan_taxableAllocation > 0 && (
                      <div className="flex items-start gap-2">
                        <div className="text-lg">📈</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">Taxable Investment</span>
                            <span className="text-sm font-bold text-purple-600">${eventPlan_taxableAllocation.toLocaleString()}/mo</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Brokerage account (no limits, flexible access)
                          </div>
                        </div>
                      </div>
                    )}
                    {totalRetirement === 0 && eventPlan_taxableAllocation === 0 && (
                      <div className="text-center text-amber-600 text-sm py-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="mb-2">⚠️</div>
                        <div className="font-medium">No accounts selected</div>
                        <div className="text-xs mt-1 text-amber-700">Select at least one account type above to create investment events</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dollar-Cost Averaging */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="text-emerald-600 text-lg">📊</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-emerald-900 mb-2">Dollar-Cost Averaging</h4>
                    <div className="text-xs text-emerald-800 space-y-1">
                      <p>Investing fixed amounts at regular intervals reduces market timing risk and builds wealth through consistency.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="text-indigo-600 text-lg">🎯</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-2">After Saving</h4>
                    <div className="text-xs text-indigo-800 space-y-1.5">
                      <p><strong>Next Step:</strong> Configure Asset Allocation strategy to set your investment mix (stocks/bonds) for optimal growth.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
          </div>
        );


      case 'social-security-optimization': {
        return (
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Panel - Key Decision Points */}
            <div className="flex-1 lg:w-1/2 p-6 overflow-y-auto border-r border-gray-200">
              <div className="mb-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 -mx-6 -mt-6 px-6 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl">
                        🏛️
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Social Security Optimizer</h2>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 ml-13">
                      Understand when to claim Social Security for maximum lifetime benefit.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">When Can You Claim?</h3>
                  <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                          <h4 className="font-semibold text-red-900 mb-1">Age 62: Early Claiming</h4>
                          <p className="text-sm text-red-800 mb-2">Earliest age to claim, but benefits are permanently reduced by ~30%.</p>
                          <p className="text-xs text-red-700"><strong>Best for:</strong> Poor health, urgent financial need, or no other income sources.</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">📅</span>
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-1">Age 67: Full Retirement Age (FRA)</h4>
                          <p className="text-sm text-blue-800 mb-2">Receive 100% of your calculated benefit. No reduction or bonus.</p>
                          <p className="text-xs text-blue-700"><strong>Best for:</strong> Average life expectancy, balanced income needs, or typical retirement.</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">✅</span>
                        <div>
                          <h4 className="font-semibold text-green-900 mb-1">Age 70: Delayed Claiming</h4>
                          <p className="text-sm text-green-800 mb-2">Benefits increase by 8%/yr after FRA, reaching +24% at age 70.</p>
                          <p className="text-xs text-green-700"><strong>Best for:</strong> Good health, longevity in family, other income sources until 70.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Break-Even Analysis</h3>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      The "break-even" age is when total lifetime benefits from delayed claiming exceed early claiming.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Claiming at 62 vs. 67:</span>
                        <span className="font-semibold text-gray-900">Break-even ~age 78</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Claiming at 62 vs. 70:</span>
                        <span className="font-semibold text-gray-900">Break-even ~age 80</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Claiming at 67 vs. 70:</span>
                        <span className="font-semibold text-gray-900">Break-even ~age 82</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      <strong>Note:</strong> U.S. life expectancy is ~77 for men, ~81 for women. If you expect to live beyond these ages, delaying can pay off significantly.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Spousal & Survivor Benefits</h3>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-800 mb-3">
                      Married couples should coordinate claiming strategies to maximize lifetime household benefits.
                    </p>
                    <ul className="space-y-2 text-sm text-purple-900">
                      <li className="flex items-start">
                        <span className="text-purple-600 mr-2">•</span>
                        <span><strong>Spousal Benefit:</strong> Up to 50% of spouse's FRA benefit if higher than your own.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-purple-600 mr-2">•</span>
                        <span><strong>Survivor Benefit:</strong> Surviving spouse receives 100% of deceased's benefit if higher.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-purple-600 mr-2">•</span>
                        <span><strong>Strategy Tip:</strong> Higher earner should consider delaying to age 70 to maximize survivor benefit.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Best Practices & Scenarios */}
            <div className="flex-1 lg:w-1/2 p-6 bg-gray-50 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Best Practices</h3>

                  <div className="space-y-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">1. Consider Your Health & Longevity</h4>
                      <p className="text-xs text-gray-700">
                        If you're in excellent health with longevity in your family, delaying to age 70 typically maximizes lifetime benefits. Poor health favors earlier claiming.
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">2. Check If You're Still Working</h4>
                      <p className="text-xs text-gray-700 mb-2">
                        If you claim before FRA and earn above the annual limit (~$22k), benefits are reduced $1 for every $2 earned.
                      </p>
                      <p className="text-xs text-gray-600 italic">
                        After FRA, no earnings penalty applies.
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">3. Coordinate with Your Spouse</h4>
                      <p className="text-xs text-gray-700">
                        The higher earner should strongly consider delaying to age 70 to maximize the survivor benefit. The lower earner may claim earlier.
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">4. Consider Other Income Sources</h4>
                      <p className="text-xs text-gray-700">
                        If you have adequate retirement savings or passive income, delaying Social Security lets your benefit grow while you spend down other assets first.
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">5. Factor in Taxes</h4>
                      <p className="text-xs text-gray-700">
                        Up to 85% of Social Security benefits can be taxable if combined income exceeds certain thresholds. Coordinate with other retirement withdrawals to minimize taxes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-5">
                  <h3 className="font-semibold text-indigo-900 mb-3">📊 Decision Scenarios</h3>

                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Scenario 1: Healthy, Good Savings</h4>
                      <p className="text-xs text-gray-700 mb-2">
                        <strong>Age:</strong> 65 | <strong>Health:</strong> Excellent | <strong>Savings:</strong> $1.5M
                      </p>
                      <p className="text-xs text-green-700">
                        <strong>Recommendation:</strong> Delay to age 70. Use portfolio withdrawals until then for maximum lifetime benefit.
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Scenario 2: Limited Savings, Need Income</h4>
                      <p className="text-xs text-gray-700 mb-2">
                        <strong>Age:</strong> 64 | <strong>Health:</strong> Average | <strong>Savings:</strong> $200K
                      </p>
                      <p className="text-xs text-blue-700">
                        <strong>Recommendation:</strong> Claim at FRA (67). Balances benefit amount with income needs.
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Scenario 3: Married, Large Income Gap</h4>
                      <p className="text-xs text-gray-700 mb-2">
                        <strong>High earner:</strong> $3K/mo benefit | <strong>Low earner:</strong> $1K/mo benefit
                      </p>
                      <p className="text-xs text-purple-700">
                        <strong>Recommendation:</strong> High earner delays to 70 (survivor benefit). Low earner claims at 67 or earlier.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🚧</span>
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-2">Coming Soon: Automated Optimization</h3>
                      <p className="text-sm text-yellow-800 mb-3">
                        We're building a tool to automatically calculate your optimal claiming age based on your health, savings, marital status, and expected longevity.
                      </p>
                      <p className="text-xs text-yellow-700">
                        For now, use the guidelines above to make an informed decision. Consult with a financial advisor for personalized recommendations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'tax-withholding': {
        // Tax Withholding Configuration
        const withholdingMethod = config.withholdingMethod || 'standard';
        const settlementReserveStrategy = config.settlementReserveStrategy || 'savings';
        const autoReserve = config.autoReserve !== false;
        const alertBeforeSettlement = config.alertBeforeSettlement !== false;

        return (
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Panel - Configuration */}
            <div className="flex-1 lg:w-1/2 p-6 overflow-y-auto border-r border-gray-200">
              {/* Header region */}
              <div className="mb-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 -mx-6 -mt-6 px-6 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xl">
                        💰
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Tax Withholding Optimizer</h2>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 ml-13">
                      Optimize your tax withholding strategy and settlement timing for better cash flow management.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Configuration Form */}
              <div className="space-y-5">
                {/* Withholding Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Withholding Method
                  </label>
                  <select
                    value={withholdingMethod}
                    onChange={(e) => setConfig({ ...config, withholdingMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="standard">Standard W-4 Withholding (Annual Settlement)</option>
                    <option value="quarterly">Quarterly Estimated Payments</option>
                    <option value="increased">Increased Monthly Withholding</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {withholdingMethod === 'standard' && 'Standard withholding with annual tax settlement in April'}
                    {withholdingMethod === 'quarterly' && 'Make estimated tax payments every quarter to avoid settlement'}
                    {withholdingMethod === 'increased' && 'Increase monthly withholding to minimize year-end settlement'}
                  </p>
                </div>

                {/* Settlement Reserve Strategy */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Tax Settlement Reserve Strategy
                  </label>
                  <select
                    value={settlementReserveStrategy}
                    onChange={(e) => setConfig({ ...config, settlementReserveStrategy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="savings">Keep Reserve in Savings (Cash)</option>
                    <option value="treasury">Invest in Treasury Bills</option>
                    <option value="brokerage">Keep in Taxable Brokerage</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {settlementReserveStrategy === 'savings' && 'Safe and liquid, but minimal returns'}
                    {settlementReserveStrategy === 'treasury' && 'Earn 4-5% while staying safe and liquid'}
                    {settlementReserveStrategy === 'brokerage' && 'Potential for higher returns, but market risk'}
                  </p>
                </div>

                {/* Auto-Reserve Toggle */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="autoReserve"
                    checked={autoReserve}
                    onChange={(e) => setConfig({ ...config, autoReserve: e.target.checked })}
                    className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="autoReserve" className="block text-sm font-medium text-gray-900">
                      Auto-reserve for tax settlement
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Automatically set aside funds monthly to cover estimated tax settlement
                    </p>
                  </div>
                </div>

                {/* Settlement Alert Toggle */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="alertBeforeSettlement"
                    checked={alertBeforeSettlement}
                    onChange={(e) => setConfig({ ...config, alertBeforeSettlement: e.target.checked })}
                    className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="alertBeforeSettlement" className="block text-sm font-medium text-gray-900">
                      Alert before settlement due
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Receive notification 30 days before tax settlement is due
                    </p>
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="text-blue-600 text-xl flex-shrink-0">💡</div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Pro Tip</h4>
                      <p className="text-xs text-blue-800">
                        {withholdingMethod === 'standard' && 'With standard withholding, you\'ll pay a lump sum in April. Consider the Treasury Bills option to earn interest on your tax reserve throughout the year.'}
                        {withholdingMethod === 'quarterly' && 'Quarterly payments help spread your tax burden evenly and avoid the annual April settlement surprise.'}
                        {withholdingMethod === 'increased' && 'Increasing your monthly withholding reduces your take-home pay but eliminates the need for a large year-end payment.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview & Examples */}
            <div className="flex-1 lg:w-1/2 p-6 overflow-y-auto bg-gray-50">
              <div className="space-y-6">
                {/* Current Configuration Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Summary</h3>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-600">Method:</span>
                      <span className="text-sm font-medium text-gray-900 text-right">
                        {withholdingMethod === 'standard' && 'Standard W-4 Withholding'}
                        {withholdingMethod === 'quarterly' && 'Quarterly Estimated Payments'}
                        {withholdingMethod === 'increased' && 'Increased Monthly Withholding'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-600">Reserve Strategy:</span>
                      <span className="text-sm font-medium text-gray-900 text-right">
                        {settlementReserveStrategy === 'savings' && 'Savings Account'}
                        {settlementReserveStrategy === 'treasury' && 'Treasury Bills'}
                        {settlementReserveStrategy === 'brokerage' && 'Taxable Brokerage'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-600">Auto-Reserve:</span>
                      <span className="text-sm font-medium text-gray-900">{autoReserve ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-600">Settlement Alerts:</span>
                      <span className="text-sm font-medium text-gray-900">{alertBeforeSettlement ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>

                {/* Example Scenario */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Example: $150k Income</h3>
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-2">Annual Tax Liability</div>
                        <div className="text-2xl font-bold text-gray-900">$35,000</div>
                        <div className="text-xs text-gray-500">Estimated based on $150k income</div>
                      </div>

                      {withholdingMethod === 'standard' && (
                        <>
                          <div className="border-t pt-3">
                            <div className="text-sm font-medium text-gray-900 mb-1">W-4 Withholding</div>
                            <div className="text-lg font-semibold text-green-600">$30,000</div>
                            <div className="text-xs text-gray-500">$2,500/month withheld from paycheck</div>
                          </div>
                          <div className="border-t pt-3">
                            <div className="text-sm font-medium text-gray-900 mb-1">April Settlement</div>
                            <div className="text-lg font-semibold text-orange-600">$5,000 due</div>
                            <div className="text-xs text-gray-500">Shortfall paid in April</div>
                          </div>
                        </>
                      )}

                      {withholdingMethod === 'quarterly' && (
                        <>
                          <div className="border-t pt-3">
                            <div className="text-sm font-medium text-gray-900 mb-1">Quarterly Payments</div>
                            <div className="text-lg font-semibold text-green-600">$8,750 × 4</div>
                            <div className="text-xs text-gray-500">Paid in Apr, Jun, Sep, Jan</div>
                          </div>
                          <div className="border-t pt-3">
                            <div className="text-sm font-medium text-gray-900 mb-1">April Settlement</div>
                            <div className="text-lg font-semibold text-green-600">$0 due</div>
                            <div className="text-xs text-gray-500">No surprise payment</div>
                          </div>
                        </>
                      )}

                      {withholdingMethod === 'increased' && (
                        <>
                          <div className="border-t pt-3">
                            <div className="text-sm font-medium text-gray-900 mb-1">Increased Withholding</div>
                            <div className="text-lg font-semibold text-green-600">$2,917/month</div>
                            <div className="text-xs text-gray-500">Covers full tax liability</div>
                          </div>
                          <div className="border-t pt-3">
                            <div className="text-sm font-medium text-gray-900 mb-1">April Settlement</div>
                            <div className="text-lg font-semibold text-green-600">$0 due</div>
                            <div className="text-xs text-gray-500">Fully covered by withholding</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Strategy Impact */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">What This Strategy Does</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 text-sm">
                      <div className="text-green-600 mt-0.5">✓</div>
                      <div className="flex-1 text-gray-700">
                        Creates TAX_SETTLEMENT events in your financial plan
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 text-sm">
                      <div className="text-green-600 mt-0.5">✓</div>
                      <div className="flex-1 text-gray-700">
                        Models cash flow impact of tax payments
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 text-sm">
                      <div className="text-green-600 mt-0.5">✓</div>
                      <div className="flex-1 text-gray-700">
                        {autoReserve ? 'Automatically reserves funds for tax settlement' : 'Tracks when tax payments are due'}
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 text-sm">
                      <div className="text-green-600 mt-0.5">✓</div>
                      <div className="flex-1 text-gray-700">
                        Helps you avoid underpayment penalties
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Strategy Configuration</h3>
              <p className="text-gray-600">
                Configuration options for {strategy.name} are not yet available.
                The strategy will run with default parameters.
              </p>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Strategy Description</h4>
                <p className="text-sm text-gray-600">{strategy.config.description}</p>
              </div>
            </div>
          </div>
        );
    }
  };

  // Determine modal size and layout configuration
  const useEdgeLayout = strategy.id === 'investment-optimization' || strategy.id === 'asset-allocation' || strategy.id === 'glide-path' || strategy.id === 'retirement-withdrawal' || strategy.id === 'social-security-optimization' || strategy.id === 'tax-withholding';
  const modalSize = useEdgeLayout ? '2xl' : 'lg';
  const bodyClassName = useEdgeLayout ? '!p-0' : 'px-6 py-6';

  // Custom footer for informational-only strategies
  const isInformationalOnly = strategy.id === 'social-security-optimization';

  const footer = isInformationalOnly ? (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-3">
        <span className="text-sm text-gray-600 italic">Informational only - no configuration needed</span>
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="primary"
          disabled
          className="bg-gray-300 cursor-not-allowed text-gray-500"
          title="Configuration coming soon"
        >
          Save Configuration (Coming Soon)
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          onClick={() => {
            const defaultConfig = getDefaultConfig(strategy.id);
            setConfig(defaultConfig);
            setErrors({});
          }}
          className="text-gray-600 hover:text-gray-800"
        >
          Reset to Defaults
        </Button>
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Configuration
        </Button>
      </div>
    </div>
  );

  if (useEdgeLayout) {
    return (
      <WideModal
        isOpen={isOpen}
        onClose={onClose}
        bodyClassName="!p-0"
        frameless
        tightEdges
        backdrop="opaque"
        contentClassName="bg-white rounded-2xl shadow-xl"
        footer={footer}
      >
        {renderConfigurationFields()}
      </WideModal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={modalSize}
      title={`Configure ${strategy.name}`}
      subtitle="Customize strategy parameters to match your financial goals and preferences"
      bodyClassName={bodyClassName}
      footer={footer}
    >
      {renderConfigurationFields()}
    </Modal>
  );
};

// Helper functions
function getDefaultConfig(strategyId: string): StrategyConfig {
  const defaults: Record<string, StrategyConfig> = {
    'emergency-fund': {
      monthsOfExpenses: 6,
      monthlyContribution: 500,
      accountType: 'high_yield_savings',
      autoReplenish: true
    },
    'retirement-optimization': {
      retirementAge: 65,
      contributionRate: 15,
      riskTolerance: 'moderate',
      maxOut401k: true
    },
    'tax-optimization': {
      annualRothConversion: 10000,
      taxLossHarvesting: 'automatic',
      backdoorRoth: false,
      megaBackdoorRoth: false
    },
    'investment-optimization': {
      monthlyInvestment: 3000,
      emergencyFundMonths: 6,
      monthlyExpenses: 4000,
      maxRetirement401k: 1833,
      maxRetirementIRA: 542,
      has401k: true,
      hasIRA: true,
      contributeTaxable: true
    },
    'college-planning': {
      monthlyContribution: 300,
      investmentStrategy: 'age-based',
      coverageTarget: 100
    },
    // New v1 strategies
    'retirement-withdrawal': {
      initialWithdrawalRate: 0.04,
      annualExpenses: 80000,
      withdrawalStrategy: 'dynamic_4_percent',
      inflationAdjustment: true,
      retirementAge: 65
    },
    'asset-allocation': {
      allocationStrategy: 'age_based_enhanced',
      riskTolerance: 'moderate',
      targetRetirementAge: 65,
      includeInternational: true,
      internationalPercentage: 0.30,
      includeAlternatives: false,
      alternativesPercentage: 0.10,
      rebalanceFrequency: 'quarterly',
      rebalanceThreshold: 0.05,
      customStockPercentage: 0.60,
      customBondPercentage: 0.40
    },
    'glide-path': {
      glidePathType: 'target_date',
      targetRetirementAge: 65,
      startingStockPercentage: 0.90,
      retirementStockPercentage: 0.50,
      postRetirementStockPercentage: 0.40,
      adjustmentFrequency: 'annually',
      minimumAdjustment: 0.05,
      includeLifeEventAdjustments: true,
      smoothingFactor: 'moderate',
      volatilityAdjustment: false,
      internationalAllocation: 0.30
    },
    'portfolio-rebalancing': {
      rebalancingMethod: 'hybrid',
      thresholdPercentage: 0.05,
      calendarFrequency: 'quarterly',
      taxOptimizedRebalancing: true,
      minimumTradeSize: 1000
    },
    'contribution-optimization': {
      annualIncome: 100000,
      targetSavingsRate: 0.15,
      employerMatch: 0.03,
      employerMatchLimit: 0.06,
      has401k: true,
      hasHSA: false,
      marginalTaxRate: 0.24
    },
    'tax-withholding': {
      withholdingMethod: 'standard',
      settlementReserveStrategy: 'savings',
      autoReserve: true,
      alertBeforeSettlement: true
    }
  };

  return defaults[strategyId] || {};
}

function validateConfig(strategyId: string, config: StrategyConfig): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  switch (strategyId) {
    case 'emergency-fund':
      if (!config.monthsOfExpenses || config.monthsOfExpenses < 1 || config.monthsOfExpenses > 12) {
        errors.monthsOfExpenses = 'Must be between 1 and 12 months';
      }
      if (!config.monthlyContribution || config.monthlyContribution < 0) {
        errors.monthlyContribution = 'Must be a positive amount';
      }
      break;

    case 'retirement-optimization':
      if (!config.retirementAge || config.retirementAge < 50 || config.retirementAge > 80) {
        errors.retirementAge = 'Must be between 50 and 80 years';
      }
      if (!config.contributionRate || config.contributionRate < 0 || config.contributionRate > 100) {
        errors.contributionRate = 'Must be between 0 and 100 percent';
      }
      break;

    case 'tax-optimization':
      if (config.annualRothConversion && config.annualRothConversion < 0) {
        errors.annualRothConversion = 'Must be a positive amount';
      }
      break;

    case 'investment-optimization':
      if (!config.monthlyInvestment || config.monthlyInvestment <= 0) {
        errors.monthlyInvestment = 'Must be greater than 0';
      }
      if (config.monthlyInvestment > 100000) {
        errors.monthlyInvestment = 'Amount seems unreasonably high';
      }
      if (!config.emergencyFundMonths || config.emergencyFundMonths < 3 || config.emergencyFundMonths > 12) {
        errors.emergencyFundMonths = 'Must be between 3 and 12 months';
      }
      if (!config.monthlyExpenses || config.monthlyExpenses <= 0) {
        errors.monthlyExpenses = 'Must be greater than 0';
      }
      if (!config.has401k && !config.hasIRA && !config.contributeTaxable) {
        errors.general = 'Must select at least one account type';
      }
      break;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
