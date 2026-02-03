/**
 * Strategy Layer Types
 * 
 * Defines types for the automated financial strategy generation system.
 * Strategies can generate events and create new plans automatically.
 */

import type { FinancialEvent, EventType } from './events';
import type { AppConfig } from './index';

export interface StrategyConfig {
  id: string;
  name: string;
  description: string;
  category: StrategyCategory;
  parameters: StrategyParameters;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedTimeframe: number; // months
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  tags: string[];
}

export type StrategyCategory = 
  | 'DEBT_PAYOFF'
  | 'RETIREMENT_OPTIMIZATION' 
  | 'TAX_OPTIMIZATION'
  | 'EMERGENCY_FUND'
  | 'INVESTMENT_STRATEGY'
  | 'REAL_ESTATE'
  | 'COLLEGE_PLANNING'
  | 'BUSINESS_STRATEGY'
  | 'ESTATE_PLANNING'
  | 'INSURANCE_OPTIMIZATION';

export interface StrategyParameters {
  [key: string]: StrategyParameter;
}

export interface StrategyScheduleConfig {
  startDate: Date;
  endDate?: Date;
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'annually' | 'custom';
  customSchedule?: {
    dates: Date[];
    recurrence?: {
      interval: number;
      unit: 'days' | 'weeks' | 'months' | 'years';
      until?: Date;
    };
  };
}

export interface StrategyParameter {
  type: 'number' | 'percentage' | 'boolean' | 'date' | 'account_type' | 'selection' | 'text';
  label: string;
  description: string;
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: any; label: string }>;
  required: boolean;
  validation?: (value: any) => string | null;
}

export interface StrategyExecutionContext {
  config: AppConfig;
  currentEvents: FinancialEvent[];
  userInputs: Record<string, any>;
  startDate: Date;
  currentAge: number;
  currentYear: number;
}

export interface StrategyResult {
  success: boolean;
  strategyId: string;
  strategyName: string;
  newPlanName: string;
  generatedEvents: StrategyGeneratedEvent[];
  modifiedEvents: StrategyModifiedEvent[];
  recommendations: StrategyRecommendation[];
  estimatedImpact: StrategyImpact;
  warnings: string[];
  nextSteps: string[];
  policy?: StrategyPolicy; // Human-readable policy summary for sidebar display
}

/**
 * Policy Summary - Displayed in sidebar to show active strategy configuration
 * Example: "Excess cash → 1) 401k ($1,200/mo) → 2) Taxable brokerage (remainder)"
 */
export interface StrategyPolicy {
  summary: string; // One-line summary
  details?: string[]; // Detailed breakdown (optional)
  configuration?: Record<string, any>; // Configuration snapshot
}

export interface StrategyGeneratedEvent {
  event: FinancialEvent;
  reason: string;
  isEditable: boolean;
  linkedToStrategy: boolean;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StrategyModifiedEvent {
  originalEventId: string;
  modifiedEvent: FinancialEvent;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    reason: string;
  }>;
}

export interface StrategyRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'ACTION' | 'CONSIDERATION' | 'WARNING' | 'OPTIMIZATION';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedBenefit?: string;
  timeToImplement?: string;
  difficulty?: 'EASY' | 'MODERATE' | 'DIFFICULT';
}

export interface StrategyImpact {
  cashFlowImpact: {
    monthlyChange: number;
    annualChange: number;
    firstYearTotal: number;
  };
  netWorthImpact: {
    fiveYearProjection: number;
    tenYearProjection: number;
    retirementImpact: number;
  };
  taxImpact: {
    annualTaxSavings: number;
    lifetimeTaxSavings: number;
  };
  riskFactors: Array<{
    factor: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigation: string;
  }>;
}

export interface StrategyEngine {
  id: string;
  name: string;
  category: StrategyCategory;
  config: StrategyConfig;
  
  /**
   * Validates if this strategy can be applied to the current financial situation
   */
  canApply(context: StrategyExecutionContext): {
    applicable: boolean;
    reasons: string[];
  };
  
  /**
   * Generates events and modifications for this strategy
   */
  execute(context: StrategyExecutionContext): Promise<StrategyResult>;
  
  /**
   * Calculates the estimated impact without actually applying the strategy
   */
  estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact>;
  
  /**
   * Gets the required parameters for this strategy
   */
  getParameters(): StrategyParameters;
  
  /**
   * Validates user inputs for this strategy
   */
  validateInputs(inputs: Record<string, any>): {
    valid: boolean;
    errors: Record<string, string>;
  };
}

export interface StrategyLibrary {
  strategies: Map<string, StrategyEngine>;
  categories: Map<StrategyCategory, string>;
  
  /**
   * Gets all available strategies
   */
  getAllStrategies(): StrategyEngine[];
  
  /**
   * Gets strategies by category
   */
  getStrategiesByCategory(category: StrategyCategory): StrategyEngine[];
  
  /**
   * Gets strategies applicable to the current context
   */
  getApplicableStrategies(context: StrategyExecutionContext): StrategyEngine[];
  
  /**
   * Registers a new strategy
   */
  registerStrategy(strategy: StrategyEngine): void;
  
  /**
   * Gets a strategy by ID
   */
  getStrategy(id: string): StrategyEngine | undefined;
}

export interface StrategyPlanGenerator {
  /**
   * Creates a new plan based on applying a strategy
   */
  createStrategyPlan(
    basePlanId: string,
    strategy: StrategyEngine,
    context: StrategyExecutionContext,
    result: StrategyResult
  ): Promise<{
    newPlanId: string;
    planName: string;
    events: FinancialEvent[];
  }>;
}

export interface StrategyApplicabilityResult {
  id: string;
  name: string;
  category: StrategyCategory;
  description: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedTimeframe?: string;
  difficultyLevel?: 'EASY' | 'INTERMEDIATE' | 'ADVANCED';
  tags?: string[];
  applicable: boolean;
  reasons: string[];
}