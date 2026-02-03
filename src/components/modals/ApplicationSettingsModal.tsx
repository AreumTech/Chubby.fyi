import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useCommandBus } from '@/hooks/useCommandBus';
import { DateSettings, AppConfig, FilingStatus } from '@/types';
import { LabelWithHelp } from '@/components/HelpTooltip';
import { H2, H3, FormLabel, FormHelperText } from '@/components/ui/Typography';
import { YearlyDataTable } from '@/components/dashboard/YearlyDataTable';

interface ApplicationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApplicationSettingsModal: React.FC<ApplicationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { config } = useAppStore();
  const { dispatch } = useCommandBus();
  
  // Local state for form
  const [dateSettings, setDateSettings] = useState<DateSettings>({
    simulationStartYear: new Date().getFullYear(),
    simulationStartMonth: new Date().getMonth() + 1,
    simulationHorizonYears: 40,
    simulationEndYear: new Date().getFullYear() + 40,
  });

  // Age settings state
  const [ageSettings, setAgeSettings] = useState({
    currentAge: config.currentAge || 35,
    simulationEndAge: config.simulationEndAge || 50, // Match DEFAULT_APP_CONFIG
  });

  // Essential settings state
  const [essentialSettings, setEssentialSettings] = useState({
    // Risk tolerance (asset allocation)
    riskTolerance: 'moderate' as 'conservative' | 'moderate' | 'aggressive',
    stockAllocation: 60,
    bondAllocation: 30,
    internationalAllocation: 10,
    
    // Inflation assumptions
    generalInflation: 2.6,
    healthcareInflation: 4.6, // general + 2% premium
    educationInflation: 3.6,  // general + 1% premium
    
    // Tax settings
    filingStatus: FilingStatus.SINGLE,
    stateTaxRate: 0,
    marginalFederalRate: 22,
    
    // FIRE parameters
    safeWithdrawalRate: 4.0,
    safetyMarginYears: 5,
    targetSuccessRate: 90,
  });

  // Retirement Features state
  const [retirementSettings, setRetirementSettings] = useState({
    withdrawalSequence: 'tax_efficient' as 'tax_efficient' | 'tax_deferred_first' | 'cash_first' | 'proportional',
    enableAutomaticRMDs: true,
    enableRothConversions: false,
    rothConversionMaxRate: 24, // Max marginal tax rate for conversions
    socialSecurityClaimingAge: 67,
    enableAssetLocation: false,
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Debug section state
  const [showYearlyDataTable, setShowYearlyDataTable] = useState(false);

  // Initialize form with current settings
  useEffect(() => {
    if (config.dateSettings) {
      setDateSettings(config.dateSettings);
    }

    // Initialize age settings from config
    setAgeSettings({
      currentAge: config.currentAge || 35,
      simulationEndAge: config.simulationEndAge || 50, // Match DEFAULT_APP_CONFIG
    });

    // Initialize essential settings from config
    setEssentialSettings(prev => ({
      ...prev,
      // Extract from stochastic config
      generalInflation: (config.stochasticConfig?.meanInflation || 0.026) * 100,
      healthcareInflation: ((config.stochasticConfig?.meanInflation || 0.026) + (config.stochasticConfig?.healthcareInflationPremium || 0.02)) * 100,
      educationInflation: ((config.stochasticConfig?.meanInflation || 0.026) + 0.01) * 100, // 1% premium for education

      // Extract tax settings
      filingStatus: config.filingStatus || FilingStatus.SINGLE,

      // FIRE parameters from monte carlo settings
      targetSuccessRate: (config.advancedSimulationSettings?.monteCarloSettings?.confidenceLevel || 0.95) * 100,
      safeWithdrawalRate: 4.0, // Default, could be extracted from config if available
      safetyMarginYears: 5, // Default

      // Risk tolerance from asset allocation (approximate from returns)
      stockAllocation: 60, // Default, could be calculated from asset config
      bondAllocation: 30,
      internationalAllocation: 10,
    }));

    // Initialize retirement settings from strategy settings
    const strategySettings = config.advancedSimulationSettings?.strategySettings;
    if (strategySettings) {
      setRetirementSettings(prev => ({
        ...prev,
        withdrawalSequence: (strategySettings.retirementWithdrawal?.withdrawalSequence || 'tax_efficient') as any,
        enableAutomaticRMDs: strategySettings.retirementWithdrawal?.enableAutomaticRMDs ?? true,
        enableRothConversions: strategySettings.retirementWithdrawal?.enableRothConversions ?? false,
        rothConversionMaxRate: strategySettings.retirementWithdrawal?.rothConversionMaxTaxRate || 24,
        socialSecurityClaimingAge: strategySettings.socialSecurity?.plannedClaimingAge || 67,
        enableAssetLocation: strategySettings.assetLocation?.enabled ?? false,
      }));
    }
  }, [config]);

  const handleDateSettingsChange = (field: keyof DateSettings, value: number) => {
    setDateSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAgeSettingsChange = (field: keyof typeof ageSettings, value: number) => {
    setAgeSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleRetirementSettingsChange = (field: keyof typeof retirementSettings, value: any) => {
    setRetirementSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleEssentialSettingsChange = (field: string, value: any) => {
    setEssentialSettings(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-update healthcare inflation when general inflation changes
      if (field === 'generalInflation') {
        updated.healthcareInflation = value + 2.0; // 2% premium
        updated.educationInflation = value + 1.0;  // 1% premium
      }
      
      // Auto-update allocations for risk tolerance
      if (field === 'riskTolerance') {
        if (value === 'conservative') {
          updated.stockAllocation = 30;
          updated.bondAllocation = 60;
          updated.internationalAllocation = 10;
        } else if (value === 'moderate') {
          updated.stockAllocation = 60;
          updated.bondAllocation = 30;
          updated.internationalAllocation = 10;
        } else if (value === 'aggressive') {
          updated.stockAllocation = 80;
          updated.bondAllocation = 10;
          updated.internationalAllocation = 10;
        }
      }
      
      return updated;
    });
  };

  // Validation helper
  const validateEssentialSettings = () => {
    const errors: string[] = [];
    
    // Validate asset allocations sum to 100%
    const totalAllocation = essentialSettings.stockAllocation + essentialSettings.bondAllocation + essentialSettings.internationalAllocation;
    if (Math.abs(totalAllocation - 100) > 0.1) {
      errors.push('Asset allocations must sum to 100%');
    }
    
    // Validate inflation rates are reasonable
    if (essentialSettings.generalInflation < 0 || essentialSettings.generalInflation > 10) {
      errors.push('General inflation must be between 0% and 10%');
    }
    
    if (essentialSettings.healthcareInflation < essentialSettings.generalInflation) {
      errors.push('Healthcare inflation should not be less than general inflation');
    }
    
    // Validate withdrawal rate
    if (essentialSettings.safeWithdrawalRate < 2 || essentialSettings.safeWithdrawalRate > 6) {
      errors.push('Safe withdrawal rate should be between 2% and 6%');
    }
    
    // Validate success rate
    if (essentialSettings.targetSuccessRate < 70 || essentialSettings.targetSuccessRate > 99) {
      errors.push('Target success rate should be between 70% and 99%');
    }
    
    return errors;
  };

  const handleSave = () => {
    // Validate settings before saving
    const errors = validateEssentialSettings();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear validation errors if all valid
    setValidationErrors([]);

    // Dispatch command to update config - using functional update to ensure proper typing
    dispatch({
      type: 'UPDATE_CONFIG',
      payload: {
        config: (prevConfig: AppConfig) => ({
          ...prevConfig,
          dateSettings: dateSettings,
          // Also update legacy fields for backwards compatibility
          simulationStartYear: dateSettings.simulationStartYear,
          currentMonth: dateSettings.simulationStartMonth,

          // CRITICAL: Update age settings for simulation duration calculation
          currentAge: ageSettings.currentAge,
          simulationEndAge: ageSettings.simulationEndAge,

          // Apply essential settings to config
          filingStatus: essentialSettings.filingStatus,
          inflationRate: essentialSettings.generalInflation / 100,
          
          // Update stochastic config with inflation settings
          stochasticConfig: {
            ...prevConfig.stochasticConfig,
            meanInflation: essentialSettings.generalInflation / 100,
            healthcareInflationPremium: (essentialSettings.healthcareInflation - essentialSettings.generalInflation) / 100,
            // Update asset returns in stochastic config too
            meanSpyReturn: essentialSettings.riskTolerance === 'conservative' ? 0.08 : 
                          essentialSettings.riskTolerance === 'aggressive' ? 0.12 : 0.098,
            meanBondReturn: essentialSettings.riskTolerance === 'conservative' ? 0.05 : 
                           essentialSettings.riskTolerance === 'aggressive' ? 0.035 : 0.042,
            meanIntlStockReturn: essentialSettings.riskTolerance === 'conservative' ? 0.075 : 
                                essentialSettings.riskTolerance === 'aggressive' ? 0.11 : 0.08,
          },
          
          // Update asset config with risk tolerance
          assetConfig: {
            ...prevConfig.assetConfig,
            stocks: {
              ...prevConfig.assetConfig?.stocks,
              meanReturn: essentialSettings.riskTolerance === 'conservative' ? 0.08 : 
                         essentialSettings.riskTolerance === 'aggressive' ? 0.12 : 0.098,
            },
            bonds: {
              ...prevConfig.assetConfig?.bonds,
              meanReturn: essentialSettings.riskTolerance === 'conservative' ? 0.05 : 
                         essentialSettings.riskTolerance === 'aggressive' ? 0.035 : 0.042,
            },
            international_stocks: {
              ...prevConfig.assetConfig?.international_stocks,
              meanReturn: essentialSettings.riskTolerance === 'conservative' ? 0.075 : 
                         essentialSettings.riskTolerance === 'aggressive' ? 0.11 : 0.08,
            },
          },
          
          // Update advanced simulation settings
          advancedSimulationSettings: {
            ...prevConfig.advancedSimulationSettings,
            monteCarloSettings: {
              ...prevConfig.advancedSimulationSettings?.monteCarloSettings,
              confidenceLevel: essentialSettings.targetSuccessRate / 100,
            },
            strategySettings: {
              ...prevConfig.advancedSimulationSettings?.strategySettings,
              retirementWithdrawal: {
                ...prevConfig.advancedSimulationSettings?.strategySettings?.retirementWithdrawal,
                withdrawalSequence: retirementSettings.withdrawalSequence,
                enableAutomaticRMDs: retirementSettings.enableAutomaticRMDs,
                enableRothConversions: retirementSettings.enableRothConversions,
                rothConversionMaxTaxRate: retirementSettings.rothConversionMaxRate,
              },
              socialSecurity: {
                ...prevConfig.advancedSimulationSettings?.strategySettings?.socialSecurity,
                plannedClaimingAge: retirementSettings.socialSecurityClaimingAge,
              },
              assetLocation: {
                ...prevConfig.advancedSimulationSettings?.strategySettings?.assetLocation,
                enabled: retirementSettings.enableAssetLocation,
              },
            },
          },
        }),
        runSimulation: true
      }
    });
    onClose();
  };

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Application Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Date Settings Section */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Simulation Timeline
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure the default start date and forecast horizon for your financial simulation.
                These settings will be used as defaults for new events.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Month
                  </label>
                  <select
                    value={dateSettings.simulationStartMonth}
                    onChange={(e) => handleDateSettingsChange('simulationStartMonth', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2024, i).toLocaleDateString("en-US", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Year
                  </label>
                  <input
                    type="number"
                    value={dateSettings.simulationStartYear}
                    onChange={(e) => handleDateSettingsChange('simulationStartYear', parseInt(e.target.value) || currentYear)}
                    min={currentYear - 5}
                    max={currentYear + 10}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Age
                  </label>
                  <input
                    type="number"
                    value={ageSettings.currentAge}
                    onChange={(e) => handleAgeSettingsChange('currentAge', parseInt(e.target.value) || 35)}
                    min={18}
                    max={100}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your age at simulation start
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Simulation End Age
                  </label>
                  <input
                    type="number"
                    value={ageSettings.simulationEndAge}
                    onChange={(e) => handleAgeSettingsChange('simulationEndAge', parseInt(e.target.value) || 50)}
                    min={ageSettings.currentAge + 1}
                    max={120}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Age to simulate until
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Simulation Duration
                  </label>
                  <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600">
                    {ageSettings.simulationEndAge - ageSettings.currentAge} years ({(ageSettings.simulationEndAge - ageSettings.currentAge) * 12} months)
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated from age range
                  </p>
                </div>
              </div>
            </div>

            {/* Essential FIRE Planning Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Risk Tolerance & Asset Allocation
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure your investment risk tolerance and target asset allocation for simulation.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <LabelWithHelp 
                    helpConcept="assetAllocation"
                    htmlFor="riskTolerance"
                  >
                    Risk Tolerance
                  </LabelWithHelp>
                  <select
                    value={essentialSettings.riskTolerance}
                    onChange={(e) => handleEssentialSettingsChange('riskTolerance', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="conservative">Conservative (30/60/10)</option>
                    <option value="moderate">Moderate (60/30/10)</option>
                    <option value="aggressive">Aggressive (80/10/10)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Stocks/Bonds/International allocation
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700 w-24">Stocks</label>
                    <input
                      type="number"
                      value={essentialSettings.stockAllocation}
                      onChange={(e) => handleEssentialSettingsChange('stockAllocation', parseInt(e.target.value))}
                      min="0"
                      max="100"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700 w-24">Bonds</label>
                    <input
                      type="number"
                      value={essentialSettings.bondAllocation}
                      onChange={(e) => handleEssentialSettingsChange('bondAllocation', parseInt(e.target.value))}
                      min="0"
                      max="100"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700 w-24">International</label>
                    <input
                      type="number"
                      value={essentialSettings.internationalAllocation}
                      onChange={(e) => handleEssentialSettingsChange('internationalAllocation', parseInt(e.target.value))}
                      min="0"
                      max="100"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    Total: {essentialSettings.stockAllocation + essentialSettings.bondAllocation + essentialSettings.internationalAllocation}%
                    {Math.abs((essentialSettings.stockAllocation + essentialSettings.bondAllocation + essentialSettings.internationalAllocation) - 100) > 0.1 && (
                      <span className="text-red-600 ml-2">(Should equal 100%)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Inflation Assumptions */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Inflation Assumptions
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Set inflation rates for different expense categories. Healthcare and education typically inflate faster than general expenses.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <LabelWithHelp 
                    helpConcept="inflation"
                    htmlFor="generalInflation"
                  >
                    General Inflation
                  </LabelWithHelp>
                  <div className="relative">
                    <input
                      type="number"
                      value={essentialSettings.generalInflation}
                      onChange={(e) => handleEssentialSettingsChange('generalInflation', parseFloat(e.target.value))}
                      min="0"
                      max="10"
                      step="0.1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Base inflation for most expenses
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Healthcare Inflation
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={essentialSettings.healthcareInflation}
                      onChange={(e) => handleEssentialSettingsChange('healthcareInflation', parseFloat(e.target.value))}
                      min="0"
                      max="15"
                      step="0.1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Medical expenses and insurance
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Education Inflation
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={essentialSettings.educationInflation}
                      onChange={(e) => handleEssentialSettingsChange('educationInflation', parseFloat(e.target.value))}
                      min="0"
                      max="10"
                      step="0.1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tuition and education costs
                  </p>
                </div>
              </div>
            </div>

            {/* Tax Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Tax Settings
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure your tax situation for accurate withdrawal and income planning.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filing Status
                  </label>
                  <select
                    value={essentialSettings.filingStatus}
                    onChange={(e) => handleEssentialSettingsChange('filingStatus', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={FilingStatus.SINGLE}>Single</option>
                    <option value={FilingStatus.MARRIED_FILING_JOINTLY}>Married Filing Jointly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State Tax Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={essentialSettings.stateTaxRate}
                      onChange={(e) => handleEssentialSettingsChange('stateTaxRate', parseFloat(e.target.value))}
                      min="0"
                      max="15"
                      step="0.1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Your state income tax rate
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marginal Federal Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={essentialSettings.marginalFederalRate}
                      onChange={(e) => handleEssentialSettingsChange('marginalFederalRate', parseInt(e.target.value))}
                      min="10"
                      max="37"
                      step="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Current federal tax bracket
                  </p>
                </div>
              </div>
            </div>

            {/* FIRE Parameters */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                FIRE Planning Parameters
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Set your FIRE strategy parameters including safe withdrawal rates and success criteria.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <LabelWithHelp 
                    helpConcept="safeWithdrawalRate"
                    htmlFor="safeWithdrawalRate"
                  >
                    Safe Withdrawal Rate
                  </LabelWithHelp>
                  <div className="relative">
                    <input
                      type="number"
                      value={essentialSettings.safeWithdrawalRate}
                      onChange={(e) => handleEssentialSettingsChange('safeWithdrawalRate', parseFloat(e.target.value))}
                      min="2"
                      max="6"
                      step="0.1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Initial withdrawal rate (4% rule)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Safety Margin
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={essentialSettings.safetyMarginYears}
                      onChange={(e) => handleEssentialSettingsChange('safetyMarginYears', parseInt(e.target.value))}
                      min="0"
                      max="10"
                      step="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">years</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Extra years of expenses
                  </p>
                </div>

                <div>
                  <LabelWithHelp 
                    helpConcept="monteCarlo"
                    htmlFor="targetSuccessRate"
                  >
                    Target Success Rate
                  </LabelWithHelp>
                  <div className="relative">
                    <input
                      type="number"
                      value={essentialSettings.targetSuccessRate}
                      onChange={(e) => handleEssentialSettingsChange('targetSuccessRate', parseInt(e.target.value))}
                      min="70"
                      max="99"
                      step="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Monte Carlo success rate goal
                  </p>
                </div>
              </div>
            </div>

            {/* Retirement Features Section */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                🏖️ Retirement Features
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure advanced retirement planning features powered by the 12 integrated financial calculators.
              </p>

              <div className="space-y-4">
                {/* Withdrawal Sequencing */}
                <div>
                  <label htmlFor="withdrawal-sequence" className="block text-sm font-medium text-gray-700 mb-1">
                    Withdrawal Sequence Strategy
                  </label>
                  <select
                    id="withdrawal-sequence"
                    value={retirementSettings.withdrawalSequence}
                    onChange={(e) => handleRetirementSettingsChange('withdrawalSequence', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tax_efficient">Tax Efficient (Recommended)</option>
                    <option value="cash_first">Cash First (Simple)</option>
                    <option value="tax_deferred_first">Tax-Deferred First (IRA-first)</option>
                    <option value="proportional">Proportional (Maintain allocation)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {retirementSettings.withdrawalSequence === 'tax_efficient' && 'Optimizes withdrawal order to minimize taxes: taxable gains → tax-deferred → Roth'}
                    {retirementSettings.withdrawalSequence === 'cash_first' && 'Simple strategy: cash → taxable → tax-deferred → Roth'}
                    {retirementSettings.withdrawalSequence === 'tax_deferred_first' && 'Prioritizes tax-deferred accounts to maximize Roth tax-free growth'}
                    {retirementSettings.withdrawalSequence === 'proportional' && 'Withdraws proportionally to maintain target asset allocation'}
                  </p>
                </div>

                {/* RMD Automation */}
                <div>
                  <label htmlFor="enable-rmds" className="flex items-center gap-3">
                    <input
                      id="enable-rmds"
                      type="checkbox"
                      checked={retirementSettings.enableAutomaticRMDs}
                      onChange={(e) => handleRetirementSettingsChange('enableAutomaticRMDs', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Automatic Required Minimum Distributions (RMDs)
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically calculate and withdraw RMDs at age 73 (SECURE 2.0 Act compliant)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Roth Conversions */}
                <div>
                  <label htmlFor="enable-roth-conversions" className="flex items-center gap-3 mb-2">
                    <input
                      id="enable-roth-conversions"
                      type="checkbox"
                      checked={retirementSettings.enableRothConversions}
                      onChange={(e) => handleRetirementSettingsChange('enableRothConversions', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Enable Roth Conversion Optimization
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically optimize Roth conversions to fill lower tax brackets
                      </p>
                    </div>
                  </label>

                  {retirementSettings.enableRothConversions && (
                    <div className="ml-7 mt-2">
                      <label htmlFor="roth-max-tax-rate" className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Tax Rate for Conversions
                      </label>
                      <div className="relative">
                        <input
                          id="roth-max-tax-rate"
                          type="number"
                          value={retirementSettings.rothConversionMaxRate}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            // Validate range: 10-37%
                            if (!isNaN(value) && value >= 10 && value <= 37) {
                              handleRetirementSettingsChange('rothConversionMaxRate', value);
                            }
                          }}
                          min="10"
                          max="37"
                          step="1"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Only convert when marginal rate stays below this threshold (Common: 12%, 22%, 24%)
                      </p>
                    </div>
                  )}
                </div>

                {/* Social Security */}
                <div>
                  <label htmlFor="ss-claiming-age" className="block text-sm font-medium text-gray-700 mb-1">
                    Social Security Claiming Age
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      id="ss-claiming-age"
                      type="range"
                      value={retirementSettings.socialSecurityClaimingAge}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        // Validate range: 62-70
                        if (!isNaN(value) && value >= 62 && value <= 70) {
                          handleRetirementSettingsChange('socialSecurityClaimingAge', value);
                        }
                      }}
                      min="62"
                      max="70"
                      step="1"
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      Age {retirementSettings.socialSecurityClaimingAge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {retirementSettings.socialSecurityClaimingAge === 62 && '70% of full benefit (earliest possible)'}
                    {retirementSettings.socialSecurityClaimingAge === 67 && '100% of full benefit (Full Retirement Age for most)'}
                    {retirementSettings.socialSecurityClaimingAge === 70 && '124% of full benefit (maximum benefit)'}
                    {retirementSettings.socialSecurityClaimingAge > 62 && retirementSettings.socialSecurityClaimingAge < 67 &&
                      `~${Math.round(70 + ((retirementSettings.socialSecurityClaimingAge - 62) / 5) * 30)}% of full benefit`}
                    {retirementSettings.socialSecurityClaimingAge > 67 && retirementSettings.socialSecurityClaimingAge < 70 &&
                      `~${Math.round(100 + ((retirementSettings.socialSecurityClaimingAge - 67) / 3) * 24)}% of full benefit (delayed credits)`}
                  </p>
                </div>

                {/* Asset Location */}
                <div>
                  <label htmlFor="enable-asset-location" className="flex items-center gap-3">
                    <input
                      id="enable-asset-location"
                      type="checkbox"
                      checked={retirementSettings.enableAssetLocation}
                      onChange={(e) => handleRetirementSettingsChange('enableAssetLocation', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Tax-Efficient Asset Location
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically place tax-efficient assets (stocks) in taxable accounts and tax-inefficient assets (bonds/REITs) in tax-deferred accounts
                      </p>
                    </div>
                  </label>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Powered by Integrated Calculators</p>
                      <p className="text-xs text-blue-700 mt-1">
                        These features use the 12 fully-integrated financial calculators: RMD Calculator, Withdrawal Sequencer,
                        Roth Conversion Optimizer, Social Security Calculator, Asset Location Optimizer, and more.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Future Settings Sections */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Display Preferences
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  Theme and currency preferences will be available in a future update.
                </p>
              </div>
            </div>

            {/* Debug Section */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                🔧 Debug Tools
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Development and testing tools. Use with caution as these actions cannot be undone.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.stochasticConfig?.debugDisableRandomness || false}
                      onChange={(e) => {
                        dispatch({
                          type: 'UPDATE_CONFIG',
                          payload: {
                            config: (prevConfig: AppConfig) => ({
                              ...prevConfig,
                              stochasticConfig: {
                                ...prevConfig.stochasticConfig,
                                debugDisableRandomness: e.target.checked,
                              },
                            }),
                            runSimulation: true
                          }
                        });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Disable Market Randomness
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Forces simulation to use mean returns only (no volatility). All paths will be identical. For debugging purposes only.
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <button
                    onClick={() => {
                      if (confirm('This will clear all local storage and reload the page. You will lose all your data. Are you sure?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    🗑️ Clear All Local Storage
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Clears all saved data including scenarios, settings, and onboarding state. Forces a fresh start.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <button
                    onClick={() => setShowYearlyDataTable(!showYearlyDataTable)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    {showYearlyDataTable ? '🔽 Hide' : '🔼 Show'} Yearly Data Table
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    View complete yearly breakdown of all simulation data. For debugging and verification purposes.
                  </p>

                  {showYearlyDataTable && (
                    <div className="mt-4 border border-gray-300 rounded-lg p-4 bg-white max-h-96 overflow-auto">
                      <YearlyDataTable onYearSelect={() => {}} maxYears={50} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <div className="text-red-400 text-lg mr-3">⚠️</div>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Please fix the following issues:</h4>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};