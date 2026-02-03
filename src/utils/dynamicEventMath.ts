/**
 * Mathematical Calculation Utilities for Dynamic Events
 * 
 * Provides robust, tested mathematical functions for dynamic event calculations.
 * Each function includes validation and edge case handling.
 */

import { 
  SimulationContext, 
  BalanceCondition, 
  IncomeCondition,
  ConditionalContributionEvent,
  WaterfallAllocationEvent,
  PercentageContributionEvent,
  SmartDebtPaymentEvent,
  GoalDrivenContributionEvent,
  EmergencyFundMaintenanceEvent
} from '../types/events/dynamicEvents';
import { StandardAccountType } from '../types/accountTypes';

// ================================
// Core Mathematical Functions
// ================================

/**
 * Calculate emergency fund target based on configuration
 */
export function calculateEmergencyFundTarget(
  targetMonths: number,
  context: SimulationContext
): number {
  return Math.max(0, context.monthlyExpenses * targetMonths);
}

/**
 * Calculate waterfall allocation amounts
 */
export function calculateWaterfallAllocation(
  event: WaterfallAllocationEvent,
  context: SimulationContext
): Array<{ 
  priority: number; 
  targetAccount: StandardAccountType; 
  allocatedAmount: number; 
  maxAmount?: number;
  description: string;
  remainingCapacity: number;
}> {
  const results: Array<{
    priority: number;
    targetAccount: StandardAccountType;
    allocatedAmount: number;
    maxAmount?: number;
    description: string;
    remainingCapacity: number;
  }> = [];
  
  let remainingAmount = event.totalAmount;
  
  // Sort by priority (lower number = higher priority)
  const sortedWaterfall = [...event.waterfall].sort((a, b) => a.priority - b.priority);
  
  for (const tier of sortedWaterfall) {
    // Check if tier conditions are met
    if (!checkWaterfallTierConditions(tier, context)) {
      results.push({
        ...tier,
        allocatedAmount: 0,
        remainingCapacity: tier.maxAmount || Infinity
      });
      continue;
    }
    
    // Calculate available capacity for this tier
    // Check how much room is left in this account based on current balance and limits
    const currentBalance = context.accountBalances[tier.targetAccount] || 0;
    const annualLimit = tier.maxAmount || Infinity;
    const availableCapacity = tier.maxAmount ? Math.max(0, annualLimit - currentBalance) : remainingAmount;
    
    // Allocate amount (minimum of remaining amount and available capacity)
    const allocatedAmount = remainingAmount > 0 ? Math.min(remainingAmount, availableCapacity) : 0;
    
    results.push({
      ...tier,
      allocatedAmount,
      remainingCapacity: availableCapacity - allocatedAmount
    });
    
    remainingAmount -= allocatedAmount;
  }
  
  return results;
}

/**
 * Check if waterfall tier conditions are met
 */
function checkWaterfallTierConditions(
  tier: WaterfallAllocationEvent['waterfall'][0],
  context: SimulationContext
): boolean {
  if (!tier.conditions) return true;
  
  // Check employer match requirement
  if (tier.conditions.employerMatch) {
    // This would need to be determined from initial state or events
    // For now, assume it's available if it's a 401k/403b account
    if (tier.targetAccount !== 'tax_deferred') {
      return false;
    }
  }
  
  // Check income limits (e.g., Roth IRA income limits)
  if (tier.conditions.incomeLimit) {
    const annualIncome = context.monthlyIncome * 12;
    if (annualIncome > tier.conditions.incomeLimit) {
      return false;
    }
  }
  
  // Check if account exists (could be extended to check account availability)
  if (tier.conditions.accountExists) {
    // For now, assume all standard account types are available
    // This could be enhanced to check actual account availability
  }
  
  return true;
}

/**
 * Calculate percentage-based contribution amount
 */
