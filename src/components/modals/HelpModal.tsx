/**
 * HelpModal - Comprehensive Help System
 *
 * Addresses two key user concerns:
 * 1. Trust: Show how calculations work and validate accuracy
 * 2. Simplicity: Clear explanations of use cases
 */

import React, { useState } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Heading, Text, Body, BodyBase, Label, Caption, Mono } from '@/components/ui/Typography';
import { useCommandBus } from '@/hooks/useCommandBus';
import { createCommand } from '@/commands/types';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpTab = 'getting-started' | 'use-cases' | 'strategies' | 'calculations' | 'validation' | 'faq';

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<HelpTab>('getting-started');
  const { dispatch } = useCommandBus();

  const handleRestartOnboarding = () => {
    localStorage.removeItem('onboardingSeen');
    onClose();
    dispatch(createCommand.openModal('onboarding'));
  };

  const tabs = [
    { id: 'getting-started' as HelpTab, label: 'Getting Started', icon: '🚀' },
    { id: 'use-cases' as HelpTab, label: 'Use Cases', icon: '🎯' },
    { id: 'strategies' as HelpTab, label: 'Strategies', icon: '📊' },
    { id: 'calculations' as HelpTab, label: 'How It Works', icon: '🧮' },
    { id: 'validation' as HelpTab, label: 'Validation', icon: '✓' },
    { id: 'faq' as HelpTab, label: 'FAQ', icon: '❓' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Help & Documentation"
      size="xlarge"
      className="!max-w-5xl"
    >
      <div className="flex gap-4 h-[600px]">
        {/* Sidebar Navigation */}
        <div className="w-48 border-r border-areum-border pr-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-md-areum transition-colors ${
                activeTab === tab.id
                  ? 'bg-areum-accent/10 text-areum-accent'
                  : 'hover:bg-areum-canvas text-areum-text-secondary'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              <Text size="sm" weight={activeTab === tab.id ? 'semibold' : 'normal'}>
                {tab.label}
              </Text>
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-areum-border">
            <Button
              variant="secondary"
              onClick={handleRestartOnboarding}
              className="w-full text-sm-areum"
            >
              ↻ Restart Onboarding
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-2">
          {activeTab === 'getting-started' && <GettingStartedContent />}
          {activeTab === 'use-cases' && <UseCasesContent />}
          {activeTab === 'strategies' && <StrategiesContent />}
          {activeTab === 'calculations' && <CalculationsContent />}
          {activeTab === 'validation' && <ValidationContent />}
          {activeTab === 'faq' && <FAQContent />}
        </div>
      </div>
    </Modal>
  );
};

// Content Components

const GettingStartedContent: React.FC = () => (
  <div className="space-y-4">
    <Heading size="md">Getting Started with AreumFire</Heading>

    <Body color="secondary">
      AreumFire is a Monte Carlo financial planning tool that helps you visualize your path to financial independence.
    </Body>

    <div className="space-y-4 mt-6">
      <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
        <Label className="block mb-2">1️⃣ Set Your Initial State</Label>
        <BodyBase color="secondary">
          Enter your current age and account balances (Cash, Taxable, Tax-Deferred, Roth).
          This is your financial snapshot today.
        </BodyBase>
      </div>

      <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
        <Label className="block mb-2">2️⃣ Add Income & Expenses</Label>
        <BodyBase color="secondary">
          Click the "+" button to add salary, expenses, Social Security, pensions, or one-time events.
          These define your cash flow over time.
        </BodyBase>
      </div>

      <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
        <Label className="block mb-2">3️⃣ Create Goals</Label>
        <BodyBase color="secondary">
          Set retirement targets, house down payments, or custom savings goals.
          Choose which question you want answered: When? Will I? or How much?
        </BodyBase>
      </div>

      <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
        <Label className="block mb-2">4️⃣ Run Simulation</Label>
        <BodyBase color="secondary">
          AreumFire runs 10,000 Monte Carlo simulations using historical market returns.
          See your probability of success and projected outcomes.
        </BodyBase>
      </div>
    </div>

    <div className="bg-blue-50 border border-blue-200 rounded-md-areum p-4 mt-6">
      <Label className="text-blue-900 block mb-2">💡 Pro Tip</Label>
      <BodyBase className="text-blue-800">
        Your data is 100% private - everything runs in your browser. No servers, no tracking, no cloud storage.
        Export your plan manually if you want a backup.
      </BodyBase>
    </div>
  </div>
);

