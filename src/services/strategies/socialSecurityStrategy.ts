/**
 * Social Security Optimization Strategy
 */

import { BaseStrategy } from './BaseStrategy';
import type {
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent
} from '../../types/strategy';

export class SocialSecurityStrategy extends BaseStrategy {
  id = 'social-security-optimization';
  name = 'Social Security Maximizer';
  category = 'RETIREMENT_OPTIMIZATION' as const;

  protected baseConfig = {
    id: this.id,
    name: this.name,
    description: 'Optimize Social Security claiming strategy to maximize lifetime benefits and coordinate spousal benefits',
    category: this.category,
    priority: 'HIGH' as const,
    estimatedTimeframe: 240,
    difficultyLevel: 'ADVANCED' as const,
    tags: ['social-security', 'retirement', 'government-benefits', 'spouse-coordination', 'tax-optimization']
  };

  getParameters(): StrategyParameters {
    return {
      ...this.createDefaultParameters(),
      currentAge: {
        type: 'number',
        label: 'Current Age',
        description: 'Your current age for benefit calculations',
        defaultValue: 60,
        min: 50,
        max: 70,
        step: 1,
        required: true
      },
      lifeExpectancy: {
        type: 'number',
        label: 'Life Expectancy',
        description: 'Expected lifespan for break-even analysis',
        defaultValue: 85,
        min: 75,
        max: 100,
        step: 1,
        required: true
      },
      primaryInsuranceAmount: {
        type: 'number',
        label: 'Primary Insurance Amount (PIA)',
        description: 'Monthly Social Security benefit at Full Retirement Age',
        defaultValue: 2500,
        min: 500,
        max: 4500,
        step: 50,
        required: true
      },
      fullRetirementAge: {
        type: 'number',
        label: 'Full Retirement Age',
        description: 'Your Full Retirement Age (FRA) in years',
        defaultValue: 67,
        min: 65,
        max: 67,
        step: 0.1,
        required: true
      },
      hasSpouse: {
        type: 'boolean',
        label: 'Married with Spouse',
        description: 'Are you married and need to coordinate spousal benefits?',
        defaultValue: false,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const currentAge = context.userInputs?.currentAge || context.currentAge || 60;

    if (currentAge < 50) {
      reasons.push('Social Security optimization more relevant closer to retirement age');
    }

    if (currentAge > 70) {
      reasons.push('Past optimal claiming window - benefits already maximized');
    }

    const pia = context.userInputs?.primaryInsuranceAmount || 2500;
    if (pia < 500) {
      reasons.push('Primary Insurance Amount too low for meaningful optimization');
    }

    return {
      applicable: reasons.length === 0,
      reasons: reasons.length === 0 ? [`Ready to optimize Social Security claiming for ${this.formatCurrency(pia * 12)} annual benefit`] : reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const params = this.extractParameters(context);
    const analysis = this.performClaimingAnalysis(params);
    const generatedEvents = this.generateSocialSecurityEvents(params, analysis);
    const recommendations = this.generateSocialSecurityRecommendations(params, analysis);
    const impact = await this.calculateSocialSecurityImpact(params, analysis);

    return this.createSuccessResult(
      `Social Security Plan - Optimal Claiming at Age ${analysis.optimalAge}`,
      generatedEvents,
      recommendations,
      impact,
      this.generateWarnings(params, analysis),
      this.generateNextSteps()
    );
  }

  private extractParameters(context: StrategyExecutionContext) {
    const inputs = context.userInputs || {};
    const currentAge = inputs.currentAge || context.currentAge || 60;
    const lifeExpectancy = inputs.lifeExpectancy || 85;
    const primaryInsuranceAmount = inputs.primaryInsuranceAmount || 2500;
    const fullRetirementAge = inputs.fullRetirementAge || 67;
    const hasSpouse = inputs.hasSpouse || false;

    return {
      currentAge,
      lifeExpectancy,
      primaryInsuranceAmount,
      fullRetirementAge,
      hasSpouse,
      yearsUntilFRA: Math.max(0, fullRetirementAge - currentAge),
      yearsUntilMax: Math.max(0, 70 - currentAge)
    };
  }

  private performClaimingAnalysis(params: any) {
    // Calculate benefits at different claiming ages
    const claimingOptions = [62, 65, 67, 70].map(age => {
      const reductionFactor = this.calculateReductionFactor(age, params.fullRetirementAge);
      const monthlyBenefit = params.primaryInsuranceAmount * reductionFactor;
      const lifetimeBenefit = monthlyBenefit * 12 * Math.max(0, params.lifeExpectancy - age);

      return {
        age,
        monthlyBenefit,
        lifetimeBenefit,
        reductionFactor
      };
    });

    // Find optimal claiming age
    const optimal = claimingOptions.reduce((best, current) =>
      current.lifetimeBenefit > best.lifetimeBenefit ? current : best
    );

    return {
      claimingOptions,
      optimalAge: optimal.age,
      optimalMonthlyBenefit: optimal.monthlyBenefit,
      optimalLifetimeBenefit: optimal.lifetimeBenefit,
      breakEvenAge: this.calculateBreakEvenAge(params)
    };
  }

  private calculateReductionFactor(claimingAge: number, fullRetirementAge: number): number {
    if (claimingAge >= 70) return 1.32; // Maximum 132% of PIA at age 70
    if (claimingAge >= fullRetirementAge) {
      const delayMonths = (claimingAge - fullRetirementAge) * 12;
      return 1 + (delayMonths * 0.00667); // 8% per year delayed
    }
    if (claimingAge >= 62) {
      const earlyMonths = (fullRetirementAge - claimingAge) * 12;
      return Math.max(0.75, 1 - (earlyMonths * 0.00556)); // Reduced for early claiming
    }
    return 0.75; // Minimum 75% of PIA
  }

  private calculateBreakEvenAge(params: any): number {
    // Simplified break-even calculation between FRA and age 70
    const fraPayment = params.primaryInsuranceAmount;
    const delayedPayment = params.primaryInsuranceAmount * 1.32;
    const monthlyDifference = delayedPayment - fraPayment;
    const delayYears = 70 - params.fullRetirementAge;
    const totalDelayedBenefits = delayedPayment * 12 * delayYears;

    return 70 + (totalDelayedBenefits / (monthlyDifference * 12));
  }

  private generateSocialSecurityEvents(params: any, analysis: any): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];

    // Social Security claiming event
    const claimingEvent = this.createFinancialEvent(
      'INCOME',
      'Social Security Benefits',
      `Claim Social Security at age ${analysis.optimalAge} for ${this.formatCurrency(analysis.optimalMonthlyBenefit)} monthly`,
      analysis.optimalMonthlyBenefit * 12,
      {
        targetAccountType: 'cash',
        startDateOffset: (analysis.optimalAge - params.currentAge) * 12
      }
    );

    events.push(this.createStrategyEvent(
      claimingEvent,
      `Optimize lifetime benefits by claiming at age ${analysis.optimalAge}`,
      'HIGH'
    ));

    // Spousal benefits if applicable
    if (params.hasSpouse) {
      const spouseBenefitEvent = this.createFinancialEvent(
        'INCOME',
        'Spousal Social Security Benefits',
        'Coordinate spousal claiming strategy',
        analysis.optimalMonthlyBenefit * 0.5 * 12, // Simplified spousal benefit
        {
          targetAccountType: 'cash',
          startDateOffset: (analysis.optimalAge - params.currentAge) * 12
        }
      );

      events.push(this.createStrategyEvent(
        spouseBenefitEvent,
        'Maximize household Social Security benefits',
        'MEDIUM'
      ));
    }

    return events;
  }

  private generateSocialSecurityRecommendations(params: any, analysis: any) {
    return [
      this.createRecommendation(
        'Optimize Claiming Age',
        `Claim at age ${analysis.optimalAge} to maximize lifetime benefits`,
        'ACTION',
        'HIGH',
        `Additional ${this.formatCurrency(analysis.optimalLifetimeBenefit - analysis.claimingOptions[0].lifetimeBenefit)} over early claiming`,
        'At retirement'
      ),
      this.createRecommendation(
        'Review Social Security Statement',
        'Verify earnings record and benefit estimates annually',
        'ACTION',
        'MEDIUM',
        'Ensure accurate benefit calculations',
        'Annually',
        'EASY'
      ),
      this.createRecommendation(
        'Tax Planning Integration',
        'Coordinate Social Security with retirement account withdrawals',
        'OPTIMIZATION',
        'HIGH',
        'Minimize overall tax burden in retirement',
        '6 months before retirement',
        'MODERATE'
      ),
      this.createRecommendation(
        'Bridge Strategy Planning',
        'Plan income bridge until optimal claiming age',
        'CONSIDERATION',
        'MEDIUM',
        'Maintain income flow before Social Security',
        '1-2 years before retirement',
        'MODERATE'
      )
    ];
  }

  private async calculateSocialSecurityImpact(params: any, analysis: any): Promise<StrategyImpact> {
    const monthlyBenefit = analysis.optimalMonthlyBenefit;
    const earlyClaimingBenefit = analysis.claimingOptions[0].monthlyBenefit;
    const monthlyAdvantage = monthlyBenefit - earlyClaimingBenefit;

    const impact = this.createBasicImpact(monthlyBenefit, 0, 20);

    // Add specific Social Security advantages
    impact.netWorthImpact.fiveYearProjection = monthlyAdvantage * 12 * 5;
    impact.netWorthImpact.tenYearProjection = monthlyAdvantage * 12 * 10;
    impact.netWorthImpact.retirementImpact = analysis.optimalLifetimeBenefit - analysis.claimingOptions[0].lifetimeBenefit;

    this.addRiskFactor(impact, 'Longevity risk vs guaranteed income', 'LOW', 'Inflation-adjusted lifetime benefits');
    this.addRiskFactor(impact, 'Social Security system changes', 'MEDIUM', 'Diversified retirement income strategy');

    return impact;
  }

  private generateWarnings(params: any, analysis: any): string[] {
    const warnings: string[] = [];

    if (analysis.optimalAge > params.lifeExpectancy - 10) {
      warnings.push('Optimal claiming age is close to life expectancy - consider earlier claiming');
    }

    if (params.currentAge > 62 && analysis.optimalAge > 67) {
      warnings.push('Delaying benefits requires bridge income until claiming');
    }

    if (params.hasSpouse) {
      warnings.push('Spousal benefits require coordination - consult with advisor');
    }

    return warnings;
  }

  private generateNextSteps(): string[] {
    return [
      'Review Social Security statement for accuracy',
      'Plan retirement income bridge strategy',
      'Coordinate with tax advisor for optimal timing',
      'Consider spousal coordination if married',
      'Set up automated benefit claiming at optimal age',
      'Plan for Medicare enrollment at 65',
      'Review strategy annually as life expectancy estimates change'
    ];
  }
}