import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useCommandBus } from '@/hooks/useCommandBus';
import { AppConfig, FilingStatus } from '@/types';

interface UnifiedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'general' | 'simulation';

export const UnifiedSettingsModal: React.FC<UnifiedSettingsModalProps> = ({ isOpen, onClose }) => {
  const { config } = useAppStore();
  const { dispatch } = useCommandBus();

  // Active tab
  const [activeTab, setActiveTab] = useState<TabId>('general');

  // Form state
  const [settings, setSettings] = useState({
    // Timeline
    startMonth: new Date().getMonth() + 1,
    startYear: new Date().getFullYear(),
    currentAge: 35,
    endAge: 95,

    // Risk & Returns
    riskTolerance: 'moderate' as 'conservative' | 'moderate' | 'aggressive',
    stockAllocation: 60,
    bondAllocation: 30,
    intlAllocation: 10,
    spyReturn: 9.8,
    bondReturn: 4.2,

    // Inflation
    generalInflation: 2.6,
    healthcareInflation: 4.6,

    // Taxes
    filingStatus: FilingStatus.SINGLE,
    stateTaxRate: 0,

    // FIRE
    withdrawalRate: 4.0,
    targetSuccessRate: 95,

    // Retirement
    withdrawalSequence: 'tax_efficient' as string,
    enableRMDs: true,
    enableRothConversions: false,
    rothMaxRate: 24,
    ssClaimingAge: 67,

    // Advanced Monte Carlo
    numSimulations: 100,
    fatTailParameter: 5,
    enableStressTests: false,

    // Debug
    disableRandomness: false,
  });

  // Initialize from config
  useEffect(() => {
    if (!config) return;

    setSettings(prev => ({
      ...prev,
      startMonth: config.dateSettings?.simulationStartMonth || new Date().getMonth() + 1,
      startYear: config.dateSettings?.simulationStartYear || new Date().getFullYear(),
      currentAge: config.currentAge || 35,
      endAge: config.simulationEndAge || 95,

      generalInflation: (config.stochasticConfig?.meanInflation || 0.026) * 100,
      healthcareInflation: ((config.stochasticConfig?.meanInflation || 0.026) + (config.stochasticConfig?.healthcareInflationPremium || 0.02)) * 100,
      spyReturn: (config.stochasticConfig?.meanSpyReturn || 0.098) * 100,
      bondReturn: (config.stochasticConfig?.meanBondReturn || 0.042) * 100,

      filingStatus: config.filingStatus || FilingStatus.SINGLE,
      targetSuccessRate: (config.advancedSimulationSettings?.monteCarloSettings?.confidenceLevel || 0.95) * 100,

      numSimulations: (config.advancedSimulationSettings?.monteCarloSettings as any)?.numSimulations || 100,
      fatTailParameter: config.stochasticConfig?.fatTailParameter || 5,
      enableStressTests: (config.advancedSimulationSettings as any)?.stressTesting?.enableStressTests || false,
      disableRandomness: config.stochasticConfig?.debugDisableRandomness || false,

      withdrawalSequence: config.advancedSimulationSettings?.strategySettings?.retirementWithdrawal?.withdrawalSequence || 'tax_efficient',
      enableRMDs: config.advancedSimulationSettings?.strategySettings?.retirementWithdrawal?.enableAutomaticRMDs ?? true,
      enableRothConversions: config.advancedSimulationSettings?.strategySettings?.retirementWithdrawal?.enableRothConversions ?? false,
      rothMaxRate: config.advancedSimulationSettings?.strategySettings?.retirementWithdrawal?.rothConversionMaxTaxRate || 24,
      ssClaimingAge: config.advancedSimulationSettings?.strategySettings?.socialSecurity?.plannedClaimingAge || 67,
    }));
  }, [config]);

  const updateSetting = (key: keyof typeof settings, value: any) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };

      // Auto-update allocations for risk tolerance
      if (key === 'riskTolerance') {
        if (value === 'conservative') {
          updated.stockAllocation = 30;
          updated.bondAllocation = 60;
          updated.intlAllocation = 10;
          updated.spyReturn = 8.0;
          updated.bondReturn = 5.0;
        } else if (value === 'moderate') {
          updated.stockAllocation = 60;
          updated.bondAllocation = 30;
          updated.intlAllocation = 10;
          updated.spyReturn = 9.8;
          updated.bondReturn = 4.2;
        } else if (value === 'aggressive') {
          updated.stockAllocation = 80;
          updated.bondAllocation = 10;
          updated.intlAllocation = 10;
          updated.spyReturn = 12.0;
          updated.bondReturn = 3.5;
        }
      }

      // Auto-update healthcare inflation
      if (key === 'generalInflation') {
        updated.healthcareInflation = value + 2.0;
      }

      return updated;
    });
  };

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_CONFIG',
      payload: {
        config: (prevConfig: AppConfig) => ({
          ...prevConfig,
          dateSettings: {
            simulationStartYear: settings.startYear,
            simulationStartMonth: settings.startMonth,
            simulationHorizonYears: settings.endAge - settings.currentAge,
            simulationEndYear: settings.startYear + (settings.endAge - settings.currentAge),
          },
          currentAge: settings.currentAge,
          simulationEndAge: settings.endAge,
          filingStatus: settings.filingStatus,
          inflationRate: settings.generalInflation / 100,

          stochasticConfig: {
            ...prevConfig.stochasticConfig,
            meanInflation: settings.generalInflation / 100,
            healthcareInflationPremium: (settings.healthcareInflation - settings.generalInflation) / 100,
            meanSpyReturn: settings.spyReturn / 100,
            meanBondReturn: settings.bondReturn / 100,
            fatTailParameter: settings.fatTailParameter,
            debugDisableRandomness: settings.disableRandomness,
          },

          advancedSimulationSettings: {
            ...prevConfig.advancedSimulationSettings,
            monteCarloSettings: {
              ...prevConfig.advancedSimulationSettings?.monteCarloSettings,
              numSimulations: settings.numSimulations,
              confidenceLevel: settings.targetSuccessRate / 100,
            },
            stressTesting: {
              ...(prevConfig.advancedSimulationSettings as any)?.stressTesting,
              enableStressTests: settings.enableStressTests,
            },
            strategySettings: {
              ...prevConfig.advancedSimulationSettings?.strategySettings,
              retirementWithdrawal: {
                ...prevConfig.advancedSimulationSettings?.strategySettings?.retirementWithdrawal,
                withdrawalSequence: settings.withdrawalSequence,
                enableAutomaticRMDs: settings.enableRMDs,
                enableRothConversions: settings.enableRothConversions,
                rothConversionMaxTaxRate: settings.rothMaxRate,
              },
              socialSecurity: {
                ...prevConfig.advancedSimulationSettings?.strategySettings?.socialSecurity,
                plannedClaimingAge: settings.ssClaimingAge,
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

  const InputRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm-areum text-areum-text-secondary w-28 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );

  const inputClass = "w-full px-2 py-1 text-sm-areum border border-areum-border rounded-sm-areum focus:outline-none focus:border-areum-accent bg-areum-surface";
  const selectClass = "w-full px-2 py-1 text-sm-areum border border-areum-border rounded-sm-areum focus:outline-none focus:border-areum-accent bg-areum-surface";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative w-full max-w-lg bg-areum-surface border border-areum-border rounded-md-areum shadow-lg max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header with Tabs */}
          <div className="border-b border-areum-border">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-md-areum font-semibold text-areum-text-primary">Settings</span>
              <button
                onClick={onClose}
                className="p-1 text-areum-text-tertiary hover:text-areum-text-primary rounded-sm-areum hover:bg-areum-canvas"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Tabs */}
            <div className="flex px-4 gap-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-3 py-1.5 text-sm-areum font-medium rounded-t-sm-areum border-b-2 transition-colors ${
                  activeTab === 'general'
                    ? 'text-areum-accent border-areum-accent bg-areum-accent/5'
                    : 'text-areum-text-secondary border-transparent hover:text-areum-text-primary hover:bg-areum-canvas'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('simulation')}
                className={`px-3 py-1.5 text-sm-areum font-medium rounded-t-sm-areum border-b-2 transition-colors ${
                  activeTab === 'simulation'
                    ? 'text-areum-accent border-areum-accent bg-areum-accent/5'
                    : 'text-areum-text-secondary border-transparent hover:text-areum-text-primary hover:bg-areum-canvas'
                }`}
              >
                Simulation
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* Timeline */}
                <div>
                  <div className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-tertiary mb-2">Timeline</div>
                  <div className="space-y-1">
                    <InputRow label="Start Date">
                      <div className="flex gap-2">
                        <select
                          value={settings.startMonth}
                          onChange={(e) => updateSetting('startMonth', parseInt(e.target.value))}
                          className={selectClass}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2024, i).toLocaleDateString("en-US", { month: "short" })}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={settings.startYear}
                          onChange={(e) => updateSetting('startYear', parseInt(e.target.value))}
                          className={inputClass + " w-24"}
                        />
                      </div>
                    </InputRow>
                    <div className="flex gap-4">
                      <InputRow label="Current Age">
                        <input
                          type="number"
                          value={settings.currentAge}
                          onChange={(e) => updateSetting('currentAge', parseInt(e.target.value))}
                          min={18}
                          max={100}
                          className={inputClass + " w-20"}
                        />
                      </InputRow>
                      <InputRow label="End Age">
                        <input
                          type="number"
                          value={settings.endAge}
                          onChange={(e) => updateSetting('endAge', parseInt(e.target.value))}
                          min={settings.currentAge + 1}
                          max={120}
                          className={inputClass + " w-20"}
                        />
                      </InputRow>
                    </div>
                    <div className="text-xs-areum text-areum-text-tertiary ml-28">
                      {settings.endAge - settings.currentAge} year simulation
                    </div>
                  </div>
                </div>

                {/* Taxes */}
                <div>
                  <div className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-tertiary mb-2">Taxes</div>
                  <div className="space-y-1">
                    <InputRow label="Filing Status">
                      <select
                        value={settings.filingStatus}
                        onChange={(e) => updateSetting('filingStatus', e.target.value)}
                        className={selectClass}
                      >
                        <option value={FilingStatus.SINGLE}>Single</option>
                        <option value={FilingStatus.MARRIED_FILING_JOINTLY}>Married Filing Jointly</option>
                      </select>
                    </InputRow>
                    <InputRow label="State Tax">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.stateTaxRate}
                          onChange={(e) => updateSetting('stateTaxRate', parseFloat(e.target.value))}
                          step="0.1"
                          className={inputClass + " w-20"}
                        />
                        <span className="text-xs-areum text-areum-text-tertiary">%</span>
                      </div>
                    </InputRow>
                  </div>
                </div>

                {/* Retirement Strategy */}
                <div>
                  <div className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-tertiary mb-2">Retirement</div>
                  <div className="space-y-1">
                    <InputRow label="Withdrawal">
                      <select
                        value={settings.withdrawalSequence}
                        onChange={(e) => updateSetting('withdrawalSequence', e.target.value)}
                        className={selectClass}
                      >
                        <option value="tax_efficient">Tax Efficient</option>
                        <option value="cash_first">Cash First</option>
                        <option value="tax_deferred_first">Tax-Deferred First</option>
                        <option value="proportional">Proportional</option>
                      </select>
                    </InputRow>
                    <InputRow label="SS Claiming">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          value={settings.ssClaimingAge}
                          onChange={(e) => updateSetting('ssClaimingAge', parseInt(e.target.value))}
                          min={62}
                          max={70}
                          className="flex-1"
                        />
                        <span className="text-sm-areum font-medium text-areum-text-primary w-12">Age {settings.ssClaimingAge}</span>
                      </div>
                    </InputRow>
                    <div className="space-y-1 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer ml-28">
                        <input
                          type="checkbox"
                          checked={settings.enableRMDs}
                          onChange={(e) => updateSetting('enableRMDs', e.target.checked)}
                          className="w-3.5 h-3.5 text-areum-accent border-areum-border rounded"
                        />
                        <span className="text-sm-areum text-areum-text-primary">Automatic RMDs</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer ml-28">
                        <input
                          type="checkbox"
                          checked={settings.enableRothConversions}
                          onChange={(e) => updateSetting('enableRothConversions', e.target.checked)}
                          className="w-3.5 h-3.5 text-areum-accent border-areum-border rounded"
                        />
                        <span className="text-sm-areum text-areum-text-primary">Roth Conversions</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Debug */}
                <div className="pt-2 border-t border-areum-border">
                  <div className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-tertiary mb-2">Debug</div>
                  <button
                    onClick={() => {
                      if (confirm('Clear all data and reload?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-2 py-1 text-xs-areum font-medium text-areum-danger bg-areum-danger-bg border border-areum-danger/30 rounded-sm-areum hover:bg-areum-danger/20"
                  >
                    Clear Local Storage
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'simulation' && (
              <div className="space-y-4">
                {/* Risk & Returns */}
                <div>
                  <div className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-tertiary mb-2">Risk & Returns</div>
                  <div className="space-y-1">
                    <InputRow label="Risk Tolerance">
                      <select
                        value={settings.riskTolerance}
                        onChange={(e) => updateSetting('riskTolerance', e.target.value)}
                        className={selectClass}
                      >
                        <option value="conservative">Conservative (30/60/10)</option>
                        <option value="moderate">Moderate (60/30/10)</option>
                        <option value="aggressive">Aggressive (80/10/10)</option>
                      </select>
                    </InputRow>
                    <div className="flex gap-4">
                      <InputRow label="Stock Return">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={settings.spyReturn}
                            onChange={(e) => updateSetting('spyReturn', parseFloat(e.target.value))}
                            step="0.1"
                            className={inputClass + " w-16"}
                          />
                          <span className="text-xs-areum text-areum-text-tertiary">%</span>
                        </div>
                      </InputRow>
                      <InputRow label="Bond Return">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={settings.bondReturn}
                            onChange={(e) => updateSetting('bondReturn', parseFloat(e.target.value))}
                            step="0.1"
                            className={inputClass + " w-16"}
                          />
                          <span className="text-xs-areum text-areum-text-tertiary">%</span>
                        </div>
                      </InputRow>
                    </div>
                  </div>
                </div>

                {/* Inflation */}
                <div>
                  <div className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-tertiary mb-2">Inflation</div>
                  <div className="flex gap-4">
                    <InputRow label="General">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.generalInflation}
                          onChange={(e) => updateSetting('generalInflation', parseFloat(e.target.value))}
                          step="0.1"
                          className={inputClass + " w-16"}
                        />
                        <span className="text-xs-areum text-areum-text-tertiary">%</span>
                      </div>
                    </InputRow>
                    <InputRow label="Healthcare">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.healthcareInflation}
                          onChange={(e) => updateSetting('healthcareInflation', parseFloat(e.target.value))}
                          step="0.1"
                          className={inputClass + " w-16"}
                        />
                        <span className="text-xs-areum text-areum-text-tertiary">%</span>
                      </div>
                    </InputRow>
                  </div>
                </div>

                {/* FIRE Parameters */}
                <div>
                  <div className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-tertiary mb-2">FIRE Parameters</div>
                  <div className="flex gap-4">
                    <InputRow label="SWR">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.withdrawalRate}
                          onChange={(e) => updateSetting('withdrawalRate', parseFloat(e.target.value))}
                          step="0.1"
                          min={2}
                          max={6}
                          className={inputClass + " w-16"}
                        />
                        <span className="text-xs-areum text-areum-text-tertiary">%</span>
                      </div>
                    </InputRow>
                    <InputRow label="Success Rate">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.targetSuccessRate}
                          onChange={(e) => updateSetting('targetSuccessRate', parseInt(e.target.value))}
                          min={70}
                          max={99}
                          className={inputClass + " w-16"}
                        />
                        <span className="text-xs-areum text-areum-text-tertiary">%</span>
                      </div>
                    </InputRow>
                  </div>
                </div>

                {/* Monte Carlo */}
                <div>
                  <div className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-tertiary mb-2">Monte Carlo</div>
                  <div className="bg-areum-warning-bg border border-areum-warning/30 rounded-sm-areum px-2 py-1.5 mb-2">
                    <span className="text-xs-areum text-areum-warning">
                      Based on 1994-2023 data. May be optimistic.
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <InputRow label="Simulations">
                      <input
                        type="number"
                        value={settings.numSimulations}
                        onChange={(e) => updateSetting('numSimulations', parseInt(e.target.value))}
                        min={100}
                        max={10000}
                        step={100}
                        className={inputClass + " w-20"}
                      />
                    </InputRow>
                    <InputRow label="Fat Tails (ν)">
                      <input
                        type="number"
                        value={settings.fatTailParameter}
                        onChange={(e) => updateSetting('fatTailParameter', parseInt(e.target.value))}
                        min={3}
                        max={30}
                        className={inputClass + " w-16"}
                      />
                    </InputRow>
                  </div>
                  <div className="space-y-1 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableStressTests}
                        onChange={(e) => updateSetting('enableStressTests', e.target.checked)}
                        className="w-3.5 h-3.5 text-areum-accent border-areum-border rounded"
                      />
                      <span className="text-sm-areum text-areum-text-primary">Enable Stress Testing</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.disableRandomness}
                        onChange={(e) => updateSetting('disableRandomness', e.target.checked)}
                        className="w-3.5 h-3.5 text-areum-accent border-areum-border rounded"
                      />
                      <span className="text-sm-areum text-areum-text-primary">Disable Randomness</span>
                      <span className="text-xs-areum text-areum-text-tertiary">(debug)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-areum-border bg-areum-canvas">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm-areum font-medium text-areum-text-secondary border border-areum-border rounded-sm-areum hover:bg-areum-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm-areum font-medium text-white bg-areum-accent rounded-sm-areum hover:bg-areum-accent/90"
            >
              Save & Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedSettingsModal;
