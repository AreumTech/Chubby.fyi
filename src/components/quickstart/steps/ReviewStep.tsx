/**
 * ReviewStep - Final Review and Confirmation
 *
 * Shows complete plan summary, generated events, and final confirmation.
 * Provides last chance to make adjustments before creating the scenario.
 */

import React from 'react';
import { Button } from '@/components/ui';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { QuickstartInputs, QuickstartResults, generateScenarioSummary } from '@/services/quickstartService';
import { H2, H3, H4, Body, BodyBase, Label, Caption, Mono, MonoSmall } from '@/components/ui/Typography';

interface ReviewStepProps {
  data: QuickstartInputs;
  results: QuickstartResults | null;
  isProcessing: boolean;
  onComplete: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  data,
  results,
  isProcessing,
  onComplete
}) => {
  if (isProcessing) {
    return (
      <div className="relative h-96">
        <LoadingOverlay isVisible={true} message="Generating your FIRE plan..." />
        <div className="text-center pt-24">
          <H3 className="mb-3">🔥</H3>
          <Body color="secondary">
            Creating events, calculating projections, and preparing your simulation...
          </Body>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <H4 className="text-red-500 mb-3">⚠️</H4>
        <Body className="text-red-600">
          There was an error generating your FIRE plan. Please go back and try again.
        </Body>
      </div>
    );
  }

  const totalIncome = (data.annualSalary || 0) + (data.annualBonus || 0) + (data.otherIncome || 0);
  const netIncome = totalIncome - data.annualExpenses;

  const getFeasibilityBadge = (level: string) => {
    const badges = {
      achievable: { color: 'bg-green-100 text-green-800', icon: '✅', text: 'Very Achievable' },
      challenging: { color: 'bg-yellow-100 text-yellow-800', icon: '💪', text: 'Challenging' },
      difficult: { color: 'bg-orange-100 text-orange-800', icon: '⚠️', text: 'Difficult' },
      unrealistic: { color: 'bg-red-100 text-red-800', icon: '🚨', text: 'Unrealistic' }
    };
    const badge = badges[level as keyof typeof badges] || badges.achievable;
    return (
      <Caption as="span" className={`inline-flex items-center px-3 py-1 rounded-full font-medium ${badge.color}`}>
        <span className="mr-1">{badge.icon}</span>
        {badge.text}
      </Caption>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <H3 className="mb-3">🎉</H3>
        <H4 className="mb-2">
          Your FIRE Plan is Ready!
        </H4>
        <Body color="secondary">
          Review your plan below, then click &quot;Create My FIRE Plan&quot; to run the full simulation.
        </Body>
      </div>

      {/* Plan Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6 mb-8">
        <H4 className="mb-4 flex items-center">
          <span className="mr-2">📋</span>
          Plan Summary
        </H4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div className="text-center">
            <BodyBase color="secondary" className="mb-1">FIRE Target</BodyBase>
            <Mono weight="bold" className="text-lg text-blue-600">
              ${(results.retirementTarget ?? 0).toLocaleString()}
            </Mono>
          </div>
          <div className="text-center">
            <BodyBase color="secondary" className="mb-1">Required Savings Rate</BodyBase>
            <Mono weight="bold" className="text-lg text-green-600">
              {((results.requiredSavingsRate ?? 0) * 100).toFixed(1)}%
            </Mono>
          </div>
          <div className="text-center">
            <BodyBase color="secondary" className="mb-1">Years to FIRE</BodyBase>
            <Mono weight="bold" className="text-lg text-purple-600">
              {results.yearsToFire ?? 0} years
            </Mono>
          </div>
        </div>

        <div className="text-center mb-4">
          {getFeasibilityBadge(results.feasibilityLevel ?? 'challenging')}
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <Body align="center" className="text-gray-700">
            {generateScenarioSummary(results)}
          </Body>
        </div>
      </div>

      {/* Key Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Income & Expenses */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <H4 weight="semibold" className="mb-4 flex items-center">
            <span className="mr-2">💰</span>
            Income & Expenses
          </H4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <Body color="secondary">Annual Income:</Body>
              <Mono weight="semibold">${totalIncome.toLocaleString()}</Mono>
            </div>
            <div className="flex justify-between">
              <Body color="secondary">Annual Expenses:</Body>
              <Mono weight="semibold">${data.annualExpenses.toLocaleString()}</Mono>
            </div>
            <div className="flex justify-between border-t pt-2">
              <Body color="secondary">Available for Savings:</Body>
              <Mono weight="semibold" className="text-green-600">${netIncome.toLocaleString()}</Mono>
            </div>
          </div>
        </div>

        {/* Goal Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <H4 weight="semibold" className="mb-4 flex items-center">
            <span className="mr-2">🎯</span>
            FIRE Goal
          </H4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <Body color="secondary">Current Age:</Body>
              <Mono weight="semibold">{data.currentAge}</Mono>
            </div>
            <div className="flex justify-between">
              <Body color="secondary">Target Retirement Age:</Body>
              <Mono weight="semibold">{data.retirementAge}</Mono>
            </div>
            <div className="flex justify-between">
              <Body color="secondary">Safety Multiplier:</Body>
              <Mono weight="semibold">{data.safetyMultiplier}x</Mono>
            </div>
            <div className="flex justify-between border-t pt-2">
              <Body color="secondary">Monthly Contribution:</Body>
              <Mono weight="semibold" className="text-blue-600">
                ${Math.round(results.monthlyContribution ?? 0).toLocaleString()}
              </Mono>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Events Preview */}
      {results.events && results.events.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <H4 weight="semibold" className="mb-4 flex items-center">
            <span className="mr-2">📅</span>
            Generated Events ({results.events.length})
          </H4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {results.events.map((event: any, _index: number) => (
              <div key={_index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <Label weight="medium">{event.description || event.type}</Label>
                  {event.amount && (
                    <MonoSmall className="ml-2">${event.amount.toLocaleString()}</MonoSmall>
                  )}
                </div>
                <Caption color="tertiary" className="bg-gray-200 px-2 py-1 rounded">
                  {event.type}
                </Caption>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations & Warnings */}
      {((results.recommendations?.length ?? 0) > 0 || (results.warnings?.length ?? 0) > 0) && (
        <div className="space-y-4 mb-8">
          {(results.recommendations?.length ?? 0) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <H4 weight="semibold" className="text-green-900 mb-2 flex items-center">
                <span className="mr-2">💡</span>
                Recommendations
              </H4>
              <ul className="space-y-1">
                {results.recommendations?.map((rec: string, index: number) => (
                  <BodyBase as="li" key={index} className="text-green-800">• {rec}</BodyBase>
                ))}
              </ul>
            </div>
          )}

          {(results.warnings?.length ?? 0) > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <H4 weight="semibold" className="text-yellow-900 mb-2 flex items-center">
                <span className="mr-2">⚠️</span>
                Important Notes
              </H4>
              <ul className="space-y-1">
                {results.warnings?.map((warning: string, index: number) => (
                  <BodyBase as="li" key={index} className="text-yellow-800">• {warning}</BodyBase>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <H4 weight="semibold" className="text-blue-900 mb-2 flex items-center">
          <span className="mr-2">🚀</span>
          What Happens Next?
        </H4>
        <ul className="space-y-2">
          <BodyBase as="li" className="text-blue-800">• We&apos;ll create all the financial events for your plan</BodyBase>
          <BodyBase as="li" className="text-blue-800">• Run a Monte Carlo simulation with 1,000+ scenarios</BodyBase>
          <BodyBase as="li" className="text-blue-800">• Show you detailed projections and probability analysis</BodyBase>
          <BodyBase as="li" className="text-blue-800">• You can then customize, add events, or adjust your strategy</BodyBase>
        </ul>
      </div>

      {/* Completion Button */}
      <div className="text-center">
        <Button
          variant="primary"
          onClick={onComplete}
          disabled={isProcessing}
          className="px-8 py-3 text-lg"
        >
          🔥 Create My FIRE Plan
        </Button>
        <Caption color="tertiary" className="mt-2">
          This will add events to your timeline and run the simulation
        </Caption>
      </div>
    </div>
  );
};