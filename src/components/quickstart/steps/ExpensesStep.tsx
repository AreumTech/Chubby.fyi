/**
 * ExpensesStep - Smart Expense Estimation (Dumb Display Architecture)
 *
 * Provides intelligent expense presets based on location and family size,
 * with detailed monthly breakdowns for transparency.
 * Uses dataService for all modeling calculations.
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { QuickstartInputs } from '@/services/quickstartService';
import { dataService } from '@/services/dataService';
import { formatNumberWithCommas, parseFormattedNumber } from '@/utils/formatting';
import { ExpenseValidation } from '../components/ValidationMessage';
import { H2, H3, BodyBase, Caption, Mono } from '@/components/ui/Typography';
import { FormLabel } from '@/components/ui/Typography';

// Extracted components and utilities
import { EXPENSE_PRESETS, LocationType, FamilySize } from './expenses-step/expensePresets';
import { getSavingsRateColor } from './expenses-step/lifetimeExpenseModeling';
import { LocationSelector, FamilySelector } from './expenses-step/LocationFamilySelectors';
import { ExpenseBreakdownDisplay } from './expenses-step/ExpenseBreakdownDisplay';
import { LifetimeAnalysisDisplay } from './expenses-step/LifetimeAnalysisDisplay';

interface ExpensesStepProps {
  data: QuickstartInputs;
  onUpdate: (updates: Partial<QuickstartInputs>) => void;
}

export const ExpensesStep: React.FC<ExpensesStepProps> = ({
  data,
  onUpdate
}) => {
  const [selectedLocation, setSelectedLocation] = useState<LocationType>('MCOL');
  const [selectedFamily, setSelectedFamily] = useState<FamilySize>('single');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [showLifetimeProjection, setShowLifetimeProjection] = useState(false);
  const [activePhaseHelp, setActivePhaseHelp] = useState<'earlyCareer' | 'midCareer' | 'preRetirement' | 'retirement' | null>(null);

  const preset = EXPENSE_PRESETS[selectedLocation][selectedFamily];
  const monthlyExpenses = customMode ? (data.annualExpenses || 0) / 12 : preset.total;
  const annualExpenses = monthlyExpenses * 12;

  const totalIncome = data.annualSalary || 0;
  const savingsRate = totalIncome > 0 && annualExpenses > 0 
    ? ((totalIncome - annualExpenses) / totalIncome) * 100 
    : 0;

  // Advanced expense modeling - use dataService instead of client-side calculations
  const hasChildren = selectedFamily === 'family';
  const currentAge = data.currentAge || 30;
  const expenseModeling = annualExpenses > 0 ?
    dataService.calculateLifetimeExpenseModeling(annualExpenses, currentAge, hasChildren) : null;

  // Auto-select preset when component mounts
  useEffect(() => {
    if (!data.annualExpenses) {
      const annual = preset.total * 12;
      const modeling = dataService.calculateLifetimeExpenseModeling(annual, currentAge, hasChildren);
      onUpdate({
        annualExpenses: annual,
        averageIndexedExpenses: modeling.averageIndexedExpenses,
        hasChildren: hasChildren
      });
    }
  }, [data.annualExpenses, onUpdate, preset.total, currentAge, hasChildren]);

  const handlePresetSelection = () => {
    const annual = preset.total * 12;
    const modeling = dataService.calculateLifetimeExpenseModeling(annual, currentAge, hasChildren);
    onUpdate({
      annualExpenses: annual,
      averageIndexedExpenses: modeling.averageIndexedExpenses,
      hasChildren: hasChildren
    });
    setCustomMode(false);
  };

  const handleLocationChange = (location: LocationType) => {
    setSelectedLocation(location);
    onUpdate({ state: location });
    handlePresetSelection();
  };

  const handleFamilyChange = (family: FamilySize) => {
    setSelectedFamily(family);
    handlePresetSelection();
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-6 md:mb-8">
        <div className="text-xl mb-3">💸</div>
        <H2 className="mb-2">
          Let&apos;s Estimate Your Monthly Expenses
        </H2>
        <BodyBase color="secondary">
          We&apos;ll help you with smart estimates based on your location and situation
        </BodyBase>
      </div>

      {!customMode ? (
        <>
          {/* Location Selection */}
          <LocationSelector
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
          />

          {/* Family Size Selection */}
          <FamilySelector
            selectedFamily={selectedFamily}
            onFamilyChange={handleFamilyChange}
          />

          {/* Estimated Monthly Expenses */}
          <ExpenseBreakdownDisplay
            monthlyExpenses={monthlyExpenses}
            annualExpenses={annualExpenses}
            preset={preset}
            showBreakdown={showBreakdown}
            onToggleBreakdown={() => setShowBreakdown(!showBreakdown)}
          />

          {/* Adjustment Options */}
          <div className="text-center mb-6">
            <BodyBase color="secondary" className="mb-3">
              These are average estimates. You can adjust if needed.
            </BodyBase>
            <Button
              variant="secondary"
              onClick={() => setCustomMode(true)}
            >
              Enter Custom Amount Instead
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Custom Input Mode */}
          <div className="mb-6">
            <FormLabel className="mb-2">
              Enter Your Monthly Expenses
            </FormLabel>
            <div className="relative">
              <Caption as="span" color="tertiary" className="absolute left-3 top-3 text-lg">
                $
              </Caption>
              <Input
                type="text"
                value={formatNumberWithCommas((data.annualExpenses || 0) / 12)}
                onChange={(e) => {
                  const monthly = parseFormattedNumber(e.target.value);
                  const annual = monthly * 12;
                  const modeling = dataService.calculateLifetimeExpenseModeling(annual, currentAge, hasChildren);
                  onUpdate({
                    annualExpenses: annual,
                    averageIndexedExpenses: modeling.averageIndexedExpenses,
                    hasChildren: hasChildren
                  });
                }}
                className="pl-8 text-base md:text-lg mobile-input"
                placeholder="5,000"
                autoFocus
              />
            </div>
            <Caption color="tertiary" className="mt-1">
              Include all living expenses except savings and investments
            </Caption>
          </div>

          <div className="text-center">
            <Button
              variant="secondary"
              onClick={() => {
                setCustomMode(false);
                handlePresetSelection();
              }}
            >
              Back to Smart Estimates
            </Button>
          </div>
        </>
      )}

      {/* Savings Rate Display */}
      {totalIncome > 0 && annualExpenses > 0 && (
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
          <div className="text-center">
            <BodyBase className="text-gray-700 mb-1">Your Savings Rate</BodyBase>
            <Mono weight="bold" className={`text-3xl ${getSavingsRateColor(savingsRate)}`}>
              {savingsRate.toFixed(0)}%
            </Mono>
            <BodyBase color="secondary" className="mt-1">
              ${Math.round((totalIncome - annualExpenses) / 12).toLocaleString()}/month available to save
            </BodyBase>
          </div>
        </div>
      )}

      {/* Lifetime Expense Modeling */}
      {expenseModeling && (
        <LifetimeAnalysisDisplay
          expenseModeling={expenseModeling}
          hasChildren={hasChildren}
          annualExpenses={annualExpenses}
          showLifetimeProjection={showLifetimeProjection}
          onToggleProjection={() => setShowLifetimeProjection(!showLifetimeProjection)}
          activePhaseHelp={activePhaseHelp}
          onPhaseHelpChange={setActivePhaseHelp}
        />
      )}

      {/* Tips */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <H3 weight="medium" className="text-amber-900 mb-2 flex items-center">
          <span className="mr-2">💡</span>
          Pro Tip
        </H3>
        <BodyBase className="text-amber-800">
          A {savingsRate >= 50 ? '50%+' : savingsRate >= 30 ? '30-50%' : '20-30%'} savings rate
          {savingsRate >= 50 ? ' can lead to FIRE in 10-15 years!' :
           savingsRate >= 30 ? ' is excellent for FIRE planning.' :
           ' is a great start. Consider ways to optimize expenses.'}
          {expenseModeling && ` Using amortized expenses, your refined FIRE target is ${expenseModeling.fireTargetAmortized.toLocaleString()}.`}
        </BodyBase>
      </div>

      {/* Validation Messages */}
      <div className="mt-6">
        <ExpenseValidation income={totalIncome} expenses={annualExpenses} />
      </div>
    </div>
  );
};