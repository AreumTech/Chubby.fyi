/**
 * WelcomeStep - Introduction to the FIRE Quickstart Wizard
 *
 * Enhanced to show:
 * 1. Simple use cases (what questions we answer)
 * 2. Trust indicators (Monte Carlo, validation)
 * 3. Clear expectations (what we'll cover, how long)
 */

import React from 'react';
import { Button } from '@/components/ui';
import { H3, H4, BodyBase, Caption, Label, Text } from '@/components/ui/Typography';

interface WelcomeStepProps {
  onSkipToAdvanced: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  onSkipToAdvanced
}) => {
  return (
    <div className="text-center max-w-2xl mx-auto px-4">
      {/* Hero Section */}
      <div className="mb-6 md:mb-8">
        <div className="text-4xl mb-3">🔥</div>
        <H3 className="mb-3">
          Welcome to Your FIRE Journey
        </H3>
        <BodyBase color="secondary">
          We&apos;ll help you answer the most important question:
          <strong className="block mt-1 text-base-areum text-areum-text-primary">
            "When can I retire?"
          </strong>
        </BodyBase>
      </div>

      {/* Simple Questions We Answer */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 md:p-5 mb-6 md:mb-8">
        <H4 as="h2" weight="semibold" className="mb-3">
          What You&apos;ll Get
        </H4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
          <div className="bg-white rounded-md-areum p-3 border border-areum-border">
            <div className="text-xl mb-1">⏱️</div>
            <Label as="h3" className="block mb-1">Your FIRE Date</Label>
            <Caption color="secondary">"Age 47 (85% likely)"</Caption>
          </div>
          <div className="bg-white rounded-md-areum p-3 border border-areum-border">
            <div className="text-xl mb-1">💰</div>
            <Label as="h3" className="block mb-1">Target Wealth</Label>
            <Caption color="secondary">"$1.2M to retire safely"</Caption>
          </div>
          <div className="bg-white rounded-md-areum p-3 border border-areum-border">
            <div className="text-xl mb-1">📊</div>
            <Label as="h3" className="block mb-1">Success Odds</Label>
            <Caption color="secondary">"10,000 scenarios tested"</Caption>
          </div>
        </div>
      </div>

      {/* What We'll Cover - Simplified & Visual */}
      <div className="mb-6 md:mb-8">
        <H4 as="h2" weight="semibold" className="mb-4">
          Just 4 Quick Questions
        </H4>
        <div className="flex justify-center items-center gap-2 md:gap-3 mb-2">
          <div className="flex flex-col items-center flex-1 max-w-[100px]">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl mb-2">💰</div>
            <Caption color="secondary" className="text-center">Income</Caption>
          </div>
          <div className="text-areum-text-tertiary">→</div>
          <div className="flex flex-col items-center flex-1 max-w-[100px]">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl mb-2">🏠</div>
            <Caption color="secondary" className="text-center">Expenses</Caption>
          </div>
          <div className="text-areum-text-tertiary">→</div>
          <div className="flex flex-col items-center flex-1 max-w-[100px]">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-xl mb-2">💵</div>
            <Caption color="secondary" className="text-center">Savings</Caption>
          </div>
          <div className="text-areum-text-tertiary">→</div>
          <div className="flex flex-col items-center flex-1 max-w-[100px]">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-xl mb-2">🎯</div>
            <Caption color="secondary" className="text-center">Goal</Caption>
          </div>
        </div>
        <Caption color="tertiary" className="block">
          Then we&apos;ll run 10,000 simulations to show your path to FIRE
        </Caption>
      </div>

      {/* Why You Can Trust This */}
      <div className="bg-white border border-areum-border rounded-lg p-4 md:p-5 mb-6 md:mb-8">
        <H4 as="h2" weight="semibold" className="mb-3 text-areum-text-primary">
          Why You Can Trust These Results
        </H4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-base">🎲</div>
              <Label as="h3">Monte Carlo</Label>
            </div>
            <Caption color="secondary">
              10,000 simulations using 96 years of real market data (1928-2024)
            </Caption>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-base">✓</div>
              <Label as="h3">Validated</Label>
            </div>
            <Caption color="secondary">
              Matches proven FIRE math within 2% (Mr. Money Mustache, Trinity Study)
            </Caption>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-base">🏦</div>
              <Label as="h3">Tax-Aware</Label>
            </div>
            <Caption color="secondary">
              Accounts for capital gains, RMDs, and optimal withdrawal strategies
            </Caption>
          </div>
        </div>
      </div>

      {/* Smart Features - Compact */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left text-sm-areum">
          <div className="flex items-start gap-2">
            <div className="text-base">🧮</div>
            <div>
              <Caption weight="semibold" className="block mb-0.5">25x Rule Built-In</Caption>
              <Caption color="secondary">Automatic FIRE target calculation</Caption>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="text-base">⚡</div>
            <div>
              <Caption weight="semibold" className="block mb-0.5">Instant Feedback</Caption>
              <Caption color="secondary">See if your plan is realistic</Caption>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="text-base">🔧</div>
            <div>
              <Caption weight="semibold" className="block mb-0.5">Fully Customizable</Caption>
              <Caption color="secondary">Fine-tune later in full app</Caption>
            </div>
          </div>
        </div>
      </div>

      {/* Time Estimate */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-center space-x-2">
          <div className="text-blue-600">⏱️</div>
          <Label weight="medium" className="text-blue-800">
            Estimated time: 5-10 minutes
          </Label>
        </div>
      </div>


      {/* Alternative for Advanced Users */}
      <div className="border-t border-gray-200 pt-4 md:pt-6">
        <BodyBase color="secondary" className="mb-3">
          Already familiar with financial planning?
        </BodyBase>
        <Button
          variant="secondary"
          onClick={onSkipToAdvanced}
          className="text-sm mobile-button w-full md:w-auto"
        >
          Skip to Advanced Setup
        </Button>
      </div>
    </div>
  );
};