export function calculatePercentageContribution(
  event: PercentageContributionEvent,
  context: SimulationContext
): number {
  // Calculate base income for the period
  let baseIncome = 0;
  
  if (event.incomeSource.useGross) {
    baseIncome = context.monthlyIncome;
  } else {
    // Simplified after-tax calculation (would need more sophisticated tax calc)
    const estimatedTaxRate = 0.25; // 25% effective tax rate assumption
    baseIncome = context.monthlyIncome * (1 - estimatedTaxRate);
  }
  
  // Calculate target contribution
  const targetContribution = baseIncome * event.savingsRate;
  
  // Apply limits
  let finalContribution = targetContribution;
  
  if (event.limits.minMonthly && finalContribution < event.limits.minMonthly) {
    finalContribution = event.limits.minMonthly;
  }
  
  if (event.limits.maxMonthly && finalContribution > event.limits.maxMonthly) {
    finalContribution = event.limits.maxMonthly;
  }
  
  // Check annual limit (simplified - would need YTD tracking)
  if (event.limits.maxAnnual) {
    const currentYearContributions = 0; // Would need to track YTD contributions
    const remainingAnnualCapacity = event.limits.maxAnnual - currentYearContributions;
    const monthsRemaining = 12 - (context.currentMonth % 12);
    const maxMonthlyForAnnualLimit = remainingAnnualCapacity / monthsRemaining;
    
    if (finalContribution > maxMonthlyForAnnualLimit) {
      finalContribution = maxMonthlyForAnnualLimit;
    }
  }
  
  return Math.max(0, finalContribution);
}

/**
 * Calculate conditional contribution amount
 */
export function calculateConditionalContribution(
  event: ConditionalContributionEvent,
  context: SimulationContext
): number {
  // Check if cash threshold is met
  if (context.cashBalance < event.cashThreshold) {
    return 0; // Don't contribute if below cash threshold
  }
  
  const excessCash = context.cashBalance - event.cashThreshold;
  
  switch (event.contributionStrategy.type) {
    case 'FIXED_AMOUNT':
      // Contribute fixed amount if we have enough excess cash
      return excessCash >= event.targetAmount ? event.targetAmount : 0;
    
    case 'PERCENTAGE_OF_EXCESS':
      const percentage = event.contributionStrategy.percentage || 1.0;
      return excessCash * percentage;
    
    case 'ALL_EXCESS':
      return excessCash;
    
    default:
      throw new Error(`Unknown contribution strategy: ${event.contributionStrategy.type}`);
  }
}

/**
 * Calculate smart debt payment allocation
 */
export function calculateSmartDebtPayment(
  event: SmartDebtPaymentEvent,
  context: SimulationContext,
  availableDebts: Array<{
    id: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
  }>
): Array<{
  debtId: string;
  extraPayment: number;
  totalPayment: number;
  reasoning: string;
}> {
  // Ensure emergency fund target is met first
  if (context.cashBalance < event.emergencyFundTarget) {
    return []; // Don't make extra debt payments if emergency fund is insufficient
  }
  
  // Calculate available amount for extra payments
  let availableAmount = 0;
  
  switch (event.extraPayment.type) {
    case 'FIXED_AMOUNT':
      availableAmount = event.extraPayment.amount;
      break;
    
    case 'PERCENTAGE_OF_INCOME':
      availableAmount = context.monthlyIncome * (event.extraPayment.percentage || 0);
      break;
    
    case 'SURPLUS_AFTER_EXPENSES':
      const surplus = context.monthlyIncome - context.monthlyExpenses;
      availableAmount = Math.max(0, surplus - event.emergencyFundTarget);
      break;
  }
  
  // Filter debts based on target list
  let targetDebts = availableDebts;
  if (event.targetDebts && event.targetDebts.length > 0) {
    targetDebts = availableDebts.filter(debt => event.targetDebts!.includes(debt.id));
  }
  
  // Sort debts based on strategy
  const sortedDebts = [...targetDebts].sort((a, b) => {
    switch (event.strategy) {
      case 'AVALANCHE':
        return b.interestRate - a.interestRate; // Highest interest first
      
      case 'SNOWBALL':
        return a.balance - b.balance; // Smallest balance first
      
      case 'HIGHEST_PAYMENT':
        return b.minimumPayment - a.minimumPayment; // Highest payment first
      
      default:
        return 0;
    }
  });
  
  // Allocate extra payment to debts
  const payments: Array<{
    debtId: string;
    extraPayment: number;
    totalPayment: number;
    reasoning: string;
  }> = [];
  
  let remainingAmount = availableAmount;
  
  for (const debt of sortedDebts) {
    if (remainingAmount <= 0) break;
    
    // For avalanche and snowball, focus all extra payment on top priority debt
    const extraPayment = (event.strategy === 'AVALANCHE' || event.strategy === 'SNOWBALL') 
      ? Math.min(remainingAmount, debt.balance) 
      : Math.min(remainingAmount / sortedDebts.length, debt.balance);
    
    if (extraPayment > 0) {
      payments.push({
        debtId: debt.id,
        extraPayment,
        totalPayment: debt.minimumPayment + extraPayment,
        reasoning: getDebtPaymentReasoning(event.strategy, debt, extraPayment)
      });
      
      remainingAmount -= extraPayment;
      
      // For focused strategies, put all money on first debt
      if (event.strategy === 'AVALANCHE' || event.strategy === 'SNOWBALL') {
        break;
      }
    }
  }
  
  return payments;
}

