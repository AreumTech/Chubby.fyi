/**
 * Roth Conversion Strategy
 *
 * Educational strategy for Roth IRA conversions and bracket filling.
 */

import { BaseStrategy } from './BaseStrategy';
import type {
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters
} from '../../types/strategy';

export class RothConversionStrategy extends BaseStrategy {
  id = 'roth-conversion';
  name = 'Roth Conversion Planner';
  category = 'TAX_OPTIMIZATION' as const;

  protected baseConfig = {
    id: this.id,
    name: this.name,
    description: 'Plan Roth IRA conversions to lock in lower tax rates and reduce future RMDs',
    category: this.category,
    priority: 'HIGH' as const,
    estimatedTimeframe: 60,
    difficultyLevel: 'ADVANCED' as const,
    tags: ['roth-conversion', 'tax-planning', 'rmd-reduction', 'bracket-filling', 'retirement']
  };

  getParameters(): StrategyParameters {
    return {
      ...this.createDefaultParameters(),
      currentTaxBracket: {
        type: 'percentage',
        label: 'Current Tax Bracket',
        description: 'Your current marginal tax rate',
        defaultValue: 0.22,
        min: 0.10,
        max: 0.37,
        step: 0.01,
        required: true
      },
      targetRetirementBracket: {
        type: 'percentage',
        label: 'Expected Retirement Tax Bracket',
        description: 'Expected marginal tax rate in retirement',
        defaultValue: 0.12,
        min: 0.10,
        max: 0.37,
        step: 0.01,
        required: true
      },
      annualConversionAmount: {
        type: 'number',
        label: 'Target Annual Conversion',
        description: 'Target amount for annual Roth conversions',
        defaultValue: 50000,
        min: 0,
        max: 500000,
        step: 5000,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check if user has tax-deferred accounts
    const hasTaxDeferred = context.currentEvents.some(event =>
      (event as any).targetAccountType === 'tax_deferred'
    );

    if (!hasTaxDeferred) {
      reasons.push('No Traditional IRA or 401k accounts found - conversions require pre-tax retirement accounts');
    }

    const currentAge = context.currentAge || 30;
    if (currentAge < 30) {
      reasons.push('Roth conversions most beneficial for those with established retirement savings');
    }

    if (currentAge >= 72) {
      reasons.push('Already subject to RMDs - conversion strategy may be limited');
    }

    return {
      applicable: reasons.length === 0,
      reasons: reasons.length === 0 ? ['Ready to plan Roth conversion strategy'] : reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    // This is an informational-only strategy
    // The actual implementation would be done through manual Roth conversion events

    const params = this.extractParameters(context);
    const recommendations = this.generateRothRecommendations(params);
    const impact = await this.calculateRothImpact(params, context);

    return this.createSuccessResult(
      'Roth Conversion Strategy - Educational Guide',
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
      currentTaxBracket: inputs.currentTaxBracket || 0.22,
      targetRetirementBracket: inputs.targetRetirementBracket || 0.12,
      annualConversionAmount: inputs.annualConversionAmount || 50000
    };
  }

  private generateRothRecommendations(params: any) {
    return [
      this.createRecommendation(
        'Assess Bracket Filling Opportunity',
        `With current ${(params.currentTaxBracket * 100).toFixed(0)}% bracket vs expected ${(params.targetRetirementBracket * 100).toFixed(0)}% retirement bracket`,
        'ACTION',
        'HIGH',
        'Lock in lower tax rates before retirement',
        'Annually',
        'MODERATE'
      ),
      this.createRecommendation(
        'Consider 5-Year Rule',
        'Each conversion has a 5-year waiting period for penalty-free withdrawal of principal',
        'CONSIDERATION',
        'HIGH',
        'Plan conversions well before retirement',
        'Before retirement'
      ),
      this.createRecommendation(
        'Monitor IRMAA Impact',
        'Large conversions can trigger higher Medicare premiums two years later',
        'WARNING',
        'MEDIUM',
        'Avoid pushing income above IRMAA thresholds',
        'When planning conversions',
        'MODERATE'
      ),
      this.createRecommendation(
        'Tax Payment Strategy',
        'Pay conversion taxes from taxable accounts, not retirement accounts',
        'OPTIMIZATION',
        'HIGH',
        'Maximize the benefit of the conversion',
        'At conversion time',
        'EASY'
      )
    ];
  }

  private async calculateRothImpact(params: any, context: StrategyExecutionContext) {
    const annualAmount = params.annualConversionAmount;
    const currentTax = annualAmount * params.currentTaxBracket;
    const futureTaxSavings = annualAmount * params.targetRetirementBracket;

    // Assume 20-year conversion strategy
    const totalConverted = annualAmount * 20;
    const totalTaxPaid = currentTax * 20;
    const potentialFutureSavings = totalConverted * (params.targetRetirementBracket - params.currentTaxBracket);

    const impact = this.createBasicImpact(0, potentialFutureSavings, 20);

    impact.cashFlowImpact = {
      monthlyChange: -currentTax / 12,
      annualChange: -currentTax,
      firstYearTotal: -currentTax,
      explanation: 'Conversions reduce current cash flow but create tax-free retirement income'
    };

    impact.netWorthImpact = {
      fiveYearProjection: potentialFutureSavings * 0.25,
      tenYearProjection: potentialFutureSavings * 0.5,
      retirementImpact: potentialFutureSavings
    };

    this.addRiskFactor(impact, 'Tax rate uncertainty', 'MEDIUM', 'Conversions are irreversible');
    this.addRiskFactor(impact, 'IRMAA impact', 'MEDIUM', 'Monitor Medicare premium thresholds');

    return impact;
  }

  private generateWarnings(params: any): string[] {
    const warnings: string[] = [];

    if (params.currentTaxBracket >= params.targetRetirementBracket) {
      warnings.push('Current bracket is equal to or higher than expected retirement bracket - conversion may not be beneficial');
    }

    if (params.annualConversionAmount > 100000) {
      warnings.push('Large conversion amounts may trigger IRMAA surcharges and push you into higher brackets');
    }

    return warnings;
  }

  private generateNextSteps(): string[] {
    return [
      'Calculate your available bracket room for the current year',
      'Review Traditional IRA and 401k balances',
      'Estimate future RMD amounts to assess conversion benefit',
      'Consider multi-year conversion ladder strategy',
      'Ensure sufficient cash to pay conversion taxes from taxable accounts',
      'Consult with tax professional for personalized guidance'
    ];
  }
}
