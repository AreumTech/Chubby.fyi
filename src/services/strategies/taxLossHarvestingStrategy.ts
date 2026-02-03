/**
 * Tax Loss Harvesting Strategy
 *
 * Educational strategy for tax-loss harvesting and portfolio tax optimization.
 */

import { BaseStrategy } from './BaseStrategy';
import type {
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters
} from '../../types/strategy';

export class TaxLossHarvestingStrategy extends BaseStrategy {
  id = 'tax-loss-harvesting';
  name = 'Tax Loss Harvesting Guide';
  category = 'TAX_OPTIMIZATION' as const;

  protected baseConfig = {
    id: this.id,
    name: this.name,
    description: 'Learn how to harvest tax losses to offset capital gains and reduce your tax burden',
    category: this.category,
    priority: 'MEDIUM' as const,
    estimatedTimeframe: 12,
    difficultyLevel: 'INTERMEDIATE' as const,
    tags: ['tax-loss-harvesting', 'tax-optimization', 'portfolio-management', 'capital-gains']
  };

  getParameters(): StrategyParameters {
    return {
      ...this.createDefaultParameters(),
      lossThreshold: {
        type: 'number',
        label: 'Typical Loss Threshold',
        description: 'What loss amount would you consider harvesting?',
        defaultValue: 1000,
        min: 100,
        max: 10000,
        step: 100,
        required: false
      },
      reviewFrequency: {
        type: 'select',
        label: 'Preferred Review Frequency',
        description: 'How often would you review for harvesting opportunities?',
        defaultValue: 'quarterly',
        options: [
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'annually', label: 'Annually' }
        ],
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check if user has taxable accounts
    const hasTaxableAccounts = context.currentEvents.some(event =>
      (event as any).targetAccountType === 'taxable'
    );

    if (!hasTaxableAccounts) {
      reasons.push('No taxable investment accounts found - tax-loss harvesting only applies to taxable accounts');
    }

    const currentAge = context.currentAge || 30;
    if (currentAge < 25) {
      reasons.push('Tax-loss harvesting most beneficial for those with established taxable portfolios');
    }

    return {
      applicable: reasons.length === 0,
      reasons: reasons.length === 0 ? ['Ready to learn about tax-loss harvesting'] : reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    // This is an informational-only strategy
    // The actual implementation would be done manually by the user

    const params = this.extractParameters(context);
    const recommendations = this.generateTLHRecommendations(params);
    const impact = await this.calculateTLHImpact(params, context);

    return this.createSuccessResult(
      'Tax Loss Harvesting Strategy - Educational Guide',
      [], // No auto-generated events for info-only strategy
      recommendations,
      impact,
      this.generateWarnings(params),
      this.generateNextSteps()
    );
  }

  private extractParameters(context: StrategyExecutionContext) {
    const inputs = context.userInputs || {};
    return {
      lossThreshold: inputs.lossThreshold || 1000,
      reviewFrequency: inputs.reviewFrequency || 'quarterly'
    };
  }

  private generateTLHRecommendations(params: any) {
    return [
      this.createRecommendation(
        'Understand Wash Sale Rules',
        'IRS wash sale rule prohibits claiming losses if you buy the same or substantially identical security within 30 days before or after the sale',
        'ACTION',
        'HIGH',
        'Avoid disallowed losses and IRS penalties',
        'Before implementing',
        'MODERATE'
      ),
      this.createRecommendation(
        'Focus on Taxable Accounts Only',
        'Tax-loss harvesting only provides benefits in taxable accounts - not IRAs or 401(k)s',
        'CONSIDERATION',
        'HIGH',
        'Maximize tax efficiency',
        'When selecting accounts'
      ),
      this.createRecommendation(
        'Track Cost Basis Carefully',
        'Maintain detailed records of purchase dates and cost basis for accurate loss calculations',
        'ACTION',
        'HIGH',
        'Ensure accurate tax reporting',
        'Ongoing',
        'EASY'
      ),
      this.createRecommendation(
        'Use Similar but Not Identical Replacements',
        'Replace sold securities with similar but not substantially identical investments',
        'OPTIMIZATION',
        'MEDIUM',
        'Maintain market exposure while harvesting losses',
        'At time of harvest',
        'MODERATE'
      ),
      this.createRecommendation(
        'Consider Transaction Costs',
        'Ensure tax savings exceed trading commissions and spreads',
        'CONSIDERATION',
        'MEDIUM',
        'Net positive benefit from harvesting',
        'Before each harvest'
      )
    ];
  }

  private async calculateTLHImpact(params: any, context: StrategyExecutionContext) {
    // Estimate typical tax-loss harvesting benefits
    const estimatedAnnualHarvesting = params.lossThreshold * 3; // Conservative estimate
    const marginalTaxRate = 0.24; // Assume 24% bracket
    const capitalGainsTaxRate = 0.15; // 15% long-term capital gains rate

    const annualTaxSavings = estimatedAnnualHarvesting * Math.max(marginalTaxRate, capitalGainsTaxRate);

    // Assume 20 years of benefit
    const lifetimeSavings = annualTaxSavings * 20;

    const impact = this.createBasicImpact(annualTaxSavings, lifetimeSavings, 20);

    impact.cashFlowImpact = {
      monthlyChange: 0,
      annualChange: annualTaxSavings,
      firstYearTotal: annualTaxSavings,
      explanation: 'Tax-loss harvesting reduces tax liability through offsetting capital gains'
    };

    impact.netWorthImpact = {
      fiveYearProjection: annualTaxSavings * 5,
      tenYearProjection: annualTaxSavings * 10,
      retirementImpact: lifetimeSavings
    };

    this.addRiskFactor(impact, 'Wash sale violations', 'MEDIUM', 'Careful tracking and 30-day waiting period');
    this.addRiskFactor(impact, 'Transaction costs', 'LOW', 'Use low-cost brokerages and ETFs');
    this.addRiskFactor(impact, 'Portfolio drift', 'MEDIUM', 'Monitor asset allocation after replacements');

    return impact;
  }

  private generateWarnings(params: any): string[] {
    const warnings: string[] = [];

    if (params.reviewFrequency === 'monthly') {
      warnings.push('Monthly reviews may lead to overtrading and increased transaction costs');
    }

    warnings.push('Tax-loss harvesting is a manual process requiring careful attention to wash sale rules');
    warnings.push('Consider consulting a tax professional for complex situations');

    return warnings;
  }

  private generateNextSteps(): string[] {
    return [
      'Learn the IRS wash sale rule and 30-day restriction',
      'Identify taxable accounts with unrealized losses',
      'Research similar but not substantially identical replacement securities',
      'Set up cost basis tracking system',
      'Consider using tax-loss harvesting software or robo-advisor services',
      'Consult with tax professional for personalized guidance'
    ];
  }
}
