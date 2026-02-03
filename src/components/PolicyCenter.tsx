/**
 * PolicyCenter Modal
 *
 * A modal for editing always-active policy settings that govern automated
 * behaviors during simulation. Replaces the old StrategyCenterV2 for policy editing.
 *
 * Policies are singleton settings (one per type) that are always active:
 * - Withdrawal Strategy: How to draw down retirement accounts
 * - Cash Management: Target cash reserves and auto-invest rules
 * - Rebalancing: Portfolio rebalancing frequency and thresholds
 * - Asset Allocation: Target portfolio allocation
 * - Tax Settings: State and filing status for tax calculations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { useCommandBus } from '@/hooks/useCommandBus';
import { createCommand } from '@/commands/types';
import { Modal } from '@/components/ui';
import { H3, BodyBase, Caption } from '@/components/ui/Typography';
import { logger } from '@/utils/logger';
import type { PolicySettings } from '@/types/strategies/unified';

interface PolicyCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

// US State codes for tax dropdown
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington DC' },
];

export const PolicyCenter: React.FC<PolicyCenterProps> = ({ isOpen, onClose }) => {
  const { dispatch } = useCommandBus();
  const activeScenario = useAppStore(state => state.scenarios[state.activeScenarioId]);
  const setPolicySettings = useAppStore(state => state.setPolicySettings);

  // Track which section is expanded (accordion behavior)
  const [expandedSection, setExpandedSection] = useState<string | null>('withdrawal');

  // Local form state - initialized from store
  const [localSettings, setLocalSettings] = useState<PolicySettings>({});

  // Initialize local state from store when modal opens
  useEffect(() => {
    if (isOpen && activeScenario?.policySettings) {
      setLocalSettings(activeScenario.policySettings);
    }
  }, [isOpen, activeScenario?.policySettings]);

  // Toggle accordion section
  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // Update nested policy setting
  const updatePolicy = useCallback(<K extends keyof PolicySettings>(
    category: K,
    field: string,
    value: any
  ) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as any || {}),
        [field]: value,
      },
    }));
  }, []);

  // Save changes and trigger simulation
  const handleSave = async () => {
    try {
      setPolicySettings(localSettings);
      logger.info('[PolicyCenter] Policy settings saved');

      // Trigger simulation to apply new policies
      await dispatch(createCommand.runSimulation());
      logger.info('[PolicyCenter] Simulation triggered after policy update');

      onClose();
    } catch (error) {
      logger.error('[PolicyCenter] Failed to save policy settings:', error);
    }
  };

  // Get summary text for collapsed sections
  const getSummary = (section: string): string => {
    switch (section) {
      case 'withdrawal': {
        const w = localSettings.retirementWithdrawal;
        const seq = w?.withdrawalSequence === 'tax_efficient' ? 'Tax-efficient' : w?.withdrawalSequence || 'Tax-efficient';
        const rate = ((w?.baseWithdrawalRate || 0.04) * 100).toFixed(1);
        return `${seq}, ${rate}%`;
      }
      case 'cash': {
        const c = localSettings.cashManagement;
        if (!c?.enabled) return 'Disabled';
        return `${c?.targetReserveMonths || 6} months`;
      }
      case 'rebalancing': {
        const r = localSettings.rebalancing;
        if (!r?.enabled) return 'Disabled';
        return r?.frequency || 'Annually';
      }
      case 'allocation': {
        const a = localSettings.assetAllocation;
        if (!a?.enabled) return 'Disabled';
        const stocks = Math.round((a?.targetAllocation?.['stocks'] || a?.targetAllocation?.['equity'] || 0.7) * 100);
        return `${stocks}/${100 - stocks}`;
      }
      case 'tax': {
        const t = localSettings.stateTax;
        return `${t?.stateCode || 'CA'}, ${t?.filingStatus || 'Single'}`;
      }
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Policy Settings" size="md">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
        {/* Withdrawal Strategy Section */}
        <PolicySection
          title="Withdrawal Strategy"
          summary={getSummary('withdrawal')}
          isExpanded={expandedSection === 'withdrawal'}
          onToggle={() => toggleSection('withdrawal')}
        >
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs-areum text-areum-text-secondary mb-1">Method</label>
              <select
                value={localSettings.retirementWithdrawal?.method || 'constant_inflation_adjusted'}
                onChange={(e) => updatePolicy('retirementWithdrawal', 'method', e.target.value)}
                className="w-full px-2 py-1.5 text-sm-areum border border-areum-border rounded-sm-areum bg-areum-surface focus:outline-none focus:ring-1 focus:ring-areum-accent"
              >
                <option value="constant_inflation_adjusted">Constant (4% rule)</option>
                <option value="vpw">Variable Percentage (VPW)</option>
                <option value="guardrail">Guardrail</option>
                <option value="dynamic_guardrail">Dynamic Guardrail</option>
              </select>
            </div>

            <div>
              <label className="block text-xs-areum text-areum-text-secondary mb-1">
                Base Withdrawal Rate: {((localSettings.retirementWithdrawal?.baseWithdrawalRate || 0.04) * 100).toFixed(1)}%
              </label>
              <input
                type="range"
                min="0.02"
                max="0.06"
                step="0.002"
                value={localSettings.retirementWithdrawal?.baseWithdrawalRate || 0.04}
                onChange={(e) => updatePolicy('retirementWithdrawal', 'baseWithdrawalRate', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs-areum text-areum-text-secondary mb-1">Withdrawal Sequence</label>
              <select
                value={localSettings.retirementWithdrawal?.withdrawalSequence || 'tax_efficient'}
                onChange={(e) => updatePolicy('retirementWithdrawal', 'withdrawalSequence', e.target.value)}
                className="w-full px-2 py-1.5 text-sm-areum border border-areum-border rounded-sm-areum bg-areum-surface focus:outline-none focus:ring-1 focus:ring-areum-accent"
              >
                <option value="tax_efficient">Tax-efficient</option>
                <option value="proportional">Proportional</option>
                <option value="taxable_first">Taxable First</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableGuardrails"
                checked={localSettings.retirementWithdrawal?.guardrailParameters?.enabled || false}
                onChange={(e) => updatePolicy('retirementWithdrawal', 'guardrailParameters', {
                  ...(localSettings.retirementWithdrawal?.guardrailParameters || {}),
                  enabled: e.target.checked,
                })}
                className="rounded border-areum-border"
              />
              <label htmlFor="enableGuardrails" className="text-sm-areum text-areum-text-primary">
                Enable spending guardrails
              </label>
            </div>

            {localSettings.retirementWithdrawal?.guardrailParameters?.enabled && (
              <div className="pl-4 space-y-2 border-l-2 border-areum-border">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs-areum text-areum-text-tertiary mb-0.5">Upper Guardrail</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(localSettings.retirementWithdrawal?.guardrailParameters?.upperGuardrail || 0.06) * 100}
                      onChange={(e) => updatePolicy('retirementWithdrawal', 'guardrailParameters', {
                        ...(localSettings.retirementWithdrawal?.guardrailParameters || {}),
                        upperGuardrail: parseFloat(e.target.value) / 100,
                      })}
                      className="w-full px-2 py-1 text-sm-areum border border-areum-border rounded-sm-areum"
                    />
                  </div>
                  <div>
                    <label className="block text-xs-areum text-areum-text-tertiary mb-0.5">Lower Guardrail</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(localSettings.retirementWithdrawal?.guardrailParameters?.lowerGuardrail || 0.04) * 100}
                      onChange={(e) => updatePolicy('retirementWithdrawal', 'guardrailParameters', {
                        ...(localSettings.retirementWithdrawal?.guardrailParameters || {}),
                        lowerGuardrail: parseFloat(e.target.value) / 100,
                      })}
                      className="w-full px-2 py-1 text-sm-areum border border-areum-border rounded-sm-areum"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </PolicySection>

        {/* Cash Management Section */}
        <PolicySection
          title="Cash Management"
          summary={getSummary('cash')}
          isExpanded={expandedSection === 'cash'}
          onToggle={() => toggleSection('cash')}
        >
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cashEnabled"
                checked={localSettings.cashManagement?.enabled || false}
                onChange={(e) => updatePolicy('cashManagement', 'enabled', e.target.checked)}
                className="rounded border-areum-border"
              />
              <label htmlFor="cashEnabled" className="text-sm-areum text-areum-text-primary">
                Enable cash management
              </label>
            </div>

            {localSettings.cashManagement?.enabled && (
              <>
                <div>
                  <label className="block text-xs-areum text-areum-text-secondary mb-1">
                    Target Reserve: {localSettings.cashManagement?.targetReserveMonths || 6} months
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={localSettings.cashManagement?.targetReserveMonths || 6}
                    onChange={(e) => updatePolicy('cashManagement', 'targetReserveMonths', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoInvest"
                    checked={localSettings.cashManagement?.autoInvestExcess || false}
                    onChange={(e) => updatePolicy('cashManagement', 'autoInvestExcess', e.target.checked)}
                    className="rounded border-areum-border"
                  />
                  <label htmlFor="autoInvest" className="text-sm-areum text-areum-text-primary">
                    Auto-invest excess cash
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSell"
                    checked={localSettings.cashManagement?.autoSellForShortfall || false}
                    onChange={(e) => updatePolicy('cashManagement', 'autoSellForShortfall', e.target.checked)}
                    className="rounded border-areum-border"
                  />
                  <label htmlFor="autoSell" className="text-sm-areum text-areum-text-primary">
                    Auto-sell for shortfall
                  </label>
                </div>
              </>
            )}
          </div>
        </PolicySection>

        {/* Rebalancing Section */}
        <PolicySection
          title="Rebalancing"
          summary={getSummary('rebalancing')}
          isExpanded={expandedSection === 'rebalancing'}
          onToggle={() => toggleSection('rebalancing')}
        >
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rebalanceEnabled"
                checked={localSettings.rebalancing?.enabled || false}
                onChange={(e) => updatePolicy('rebalancing', 'enabled', e.target.checked)}
                className="rounded border-areum-border"
              />
              <label htmlFor="rebalanceEnabled" className="text-sm-areum text-areum-text-primary">
                Enable automatic rebalancing
              </label>
            </div>

            {localSettings.rebalancing?.enabled && (
              <>
                <div>
                  <label className="block text-xs-areum text-areum-text-secondary mb-1">Frequency</label>
                  <select
                    value={localSettings.rebalancing?.frequency || 'annually'}
                    onChange={(e) => updatePolicy('rebalancing', 'frequency', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm-areum border border-areum-border rounded-sm-areum bg-areum-surface focus:outline-none focus:ring-1 focus:ring-areum-accent"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                    <option value="threshold">Threshold-based</option>
                  </select>
                </div>

                {localSettings.rebalancing?.frequency === 'threshold' && (
                  <div>
                    <label className="block text-xs-areum text-areum-text-secondary mb-1">
                      Threshold: {((localSettings.rebalancing?.thresholdPercentage || 0.05) * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.10"
                      step="0.01"
                      value={localSettings.rebalancing?.thresholdPercentage || 0.05}
                      onChange={(e) => updatePolicy('rebalancing', 'thresholdPercentage', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </PolicySection>

        {/* Asset Allocation Section */}
        <PolicySection
          title="Asset Allocation"
          summary={getSummary('allocation')}
          isExpanded={expandedSection === 'allocation'}
          onToggle={() => toggleSection('allocation')}
        >
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allocationEnabled"
                checked={localSettings.assetAllocation?.enabled || false}
                onChange={(e) => updatePolicy('assetAllocation', 'enabled', e.target.checked)}
                className="rounded border-areum-border"
              />
              <label htmlFor="allocationEnabled" className="text-sm-areum text-areum-text-primary">
                Enable target allocation
              </label>
            </div>

            {localSettings.assetAllocation?.enabled && (
              <>
                <div>
                  <label className="block text-xs-areum text-areum-text-secondary mb-1">
                    Stocks: {Math.round((localSettings.assetAllocation?.targetAllocation?.['stocks'] || 0.7) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={localSettings.assetAllocation?.targetAllocation?.['stocks'] || 0.7}
                    onChange={(e) => {
                      const stocks = parseFloat(e.target.value);
                      updatePolicy('assetAllocation', 'targetAllocation', {
                        stocks,
                        bonds: 1 - stocks,
                      });
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs-areum text-areum-text-tertiary mt-0.5">
                    <span>0% Stocks</span>
                    <span>100% Stocks</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm-areum bg-areum-canvas p-2 rounded-sm-areum">
                  <span className="text-areum-text-secondary">Bonds (auto-calculated):</span>
                  <span className="font-medium text-areum-text-primary">
                    {Math.round((1 - (localSettings.assetAllocation?.targetAllocation?.['stocks'] || 0.7)) * 100)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </PolicySection>

        {/* Tax Settings Section */}
        <PolicySection
          title="Tax Settings"
          summary={getSummary('tax')}
          isExpanded={expandedSection === 'tax'}
          onToggle={() => toggleSection('tax')}
        >
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs-areum text-areum-text-secondary mb-1">State</label>
              <select
                value={localSettings.stateTax?.stateCode || 'CA'}
                onChange={(e) => updatePolicy('stateTax', 'stateCode', e.target.value)}
                className="w-full px-2 py-1.5 text-sm-areum border border-areum-border rounded-sm-areum bg-areum-surface focus:outline-none focus:ring-1 focus:ring-areum-accent"
              >
                {US_STATES.map(state => (
                  <option key={state.code} value={state.code}>{state.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs-areum text-areum-text-secondary mb-1">Filing Status</label>
              <select
                value={localSettings.stateTax?.filingStatus || 'single'}
                onChange={(e) => updatePolicy('stateTax', 'filingStatus', e.target.value)}
                className="w-full px-2 py-1.5 text-sm-areum border border-areum-border rounded-sm-areum bg-areum-surface focus:outline-none focus:ring-1 focus:ring-areum-accent"
              >
                <option value="single">Single</option>
                <option value="marriedFilingJointly">Married Filing Jointly</option>
                <option value="marriedFilingSeparately">Married Filing Separately</option>
                <option value="headOfHousehold">Head of Household</option>
              </select>
            </div>

            <div>
              <label className="block text-xs-areum text-areum-text-secondary mb-1">Number of Dependents</label>
              <input
                type="number"
                min="0"
                max="10"
                value={localSettings.stateTax?.numDependents || 0}
                onChange={(e) => updatePolicy('stateTax', 'numDependents', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm-areum border border-areum-border rounded-sm-areum bg-areum-surface focus:outline-none focus:ring-1 focus:ring-areum-accent"
              />
            </div>
          </div>
        </PolicySection>
      </div>

      {/* Footer with action buttons */}
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-areum-border">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm-areum font-medium text-areum-text-secondary hover:text-areum-text-primary hover:bg-areum-canvas rounded-sm-areum transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm-areum font-medium text-white bg-areum-accent hover:bg-areum-accent/90 rounded-sm-areum transition-colors"
        >
          Save Changes
        </button>
      </div>
    </Modal>
  );
};

// PolicySection - Collapsible accordion section
interface PolicySectionProps {
  title: string;
  summary: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const PolicySection: React.FC<PolicySectionProps> = ({
  title,
  summary,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <div className="border border-areum-border rounded-md-areum overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-areum-surface hover:bg-areum-canvas transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-areum-text-tertiary text-xs w-3">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className="text-sm-areum font-medium text-areum-text-primary">{title}</span>
        </div>
        {!isExpanded && (
          <span className="text-xs-areum text-areum-text-tertiary">{summary}</span>
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 bg-areum-surface border-t border-areum-border">
          {children}
        </div>
      )}
    </div>
  );
};

export default PolicyCenter;
