/**
 * Simulation State Types - Core simulation engine state
 * 
 * This module contains the core state types used by the simulation engine,
 * representing the complete financial state at any point in time.
 * 
 * CRITICAL BOUNDARY: These types represent the "world state" that the simulation
 * engine evolves month by month. This is distinct from configuration types.
 */

import { FilingStatus } from '../common';
import { Account } from './account';
import { Liability } from './liability';

// Re-export FilingStatus for convenience
export { FilingStatus };

// =============================================================================
// SIMULATION STATE - The complete financial world at a point in time
// =============================================================================

/**
 * SimulationState: Complete state of the financial simulation at a single point in time
 * 
 * The simulation engine's core function is: (prevState, config, events) => newState
 * This interface represents the "newState" - the complete financial picture
 * after processing all events for a given month.
 * 
 * BOUNDARY: This is internal simulation state, not UI data.
 * UI components should use SimulationPayload types from api/payload.ts
 */
export interface SimulationState {
  // =============================================================================
  // ASSET & LIABILITY STATE - The balance sheet
  // =============================================================================
  
  /** Investment account balances and holdings */
  accounts: {
    taxable: Account;
    taxDeferred: Account;
    roth: Account;
    hsa: Account;
    cash: Account; // Or just a number if simpler
  };
  
  /** All outstanding liabilities */
  liabilities: Liability[];
  
  /** Real estate assets (tracked separately from investment accounts) */
  realEstate: RealEstateAsset[];
  
  // =============================================================================
  // TAX STATE - Critical for multi-month tax calculations
  // =============================================================================
  
  /** Tax-related state that carries across months */
  taxState: {
    /** Capital loss carryover from previous years */
    capitalLossCarryover: number;
    
    // Year-to-date accumulations needed for accurate tax calculation
    /** YTD ordinary income */
    ytdOrdinaryIncome: number;
    
    /** YTD short-term capital gains */
    ytdShortTermGains: number;
    
    /** YTD long-term capital gains */
    ytdLongTermGains: number;
    
    /** YTD qualified dividends */
    ytdQualifiedDividends: number;
    
    /** YTD pre-tax contributions */
    ytdPreTaxContributions: number;
    
    /** YTD withholding and estimated tax payments */
    ytdTaxWithholding: number;
    
    /** Current year filing status */
    filingStatus: FilingStatus;
    
    /** Number of dependents */
    numberOfDependents: number;
  };
  
  // =============================================================================
  // PERSONAL STATE - Demographics and life stage
  // =============================================================================
  
  /** Current age in complete months */
  ageMonths: number;
  
  /** Whether person is considered retired */
  isRetired: boolean;
  
  /** Current calendar year */
  currentYear: number;
  
  /** Current month within the year (0-11) */
  currentMonth: number;
  
  // =============================================================================
  // SIMULATION METADATA - Tracking and context
  // =============================================================================
  
  /** Current month offset in the simulation (0 = first month) */
  monthOffset: number;
  
  /** Last simulation update timestamp */
  lastUpdated?: Date;
  
  /** Simulation run ID for tracking */
  simulationRunId?: string;
}

// =============================================================================
// REAL ESTATE ASSET - Property holdings
// =============================================================================

/**
 * Represents real estate holdings separate from investment accounts
 */
export interface RealEstateAsset {
  /** Unique identifier */
  id: string;
  
  /** Property name/address */
  name: string;
  
  /** Type of real estate */
  type: 'primary_residence' | 'rental_property' | 'vacation_home' | 'commercial' | 'land';
  
  /** Current market value */
  currentValue: number;
  
  /** Original purchase price */
  purchasePrice: number;
  
  /** Date of purchase */
  purchaseDate: string;
  
  /** Outstanding mortgage balance (if any) */
  mortgageBalance?: number;
  
  /** ID of associated mortgage liability */
  mortgageLiabilityId?: string;
  
  /** Annual rental income (if applicable) */
  annualRentalIncome?: number;
  
  /** Annual property expenses */
  annualExpenses?: {
    propertyTax: number;
    insurance: number;
    maintenance: number;
    management: number;
    other: number;
  };
  
  /** Depreciation information for tax purposes */
  depreciationInfo?: {
    depreciableBasis: number;
    annualDepreciation: number;
    accumulatedDepreciation: number;
  };
}

// =============================================================================
// MONTH CONTEXT - Simulation execution context
// =============================================================================

/**
 * MonthContext: Runtime context available during month processing
 * 
 * This provides the simulation engine with current state and temporary
 * calculations needed during event processing.
 * 
 * BOUNDARY: This is internal simulation context, not persistent state.
 */
export interface MonthContext {
  /** Current simulation state (read-only during processing) */
  readonly currentState: SimulationState;
  
