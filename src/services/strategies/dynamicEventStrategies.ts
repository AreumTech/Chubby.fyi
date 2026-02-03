/**
 * Dynamic Event Strategy Implementations
 * 
 * Pre-built financial strategies using the dynamic event system.
 * These strategies demonstrate how to combine multiple dynamic events
 * to achieve sophisticated financial automation.
 */

import { WaterfallAllocationTemplates, createWaterfallAllocation } from '../dynamicEvents/waterfallAllocation';
import { ConditionalContributionTemplates, createConditionalContribution } from '../dynamicEvents/conditionalContribution';
import { SmartDebtPaymentTemplates, createSmartDebtPayment } from '../dynamicEvents/smartDebtPayment';
import { GoalDrivenContributionTemplates, createGoalDrivenContribution } from '../dynamicEvents/goalDrivenContribution';
import { EmergencyFundMaintenanceTemplates, createEmergencyFundMaintenance } from '../dynamicEvents/emergencyFundMaintenance';
import { PercentageContributionTemplates, createPercentageContribution } from '../dynamicEvents/percentageContribution';
import { AnyDynamicEvent } from '../../types/events/dynamicEvents';

// ================================
// Strategy Configuration Types
// ================================

export interface StrategyConfig {
  id: string;
  name: string;
  description: string;
  category: 'retirement' | 'debt_freedom' | 'wealth_building' | 'tax_optimization' | 'goal_focused';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: string;
  prerequisites: string[];
  tags: string[];
}

export interface DynamicStrategy {
  config: StrategyConfig;
  events: AnyDynamicEvent[];
  explanation: string;
  keyBenefits: string[];
  considerations: string[];
  suitableFor: string[];
}

// ================================
// Max Out Everything Strategy
// ================================

/**
 * Max Out Everything Strategy
 * 
 * Optimal contribution order for high earners who want to maximize
 * tax-advantaged savings across all available accounts.
 */
export function createMaxOutEverythingStrategy(config: {
  monthlyAmount: number;
  currentAge: number;
  hasHSA?: boolean;
  employerMatchPercent?: number;
  employerMatchCap?: number;
}): DynamicStrategy {
  const { monthlyAmount, currentAge, hasHSA = false, employerMatchPercent = 0.06, employerMatchCap = 12000 } = config;
  
  // Calculate employer match amount
  const employerMatch = Math.min(employerMatchCap, monthlyAmount * 12 * employerMatchPercent);
  
  // Build waterfall priorities
  const waterfall = [
    {
      priority: 1,
      targetAccount: 'tax_deferred' as const,
      maxAmount: employerMatch,
      description: '401k to full employer match',
      conditions: { employerMatch: true }
    },
    {
      priority: 3,
      targetAccount: 'roth' as const,
      maxAmount: currentAge >= 50 ? 8000 : 7000, // 2025 limits with catch-up
      description: 'Roth IRA contribution'
    },
    {
      priority: 4,
      targetAccount: 'tax_deferred' as const,
      maxAmount: currentAge >= 50 ? 31000 : 23500, // 2025 limits with catch-up
      description: 'Additional 401k contribution'
    }
  ];
  
  // Add HSA if available (highest priority after employer match)
  if (hasHSA) {
    waterfall.splice(1, 0, {
      priority: 2,
      targetAccount: 'tax_deferred' as const,
      maxAmount: 4300, // 2024 individual limit
      description: 'HSA contribution (triple tax advantage)'
    });
  }
  
  const waterfallEvent = createWaterfallAllocation({
    name: 'Max Out Everything Waterfall',
    totalAmount: monthlyAmount,
    waterfall,
    remainder: {
      action: 'INVEST_TAXABLE',
      targetAccount: 'taxable'
    }
  });
  
  return {
    config: {
      id: 'max-out-everything',
      name: 'Max Out Everything',
      description: 'Optimal tax-advantaged savings for high earners',
      category: 'wealth_building',
      difficulty: 'intermediate',
      estimatedSetupTime: '15 minutes',
      prerequisites: ['High income (>$100k)', 'Access to 401k', 'Emergency fund established'],
      tags: ['tax-optimization', 'retirement', 'high-income', 'automated']
    },
    events: [waterfallEvent],
    explanation: `This strategy automatically maximizes your tax-advantaged savings by contributing to accounts in optimal order:
    
1. **401k Employer Match** - Free money (100% return)
2. **HSA** (if available) - Triple tax advantage${hasHSA ? '' : ' (not configured)'}
3. **Roth IRA** - Tax-free growth and withdrawals
4. **Additional 401k** - Traditional tax deferral
5. **Taxable Investments** - Any remaining funds

The system automatically handles contribution limits, including catch-up contributions if you're 50+.`,
    keyBenefits: [
      'Automatic tax optimization',
      'Maximizes employer matching',
      'Handles all contribution limits',
      'Scales with income changes',
      'No manual rebalancing needed'
    ],
    considerations: [
      'Requires substantial monthly savings capacity',
      'May limit near-term liquidity',
      'Traditional vs. Roth trade-offs depend on current/future tax rates',
      'HSA requires high-deductible health plan'
    ],
    suitableFor: [
      'High earners ($100k+ household income)',
      'People with established emergency funds',
      'Those prioritizing retirement savings',
      'Individuals comfortable with automated investing'
    ]
  };
}