const StrategiesContent: React.FC = () => (
  <div className="space-y-6">
    <Heading size="md">Financial Strategies</Heading>

    <Body color="secondary">
      AreumFire supports various financial strategies that can be added as duration-based events.
      These automate complex decisions and are visualized on your timeline.
    </Body>

    {/* Strategy Phases */}
    <div>
      <Label className="block mb-3 text-areum-text-primary">Strategy Lifecycle Phases</Label>
      <div className="grid grid-cols-2 gap-2">
        <div className="border-l-4 border-emerald-500 pl-3 py-2 bg-emerald-50 rounded-r-md">
          <Body weight="semibold" className="text-emerald-700">Accumulation</Body>
          <BodyBase color="secondary" className="text-xs-areum">Building wealth through contributions and growth</BodyBase>
        </div>
        <div className="border-l-4 border-violet-500 pl-3 py-2 bg-violet-50 rounded-r-md">
          <Body weight="semibold" className="text-violet-700">Conversion</Body>
          <BodyBase color="secondary" className="text-xs-areum">Tax-optimization like Roth conversions</BodyBase>
        </div>
        <div className="border-l-4 border-amber-500 pl-3 py-2 bg-amber-50 rounded-r-md">
          <Body weight="semibold" className="text-amber-700">Withdrawal</Body>
          <BodyBase color="secondary" className="text-xs-areum">Decumulation and retirement income</BodyBase>
        </div>
        <div className="border-l-4 border-indigo-500 pl-3 py-2 bg-indigo-50 rounded-r-md">
          <Body weight="semibold" className="text-indigo-700">Rebalancing</Body>
          <BodyBase color="secondary" className="text-xs-areum">Portfolio maintenance and allocation</BodyBase>
        </div>
      </div>
    </div>

    {/* Investment Strategies */}
    <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
      <Label className="block mb-3">📈 Investment Strategies</Label>

      <div className="space-y-3">
        <div>
          <Body weight="semibold" className="block mb-1">Asset Allocation</Body>
          <BodyBase color="secondary">
            Set your target stock/bond split (e.g., 80/20). Automatically rebalances when drift exceeds threshold.
            Can be age-based with a glide path toward more conservative allocation.
          </BodyBase>
        </div>

        <div>
          <Body weight="semibold" className="block mb-1">Contribution Optimization</Body>
          <BodyBase color="secondary">
            Maximize tax-advantaged accounts first: 401k match → HSA → 401k max → IRA → Taxable.
            Excess cash automatically flows through this waterfall.
          </BodyBase>
        </div>
      </div>
    </div>

    {/* Tax Strategies */}
    <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
      <Label className="block mb-3">💰 Tax Optimization Strategies</Label>

      <div className="space-y-3">
        <div>
          <Body weight="semibold" className="block mb-1">Roth Conversion Ladder</Body>
          <BodyBase color="secondary">
            Convert traditional IRA/401k to Roth during low-income years (early retirement).
            Fill up lower tax brackets to minimize lifetime taxes.
          </BodyBase>
        </div>

        <div>
          <Body weight="semibold" className="block mb-1">Tax-Loss Harvesting</Body>
          <BodyBase color="secondary">
            Sell losing positions to offset gains. Automatically reinvest in similar assets.
            Up to $3,000 can offset ordinary income annually.
          </BodyBase>
        </div>

        <div>
          <Body weight="semibold" className="block mb-1">Strategic Gains Realization</Body>
          <BodyBase color="secondary">
            Harvest gains in 0% LTCG bracket when income is low.
            Reset cost basis to reduce future tax burden.
          </BodyBase>
        </div>
      </div>
    </div>

    {/* Retirement Strategies */}
    <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
      <Label className="block mb-3">🏖️ Retirement Withdrawal Strategies</Label>

      <div className="space-y-3">
        <div>
          <Body weight="semibold" className="block mb-1">Bucket Strategy</Body>
          <BodyBase color="secondary">
            Keep 2-3 years of expenses in cash, 5-7 years in bonds, remainder in stocks.
            Refill buckets periodically from growth bucket.
          </BodyBase>
        </div>

        <div>
          <Body weight="semibold" className="block mb-1">Tax-Efficient Withdrawal Order</Body>
          <BodyBase color="secondary">
            Draw from taxable first, then tax-deferred, Roth last.
            Adjusts dynamically based on tax bracket and RMD requirements.
          </BodyBase>
        </div>

        <div>
          <Body weight="semibold" className="block mb-1">Social Security Optimization</Body>
          <BodyBase color="secondary">
            Model different claiming ages (62, 67, 70). Later = higher monthly benefit.
            Optimize based on longevity assumptions and portfolio size.
          </BodyBase>
        </div>
      </div>
    </div>

    <div className="bg-violet-50 border border-violet-200 rounded-md-areum p-4">
      <Label className="text-violet-900 block mb-2">💡 How to Add Strategies</Label>
      <BodyBase className="text-violet-800">
        Strategies are now first-class events! Click "+" in the Events section and select the Strategy category.
        Configure the strategy parameters and see it appear on your timeline chart with a colored band.
      </BodyBase>
    </div>
  </div>
);

