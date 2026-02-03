/**
 * Lifetime Analysis Display Component
 *
 * Complex component showing lifetime expense analysis with phase breakdown,
 * timeline visualization, and childcare modeling.
 */

import React from 'react';
import { Button } from '@/components/ui';
import {
  H3,
  H4,
  BodyBase,
  Label,
  Caption,
  Mono,
  MonoSmall
} from '@/components/ui/Typography';
import { LifetimeExpenseModelingResult } from './lifetimeExpenseModeling';
import { PhaseHelpModal } from './PhaseHelpModal';

interface LifetimeAnalysisDisplayProps {
  expenseModeling: LifetimeExpenseModelingResult;
  hasChildren: boolean;
  annualExpenses: number;
  showLifetimeProjection: boolean;
  onToggleProjection: () => void;
  activePhaseHelp: 'earlyCareer' | 'midCareer' | 'preRetirement' | 'retirement' | null;
  onPhaseHelpChange: (phase: 'earlyCareer' | 'midCareer' | 'preRetirement' | 'retirement' | null) => void;
}

export const LifetimeAnalysisDisplay: React.FC<LifetimeAnalysisDisplayProps> = ({
  expenseModeling,
  hasChildren,
  annualExpenses,
  showLifetimeProjection,
  onToggleProjection,
  activePhaseHelp,
  onPhaseHelpChange
}) => {
  return (
    <div className="mt-8 space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <H3 className="text-purple-900 mb-2 flex items-center">
              <span className="mr-2">📊</span>
              Lifetime Expense Analysis
            </H3>
            <BodyBase className="text-purple-800">
              Advanced modeling of your expenses over 50 years with lifecycle adjustments
            </BodyBase>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleProjection}
            className="text-xs"
          >
            {showLifetimeProjection ? 'Hide Details' : 'Show Analysis'}
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-white border border-purple-200 rounded">
            <Mono weight="bold" className="text-lg text-purple-900">
              ${expenseModeling.averageIndexedExpenses.toLocaleString()}
            </Mono>
            <Caption className="text-purple-700">Average Indexed Expenses/Year</Caption>
          </div>

          <div className="text-center p-3 bg-white border border-purple-200 rounded">
            <Mono weight="bold" className="text-lg text-purple-900">
              ${expenseModeling.fireTargetAmortized.toLocaleString()}
            </Mono>
            <Caption className="text-purple-700">Amortized FIRE Target (25x)</Caption>
          </div>

          <div className="text-center p-3 bg-white border border-purple-200 rounded">
            <Label weight="bold" className="text-lg text-purple-900">
              {hasChildren ? '20 yrs' : 'N/A'}
            </Label>
            <Caption className="text-purple-700">Childcare Phase Duration</Caption>
          </div>
        </div>

        {/* Lifecycle Phases */}
        {showLifetimeProjection && (
          <div className="space-y-4">
            <div className="bg-white border border-purple-200 rounded p-4">
              <H4 className="text-purple-900 mb-3">Expense Phases Over Lifetime</H4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative p-3 bg-blue-50 rounded">
                  <div className="flex items-center justify-between">
                    <Label weight="medium" className="text-blue-900">Early Career</Label>
                    <button
                      onClick={() => onPhaseHelpChange(activePhaseHelp === 'earlyCareer' ? null : 'earlyCareer')}
                      className="text-blue-500 hover:text-blue-700 text-sm ml-1"
                      title="Why this spending level?"
                    >
                      ⓘ
                    </button>
                  </div>
                  <BodyBase className="text-blue-700">{expenseModeling.phaseBreakdown.earlyCareer.years} years</BodyBase>
                  <Caption className="text-blue-600">
                    ~${Math.round(expenseModeling.phaseBreakdown.earlyCareer.avgExpenses).toLocaleString()}/yr
                  </Caption>
                  <Caption weight="medium" className="text-blue-700 mt-1">100% baseline</Caption>
                  <PhaseHelpModal
                    phase="earlyCareer"
                    isVisible={activePhaseHelp === 'earlyCareer'}
                    onClose={() => onPhaseHelpChange(null)}
                  />
                </div>

                <div className="relative p-3 bg-green-50 rounded">
                  <div className="flex items-center justify-between">
                    <Label weight="medium" className="text-green-900">Mid Career</Label>
                    <button
                      onClick={() => onPhaseHelpChange(activePhaseHelp === 'midCareer' ? null : 'midCareer')}
                      className="text-green-500 hover:text-green-700 text-sm ml-1"
                      title="Why this spending level?"
                    >
                      ⓘ
                    </button>
                  </div>
                  <BodyBase className="text-green-700">{expenseModeling.phaseBreakdown.midCareer.years} years</BodyBase>
                  <Caption className="text-green-600">
                    ~${Math.round(expenseModeling.phaseBreakdown.midCareer.avgExpenses).toLocaleString()}/yr
                  </Caption>
                  <Caption weight="medium" className="text-green-700 mt-1">+10% increase</Caption>
                  <PhaseHelpModal
                    phase="midCareer"
                    isVisible={activePhaseHelp === 'midCareer'}
                    onClose={() => onPhaseHelpChange(null)}
                  />
                </div>

                <div className="relative p-3 bg-amber-50 rounded">
                  <div className="flex items-center justify-between">
                    <Label weight="medium" className="text-amber-900">Pre-Retirement</Label>
                    <button
                      onClick={() => onPhaseHelpChange(activePhaseHelp === 'preRetirement' ? null : 'preRetirement')}
                      className="text-amber-500 hover:text-amber-700 text-sm ml-1"
                      title="Why this spending level?"
                    >
                      ⓘ
                    </button>
                  </div>
                  <BodyBase className="text-amber-700">{expenseModeling.phaseBreakdown.preRetirement.years} years</BodyBase>
                  <Caption className="text-amber-600">
                    ~${Math.round(expenseModeling.phaseBreakdown.preRetirement.avgExpenses).toLocaleString()}/yr
                  </Caption>
                  <Caption weight="medium" className="text-amber-700 mt-1">+10% increase</Caption>
                  <PhaseHelpModal
                    phase="preRetirement"
                    isVisible={activePhaseHelp === 'preRetirement'}
                    onClose={() => onPhaseHelpChange(null)}
                  />
                </div>

                <div className="relative p-3 bg-purple-50 rounded">
                  <div className="flex items-center justify-between">
                    <Label weight="medium" className="text-purple-900">Retirement</Label>
                    <button
                      onClick={() => onPhaseHelpChange(activePhaseHelp === 'retirement' ? null : 'retirement')}
                      className="text-purple-500 hover:text-purple-700 text-sm ml-1"
                      title="Why this spending level?"
                    >
                      ⓘ
                    </button>
                  </div>
                  <BodyBase className="text-purple-700">{expenseModeling.phaseBreakdown.retirement.years} years</BodyBase>
                  <Caption className="text-purple-600">
                    ~${Math.round(expenseModeling.phaseBreakdown.retirement.avgExpenses).toLocaleString()}/yr
                  </Caption>
                  <Caption weight="medium" className="text-purple-700 mt-1">-25% decrease</Caption>
                  <PhaseHelpModal
                    phase="retirement"
                    isVisible={activePhaseHelp === 'retirement'}
                    onClose={() => onPhaseHelpChange(null)}
                  />
                </div>
              </div>
            </div>

            {/* Childcare Modeling */}
            {hasChildren && (
              <div className="bg-white border border-purple-200 rounded p-4">
                <H4 className="text-purple-900 mb-2 flex items-center">
                  <span className="mr-2">👶</span>
                  Childcare Lifecycle Modeling
                </H4>
                <div className="space-y-1">
                  <BodyBase className="text-purple-800">• <strong>Years 1-20:</strong> Full childcare costs included (~17% of expenses)</BodyBase>
                  <BodyBase className="text-purple-800">• <strong>Year 20+:</strong> Childcare costs removed as children become independent</BodyBase>
                  <BodyBase className="text-purple-800">• <strong>Impact:</strong> Reduces average lifetime expenses by ~$13,000/year</BodyBase>
                </div>
              </div>
            )}

            {/* Expense Timeline Visualization */}
            <div className="bg-white border border-purple-200 rounded p-4">
              <H4 className="text-purple-900 mb-3 flex items-center">
                <span className="mr-2">📈</span>
                Expense Timeline (Real Purchasing Power)
              </H4>
              <div className="mb-3 overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Timeline header */}
                  <div className="flex justify-between mb-1">
                    <MonoSmall color="secondary">Age:</MonoSmall>
                    <MonoSmall color="secondary">30</MonoSmall>
                    <MonoSmall color="secondary">40</MonoSmall>
                    <MonoSmall color="secondary">50</MonoSmall>
                    <MonoSmall color="secondary">60</MonoSmall>
                    <MonoSmall color="secondary">70</MonoSmall>
                    <MonoSmall color="secondary">80</MonoSmall>
                  </div>

                  {/* Expense line */}
                  <div className="flex items-center mb-1">
                    <MonoSmall className="w-12" color="secondary">$${Math.round(expenseModeling.averageIndexedExpenses / 1000)}k:</MonoSmall>
                    <div className="flex-1 relative h-6 bg-gray-100 rounded">
                      {/* Phase indicators */}
                      <div className="absolute top-0 left-0 w-[20%] h-full bg-blue-200 rounded-l"></div>
                      <div className="absolute top-0 left-[20%] w-[20%] h-full bg-green-200"></div>
                      <div className="absolute top-0 left-[40%] w-[30%] h-full bg-amber-200"></div>
                      <div className="absolute top-0 left-[70%] w-[30%] h-full bg-purple-200 rounded-r"></div>

                      {/* Expense level indicators */}
                      {expenseModeling.lifetimeProjection
                        .filter((_, i) => i % 5 === 0) // Sample every 5 years
                        .slice(0, 10) // First 50 years
                        .map((point, index) => {
                          const left = (index * 10) + '%';
                          const height = Math.max(2, (point.realExpenses / expenseModeling.averageIndexedExpenses) * 20);
                          return (
                            <div
                              key={index}
                              className="absolute bg-gray-700 rounded-full"
                              style={{
                                left,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '2px',
                                height: `${Math.min(height, 20)}px`
                              }}
                            />
                          );
                        })}

                      {/* Childcare drop indicator */}
                      {hasChildren && (
                        <div
                          className="absolute top-0 bg-red-400 w-0.5 h-full opacity-75"
                          style={{ left: '40%' }}
                          title="Childcare costs end"
                        />
                      )}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex justify-between mt-1">
                    <Caption className="text-blue-600 text-[10px]">Early</Caption>
                    <Caption className="text-green-600 text-[10px]">Mid</Caption>
                    <Caption className="text-amber-600 text-[10px]">Pre-Retire</Caption>
                    <Caption className="text-purple-600 text-[10px]">Retirement</Caption>
                    {hasChildren && <Caption className="text-red-500 text-[10px]">↑ Kids independent</Caption>}
                  </div>
                </div>
              </div>
              <Caption className="text-purple-700">
                Shows real purchasing power over time. Bars indicate expense levels relative to lifetime average.
              </Caption>
            </div>

            {/* 25x Rule Explanation */}
            <div className="bg-white border border-purple-200 rounded p-4">
              <H4 className="text-purple-900 mb-2 flex items-center">
                <span className="mr-2">🎯</span>
                Amortized 25x Rule
              </H4>
              <div className="space-y-1">
                <BodyBase className="text-purple-800">Instead of using current expenses (${annualExpenses.toLocaleString()}), we calculate your FIRE target based on:</BodyBase>
                <BodyBase className="text-purple-800">• <strong>Average indexed expenses</strong> over 50 years: ${expenseModeling.averageIndexedExpenses.toLocaleString()}</BodyBase>
                <BodyBase className="text-purple-800">• <strong>Accounts for lifecycle changes:</strong> childcare ending, retirement reductions, inflation</BodyBase>
                <BodyBase className="text-purple-800">• <strong>More accurate target:</strong> ${expenseModeling.fireTargetAmortized.toLocaleString()} vs ${(annualExpenses * 25).toLocaleString()} (simple)</BodyBase>
                <BodyBase className="text-purple-800">• <strong>Inflation is already priced in:</strong> The 25x rule assumes your portfolio grows with inflation, so we use real (inflation-adjusted) expense averages</BodyBase>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};