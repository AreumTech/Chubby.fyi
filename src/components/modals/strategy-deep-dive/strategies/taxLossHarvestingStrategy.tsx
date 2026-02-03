import React from 'react';
import { StrategyContent } from '../strategyContentDefinitions';
import { H3, H4, Body, BodyBase, Label, Caption, Mono } from '@/components/ui/Typography';

export const taxLossHarvestingStrategyContent: StrategyContent = {
  title: 'Tax Loss Harvesting Strategy',
  subtitle: 'Learn how to harvest tax losses to offset capital gains and reduce your tax burden',
  difficulty: 'Intermediate',
  tabs: [
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
                <ul className="space-y-1">
                  <BodyBase as="li" className="text-green-800">• Offset up to $3,000 of ordinary income annually</BodyBase>
                  <BodyBase as="li" className="text-green-800">• Unlimited offset of capital gains</BodyBase>
                  <BodyBase as="li" className="text-green-800">• Carry forward unused losses indefinitely</BodyBase>
                  <BodyBase as="li" className="text-green-800">• Stay invested while reducing taxes</BodyBase>
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
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <H4>Monitor Your Portfolio</H4>
                    <BodyBase color="secondary">Watch for investments that have declined below your cost basis</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <H4>Sell at a Loss</H4>
                    <BodyBase color="secondary">Sell the losing investment to realize the capital loss</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <H4>Reinvest Immediately</H4>
                    <BodyBase color="secondary">Buy a similar (but not identical) investment to maintain exposure</BodyBase>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</div>
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
                  <BodyBase className="text-red-800">Cannot buy the same or "substantially identical" security within 30 days before or after the sale. Violation disallows the tax loss.</BodyBase>
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
                      <Label color="secondary">VTSAX Investment:</Label>
                      <Mono>$50,000 → $45,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <Label color="secondary">Unrealized Loss:</Label>
                      <Mono className="text-red-600">-$5,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <Label color="secondary">Capital Gains (Other):</Label>
                      <Mono className="text-green-600">+$8,000</Mono>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <H4 className="mb-3">Action Taken</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label color="secondary">1. Sell VTSAX:</Label>
                      <Mono>Realize -$5,000 loss</Mono>
                    </div>
                    <div className="flex justify-between">
                      <Label color="secondary">2. Buy SWTSX:</Label>
                      <Mono>Maintain market exposure</Mono>
                    </div>
                  </div>
                </div>
                <div className="bg-green-100 rounded-lg p-4">
                  <H4 className="text-green-900 mb-3">Tax Benefit</H4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-green-800">Capital Gains Tax (Before):</Label>
                      <Mono>$1,200 (15% × $8,000)</Mono>
                    </div>
                    <div className="flex justify-between">
                      <Label className="text-green-800">Net Gains After Harvest:</Label>
                      <Mono>$3,000</Mono>
                    </div>
                    <div className="flex justify-between">
                      <Label className="text-green-800">Capital Gains Tax (After):</Label>
                      <Mono>$450 (15% × $3,000)</Mono>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2">
                      <Label weight="bold" className="text-green-900">Tax Savings:</Label>
                      <Mono className="text-green-600">$750</Mono>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <H3 className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                Common Replacement Pairs
              </H3>
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <H4 className="text-purple-900 mb-2">🔄 Total Market Funds</H4>
                  <BodyBase className="text-purple-800">VTSAX (Vanguard) ↔ SWTSX (Schwab) ↔ FSKAX (Fidelity)</BodyBase>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <H4 className="text-blue-900 mb-2">🔄 S&P 500 Funds</H4>
                  <BodyBase className="text-blue-800">VOO (Vanguard) ↔ SPLG (SPDR) ↔ IVV (iShares)</BodyBase>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <H4 className="text-green-900 mb-2">🔄 International Funds</H4>
                  <BodyBase className="text-green-800">VXUS (Vanguard) ↔ IXUS (iShares) ↔ SWISX (Schwab)</BodyBase>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <H3 className="mb-4">⚙️ Best Practices</H3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="text-green-600 text-lg">✓</div>
                  <div>
                    <Label>Set a minimum threshold</Label>
                    <Caption color="secondary">Only harvest losses above $1,000 to make effort worthwhile</Caption>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-green-600 text-lg">✓</div>
                  <div>
                    <Label>Review quarterly</Label>
                    <Caption color="secondary">Regular reviews capture opportunities without overtrading</Caption>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-green-600 text-lg">✓</div>
                  <div>
                    <Label>Use tax software</Label>
                    <Caption color="secondary">Track cost basis and wash sales automatically</Caption>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-red-600 text-lg">✗</div>
                  <div>
                    <Label>Don't let tax tail wag dog</Label>
                    <Caption color="secondary">Never sacrifice investment strategy for minor tax savings</Caption>
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