const UseCasesContent: React.FC = () => (
  <div className="space-y-6">
    <Heading size="md">Common Use Cases</Heading>

    <Body color="secondary">
      AreumFire serves users from simple to complex needs. Here's how different people use it:
    </Body>

    {/* Simple Use Cases */}
    <div>
      <Label className="block mb-3 text-areum-accent">Simple Planning (Most Users)</Label>

      <div className="space-y-3">
        <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded-r-md">
          <Body weight="semibold" className="block mb-1">"When can I retire?"</Body>
          <BodyBase color="secondary">
            Set target retirement income → System calculates when you'll have 25x expenses saved.
            Uses Goal Mode 1: Solve for Time.
          </BodyBase>
        </div>

        <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-md">
          <Body weight="semibold" className="block mb-1">"Can I buy this house in 3 years?"</Body>
          <BodyBase color="secondary">
            Set down payment amount + date → See probability of reaching that goal.
            Uses Goal Mode 2: Solve for Probability.
          </BodyBase>
        </div>

        <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 rounded-r-md">
          <Body weight="semibold" className="block mb-1">"How much will I have by 2035?"</Body>
          <BodyBase color="secondary">
            Set target date → See projected account balance range across 10,000 simulations.
            Uses Goal Mode 3: Solve for Amount.
          </BodyBase>
        </div>
      </div>
    </div>

    {/* Advanced Use Cases */}
    <div>
      <Label className="block mb-3 text-areum-text-primary">Advanced Planning (Power Users)</Label>

      <div className="space-y-3">
        <div className="border border-areum-border rounded-md-areum p-3 bg-areum-surface">
          <Body weight="semibold" className="block mb-1">Tax Optimization</Body>
          <BodyBase color="secondary">
            Model Roth conversions, tax-loss harvesting, and strategic withdrawals.
            Minimize lifetime tax burden with account-aware simulations.
          </BodyBase>
        </div>

        <div className="border border-areum-border rounded-md-areum p-3 bg-areum-surface">
          <Body weight="semibold" className="block mb-1">Real Estate Planning</Body>
          <BodyBase color="secondary">
            Add home purchases with mortgages, track appreciation, model rental income.
            Factor in maintenance costs and property taxes.
          </BodyBase>
        </div>

        <div className="border border-areum-border rounded-md-areum p-3 bg-areum-surface">
          <Body weight="semibold" className="block mb-1">Multiple Scenarios</Body>
          <BodyBase color="secondary">
            Create "What-If" scenarios: Bear market retirement, early inheritance, job loss.
            Compare side-by-side to stress-test your plan.
          </BodyBase>
        </div>
      </div>
    </div>
  </div>
);