/**
 * Get reasoning text for debt payment strategy
 */
function getDebtPaymentReasoning(
  strategy: SmartDebtPaymentEvent['strategy'],
  debt: { id: string; balance: number; interestRate: number },
  extraPayment: number
): string {
  switch (strategy) {
    case 'AVALANCHE':
      return `Targeting highest interest rate (${(debt.interestRate * 100).toFixed(1)}%) to minimize total interest paid`;
    
    case 'SNOWBALL':
      return `Targeting smallest balance ($${debt.balance.toLocaleString()}) for psychological momentum`;
    
    case 'HIGHEST_PAYMENT':
      return `Targeting highest minimum payment for maximum cash flow improvement`;
    
    default:
      return `Allocating $${extraPayment.toLocaleString()} extra payment`;
  }
}

/**
 * Calculate goal-driven contribution adjustment
 */
export function calculateGoalDrivenContribution(
  event: GoalDrivenContributionEvent,
  context: SimulationContext
): { 
  contributionAmount: number; 
  adjustmentMultiplier: number; 
  reasoning: string; 
} {
  // Find the linked goal in context
  const goalProgress = context.goalProgress.find(g => g.goalId === event.targetGoalId);
  
  if (!goalProgress) {
    return {
      contributionAmount: event.adjustmentStrategy.baseContribution,
      adjustmentMultiplier: 1.0,
      reasoning: 'Goal not found, using base contribution'
    };
  }
  
  let multiplier = 1.0;
  let reasoning = 'On track with goal progress';
  
  switch (event.adjustmentStrategy.type) {
    case 'TIME_BASED':
      // Check if we're behind schedule (would need goal target date)
      if (!goalProgress.onTrack) {
        multiplier = 1.2; // 20% increase if behind
        reasoning = 'Behind schedule, increasing contributions';
      }
      break;
    
    case 'PROGRESS_BASED':
      // Simple progress-based adjustment
      if (goalProgress.progressPercentage < 80) {
        multiplier = 1.1; // 10% increase if behind target
        reasoning = `${goalProgress.progressPercentage.toFixed(1)}% complete, adjusting contributions`;
      }
      break;
    
    case 'DEFICIT_BASED':
      // Calculate what's needed to catch up
      if (!goalProgress.onTrack) {
        multiplier = 1.25; // 25% increase for deficit-based strategy
        reasoning = 'Deficit detected, increasing contributions';
      }
      break;
    
    case 'MARKET_RESPONSIVE':
      // Market conditions would be considered here
      multiplier = 1.0;
      reasoning = 'Market conditions stable';
      break;
  }
  
  // Apply aggressiveness factor
  const aggressivenessFactor = {
    'CONSERVATIVE': 0.8,
    'MODERATE': 1.0,
    'AGGRESSIVE': 1.2
  }[event.adjustmentStrategy.aggressiveness];
  
  multiplier *= aggressivenessFactor;
  
  const contributionAmount = event.adjustmentStrategy.baseContribution * multiplier;
  
  return {
    contributionAmount,
    adjustmentMultiplier: multiplier,
    reasoning
  };
}

