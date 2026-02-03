/**
 * International/Expat Tax and Investment Strategy
 */

import { BaseStrategy } from './BaseStrategy';
import type {
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent
} from '../../types/strategy';

export class InternationalExpatStrategy extends BaseStrategy {
  id = 'international-expat';
  name = 'International Expat Optimizer';
  category = 'TAX_OPTIMIZATION' as const;

  // Tax treaty and FEIE constants
  private readonly EXPAT_CONSTANTS = {
    FEIE_LIMIT_2024: 126500,
    HOUSING_EXCLUSION_BASE: 20240,
    FATCA_THRESHOLD: 50000,
    FBAR_THRESHOLD: 10000
  };

  private readonly TAX_TREATIES = {
    UK: { dividendTax: 0.15, totalization: true },
    Germany: { dividendTax: 0.15, totalization: true },
    Singapore: { dividendTax: 0.00, totalization: false },
    Netherlands: { dividendTax: 0.15, totalization: true },
    Canada: { dividendTax: 0.15, totalization: true },
    Japan: { dividendTax: 0.10, totalization: true },
    France: { dividendTax: 0.15, totalization: true },
    Australia: { dividendTax: 0.15, totalization: true }
  };

  protected baseConfig = {
    id: this.id,
    name: this.name,
    description: 'Optimize taxes, investments, and compliance for US citizens living abroad',
    category: this.category,
    priority: 'HIGH' as const,
    estimatedTimeframe: 120,
    difficultyLevel: 'ADVANCED' as const,
    tags: ['international', 'expat', 'foreign-tax-credit', 'FEIE', 'tax-treaties', 'compliance']
  };