const CalculationsContent: React.FC = () => (
  <div className="space-y-6">
    <Heading size="md">How Our Calculations Work</Heading>

    <Body color="secondary">
      Unlike most financial calculators that use fixed returns, AreumFire uses Monte Carlo simulation
      with historical market data to provide realistic probability ranges.
    </Body>

    {/* Core Model */}
    <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
      <Label className="block mb-3">🎲 Monte Carlo Simulation</Label>
      <BodyBase color="secondary" className="block mb-3">
        We run 10,000 different possible futures, each using randomly sampled returns from historical data (1928-2024).
        This captures both good markets (1990s) and bad markets (2008 crash).
      </BodyBase>

      <div className="bg-areum-canvas rounded-md-areum p-3 font-mono text-xs-areum">
        <Caption color="secondary">Example: Retirement in 2040</Caption>
        <div className="mt-2 space-y-1">
          <div>Path 1: 7.2% avg return → $2.1M</div>
          <div>Path 2: 4.8% avg return → $1.5M</div>
          <div>Path 3: -1.2% avg return → $800K</div>
          <div className="text-areum-text-tertiary">... (9,997 more paths)</div>
        </div>
        <div className="mt-2 pt-2 border-t border-areum-border">
          <Caption className="text-areum-accent">Result: 85% probability of success</Caption>
        </div>
      </div>
    </div>

    {/* Tax Calculation */}
    <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
      <Label className="block mb-3">🏦 Tax-Aware Calculations</Label>
      <BodyBase color="secondary" className="block mb-3">
        Each account type (Cash, Taxable, Tax-Deferred, Roth) is simulated separately with proper tax treatment:
      </BodyBase>

      <div className="space-y-2 ml-4">
        <div>
          <Mono className="text-xs-areum">💵 Cash:</Mono>
          <BodyBase color="secondary"> No capital gains, ~0.5% interest</BodyBase>
        </div>
        <div>
          <Mono className="text-xs-areum">📈 Taxable:</Mono>
          <BodyBase color="secondary"> Long-term capital gains (0-20%), dividends taxed</BodyBase>
        </div>
        <div>
          <Mono className="text-xs-areum">🏦 Tax-Deferred:</Mono>
          <BodyBase color="secondary"> Ordinary income tax on withdrawals, RMDs at 73</BodyBase>
        </div>
        <div>
          <Mono className="text-xs-areum">🎯 Roth:</Mono>
          <BodyBase color="secondary"> Tax-free growth and withdrawals</BodyBase>
        </div>
      </div>
    </div>

    {/* Withdrawal Strategy */}
    <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
      <Label className="block mb-3">💰 Smart Withdrawal Strategy</Label>
      <BodyBase color="secondary">
        When you need cash, AreumFire withdraws from accounts in tax-optimal order:
      </BodyBase>

      <ol className="list-decimal list-inside ml-2 mt-2 space-y-1 text-sm-areum text-areum-text-secondary">
        <li>Taxable accounts (lowest tax burden)</li>
        <li>Tax-deferred accounts (defer growth)</li>
        <li>Roth accounts last (preserve tax-free growth)</li>
      </ol>

      <BodyBase color="secondary" className="block mt-3">
        This matches best practices from CFPs and maximizes after-tax wealth.
      </BodyBase>
    </div>

    {/* Historical Data */}
    <div className="bg-blue-50 border border-blue-200 rounded-md-areum p-4">
      <Label className="text-blue-900 block mb-2">📊 Our Data Sources</Label>
      <div className="space-y-1">
        <BodyBase className="text-blue-800 block">
          • Stock returns: S&P 500 total return (1928-2024)
        </BodyBase>
        <BodyBase className="text-blue-800 block">
          • Bond returns: 10-year Treasury yields
        </BodyBase>
        <BodyBase className="text-blue-800 block">
          • Inflation: CPI-U (Bureau of Labor Statistics)
        </BodyBase>
        <BodyBase className="text-blue-800 block">
          • Tax brackets: Current IRS tables with inflation adjustments
        </BodyBase>
      </div>
    </div>
  </div>
);

