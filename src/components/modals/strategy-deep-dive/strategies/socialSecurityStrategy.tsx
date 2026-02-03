import React from 'react';
import { StrategyContent } from '../strategyContentDefinitions';
import { H3, H4, Body, BodyBase, Caption, Mono } from '@/components/ui/Typography';

export const socialSecurityStrategyContent: StrategyContent = {
  title: 'Social Security Claiming Strategy',
  subtitle: 'Maximize your lifetime benefits by choosing the optimal claiming age',
  difficulty: 'Intermediate',
  tabs: [
    {
      name: 'Claiming Ages & Impact',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Education */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <H3>The Three Key Ages</H3>
              </div>
              <Body className="mb-4 leading-relaxed">
                Social Security allows you to claim benefits anytime between age 62 and 70. Your claiming
                age permanently determines your monthly benefit amount for life.
              </Body>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <H4 className="text-red-900 mb-2">⚠️ Age 62: Early Claiming</H4>
                <div className="space-y-2 text-red-800">
                  <BodyBase><strong>Benefit Reduction:</strong> ~30% permanent reduction from your Full Retirement Age (FRA) benefit.</BodyBase>
                  <BodyBase><strong>Monthly Impact:</strong> If your FRA benefit is <Mono>$2,000/mo</Mono>, early claiming gives you ~<Mono>$1,400/mo</Mono>.</BodyBase>
                  <BodyBase><strong>Best For:</strong> Poor health, urgent financial need, no other income sources, or family history of shorter lifespan.</BodyBase>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <H4 className="text-blue-900 mb-2">📅 Age 67: Full Retirement Age (FRA)</H4>
                <div className="space-y-2 text-blue-800">
                  <BodyBase><strong>Benefit Amount:</strong> 100% of your calculated benefit. This is your baseline.</BodyBase>
                  <BodyBase><strong>Monthly Impact:</strong> Full <Mono>$2,000/mo</Mono> (using example above).</BodyBase>
                  <BodyBase><strong>Best For:</strong> Average life expectancy, balanced income needs, typical retirement planning.</BodyBase>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <H4 className="text-green-900 mb-2">✅ Age 70: Delayed Claiming</H4>
                <div className="space-y-2 text-green-800">
                  <BodyBase><strong>Benefit Increase:</strong> +8%/yr from age 67 to 70 = +24% total at age 70.</BodyBase>
                  <BodyBase><strong>Monthly Impact:</strong> <Mono>$2,480/mo</Mono> at age 70 (24% more than FRA benefit).</BodyBase>
                  <BodyBase><strong>Best For:</strong> Excellent health, longevity in family, sufficient retirement savings to bridge to age 70.</BodyBase>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <H3>Break-Even Analysis</H3>
              </div>
              <BodyBase className="mb-4 leading-relaxed">
                The break-even age is when cumulative lifetime benefits from delayed claiming surpass
                those from early claiming. This helps you decide if waiting is worth it.
              </BodyBase>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <BodyBase>Claiming at 62 vs. 67:</BodyBase>
                    <BodyBase weight="semibold">Break-even age ~78</BodyBase>
                  </div>
                  <div className="flex justify-between">
                    <BodyBase>Claiming at 62 vs. 70:</BodyBase>
                    <BodyBase weight="semibold">Break-even age ~80</BodyBase>
                  </div>
                  <div className="flex justify-between">
                    <BodyBase>Claiming at 67 vs. 70:</BodyBase>
                    <BodyBase weight="semibold">Break-even age ~82</BodyBase>
                  </div>
                </div>
                <Caption color="secondary" className="mt-3 italic">
                  U.S. life expectancy: ~77 (men), ~81 (women). If you expect to exceed these, delaying pays off.
                </Caption>
              </div>
            </div>
          </div>

          {/* Examples & Scenarios */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <H3 className="text-blue-900 mb-4">💰 Lifetime Benefit Comparison</H3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Example: <Mono>$2,000</Mono> FRA Benefit</H4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <BodyBase className="text-red-700" weight="medium">Claim at 62: <Mono>$1,400/mo</Mono></BodyBase>
                        <Mono className="text-red-600" weight="bold">$16,800/yr</Mono>
                      </div>
                      <Caption color="secondary">Age 62-85 (23 years) = <Mono>$386,400</Mono> total</Caption>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <BodyBase className="text-blue-700" weight="medium">Claim at 67: <Mono>$2,000/mo</Mono></BodyBase>
                        <Mono className="text-blue-600" weight="bold">$24,000/yr</Mono>
                      </div>
                      <Caption color="secondary">Age 67-85 (18 years) = <Mono>$432,000</Mono> total</Caption>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <BodyBase className="text-green-700" weight="medium">Claim at 70: <Mono>$2,480/mo</Mono></BodyBase>
                        <Mono className="text-green-600" weight="bold">$29,760/yr</Mono>
                      </div>
                      <Caption color="secondary">Age 70-85 (15 years) = <Mono>$446,400</Mono> total</Caption>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <Caption className="text-green-700" weight="semibold">
                      If you live to 85, delaying to 70 gives you ~<Mono>$60k</Mono> more than claiming at 62!
                    </Caption>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <H3 className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                Decision Scenarios
              </H3>
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <H4 className="mb-2">Scenario 1: Healthy, Good Savings</H4>
                  <Caption className="mb-2">
                    <strong>Profile:</strong> Age 65, excellent health, <Mono>$1.5M</Mono> portfolio, longevity in family
                  </Caption>
                  <Caption className="text-green-700">
                    <strong>Strategy:</strong> Delay to 70. Use portfolio withdrawals to bridge the gap. Maximize lifetime benefit.
                  </Caption>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <H4 className="mb-2">Scenario 2: Limited Savings</H4>
                  <Caption className="mb-2">
                    <strong>Profile:</strong> Age 64, average health, <Mono>$200K</Mono> savings, need income soon
                  </Caption>
                  <Caption className="text-blue-700">
                    <strong>Strategy:</strong> Claim at FRA (67). Balance benefit amount with immediate income needs.
                  </Caption>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <H4 className="mb-2">Scenario 3: Health Issues</H4>
                  <Caption className="mb-2">
                    <strong>Profile:</strong> Age 62, significant health concerns, limited life expectancy
                  </Caption>
                  <Caption className="text-orange-700">
                    <strong>Strategy:</strong> Claim at 62. Maximize total benefits given shorter time horizon.
                  </Caption>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <H4 className="text-yellow-900 mb-2">⚠️ Earnings Test (Before FRA)</H4>
              <BodyBase className="text-yellow-800 mb-2">
                If you claim before Full Retirement Age and continue working, your benefits may be reduced.
              </BodyBase>
              <Caption className="text-yellow-700">
                <strong>2024 Limit:</strong> ~<Mono>$22,000/year</Mono>. If you earn more, $1 in benefits is withheld for every $2 over the limit. After reaching FRA, no earnings penalty applies.
              </Caption>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Spousal & Survivor Benefits',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Education */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <H3>Coordinating as a Couple</H3>
              </div>
              <Body className="mb-4 leading-relaxed">
                Married couples should coordinate their Social Security claiming strategies to maximize
                total lifetime household benefits. The higher earner's decision impacts the surviving spouse.
              </Body>
            </div>

            <div>
              <H4 className="mb-3">Spousal Benefits</H4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <BodyBase className="text-blue-900 mb-3">
                  <strong>What is it?</strong> A spouse can claim up to 50% of the other spouse's Full Retirement Age benefit.
                </BodyBase>
                <div className="space-y-2 text-blue-800">
                  <BodyBase><strong>Eligibility:</strong> Must be at least age 62 and spouse must have already claimed benefits.</BodyBase>
                  <BodyBase><strong>Amount:</strong> Up to 50% of spouse's FRA benefit (not their actual benefit if they delayed/claimed early).</BodyBase>
                  <BodyBase><strong>When to Use:</strong> If 50% of your spouse's FRA benefit exceeds your own benefit amount.</BodyBase>
                </div>
              </div>

              <H4 className="mb-3">Survivor Benefits</H4>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <BodyBase className="text-purple-900 mb-3">
                  <strong>What is it?</strong> A surviving spouse receives 100% of the deceased spouse's benefit amount.
                </BodyBase>
                <div className="space-y-2 text-purple-800">
                  <BodyBase><strong>Eligibility:</strong> Available at age 60 (or age 50 if disabled).</BodyBase>
                  <BodyBase><strong>Amount:</strong> 100% of what the deceased was receiving (or entitled to receive).</BodyBase>
                  <BodyBase><strong>Key Strategy:</strong> If the higher earner delays to age 70, the survivor gets that higher amount for life.</BodyBase>
                </div>
              </div>
            </div>

            <div>
              <H4 className="mb-3">Divorced Spouse Benefits</H4>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <BodyBase className="text-indigo-900 mb-3">
                  You may be eligible for benefits based on your ex-spouse's record if:
                </BodyBase>
                <ul className="space-y-1 text-indigo-800">
                  <li><BodyBase>• Marriage lasted at least 10 years</BodyBase></li>
                  <li><BodyBase>• You are currently unmarried</BodyBase></li>
                  <li><BodyBase>• You are at least age 62</BodyBase></li>
                  <li><BodyBase>• Ex-spouse is entitled to benefits (doesn't have to be claiming)</BodyBase></li>
                </ul>
                <Caption className="text-indigo-700 mt-3 italic">
                  Note: Your ex-spouse's benefits are not affected by your claim.
                </Caption>
              </div>
            </div>
          </div>

          {/* Strategies & Examples */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
              <H3 className="text-purple-900 mb-4">🎯 Couple Strategy Examples</H3>

              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Example 1: Large Income Gap</H4>
                  <div className="space-y-2">
                    <BodyBase>
                      <strong>Higher Earner (FRA benefit <Mono>$3,000/mo</Mono>):</strong> Delays to age 70 → <Mono>$3,720/mo</Mono>
                    </BodyBase>
                    <BodyBase>
                      <strong>Lower Earner (FRA benefit <Mono>$1,000/mo</Mono>):</strong> Claims at age 67 → <Mono>$1,000/mo</Mono>
                    </BodyBase>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Caption className="text-green-700">
                        <strong>Benefit:</strong> If higher earner passes first, survivor gets <Mono>$3,720/mo</Mono> for life. If lower earner passes first, household still has <Mono>$3,720/mo</Mono>.
                      </Caption>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Example 2: Similar Earnings</H4>
                  <div className="space-y-2">
                    <BodyBase>
                      <strong>Spouse A (FRA benefit <Mono>$2,500/mo</Mono>):</strong> Delays to age 70 → <Mono>$3,100/mo</Mono>
                    </BodyBase>
                    <BodyBase>
                      <strong>Spouse B (FRA benefit <Mono>$2,200/mo</Mono>):</strong> Claims at age 67 → <Mono>$2,200/mo</Mono>
                    </BodyBase>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Caption className="text-blue-700">
                        <strong>Benefit:</strong> Household income of <Mono>$5,300/mo</Mono>. Survivor guaranteed at least <Mono>$3,100/mo</Mono>.
                      </Caption>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Example 3: One Non-Earner</H4>
                  <div className="space-y-2">
                    <BodyBase>
                      <strong>Working Spouse (FRA benefit <Mono>$2,800/mo</Mono>):</strong> Delays to age 70 → <Mono>$3,472/mo</Mono>
                    </BodyBase>
                    <BodyBase>
                      <strong>Non-Working Spouse:</strong> Claims spousal benefit at FRA → <Mono>$1,400/mo</Mono> (50% of worker's FRA)
                    </BodyBase>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Caption className="text-purple-700">
                        <strong>Benefit:</strong> Non-working spouse gets spousal benefit. If worker passes, survivor gets full <Mono>$3,472/mo</Mono>.
                      </Caption>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <H3 className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                Key Planning Principles
              </H3>
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <H4 className="text-green-900 mb-2">1. Higher Earner Should Consider Delaying</H4>
                  <Caption className="text-green-800">
                    The higher earner's benefit determines the survivor benefit. Delaying to 70 maximizes protection for the surviving spouse.
                  </Caption>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">2. Lower Earner Can Claim Earlier</H4>
                  <Caption className="text-blue-800">
                    The lower earner can claim at FRA or even 62 without significantly impacting survivor benefits.
                  </Caption>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <H4 className="text-purple-900 mb-2">3. Spousal Benefit is Based on FRA Amount</H4>
                  <Caption className="text-purple-800">
                    Even if the worker delays to 70, the spousal benefit is capped at 50% of the worker's FRA benefit (not the increased age 70 amount).
                  </Caption>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <H4 className="text-orange-900 mb-2">4. Consider Health & Longevity for Both</H4>
                  <Caption className="text-orange-800">
                    Factor in both spouses' health. If the higher earner has poor health, the survivor benefit advantage of delaying may not materialize.
                  </Caption>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]
};