// ================================
// Condition Evaluation Functions
// ================================

/**
 * Check if balance condition is met
 */
export function checkBalanceCondition(
  condition: BalanceCondition,
  currentBalance: number,
  context: SimulationContext
): boolean {
  // Check absolute limits
  if (condition.min !== undefined && currentBalance < condition.min) {
    return false;
  }
  
  if (condition.max !== undefined && currentBalance > condition.max) {
    return false;
  }
  
  // Check percentage-based limits
  if (condition.percentage) {
    let referenceValue = 0;
    
    switch (condition.percentage.of) {
      case 'INCOME':
        referenceValue = context.monthlyIncome * 12; // Annual income
        break;
      case 'EXPENSES':
        referenceValue = context.monthlyExpenses * 12; // Annual expenses
        break;
      case 'NET_WORTH':
        referenceValue = context.totalNetWorth;
        break;
    }
    
    const thresholdValue = referenceValue * (condition.percentage.value / 100);
    
    if (condition.min !== undefined && currentBalance < thresholdValue) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if income condition is met
 */
export function checkIncomeCondition(
  condition: IncomeCondition,
  context: SimulationContext
): boolean {
  // Check monthly income limits
  if (condition.minMonthly && context.monthlyIncome < condition.minMonthly) {
    return false;
  }
  
  if (condition.maxMonthly && context.monthlyIncome > condition.maxMonthly) {
    return false;
  }
  
  // Check annual income limits
  const annualIncome = context.monthlyIncome * 12;
  if (condition.minAnnual && annualIncome < condition.minAnnual) {
    return false;
  }
  
  if (condition.maxAnnual && annualIncome > condition.maxAnnual) {
    return false;
  }
  
  // Check income change thresholds
  if (condition.changeThreshold) {
    let referenceIncome = 0;
    
    switch (condition.changeThreshold.comparisonPeriod) {
      case 'LAST_MONTH':
        referenceIncome = context.lastMonthIncome;
        break;
      case 'LAST_3_MONTHS':
      case 'LAST_6_MONTHS':
        referenceIncome = context.averageIncomeLast6Months;
        break;
      case 'LAST_YEAR':
        referenceIncome = context.yearToDateIncome / 12; // Average monthly
        break;
    }
    
    if (referenceIncome > 0) {
      const changePercentage = (context.monthlyIncome - referenceIncome) / referenceIncome;
      if (Math.abs(changePercentage) < condition.changeThreshold.percentage) {
        return false;
      }
    }
  }
  
  return true;
}

// ================================
// Utility Functions
// ================================

/**
 * Format currency for user display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format percentage for user display
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Validate that a number is within reasonable bounds
 */
export function validateAmount(amount: number, context: { min?: number; max?: number; name: string }): void {
  if (!isFinite(amount) || isNaN(amount)) {
    throw new Error(`${context.name} must be a finite number, got: ${amount}`);
  }
  
  if (context.min !== undefined && amount < context.min) {
    throw new Error(`${context.name} must be at least ${context.min}, got: ${amount}`);
  }
  
  if (context.max !== undefined && amount > context.max) {
    throw new Error(`${context.name} must be at most ${context.max}, got: ${amount}`);
  }
}

/**
 * Calculate compound growth over time
 */
export function calculateCompoundGrowth(
  principal: number,
  annualRate: number,
  years: number,
  monthlyContribution: number = 0
): number {
  const monthlyRate = annualRate / 12;
  const totalMonths = years * 12;
  
  // Handle zero interest rate case
  if (annualRate === 0) {
    return principal + (monthlyContribution * totalMonths);
  }
  
  // Future value of principal
  const principalFV = principal * Math.pow(1 + monthlyRate, totalMonths);
  
  // Future value of monthly contributions (annuity)
  const contributionsFV = monthlyContribution * 
    ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  
  return principalFV + contributionsFV;
}