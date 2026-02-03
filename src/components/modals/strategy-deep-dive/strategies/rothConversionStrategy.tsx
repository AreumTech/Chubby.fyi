import React from 'react';
import { StrategyContent } from '../strategyContentDefinitions';
import { H3, H4, Body, BodyBase, Label } from '@/components/ui/Typography';

export const rothConversionStrategyContent: StrategyContent = {
  title: 'Roth Conversion Strategy',
  subtitle: 'Plan Roth IRA conversions to lock in lower tax rates and reduce future RMDs',
  difficulty: 'Advanced',
  tabs: [
    {
      name: 'Roth Conversion Strategy',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Education */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <H3>What Is a Roth Conversion?</H3>
              </div>
              <Body color="secondary" className="mb-4 leading-relaxed">
                A Roth conversion is the process of moving funds from a pre-tax retirement account
                (like a Traditional IRA or 401k) to a post-tax Roth IRA. You pay ordinary income tax
                on the converted amount today in exchange for tax-free growth and tax-free
                withdrawals in the future.
              </Body>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <H4 className="text-indigo-900 mb-2">Key Benefits:</H4>
                <ul className="text-indigo-800 space-y-1">
                  <BodyBase as="li">• Pay taxes at today's (potentially lower) rates</BodyBase>
                  <BodyBase as="li">• All future growth and withdrawals are 100% tax-free</BodyBase>
                  <BodyBase as="li">• Reduces future Required Minimum Distributions (RMDs)</BodyBase>
                  <BodyBase as="li">• Creates tax diversification for retirement income</BodyBase>
                </ul>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <H3>The "Bracket Fill" Strategy</H3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                    <Label weight="bold">1</Label>
                  </div>
                  <div>
                    <H4>Estimate Income</H4>
                    <BodyBase color="secondary">Project your total taxable income for the current year, without any conversion.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                    <Label weight="bold">2</Label>
                  </div>
                  <div>
                    <H4>Identify Tax Bracket "Room"</H4>
                    <BodyBase color="secondary">Determine how much room you have left in your current (or a targeted) tax bracket.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                    <Label weight="bold">3</Label>
                  </div>
                  <div>
                    <H4>Convert the Difference</H4>
                    <BodyBase color="secondary">Convert just enough from your pre-tax account to "fill up" that bracket, locking in that rate.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                    <Label weight="bold">4</Label>
                  </div>
                  <div>
                    <H4>Pay the Tax Bill</H4>
                    <BodyBase color="secondary">Set aside cash (ideally from a non-retirement account) to pay the income tax on the converted amount.</BodyBase>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <H3>Critical Rules & Considerations</H3>
              </div>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <H4 className="text-red-900 mb-2">⚠️ Irreversible Action</H4>
                  <BodyBase className="text-red-800">Once you convert funds to a Roth, you cannot undo it. This is a permanent decision.</BodyBase>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <H4 className="text-yellow-900 mb-2">⏱️ 5-Year Rule for Withdrawals</H4>
                  <BodyBase className="text-yellow-800">Each conversion has its own 5-year waiting period before the converted principal can be withdrawn penalty-free (if under age 59½).</BodyBase>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <H4 className="text-orange-900 mb-2">🏥 Potential Medicare (IRMAA) Impact</H4>
                  <BodyBase className="text-orange-800">A large conversion increases your Adjusted Gross Income (AGI), which can trigger higher Medicare Part B and D premiums two years later.</BodyBase>
                </div>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <H3 className="text-blue-900 mb-4">📊 Real-World Example (2024)</H3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Scenario: Married Couple, age 60</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Other Income (pension, etc.):</BodyBase>
                      <BodyBase weight="medium">$60,000</BodyBase>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Standard Deduction (MFJ):</BodyBase>
                      <BodyBase weight="medium">-$29,200</BodyBase>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <BodyBase color="secondary" weight="semibold">Taxable Income (Before):</BodyBase>
                      <BodyBase weight="medium">$30,800</BodyBase>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">The "Bracket Fill" Action</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Target Bracket:</BodyBase>
                      <BodyBase weight="medium">Top of 12% Bracket</BodyBase>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">12% Bracket Max Income (MFJ):</BodyBase>
                      <BodyBase weight="medium">$94,300</BodyBase>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Current Taxable Income:</BodyBase>
                      <BodyBase weight="medium">-$30,800</BodyBase>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <BodyBase className="text-indigo-900" weight="bold">Optimal Conversion Amount:</BodyBase>
                      <BodyBase className="text-indigo-600" weight="bold">$63,500</BodyBase>
                    </div>
                  </div>
                </div>
                <div className="bg-green-100 rounded-lg p-4">
                  <H4 className="text-green-900 mb-3">Tax Impact</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase className="text-green-800">Tax Bill (Before):</BodyBase>
                      <BodyBase weight="medium">$3,232</BodyBase>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase className="text-green-800">Tax Bill (After Conversion):</BodyBase>
                      <BodyBase weight="medium">$10,852</BodyBase>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2">
                      <BodyBase className="text-red-700" weight="bold">Immediate Tax Cost:</BodyBase>
                      <BodyBase className="text-red-600" weight="bold">$7,620</BodyBase>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase className="text-green-900" weight="bold">Long-Term Benefit:</BodyBase>
                      <BodyBase className="text-green-600" weight="bold">$63,500 now grows TAX-FREE</BodyBase>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <H3 className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                When to Consider Conversions
              </H3>
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <H4 className="text-purple-900 mb-2">🎯 Low-Income Years</H4>
                  <BodyBase className="text-purple-800">Years when your income is temporarily lower (career transition, sabbatical) provide excellent conversion opportunities.</BodyBase>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">⏰ Early Retirement Window</H4>
                  <BodyBase className="text-blue-800">Between retirement and Social Security (typically ages 60-70), you may have years of lower income ideal for conversions.</BodyBase>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <H4 className="text-green-900 mb-2">📊 Before RMDs Begin</H4>
                  <BodyBase className="text-green-800">Convert before age 73 to reduce future Required Minimum Distributions and their tax impact.</BodyBase>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]
};
