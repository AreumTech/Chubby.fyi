/**
 * Contribution Optimization Strategy
 * 
 * Implements sophisticated contribution optimization including:
 * - 401(k) employer match maximization
 * - IRA contribution limits optimization
 * - Tax-efficient contribution sequencing
 * - Catch-up contributions for 50+ investors
 * - HSA maximization where applicable
 * - Backdoor Roth and Mega Backdoor Roth strategies
 */

import { generateId } from '../../utils/formatting';
import { EventType } from '../../types/events';
import type {
  StrategyEngine,
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent,
  StrategyRecommendation
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';

export class ContributionOptimizationStrategy implements StrategyEngine {
  id = 'contribution-optimization';
  name = 'Contribution Optimizer';
  category = 'RETIREMENT_OPTIMIZATION' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: 'Optimize retirement contributions across all available accounts for maximum tax efficiency and employer benefits',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'HIGH' as const,
    estimatedTimeframe: 6, // 6 months to implement
    difficultyLevel: 'INTERMEDIATE' as const,
    tags: ['401k', 'ira', 'hsa', 'employer-match', 'tax-efficiency', 'contribution-limits', 'backdoor-roth']
  };

  getParameters(): StrategyParameters {
    return {
      annualIncome: {
        type: 'number',
        label: 'Annual Gross Income',
        description: 'Your total annual gross income',
        defaultValue: 100000,
        min: 30000,
        max: 500000,
        step: 5000,
        required: true
      },
      currentAge: {
        type: 'number',
        label: 'Current Age',
        description: 'Your current age (affects contribution limits)',
        defaultValue: 35,
        min: 18,
        max: 75,
        step: 1,
        required: true
      },
      has401k: {
        type: 'boolean',
        label: 'Have 401(k) Access',
        description: 'Do you have access to a 401(k) plan?',
        defaultValue: true,
        required: true
      },
      employerMatch: {
        type: 'percentage',
        label: 'Employer 401(k) Match',
        description: 'Employer match as percentage of salary (e.g., 50% of first 6%)',
        defaultValue: 0.03,
        min: 0,
        max: 0.10,
        step: 0.005,
        required: false
      },
      employerMatchLimit: {
        type: 'percentage',
        label: 'Match Contribution Limit',
        description: 'Maximum salary percentage that gets matched',
        defaultValue: 0.06,
        min: 0,
        max: 0.15,
        step: 0.01,
        required: false
      },
      hasHSA: {
        type: 'boolean',
        label: 'Have HSA Access',
        description: 'Do you have access to a Health Savings Account?',
        defaultValue: false,
        required: false
      },
      filingStatus: {
        type: 'selection',
        label: 'Tax Filing Status',
        description: 'Your tax filing status (affects IRA limits)',
        defaultValue: 'single',
        options: [
          { value: 'single', label: 'Single' },
          { value: 'married_jointly', label: 'Married Filing Jointly' },
          { value: 'married_separately', label: 'Married Filing Separately' },
          { value: 'head_of_household', label: 'Head of Household' }
        ],
        required: true
      },
      targetSavingsRate: {
        type: 'percentage',
        label: 'Target Savings Rate',
        description: 'Target percentage of income to save for retirement',
        defaultValue: 0.15,
        min: 0.05,
        max: 0.50,
        step: 0.01,
        required: true
      },
      prioritizeRoth: {
        type: 'boolean',
        label: 'Prioritize Roth Contributions',
        description: 'Prefer Roth contributions when tax-advantaged',
        defaultValue: false,
        required: false
      },
      maxOut401k: {
        type: 'boolean',
        label: 'Maximize 401(k) Contributions',
        description: 'Attempt to max out 401(k) contribution limits',
        defaultValue: false,
        required: false
      },
      considerBackdoorRoth: {
        type: 'boolean',
        label: 'Consider Backdoor Roth IRA',
        description: 'Implement backdoor Roth IRA if income limits exceeded',
        defaultValue: true,
        required: false
      },
      considerMegaBackdoorRoth: {
        type: 'boolean',
        label: 'Consider Mega Backdoor Roth',
        description: 'Use after-tax 401(k) contributions with in-service conversions',
        defaultValue: false,
        required: false
      },
      currentContributions: {
        type: 'number',
        label: 'Current Annual Contributions',
        description: 'Total current annual retirement contributions',
        defaultValue: 15000,
        min: 0,
        max: 100000,
        step: 1000,
        required: false
      },
      marginalTaxRate: {
        type: 'percentage',
        label: 'Marginal Tax Rate',
        description: 'Your current marginal tax rate',
        defaultValue: 0.24,
        min: 0.10,
        max: 0.37,
        step: 0.01,
        required: true
      },
      expectedRetirementTaxRate: {
        type: 'percentage',
        label: 'Expected Retirement Tax Rate',
        description: 'Expected tax rate in retirement',
        defaultValue: 0.15,
        min: 0.10,
        max: 0.30,
        step: 0.01,
        required: false
      }
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const parameters = context.userInputs;
    const { config, currentEvents, userInputs } = context;
    const {
      annualIncome,
      currentAge,
      has401k,
      employerMatch,
      employerMatchLimit,
      hasHSA,
      filingStatus,
      targetSavingsRate,
      prioritizeRoth,
      maxOut401k,
      considerBackdoorRoth,
      considerMegaBackdoorRoth,
      marginalTaxRate,
      expectedRetirementTaxRate
    } = parameters;

    const generatedEvents: StrategyGeneratedEvent[] = [];
    const recommendations: StrategyRecommendation[] = [];
    const warnings: string[] = [];

    // Get current contribution limits based on age
    const contributionLimits = this.getContributionLimits(currentAge);

    // Calculate optimal contribution strategy
    const optimizationPlan = this.calculateOptimalContributions(parameters, contributionLimits);

    // Generate contribution events
    generatedEvents.push(...this.generateContributionEvents(context, optimizationPlan, parameters));

    // Generate employer match events if applicable
    if (has401k && employerMatch > 0) {
      generatedEvents.push(...this.generateEmployerMatchEvents(context, parameters));
    }

    // Generate HSA events if applicable
    if (hasHSA) {
      generatedEvents.push(...this.generateHSAEvents(context, contributionLimits));
    }

    // Generate backdoor Roth events if applicable
    if (considerBackdoorRoth && this.isEligibleForBackdoorRoth(annualIncome, filingStatus)) {
      generatedEvents.push(...this.generateBackdoorRothEvents(context, contributionLimits));
    }

    // Generate mega backdoor Roth events if applicable
    if (considerMegaBackdoorRoth && maxOut401k) {
      generatedEvents.push(...this.generateMegaBackdoorRothEvents(context, parameters, contributionLimits));
    }

    // Generate recommendations
    recommendations.push(...this.generateContributionRecommendations(context, optimizationPlan, parameters));

    // Validate contribution strategy
    const contributionWarnings = this.validateContributionStrategy(optimizationPlan, parameters);
    warnings.push(...contributionWarnings);

    const estimatedImpact = this.calculateContributionImpact(optimizationPlan, parameters);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: 'Optimized Contribution Plan',
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps: this.generateContributionNextSteps(optimizationPlan)
    };
  }

  private getContributionLimits(age: number): ContributionLimits {
    const currentYear = new Date().getFullYear();
    const isCatchUpEligible = age >= 50;

    // 2024 contribution limits (would be updated annually)
    return {
      employee401k: isCatchUpEligible ? 30000 : 23000, // $23k + $7.5k catch-up
      total401k: isCatchUpEligible ? 76000 : 69000,    // Total including employer
      traditionalIRA: isCatchUpEligible ? 8000 : 7000, // $7k + $1k catch-up
      rothIRA: isCatchUpEligible ? 8000 : 7000,
      hsa: age >= 55 ? 5150 : 4150, // HSA catch-up at 55
      year: currentYear
    };
  }

  private calculateOptimalContributions(parameters: Record<string, any>, limits: ContributionLimits): ContributionPlan {
    const {
      annualIncome,
      has401k,
      employerMatch,
      employerMatchLimit,
      hasHSA,
      targetSavingsRate,
      prioritizeRoth,
      maxOut401k,
      marginalTaxRate,
      expectedRetirementTaxRate
    } = parameters;

    const targetSavingsAmount = annualIncome * targetSavingsRate;
    let remainingToAllocate = targetSavingsAmount;

    const plan: ContributionPlan = {
      employer401kMatch: 0,
      employee401kTraditional: 0,
      employee401kRoth: 0,
      traditionalIRA: 0,
      rothIRA: 0,
      hsa: 0,
      afterTax401k: 0,
      taxableInvestments: 0,
      totalContributions: 0
    };

    // Step 1: Always get full employer match first
    if (has401k && employerMatch > 0) {
      const matchContribution = Math.min(
        annualIncome * employerMatchLimit,
        limits.employee401k
      );
      plan.employee401kTraditional = matchContribution;
      plan.employer401kMatch = matchContribution * employerMatch;
      remainingToAllocate -= matchContribution;
    }

    // Step 2: Max out HSA if available (triple tax advantage)
    if (hasHSA && remainingToAllocate > 0) {
      plan.hsa = Math.min(limits.hsa, remainingToAllocate);
      remainingToAllocate -= plan.hsa;
    }

    // Step 3: Decide between traditional vs Roth based on tax rates
    const shouldPrioritizeRoth = prioritizeRoth || (marginalTaxRate < expectedRetirementTaxRate);

    // Step 4: Complete 401(k) contributions
    if (has401k && remainingToAllocate > 0) {
      const remaining401kSpace = limits.employee401k - plan.employee401kTraditional;
      const contribution401k = maxOut401k 
        ? remaining401kSpace 
        : Math.min(remaining401kSpace, remainingToAllocate);

      if (shouldPrioritizeRoth) {
        plan.employee401kRoth = contribution401k;
      } else {
        plan.employee401kTraditional += contribution401k;
      }
      remainingToAllocate -= contribution401k;
    }

    // Step 5: IRA contributions (if income allows)
    if (remainingToAllocate > 0) {
      const iraLimit = this.getIRALimit(parameters.annualIncome, parameters.filingStatus);
      const iraContribution = Math.min(iraLimit, remainingToAllocate);
      
      if (shouldPrioritizeRoth && iraContribution > 0) {
        plan.rothIRA = iraContribution;
      } else if (iraContribution > 0) {
        plan.traditionalIRA = iraContribution;
      }
      remainingToAllocate -= iraContribution;
    }

    // Step 6: After-tax 401(k) for mega backdoor Roth
    if (parameters.considerMegaBackdoorRoth && has401k && remainingToAllocate > 0) {
      const current401kTotal = plan.employee401kTraditional + plan.employee401kRoth + plan.employer401kMatch;
      const afterTaxSpace = limits.total401k - current401kTotal;
      
      if (afterTaxSpace > 0) {
        plan.afterTax401k = Math.min(afterTaxSpace, remainingToAllocate);
        remainingToAllocate -= plan.afterTax401k;
      }
    }

    // Step 7: Taxable investments for remaining amount
    if (remainingToAllocate > 0) {
      plan.taxableInvestments = remainingToAllocate;
    }

    plan.totalContributions = Object.values(plan).reduce((sum, value) => sum + value, 0) - plan.employer401kMatch;

    return plan;
  }

  private getIRALimit(income: number, filingStatus: string): number {
    // Simplified IRA income limits for 2024
    const limits = {
      single: { traditional: 77000, roth: 138000 },
      married_jointly: { traditional: 123000, roth: 218000 },
      married_separately: { traditional: 10000, roth: 10000 },
      head_of_household: { traditional: 77000, roth: 138000 }
    };

    const statusLimits = limits[filingStatus as keyof typeof limits] || limits.single;
    
    // Full IRA contribution if below limits
    if (income < statusLimits.traditional) return 7000;
    
    // Phase-out range (simplified)
    if (income < statusLimits.roth) return 7000 * 0.5; // Partial contribution
    
    return 0; // Above income limits
  }

  private isEligibleForBackdoorRoth(income: number, filingStatus: string): boolean {
    const iraLimit = this.getIRALimit(income, filingStatus);
    return iraLimit === 0; // Eligible if above Roth IRA income limits
  }

  private generateContributionEvents(context: StrategyExecutionContext, plan: ContributionPlan, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];

    // Generate 401(k) contribution events
    if (plan.employee401kTraditional > 0) {
      const event401kTrad: FinancialEvent = {
        id: generateId(),
        type: EventType.SCHEDULED_CONTRIBUTION,
        name: 'Optimized 401(k) Traditional Contributions',
        description: `Annual traditional 401(k) contributions: $${plan.employee401kTraditional.toLocaleString()}`,
        monthOffset: 1,
        amount: plan.employee401kTraditional,
        targetAccountType: 'tax_deferred',
        frequency: 'annual',
        priority: 'HIGH' as any
      };

      events.push({
        event: event401kTrad,
        reason: 'Optimized traditional 401(k) contributions for tax deferral',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    if (plan.employee401kRoth > 0) {
      const event401kRoth: FinancialEvent = {
        id: generateId(),
        type: EventType.SCHEDULED_CONTRIBUTION,
        name: 'Optimized 401(k) Roth Contributions',
        description: `Annual Roth 401(k) contributions: $${plan.employee401kRoth.toLocaleString()}`,
        monthOffset: 1,
        amount: plan.employee401kRoth,
        targetAccountType: 'roth',
        frequency: 'annual',
        priority: 'HIGH' as any
      };

      events.push({
        event: event401kRoth,
        reason: 'Optimized Roth 401(k) contributions for tax-free growth',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    // Generate IRA contribution events
    if (plan.traditionalIRA > 0) {
      const eventIRATrad: FinancialEvent = {
        id: generateId(),
        type: EventType.SCHEDULED_CONTRIBUTION,
        name: 'Traditional IRA Contributions',
        description: `Annual traditional IRA contributions: $${plan.traditionalIRA.toLocaleString()}`,
        monthOffset: 1,
        amount: plan.traditionalIRA,
        targetAccountType: 'tax_deferred',
        frequency: 'annual',
        priority: 'HIGH' as any
      };

      events.push({
        event: eventIRATrad,
        reason: 'Traditional IRA contributions for additional tax deferral',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    if (plan.rothIRA > 0) {
      const eventIRARoth: FinancialEvent = {
        id: generateId(),
        type: EventType.SCHEDULED_CONTRIBUTION,
        name: 'Roth IRA Contributions',
        description: `Annual Roth IRA contributions: $${plan.rothIRA.toLocaleString()}`,
        monthOffset: 1,
        amount: plan.rothIRA,
        targetAccountType: 'roth',
        frequency: 'annual',
        priority: 'HIGH' as any
      };

      events.push({
        event: eventIRARoth,
        reason: 'Roth IRA contributions for tax-free retirement income',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    return events;
  }

  private generateEmployerMatchEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { annualIncome, employerMatch, employerMatchLimit } = parameters;

    const matchAmount = Math.min(annualIncome * employerMatchLimit, 23000) * employerMatch;

    const matchEvent: FinancialEvent = {
      id: generateId(),
      type: EventType.DIVIDEND_INCOME, // Represents employer contribution
      name: 'Employer 401(k) Match',
      description: `Annual employer 401(k) matching: $${matchAmount.toLocaleString()}`,
      monthOffset: 1,
      amount: matchAmount,
      accountType: 'tax_deferred',
      frequency: 'annual',
      priority: 'HIGH' as any
    };

    events.push({
      event: matchEvent,
      reason: 'Free money from employer 401(k) matching program',
      isEditable: false,
      linkedToStrategy: true,
      importance: 'CRITICAL'
    });

    return events;
  }

  private generateHSAEvents(context: StrategyExecutionContext, limits: ContributionLimits): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];

    const hsaEvent: FinancialEvent = {
      id: generateId(),
      type: EventType.SCHEDULED_CONTRIBUTION,
      name: 'HSA Max Contributions',
      description: `Annual HSA contributions: $${limits.hsa.toLocaleString()}`,
      monthOffset: 1,
      amount: limits.hsa,
      targetAccountType: 'hsa',
      frequency: 'annual',
      priority: 'HIGH' as any
    };

    events.push({
      event: hsaEvent,
      reason: 'Triple tax advantage - deductible, growth, and qualified withdrawals',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'CRITICAL'
    });

    return events;
  }

  private generateBackdoorRothEvents(context: StrategyExecutionContext, limits: ContributionLimits): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];

    // Step 1: Traditional IRA contribution
    const tradIRAEvent: FinancialEvent = {
      id: generateId(),
      type: EventType.SCHEDULED_CONTRIBUTION,
      name: 'Backdoor Roth: Traditional IRA Contribution',
      description: `Non-deductible traditional IRA contribution: $${limits.traditionalIRA.toLocaleString()}`,
      monthOffset: 1,
      amount: limits.traditionalIRA,
      targetAccountType: 'tax_deferred',
      priority: 'HIGH' as any
    };

    events.push({
      event: tradIRAEvent,
      reason: 'Step 1 of backdoor Roth IRA strategy',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'HIGH'
    });

    // Step 2: Roth conversion
    const conversionEvent: FinancialEvent = {
      id: generateId(),
      type: EventType.ROTH_CONVERSION,
      name: 'Backdoor Roth: IRA to Roth Conversion',
      description: `Convert traditional IRA to Roth IRA: $${limits.traditionalIRA.toLocaleString()}`,
      monthOffset: 2,
      amount: limits.traditionalIRA,
      fromAccountType: 'tax_deferred',
      targetAccountType: 'roth',
      priority: 'HIGH' as any
    };

    events.push({
      event: conversionEvent,
      reason: 'Step 2 of backdoor Roth IRA strategy - convert to Roth',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'HIGH'
    });

    return events;
  }

  private generateMegaBackdoorRothEvents(context: StrategyExecutionContext, parameters: Record<string, any>, limits: ContributionLimits): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { annualIncome } = parameters;

    // Calculate after-tax 401(k) space
    const maxAfterTax = limits.total401k - limits.employee401k - (annualIncome * 0.06 * 0.5); // Rough employer match
    const afterTaxAmount = Math.min(maxAfterTax, 20000); // Conservative estimate

    if (afterTaxAmount > 0) {
      // After-tax 401(k) contribution
      const afterTaxEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.SCHEDULED_CONTRIBUTION,
        name: 'Mega Backdoor Roth: After-Tax 401(k)',
        description: `After-tax 401(k) contributions: $${afterTaxAmount.toLocaleString()}`,
        monthOffset: 1,
        amount: afterTaxAmount,
        targetAccountType: 'taxable', // After-tax contributions
        priority: 'MEDIUM' as any
      };

      events.push({
        event: afterTaxEvent,
        reason: 'Step 1 of mega backdoor Roth strategy',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });

      // In-service conversion to Roth
      const megaConversionEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.ROTH_CONVERSION,
        name: 'Mega Backdoor Roth: In-Service Conversion',
        description: `Convert after-tax 401(k) to Roth: $${afterTaxAmount.toLocaleString()}`,
        monthOffset: 3,
        amount: afterTaxAmount,
        fromAccountType: 'taxable',
        targetAccountType: 'roth',
        priority: 'MEDIUM' as any
      };

      events.push({
        event: megaConversionEvent,
        reason: 'Step 2 of mega backdoor Roth - convert to Roth for tax-free growth',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    return events;
  }

  private generateContributionRecommendations(context: StrategyExecutionContext, plan: ContributionPlan, parameters: Record<string, any>): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = [];

    // Employer match recommendation
    if (parameters.has401k && parameters.employerMatch > 0) {
      recommendations.push({
        id: generateId(),
        title: 'Maximize Employer 401(k) Match',
        description: `Contribute at least ${(parameters.employerMatchLimit * 100).toFixed(1)}% to get full employer match of $${plan.employer401kMatch.toLocaleString()}.`,
        type: 'ACTION',
        priority: 'HIGH',
        estimatedBenefit: `${(parameters.employerMatch * 100).toFixed(0)}% guaranteed return`,
        timeToImplement: 'Next payroll'
      });
    }

    // HSA recommendation
    if (parameters.hasHSA) {
      recommendations.push({
        id: generateId(),
        title: 'Maximize HSA Contributions',
        description: 'HSA offers triple tax advantage - deductible, tax-free growth, and tax-free qualified withdrawals.',
        type: 'ACTION',
        priority: 'HIGH',
        estimatedBenefit: 'Triple tax savings',
        timeToImplement: 'Next contribution'
      });
    }

    // Catch-up contributions
    if (parameters.currentAge >= 50) {
      recommendations.push({
        id: generateId(),
        title: 'Utilize Catch-Up Contributions',
        description: 'Take advantage of higher contribution limits available at age 50+.',
        type: 'ACTION',
        priority: 'HIGH',
        estimatedBenefit: 'Additional $7,500 401(k) + $1,000 IRA',
        timeToImplement: 'Immediate'
      });
    }

    // Tax diversification
    if (plan.employee401kTraditional > 0 || plan.traditionalIRA > 0) {
      recommendations.push({
        id: generateId(),
        title: 'Consider Tax Diversification',
        description: 'Balance traditional (tax-deferred) and Roth (tax-free) contributions for retirement flexibility.',
        type: 'CONSIDERATION',
        priority: 'MEDIUM',
        estimatedBenefit: 'Tax flexibility in retirement',
        timeToImplement: 'Next enrollment'
      });
    }

    // Automation recommendation
    recommendations.push({
      id: generateId(),
      title: 'Automate All Contributions',
      description: 'Set up automatic payroll deductions and contributions to ensure consistent investing.',
      type: 'ACTION',
      priority: 'MEDIUM',
      estimatedBenefit: 'Consistent investing discipline',
      timeToImplement: '1-2 weeks'
    });

    return recommendations;
  }

  private validateContributionStrategy(plan: ContributionPlan, parameters: Record<string, any>): string[] {
    const warnings: string[] = [];

    // Check if missing employer match
    if (parameters.has401k && parameters.employerMatch > 0 && plan.employee401kTraditional < parameters.annualIncome * parameters.employerMatchLimit) {
      warnings.push('Not contributing enough to get full employer 401(k) match - missing free money');
    }

    // Check savings rate
    const savingsRate = plan.totalContributions / parameters.annualIncome;
    if (savingsRate < 0.10) {
      warnings.push('Total savings rate below 10% - may not be sufficient for retirement goals');
    }

    // Check for tax concentration
    const traditionalTotal = plan.employee401kTraditional + plan.traditionalIRA;
    const rothTotal = plan.employee401kRoth + plan.rothIRA;
    
    if (traditionalTotal > 0 && rothTotal === 0) {
      warnings.push('Consider some Roth contributions for tax diversification in retirement');
    }

    if (rothTotal > traditionalTotal * 3 && parameters.marginalTaxRate > 0.24) {
      warnings.push('High tax bracket - consider more traditional (tax-deferred) contributions');
    }

    return warnings;
  }

  private calculateContributionImpact(plan: ContributionPlan, parameters: Record<string, any>): StrategyImpact {
    const { annualIncome, marginalTaxRate } = parameters;
    
    const traditionalContributions = plan.employee401kTraditional + plan.traditionalIRA + plan.hsa;
    const annualTaxSavings = traditionalContributions * marginalTaxRate;
    const employerMatchValue = plan.employer401kMatch;

    return {
      cashFlowImpact: {
        monthlyChange: -(plan.totalContributions / 12) + (employerMatchValue / 12) + (annualTaxSavings / 12),
        annualChange: -plan.totalContributions + employerMatchValue + annualTaxSavings,
        firstYearTotal: -plan.totalContributions + employerMatchValue + annualTaxSavings
      },
      netWorthImpact: {
        fiveYearProjection: (plan.totalContributions + employerMatchValue) * 5 * 1.07, // Assuming 7% growth
        tenYearProjection: (plan.totalContributions + employerMatchValue) * 10 * 1.07,
        retirementImpact: (plan.totalContributions + employerMatchValue) * 30 * 1.07 // 30 years to retirement
      },
      taxImpact: {
        annualTaxSavings,
        lifetimeTaxSavings: annualTaxSavings * 30 // 30 years of savings
      },
      riskFactors: [
        {
          factor: 'Market Volatility',
          severity: 'MEDIUM' as const,
          mitigation: 'Dollar-cost averaging through systematic contributions'
        },
        {
          factor: 'Inflation Risk',
          severity: 'LOW' as const,
          mitigation: 'Growth-oriented investment allocation'
        },
        {
          factor: 'Liquidity Constraints',
          severity: 'MEDIUM' as const,
          mitigation: 'Maintain emergency fund outside retirement accounts'
        }
      ]
    };
  }

  private generateContributionNextSteps(plan: ContributionPlan): string[] {
    const steps = [
      'Review current payroll deductions and update contribution percentages',
      'Set up automatic IRA contributions if not employer-sponsored',
      'Ensure investment selections are appropriate for each account type',
      'Review and update beneficiaries on all retirement accounts'
    ];

    if (plan.employer401kMatch > 0) {
      steps.unshift('Verify you\'re contributing enough to get full employer match');
    }

    if (plan.hsa > 0) {
      steps.push('Keep HSA receipts and consider using HSA as retirement account');
    }

    if (plan.afterTax401k > 0) {
      steps.push('Verify your 401(k) plan allows in-service conversions for mega backdoor Roth');
    }

    return steps;
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // Check if user has employment income
    const hasIncome = context.currentEvents.some(event => 
      event.type === 'INCOME' && (event as any).amount > 0
    );
    
    if (!hasIncome) {
      reasons.push('No employment income detected - contribution optimization requires regular income');
    }

    // Check if user is of working age
    if (context.currentAge < 18 || context.currentAge > 70) {
      reasons.push('Strategy most beneficial for working-age individuals (18-70)');
    }

    return {
      applicable: reasons.length === 0,
      reasons
    };
  }

  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    const parameters = this.getParameters();

    // Validate all required parameters
    for (const [key, param] of Object.entries(parameters)) {
      if (param.required && (inputs[key] === undefined || inputs[key] === null)) {
        errors[key] = `${param.label} is required`;
        continue;
      }

      if (inputs[key] !== undefined && param.validation) {
        const validationError = param.validation(inputs[key]);
        if (validationError) {
          errors[key] = validationError;
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  async estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact> {
    // Use default parameters for estimation
    const defaultInputs = {};
    for (const [key, param] of Object.entries(this.getParameters())) {
      defaultInputs[key] = param.defaultValue;
    }
    
    const contributionLimits = this.getContributionLimits(defaultInputs.currentAge);
    const optimizationPlan = this.calculateOptimalContributions(defaultInputs, contributionLimits);
    
    return this.calculateContributionImpact(optimizationPlan, defaultInputs);
  }

  async isApplicable(context: StrategyExecutionContext): Promise<boolean> {
    const applicability = this.canApply(context);
    return applicability.applicable;
  }

  async getApplicabilityScore(context: StrategyExecutionContext): Promise<number> {
    const { currentAge, currentEvents } = context;
    
    let score = 90; // High base score - important for everyone
    
    // Boost for prime earning years
    if (currentAge >= 25 && currentAge <= 55) score += 10;
    
    // Check if already has retirement contributions
    const hasRetirementContributions = currentEvents.some(event => 
      event.type === EventType.SCHEDULED_CONTRIBUTION &&
      (event as any).targetAccountType &&
      ['tax_deferred', 'roth'].includes((event as any).targetAccountType)
    );
    
    if (!hasRetirementContributions) score += 10; // High priority if no existing contributions
    
    return Math.min(100, score);
  }
}

interface ContributionLimits {
  employee401k: number;
  total401k: number;
  traditionalIRA: number;
  rothIRA: number;
  hsa: number;
  year: number;
}

interface ContributionPlan {
  employer401kMatch: number;
  employee401kTraditional: number;
  employee401kRoth: number;
  traditionalIRA: number;
  rothIRA: number;
  hsa: number;
  afterTax401k: number;
  taxableInvestments: number;
  totalContributions: number;
}