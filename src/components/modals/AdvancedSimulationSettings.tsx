import React, { useState, useCallback } from 'react';
import { StochasticModelConfig, AdvancedSimulationSettings as AdvancedSimulationSettingsType } from '../../types';
import { Button, Input } from '../ui';
import { Tooltip } from '../Tooltip';

interface AdvancedSimulationSettingsProps {
  settings: AdvancedSimulationSettingsType;
  onSettingsChange: (settings: AdvancedSimulationSettingsType) => void;
  onResetToDefaults: () => void;
  className?: string;
}

/**
 * Advanced Simulation Settings Component
 *
 * Exposes sophisticated Monte Carlo simulation parameters based on historical market data (1994-2023).
 *
 * WARNING: These parameters are based on a period of historic interest rate decline and may produce
 * overly optimistic forecasts. Consider using more conservative forward-looking assumptions.
 */
export const AdvancedSimulationSettings: React.FC<AdvancedSimulationSettingsProps> = ({
  settings,
  onSettingsChange,
  onResetToDefaults,
  className = ""
}) => {
  const [activeSection, setActiveSection] = useState<string>('assetReturns');

  const updateStochasticConfig = useCallback((updates: Partial<StochasticModelConfig>) => {
    onSettingsChange({
      ...settings,
      stochasticConfig: {
        ...settings.stochasticConfig,
        ...updates
      }
    });
  }, [settings, onSettingsChange]);

  const updateNestedConfig = useCallback((path: string[], value: any) => {
    const newSettings = { ...settings };
    let current: any = newSettings;

    // Navigate to the parent object
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }

    // Set the final value
    current[path[path.length - 1]] = value;

    onSettingsChange(newSettings);
  }, [settings, onSettingsChange]);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const parsePercentage = (value: string) => parseFloat(value) / 100;

  const sections = [
    { id: 'assetReturns', label: 'Asset Returns & Volatility', icon: '📈' },
    { id: 'correlations', label: 'Asset Correlations', icon: '🔗' },
    { id: 'volatilityModeling', label: 'Volatility Clustering (GARCH)', icon: '📊' },
    { id: 'inflationPersistence', label: 'Inflation Persistence (AR1)', icon: '💰' },
    { id: 'guardrails', label: 'Dynamic Spending Guardrails', icon: '🛡️' },
    { id: 'monteCarloSettings', label: 'Monte Carlo Parameters', icon: '🎲' },
    { id: 'stressTesting', label: 'Stress Testing', icon: '⚠️' }
  ];

  return (
    <div className={`advanced-simulation-settings ${className}`}>
      {/* Header with Warning */}
      <div className="settings-header">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">Advanced Simulation Settings</h2>
          <Button
            onClick={onResetToDefaults}
            variant="secondary"
            size="sm"
          >
            Reset to Defaults
          </Button>
        </div>

        <div className="warning-banner bg-warning-light border border-warning p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <div className="text-warning text-xl">⚠️</div>
            <div>
              <div className="font-semibold text-warning-dark">Historical Data Warning</div>
              <div className="text-sm text-warning-dark mt-1">
                These parameters are based on 1994-2023 historical data, which benefited from a 30-year decline in interest rates.
                This may produce overly optimistic forecasts. Consider using more conservative forward-looking assumptions for planning.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="settings-navigation">
        <div className="flex flex-wrap gap-2 mb-6 border-b">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-primary text-white border-b-2 border-primary'
                  : 'bg-surface text-secondary hover:bg-accent-light'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Sections */}
      <div className="settings-content">

        {/* Asset Returns & Volatility */}
        {activeSection === 'assetReturns' && (
          <div className="settings-section">
            <h3 className="text-lg font-semibold mb-4">Core Asset Properties (Historical 1994-2023)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Returns */}
              <div className="space-y-4">
                <h4 className="font-medium text-primary">Expected Annual Returns (Geometric Mean)</h4>

                <div className="space-y-3">
                  <div>
                    <Tooltip text="9.8% - Captures strong US equity performance including major crashes (dot-com, 2008). Includes dividend reinvestment.">
                      <label className="block text-sm font-medium mb-1">
                        SPY (US Stocks) Return μ_spy
                        <span className="text-info ml-1 cursor-help">ℹ️</span>
                      </label>
                    </Tooltip>
                    <Input
                      type="text"
                      value={formatPercentage(settings.stochasticConfig.meanSpyReturn || 0.098)}
                      onChange={(e) => updateNestedConfig(['stochasticConfig', 'meanSpyReturn'], parsePercentage(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Tooltip text="4.2% - Benefited greatly from 30-year interest rate decline. Highly unlikely to repeat in future decades.">
                      <label className="block text-sm font-medium mb-1">
                        BND (US Bonds) Return μ_bnd
                        <span className="text-info ml-1 cursor-help">ℹ️</span>
                      </label>
                    </Tooltip>
                    <Input
                      type="text"
                      value={formatPercentage(settings.stochasticConfig.meanBondReturn || 0.042)}
                      onChange={(e) => updateNestedConfig(['stochasticConfig', 'meanBondReturn'], parsePercentage(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Tooltip text="2.6% - Average CPI-U including periods of stability and recent sharp increases. Reflects actual purchasing power erosion.">
                      <label className="block text-sm font-medium mb-1">
                        Inflation Rate μ_infl
                        <span className="text-info ml-1 cursor-help">ℹ️</span>
                      </label>
                    </Tooltip>
                    <Input
                      type="text"
                      value={formatPercentage(settings.stochasticConfig.meanInflation || 0.026)}
                      onChange={(e) => updateNestedConfig(['stochasticConfig', 'meanInflation'], parsePercentage(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Volatilities */}
              <div className="space-y-4">
                <h4 className="font-medium text-primary">Annual Volatilities (Standard Deviation)</h4>

                <div className="space-y-3">
                  <div>
                    <Tooltip text="17.5% - Standard volatility reflecting major market crises. Models realistic tail risk for retirement planning.">
                      <label className="block text-sm font-medium mb-1">
                        SPY Volatility σ_spy
                        <span className="text-info ml-1 cursor-help">ℹ️</span>
                      </label>
                    </Tooltip>
                    <Input
                      type="text"
                      value={formatPercentage(settings.stochasticConfig.volatilitySpy || 0.175)}
                      onChange={(e) => updateNestedConfig(['stochasticConfig', 'volatilitySpy'], parsePercentage(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Tooltip text="5.5% - Higher than long-term average due to recent interest rate volatility. Bonds are no longer 'safe' assets.">
                      <label className="block text-sm font-medium mb-1">
                        BND Volatility σ_bnd
                        <span className="text-info ml-1 cursor-help">ℹ️</span>
                      </label>
                    </Tooltip>
                    <Input
                      type="text"
                      value={formatPercentage(settings.stochasticConfig.volatilityBond || 0.055)}
                      onChange={(e) => updateNestedConfig(['stochasticConfig', 'volatilityBond'], parsePercentage(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Tooltip text="2.0% - Reflects both periods of stability and recent sharp increases. Models realistic inflation uncertainty.">
                      <label className="block text-sm font-medium mb-1">
                        Inflation Volatility σ_infl
                        <span className="text-info ml-1 cursor-help">ℹ️</span>
                      </label>
                    </Tooltip>
                    <Input
                      type="text"
                      value={formatPercentage(settings.stochasticConfig.volatilityInflation || 0.020)}
                      onChange={(e) => updateNestedConfig(['stochasticConfig', 'volatilityInflation'], parsePercentage(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fat Tail Parameter */}
            <div className="mt-6">
              <Tooltip text="Student's t degrees of freedom. Value of 5 models 'fat tails' - more frequent extreme events than normal distribution. Lower values = more extreme events.">
                <label className="block text-sm font-medium mb-1">
                  Fat-Tail Parameter (Student&apos;s t DoF) ν
                  <span className="text-info ml-1 cursor-help">ℹ️</span>
                </label>
              </Tooltip>
              <Input
                type="number"
                value={settings.stochasticConfig.fatTailParameter}
                onChange={(e) => updateStochasticConfig({ fatTailParameter: parseFloat(e.target.value) })}
                min="3"
                max="30"
                step="1"
                className="w-32"
              />
              <div className="text-xs text-secondary mt-1">
                Lower = more extreme events (3-5 typical), Higher = more normal distribution (30+ ≈ normal)
              </div>
            </div>
          </div>
        )}

        {/* Asset Correlations */}
        {activeSection === 'correlations' && (
          <div className="settings-section">
            <h3 className="text-lg font-semibold mb-4">Asset Correlation Matrix (Historical 1994-2023)</h3>

            <div className="bg-surface p-4 rounded-lg">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="font-medium">Asset</div>
                <div className="font-medium text-center">SPY</div>
                <div className="font-medium text-center">BND</div>
                <div className="font-medium text-center">Inflation</div>

                {/* SPY Row */}
                <div className="font-medium">SPY</div>
                <div className="text-center">1.00</div>
                <div className="text-center">
                  <Tooltip text="Flight-to-safety diversification benefit. Bonds tend to do well when stocks fall, though this relationship broke down in 2022.">
                    <Input
                      type="number"
                      value={settings.stochasticConfig.correlationMatrix?.[0]?.[1] || -0.22}
                      onChange={(e) => updateNestedConfig(['stochasticConfig', 'correlationMatrix', 'spy', 'bnd'], parseFloat(e.target.value))}
                      min="-1"
                      max="1"
                      step="0.01"
                      className="w-20 text-xs"
                    />
                  </Tooltip>
                </div>
                <div className="text-center">
                  <Tooltip text="Modest positive correlation. Stocks sometimes benefit from moderate inflation expectations.">
                    <Input
                      type="number"
                      value={settings.stochasticConfig.correlationMatrix?.[0]?.[2] || 0.15}
                      onChange={(e) => updateNestedConfig(['stochasticConfig', 'correlationMatrix', 'spy', 'inflation'], parseFloat(e.target.value))}
                      min="-1"
                      max="1"
                      step="0.01"
                      className="w-20 text-xs"
                    />
                  </Tooltip>
                </div>

                {/* BND Row */}
                <div className="font-medium">BND</div>
                <div className="text-center">{settings.stochasticConfig.correlationMatrix?.[0]?.[1] || -0.22}</div>
                <div className="text-center">1.00</div>
                <div className="text-center">
                  <Tooltip text="Strong negative relationship. Unexpected inflation is very damaging to existing bonds with fixed interest payments.">
                    <Input
                      type="number"
                      value={settings.stochasticConfig.correlationMatrix?.[1]?.[2] || -0.40}
                      onChange={(e) => updateNestedConfig(['stochasticConfig', 'correlationMatrix', 'bnd', 'inflation'], parseFloat(e.target.value))}
                      min="-1"
                      max="1"
                      step="0.01"
                      className="w-20 text-xs"
                    />
                  </Tooltip>
                </div>

                {/* Inflation Row */}
                <div className="font-medium">Inflation</div>
                <div className="text-center">{settings.stochasticConfig.correlationMatrix?.[0]?.[2] || 0.15}</div>
                <div className="text-center">{settings.stochasticConfig.correlationMatrix?.[1]?.[2] || -0.40}</div>
                <div className="text-center">1.00</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-secondary">
              <div className="font-medium mb-2">Correlation Interpretation:</div>
              <ul className="space-y-1 text-xs">
                <li><strong>SPY vs BND (-0.22):</strong> Flight-to-safety effect - bonds often rise when stocks fall</li>
                <li><strong>SPY vs Inflation (0.15):</strong> Stocks can benefit from moderate inflation expectations</li>
                <li><strong>BND vs Inflation (-0.40):</strong> Rising inflation destroys value of existing fixed-rate bonds</li>
              </ul>
            </div>
          </div>
        )}

        {/* GARCH Volatility Modeling */}
        {activeSection === 'volatilityModeling' && (
          <div className="settings-section">
            <h3 className="text-lg font-semibold mb-4">GARCH(1,1) Volatility Clustering</h3>
            <div className="text-sm text-secondary mb-6">
              Models how market volatility tends to cluster - volatile periods are followed by more volatile periods.
              The sum α + β represents persistence (closer to 1 = more persistent volatility).
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SPY GARCH */}
              <div className="space-y-4">
                <h4 className="font-medium text-primary">SPY (Stocks) GARCH Parameters</h4>

                <div>
                  <Tooltip text="12% - Immediate impact of a market shock on next year's volatility. Higher = shocks have bigger immediate impact.">
                    <label className="block text-sm font-medium mb-1">
                      Alpha (α) - Shock Impact
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="number"
                    value={settings.stochasticConfig.garchSpyAlpha}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'garchSpyAlpha'], parseFloat(e.target.value))}
                    min="0.01"
                    max="0.50"
                    step="0.01"
                    className="w-32"
                  />
                </div>

                <div>
                  <Tooltip text="87% - How much volatility carries over to next year. High persistence means volatile markets stay volatile.">
                    <label className="block text-sm font-medium mb-1">
                      Beta (β) - Persistence
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="number"
                    value={settings.stochasticConfig.garchSpyBeta}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'garchSpyBeta'], parseFloat(e.target.value))}
                    min="0.50"
                    max="0.99"
                    step="0.01"
                    className="w-32"
                  />
                </div>

                <div>
                  <Tooltip text="Calculated to ensure long-run variance targets 17.5% volatility: ω = σ² × (1 - α - β)">
                    <label className="block text-sm font-medium mb-1">
                      Omega (ω) - Long-run Variance
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="number"
                    value={settings.stochasticConfig.garchSpyOmega}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'garchSpyOmega'], parseFloat(e.target.value))}
                    min="0.000001"
                    max="0.001"
                    step="0.000001"
                    className="w-32"
                  />
                </div>

                <div className="text-xs text-secondary">
                  Persistence: α + β = {(settings.stochasticConfig.garchSpyAlpha + settings.stochasticConfig.garchSpyBeta).toFixed(3)}
                </div>
              </div>

              {/* BND GARCH */}
              <div className="space-y-4">
                <h4 className="font-medium text-primary">BND (Bonds) GARCH Parameters</h4>

                <div>
                  <Tooltip text="15% - Higher shock impact than stocks due to interest rate sensitivity. Bond volatility can spike quickly.">
                    <label className="block text-sm font-medium mb-1">
                      Alpha (α) - Shock Impact
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="number"
                    value={settings.stochasticConfig.garchBondAlpha}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'garchBondAlpha'], parseFloat(e.target.value))}
                    min="0.01"
                    max="0.50"
                    step="0.01"
                    className="w-32"
                  />
                </div>

                <div>
                  <Tooltip text="82% - High volatility persistence for bonds. Interest rate uncertainty tends to persist.">
                    <label className="block text-sm font-medium mb-1">
                      Beta (β) - Persistence
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="number"
                    value={settings.stochasticConfig.garchBondBeta}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'garchBondBeta'], parseFloat(e.target.value))}
                    min="0.50"
                    max="0.99"
                    step="0.01"
                    className="w-32"
                  />
                </div>

                <div>
                  <Tooltip text="Calculated to ensure long-run variance targets 5.5% volatility: ω = σ² × (1 - α - β)">
                    <label className="block text-sm font-medium mb-1">
                      Omega (ω) - Long-run Variance
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="number"
                    value={settings.stochasticConfig.garchBondOmega}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'garchBondOmega'], parseFloat(e.target.value))}
                    min="0.000001"
                    max="0.001"
                    step="0.000001"
                    className="w-32"
                  />
                </div>

                <div className="text-xs text-secondary">
                  Persistence: α + β = {(settings.stochasticConfig.garchBondAlpha + settings.stochasticConfig.garchBondBeta).toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inflation Persistence */}
        {activeSection === 'inflationPersistence' && (
          <div className="settings-section">
            <h3 className="text-lg font-semibold mb-4">AR(1) Inflation Persistence Model</h3>
            <div className="text-sm text-secondary mb-6">
              Models inflation &quot;stickiness&quot; - how high inflation one year makes high inflation more likely the next year.
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <Tooltip text="65% persistence means 65% of last year's inflation rate (relative to the mean) persists into this year. Reflects observed inflation stickiness.">
                  <label className="block text-sm font-medium mb-1">
                    Phi (φ) - Persistence Factor
                    <span className="text-info ml-1 cursor-help">ℹ️</span>
                  </label>
                </Tooltip>
                <Input
                  type="number"
                  value={settings.stochasticConfig.ar1InflationPhi}
                  onChange={(e) => updateNestedConfig(['stochasticConfig', 'ar1Inflation', 'phi'], parseFloat(e.target.value))}
                  min="0"
                  max="0.99"
                  step="0.01"
                  className="w-32"
                />
                <div className="text-xs text-secondary mt-1">
                  0 = no persistence, 1 = perfect persistence
                </div>
              </div>

              <div>
                <Tooltip text="Constant term ensuring the model centers around the long-run inflation mean. Calculated as μ_infl × (1 - φ).">
                  <label className="block text-sm font-medium mb-1">
                    Constant (c)
                    <span className="text-info ml-1 cursor-help">ℹ️</span>
                  </label>
                </Tooltip>
                <Input
                  type="number"
                  value={settings.stochasticConfig.ar1InflationConstant}
                  onChange={(e) => updateNestedConfig(['stochasticConfig', 'ar1Inflation', 'c'], parseFloat(e.target.value))}
                  min="0"
                  max="0.05"
                  step="0.0001"
                  className="w-32"
                />
              </div>

              <div>
                <Tooltip text="2.0% annual innovation standard deviation. Controls how much inflation can randomly fluctuate year-to-year.">
                  <label className="block text-sm font-medium mb-1">
                    Innovation Std Dev (σ)
                    <span className="text-info ml-1 cursor-help">ℹ️</span>
                  </label>
                </Tooltip>
                <Input
                  type="text"
                  value={formatPercentage(settings.stochasticConfig.volatilityInflation)}
                  onChange={(e) => updateNestedConfig(['stochasticConfig', 'volatilityInflation'], parsePercentage(e.target.value))}
                  className="w-32"
                />
              </div>
            </div>

            <div className="mt-4 p-4 bg-surface rounded-lg">
              <div className="text-sm">
                <div className="font-medium mb-2">Model Equation:</div>
                <div className="font-mono text-xs">
                  Inflation_t = c + φ × Inflation_(t-1) + ε_t
                </div>
                <div className="text-xs text-secondary mt-2">
                  Where ε_t ~ Normal(0, σ²) represents random inflation shocks
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Guardrails */}
        {activeSection === 'guardrails' && (
          <div className="settings-section">
            <h3 className="text-lg font-semibold mb-4">Dynamic Spending Guardrails</h3>
            <div className="text-sm text-secondary mb-6">
              Automatic spending adjustments based on portfolio performance to extend portfolio longevity.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-primary">Withdrawal Rate Guardrails</h4>

                <div>
                  <Tooltip text="6.0% - If your required withdrawal as a % of your portfolio exceeds this, a spending cut is triggered to preserve capital.">
                    <label className="block text-sm font-medium mb-1">
                      Upper Guardrail (Triggers Cuts)
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="text"
                    value={formatPercentage(settings.stochasticConfig.guardrails.upperGuardrail)}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'guardrails', 'upperGuardrail'], parsePercentage(e.target.value))}
                    className="w-32"
                  />
                </div>

                <div>
                  <Tooltip text="3.5% - If your withdrawal % drops below this, a spending increase is allowed since the portfolio is outperforming.">
                    <label className="block text-sm font-medium mb-1">
                      Lower Guardrail (Allows Increases)
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="text"
                    value={formatPercentage(settings.stochasticConfig.guardrails.lowerGuardrail)}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'guardrails', 'lowerGuardrail'], parsePercentage(e.target.value))}
                    className="w-32"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-primary">Spending Adjustments</h4>

                <div>
                  <Tooltip text="10% - The size of the spending cut when the upper guardrail is breached. Larger cuts provide more protection.">
                    <label className="block text-sm font-medium mb-1">
                      Spending Cut Percentage
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="text"
                    value={formatPercentage(settings.stochasticConfig.guardrails.spendingCutPct)}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'guardrails', 'spendingCutPct'], parsePercentage(e.target.value))}
                    className="w-32"
                  />
                </div>

                <div>
                  <Tooltip text="10% - The size of the spending increase when the lower guardrail is breached. Allows enjoying portfolio outperformance.">
                    <label className="block text-sm font-medium mb-1">
                      Spending Bonus Percentage
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="text"
                    value={formatPercentage(settings.stochasticConfig.guardrails.spendingBonusPct)}
                    onChange={(e) => updateNestedConfig(['stochasticConfig', 'guardrails', 'spendingBonusPct'], parsePercentage(e.target.value))}
                    className="w-32"
                  />
                </div>
              </div>
            </div>

            {/* Healthcare Inflation Premium */}
            <div className="mt-6">
              <Tooltip text="+2.0% - Healthcare expenses inflate faster than general inflation. This premium is added to the base inflation rate for healthcare costs.">
                <label className="block text-sm font-medium mb-1">
                  Healthcare Inflation Premium
                  <span className="text-info ml-1 cursor-help">ℹ️</span>
                </label>
              </Tooltip>
              <Input
                type="text"
                value={formatPercentage(settings.stochasticConfig.healthcareInflationPremium || 0.02)}
                onChange={(e) => updateNestedConfig(['stochasticConfig', 'healthcareInflationPremium'], parsePercentage(e.target.value))}
                className="w-32"
              />
              <div className="text-xs text-secondary mt-1">
                Healthcare costs will inflate at: Base Inflation + {formatPercentage(settings.stochasticConfig.healthcareInflationPremium || 0.02)}
              </div>
            </div>
          </div>
        )}

        {/* Monte Carlo Settings */}
        {activeSection === 'monteCarloSettings' && (
          <div className="settings-section">
            <h3 className="text-lg font-semibold mb-4">Monte Carlo Simulation Parameters</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Tooltip text="Number of simulation paths to run. More simulations = more accurate results but slower performance. 1000 is typically sufficient.">
                    <label className="block text-sm font-medium mb-1">
                      Number of Simulations
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="number"
                    value={settings.monteCarloSettings.numSimulations}
                    onChange={(e) => updateNestedConfig(['monteCarloSettings', 'numSimulations'], parseInt(e.target.value))}
                    min="100"
                    max="10000"
                    step="100"
                    className="w-32"
                  />
                </div>

                <div>
                  <Tooltip text="Age to analyze final outcomes. Typically set to life expectancy or beyond (95) to ensure portfolio longevity assessment.">
                    <label className="block text-sm font-medium mb-1">
                      Target Analysis Age
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="number"
                    value={settings.monteCarloSettings.targetAnalysisAge}
                    onChange={(e) => updateNestedConfig(['monteCarloSettings', 'targetAnalysisAge'], parseInt(e.target.value))}
                    min="65"
                    max="120"
                    step="1"
                    className="w-32"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Tooltip text="Confidence level for statistical intervals. 95% means results exclude the top and bottom 2.5% of outcomes.">
                    <label className="block text-sm font-medium mb-1">
                      Confidence Level
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="text"
                    value={formatPercentage(settings.monteCarloSettings.confidenceLevel)}
                    onChange={(e) => updateNestedConfig(['monteCarloSettings', 'confidenceLevel'], parsePercentage(e.target.value))}
                    className="w-32"
                  />
                </div>

                <div>
                  <Tooltip text="Net worth threshold for defining 'success'. Typically $0 (not running out of money) but can be set higher for legacy goals.">
                    <label className="block text-sm font-medium mb-1">
                      Success Threshold ($)
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </label>
                  </Tooltip>
                  <Input
                    type="number"
                    value={settings.monteCarloSettings.successThreshold}
                    onChange={(e) => updateNestedConfig(['monteCarloSettings', 'successThreshold'], parseFloat(e.target.value))}
                    min="0"
                    step="10000"
                    className="w-40"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.monteCarloSettings.enableProgressiveSpending}
                  onChange={(e) => updateNestedConfig(['monteCarloSettings', 'enableProgressiveSpending'], e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <Tooltip text="Allow spending to increase in scenarios where the portfolio significantly outperforms. Enables enjoying good performance.">
                    <span className="font-medium">
                      Enable Progressive Spending
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </span>
                  </Tooltip>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Stress Testing */}
        {activeSection === 'stressTesting' && (
          <div className="settings-section">
            <h3 className="text-lg font-semibold mb-4">Stress Testing Scenarios</h3>

            <div className="mb-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.stressTesting.enableStressTests}
                  onChange={(e) => updateNestedConfig(['stressTesting', 'enableStressTests'], e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <Tooltip text="Apply historical stress scenarios to test portfolio resilience. Helps identify vulnerabilities in the plan.">
                    <span className="font-medium">
                      Enable Stress Testing
                      <span className="text-info ml-1 cursor-help">ℹ️</span>
                    </span>
                  </Tooltip>
                </div>
              </label>
            </div>

            {settings.stressTesting.enableStressTests && (
              <div className="space-y-4">
                {settings.stressTesting.customScenarios.map((scenario, index) => (
                  <div key={index} className="p-4 border border-accent rounded-lg">
                    <h4 className="font-medium text-primary mb-2">{scenario.name}</h4>
                    <div className="text-sm text-secondary mb-3">{scenario.description}</div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="block font-medium mb-1">Shock Year</label>
                        <Input
                          type="number"
                          value={scenario.marketShockYear}
                          onChange={(e) => {
                            const newScenarios = [...settings.stressTesting.customScenarios];
                            newScenarios[index].marketShockYear = parseInt(e.target.value);
                            updateNestedConfig(['stressTesting', 'customScenarios'], newScenarios);
                          }}
                          min="1"
                          max="30"
                          className="w-20"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1">Stock Shock</label>
                        <Input
                          type="text"
                          value={formatPercentage(scenario.stockReturnShock)}
                          onChange={(e) => {
                            const newScenarios = [...settings.stressTesting.customScenarios];
                            newScenarios[index].stockReturnShock = parsePercentage(e.target.value);
                            updateNestedConfig(['stressTesting', 'customScenarios'], newScenarios);
                          }}
                          className="w-20"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1">Bond Shock</label>
                        <Input
                          type="text"
                          value={formatPercentage(scenario.bondReturnShock)}
                          onChange={(e) => {
                            const newScenarios = [...settings.stressTesting.customScenarios];
                            newScenarios[index].bondReturnShock = parsePercentage(e.target.value);
                            updateNestedConfig(['stressTesting', 'customScenarios'], newScenarios);
                          }}
                          className="w-20"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1">Duration (Years)</label>
                        <Input
                          type="number"
                          value={scenario.duration}
                          onChange={(e) => {
                            const newScenarios = [...settings.stressTesting.customScenarios];
                            newScenarios[index].duration = parseInt(e.target.value);
                            updateNestedConfig(['stressTesting', 'customScenarios'], newScenarios);
                          }}
                          min="1"
                          max="10"
                          className="w-20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forward-Looking Recommendations */}
      <div className="mt-8 p-4 bg-info-light border border-info rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-info text-xl">💡</div>
          <div>
            <div className="font-semibold text-info-dark">Forward-Looking Recommendations</div>
            <div className="text-sm text-info-dark mt-1">
              For the next decade (2025-2035), consider more conservative assumptions:
            </div>
            <div className="text-xs text-info-dark mt-2 space-y-1">
              <div>• <strong>SPY Return:</strong> 6.5-7.5% (due to higher current valuations)</div>
              <div>• <strong>BND Return:</strong> 3.5-4.5% (based on current yields)</div>
              <div>• <strong>Inflation:</strong> 2.5-3.0% (structural factors)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
