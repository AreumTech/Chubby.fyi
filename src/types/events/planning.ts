/**
 * Planning Events
 * 
 * Events related to financial planning, goal setting, and risk monitoring.
 * These events represent structural changes to the planning framework
 * rather than direct cash flows.
 */

import { EventType, EventPriority, BaseEvent } from './base';
import { AssetClass, AccountCategory } from '../common';
import { AccountType } from '../accountTypes';

// =============================================================================
// GOAL DEFINE EVENT
// =============================================================================

/**
 * Goal Define Event: Setting financial goals and milestones
 * 
 * Category: Structural & Life Transition
 * Impact: Establishes targets for cash flow planning and withdrawal strategies
 * 
 * Example: "Retire at 65 with $2M portfolio" or "Buy house in 2030 for $800K"
 */
export interface GoalDefineEvent extends BaseEvent {
  type: EventType.GOAL_DEFINE;
  priority: EventPriority.GOAL_DEFINE;
  
  /** Type of goal */
  goalType: 'RETIREMENT' | 'MAJOR_PURCHASE' | 'EDUCATION' | 'EMERGENCY_FUND' | 'CUSTOM';
  
  /** Target amount for the goal */
  targetAmount: number;
  
  /** Target date to achieve the goal */
  targetMonthOffset: number;
  
  /** Priority level of this goal */
  goalPriority: 'HIGH' | 'MEDIUM' | 'LOW';
  
  /** Specific account to fund this goal from */
  sourceAccountType?: AccountType;
  
  /** Account category to fund this goal from */
  sourceAccountCategory?: AccountCategory;
  
  /** Funding strategy for the goal */
  fundingStrategy?: 'deplete_specific_account' | 'proportional_withdrawal' | 'cash_flow_priority' | 'custom';
  
  /** Multiple funding sources with priorities */
  fundingSources?: Array<{
    accountType: AccountType;
    priority: number; // Lower number = higher priority
    maxPercentage?: number; // Maximum percentage of goal to fund from this source
  }>;
  
  /** Whether this goal is flexible in timing */
  isFlexible: boolean;
  
  /** Minimum acceptable amount (for flexible goals) */
  minimumAmount?: number;
  
  /** Maximum acceptable amount (for flexible goals) */
  maximumAmount?: number;
  
  /** Annual inflation adjustment for target amount */
  inflationAdjustment?: number;
  
  /** Whether to adjust target amount for inflation */
  adjustForInflation?: boolean;
  
  /** Custom inflation rate (if different from default) */
  customInflationRate?: number;
  
  /** Surplus/shortfall tracking */
  trackSurplusShortfall?: boolean;
  
  /** Action to take on goal surplus */
  surplusAction?: 'reinvest' | 'redirect_to_goal' | 'increase_spending' | 'none';
  
  /** Target goal ID for surplus redirection */
  surplusTargetGoalId?: string;
  
  /** Action to take on goal shortfall */
  shortfallAction?: 'extend_timeline' | 'reduce_amount' | 'increase_savings' | 'none';
  
  /** Linked events that should trigger when goal is funded */
  linkedEvents?: Array<{
    eventType: string;
    eventParams: any;
    triggerCondition: 'on_goal_achievement' | 'on_funding_start' | 'on_milestone';
  }>;
  
  /** Custom description for the goal */
  description?: string;
}

// =============================================================================
// CONCENTRATION RISK ALERT EVENT
// =============================================================================

/**
 * Concentration Risk Alert Event: Monitoring for portfolio concentration risks
 * 
 * Category: Structural & Life Transition
 * Impact: Triggers alerts when portfolio becomes too concentrated in specific assets
 * 
 * Example: Alert when single stock exceeds 20% of portfolio value
 */
export interface ConcentrationRiskAlertEvent extends BaseEvent {
  type: EventType.CONCENTRATION_RISK_ALERT;
  priority: EventPriority.CONCENTRATION_RISK_ALERT;
  
  /** Type of concentration risk to monitor */
  riskType: 'SINGLE_STOCK' | 'SECTOR' | 'ASSET_CLASS' | 'GEOGRAPHIC' | 'CUSTOM';
  
  /** Asset or category to monitor */
  assetIdentifier: string;
  
  /** Threshold percentage (0-1) that triggers alert */
  thresholdPercentage: number;
  
  /** Account types to monitor */
  accountTypes: AccountType[];
  
  /** Whether to include all accounts or just specified ones */
  includeAllAccounts: boolean;
  
  /** Action to take when threshold is breached */
  alertAction: 'NOTIFY_ONLY' | 'SUGGEST_REBALANCE' | 'AUTO_REBALANCE';
  
  /** Target percentage after rebalancing */
  targetPercentageAfterRebalance?: number;
  
  /** How often to check concentration (in months) */
  checkFrequencyMonths: number;
  
  /** Start monitoring from this date */
  startDateOffset: number;
  
  /** Stop monitoring at this date (optional) */
  endDateOffset?: number;
  
  /** Custom alert message */
  customMessage?: string;
}

// =============================================================================
// FINANCIAL MILESTONE EVENT
// =============================================================================

/**
 * Financial Milestone Event: Tracking progress towards financial milestones
 * 
 * Category: Structural & Life Transition
 * Impact: Provides checkpoints for financial plan progress and adjustments
 * 
 * Example: "Check net worth progress at age 40" or "Evaluate retirement readiness at 60"
 */
export interface FinancialMilestoneEvent extends BaseEvent {
  type: EventType.FINANCIAL_MILESTONE;
  priority: EventPriority.FINANCIAL_MILESTONE;
  
  /** Type of milestone */
  milestoneType: 'NET_WORTH_CHECK' | 'RETIREMENT_READINESS' | 'DEBT_PAYOFF' | 'SAVINGS_RATE' | 'CUSTOM';
  
  /** Target value for the milestone */
  targetValue: number;
  
  /** Date to evaluate the milestone */
  evaluationDateOffset: number;
  
  /** What to compare against (net worth, portfolio value, etc.) */
  comparisonMetric: 'NET_WORTH' | 'PORTFOLIO_VALUE' | 'LIQUID_ASSETS' | 'DEBT_BALANCE' | 'ANNUAL_INCOME';
  
  /** Account types to include in evaluation */
  accountTypes?: AccountType[];
  
  /** Action to take if milestone is not met */
  missedMilestoneAction: 'NOTIFY_ONLY' | 'ADJUST_PLAN' | 'INCREASE_SAVINGS' | 'EXTEND_TIMELINE';
  
  /** Percentage tolerance for "close enough" (0-1) */
  tolerancePercentage?: number;
  
  /** Custom description for the milestone */
  description?: string;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for Goal Define Events
 */
export function isGoalDefineEvent(event: any): event is GoalDefineEvent {
  return event?.type === EventType.GOAL_DEFINE;
}

/**
 * Type guard for Concentration Risk Alert Events
 */
export function isConcentrationRiskAlertEvent(event: any): event is ConcentrationRiskAlertEvent {
  return event?.type === EventType.CONCENTRATION_RISK_ALERT;
}

/**
 * Type guard for Financial Milestone Events
 */
export function isFinancialMilestoneEvent(event: any): event is FinancialMilestoneEvent {
  return event?.type === EventType.FINANCIAL_MILESTONE;
}

