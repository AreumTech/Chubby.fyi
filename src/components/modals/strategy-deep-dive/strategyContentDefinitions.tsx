import React from 'react';
import { investmentStrategyContent } from './strategies/investmentStrategy';
import { retirementWithdrawalStrategyContent } from './strategies/retirementWithdrawalStrategy';
import { contributionOptimizationStrategyContent } from './strategies/contributionOptimizationStrategy';
import { taxOptimizationStrategyContent } from './strategies/taxOptimizationStrategy';
import { taxWithholdingStrategyContent } from './strategies/taxWithholdingStrategy';
import { rothConversionStrategyContent } from './strategies/rothConversionStrategy';
import { taxLossHarvestingStrategyContent } from './strategies/taxLossHarvestingStrategy';
import { socialSecurityStrategyContent } from './strategies/socialSecurityStrategy';

export interface TabContent {
  name: string;
  content: React.ReactNode;
}

export interface StrategyContent {
  title: string;
  subtitle: string;
  difficulty: string;
  tabs: TabContent[];
}

export const getStrategyContent = (strategyId: string): StrategyContent => {
  const content = {
    'investment-optimization': investmentStrategyContent,
    'retirement-withdrawal': retirementWithdrawalStrategyContent,
    'contribution-optimization': contributionOptimizationStrategyContent,
    'tax-optimization': taxOptimizationStrategyContent,
    'tax-withholding': taxWithholdingStrategyContent,
    'roth-conversion': rothConversionStrategyContent,
    'tax-loss-harvesting': taxLossHarvestingStrategyContent,
    'social-security-optimization': socialSecurityStrategyContent
  };

  return content[strategyId as keyof typeof content] || {
    title: 'Strategy Information',
    subtitle: 'Strategy configuration and information',
    difficulty: 'Intermediate',
    tabs: [
      {
        name: 'Overview',
        content: (
          <div className="text-center py-8">
            <p className="text-gray-600">Educational content for this strategy is being developed.</p>
          </div>
        )
      }
    ]
  };
};