  getParameters(): StrategyParameters {
    return {
      ...this.createDefaultParameters(),
      residenceCountry: {
        type: 'selection',
        label: 'Country of Residence',
        description: 'Current country of tax residence',
        defaultValue: 'UK',
        options: [
          { value: 'UK', label: 'United Kingdom' },
          { value: 'Germany', label: 'Germany' },
          { value: 'Singapore', label: 'Singapore' },
          { value: 'Netherlands', label: 'Netherlands' },
          { value: 'Canada', label: 'Canada' },
          { value: 'Japan', label: 'Japan' },
          { value: 'France', label: 'France' },
          { value: 'Australia', label: 'Australia' }
        ],
        required: true
      },
      foreignEarnedIncome: {
        type: 'number',
        label: 'Foreign Earned Income',
        description: 'Annual foreign employment income in USD',
        defaultValue: 120000,
        min: 0,
        max: 500000,
        step: 5000,
        required: true
      },
      foreignTaxesPaid: {
        type: 'number',
        label: 'Foreign Taxes Paid',
        description: 'Annual foreign income taxes paid in USD',
        defaultValue: 25000,
        min: 0,
        max: 200000,
        step: 1000,
        required: true
      },
      hasUSInvestments: {
        type: 'boolean',
        label: 'Has US Investments',
        description: 'Do you maintain US-based investment accounts?',
        defaultValue: true,
        required: false
      },
      hasForeignInvestments: {
        type: 'boolean',
        label: 'Has Foreign Investments',
        description: 'Do you have foreign investment accounts?',
        defaultValue: false,
        required: false
      },
      planningRepatriation: {
        type: 'boolean',
        label: 'Planning Repatriation',
        description: 'Are you planning to return to the US?',
        defaultValue: false,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const foreignIncome = context.userInputs?.foreignEarnedIncome || 0;

    if (foreignIncome < 10000) {
      reasons.push('Minimal foreign income - strategy most beneficial for substantial foreign earnings');
    }

    if (!context.userInputs?.residenceCountry) {
      reasons.push('Country of residence required for tax treaty analysis');
    }

    const usIncome = this.estimateMonthlyIncome(context.currentEvents) * 12;
    if (usIncome > foreignIncome) {
      reasons.push('Primarily US income - strategy designed for foreign income optimization');
    }

    return {
      applicable: reasons.length === 0,
      reasons: reasons.length === 0 ? [`Optimize expat strategy for ${this.formatCurrency(foreignIncome)} foreign income`] : reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const params = this.extractParameters(context);
    const analysis = this.performExpatAnalysis(params);
    const generatedEvents = this.generateExpatEvents(params, analysis);
    const recommendations = this.generateExpatRecommendations(params, analysis);
    const impact = await this.calculateExpatImpact(params, analysis);

    return this.createSuccessResult(
      `Expat Optimization Plan - ${params.residenceCountry} Resident`,
      generatedEvents,
      recommendations,
      impact,
      this.generateWarnings(params, analysis),
      this.generateNextSteps()
    );
  }

  private extractParameters(context: StrategyExecutionContext) {
    const inputs = context.userInputs || {};
    const residenceCountry = inputs.residenceCountry || 'UK';
    const foreignEarnedIncome = inputs.foreignEarnedIncome || 120000;
    const foreignTaxesPaid = inputs.foreignTaxesPaid || 25000;
    const hasUSInvestments = inputs.hasUSInvestments !== false;
    const hasForeignInvestments = inputs.hasForeignInvestments || false;

    return {
      residenceCountry,
      foreignEarnedIncome,
      foreignTaxesPaid,
      hasUSInvestments,
      hasForeignInvestments,
      treatyData: this.TAX_TREATIES[residenceCountry as keyof typeof this.TAX_TREATIES] || this.TAX_TREATIES.UK,
      effectiveForeignTaxRate: foreignTaxesPaid / foreignEarnedIncome
    };
  }

  private performExpatAnalysis(params: any) {
    // FEIE vs FTC analysis
    const feieExclusion = Math.min(params.foreignEarnedIncome, this.EXPAT_CONSTANTS.FEIE_LIMIT_2024);
    const feieTaxSavings = feieExclusion * 0.22; // Assume 22% bracket

    const ftcCredit = Math.min(params.foreignTaxesPaid, params.foreignEarnedIncome * 0.35); // Max 35% rate
    const ftcTaxSavings = ftcCredit;

    const optimalStrategy = feieTaxSavings > ftcTaxSavings ? 'FEIE' : 'FTC';
    const taxSavings = Math.max(feieTaxSavings, ftcTaxSavings);

    return {
      optimalStrategy,
      feieExclusion,
      feieTaxSavings,
      ftcCredit,
      ftcTaxSavings,
      taxSavings,
      treatyBenefits: this.calculateTreatyBenefits(params),
      complianceRequirements: this.assessComplianceRequirements(params)
    };
  }

  private calculateTreatyBenefits(params: any): number {
    // Simplified treaty benefit calculation
    const investmentIncome = 50000; // Estimated
    const treatyReduction = investmentIncome * params.treatyData.dividendTax;
    const withoutTreaty = investmentIncome * 0.30; // 30% withholding
    return withoutTreaty - treatyReduction;
  }

  private assessComplianceRequirements(params: any) {
    return {
      needsFBAR: params.hasForeignInvestments,
      needsFATCA: params.hasForeignInvestments,
      needsForm2555: params.foreignEarnedIncome > 0,
      needsForm1116: params.foreignTaxesPaid > 0,
      estimatedComplianceCost: 2500 // Professional preparation
    };
  }

  private generateExpatEvents(params: any, analysis: any): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];

    // Tax savings event
    if (analysis.taxSavings > 0) {
      const savingsEvent = this.createFinancialEvent(
        'TAX_SAVINGS',
        `${analysis.optimalStrategy} Tax Optimization`,
        `Annual tax savings using ${analysis.optimalStrategy} strategy`,
        analysis.taxSavings,
        { targetAccountType: 'cash' }
      );
      events.push(this.createStrategyEvent(savingsEvent, `Optimize expat taxes using ${analysis.optimalStrategy}`, 'HIGH'));
    }

    // Compliance costs event
    const complianceEvent = this.createFinancialEvent(
      'PROFESSIONAL_SERVICES',
      'Expat Tax Compliance',
      'Annual expat tax preparation and compliance costs',
      -analysis.complianceRequirements.estimatedComplianceCost,
      { targetAccountType: 'cash' }
    );
    events.push(this.createStrategyEvent(complianceEvent, 'Professional expat tax compliance', 'MEDIUM'));

    // Currency hedging if significant foreign assets
    if (params.hasForeignInvestments) {
      const hedgingEvent = this.createFinancialEvent(
        'INVESTMENT_ALLOCATION',
        'Currency Hedging Strategy',
        'Implement currency hedging for foreign investments',
        0, // No immediate cash impact
        { targetAccountType: 'taxable' }
      );
      events.push(this.createStrategyEvent(hedgingEvent, 'Manage currency risk exposure', 'MEDIUM'));
    }

    return events;
  }

  private generateExpatRecommendations(params: any, analysis: any) {
    return [
      this.createRecommendation(
        `Use ${analysis.optimalStrategy} Strategy`,
        `Implement ${analysis.optimalStrategy === 'FEIE' ? 'Foreign Earned Income Exclusion' : 'Foreign Tax Credit'} for optimal tax savings`,
        'ACTION',
        'HIGH',
        `Save ${this.formatCurrency(analysis.taxSavings)} annually`,
        'Before next tax filing'
      ),
      this.createRecommendation(
        'Professional Tax Preparation',
        'Work with expat-specialized tax professional for compliance',
        'ACTION',
        'HIGH',
        'Ensure proper compliance and optimization',
        'Annual',
        'EASY'
      ),
      this.createRecommendation(
        'Investment Location Optimization',
        'Optimize investment account locations for tax efficiency',
        'OPTIMIZATION',
        'MEDIUM',
        'Minimize PFIC issues and maximize treaty benefits',
        '3-6 months',
        'MODERATE'
      ),
      this.createRecommendation(
        'Currency Risk Management',
        'Implement currency hedging for foreign assets',
        'CONSIDERATION',
        'MEDIUM',
        'Protect against currency fluctuation',
        'Quarterly review',
        'MODERATE'
      )
    ];
  }

  private async calculateExpatImpact(params: any, analysis: any): Promise<StrategyImpact> {
    const annualTaxSavings = analysis.taxSavings;
    const complianceCosts = analysis.complianceRequirements.estimatedComplianceCost;
    const netBenefit = annualTaxSavings - complianceCosts;

    const impact = this.createBasicImpact(0, annualTaxSavings, 10);

    // Adjust for compliance costs
    impact.cashFlowImpact.monthlyChange = netBenefit / 12;
    impact.cashFlowImpact.annualChange = netBenefit;
    impact.cashFlowImpact.firstYearTotal = netBenefit;

    this.addRiskFactor(impact, 'Tax law changes affecting expat benefits', 'MEDIUM', 'Flexible strategy adaptation');
    this.addRiskFactor(impact, 'Currency exchange rate fluctuations', 'MEDIUM', 'Multi-currency hedging strategy');
    this.addRiskFactor(impact, 'Compliance complexity and costs', 'LOW', 'Professional tax preparation');

    return impact;
  }

  private generateWarnings(params: any, analysis: any): string[] {
    const warnings: string[] = [];

    if (params.effectiveForeignTaxRate < 0.10) {
      warnings.push('Low foreign tax rate - FEIE may be more beneficial than FTC');
    }

    if (params.hasForeignInvestments) {
      warnings.push('Foreign investments may create PFIC complications - review with tax professional');
    }

    if (!params.treatyData.totalization) {
      warnings.push('No Social Security totalization agreement - may lose benefits');
    }

    if (params.foreignEarnedIncome > this.EXPAT_CONSTANTS.FEIE_LIMIT_2024 * 1.5) {
      warnings.push('High foreign income - consider tax-equalized employment arrangements');
    }

    return warnings;
  }

  private generateNextSteps(): string[] {
    return [
      'Consult with expat-specialized tax professional',
      'Review and file required expat tax forms (2555, 1116, FBAR)',
      'Optimize investment account locations',
      'Consider currency hedging strategies',
      'Plan for potential repatriation tax implications',
      'Review Social Security totalization benefits',
      'Set up quarterly estimated tax payments if needed',
      'Monitor tax law changes affecting expats'
    ];
  }
}