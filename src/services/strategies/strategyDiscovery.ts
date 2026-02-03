/**
 * Strategy Discovery Service
 * 
 * AI-powered strategy recommendation engine that analyzes user profile,
 * life events, income, goals, and current financial situation to suggest
 * optimal strategies with priority ranking.
 */

import { strategyEngineService } from '../strategyEngine';
import { logger } from '../../utils/logger';
import type {
  StrategyExecutionContext,
  StrategyApplicabilityResult,
  StrategyEngine
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';
import { EventType } from '../../types/events/base';

export interface UserProfile {
  age: number;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  numberOfChildren: number;
  employmentStatus: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student';
  annualIncome: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive';
  timeHorizon: number; // years to retirement
  primaryGoals: string[];
  hasEmergencyFund: boolean;
  hasHighInterestDebt: boolean;
  hasRetirementAccount: boolean;
  hasTaxableInvestments: boolean;
  hasRealEstate: boolean;
  hasBusinessIncome: boolean;
  hasCollegeGoals: boolean;
}

export interface LifeEvent {
  type: 'marriage' | 'birth' | 'divorce' | 'job_change' | 'promotion' | 'inheritance' | 'home_purchase' | 'retirement';
  timeframe: 'past' | 'current' | 'near_future' | 'distant_future';
  impact: 'low' | 'medium' | 'high';
}

export interface StrategyRecommendation {
  strategyId: string;
  strategyName: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-1 score
  reasoning: string[];
  expectedBenefit: string;
  timeToImplement: string;
  prerequisites: string[];
  nextSteps: string[];
  customizations: Record<string, any>;
  urgency: 'immediate' | 'within_month' | 'within_quarter' | 'within_year';
}

export interface DiscoveryAnalysis {
  userProfile: UserProfile;
  lifeEvents: LifeEvent[];
  currentFinancialState: FinancialHealthScore;
  recommendations: StrategyRecommendation[];
  priorityOrder: string[];
  warnings: string[];
  opportunities: string[];
}

export interface FinancialHealthScore {
  overall: number; // 0-100
  breakdown: {
    emergencyFund: number;
    debtToIncome: number;
    savingsRate: number;
    diversification: number;
    taxEfficiency: number;
    riskManagement: number;
  };
  strengths: string[];
  weaknesses: string[];
  criticalIssues: string[];
}

export class StrategyDiscoveryService {
  /**
   * Generate comprehensive strategy recommendations based on user profile
   */
  async discoverStrategies(
    context: StrategyExecutionContext,
    profile?: Partial<UserProfile>,
    lifeEvents?: LifeEvent[]
  ): Promise<DiscoveryAnalysis> {
    try {
      // Build user profile from context and provided data
      const userProfile = this.buildUserProfile(context, profile);
      
      // Analyze current financial health
      const financialHealth = this.analyzeFinancialHealth(context, userProfile);
      
      // Generate strategy recommendations
      const recommendations = await this.generateRecommendations(
        context,
        userProfile,
        financialHealth,
        lifeEvents || []
      );
      
      // Prioritize strategies
      const priorityOrder = this.prioritizeStrategies(recommendations, financialHealth);
      
      // Generate insights
      const warnings = this.generateWarnings(financialHealth, userProfile);
      const opportunities = this.identifyOpportunities(context, userProfile, financialHealth);
      
      return {
        userProfile,
        lifeEvents: lifeEvents || [],
        currentFinancialState: financialHealth,
        recommendations,
        priorityOrder,
        warnings,
        opportunities
      };
    } catch (error) {
      logger.error('Error in discoverStrategies:', error);
      
      // Return a minimal fallback response
      const fallbackProfile: UserProfile = {
        age: context.currentAge,
        maritalStatus: 'single',
        numberOfChildren: 0,
        employmentStatus: 'employed',
        annualIncome: 0,
        riskTolerance: 'moderate',
        timeHorizon: Math.max(65 - context.currentAge, 10),
        primaryGoals: ['retirement'],
        hasEmergencyFund: false,
        hasHighInterestDebt: false,
        hasRetirementAccount: false,
        hasTaxableInvestments: false,
        hasRealEstate: false,
        hasBusinessIncome: false,
        hasCollegeGoals: false
      };
      
      const fallbackHealth: FinancialHealthScore = {
        overall: 50,
        breakdown: {
          emergencyFund: 20,
          debtToIncome: 60,
          savingsRate: 40,
          diversification: 40,
          taxEfficiency: 60,
          riskManagement: 60
        },
        strengths: [],
        weaknesses: ['Limited financial data available'],
        criticalIssues: []
      };
      
      return {
        userProfile: fallbackProfile,
        lifeEvents: lifeEvents || [],
        currentFinancialState: fallbackHealth,
        recommendations: [],
        priorityOrder: [],
        warnings: ['Unable to analyze financial situation completely'],
        opportunities: ['Complete your financial profile for better recommendations']
      };
    }
  }

  /**
   * Quick strategy suggestions for specific scenarios
   */
  async getQuickSuggestions(scenario: string, context: StrategyExecutionContext): Promise<StrategyRecommendation[]> {
    const suggestions: StrategyRecommendation[] = [];

    switch (scenario) {
      case 'new_graduate':
        suggestions.push(
          this.createRecommendation('emergency-fund', 'critical', 0.95, [
            'Building emergency fund is the foundation of financial security',
            'Start with 3-month goal, gradually build to 6 months',
            'Use high-yield savings account for better returns'
          ]),
          this.createRecommendation('retirement-optimization', 'high', 0.90, [
            'Start retirement savings early for maximum compound growth',
            'Take advantage of employer 401(k) match if available',
            'Consider Roth IRA for young professionals in lower tax brackets'
          ])
        );
        break;

      case 'mid_career':
        suggestions.push(
          this.createRecommendation('investment-optimization', 'high', 0.88, [
            'Mid-career is optimal time for aggressive investment growth',
            'Focus on tax-efficient index funds and asset allocation',
            'Consider increasing retirement contributions with salary growth'
          ]),
          this.createRecommendation('tax-optimization', 'high', 0.85, [
            'Higher income enables advanced tax optimization strategies',
            'Consider Roth conversions, tax-loss harvesting, HSA maximization',
            'Optimize tax-advantaged account placement'
          ])
        );
        break;

      case 'family_planning':
        suggestions.push(
          this.createRecommendation('college-planning', 'medium', 0.80, [
            'Start early for maximum compound growth for education expenses',
            '529 plans offer tax advantages for education savings',
            'Balance college savings with retirement priorities'
          ])
        );
        break;

      case 'pre_retirement':
        suggestions.push(
          this.createRecommendation('retirement-optimization', 'critical', 0.95, [
            'Maximize catch-up contributions in final working years',
            'Optimize withdrawal strategy and tax planning',
            'Consider Roth conversion ladder for tax-free retirement income'
          ])
        );
        break;

      case 'high_earner':
        suggestions.push(
          this.createRecommendation('tax-optimization', 'critical', 0.92, [
            'High earners benefit most from sophisticated tax strategies',
            'Maximize all tax-advantaged accounts and deductions',
            'Consider backdoor Roth IRA and mega backdoor Roth strategies'
          ])
        );
        break;
    }

    return suggestions;
  }

  /**
   * Analyze compatibility between multiple strategies
   */
  analyzeStrategyCompatibility(strategyIds: string[]): {
    compatible: boolean;
    conflicts: string[];
    synergies: string[];
    suggestions: string[];
  } {
    const conflicts: string[] = [];
    const synergies: string[] = [];
    const suggestions: string[] = [];

    // Check for common synergies
    if (strategyIds.includes('emergency-fund') && strategyIds.includes('investment-optimization')) {
      synergies.push('Emergency fund provides stability for investment strategy');
    }

    if (strategyIds.includes('tax-optimization') && strategyIds.includes('retirement-optimization')) {
      synergies.push('Tax optimization enhances retirement strategy effectiveness');
    }

    // Check for potential conflicts
    if (strategyIds.includes('debt-payoff') && strategyIds.includes('investment-optimization')) {
      const hasHighInterestDebt = true; // Would check actual debt rates
      if (hasHighInterestDebt) {
        conflicts.push('High-interest debt should be prioritized over investing');
        suggestions.push('Focus on debt payoff first, then redirect payments to investments');
      }
    }

    return {
      compatible: conflicts.length === 0,
      conflicts,
      synergies,
      suggestions
    };
  }

  // Private helper methods

  private buildUserProfile(context: StrategyExecutionContext, profile?: Partial<UserProfile>): UserProfile {
    // Extract information from context and events
    const incomeEvents = context.currentEvents.filter(e => 
      e.type === EventType.INCOME || 
      e.type === EventType.BUSINESS_INCOME ||
      e.type === EventType.SOCIAL_SECURITY_INCOME ||
      e.type === EventType.PENSION_INCOME ||
      e.type === EventType.RENTAL_INCOME
    );
    const annualIncome = incomeEvents.reduce((sum, event) => {
      const amount = (event as any).amount || 0;
      const frequency = (event as any).frequency || 'annually';
      return sum + (frequency === 'monthly' ? amount * 12 : amount);
    }, 0);

    const hasEmergencyFund = context.currentEvents.some(e => 
      (e as any).metadata?.accountSubtype === 'emergency_fund'
    );

    const hasRetirementAccount = context.currentEvents.some(e =>
      (e as any).targetAccountType === 'tax_deferred' || (e as any).targetAccountType === 'roth'
    );

    return {
      age: context.currentAge,
      maritalStatus: 'single', // Default, would be provided by user
      numberOfChildren: 0,
      employmentStatus: annualIncome > 0 ? 'employed' : 'unemployed',
      annualIncome,
      riskTolerance: 'moderate',
      timeHorizon: Math.max(65 - context.currentAge, 10),
      primaryGoals: ['retirement', 'financial_security'],
      hasEmergencyFund,
      hasHighInterestDebt: false, // Would analyze debt events
      hasRetirementAccount,
      hasTaxableInvestments: false, // Would analyze investment accounts
      hasRealEstate: false,
      hasBusinessIncome: false,
      hasCollegeGoals: false,
      ...profile
    };
  }

  private analyzeFinancialHealth(context: StrategyExecutionContext, profile: UserProfile): FinancialHealthScore {
    const scores = {
      emergencyFund: profile.hasEmergencyFund ? 85 : 20,
      debtToIncome: profile.hasHighInterestDebt ? 30 : 80,
      savingsRate: this.calculateSavingsRateScore(context, profile),
      diversification: profile.hasTaxableInvestments ? 70 : 40,
      taxEfficiency: this.calculateTaxEfficiencyScore(context, profile),
      riskManagement: 60 // Default, would analyze insurance and risk factors
    };

    const overall = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const criticalIssues: string[] = [];

    // Analyze each area
    if (scores.emergencyFund >= 80) strengths.push('Strong emergency fund');
    else if (scores.emergencyFund < 40) criticalIssues.push('Insufficient emergency fund');
    else weaknesses.push('Emergency fund needs improvement');

    if (scores.debtToIncome >= 70) strengths.push('Low debt-to-income ratio');
    else if (scores.debtToIncome < 40) criticalIssues.push('High debt burden');

    if (scores.savingsRate >= 70) strengths.push('Good savings rate');
    else if (scores.savingsRate < 40) weaknesses.push('Low savings rate');

    return {
      overall: Math.round(overall),
      breakdown: scores,
      strengths,
      weaknesses,
      criticalIssues
    };
  }

  private async generateRecommendations(
    context: StrategyExecutionContext,
    profile: UserProfile,
    health: FinancialHealthScore,
    lifeEvents: LifeEvent[]
  ): Promise<StrategyRecommendation[]> {
    const recommendations: StrategyRecommendation[] = [];
    const allStrategies = strategyEngineService.getAllStrategies();

    logger.info('Available strategies:', allStrategies.length);
    
    if (allStrategies.length === 0) {
      logger.warn('No strategies available from strategy engine service');
      return [];
    }

    for (const strategy of allStrategies) {
      const recommendation = await this.analyzeStrategyFit(strategy, context, profile, health, lifeEvents);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  private async analyzeStrategyFit(
    strategy: StrategyEngine,
    context: StrategyExecutionContext,
    profile: UserProfile,
    health: FinancialHealthScore,
    lifeEvents: LifeEvent[]
  ): Promise<StrategyRecommendation | null> {
    try {
      const applicability = strategy.canApply(context);
      
      if (!applicability.applicable) {
        return null; // Strategy not applicable
    }

    let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    let confidence = 0.5;
    const reasoning: string[] = [];

    // Analyze fit based on strategy type
    switch (strategy.id) {
      case 'emergency-fund':
        if (!profile.hasEmergencyFund) {
          priority = 'critical';
          confidence = 0.95;
          reasoning.push('Emergency fund is foundation of financial security');
          reasoning.push('Should be established before other investment strategies');
        } else {
          return null; // Already has emergency fund
        }
        break;

      case 'debt-payoff':
        if (profile.hasHighInterestDebt) {
          priority = 'critical';
          confidence = 0.90;
          reasoning.push('High-interest debt reduces wealth accumulation');
          reasoning.push('Guaranteed return by eliminating debt payments');
        } else {
          return null; // No high-interest debt
        }
        break;

      case 'retirement-optimization':
        if (profile.timeHorizon > 10) {
          priority = 'high';
          confidence = 0.85;
          reasoning.push('Long time horizon enables compound growth');
          reasoning.push('Tax advantages maximize retirement savings');
        } else if (profile.timeHorizon > 5) {
          priority = 'critical';
          confidence = 0.90;
          reasoning.push('Approaching retirement - maximize catch-up contributions');
        }
        break;

      case 'tax-optimization':
        if (profile.annualIncome > 100000) {
          priority = 'high';
          confidence = 0.85;
          reasoning.push('Higher income enables more tax optimization strategies');
          reasoning.push('Tax savings compound over time');
        }
        break;

      case 'investment-optimization':
        if (profile.hasEmergencyFund && !profile.hasHighInterestDebt) {
          priority = 'high';
          confidence = 0.80;
          reasoning.push('Financial foundation established for investing');
          reasoning.push('Long-term wealth building through market growth');
        } else {
          priority = 'medium';
          confidence = 0.60;
          reasoning.push('Consider after establishing emergency fund and paying high-interest debt');
        }
        break;

      case 'college-planning':
        if (profile.hasCollegeGoals && profile.numberOfChildren > 0) {
          priority = 'medium';
          confidence = 0.75;
          reasoning.push('Early start maximizes compound growth for education expenses');
          reasoning.push('529 plans provide tax advantages');
        } else {
          return null; // No college planning needs
        }
        break;
    }

    // Adjust based on life events
    for (const event of lifeEvents) {
      if (event.type === 'birth' && strategy.id === 'college-planning') {
        priority = 'high';
        confidence = Math.min(confidence + 0.15, 1.0);
        reasoning.push('New child makes college planning immediately relevant');
      }
      
      if (event.type === 'promotion' && strategy.id === 'tax-optimization') {
        confidence = Math.min(confidence + 0.10, 1.0);
        reasoning.push('Income increase enables more tax optimization strategies');
      }
    }

    // Generate customizations based on profile
    const customizations = this.generateCustomizations(strategy.id, profile);

    return this.createRecommendation(
      strategy.id,
      priority,
      confidence,
      reasoning,
      customizations
    );
    } catch (error) {
      logger.error('Error analyzing strategy fit for', strategy.id, ':', error);
      return null;
    }
  }

  private createRecommendation(
    strategyId: string,
    priority: 'critical' | 'high' | 'medium' | 'low',
    confidence: number,
    reasoning: string[],
    customizations: Record<string, any> = {}
  ): StrategyRecommendation {
    const strategy = strategyEngineService.getStrategy(strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);

    return {
      strategyId,
      strategyName: strategy.name,
      priority,
      confidence,
      reasoning,
      expectedBenefit: this.getExpectedBenefit(strategyId),
      timeToImplement: this.getTimeToImplement(strategyId),
      prerequisites: this.getPrerequisites(strategyId),
      nextSteps: this.getNextSteps(strategyId),
      customizations,
      urgency: this.getUrgency(priority)
    };
  }

  private generateCustomizations(strategyId: string, profile: UserProfile): Record<string, any> {
    const customizations: Record<string, any> = {};

    switch (strategyId) {
      case 'emergency-fund':
        customizations.monthsOfExpenses = profile.employmentStatus === 'self_employed' ? 9 : 6;
        customizations.contributionRate = Math.min(0.20, Math.max(0.05, profile.annualIncome / 500000));
        break;

      case 'investment-optimization':
        customizations.riskTolerance = profile.riskTolerance;
        customizations.monthlyInvestment = Math.round(profile.annualIncome * 0.15 / 12);
        break;

      case 'retirement-optimization':
        customizations.savingsRate = profile.timeHorizon > 20 ? 0.15 : 0.20;
        customizations.maxOutContributions = profile.annualIncome > 150000;
        break;

      case 'college-planning':
        customizations.numberOfChildren = profile.numberOfChildren;
        customizations.monthlyContribution = Math.round(profile.annualIncome * 0.05 / 12);
        break;
    }

    return customizations;
  }

  private prioritizeStrategies(
    recommendations: StrategyRecommendation[],
    health: FinancialHealthScore
  ): string[] {
    // Sort by priority first, then confidence
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    
    return recommendations
      .sort((a, b) => {
        const aPriorityIndex = priorityOrder.indexOf(a.priority);
        const bPriorityIndex = priorityOrder.indexOf(b.priority);
        
        if (aPriorityIndex !== bPriorityIndex) {
          return aPriorityIndex - bPriorityIndex;
        }
        
        return b.confidence - a.confidence;
      })
      .map(r => r.strategyId);
  }

  private calculateSavingsRateScore(context: StrategyExecutionContext, profile: UserProfile): number {
    // Estimate savings rate from events and income
    const savingEvents = context.currentEvents.filter(e => 
      e.type === EventType.SCHEDULED_CONTRIBUTION || (e as any).targetAccountType === 'tax_deferred'
    );
    
    const monthlySavings = savingEvents.reduce((sum, event) => {
      const amount = (event as any).amount || 0;
      const frequency = (event as any).frequency || 'annually';
      return sum + (frequency === 'monthly' ? amount : amount / 12);
    }, 0);

    const monthlyIncome = profile.annualIncome / 12;
    const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;

    if (savingsRate >= 0.20) return 90;
    if (savingsRate >= 0.15) return 80;
    if (savingsRate >= 0.10) return 65;
    if (savingsRate >= 0.05) return 45;
    return 20;
  }

  private calculateTaxEfficiencyScore(context: StrategyExecutionContext, profile: UserProfile): number {
    let score = 50; // Base score

    // Check for tax-advantaged accounts
    if (profile.hasRetirementAccount) score += 20;
    
    // Check for tax optimization strategies
    const hasTaxOptimization = context.currentEvents.some(e => {
      const eventType = e.type as string;
      return eventType === EventType.TAX_LOSS_HARVESTING || eventType === EventType.ROTH_CONVERSION;
    });
    if (hasTaxOptimization) score += 15;

    // High earners should have better tax efficiency
    if (profile.annualIncome > 100000 && score < 70) score = Math.max(score - 10, 30);

    return Math.min(score, 95);
  }

  private generateWarnings(health: FinancialHealthScore, profile: UserProfile): string[] {
    const warnings: string[] = [];

    if (health.criticalIssues.length > 0) {
      warnings.push(`Critical financial issues detected: ${health.criticalIssues.join(', ')}`);
    }

    if (profile.timeHorizon < 10 && health.breakdown.savingsRate < 60) {
      warnings.push('Approaching retirement with insufficient savings rate');
    }

    if (profile.annualIncome > 150000 && health.breakdown.taxEfficiency < 60) {
      warnings.push('High income without adequate tax optimization strategies');
    }

    return warnings;
  }

  private identifyOpportunities(
    context: StrategyExecutionContext,
    profile: UserProfile,
    health: FinancialHealthScore
  ): string[] {
    const opportunities: string[] = [];

    if (profile.annualIncome > 100000 && !profile.hasTaxableInvestments) {
      opportunities.push('High income enables taxable investment account for additional growth');
    }

    if (profile.hasEmergencyFund && !profile.hasHighInterestDebt && health.breakdown.savingsRate > 70) {
      opportunities.push('Strong financial foundation enables advanced strategies like real estate investing');
    }

    if (profile.timeHorizon > 20 && profile.riskTolerance === 'conservative') {
      opportunities.push('Long time horizon may allow for more aggressive growth strategy');
    }

    return opportunities;
  }

  private getExpectedBenefit(strategyId: string): string {
    const benefits: Record<string, string> = {
      'emergency-fund': 'Financial security and peace of mind',
      'debt-payoff': 'Guaranteed return equal to debt interest rate',
      'retirement-optimization': '$200K-500K additional retirement wealth',
      'tax-optimization': '$5K-20K/yr tax savings',
      'investment-optimization': '7-10%/yr long-term returns',
      'college-planning': 'Tax-free education expense coverage'
    };
    
    return benefits[strategyId] || 'Improved financial outcomes';
  }

  private getTimeToImplement(strategyId: string): string {
    const times: Record<string, string> = {
      'emergency-fund': '6-18 months',
      'debt-payoff': '1-5 years',
      'retirement-optimization': '1-2 weeks setup',
      'tax-optimization': '2-4 weeks',
      'investment-optimization': '1 week setup',
      'college-planning': '1 week setup'
    };
    
    return times[strategyId] || '2-4 weeks';
  }

  private getPrerequisites(strategyId: string): string[] {
    const prerequisites: Record<string, string[]> = {
      'emergency-fund': ['Regular income source', 'High-yield savings account'],
      'debt-payoff': ['List of all debts with interest rates'],
      'retirement-optimization': ['Employment or self-employment income'],
      'tax-optimization': ['Tax return from previous year', 'Current income information'],
      'investment-optimization': ['Emergency fund established', 'High-interest debt paid off'],
      'college-planning': ['Emergency fund established', 'Clear education goals']
    };
    
    return prerequisites[strategyId] || [];
  }

  private getNextSteps(strategyId: string): string[] {
    const steps: Record<string, string[]> = {
      'emergency-fund': [
        'Open high-yield savings account',
        'Calculate monthly expenses',
        'Set up automatic transfers',
        'Set target of 3-6 months expenses'
      ],
      'investment-optimization': [
        'Open investment accounts',
        'Select low-cost index funds',
        'Set up automatic investments',
        'Choose asset allocation'
      ],
      'retirement-optimization': [
        'Review employer 401(k) match',
        'Increase contribution percentage',
        'Consider Roth IRA',
        'Optimize investment selection'
      ]
    };
    
    return steps[strategyId] || ['Configure strategy parameters', 'Review and execute plan'];
  }

  private getUrgency(priority: 'critical' | 'high' | 'medium' | 'low'): 'immediate' | 'within_month' | 'within_quarter' | 'within_year' {
    const urgencyMap = {
      critical: 'immediate' as const,
      high: 'within_month' as const,
      medium: 'within_quarter' as const,
      low: 'within_year' as const
    };
    
    return urgencyMap[priority];
  }
}

// Export singleton instance
export const strategyDiscoveryService = new StrategyDiscoveryService();