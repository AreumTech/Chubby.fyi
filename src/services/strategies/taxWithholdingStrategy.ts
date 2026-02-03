/**
 * Tax Withholding Strategy
 *
 * Strategy for optimizing tax withholding and settlement timing.
 */

import { BaseStrategy } from './BaseStrategy';
import type {
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters
} from '../../types/strategy';

export class TaxWithholdingStrategy extends BaseStrategy {
  id = 'tax-withholding';
  name = 'Tax Withholding Optimizer';
  category = 'TAX_OPTIMIZATION' as const;

  protected baseConfig = {
    id: this.id,
    name: this.name,
    description: 'Optimize tax withholding strategy and settlement timing for better cash flow management',
    category: this.category,
    priority: 'MEDIUM' as const,
    estimatedTimeframe: 12,
    difficultyLevel: 'INTERMEDIATE' as const,
    tags: ['tax-withholding', 'cash-flow', 'fica', 'state-tax', 'tax-settlement']
  };

  getParameters(): StrategyParameters {
    return {
      ...this.createDefaultParameters(),
      withholdingMethod: {
        type: 'select',
        label: 'Withholding Method',
        description: 'Choose how you want to handle tax withholding',
        defaultValue: 'standard',
        options: [
          { value: 'standard', label: 'Standard W-4 Withholding (Annual Settlement)' },
          { value: 'quarterly', label: 'Quarterly Estimated Payments' },
          { value: 'increased', label: 'Increased Monthly Withholding' }
        ],
        required: true
      },
      settlementReserveStrategy: {
        type: 'select',
        label: 'Tax Settlement Reserve Strategy',
        description: 'How to manage funds for tax settlement',
        defaultValue: 'savings',
        options: [
          { value: 'savings', label: 'Maintain in High-Yield Savings' },
          { value: 'treasury', label: 'Invest in Short-Term Treasury Bills' },
          { value: 'brokerage', label: 'Keep in Taxable Brokerage (Conservative)' }
        ],
        required: false
      },
      autoReserve: {
        type: 'boolean',
        label: 'Auto-reserve Settlement Amount',
        description: 'Automatically reserve estimated settlement amount monthly',
        defaultValue: true,
        required: false
      },
      alertBeforeSettlement: {
        type: 'boolean',
        label: 'Settlement Alert',
        description: 'Alert me 30 days before tax settlement',
        defaultValue: false,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check if user has W-2 income
    const hasW2Income = context.currentEvents.some(event =>
      event.type === 'SALARY' || event.type === 'INCOME'
    );

    if (!hasW2Income) {
      reasons.push('No W-2 income found - tax withholding optimization requires salaried employment');
    }

    return {
      applicable: reasons.length === 0,
      reasons: reasons.length === 0 ? ['Ready to optimize tax withholding strategy'] : reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const params = this.extractParameters(context);
    const events = this.generateWithholdingEvents(params, context);
    const recommendations = this.generateRecommendations(params);
    const impact = await this.calculateImpact(params, context);

    return this.createSuccessResult(
      `Tax Withholding Strategy - ${this.getMethodName(params.withholdingMethod)}`,
      events,
      recommendations,
      impact,
      this.generateWarnings(params),
      this.generateNextSteps(params)
    );
  }

  private extractParameters(context: StrategyExecutionContext) {
    const inputs = context.userInputs || {};
    return {
      withholdingMethod: inputs.withholdingMethod || 'standard',
      settlementReserveStrategy: inputs.settlementReserveStrategy || 'savings',
      autoReserve: inputs.autoReserve !== false,
      alertBeforeSettlement: inputs.alertBeforeSettlement || false
    };
  }

  private getMethodName(method: string): string {
    const names: Record<string, string> = {
      'standard': 'Standard W-4 Withholding',
      'quarterly': 'Quarterly Estimated Payments',
      'increased': 'Increased Monthly Withholding'
    };
    return names[method] || method;
  }

  private generateWithholdingEvents(params: any, context: StrategyExecutionContext) {
    const events = [];

    // Add tax settlement event
    if (params.withholdingMethod === 'standard') {
      const settlementEvent = this.createFinancialEvent(
        'TAX_SETTLEMENT',
        'Annual Tax Settlement',
        'State and FICA tax settlement in April',
        0, // Amount calculated by simulation
        {
          frequency: 'annual',
          monthOfYear: 4 // April
        }
      );

      events.push(this.createStrategyEvent(
        settlementEvent,
        'Annual settlement for State and FICA taxes',
        'HIGH'
      ));
    }

    return events;
  }

  private generateRecommendations(params: any) {
    return [
      this.createRecommendation(
        'Review Withholding Method',
        `Using ${this.getMethodName(params.withholdingMethod)} - review annually for optimization`,
        'ACTION',
        'MEDIUM',
        'Optimized cash flow management',
        'Annually'
      ),
      this.createRecommendation(
        'Monitor Cash Reserves',
        'Ensure adequate cash reserves for tax settlement',
        'CONSIDERATION',
        'HIGH',
        'Avoid liquidity issues',
        'Monthly',
        'EASY'
      )
    ];
  }

  private async calculateImpact(params: any, context: StrategyExecutionContext) {
    const impact = this.createBasicImpact(0, 0, 0);

    impact.cashFlowImpact = {
      monthlyChange: 0,
      annualChange: 0,
      firstYearTotal: 0,
      explanation: 'Tax withholding optimization improves cash flow timing but does not change total tax liability'
    };

    return impact;
  }

  private generateWarnings(params: any): string[] {
    const warnings: string[] = [];

    if (params.withholdingMethod === 'standard') {
      warnings.push('Ensure adequate cash reserves for April tax settlement');
    }

    return warnings;
  }

  private generateNextSteps(params: any): string[] {
    return [
      'Review W-4 withholding settings',
      'Set up automated reserve transfers if enabled',
      'Monitor cash flow for tax settlement timing',
      'Review strategy annually or after income changes'
    ];
  }
}
