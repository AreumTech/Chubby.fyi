/**
 * Home Purchase Real Estate Strategy
 */

import { BaseStrategy } from './BaseStrategy';
import type {
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';

export class HomePurchaseStrategy extends BaseStrategy {
  id = 'home-purchase';
  name = 'Home Purchase Optimizer';
  category = 'REAL_ESTATE' as const;

  protected baseConfig = {
    id: this.id,
    name: this.name,
    description: 'Optimize home purchase timing, financing, and long-term wealth impact with comprehensive rent vs. buy analysis',
    category: this.category,
    priority: 'HIGH' as const,
    estimatedTimeframe: 36,
    difficultyLevel: 'ADVANCED' as const,
    tags: ['real-estate', 'mortgage', 'home-buying', 'rent-vs-buy', 'tax-optimization', 'wealth-building']
  };

  getParameters(): StrategyParameters {
    return {
      ...this.createDefaultParameters(),
      homePrice: {
        type: 'number',
        label: 'Target Home Price',
        description: 'Expected purchase price of the home',
        defaultValue: 500000,
        min: 100000,
        max: 5000000,
        step: 25000,
        required: true
      },
      downPaymentPercent: {
        type: 'percentage',
        label: 'Down Payment Percentage',
        description: 'Percentage of home price for down payment',
        defaultValue: 0.20,
        min: 0.03,
        max: 0.50,
        step: 0.01,
        required: true
      },
      mortgageRate: {
        type: 'percentage',
        label: 'Mortgage Interest Rate',
        description: 'Annual interest rate for the mortgage',
        defaultValue: 0.07,
        min: 0.03,
        max: 0.12,
        step: 0.001,
        required: true
      },
      currentRent: {
        type: 'number',
        label: 'Current Monthly Rent',
        description: 'Current monthly rent payment',
        defaultValue: 2500,
        min: 800,
        max: 8000,
        step: 100,
        required: true
      },
      homeAppreciationRate: {
        type: 'percentage',
        label: 'Annual Home Appreciation',
        description: 'Expected annual home value appreciation',
        defaultValue: 0.03,
        min: 0.01,
        max: 0.06,
        step: 0.001,
        required: true
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (!this.hasAdequateIncome(context, 50000)) {
      reasons.push('Insufficient income for home purchase');
    }

    if (context.currentAge < 22) {
      reasons.push('Home purchase typically more appropriate after establishing career');
    }

    if (context.currentAge > 70) {
      reasons.push('Consider downsizing or rental options at this life stage');
    }

    const hasRealEstate = context.currentEvents.some(e =>
      e.type === 'REAL_ESTATE_PURCHASE' || (e as any).propertyType === 'primary_residence'
    );

    if (hasRealEstate) {
      reasons.push('Strategy focused on first home purchase - already own real estate');
    }

    const homePrice = context.userInputs?.homePrice || 500000;
    const monthlyIncome = this.estimateMonthlyIncome(context.currentEvents);
    const maxPayment = monthlyIncome * 0.28;
    const estimatedPayment = this.estimateMonthlyPayment(homePrice, context.userInputs);

    if (estimatedPayment > maxPayment) {
      reasons.push(`Monthly payment exceeds 28% of income`);
    }

    return {
      applicable: reasons.length === 0,
      reasons: reasons.length === 0 ? [`Income supports home purchase at ${this.formatCurrency(homePrice)}`] : reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const params = this.extractParameters(context);
    const analysis = this.performRentVsBuyAnalysis(params);
    const generatedEvents = this.generateHomePurchaseEvents(params, context);
    const recommendations = this.generateHomePurchaseRecommendations(params);
    const impact = await this.calculateHomePurchaseImpact(params);

    return this.createSuccessResult(
      `Home Purchase Plan - ${this.formatCurrency(params.homePrice)}`,
      generatedEvents,
      recommendations,
      impact,
      this.generateWarnings(params),
      this.generateNextSteps()
    );
  }

  // Core calculations
  private estimateMonthlyPayment(homePrice: number, inputs: any): number {
    const downPayment = (inputs?.downPaymentPercent || 0.20) * homePrice;
    const loanAmount = homePrice - downPayment;
    const rate = inputs?.mortgageRate || 0.07;
    return this.calculateMonthlyPayment(loanAmount, rate, 30);
  }

  private extractParameters(context: StrategyExecutionContext) {
    const inputs = context.userInputs || {};
    const homePrice = inputs.homePrice || 500000;
    const downPaymentPercent = inputs.downPaymentPercent || 0.20;
    const currentRent = inputs.currentRent || 2500;
    const homeAppreciationRate = inputs.homeAppreciationRate || 0.03;

    return {
      homePrice,
      downPaymentPercent,
      currentRent,
      homeAppreciationRate,
      downPaymentAmount: homePrice * downPaymentPercent,
      monthlyPayment: this.calculateMonthlyPayment(homePrice * (1 - downPaymentPercent), 0.07, 30)
    };
  }

  private performRentVsBuyAnalysis(params: any) {
    const years = 10;
    const rentTotal = params.currentRent * 12 * years * 1.03; // 3% growth
    const buyTotal = params.monthlyPayment * 12 * years;
    const homeValueGrowth = params.homePrice * Math.pow(1 + params.homeAppreciationRate, years);

    return {
      rentingCost: rentTotal,
      buyingCost: buyTotal,
      homeValue: homeValueGrowth,
      buyingAdvantage: homeValueGrowth - buyTotal - rentTotal
    };
  }

  private generateHomePurchaseEvents(params: any, context: StrategyExecutionContext): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];

    // Home purchase event
    const purchaseEvent = this.createFinancialEvent(
      'REAL_ESTATE_PURCHASE',
      'Home Purchase',
      `Purchase primary residence for ${this.formatCurrency(params.homePrice)}`,
      params.homePrice
    );

    events.push(this.createStrategyEvent(purchaseEvent, 'Execute home purchase strategy', 'HIGH'));

    return events;
  }

  private generateHomePurchaseRecommendations(params: any) {
    return [
      this.createRecommendation(
        'Get Pre-approved for Mortgage',
        'Secure mortgage pre-approval before house hunting',
        'ACTION',
        'HIGH',
        'Better negotiating position and realistic budget',
        '1-2 weeks'
      ),
      this.createRecommendation(
        'Build Down Payment Fund',
        `Save ${this.formatCurrency(params.downPaymentAmount)} for down payment`,
        'ACTION',
        'HIGH',
        'Required for purchase completion',
        'Ongoing'
      ),
      this.createRecommendation(
        'Research Neighborhoods',
        'Compare areas for long-term value and lifestyle fit',
        'CONSIDERATION',
        'MEDIUM',
        'Optimize home value appreciation',
        '1-2 months'
      )
    ];
  }

  private async calculateHomePurchaseImpact(params: any): Promise<StrategyImpact> {
    const monthlyChange = -(params.monthlyPayment + 200); // Include property tax/insurance
    const equity = params.homePrice * 0.10; // Conservative equity buildup

    const impact = this.createBasicImpact(monthlyChange, 0, 15);
    impact.netWorthImpact.fiveYearProjection += equity;
    impact.netWorthImpact.tenYearProjection += equity * 2;

    this.addRiskFactor(impact, 'Market value fluctuation', 'MEDIUM', 'Long-term ownership strategy');
    this.addRiskFactor(impact, 'Interest rate changes', 'LOW', 'Fixed-rate mortgage protection');

    return impact;
  }

  private generateWarnings(params: any): string[] {
    const warnings: string[] = [];

    if (params.downPaymentPercent < 0.20) {
      warnings.push('Down payment below 20% requires PMI insurance');
    }

    if (params.monthlyPayment > 2000) {
      warnings.push('High monthly payment - ensure adequate cash flow');
    }

    return warnings;
  }

  private generateNextSteps(): string[] {
    return [
      'Review and adjust the generated purchase plan',
      'Get pre-approved for mortgage financing',
      'Start saving for down payment and closing costs',
      'Research target neighborhoods and markets',
      'Run simulation to see long-term financial impact'
    ];
  }

  // Basic calculation helper
  private calculateMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
    const monthlyRate = annualRate / 12;
    const numPayments = termYears * 12;

    if (monthlyRate === 0) return principal / numPayments;

    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  }
}