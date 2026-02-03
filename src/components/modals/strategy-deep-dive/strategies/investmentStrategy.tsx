import React from 'react';
import { StrategyContent } from '../strategyContentDefinitions';
import { H3, H4, Body, BodyBase, Caption, Mono } from '@/components/ui/Typography';

export const investmentStrategyContent: StrategyContent = {
  title: 'Automated Investment Contributions',
  subtitle: 'Build wealth through consistent, automated investing with dollar-cost averaging',
  difficulty: 'Beginner',
  tabs: [
    {
      name: 'Dollar-Cost Averaging',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Education */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <H3>What Is Automated Investing?</H3>
              </div>
              <Body className="mb-4 leading-relaxed" color="secondary">
                Automated investing means setting up recurring contributions to your investment
                accounts that happen automatically every month. Instead of trying to time the market
                or making sporadic investments, you invest a fixed amount consistently—removing emotion
                and building wealth systematically.
              </Body>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <H4 className="text-green-900 mb-2">Key Benefits:</H4>
                <ul className="space-y-1">
                  <BodyBase as="li" className="text-green-800">• <strong>Consistency:</strong> Never miss a contribution—automation removes willpower from the equation</BodyBase>
                  <BodyBase as="li" className="text-green-800">• <strong>Dollar-Cost Averaging:</strong> Buy more shares when prices are low, fewer when high</BodyBase>
                  <BodyBase as="li" className="text-green-800">• <strong>Compound Growth:</strong> Time in the market beats timing the market</BodyBase>
                  <BodyBase as="li" className="text-green-800">• <strong>Tax Benefits:</strong> Prioritizing 401(k)/IRA contributions lowers your taxable income</BodyBase>
                </ul>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <H3>What Is Dollar-Cost Averaging?</H3>
              </div>
              <Body className="mb-4 leading-relaxed" color="secondary">
                Dollar-cost averaging (DCA) is an investment strategy where you invest a fixed
                amount of money at regular intervals (like monthly), regardless of market conditions.
                This smooths out the impact of market volatility and removes the stress of trying to
                "time" your investments.
              </Body>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <H4 className="text-indigo-900 mb-2">How It Works:</H4>
                <BodyBase className="text-indigo-800">When prices are high, your fixed investment buys fewer shares. When prices are low, it buys more shares. Over time, this averages out your purchase price and reduces the risk of investing a large sum at the "wrong" time.</BodyBase>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <H3>Account Priority Strategy</H3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <H4>401(k) Up to Match (PRIORITY #1)</H4>
                    <BodyBase color="secondary">Always contribute enough to get full employer match—it's instant 50-100% return on investment. Free money!</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <H4>Max IRA Contribution (PRIORITY #2)</H4>
                    <BodyBase color="secondary">Fill your IRA ($7,000/year in 2024) for more investment options and tax benefits.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <H4>Max 401(k) Contribution (PRIORITY #3)</H4>
                    <BodyBase color="secondary">Fill your 401(k) up to the limit ($23,000/year in 2024) for maximum tax-deferred growth.</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <H4>Taxable Brokerage (PRIORITY #4)</H4>
                    <BodyBase color="secondary">After maxing retirement accounts, invest additional funds in a taxable brokerage account for flexibility.</BodyBase>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <H3>Common Mistakes to Avoid</H3>
              </div>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <H4 className="text-red-900 mb-2">❌ Trying to Time the Market</H4>
                  <BodyBase className="text-red-800">Waiting for the "right moment" often means missing out on years of growth. Time in the market beats timing the market.</BodyBase>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <H4 className="text-yellow-900 mb-2">❌ Inconsistent Contributions</H4>
                  <BodyBase className="text-yellow-800">Investing only when you "feel like it" or have extra cash leads to missed opportunities. Automation solves this.</BodyBase>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <H4 className="text-orange-900 mb-2">❌ Ignoring Tax Benefits</H4>
                  <BodyBase className="text-orange-800">Not prioritizing 401(k)/IRA means paying more in taxes today and missing tax-deferred/tax-free growth.</BodyBase>
                </div>
              </div>
            </div>
          </div>

          {/* Visual config */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-gray-50 to-slate-100 border border-gray-200 rounded-xl p-6">
              <H3 className="mb-4">📊 Dollar-Cost Averaging in Action</H3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border">
                  <H4 className="mb-3">3-Month Investment Example</H4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <BodyBase color="secondary">January: <Mono>$500</Mono> @ <Mono>$50/share</Mono></BodyBase>
                      <Mono className="font-medium text-blue-600">10 shares</Mono>
                    </div>
                    <div className="flex justify-between items-center">
                      <BodyBase color="secondary">February: <Mono>$500</Mono> @ <Mono>$40/share</Mono></BodyBase>
                      <Mono className="font-medium text-blue-600">12.5 shares</Mono>
                    </div>
                    <div className="flex justify-between items-center">
                      <BodyBase color="secondary">March: <Mono>$500</Mono> @ <Mono>$45/share</Mono></BodyBase>
                      <Mono className="font-medium text-blue-600">11.1 shares</Mono>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between">
                      <Mono weight="semibold">Total Investment: $1,500</Mono>
                      <Mono weight="semibold">33.6 shares</Mono>
                    </div>
                    <Mono className="mt-2 text-green-600" weight="medium">
                      Average cost: $44.64/share (better than $50!)
                    </Mono>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <H3 className="mb-4">💰 Example: $2,000/Month Strategy</H3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <BodyBase color="secondary">Total Monthly Investment:</BodyBase>
                  <Mono weight="semibold">$2,000</Mono>
                </div>
                <div className="pl-4 space-y-2 border-l-2 border-blue-300">
                  <div className="flex justify-between items-center">
                    <BodyBase color="secondary">→ 401(k) (60%):</BodyBase>
                    <Mono className="font-medium text-blue-600">$1,200</Mono>
                  </div>
                  <div className="flex justify-between items-center">
                    <BodyBase color="secondary">→ Taxable (40%):</BodyBase>
                    <Mono className="font-medium text-blue-600">$800</Mono>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <div className="space-y-1">
                    <Caption color="secondary">• Annual contribution: <Mono>$24,000</Mono></Caption>
                    <Caption color="secondary">• 10-year value @ 7%: <Mono>~$346,000</Mono></Caption>
                    <Caption color="secondary">• 30-year value @ 7%: <Mono>~$2.4 million</Mono></Caption>
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
                  <H4 className="text-purple-900 mb-2">⚙️ Automated Setup</H4>
                  <BodyBase className="text-purple-800">Set your monthly investment amount and account priorities. AreumFire generates scheduled contribution events automatically.</BodyBase>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">🎯 Account Prioritization</H4>
                  <BodyBase className="text-blue-800">Specify what percentage goes to retirement accounts (401k/IRA) vs taxable brokerage, with automatic caps to respect IRS limits.</BodyBase>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <H4 className="text-green-900 mb-2">📈 Growth Projections</H4>
                  <BodyBase className="text-green-800">See how consistent monthly contributions compound over time using historical market return assumptions.</BodyBase>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Next Steps',
      content: (
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <H3 as="h2" className="text-2xl mb-4">After Setting Up Contributions</H3>
            <Body className="mb-6 leading-relaxed" color="secondary">
              Once you've automated your investment contributions, there are additional strategies
              to optimize your portfolio. These are separate strategies you can configure:
            </Body>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl">
                  🎯
                </div>
                <H4 className="text-lg">Asset Allocation Strategy</H4>
              </div>
              <BodyBase className="mb-4" color="secondary">
                Determine your optimal mix of stocks, bonds, and other assets based on your
                risk tolerance, age, and retirement timeline.
              </BodyBase>
              <div className="bg-white rounded-lg p-3">
                <Caption color="secondary"><strong>Decides:</strong> 60% stocks / 40% bonds, international allocation, glide paths</Caption>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white text-xl">
                  ⚖️
                </div>
                <H4 className="text-lg">Portfolio Rebalancing</H4>
              </div>
              <BodyBase className="mb-4" color="secondary">
                Automatically maintain your target allocation as markets move by periodically
                rebalancing your portfolio.
              </BodyBase>
              <div className="bg-white rounded-lg p-3">
                <Caption color="secondary"><strong>Decides:</strong> When and how to rebalance (quarterly, threshold-based, etc.)</Caption>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xl">
                  💰
                </div>
                <H4 className="text-lg">Tax Optimization</H4>
              </div>
              <BodyBase className="mb-4" color="secondary">
                Minimize taxes through strategic fund placement, tax-loss harvesting, and
                Roth conversions.
              </BodyBase>
              <div className="bg-white rounded-lg p-3">
                <Caption color="secondary"><strong>Decides:</strong> Which funds go in which account types, tax-loss harvesting rules</Caption>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white text-xl">
                  📊
                </div>
                <H4 className="text-lg">Retirement Withdrawal</H4>
              </div>
              <BodyBase className="mb-4" color="secondary">
                Plan your retirement income strategy including which accounts to withdraw from
                and in what order.
              </BodyBase>
              <div className="bg-white rounded-lg p-3">
                <Caption color="secondary"><strong>Decides:</strong> 4% rule, dynamic withdrawals, account withdrawal order</Caption>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-slate-100 border-2 border-gray-300 rounded-xl p-8">
            <H3 className="mb-4 flex items-center">
              <span className="text-2xl mr-3">✨</span>
              Pro Tip: Start Simple, Add Complexity Later
            </H3>
            <div className="space-y-3">
              <Body className="leading-relaxed" color="secondary">
                <strong className="text-gray-900">Step 1:</strong> Set up automated contributions (this strategy) ✓
              </Body>
              <Body className="leading-relaxed" color="secondary">
                <strong className="text-gray-900">Step 2:</strong> Configure asset allocation once contributions are flowing
              </Body>
              <Body className="leading-relaxed" color="secondary">
                <strong className="text-gray-900">Step 3:</strong> Add rebalancing automation when comfortable
              </Body>
              <Body className="leading-relaxed" color="secondary">
                <strong className="text-gray-900">Step 4:</strong> Optimize for taxes as portfolio grows
              </Body>
            </div>
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <BodyBase color="secondary">
                <strong className="text-gray-900">Remember:</strong> Consistency in contributions matters more
                than perfect optimization. Get the money flowing first, optimize later.
              </BodyBase>
            </div>
          </div>
        </div>
      )
    }
  ]
};
