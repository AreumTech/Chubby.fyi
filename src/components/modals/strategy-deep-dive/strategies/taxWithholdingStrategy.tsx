import React from 'react';
import { StrategyContent } from '../strategyContentDefinitions';
import { H3, H4, Body, BodyBase, Mono } from '@/components/ui/Typography';

export const taxWithholdingStrategyContent: StrategyContent = {
  title: 'Tax Withholding Strategy',
  subtitle: 'Optimize tax withholding and settlement timing for better cash flow',
  difficulty: 'Intermediate',
  tabs: [
    {
      name: 'Withholding Strategy',
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
                <ul className="text-sm text-indigo-800 space-y-1">
                  <li>• <strong>Federal Income Tax:</strong> Withheld monthly based on W-4 settings</li>
                  <li>• <strong>State Income Tax:</strong> Varies by state, typically settled annually</li>
                  <li>• <strong>FICA Taxes:</strong> Social Security (6.2%) + Medicare (1.45%), settled annually</li>
                  <li>• <strong>Tax Settlement:</strong> Additional payment in April for State + FICA</li>
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
                <div className="space-y-2 text-sm text-gray-800">
                  <div className="flex justify-between">
                    <span>Annual Gross Income:</span>
                    <Mono weight="semibold">$700,000</Mono>
                  </div>
                  <div className="flex justify-between">
                    <span>• Federal Income Tax (withheld monthly):</span>
                    <Mono className="text-red-600">-$211,000</Mono>
                  </div>
                  <div className="flex justify-between border-t border-yellow-300 pt-2">
                    <span className="font-semibold">Monthly Take-Home (visible):</span>
                    <Mono weight="bold" className="text-green-600">$489,000/year</Mono>
                  </div>
                  <div className="flex justify-between text-gray-600 mt-4">
                    <span>• State Income Tax (settled April):</span>
                    <Mono>-$67,000</Mono>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>• FICA Taxes (settled April):</span>
                    <Mono>-$26,000</Mono>
                  </div>
                  <div className="flex justify-between border-t border-yellow-300 pt-2 font-bold">
                    <span className="text-gray-900">True Annual Take-Home:</span>
                    <Mono className="text-green-700">$396,000</Mono>
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
                  <BodyBase className="text-red-800">Ensure you have sufficient cash reserves to cover the April tax settlement (typically 13-15% of gross income for high earners).</BodyBase>
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
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Annual Income:</span>
                      <span className="font-medium">$700,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Federal Withholding:</span>
                      <span className="font-medium text-red-600">$17,599 × 12 = $211,188</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600 font-semibold">Monthly Visible Take-Home:</span>
                      <span className="font-medium text-green-600">$40,734/month</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 italic">
                      <span>Annualized:</span>
                      <span>$40,734 × 12 = $488,808</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">April Tax Settlement</H4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">State Income Tax:</span>
                      <span className="font-medium text-orange-600">$67,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">FICA Taxes:</span>
                      <span className="font-medium text-orange-600">$26,000</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span className="text-red-900">Additional Tax Payment:</span>
                      <span className="text-red-600">$93,000</span>
                    </div>
                  </div>
                </div>
                <div className="bg-green-100 rounded-lg p-4">
                  <H4 className="text-green-900 mb-3">True Annual Take-Home</H4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-800">Gross Income:</span>
                      <span className="font-medium">$700,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-800">Total Taxes (all sources):</span>
                      <span className="font-medium">-$304,000</span>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2 font-bold">
                      <span className="text-green-900">Net Annual Take-Home:</span>
                      <span className="text-green-600">$396,000</span>
                    </div>
                    <div className="flex justify-between text-xs text-green-700 italic mt-2">
                      <span>Effective Tax Rate:</span>
                      <span>43.4%</span>
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
          </div>
        </div>
      )
    }
  ]
};
