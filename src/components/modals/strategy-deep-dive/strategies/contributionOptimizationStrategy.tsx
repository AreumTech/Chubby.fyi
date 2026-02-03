import React from 'react';
import { StrategyContent } from '../strategyContentDefinitions';
import { H3, H4, H5, Body, BodyBase, Label, Caption } from '@/components/ui/Typography';

export const contributionOptimizationStrategyContent: StrategyContent = {
  title: 'Contribution Optimization & Account Prioritization',
  subtitle: 'Learn the optimal order to fund your accounts to maximize tax advantages and growth',
  difficulty: 'Beginner',
  tabs: [
    {
      name: 'The Contribution Waterfall',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Education */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <H3>What Is Contribution Optimization?</H3>
              </div>
              <Body className="text-gray-700 mb-4 leading-relaxed">
                Contribution optimization is the process of allocating your savings across different
                investment accounts (401k, Roth IRA, HSA, etc.) in a specific, prioritized order.
                This "contribution waterfall" ensures you capture every available benefit, from free
                employer money to powerful tax advantages.
              </Body>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <H4 className="text-purple-900 mb-2">Key Benefits:</H4>
                <ul className="space-y-1">
                  <BodyBase as="li" className="text-purple-800">• Maximize "free money" from employer 401(k) matches.</BodyBase>
                  <BodyBase as="li" className="text-purple-800">• Minimize your current and future tax burdens.</BodyBase>
                  <BodyBase as="li" className="text-purple-800">• Leverage tax-deferred, tax-free, and triple-tax-advantaged accounts.</BodyBase>
                  <BodyBase as="li" className="text-purple-800">• Accelerate your journey to financial independence.</BodyBase>
                </ul>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <H3>The Optimal Contribution "Waterfall"</H3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <H4>401(k) up to Employer Match</H4>
                    <BodyBase color="secondary">This is priority #1. It's an instant, guaranteed 50-100% return on your investment. Don't leave free money on the table.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <H4>Max Out Health Savings Account (HSA)</H4>
                    <BodyBase color="secondary">If eligible, an HSA is the ultimate retirement account with a triple-tax advantage: tax-deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <H4>Max Out Roth IRA</H4>
                    <BodyBase color="secondary">If eligible, a Roth IRA provides tax-free growth and withdrawals in retirement, offering valuable tax diversification.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <H4>Max Out Remainder of 401(k)</H4>
                    <BodyBase color="secondary">Circle back to your 401(k) and contribute until you hit the annual IRS limit, further reducing your taxable income.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">5</div>
                  <div>
                    <H4>Invest in a Taxable Brokerage Account</H4>
                    <BodyBase color="secondary">Once all tax-advantaged accounts are maxed out, use a taxable brokerage for additional savings. This provides the most liquidity for pre-retirement goals.</BodyBase>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <H3>Important Considerations</H3>
              </div>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <H4 className="text-yellow-900 mb-2">Income Limits & Eligibility</H4>
                  <BodyBase className="text-yellow-800">Roth IRA and deductible Traditional IRA contributions have income limits. High earners may need to use a Backdoor Roth IRA strategy. HSAs require a High-Deductible Health Plan (HDHP).</BodyBase>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <H4 className="mb-2">401(k) Investment Quality</H4>
                  <BodyBase className="text-gray-800">If your 401(k) has very poor, high-fee investment options, you might consider prioritizing the Roth IRA (Step 3) before maxing the 401(k) (Step 4), even after getting the match.</BodyBase>
                </div>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
              <H3 className="text-purple-900 mb-4">📊 The Power of Optimization: An Example</H3>
              <div className="bg-white rounded-lg p-4 mb-4">
                <H4 className="mb-3">User Profile: Sarah</H4>
                <div className="space-y-2 grid grid-cols-2 gap-2">
                  <div className="flex justify-between"><BodyBase color="secondary">Annual Salary:</BodyBase><BodyBase weight="medium">$90,000</BodyBase></div>
                  <div className="flex justify-between"><BodyBase color="secondary">Filing Status:</BodyBase><BodyBase weight="medium">Single</BodyBase></div>
                  <div className="flex justify-between"><BodyBase color="secondary">Annual Savings:</BodyBase><BodyBase weight="medium">$18,000</BodyBase></div>
                  <div className="flex justify-between"><BodyBase color="secondary">401k Match:</BodyBase><BodyBase weight="medium">50% on first 6%</BodyBase></div>
                </div>
              </div>
              <H4 className="text-center mb-4">Strategy Comparison</H4>
              <div className="space-y-2">
                <div className="bg-red-50 p-3 rounded">
                  <H5 className="text-red-900 mb-2">❌ Common Approach</H5>
                  <div className="space-y-1">
                    <div className="flex justify-between"><BodyBase>401(k):</BodyBase><BodyBase>$5,400</BodyBase></div>
                    <div className="flex justify-between"><BodyBase>Taxable:</BodyBase><BodyBase>$12,600</BodyBase></div>
                    <div className="flex justify-between font-bold"><BodyBase>Tax Savings:</BodyBase><BodyBase className="text-red-600">$1,296</BodyBase></div>
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <H5 className="text-green-900 mb-2">✅ Optimal Plan</H5>
                  <div className="space-y-1">
                    <div className="flex justify-between"><BodyBase>401(k):</BodyBase><BodyBase>$7,650</BodyBase></div>
                    <div className="flex justify-between"><BodyBase>HSA:</BodyBase><BodyBase>$3,850</BodyBase></div>
                    <div className="flex justify-between"><BodyBase>Roth IRA:</BodyBase><BodyBase>$6,500</BodyBase></div>
                    <div className="flex justify-between font-bold"><BodyBase>Tax Savings:</BodyBase><BodyBase className="text-green-600">$2,760</BodyBase></div>
                  </div>
                </div>
              </div>
              <Caption className="text-gray-600 mt-3 italic">With the Optimal Plan, Sarah more than doubles her immediate tax savings and ensures all $18,000 of her savings grow in tax-advantaged accounts.</Caption>
            </div>

            <div>
              <H3 className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                Implementation in AreumFire
              </H3>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <H4 className="text-green-900 mb-2">🌊 Automated Waterfall Logic</H4>
                  <BodyBase className="text-green-800">AreumFire automatically calculates your personalized contribution waterfall based on your income, available accounts, and employer match rules.</BodyBase>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">🎯 Paycheck Planner</H4>
                  <BodyBase className="text-blue-800">We break down your annual contribution goals into simple, per-paycheck amounts for each account, making it easy to set up your payroll deductions and transfers.</BodyBase>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <H4 className="text-purple-900 mb-2">🔗 Real-Time Tracking</H4>
                  <BodyBase className="text-purple-800">Connect your accounts to see your progress filling each "bucket" in the waterfall throughout the year. We'll alert you if you're falling behind schedule.</BodyBase>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <H3 className="mb-4">⚙️ Strategy Configuration</H3>
              <div className="space-y-4">
                <div>
                  <Label className="block text-gray-700 mb-2">Annual Household Income</Label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="$90,000" />
                </div>
                <div>
                  <Label className="block text-gray-700 mb-2">401(k) Match Rules</Label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>50% match up to 6%</option>
                    <option>100% match up to 4%</option>
                    <option>No match</option>
                    <option>Custom...</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600" defaultChecked />
                    <Label className="text-gray-700">HSA Available</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600" defaultChecked />
                    <Label className="text-gray-700">Roth IRA Eligible</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600" />
                    <Label className="text-gray-700">Customize Priority</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]
};