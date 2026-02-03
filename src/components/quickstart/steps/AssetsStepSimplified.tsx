/**
 * AssetsStepSimplified - Simple Net Worth & Housing
 *
 * Simplified asset entry with just 3 net worth buttons and housing situation.
 * Uses HCOL/MCOL/LCOL data for smart home value estimates.
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { QuickstartInputs } from '@/services/quickstartService';
import { formatNumberWithCommas, parseFormattedNumber } from '@/utils/formatting';
import { H2, H3, Body, BodyBase, Label, Caption, Mono } from '@/components/ui/Typography';

interface AssetsStepProps {
  data: QuickstartInputs;
  onUpdate: (updates: Partial<QuickstartInputs>) => void;
}

interface NetWorthPreset {
  label: string;
  description: string;
  emoji: string;
  netWorth: number;
  breakdown: {
    cash: number;
    retirement: number;
    investments: number;
  };
}

type LocationType = 'HCOL' | 'MCOL' | 'LCOL';

// Simple 3-tier net worth system
const NET_WORTH_PRESETS: NetWorthPreset[] = [
  {
    label: '10k',
    description: 'Getting started',
    emoji: '🌱',
    netWorth: 10000,
    breakdown: {
      cash: 7000,
      retirement: 2000,
      investments: 1000,
    }
  },
  {
    label: '100k',
    description: 'Building wealth',
    emoji: '📈',
    netWorth: 100000,
    breakdown: {
      cash: 20000,
      retirement: 50000,
      investments: 30000,
    }
  },
  {
    label: '1M',
    description: 'Wealth built',
    emoji: '💎',
    netWorth: 1000000,
    breakdown: {
      cash: 50000,
      retirement: 500000,
      investments: 450000,
    }
  }
];

// Home value estimates based on cost of living
const getHomeValueEstimate = (costOfLiving: LocationType): number => {
  const estimates = {
    'HCOL': 1000000,
    'MCOL': 450000,
    'LCOL': 275000
  };
  return estimates[costOfLiving];
};

export const AssetsStepSimplified: React.FC<AssetsStepProps> = ({
  data,
  onUpdate
}) => {
  const [customMode, setCustomMode] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<NetWorthPreset | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [housingType, setHousingType] = useState<'rent' | 'mortgage'>((data.housingType === 'own' ? 'mortgage' : 'rent'));
  
  // Get location from expenses step (defaulting to MCOL if not set)
  const userLocation: LocationType = (data as any).costOfLiving || 'MCOL';
  const estimatedHomeValue = getHomeValueEstimate(userLocation);
  
  // Initialize with existing data if available
  useEffect(() => {
    if (data.currentSavings && data.currentSavings > 0) {
      // Find closest preset
      const closestPreset = NET_WORTH_PRESETS.reduce((prev, curr) => 
        Math.abs(curr.netWorth - (data.currentSavings || 0)) < Math.abs(prev.netWorth - (data.currentSavings || 0)) 
          ? curr : prev
      );
      setSelectedPreset(closestPreset);
    }
  }, []);

  const handlePresetClick = (preset: NetWorthPreset) => {
    setSelectedPreset(preset);
    setCustomMode(false);

    // Create account structure from preset
    const accounts = [
      { type: 'cash' as const, balance: preset.breakdown.cash },
      { type: 'tax_deferred' as const, balance: preset.breakdown.retirement },
      { type: 'taxable' as const, balance: preset.breakdown.investments },
    ];

    onUpdate({
      currentSavings: preset.netWorth,
      currentDebt: 0,
      accounts: accounts
    });
  };

  const handleCustomAmount = (netWorth: number) => {
    // Simple allocation strategy for custom amounts
    const cash = Math.min(netWorth * 0.1, 50000); // 10% or max $50k in cash
    const retirement = netWorth * 0.5; // 50% in retirement
    const investments = netWorth * 0.4; // 40% in investments

    const accounts = [
      { type: 'cash' as const, balance: cash },
      { type: 'tax_deferred' as const, balance: retirement },
      { type: 'taxable' as const, balance: investments },
    ];

    onUpdate({
      currentSavings: netWorth,
      currentDebt: 0,
      accounts: accounts
    });
  };

  const handleHousingUpdate = (updates: any) => {
    onUpdate({ 
      housingType,
      ...updates 
    });
  };

  const currentNetWorth = data.currentSavings || 0;
  const hasHomeEquity = (data.housingType === 'own' || housingType === 'mortgage') && data.currentHomeValue && data.mortgageRemaining;
  const homeEquity = hasHomeEquity ? (data.currentHomeValue! - data.mortgageRemaining!) : 0;
  const totalNetWorth = currentNetWorth + homeEquity;

  return (
    <div className="max-w-3xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-6 md:mb-8">
        <div className="text-xl mb-3">💰</div>
        <H2 className="mb-2">
          Assets & Housing
        </H2>
        <BodyBase color="secondary">
          Quick estimate of your net worth and housing situation
        </BodyBase>
      </div>

      {/* Net Worth - Simple 3 buttons */}
      <div className="mb-8">
        <Label as="label" className="block mb-4">
          What's your approximate net worth?
        </Label>
        <div className="grid grid-cols-3 gap-4">
          {NET_WORTH_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant={selectedPreset?.label === preset.label ? 'primary' : 'secondary'}
              onClick={() => handlePresetClick(preset)}
              className="p-6 h-auto flex flex-col items-center justify-center text-center"
            >
              <div className="text-xl mb-2">{preset.emoji}</div>
              <Mono weight="semibold" className="text-lg">${preset.label}</Mono>
              <Caption className="opacity-75 mt-1">{preset.description}</Caption>
            </Button>
          ))}
        </div>
      </div>

      {/* Housing Situation */}
      <div className="mb-8">
        <Label as="label" className="block mb-4">
          Housing situation?
        </Label>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Button
            variant={housingType === 'rent' ? 'primary' : 'secondary'}
            onClick={() => {
              setHousingType('rent');
              handleHousingUpdate({ housingType: 'rent' });
            }}
            className="p-4"
          >
            🏠 Renting
          </Button>
          <Button
            variant={housingType === 'mortgage' ? 'primary' : 'secondary'}
            onClick={() => {
              setHousingType('mortgage');
              handleHousingUpdate({ housingType: 'mortgage' });
            }}
            className="p-4"
          >
            🏡 Own/Mortgage
          </Button>
        </div>

        {/* Mortgage Details */}
        {housingType === 'mortgage' && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
            <div className="mb-3">
              <BodyBase color="secondary" className="mb-2">
                💡 Based on your {userLocation} location, we estimate homes around <Mono weight="semibold">${estimatedHomeValue.toLocaleString()}</Mono>
              </BodyBase>
              <BodyBase color="secondary">This helps calculate your current net worth more accurately.</BodyBase>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label as="label" className="block mb-1">
                  Current Home Value
                </Label>
                <div className="relative">
                  <Caption color="tertiary" className="absolute left-3 top-3">$</Caption>
                  <Input
                    type="text"
                    value={formatNumberWithCommas(data.currentHomeValue || estimatedHomeValue)}
                    onChange={(e) => handleHousingUpdate({ currentHomeValue: parseFormattedNumber(e.target.value) })}
                    className="pl-8"
                    placeholder={estimatedHomeValue.toLocaleString()}
                  />
                </div>
              </div>
              <div>
                <Label as="label" className="block mb-1">
                  Mortgage Remaining
                </Label>
                <div className="relative">
                  <Caption color="tertiary" className="absolute left-3 top-3">$</Caption>
                  <Input
                    type="text"
                    value={formatNumberWithCommas(data.mortgageRemaining || Math.round(estimatedHomeValue * 0.7))}
                    onChange={(e) => handleHousingUpdate({ mortgageRemaining: parseFormattedNumber(e.target.value) })}
                    className="pl-8"
                    placeholder={Math.round(estimatedHomeValue * 0.7).toLocaleString()}
                  />
                </div>
              </div>
            </div>
            
            {data.currentHomeValue && data.mortgageRemaining && (
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                <BodyBase className="text-green-700">
                  Home Equity: <Mono weight="semibold">${(data.currentHomeValue - data.mortgageRemaining).toLocaleString()}</Mono>
                </BodyBase>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Preset Details */}
      {selectedPreset && !customMode && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-start mb-3">
            <div>
              <H3 className="flex items-center gap-2">
                <span>{selectedPreset.emoji}</span>
                ${selectedPreset.label} Net Worth
              </H3>
              <BodyBase color="secondary" className="mt-1">{selectedPreset.description}</BodyBase>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-xs"
            >
              {showBreakdown ? 'Hide' : 'Adjust'} Breakdown
            </Button>
          </div>

          {/* Breakdown */}
          {showBreakdown && (
            <div className="mt-4 pt-4 border-t border-green-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded p-3 border">
                  <div className="flex justify-between items-center mb-2">
                    <BodyBase>💵 Cash</BodyBase>
                    <Mono weight="medium">${selectedPreset.breakdown.cash.toLocaleString()}</Mono>
                  </div>
                  <Caption color="tertiary">Emergency fund, checking</Caption>
                </div>
                <div className="bg-white rounded p-3 border">
                  <div className="flex justify-between items-center mb-2">
                    <BodyBase>🏦 Retirement</BodyBase>
                    <Mono weight="medium">${selectedPreset.breakdown.retirement.toLocaleString()}</Mono>
                  </div>
                  <Caption color="tertiary">401k, IRA, Roth</Caption>
                </div>
                <div className="bg-white rounded p-3 border">
                  <div className="flex justify-between items-center mb-2">
                    <BodyBase>📈 Investments</BodyBase>
                    <Mono weight="medium">${selectedPreset.breakdown.investments.toLocaleString()}</Mono>
                  </div>
                  <Caption color="tertiary">Brokerage, stocks, crypto</Caption>
                </div>
              </div>
              <div className="text-center">
                <Caption color="tertiary">You can adjust these allocations later in the full interface</Caption>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total Net Worth Summary */}
      {(selectedPreset || hasHomeEquity) && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
          <H3 className="text-purple-900 mb-3 flex items-center">
            <span className="mr-2">💎</span>
            Total Net Worth Summary
          </H3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded p-3">
              <Caption color="secondary">Liquid Assets</Caption>
              <Mono weight="bold" className="text-lg text-blue-600">
                ${(selectedPreset?.netWorth || 0).toLocaleString()}
              </Mono>
            </div>
            {hasHomeEquity && (
              <div className="bg-white rounded p-3">
                <Caption color="secondary">Home Equity</Caption>
                <Mono weight="bold" className="text-lg text-green-600">
                  ${homeEquity.toLocaleString()}
                </Mono>
              </div>
            )}
            <div className="bg-white rounded p-3">
              <Caption color="secondary">Total Net Worth</Caption>
              <Mono weight="bold" className="text-lg text-purple-600">
                ${totalNetWorth.toLocaleString()}
              </Mono>
            </div>
          </div>
        </div>
      )}

      {/* Custom Amount Option */}
      <div className="text-center mb-6">
        {!customMode ? (
          <Button
            variant="secondary"
            onClick={() => setCustomMode(true)}
            className="text-sm"
          >
            💼 Enter Custom Amount
          </Button>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <H3 className="mb-3">Custom Net Worth</H3>
            <div className="max-w-xs mx-auto">
              <div className="relative">
                <Mono color="tertiary" className="absolute left-3 top-3 text-lg">$</Mono>
                <Input
                  type="text"
                  value={formatNumberWithCommas(data.currentSavings || '')}
                  onChange={(e) => {
                    const value = parseFormattedNumber(e.target.value);
                    handleCustomAmount(value);
                  }}
                  className="pl-8 text-lg text-center"
                  placeholder="250,000"
                  autoFocus
                />
              </div>
              <Caption color="tertiary" className="mt-2">
                We'll automatically allocate across account types
              </Caption>
            </div>
            <Button
              variant="secondary"
              onClick={() => setCustomMode(false)}
              className="mt-4 text-sm"
            >
              Back to Presets
            </Button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <H3 className="text-blue-900 mb-2 flex items-center">
          <span className="mr-2">💡</span>
          Quick Tips
        </H3>
        <BodyBase as="ul" className="text-blue-800 space-y-1">
          <Caption as="li" className="text-blue-800">• Net worth = assets minus debts (cars, student loans, etc.)</Caption>
          <Caption as="li" className="text-blue-800">• Include: checking, savings, 401(k), IRAs, investments</Caption>
          <Caption as="li" className="text-blue-800">• Estimates are fine - you can adjust later</Caption>
          <Caption as="li" className="text-blue-800">• Home equity (if you own) adds to your total net worth</Caption>
        </BodyBase>
      </div>
    </div>
  );
};