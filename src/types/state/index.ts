/**
 * State Module - All simulation state types
 * 
 * This module contains types that represent the current state of the simulation
 * at any point in time. These are distinct from configuration types and UI types.
 * 
 * CRITICAL BOUNDARY: State vs Configuration
 * - State: Changes during simulation execution (account balances, age, tax carryovers)
 * - Configuration: Fixed rules and settings (tax brackets, strategy parameters)
 * 
 * The simulation engine operates as: (PreviousState, Configuration, Events) → NewState
 */

// =============================================================================
// RE-EXPORTS - All state-related types
// =============================================================================

// Core state components
export * from './account';
export * from './liability';
export * from './simulation';

// =============================================================================
// STATE SNAPSHOTS - For analysis and reporting
// =============================================================================

import { SimulationState } from './simulation';
import { Account } from './account';

/**
 * MonthlySnapshot: Complete state capture for a specific month
 * Used for detailed analysis and deep-dive reporting
 */
export interface MonthlySnapshot {
  /** Month offset in simulation */
  monthOffset: number;
  
  /** Calendar information */
  calendar: {
    year: number;
    month: number; // 0-11
    date: Date;
  };
  
  /** Person's age */
  age: {
    years: number;
    months: number;
    totalMonths: number;
  };
  
  /** Complete simulation state */
  state: SimulationState;
  
  /** Calculated metrics */
  metrics: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    investmentValue: number;
    cashValue: number;
    realEstateValue: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
  };
  
  /** Cash flow for this month */
  cashFlow: {
    inflows: {
      employment: number;
      investment: number;
      other: number;
      total: number;
    };
    outflows: {
      taxes: number;
      livingExpenses: number;
      debtPayments: number;
      contributions: number;
      other: number;
      total: number;
    };
    netCashFlow: number;
  };
}

/**
 * YearlySnapshot: Aggregated state for an entire year
 * Used for high-level analysis and charts
 */
export interface YearlySnapshot {
  /** Calendar year */
  year: number;
  
  /** Age at end of year */
  ageAtYearEnd: number;
  
  /** End-of-year state */
  endOfYearState: SimulationState;
  
  /** Key metrics */
  metrics: {
    netWorthEndOfYear: number;
    netWorthChange: {
      amount: number;
      percentage: number;
    };
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    savingsRate: number;
    investmentReturn: number;
    investmentReturnRate: number;
  };
  
  /** Tax information */
  taxes: {
    totalTaxesPaid: number;
    effectiveTaxRate: number;
    marginalTaxRate: number;
    rmdAmount?: number;
    rothConversions?: number;
  };
  
  /** Major events or milestones */
  milestones: Array<{
    type: string;
    description: string;
    impact: number;
  }>;
}

// =============================================================================
// STATE EVOLUTION TRACKING
// =============================================================================

/**
 * StateTransition: Represents a change in state from one month to the next
 * Useful for debugging and understanding simulation behavior
 */
export interface StateTransition {
  /** Starting state */
  fromState: SimulationState;
  
  /** Ending state */
  toState: SimulationState;
  
  /** Events that caused the transition */
  events: any[]; // SimulationEvent[] - avoid circular dependency
  
  /** Month offset when transition occurred */
  monthOffset: number;
  
  /** Changes in key metrics */
  changes: {
    netWorthChange: number;
    cashChange: number;
    investmentValueChange: number;
    debtChange: number;
  };
  
  /** Execution metadata */
  metadata: {
    processingTime: number;
    eventsProcessed: number;
    warningsGenerated: string[];
    errorsEncountered: string[];
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a monthly snapshot from simulation state
 */
export function createMonthlySnapshot(
  state: SimulationState,
  monthlyIncome: number,
  monthlyExpenses: number
): MonthlySnapshot {
  const ageYears = Math.floor(state.ageMonths / 12);
  const ageMonthsRemainder = state.ageMonths % 12;
  
  // Calculate metrics
  const netWorth = calculateNetWorth(state);
  const investmentValue = calculateInvestmentValue(state);
  const realEstateValue = state.realEstate.reduce((sum, property) => sum + property.currentValue, 0);
  const totalLiabilities = state.liabilities.reduce((sum, liability) => sum + liability.currentPrincipalBalance, 0);
  
  return {
    monthOffset: state.monthOffset,
    calendar: {
      year: state.currentYear,
      month: state.currentMonth,
      date: new Date(state.currentYear, state.currentMonth, 1),
    },
    age: {
      years: ageYears,
      months: ageMonthsRemainder,
      totalMonths: state.ageMonths,
    },
    state,
    metrics: {
      netWorth,
      totalAssets: netWorth + totalLiabilities,
      totalLiabilities,
      investmentValue,
      cashValue: state.accounts.cash.totalValue,
      realEstateValue,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings: monthlyIncome - monthlyExpenses,
    },
    cashFlow: {
      inflows: {
        employment: 0, // TODO: Calculate from events
        investment: 0,
        other: 0,
        total: monthlyIncome,
      },
      outflows: {
        taxes: 0, // TODO: Calculate from events
        livingExpenses: 0,
        debtPayments: 0,
        contributions: 0,
        other: 0,
        total: monthlyExpenses,
      },
      netCashFlow: monthlyIncome - monthlyExpenses,
    },
  };
}

// Helper functions (re-exported from simulation.ts)
function calculateNetWorth(state: SimulationState): number {
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

function calculateInvestmentValue(state: SimulationState): number {
  return state.accounts.taxable.totalValue +
         state.accounts.taxDeferred.totalValue +
         state.accounts.roth.totalValue +
         state.accounts.hsa.totalValue;
}