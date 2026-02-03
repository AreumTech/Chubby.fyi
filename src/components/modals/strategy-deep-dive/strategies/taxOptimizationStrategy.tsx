import React from 'react';
import { StrategyContent } from '../strategyContentDefinitions';
import { H3, H4, Body, BodyBase, Label, Mono } from '@/components/ui/Typography';

export const taxOptimizationStrategyContent: StrategyContent = {
  title: 'Tax Optimization Strategy Deep Dive',
  subtitle: 'Tax-loss harvesting, Roth conversions, and strategic account management',
  difficulty: 'Advanced',
  tabs: [
    {
      name: 'Tax Withholding Strategy',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Education */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <H3>Understanding Tax Withholding</H3>
              </div>
              <Body className="mb-4 leading-relaxed">
                Tax withholding determines how much tax is automatically deducted from your paycheck
                throughout the year. Understanding the breakdown between Federal, State, and FICA taxes
                helps you optimize cash flow and avoid surprises at tax settlement time.
              </Body>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <H4 className="text-indigo-900 mb-2">Key Components:</H4>
                <ul className="text-indigo-800 space-y-1">
                  <BodyBase as="li">• <strong>Federal Income Tax:</strong> Withheld monthly based on W-4 settings</BodyBase>
                  <BodyBase as="li">• <strong>State Income Tax:</strong> Varies by state, typically settled annually</BodyBase>
                  <BodyBase as="li">• <strong>FICA Taxes:</strong> Social Security (<Mono>6.2%</Mono>) + Medicare (<Mono>1.45%</Mono>), settled annually</BodyBase>
                  <BodyBase as="li">• <strong>Tax Settlement:</strong> Additional payment in April for State + FICA</BodyBase>
                </ul>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <H3>Monthly Withholding vs Annual Taxes</H3>
              </div>
              <Body className="mb-4 leading-relaxed">
                Your monthly take-home pay reflects only Federal Income Tax withholding. State and FICA
                taxes are accounted for but settled at year-end, creating a significant tax payment in April.
              </Body>
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <H4 className="text-yellow-900 mb-2">💡 Example Breakdown</H4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <BodyBase className="text-gray-800">Annual Gross Income:</BodyBase>
                    <Mono weight="semibold">$700,000</Mono>
                  </div>
                  <div className="flex justify-between">
                    <BodyBase className="text-gray-800">• Federal Income Tax (withheld monthly):</BodyBase>
                    <Mono className="text-red-600">-$211,000</Mono>
                  </div>
                  <div className="flex justify-between border-t border-yellow-300 pt-2">
                    <BodyBase weight="semibold">Monthly Take-Home (visible):</BodyBase>
                    <Mono weight="bold" className="text-green-600">$489,000/year</Mono>
                  </div>
                  <div className="flex justify-between text-gray-600 mt-4">
                    <BodyBase>• State Income Tax (settled April):</BodyBase>
                    <Mono>-$67,000</Mono>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <BodyBase>• FICA Taxes (settled April):</BodyBase>
                    <Mono>-$26,000</Mono>
                  </div>
                  <div className="flex justify-between border-t border-yellow-300 pt-2">
                    <BodyBase weight="bold" className="text-gray-900">True Annual Take-Home:</BodyBase>
                    <Mono weight="bold" className="text-green-700">$396,000</Mono>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <H3>Tax Settlement Impact</H3>
              </div>
              <Body className="mb-4 leading-relaxed">
                Every April, you'll see a large TAX_SETTLEMENT event that withdraws State and FICA taxes
                from your cash balance. This is not "creating money" - it's paying the deferred portion
                of your annual tax bill.
              </Body>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <H4 className="text-red-900 mb-2">⚠️ Cash Flow Planning</H4>
                  <BodyBase className="text-red-800">Ensure you have sufficient cash reserves to cover the April tax settlement (typically <Mono>13-15%</Mono> of gross income for high earners).</BodyBase>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">💰 Float Strategy</H4>
                  <BodyBase className="text-blue-800">The "float" between monthly withholding and annual settlement can be invested for additional returns, but must be available in April.</BodyBase>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration & Examples */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <H3 className="text-blue-900 mb-4">📊 Real-World Cash Flow</H3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Annual Income Breakdown ($700K)</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Gross Annual Income:</BodyBase>
                      <Mono weight="medium">$700,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Monthly Federal Withholding:</BodyBase>
                      <Mono weight="medium" className="text-red-600">$17,599 × 12 = $211,188</Mono>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <BodyBase color="secondary" weight="semibold">Monthly Visible Take-Home:</BodyBase>
                      <Mono weight="medium" className="text-green-600">$40,734/month</Mono>
                    </div>
                    <div className="flex justify-between text-gray-500 italic">
                      <BodyBase as="span">Annualized:</BodyBase>
                      <Mono as="span">$40,734 × 12 = $488,808</Mono>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">April Tax Settlement</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase color="secondary">State Income Tax:</BodyBase>
                      <Mono weight="medium" className="text-orange-600">$67,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">FICA Taxes:</BodyBase>
                      <Mono weight="medium" className="text-orange-600">$26,000</Mono>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <BodyBase weight="bold" className="text-red-900">Additional Tax Payment:</BodyBase>
                      <Mono weight="bold" className="text-red-600">$93,000</Mono>
                    </div>
                  </div>
                </div>
                <div className="bg-green-100 rounded-lg p-4">
                  <H4 className="text-green-900 mb-3">True Annual Take-Home</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase className="text-green-800">Gross Income:</BodyBase>
                      <Mono weight="medium">$700,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase className="text-green-800">Total Taxes (all sources):</BodyBase>
                      <Mono weight="medium">-$304,000</Mono>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2">
                      <BodyBase weight="bold" className="text-green-900">Net Annual Take-Home:</BodyBase>
                      <Mono weight="bold" className="text-green-600">$396,000</Mono>
                    </div>
                    <div className="flex justify-between text-green-700 italic mt-2">
                      <BodyBase as="span">Effective Tax Rate:</BodyBase>
                      <Mono as="span">43.4%</Mono>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <H3 className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                Withholding Strategies
              </H3>
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <H4 className="text-purple-900 mb-2">🎯 Standard Withholding (Current)</H4>
                  <BodyBase className="text-purple-800">Federal tax withheld monthly at standard W-4 rates. State and FICA settled annually in April. This provides maximum cash flow float but requires discipline to reserve settlement funds.</BodyBase>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">💰 Estimated Tax Payments (Quarterly)</H4>
                  <BodyBase className="text-blue-800">Pay estimated taxes quarterly to smooth cash flow and avoid April surprises. Reduces float benefit but provides more predictable monthly budgeting.</BodyBase>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <H4 className="text-green-900 mb-2">🔄 Increased Withholding</H4>
                  <BodyBase className="text-green-800">Adjust W-4 to withhold additional Federal tax each month to cover State/FICA. Provides "set it and forget it" peace of mind at the cost of reduced monthly cash flow.</BodyBase>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <H3 className="mb-4">⚙️ Strategy Configuration</H3>
              <div className="space-y-4">
                <div>
                  <Label className="block mb-2">Withholding Method</Label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>Standard W-4 Withholding (Annual Settlement)</option>
                    <option>Quarterly Estimated Payments</option>
                    <option>Increased Monthly Withholding</option>
                  </select>
                </div>
                <div>
                  <Label className="block mb-2">Tax Settlement Reserve Strategy</Label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>Maintain in High-Yield Savings</option>
                    <option>Invest in Short-Term Treasury Bills</option>
                    <option>Keep in Taxable Brokerage (Conservative)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-purple-600" defaultChecked />
                  <Label as="span">Auto-reserve estimated settlement amount monthly</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-purple-600" />
                  <Label as="span">Alert me 30 days before tax settlement</Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
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
              <Body className="mb-4 leading-relaxed">
                A Roth conversion is the process of moving funds from a pre-tax retirement account
                (like a Traditional IRA or 401k) to a post-tax Roth IRA. You pay ordinary income tax
                on the converted amount today in exchange for tax-free growth and tax-free
                withdrawals in the future.
              </Body>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <H4 className="text-indigo-900 mb-2">Key Benefits:</H4>
                <ul className="text-indigo-800 space-y-1">
                  <BodyBase as="li">• Pay taxes at today's (potentially lower) rates</BodyBase>
                  <BodyBase as="li">• All future growth and withdrawals are <Mono>100%</Mono> tax-free</BodyBase>
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
                  <Mono className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center" weight="bold">1</Mono>
                  <div>
                    <H4>Estimate Income</H4>
                    <BodyBase color="secondary">Project your total taxable income for the current year, without any conversion.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Mono className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center" weight="bold">2</Mono>
                  <div>
                    <H4>Identify Tax Bracket "Room"</H4>
                    <BodyBase color="secondary">Determine how much room you have left in your current (or a targeted) tax bracket.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Mono className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center" weight="bold">3</Mono>
                  <div>
                    <H4>Convert the Difference</H4>
                    <BodyBase color="secondary">Convert just enough from your pre-tax account to "fill up" that bracket, locking in that rate.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Mono className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center" weight="bold">4</Mono>
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
                      <Mono weight="medium">$60,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Standard Deduction (MFJ):</BodyBase>
                      <Mono weight="medium">-$29,200</Mono>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <BodyBase color="secondary" weight="semibold">Taxable Income (Before):</BodyBase>
                      <Mono weight="medium">$30,800</Mono>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">The "Bracket Fill" Action</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Target Bracket:</BodyBase>
                      <BodyBase weight="medium">Top of <Mono>12%</Mono> Bracket</BodyBase>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary"><Mono>12%</Mono> Bracket Max Income (MFJ):</BodyBase>
                      <Mono weight="medium">$94,300</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Current Taxable Income:</BodyBase>
                      <Mono weight="medium">-$30,800</Mono>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <BodyBase weight="bold" className="text-indigo-900">Optimal Conversion Amount:</BodyBase>
                      <Mono weight="bold" className="text-indigo-600">$63,500</Mono>
                    </div>
                  </div>
                </div>
                <div className="bg-green-100 rounded-lg p-4">
                  <H4 className="text-green-900 mb-3">Tax Impact</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase className="text-green-800">Tax Bill (Before):</BodyBase>
                      <Mono weight="medium">$3,232</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase className="text-green-800">Tax Bill (After Conversion):</BodyBase>
                      <Mono weight="medium">$10,852</Mono>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2">
                      <BodyBase weight="bold" className="text-red-700">Immediate Tax Cost:</BodyBase>
                      <Mono weight="bold" className="text-red-600">$7,620</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase weight="bold" className="text-green-900">Long-Term Benefit:</BodyBase>
                      <BodyBase weight="bold" className="text-green-600"><Mono>$63,500</Mono> now grows TAX-FREE</BodyBase>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <H3 className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                Implementation in AreumFire
              </H3>
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <H4 className="text-purple-900 mb-2">🤖 Optimal Conversion Calculator</H4>
                  <BodyBase className="text-purple-800">AreumFire automatically projects your income and calculates the precise conversion amount to fill your desired tax bracket.</BodyBase>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">📈 Long-Term Tax Simulation</H4>
                  <BodyBase className="text-blue-800">Model the impact of a conversion strategy over decades, visualizing lower lifetime taxes and reduced RMDs.</BodyBase>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <H4 className="text-green-900 mb-2">📊 IRMAA & RMD Projection</H4>
                  <BodyBase className="text-green-800">See how conversions affect your future Medicare premiums and RMD obligations, allowing for more precise planning.</BodyBase>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <H3 className="mb-4">⚙️ Strategy Configuration</H3>
              <div className="space-y-4">
                <div>
                  <Label className="block mb-2">Target Tax Bracket</Label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>Fill to top of 12% Bracket</option>
                    <option>Fill to top of 22% Bracket</option>
                    <option>Fill to top of 24% Bracket</option>
                    <option>Custom Amount</option>
                  </select>
                </div>
                <div>
                  <Label className="block mb-2">Tax Payment Source</Label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>Taxable Brokerage Account</option>
                    <option>Checking/Savings</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-purple-600" defaultChecked />
                  <Label as="span">Stay below next IRMAA income tier</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-purple-600" />
                  <Label as="span">Automate conversions annually (advanced)</Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Tax-Loss Harvesting',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Education */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <H3>What Is Tax-Loss Harvesting?</H3>
              </div>
              <Body className="mb-4 leading-relaxed">
                Tax-loss harvesting is a strategy where you deliberately sell losing investments
                to "realize" capital losses that can offset capital gains, reducing your tax bill.
              </Body>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <H4 className="text-green-900 mb-2">Key Benefits:</H4>
                <ul className="text-green-800 space-y-1">
                  <BodyBase as="li">• Offset up to <Mono>$3,000</Mono> of ordinary income annually</BodyBase>
                  <BodyBase as="li">• Unlimited offset of capital gains</BodyBase>
                  <BodyBase as="li">• Carry forward unused losses indefinitely</BodyBase>
                  <BodyBase as="li">• Stay invested while reducing taxes</BodyBase>
                </ul>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <H3>How It Works</H3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <Mono className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center" weight="bold">1</Mono>
                  <div>
                    <H4>Monitor Your Portfolio</H4>
                    <BodyBase color="secondary">Watch for investments that have declined below your cost basis</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Mono className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center" weight="bold">2</Mono>
                  <div>
                    <H4>Sell at a Loss</H4>
                    <BodyBase color="secondary">Sell the losing investment to realize the capital loss</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Mono className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center" weight="bold">3</Mono>
                  <div>
                    <H4>Reinvest Immediately</H4>
                    <BodyBase color="secondary">Buy a similar (but not identical) investment to maintain exposure</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Mono className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center" weight="bold">4</Mono>
                  <div>
                    <H4>Use Losses on Taxes</H4>
                    <BodyBase color="secondary">Apply losses to offset gains and reduce taxable income</BodyBase>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <H3>Critical Rules to Follow</H3>
              </div>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <H4 className="text-red-900 mb-2">⚠️ Wash Sale Rule</H4>
                  <BodyBase className="text-red-800">Cannot buy the same or "substantially identical" security within <Mono>30 days</Mono> before or after the sale. Violation disallows the tax loss.</BodyBase>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <H4 className="text-yellow-900 mb-2">📋 Documentation Required</H4>
                  <BodyBase className="text-yellow-800">Keep detailed records of cost basis, sale dates, and replacement purchases for tax reporting.</BodyBase>
                </div>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <H3 className="text-blue-900 mb-4">📊 Real-World Example</H3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Your Portfolio Status</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase color="secondary">VTSAX Investment:</BodyBase>
                      <Mono weight="medium">$50,000 → $45,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Unrealized Loss:</BodyBase>
                      <Mono weight="medium" className="text-red-600">-$5,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">Capital Gains (Other):</BodyBase>
                      <Mono weight="medium" className="text-green-600">+$8,000</Mono>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Action Taken</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase color="secondary">1. Sell VTSAX:</BodyBase>
                      <BodyBase weight="medium">Realize <Mono>-$5,000</Mono> loss</BodyBase>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase color="secondary">2. Buy SWTSX:</BodyBase>
                      <BodyBase weight="medium">Maintain market exposure</BodyBase>
                    </div>
                  </div>
                </div>
                <div className="bg-green-100 rounded-lg p-4">
                  <H4 className="text-green-900 mb-3">Tax Benefit</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <BodyBase className="text-green-800">Capital Gains Tax (Before):</BodyBase>
                      <Mono weight="medium">$1,200 (15% × $8,000)</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase className="text-green-800">Net Gains After Harvest:</BodyBase>
                      <Mono weight="medium">$3,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <BodyBase className="text-green-800">Capital Gains Tax (After):</BodyBase>
                      <Mono weight="medium">$450 (15% × $3,000)</Mono>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2">
                      <BodyBase weight="bold" className="text-green-900">Tax Savings:</BodyBase>
                      <Mono weight="bold" className="text-green-600">$750</Mono>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <H3 className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                Implementation in AreumFire
              </H3>
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <H4 className="text-purple-900 mb-2">🤖 Automated Monitoring</H4>
                  <BodyBase className="text-purple-800">AreumFire will automatically scan your portfolio daily for tax-loss harvesting opportunities and alert you when losses exceed your threshold.</BodyBase>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">📈 Smart Replacements</H4>
                  <BodyBase className="text-blue-800">Our system suggests appropriate replacement securities that avoid wash sale rules while maintaining similar market exposure.</BodyBase>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <H4 className="text-green-900 mb-2">📊 Tax Impact Tracking</H4>
                  <BodyBase className="text-green-800">View cumulative tax savings over time and see projected impact on your financial independence timeline.</BodyBase>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <H3 className="mb-4">⚙️ Strategy Configuration</H3>
              <div className="space-y-4">
                <div>
                  <Label className="block mb-2">Loss Threshold</Label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>$1,000+ loss</option>
                    <option>$2,500+ loss</option>
                    <option>$5,000+ loss</option>
                    <option>Any loss</option>
                  </select>
                </div>
                <div>
                  <Label className="block mb-2">Frequency</Label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>Monthly review</option>
                    <option>Quarterly review</option>
                    <option>Annual review</option>
                    <option>Real-time alerts</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-purple-600" defaultChecked />
                  <Label as="span">Auto-suggest replacement securities</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-purple-600" />
                  <Label as="span">Execute automatically (advanced users)</Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]
};