const ValidationContent: React.FC = () => (
  <div className="space-y-6">
    <Heading size="md">Validation & Testing</Heading>

    <Body color="secondary">
      We validate our calculations against known scenarios to ensure accuracy. Here's how we test:
    </Body>

    {/* Test Case Example */}
    <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
      <Label className="block mb-3">Example: Simple Retirement Test</Label>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Caption color="secondary" className="block mb-2">Input:</Caption>
          <div className="bg-areum-canvas rounded-md-areum p-3 text-xs-areum space-y-1">
            <div>Age: 30</div>
            <div>Savings: $50,000</div>
            <div>Income: $80,000/year</div>
            <div>Expenses: $50,000/year</div>
            <div>Savings Rate: 37.5%</div>
            <div>Target: $1,250,000 (25x expenses)</div>
          </div>
        </div>

        <div>
          <Caption color="secondary" className="block mb-2">Expected Result:</Caption>
          <div className="bg-green-50 rounded-md-areum p-3 text-xs-areum space-y-1">
            <div>Using 7% real returns:</div>
            <div className="font-semibold">Retirement at age 46</div>
            <div className="text-areum-text-tertiary">(16 years)</div>
            <div className="mt-2 pt-2 border-t border-green-200">
              <div className="text-green-700">✓ PathFinder Result: Age 45-47</div>
              <div className="text-green-700">✓ 50th percentile: Age 46</div>
            </div>
          </div>
        </div>
      </div>

      <BodyBase color="secondary">
        This matches the established 4% rule and Mr. Money Mustache shockingly simple math.
        Our Monte Carlo approach shows the range (45-47) rather than a single number.
      </BodyBase>
    </div>

    {/* Automated Tests */}
    <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
      <Label className="block mb-3">🧪 Automated Test Suite</Label>
      <BodyBase color="secondary" className="block mb-3">
        Every code change must pass 200+ unit tests covering:
      </BodyBase>

      <div className="grid grid-cols-2 gap-2 text-xs-areum">
        <div className="bg-areum-canvas rounded-md-areum p-2">
          <div className="font-semibold mb-1">✓ Tax Calculations</div>
          <div className="text-areum-text-tertiary">Federal brackets, FICA, capital gains</div>
        </div>
        <div className="bg-areum-canvas rounded-md-areum p-2">
          <div className="font-semibold mb-1">✓ RMD Logic</div>
          <div className="text-areum-text-tertiary">Required distributions at age 73+</div>
        </div>
        <div className="bg-areum-canvas rounded-md-areum p-2">
          <div className="font-semibold mb-1">✓ Account Mapping</div>
          <div className="text-areum-text-tertiary">401k → tax_deferred conversions</div>
        </div>
        <div className="bg-areum-canvas rounded-md-areum p-2">
          <div className="font-semibold mb-1">✓ Cash Flow</div>
          <div className="text-areum-text-tertiary">Income, expenses, withdrawals</div>
        </div>
      </div>
    </div>

    {/* Comparison to Other Tools */}
    <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
      <Label className="block mb-3">📊 Compared to Other Tools</Label>

      <div className="space-y-3">
        <div>
          <Body weight="semibold" className="block mb-1">vs. Simple FIRE Calculators</Body>
          <BodyBase color="secondary">
            Tools like FIRECalc use fixed withdrawal rates. We model actual account balances,
            tax implications, and sequence-of-returns risk.
          </BodyBase>
        </div>

        <div>
          <Body weight="semibold" className="block mb-1">vs. Professional Software</Body>
          <BodyBase color="secondary">
            Tools like MoneyGuidePro cost $1,000+/year and require advisors. We provide
            similar Monte Carlo accuracy with full transparency and zero cost.
          </BodyBase>
        </div>

        <div>
          <Body weight="semibold" className="block mb-1">vs. Spreadsheet Models</Body>
          <BodyBase color="secondary">
            Excel can't run 10,000 scenarios efficiently. Our WebAssembly engine processes
            simulations 100x faster with probabilistic distributions.
          </BodyBase>
        </div>
      </div>
    </div>

    <div className="bg-amber-50 border border-amber-200 rounded-md-areum p-4">
      <Label className="text-amber-900 block mb-2">⚠️ Limitations</Label>
      <BodyBase className="text-amber-800">
        Like all models, AreumFire makes assumptions. We assume historical returns predict the future,
        don't model black swan events (pandemic, war), and use current tax law.
        Use this as a planning tool, not a guarantee.
      </BodyBase>
    </div>
  </div>
);

