/**
 * Wealth Transfer and Charitable Giving Strategy
 */

import { BaseStrategy } from './BaseStrategy';
import type {
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent
} from '../../types/strategy';

export class WealthTransferStrategy extends BaseStrategy {
  id = 'wealth-transfer';
  name = 'Wealth Transfer & Charitable Giving Optimizer';
  category = 'ESTATE_PLANNING' as const;

  // Tax constants
  private readonly TAX_CONSTANTS = {
    annualGiftExclusion: 18000,
    lifetimeGiftExemption: 13610000,
    estateExemption: 13610000,
    maxEstateTaxRate: 0.40,
    charitableDeductionLimit: 0.60
  };

  protected baseConfig = {
    id: this.id,
    name: this.name,
    description: 'Optimize wealth transfer through advanced estate planning and charitable giving strategies',
    category: this.category,
    priority: 'HIGH' as const,
    estimatedTimeframe: 240,
    difficultyLevel: 'ADVANCED' as const,
    tags: ['estate-planning', 'charitable-giving', 'trusts', 'tax-optimization', 'generation-skipping', 'business-succession']
  };

  getParameters(): StrategyParameters {
    return {
      ...this.createDefaultParameters(),
      estateValue: {
        type: 'number',
        label: 'Current Estate Value',
        description: 'Total value of all assets subject to estate tax',
        defaultValue: 5000000,
        min: 1000000,
        max: 100000000,
        step: 100000,
        required: true
      },
      annualGiftingAmount: {
        type: 'number',
        label: 'Annual Gifting Budget',
        description: 'Amount available for annual gifts to beneficiaries',
        defaultValue: 200000,
        min: 0,
        max: 2000000,
        step: 10000,
        required: true
      },
      charitableGivingAmount: {
        type: 'number',
        label: 'Annual Charitable Giving',
        description: 'Annual amount dedicated to charitable contributions',
        defaultValue: 100000,
        min: 0,
        max: 1000000,
        step: 5000,
        required: true
      },
      numberOfBeneficiaries: {
        type: 'number',
        label: 'Number of Beneficiaries',
        description: 'Total number of individuals receiving gifts',
        defaultValue: 4,
        min: 1,
        max: 20,
        step: 1,
        required: true
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const estateValue = context.userInputs?.estateValue || 5000000;

    if (estateValue < 1000000) {
      reasons.push('Estate value below minimum threshold for advanced planning');
    }

    if (context.currentAge < 45) {
      reasons.push('Wealth transfer planning typically more relevant for later life stages');
    }

    if (!this.hasAdequateIncome(context, 100000)) {
      reasons.push('Insufficient income to support gifting strategies');
    }

    return {
      applicable: reasons.length === 0,
      reasons: reasons.length === 0 ? [`Estate value ${this.formatCurrency(estateValue)} suitable for advanced planning`] : reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const params = this.extractParameters(context);
    const generatedEvents = this.generateWealthTransferEvents(params);
    const recommendations = this.generateWealthTransferRecommendations(params);
    const impact = await this.calculateWealthTransferImpact(params);

    return this.createSuccessResult(
      `Wealth Transfer Plan - ${this.formatCurrency(params.estateValue)} Estate`,
      generatedEvents,
      recommendations,
      impact,
      this.generateWarnings(params),
      this.generateNextSteps()
    );
  }

  private extractParameters(context: StrategyExecutionContext) {
    const inputs = context.userInputs || {};
    const estateValue = inputs.estateValue || 5000000;
    const annualGiftingAmount = inputs.annualGiftingAmount || 200000;
    const charitableGivingAmount = inputs.charitableGivingAmount || 100000;
    const numberOfBeneficiaries = inputs.numberOfBeneficiaries || 4;

    return {
      estateValue,
      annualGiftingAmount,
      charitableGivingAmount,
      numberOfBeneficiaries,
      giftPerBeneficiary: Math.min(this.TAX_CONSTANTS.annualGiftExclusion, annualGiftingAmount / numberOfBeneficiaries),
      estimatedEstateTax: Math.max(0, (estateValue - this.TAX_CONSTANTS.estateExemption) * this.TAX_CONSTANTS.maxEstateTaxRate)
    };
  }

  private generateWealthTransferEvents(params: any): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];

    // Annual gifting strategy
    if (params.annualGiftingAmount > 0) {
      const giftingEvent = this.createFinancialEvent(
        'GIFT',
        'Annual Gift Strategy',
        `Annual gifts to ${params.numberOfBeneficiaries} beneficiaries`,
        -params.annualGiftingAmount,
        { targetAccountType: 'taxable' }
      );
      events.push(this.createStrategyEvent(giftingEvent, 'Reduce estate through annual exclusion gifts', 'HIGH'));
    }

    // Charitable giving strategy
    if (params.charitableGivingAmount > 0) {
      const charitableEvent = this.createFinancialEvent(
        'CHARITABLE_CONTRIBUTION',
        'Charitable Giving Strategy',
        `Annual charitable contributions for tax benefits`,
        -params.charitableGivingAmount,
        { targetAccountType: 'taxable' }
      );
      events.push(this.createStrategyEvent(charitableEvent, 'Tax-deductible charitable contributions', 'MEDIUM'));
    }

    // Trust establishment if estate is large
    if (params.estateValue > this.TAX_CONSTANTS.estateExemption * 1.5) {
      const trustEvent = this.createFinancialEvent(
        'TRUST_ESTABLISHMENT',
        'Irrevocable Trust Setup',
        'Establish trust for estate tax reduction',
        -50000, // Setup costs
        { targetAccountType: 'cash' }
      );
      events.push(this.createStrategyEvent(trustEvent, 'Advanced estate planning structure', 'HIGH'));
    }

    return events;
  }

  private generateWealthTransferRecommendations(params: any) {
    return [
      this.createRecommendation(
        'Maximize Annual Exclusions',
        `Gift ${this.formatCurrency(this.TAX_CONSTANTS.annualGiftExclusion)} per beneficiary annually`,
        'ACTION',
        'HIGH',
        'Reduce estate without using lifetime exemption',
        'Annually'
      ),
      this.createRecommendation(
        'Charitable Giving Optimization',
        'Optimize timing and structure of charitable contributions for maximum tax benefit',
        'OPTIMIZATION',
        'MEDIUM',
        'Significant tax savings and philanthropic impact',
        '1-2 months',
        'MODERATE'
      ),
      this.createRecommendation(
        'Estate Planning Review',
        'Annual review of estate plan with qualified attorney',
        'ACTION',
        'HIGH',
        'Ensure plan remains current with tax law changes',
        'Annually',
        'EASY'
      ),
      this.createRecommendation(
        'Life Insurance Analysis',
        'Consider life insurance for estate liquidity',
        'CONSIDERATION',
        'MEDIUM',
        'Provide liquidity for estate tax payment',
        '2-3 months',
        'MODERATE'
      )
    ];
  }

  private async calculateWealthTransferImpact(params: any): Promise<StrategyImpact> {
    const annualTaxSavings = this.calculateTaxSavings(params.charitableGivingAmount, 0.37); // Top tax bracket
    const estateTaxReduction = this.calculateEstateTaxSavings(params);
    const monthlyChange = -(params.annualGiftingAmount + params.charitableGivingAmount) / 12;

    const impact = this.createBasicImpact(monthlyChange, annualTaxSavings, 20);

    // Add estate tax savings to net worth impact
    impact.netWorthImpact.fiveYearProjection += estateTaxReduction * 0.3;
    impact.netWorthImpact.tenYearProjection += estateTaxReduction * 0.6;
    impact.netWorthImpact.retirementImpact = estateTaxReduction;

    this.addRiskFactor(impact, 'Tax law changes affecting estate exemptions', 'MEDIUM', 'Flexible planning strategy');
    this.addRiskFactor(impact, 'Liquidity needs for gifts and contributions', 'LOW', 'Structured giving schedule');

    return impact;
  }

  private calculateEstateTaxSavings(params: any): number {
    // Simplified calculation - actual savings from gifting strategy
    const giftsOverTime = params.annualGiftingAmount * 15; // 15 years of gifts
    const estateTaxOnGifts = giftsOverTime * this.TAX_CONSTANTS.maxEstateTaxRate;
    return Math.min(estateTaxOnGifts, params.estimatedEstateTax);
  }

  private generateWarnings(params: any): string[] {
    const warnings: string[] = [];

    if (params.annualGiftingAmount > params.numberOfBeneficiaries * this.TAX_CONSTANTS.annualGiftExclusion) {
      warnings.push('Annual gifts exceed exclusion limits - may use lifetime exemption');
    }

    if (params.charitableGivingAmount > 100000) {
      warnings.push('Large charitable gifts - ensure adequate liquidity for personal needs');
    }

    if (params.estateValue > this.TAX_CONSTANTS.estateExemption * 2) {
      warnings.push('Large estate - consider advanced planning structures');
    }

    return warnings;
  }

  private generateNextSteps(): string[] {
    return [
      'Consult with estate planning attorney',
      'Review and update will and trust documents',
      'Implement annual gifting strategy',
      'Establish charitable giving plan',
      'Consider life insurance for estate liquidity',
      'Set up record-keeping for gifts and charitable contributions',
      'Schedule annual plan review'
    ];
  }
}