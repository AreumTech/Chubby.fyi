/**
 * GoalStep - Set FIRE Goal Parameters (Dumb Display Architecture)
 *
 * Collects retirement age preferences and explains the 25x rule.
 * Uses dataService for all calculations - no client-side business logic.
 */

import React from 'react';
import { Input } from '@/components/ui';
import { HelpTooltip } from '@/components/HelpTooltip';
import { QuickstartInputs } from '@/services/quickstartService';
import { dataService } from '@/services/dataService';
import { logger } from '@/utils/logger';
import { H3, H4, Body, BodyBase, Label, Caption, Mono } from '@/components/ui/Typography';

interface GoalStepProps {
  data: QuickstartInputs;
  onUpdate: (updates: Partial<QuickstartInputs>) => void;
}

export const GoalStep: React.FC<GoalStepProps> = ({ data, onUpdate }) => {
  const yearsToRetirement = data.retirementAge - data.currentAge;
  const totalIncome = (data.annualSalary || 0) + (data.annualBonus || 0) + (data.otherIncome || 0);

  // Use dataService for all calculations - no client-side business logic
  const goalAnalysis = dataService.calculateQuickstartGoalAnalysis(
    data.annualExpenses,
    data.retirementExpenses,
    data.safetyMultiplier || 25,
    data.currentSavings || 0,
    totalIncome,
    yearsToRetirement
  );

  const { fireTarget, requiredSavingsRate, feasibilityLevel } = goalAnalysis;

  const getFeasibilityColor = (level: string) => {
    switch (level) {
      case 'achievable': return 'text-green-600 bg-green-50 border-green-200';
      case 'challenging': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'difficult': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'unrealistic': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getFeasibilityMessage = (level: string) => {
    switch (level) {
      case 'achievable': return 'Your FIRE goal looks very achievable! 🎯';
      case 'challenging': return 'Your FIRE goal is challenging but doable with discipline 💪';
      case 'difficult': return 'Your FIRE goal will require significant lifestyle changes ⚠️';
      case 'unrealistic': return 'Consider adjusting your timeline or expenses 🔴';
      default: return '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-6 md:mb-8">
        <div className="text-xl mb-3">🎯</div>
        <H4 className="mb-2">
          When Do You Want to Achieve FIRE?
        </H4>
        <BodyBase color="secondary">
          Set your target retirement age and we&apos;ll calculate what it takes
          to achieve financial independence by then.
        </BodyBase>
      </div>

      {/* Goal Configuration */}
      <div className="space-y-6">
        {/* Current and Target Age */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label as="label" className="block mb-2" color="secondary">
              Current Age
            </Label>
            <Input
              type="number"
              value={data.currentAge}
              onChange={(e) => onUpdate({ currentAge: parseInt(e.target.value) || 25 })}
              className="text-lg text-center"
              min="18"
              max="80"
            />
          </div>
          <div>
            <Label as="label" className="block mb-2" color="secondary">
              Target Retirement Age *
            </Label>
            <Input
              type="number"
              value={data.retirementAge}
              onChange={(e) => onUpdate({ retirementAge: parseInt(e.target.value) || 65 })}
              className="text-lg text-center"
              min={data.currentAge + 1}
              max="80"
              autoFocus
            />
          </div>
        </div>

        {/* Years to FIRE Display */}
        {yearsToRetirement > 0 && (
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <BodyBase className="text-blue-700 mb-1">Time to FIRE</BodyBase>
            <Mono weight="bold" className="text-2xl text-blue-800">
              {yearsToRetirement} years
            </Mono>
          </div>
        )}

        {/* Safety Multiplier */}
        <div>
          <Label as="label" className="block mb-2" color="secondary">
            Safety Multiplier
            <HelpTooltip
              concept="fourPercentRule"
              position="right"
              className="ml-1"
            >
              ⓘ
            </HelpTooltip>
          </Label>
          <div className="flex items-center space-x-4">
            <Input
              type="number"
              value={data.safetyMultiplier}
              onChange={(e) => onUpdate({ safetyMultiplier: parseFloat(e.target.value) || 25 })}
              className="w-20 text-center"
              min="15"
              max="40"
              step="0.5"
            />
            <Body color="secondary">× annual expenses</Body>
          </div>
          <Caption color="tertiary" className="mt-1">
            Most people use 25x (4% withdrawal rule). Higher numbers = more conservative.
          </Caption>
        </div>

        {/* Current Savings (Optional) */}
        <div>
          <Label as="label" className="block mb-2" color="secondary">
            Current Savings & Investments (optional)
          </Label>
          <div className="relative">
            <Body color="tertiary" className="absolute left-3 top-3" as="span">$</Body>
            <Input
              type="text"
              value={data.currentSavings?.toLocaleString() || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value.replace(/,/g, '')) || 0;
                onUpdate({ currentSavings: value });
              }}
              className="pl-8 text-lg"
              placeholder="50,000"
            />
          </div>
          <Caption color="tertiary" className="mt-1">
            Total value of all savings, 401k, IRAs, and investments
          </Caption>
        </div>
      </div>

      {/* FIRE Target Calculation */}
      {data.annualExpenses > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <H3 weight="semibold" className="mb-4 flex items-center">
            <span className="mr-2">🧮</span>
            Your FIRE Target
          </H3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <BodyBase color="secondary">Annual Expenses in Retirement</BodyBase>
              <Mono weight="bold" className="text-lg">
                ${(data.retirementExpenses ?? data.annualExpenses).toLocaleString()}
              </Mono>
            </div>
            <div className="text-center">
              <BodyBase color="secondary">FIRE Target ({data.safetyMultiplier ?? 25}x rule)</BodyBase>
              <Mono weight="bold" className="text-lg text-purple-600">
                ${fireTarget.toLocaleString()}
              </Mono>
            </div>
          </div>

          <div className="text-center p-3 bg-white border border-gray-200 rounded">
            <Caption color="secondary" className="mb-1">
              With ${fireTarget.toLocaleString()}, you can safely withdraw
            </Caption>
            <Mono weight="semibold" className="text-lg">
              ${Math.round(fireTarget * 0.04).toLocaleString()}/year
            </Mono>
            <Caption color="secondary">
              using the 4% rule for perpetual income
            </Caption>
          </div>

          {/* Note about validation */}
          <div className="mt-4 text-center">
            <Caption color="tertiary">
              Full Monte Carlo validation available in main simulation after setup
            </Caption>
          </div>
        </div>
      )}

      {/* Feasibility Assessment */}
      {totalIncome > 0 && yearsToRetirement > 0 && data.annualExpenses > 0 && (
        <div className={`mt-6 p-4 border rounded-lg ${getFeasibilityColor(feasibilityLevel)}`}>
          <H3 weight="semibold" className="mb-2 flex items-center">
            <span className="mr-2">📊</span>
            Feasibility Assessment
          </H3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="text-center">
              <BodyBase className="opacity-75">Required Savings Rate</BodyBase>
              <Mono weight="bold" className="text-lg">
                {(requiredSavingsRate * 100).toFixed(1)}%
              </Mono>
            </div>
            <div className="text-center">
              <BodyBase className="opacity-75">Monthly Contribution Needed</BodyBase>
              <Mono weight="bold" className="text-lg">
                ${Math.round((requiredSavingsRate * totalIncome) / 12).toLocaleString()}
              </Mono>
            </div>
          </div>

          <BodyBase weight="medium" align="center">
            {getFeasibilityMessage(feasibilityLevel)}
          </BodyBase>
        </div>
      )}


      {/* Tips for Different Scenarios */}
      <div className="mt-8 space-y-4">
        {feasibilityLevel === 'unrealistic' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <H3 weight="medium" className="text-red-900 mb-2 flex items-center">
              <span className="mr-2">💡</span>
              Consider These Adjustments
            </H3>
            <ul className="space-y-1">
              <BodyBase as="li" className="text-red-800">• Extend your retirement timeline by 5-10 years</BodyBase>
              <BodyBase as="li" className="text-red-800">• Reduce your annual expenses by 10-20%</BodyBase>
              <BodyBase as="li" className="text-red-800">• Increase your income through side hustles or career growth</BodyBase>
              <BodyBase as="li" className="text-red-800">• Use a lower safety multiplier (22-23x instead of 25x)</BodyBase>
            </ul>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <H3 weight="medium" className="text-blue-900 mb-2 flex items-center">
            <span className="mr-2">🔬</span>
            About the 4% Rule
          </H3>
          <BodyBase className="text-blue-800">
            The 4% rule suggests you can withdraw 4% of your portfolio annually
            in retirement without running out of money. This assumes a balanced
            portfolio and historical market returns. Many early retirees use
            3.5% (28.6x) or 3.25% (30.8x) for extra safety.
          </BodyBase>
        </div>
      </div>

      {/* Validation Message */}
      {data.retirementAge <= data.currentAge && (
        <div className="mt-6 text-center">
          <BodyBase className="text-red-600">
            Your retirement age must be greater than your current age.
          </BodyBase>
        </div>
      )}
    </div>
  );
};