/**
 * IncomeStep - Simplified Income Collection
 * 
 * Streamlined income entry with preset buttons for quick selection.
 * Removes unnecessary complexity like bonus/RSU separation.
 */

import React from 'react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { StateSelector } from '@/components/StateSelector';
import { QuickstartInputs } from '@/services/quickstartService';
import { formatNumberWithCommas, parseFormattedNumber } from '@/utils/formatting';
import { IncomeValidation } from '../components/ValidationMessage';
import { HelpIcon } from '../../HelpTooltip';
import { H2, H4, H5, BodyBase, Label, Caption, Mono } from '@/components/ui/Typography';

interface IncomeStepProps {
  data: QuickstartInputs;
  onUpdate: (updates: Partial<QuickstartInputs>) => void;
}

const INCOME_PRESETS = [
  { label: '$100k', value: 100000 },
  { label: '$200k', value: 200000 },
  { label: '$350k', value: 350000 },
  { label: '$500k', value: 500000 },
  { label: '$750k', value: 750000 },
  { label: '$1M+', value: 1000000 },
];

export const IncomeStep: React.FC<IncomeStepProps> = ({
  data,
  onUpdate
}) => {
  const totalIncome = data.annualSalary || 0;

  const handlePresetClick = (value: number) => {
    onUpdate({ annualSalary: value });
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-6 md:mb-8">
        <div className="text-xl mb-3">💰</div>
        <H4 className="mb-2 flex items-center justify-center gap-2">
          What&apos;s Your Total Annual Income?
          <HelpIcon concept="grossIncome" />
        </H4>
        <BodyBase color="secondary">
          Include salary, bonuses, RSUs, and any other regular income
        </BodyBase>
      </div>

      {/* Quick Select Presets */}
      <div className="mb-6">
        <Label as="p" color="secondary" align="center" className="mb-3">
          Quick Select (or enter custom amount below)
        </Label>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {INCOME_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant={totalIncome === preset.value ? 'primary' : 'secondary'}
              onClick={() => handlePresetClick(preset.value)}
              className="text-sm md:text-base py-3"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Input */}
      <div className="mt-8">
        <Label as="label" color="secondary" className="block mb-2">
          Or Enter Custom Amount
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-lg">
            <BodyBase color="tertiary" as="span">$</BodyBase>
          </span>
          <Input
            type="text"
            value={formatNumberWithCommas(data.annualSalary || '')}
            onChange={(e) => onUpdate({ annualSalary: parseFormattedNumber(e.target.value) })}
            className="pl-8 text-base md:text-lg mobile-input"
            placeholder="150,000"
          />
        </div>
        <Caption color="tertiary" className="mt-1">
          Your total gross income (before taxes)
        </Caption>
      </div>

      {/* Total Display */}
      {totalIncome > 0 && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-center">
            <BodyBase className="text-green-700 mb-1">Total Annual Income</BodyBase>
            <H2 weight="bold" className="text-green-800">
              <Mono as="span">${totalIncome.toLocaleString()}</Mono>
            </H2>
            <BodyBase className="text-green-600 mt-1">
              ≈ <Mono as="span">${Math.round(totalIncome / 12).toLocaleString()}</Mono>/month gross
            </BodyBase>
          </div>
        </div>
      )}

      {/* Tax Filing Status - Simple */}
      <div className="mt-8 space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <H5 className="mb-3 flex items-center gap-2">
            Tax Filing Status
            <HelpIcon concept="grossIncome" />
          </H5>

          <div className="space-y-3">
            {/* Filing Status */}
            <div>
              <BodyBase as="label" color="secondary" className="block mb-2">Filing Status</BodyBase>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={data.filingStatus === 'single' ? 'primary' : 'secondary'}
                  onClick={() => onUpdate({ filingStatus: 'single' })}
                  className="text-sm"
                >
                  Single
                </Button>
                <Button
                  variant={data.filingStatus === 'married' ? 'primary' : 'secondary'}
                  onClick={() => onUpdate({ filingStatus: 'married' })}
                  className="text-sm"
                >
                  Married Filing Jointly
                </Button>
              </div>
            </div>

            {/* State */}
            <div>
              <BodyBase as="label" color="secondary" className="block mb-2">State</BodyBase>
              <StateSelector
                value={data.state || 'CA'}
                onChange={(stateCode) => onUpdate({ state: stateCode })}
                placeholder="Type to search states..."
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      <div className="mt-6">
        <IncomeValidation income={data.annualSalary || 0} />
      </div>
    </div>
  );
};