// ================================
// Coast to FIRE Strategy
// ================================

/**
 * Coast to FIRE Strategy
 * 
 * Build retirement savings to a "coast" number where compound growth
 * will reach your retirement goal, then reduce savings rate and focus
 * on other goals or lifestyle.
 */
export function createCoastToFIREStrategy(config: {
  currentAge: number;
  retirementAge: number;
  coastTarget: number; // Amount needed to "coast"
  monthlyContribution: number;
  emergencyFundMonths?: number;
  postCoastGoalId?: string;
}): DynamicStrategy {
  const { 
    currentAge, 
    retirementAge, 
    coastTarget, 
    monthlyContribution,
    emergencyFundMonths = 6,
    postCoastGoalId = 'house-down-payment'
  } = config;
  
  const events: AnyDynamicEvent[] = [];
  
  // Emergency fund maintenance
  const emergencyFund = EmergencyFundMaintenanceTemplates.balanced(emergencyFundMonths);
  events.push(emergencyFund);
  
  // Goal-driven retirement contributions until coast target is reached
  const retirementGoalTracking = createGoalDrivenContribution({
    name: 'Coast FIRE Retirement Tracking',
    targetGoalId: 'retirement-coast-target',
    targetAccountType: 'tax_deferred',
    baseContribution: monthlyContribution,
    adjustmentStrategy: {
      type: 'DEFICIT_BASED',
      aggressiveness: 'MODERATE',
      minContribution: monthlyContribution * 0.5,
      maxContribution: monthlyContribution * 2
    },
    limits: {
      minContribution: 1000,
      maxContribution: 8000,
      maxAdjustmentPercentage: 0.50
    }
  });
  events.push(retirementGoalTracking);
  
  // Conditional contribution for post-coast goals
  // Only activates when retirement coast target is reached
  const postCoastContribution = createConditionalContribution({
    name: 'Post-Coast Goal Funding',
    targetAmount: monthlyContribution * 0.5, // Reduced rate after coasting
    targetAccountType: 'taxable',
    cashThreshold: 15000, // Maintain emergency fund
    strategy: 'FIXED_AMOUNT'
  });
  events.push(postCoastContribution);
  
  return {
    config: {
      id: 'coast-to-fire',
      name: 'Coast to FIRE',
      description: 'Aggressive early retirement savings, then coast on compound growth',
      category: 'retirement',
      difficulty: 'advanced',
      estimatedSetupTime: '25 minutes',
      prerequisites: ['Clear retirement timeline', 'Calculated coast target', 'Disciplined savings'],
      tags: ['FIRE', 'early-retirement', 'goal-based', 'compound-growth']
    },
    events,
    explanation: `Coast to FIRE means saving aggressively until your investments can grow to your retirement target without additional contributions:

**Phase 1: Build to Coast Target ($${coastTarget.toLocaleString()})**
- Aggressive retirement savings with automatic adjustments
- Goal tracking ensures you stay on pace
- Emergency fund protection maintained

**Phase 2: Coast Phase (After Target Reached)**
- Reduced retirement contributions (compound growth handles the rest)
- Redirect savings to other goals (house, travel, etc.)
- Maintain emergency fund and baseline contributions

The strategy automatically transitions between phases based on your retirement account balance.`,
    keyBenefits: [
      'Achieves financial independence earlier',
      'Automatic transition between savings phases', 
      'Maintains emergency fund protection',
      'Flexibility after coast target reached',
      'Compound growth does the heavy lifting'
    ],
    considerations: [
      'Requires high initial savings rate',
      'Success depends on market performance assumptions',
      'May sacrifice other goals during accumulation phase',
      'Coast target calculation is critical'
    ],
    suitableFor: [
      'High earners with FIRE aspirations',
      'People willing to live below their means',
      'Those with clear retirement number and timeline',
      'Individuals comfortable with investment risk'
    ]
  };
}

