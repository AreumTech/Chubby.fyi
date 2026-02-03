import React from 'react';
import { StrategyContent } from '../strategyContentDefinitions';
import { H3, H4, Body, BodyBase, Label, Caption, FormLabel } from '@/components/ui/Typography';

export const retirementWithdrawalStrategyContent: StrategyContent = {
  title: 'Retirement Budget & Expense Planning',
  subtitle: 'Plan your retirement expenses and ensure your portfolio can support your lifestyle',
  difficulty: 'Intermediate',
  tabs: [
    {
      name: 'Complete Retirement Guide',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Education */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <H3>Withdrawal Strategy Options</H3>
              </div>
              <Body className="mb-4 leading-relaxed" color="secondary">
                Your withdrawal strategy determines which accounts you tap first to fund retirement expenses. Different strategies optimize for different goals: tax efficiency, simplicity, or preservation.
              </Body>
            </div>

            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <H4 className="text-green-900 mb-2">✅ Tax-Efficient Order (Recommended)</H4>
                <div className="space-y-2">
                  <BodyBase className="text-green-800"><strong>1. Taxable First:</strong> Brokerage accounts with long-term capital gains (favorable 0-20% rates). Withdraw from these while tax-advantaged accounts continue compounding.</BodyBase>
                  <BodyBase className="text-green-800"><strong>2. Tax-Deferred Next:</strong> Traditional 401(k)/IRA. Withdrawals are ordinary income, so strategically "fill up" lower tax brackets before RMDs force larger withdrawals at age 73.</BodyBase>
                  <BodyBase className="text-green-800"><strong>3. Tax-Free Last:</strong> Roth IRA/401(k). No RMDs, no taxes ever. Preserve these for longevity risk, emergencies, and legacy.</BodyBase>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <H4 className="text-blue-900 mb-2">🪣 Bucket Strategy</H4>
                <BodyBase className="text-blue-800">Divide portfolio into time-based buckets: cash for near-term (1-2 years), bonds for mid-term (3-10 years), stocks for long-term (10+ years). Withdraw sequentially from buckets as needed.</BodyBase>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <H4 className="text-purple-900 mb-2">⚖️ Pro-Rata Withdrawals</H4>
                <BodyBase className="text-purple-800">Withdraw proportionally from all accounts based on their balances. Simple but may not be tax-optimal. Maintains portfolio allocation across accounts.</BodyBase>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <H4 className="text-orange-900 mb-2">🎯 Tax-Deferred First</H4>
                <BodyBase className="text-orange-800">Prioritize Traditional 401(k)/IRA withdrawals early to reduce future RMDs. Useful if you expect higher tax rates later or want to preserve Roth accounts for heirs.</BodyBase>
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <H3 className="text-blue-900 mb-4">📊 Strategy Comparison</H3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Portfolio Snapshot</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Taxable:</BodyBase>
                      <Label>$500,000</Label>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Tax-Deferred (401k/IRA):</BodyBase>
                      <Label>$800,000</Label>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Roth:</BodyBase>
                      <Label>$200,000</Label>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <Label weight="semibold">Total:</Label>
                      <Label weight="semibold">$1,500,000</Label>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <H4 className="text-green-900 mb-3">✅ Tax-Efficient Order</H4>
                  <div className="space-y-2">
                    <BodyBase className="text-green-800"><strong>Year 1-10:</strong> Withdraw from taxable ($500k). Long-term capital gains taxed at 15%.</BodyBase>
                    <BodyBase className="text-green-800"><strong>Year 11-25:</strong> Withdraw from 401k/IRA. Fill 12-22% brackets strategically before RMDs.</BodyBase>
                    <BodyBase className="text-green-800"><strong>Year 26+:</strong> Preserve Roth for longevity/legacy. Zero tax, maximum flexibility.</BodyBase>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <H4 className="text-purple-900 mb-3">⚖️ Pro-Rata</H4>
                  <div className="space-y-2">
                    <BodyBase className="text-purple-800"><strong>Every Year:</strong> Withdraw 33% taxable, 53% tax-deferred, 13% Roth proportionally.</BodyBase>
                    <BodyBase className="text-purple-800"><strong>Result:</strong> Simple but potentially higher lifetime taxes. Depletes Roth unnecessarily early.</BodyBase>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <H3 className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                AreumFire Features
              </H3>
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <H4 className="text-indigo-900 mb-2">🎯 Strategy Selection</H4>
                  <BodyBase className="text-indigo-800">Choose from tax-efficient order, bucket strategy, pro-rata, or tax-deferred first. Each optimizes for different goals and risk tolerance.</BodyBase>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">📅 Automatic Compliance</H4>
                  <BodyBase className="text-blue-800">AreumFire automatically handles RMDs at age 73 and respects early withdrawal penalties. No manual calculations needed.</BodyBase>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <H4 className="text-green-900 mb-2">🔄 Dynamic Rebalancing</H4>
                  <BodyBase className="text-green-800">If one account depletes, the simulator automatically shifts to the next available account to ensure expenses are covered.</BodyBase>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <H4 className="mb-4">⚙️ Strategy Configuration</H4>
              <div className="space-y-4">
                <div>
                  <FormLabel className="mb-2">Primary Withdrawal Strategy</FormLabel>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>Tax-Efficient Order (Recommended)</option>
                    <option>Bucket Strategy Model</option>
                    <option>Pro-Rata From All Accounts</option>
                    <option>Traditional IRA/401k First</option>
                  </select>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 mt-1" id="restrict-age" />
                    <div>
                      <label htmlFor="restrict-age" className="text-sm font-semibold text-blue-900 cursor-pointer">
                        Restrict tax-advantaged withdrawals until age
                      </label>
                      <Caption className="text-blue-800 mt-1">
                        Prioritize taxable accounts until specified age to avoid early withdrawal penalties. After that age, follow normal withdrawal order. System will use any account if needed to cover expenses.
                      </Caption>
                    </div>
                  </div>
                  <div className="ml-6">
                    <input
                      type="number"
                      defaultValue="59"
                      min="50"
                      max="75"
                      className="w-24 px-3 py-2 border border-blue-300 rounded-lg text-sm"
                    />
                    <Caption className="text-blue-700 ml-2">years old</Caption>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600" defaultChecked />
                  <Label color="secondary">Adjust withdrawals for inflation annually</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600" defaultChecked />
                  <Label color="secondary">Alert me before crossing tax bracket thresholds</Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]
};