  /** Events being processed this month */
  readonly monthEvents: any[]; // SimulationEvent[] - avoid circular dependency
  
  /** Working calculations for this month */
  workingCalculations: {
    /** Income received this month */
    incomeThisMonth: number;
    
    /** Expenses paid this month */
    expensesThisMonth: number;
    
    /** Contributions made this month */
    contributionsThisMonth: number;
    
    /** Debt payments made this month */
    debtPaymentsThisMonth: number;
    
    /** Taxes withheld this month */
    taxesWithheldThisMonth: number;
    
    /** Investment returns this month */
    investmentReturnsThisMonth: number;
    
    /** Rebalancing activity this month */
    rebalancingActivityThisMonth: number;
  };
  
  /** Temporary flags and markers */
  flags: {
    /** Whether RMD was satisfied this year */
    rmdSatisfied: boolean;
    
    /** Whether rebalancing occurred this month */
    rebalancingOccurred: boolean;
    
    /** Whether tax-loss harvesting was triggered */
    tlhTriggered: boolean;
    
    /** Other processing flags */
    [key: string]: boolean;
  };
}

// =============================================================================
// SIMULATION PARAMETERS - Configuration for simulation execution
// =============================================================================

/**
 * SimulationParams: Core parameters that control simulation execution
 * 
 * BOUNDARY: This is configuration, not state. These values don't change
 * during simulation execution.
 */
export interface SimulationParams {
  /** Year the simulation starts */
  simulationStartYear: number;
  
  /** Year the simulation ends */
  simulationEndYear: number;
  
  /** Number of Monte Carlo paths to run */
  monteCarloRuns: number;
  
  /** Random seed for reproducible results */
  randomSeed?: number;
  
  /** Whether to include inflation adjustments */
  includeInflation: boolean;
  
  /** Base inflation rate assumption */
  baseInflationRate: number;
  
  /** Whether to include market volatility */
  includeMarketVolatility: boolean;
  
  /** Market return assumptions */
  marketAssumptions: {
    /** Annual stock market return */
    stockReturn: number;
    
    /** Stock market volatility */
    stockVolatility: number;
    
    /** Annual bond market return */
    bondReturn: number;
    
    /** Bond market volatility */
    bondVolatility: number;
    
    /** Cash/money market return */
    cashReturn: number;
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate total net worth from simulation state
 */
export function calculateNetWorth(state: SimulationState): number {
  const totalAssets = 
    state.accounts.taxable.totalValue +
    state.accounts.taxDeferred.totalValue +
    state.accounts.roth.totalValue +
    state.accounts.hsa.totalValue +
    state.accounts.cash.totalValue +
    state.realEstate.reduce((sum, property) => sum + property.currentValue, 0);
  
  const totalLiabilities = state.liabilities.reduce(
    (sum, liability) => sum + liability.currentPrincipalBalance,
    0
  );
  
  return totalAssets - totalLiabilities;
}

/**
 * Calculate total investment account value
 */
export function calculateInvestmentValue(state: SimulationState): number {
  return state.accounts.taxable.totalValue +
         state.accounts.taxDeferred.totalValue +
         state.accounts.roth.totalValue +
         state.accounts.hsa.totalValue;
}

/**
 * Calculate total debt burden
 */
export function calculateTotalDebt(state: SimulationState): number {
  return state.liabilities.reduce(
    (sum, liability) => sum + liability.currentPrincipalBalance,
    0
  );
}

/**
 * Get current age in years
 */
export function getCurrentAge(state: SimulationState): number {
  return Math.floor(state.ageMonths / 12);
}

/**
 * Check if person is at RMD age
 */
export function isAtRmdAge(state: SimulationState, rmdStartAge: number = 73): boolean {
  return getCurrentAge(state) >= rmdStartAge;
}

/**
 * Create initial simulation state
 */
export function createInitialSimulationState(
  initialAccounts: SimulationState['accounts'],
  initialLiabilities: Liability[],
  initialAge: number,
  filingStatus: FilingStatus,
  numberOfDependents: number = 0
): SimulationState {
  const now = new Date();
  
  return {
    accounts: initialAccounts,
    liabilities: initialLiabilities,
    realEstate: [],
    taxState: {
      capitalLossCarryover: 0,
      ytdOrdinaryIncome: 0,
      ytdShortTermGains: 0,
      ytdLongTermGains: 0,
      ytdQualifiedDividends: 0,
      ytdPreTaxContributions: 0,
      ytdTaxWithholding: 0,
      filingStatus,
      numberOfDependents,
    },
    ageMonths: initialAge * 12,
    isRetired: false,
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth(),
    monthOffset: 0,
    lastUpdated: now,
  };
}