// ================================
// Debt Freedom Strategy
// ================================

/**
 * Debt Freedom Strategy
 * 
 * Systematic debt elimination using smart payment strategies
 * while maintaining emergency fund and basic retirement savings.
 */
export function createDebtFreedomStrategy(config: {
  debtStrategy: 'avalanche' | 'snowball';
  extraPaymentAmount: number;
  emergencyFundTarget: number;
  minRetirementContribution: number;
  redirectAfterPayoff?: 'retirement' | 'emergency_fund' | 'taxable';
}): DynamicStrategy {
  const { 
    debtStrategy, 
    extraPaymentAmount, 
    emergencyFundTarget,
    minRetirementContribution,
    redirectAfterPayoff = 'retirement'
  } = config;
  
  const events: AnyDynamicEvent[] = [];
  
  // Emergency fund maintenance (conservative during debt payoff)
  const emergencyFund = EmergencyFundMaintenanceTemplates.conservative(
    Math.ceil(emergencyFundTarget / 2500) // Convert dollar amount to months estimate
  );
  events.push(emergencyFund);
  
  // Minimum retirement contributions (don't completely stop)
  const minRetirement = createPercentageContribution({
    name: 'Minimum Retirement During Debt Payoff',
    savingsRate: 0.05, // 5% minimum
    targetAccountType: 'tax_deferred',
    incomeTypes: ['salary'],
    limits: {
      minMonthly: minRetirementContribution,
      maxMonthly: minRetirementContribution * 2
    }
  });
  events.push(minRetirement);
  
  // Smart debt payment strategy
  const debtPayment = debtStrategy === 'avalanche' 
    ? SmartDebtPaymentTemplates.debtAvalanche(extraPaymentAmount, emergencyFundTarget)
    : SmartDebtPaymentTemplates.debtSnowball(extraPaymentAmount, emergencyFundTarget);
  
  // Set up redirection after debt is paid off
  const redirectAccount = redirectAfterPayoff === 'retirement' ? 'tax_deferred' 
                        : redirectAfterPayoff === 'emergency_fund' ? 'cash'
                        : 'taxable';
  
  debtPayment.completionAction = {
    redirectTo: redirectAccount,
    continueAmount: true
  };
  
  events.push(debtPayment);
  
  return {
    config: {
      id: 'debt-freedom',
      name: 'Debt Freedom Strategy',
      description: 'Systematic debt elimination with smart payment strategies',
      category: 'debt_freedom',
      difficulty: 'beginner',
      estimatedSetupTime: '10 minutes',
      prerequisites: ['List of debts with balances and rates', 'Stable income', 'Basic emergency fund'],
      tags: ['debt-elimination', debtStrategy, 'cash-flow', 'financial-freedom']
    },
    events,
    explanation: `This strategy systematically eliminates debt using the ${debtStrategy} method while protecting your financial foundation:

**${debtStrategy.charAt(0).toUpperCase() + debtStrategy.slice(1)} Method:**
${debtStrategy === 'avalanche' 
  ? '- Pay minimums on all debts\n- Attack highest interest rate debt first\n- Mathematically optimal (saves most money)'
  : '- Pay minimums on all debts\n- Attack smallest balance first\n- Psychologically motivating (quick wins)'}

**Protection Measures:**
- Maintains emergency fund (${Math.ceil(emergencyFundTarget / 2500)} months expenses)
- Continues minimum retirement savings (${((minRetirementContribution / 8000) * 100).toFixed(1)}% estimated)
- Only makes extra payments when cash reserves are adequate

**After Debt Freedom:**
- Automatically redirects debt payments to ${redirectAfterPayoff.replace('_', ' ')}
- Maintains the payment habit for wealth building`,
    keyBenefits: [
      `${debtStrategy === 'avalanche' ? 'Minimizes total interest paid' : 'Provides psychological momentum'}`,
      'Protects emergency fund during payoff',
      'Continues retirement savings (even if minimal)',
      'Automatic transition to wealth building after payoff',
      'Prevents lifestyle inflation after debt freedom'
    ],
    considerations: [
      'Slower retirement savings during debt payoff phase',
      'Requires discipline to maintain extra payments',
      'Emergency fund may be smaller during payoff',
      `${debtStrategy === 'snowball' ? 'May pay more interest than avalanche method' : 'May lack motivational quick wins'}`
    ],
    suitableFor: [
      'People with high-interest debt (>6% rates)',
      'Those motivated by systematic approaches',
      'Individuals with stable income',
      `People who prefer ${debtStrategy === 'avalanche' ? 'mathematical optimization' : 'psychological motivation'}`
    ]
  };
}