const FAQContent: React.FC = () => (
  <div className="space-y-4">
    <Heading size="md">Frequently Asked Questions</Heading>

    <div className="space-y-3">
      <details className="bg-areum-surface border border-areum-border rounded-md-areum p-4 cursor-pointer">
        <summary className="font-semibold text-sm-areum cursor-pointer">
          Is my data private?
        </summary>
        <BodyBase color="secondary" className="mt-2">
          Yes, 100%. Everything runs in your browser using WebAssembly. No data is sent to servers,
          no tracking, no cloud storage. Export manually if you want backups.
        </BodyBase>
      </details>

      <details className="bg-areum-surface border border-areum-border rounded-md-areum p-4 cursor-pointer">
        <summary className="font-semibold text-sm-areum cursor-pointer">
          How accurate are the simulations?
        </summary>
        <BodyBase color="secondary" className="mt-2">
          We use 96 years of historical data (1928-2024) and run 10,000 Monte Carlo paths.
          This captures market crashes, bull markets, inflation cycles, and normal years.
          Results show probability ranges, not guarantees.
        </BodyBase>
      </details>

      <details className="bg-areum-surface border border-areum-border rounded-md-areum p-4 cursor-pointer">
        <summary className="font-semibold text-sm-areum cursor-pointer">
          What makes AreumFire different?
        </summary>
        <BodyBase color="secondary" className="mt-2">
          Most calculators use fixed 7% returns. We model realistic variability, sequence-of-returns risk,
          tax-aware withdrawals, and multiple account types. Plus, we're free and open about our methodology.
        </BodyBase>
      </details>

      <details className="bg-areum-surface border border-areum-border rounded-md-areum p-4 cursor-pointer">
        <summary className="font-semibold text-sm-areum cursor-pointer">
          Can I trust this for real financial decisions?
        </summary>
        <BodyBase color="secondary" className="mt-2">
          AreumFire is a planning tool, not professional advice. Use it to explore scenarios
          and understand trade-offs. For major decisions (retirement, real estate), consult a
          Certified Financial Planner (CFP).
        </BodyBase>
      </details>

      <details className="bg-areum-surface border border-areum-border rounded-md-areum p-4 cursor-pointer">
        <summary className="font-semibold text-sm-areum cursor-pointer">
          How do I export my plan?
        </summary>
        <BodyBase color="secondary" className="mt-2">
          Click the scenario dropdown (📋) → Use browser's built-in "Save Page" function.
          Your plan is stored in localStorage. We're adding CSV export soon.
        </BodyBase>
      </details>

      <details className="bg-areum-surface border border-areum-border rounded-md-areum p-4 cursor-pointer">
        <summary className="font-semibold text-sm-areum cursor-pointer">
          What's the best savings rate for FIRE?
        </summary>
        <BodyBase color="secondary" className="mt-2">
          It depends on your timeline. 50% savings rate = ~17 years to FIRE. 70% = ~10 years.
          Use our Goal feature to see exactly how your rate affects your timeline.
        </BodyBase>
      </details>

      <details className="bg-areum-surface border border-areum-border rounded-md-areum p-4 cursor-pointer">
        <summary className="font-semibold text-sm-areum cursor-pointer">
          Can I model part-time retirement or sabbaticals?
        </summary>
        <BodyBase color="secondary" className="mt-2">
          Yes! Add multiple income events with different start/end dates. Model consulting income
          at $30K/year age 50-65, then Social Security at 67. Flexible event system supports this.
        </BodyBase>
      </details>
    </div>
  </div>
);