// ================================
// Tax Optimization Strategy
// ================================

/**
 * Tax Optimization Strategy
 * 
 * Sophisticated tax planning using multiple account types and
 * dynamic rebalancing based on income and tax situation.
 */
export function createTaxOptimizationStrategy(config: {
  currentIncome: number;
  expectedRetirementIncome: number;
  currentTaxRate: number;
  expectedRetirementTaxRate: number;
  monthlyCapacity: number;
  hasHSA?: boolean;
}): DynamicStrategy {
  const { 
    currentIncome,
    expectedRetirementIncome,
    currentTaxRate,
    expectedRetirementTaxRate,
    monthlyCapacity,
    hasHSA = false
  } = config;
  
  const events: AnyDynamicEvent[] = [];
  
  // Determine optimal Traditional vs. Roth allocation
  const currentTaxRateHigh = currentTaxRate > expectedRetirementTaxRate;
  const traditionalWeight = currentTaxRateHigh ? 0.7 : 0.3;
  const rothWeight = 1 - traditionalWeight;
  
  // HSA gets highest priority (triple tax advantage)
  if (hasHSA) {
    const hsaContribution = createPercentageContribution({
      name: 'HSA Tax Optimization',
      savingsRate: 0.05, // Start with 5% for HSA
      targetAccountType: 'tax_deferred',
      incomeTypes: ['salary'],
      limits: {
        maxAnnual: 4300 // 2024 limit
      }
    });
    events.push(hsaContribution);
  }
  
  // Traditional 401k/IRA contributions (tax deduction now)
  const traditionalContribution = createPercentageContribution({
    name: 'Traditional Retirement (Tax Deduction)',
    savingsRate: (monthlyCapacity / (currentIncome / 12)) * traditionalWeight,
    targetAccountType: 'tax_deferred',
    incomeTypes: ['salary', 'bonus'],
    limits: {
      maxAnnual: 23500 // 2025 401k limit
    }
  });
  events.push(traditionalContribution);
  
  // Roth contributions (tax-free growth)
  const rothContribution = createPercentageContribution({
    name: 'Roth Retirement (Tax-Free Growth)',
    savingsRate: (monthlyCapacity / (currentIncome / 12)) * rothWeight,
    targetAccountType: 'roth',
    incomeTypes: ['salary', 'bonus'],
    limits: {
      maxAnnual: 7000 // 2025 Roth IRA limit
    }
  });
  events.push(rothContribution);
  
  // Taxable investments for additional capacity
  const taxableInvestment = createConditionalContribution({
    name: 'Tax-Efficient Taxable Investments',
    targetAmount: monthlyCapacity * 0.3, // Additional capacity
    targetAccountType: 'taxable',
    cashThreshold: 20000, // Higher emergency fund for tax planning
    strategy: 'FIXED_AMOUNT'
  });
  events.push(taxableInvestment);
  
  return {
    config: {
      id: 'tax-optimization',
      name: 'Tax Optimization Strategy',
      description: 'Sophisticated multi-account tax planning for wealth building',
      category: 'tax_optimization',
      difficulty: 'advanced',
      estimatedSetupTime: '30 minutes',
      prerequisites: ['Understanding of tax brackets', 'Multiple account types available', 'Tax planning knowledge'],
      tags: ['tax-planning', 'advanced', 'multi-account', 'wealth-building']
    },
    events,
    explanation: `This strategy optimizes your tax situation across multiple time horizons:

**Current Tax Optimization:**
- ${traditionalWeight * 100}% traditional retirement accounts (${currentTaxRate * 100}% current tax rate)
- ${rothWeight * 100}% Roth accounts (${expectedRetirementTaxRate * 100}% expected retirement rate)
${hasHSA ? '- HSA maximization (triple tax advantage)' : '- No HSA available'}

**Account Allocation Strategy:**
1. **HSA** - Triple tax advantage (deduction, growth, qualified withdrawals)
2. **Traditional 401k/IRA** - Tax deduction now, defer to retirement
3. **Roth IRA** - Pay taxes now, tax-free forever
4. **Taxable** - Tax-efficient investments, flexibility

**Tax Rate Arbitrage:**
Your current marginal rate (${(currentTaxRate * 100).toFixed(1)}%) vs. expected retirement rate (${(expectedRetirementTaxRate * 100).toFixed(1)}%) 
${currentTaxRateHigh ? 'favors traditional accounts now' : 'favors Roth accounts now'}.`,
    keyBenefits: [
      'Optimizes across multiple tax timeframes',
      'Balances current deductions with future tax-free income',
      'Maximizes tax-advantaged space',
      'Provides retirement tax diversification',
      'Adapts to income and tax law changes'
    ],
    considerations: [
      'Complex strategy requiring tax knowledge',
      'Tax law changes can affect optimal allocation',
      'May sacrifice some liquidity for tax benefits',
      'Requires ongoing monitoring and adjustment'
    ],
    suitableFor: [
      'High earners in high tax brackets',
      'People with long investment timelines',
      'Those comfortable with tax complexity',
      'Individuals wanting optimal tax efficiency'
    ]
  };
}

// ================================
// Strategy Registry
// ================================

export const DynamicEventStrategies = {
  maxOutEverything: createMaxOutEverythingStrategy,
  coastToFIRE: createCoastToFIREStrategy,
  debtFreedom: createDebtFreedomStrategy,
  taxOptimization: createTaxOptimizationStrategy
};

export type StrategyId = keyof typeof DynamicEventStrategies;