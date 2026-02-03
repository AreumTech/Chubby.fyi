import * as fc from 'fast-check';
import type { 
  SimulationState, 
  AccountType, 
  FilingStatus 
} from '../types/state/simulation';
import type { Account, Holding, AssetClass } from '../types/state/account';
import type { Liability } from '../types/state/liability';
import type { 
  FinancialEvent, 
  EventType, 
  IncomeEvent,
  ExpenseEvent,
  ContributionEvent,
  RebalanceEvent
} from '../types/events';
import type { RealEstateAsset } from '../types/state/simulation';

// Arbitraries for generating random but valid simulation data

// Basic financial arbitraries - with safe minimum values to prevent subnormal numbers
const MIN_FINANCIAL_VALUE = 0.01; // Minimum $0.01 to avoid floating point precision issues
const MIN_PERCENTAGE = 0.0001; // Minimum 0.01% to avoid subnormal values
const MIN_PRICE = 0.01; // Minimum $0.01 per unit

export const moneyAmount = fc.float({ 
  min: 0, 
  max: Math.fround(1_000_000), 
  noNaN: true,
  noDefaultInfinity: true
}).map(x => x < MIN_FINANCIAL_VALUE && x > 0 ? MIN_FINANCIAL_VALUE : x);

export const percentage = fc.float({ 
  min: 0, 
  max: 1, 
  noNaN: true,
  noDefaultInfinity: true  
}).map(x => x < MIN_PERCENTAGE && x > 0 ? MIN_PERCENTAGE : x);

export const interestRate = fc.float({ 
  min: 0, 
  max: Math.fround(0.5), 
  noNaN: true,
  noDefaultInfinity: true
}).map(x => x < MIN_PERCENTAGE && x > 0 ? MIN_PERCENTAGE : x); // 0-50% annual

export const quantity = fc.float({ 
  min: 0, 
  max: Math.fround(10_000), 
  noNaN: true,
  noDefaultInfinity: true
}).map(x => x < MIN_FINANCIAL_VALUE && x > 0 ? MIN_FINANCIAL_VALUE : x);

export const pricePerUnit = fc.float({ 
  min: Math.fround(MIN_PRICE), 
  max: Math.fround(10_000), 
  noNaN: true,
  noDefaultInfinity: true
});

// Age and time arbitraries
export const ageInMonths = fc.integer({ min: 18 * 12, max: 100 * 12 }); // 18-100 years
export const monthOffset = fc.integer({ min: 0, max: 50 * 12 }); // 0-50 years
export const currentYear = fc.integer({ min: 2024, max: 2074 });
export const currentMonth = fc.integer({ min: 0, max: 11 });

// Enum arbitraries
export const assetClassArbitrary = fc.constantFrom(
  'us_stock_market', 'international_stock_market', 'emerging_market_stock',
  'us_bond_market', 'international_bond_market', 'real_estate',
  'commodities', 'cash'
);

export const filingStatusArbitrary = fc.constantFrom(
  'single' as FilingStatus,
  'married_filing_jointly' as FilingStatus,
  'married_filing_separately' as FilingStatus,
  'head_of_household' as FilingStatus
);

// Complex type arbitraries
export const holdingArbitrary: fc.Arbitrary<Holding> = fc.record({
  assetClass: assetClassArbitrary,
  quantity: quantity,
  purchasePricePerUnit: pricePerUnit,
  currentMarketPricePerUnit: pricePerUnit,
  purchaseDate: fc.date({ min: new Date('2000-01-01'), max: new Date() }),
  isLongTerm: fc.boolean(),
  dividendYield: percentage,
  expenseRatio: fc.float({ min: 0, max: Math.fround(0.049), noNaN: true }), // 0-4.9% expense ratio
}).map(holding => ({
  ...holding,
  costBasisTotal: holding.quantity * holding.purchasePricePerUnit,
  currentMarketValueTotal: holding.quantity * holding.currentMarketPricePerUnit,
  unrealizedGainLossTotal: (holding.quantity * holding.currentMarketPricePerUnit) - (holding.quantity * holding.purchasePricePerUnit)
}));

export const accountArbitrary: fc.Arbitrary<Account> = fc.record({
  cash: moneyAmount,
  holdings: fc.array(holdingArbitrary, { minLength: 0, maxLength: 20 })
}).map(account => {
  const totalValue = account.cash + account.holdings.reduce((sum, h) => sum + h.currentMarketValueTotal, 0);
  const totalCostBasis = account.holdings.reduce((sum, h) => sum + h.costBasisTotal, 0);
  const totalUnrealizedGains = account.holdings.reduce((sum, h) => sum + h.unrealizedGainLossTotal, 0);
  
  return {
    ...account,
    totalValue,
    totalCostBasis,
    totalUnrealizedGains
  };
});

export const liabilityArbitrary: fc.Arbitrary<Liability> = fc.record({
  originalPrincipalAmount: moneyAmount,
  currentPrincipalBalance: moneyAmount,
  annualInterestRate: interestRate,
  remainingTermInMonths: fc.integer({ min: 0, max: 360 }), // 0-30 years
  monthlyPayment: fc.float({ min: 0, max: Math.fround(50_000), noNaN: true, noDefaultInfinity: true }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom('mortgage', 'auto_loan', 'student_loan', 'credit_card', 'personal_loan', 'other')
}).map(liability => {
  // Ensure no subnormal numbers and logical consistency
  const originalAmount = liability.originalPrincipalAmount < MIN_FINANCIAL_VALUE && liability.originalPrincipalAmount > 0 
    ? MIN_FINANCIAL_VALUE : liability.originalPrincipalAmount;
  const currentBalance = Math.min(liability.currentPrincipalBalance, originalAmount);
  const monthlyPayment = liability.monthlyPayment < MIN_FINANCIAL_VALUE && liability.monthlyPayment > 0 
    ? MIN_FINANCIAL_VALUE : liability.monthlyPayment;
    
  return {
    ...liability,
    originalPrincipalAmount: originalAmount,
    currentPrincipalBalance: currentBalance,
    monthlyPayment: monthlyPayment
  };
});

export const realEstateArbitrary: fc.Arbitrary<RealEstateAsset> = fc.record({
  currentValue: moneyAmount,
  originalPurchasePrice: moneyAmount,
  purchaseDate: fc.date({ min: new Date('1990-01-01'), max: new Date() }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  address: fc.string({ minLength: 1, maxLength: 100 }),
  isRental: fc.boolean(),
  monthlyRentalIncome: fc.float({ min: 0, max: Math.fround(20_000), noNaN: true })
});

export const taxStateArbitrary = fc.record({
  capitalLossCarryover: fc.float({ min: 0, max: Math.fround(100_000), noNaN: true }),
  ytdOrdinaryIncome: fc.float({ min: 0, max: Math.fround(1_000_000), noNaN: true }),
  ytdShortTermGains: fc.float({ min: Math.fround(-100_000), max: Math.fround(500_000), noNaN: true }),
  ytdLongTermGains: fc.float({ min: Math.fround(-100_000), max: Math.fround(500_000), noNaN: true }),
  ytdQualifiedDividends: fc.float({ min: 0, max: Math.fround(100_000), noNaN: true }),
  ytdPreTaxContributions: fc.float({ min: 0, max: Math.fround(100_000), noNaN: true }),
  ytdTaxWithholding: fc.float({ min: 0, max: Math.fround(200_000), noNaN: true }),
  filingStatus: filingStatusArbitrary,
  numberOfDependents: fc.integer({ min: 0, max: 10 })
});

export const simulationStateArbitrary: fc.Arbitrary<SimulationState> = fc.record({
  accounts: fc.record({
    taxable: accountArbitrary,
    taxDeferred: accountArbitrary,
    roth: accountArbitrary,
    hsa: accountArbitrary,
    cash: accountArbitrary
  }),
  liabilities: fc.array(liabilityArbitrary, { minLength: 0, maxLength: 10 }),
  realEstate: fc.array(realEstateArbitrary, { minLength: 0, maxLength: 5 }),
  taxState: taxStateArbitrary,
  ageMonths: ageInMonths,
  isRetired: fc.boolean(),
  currentYear: currentYear,
  currentMonth: currentMonth,
  monthOffset: monthOffset
});

// Event generation arbitraries
export const incomeEventArbitrary: fc.Arbitrary<IncomeEvent> = fc.record({
  type: fc.constant('income' as EventType),
  month: fc.integer({ min: 1, max: 12 }),
  amount: moneyAmount,
  source: fc.constantFrom('salary', 'bonus', 'freelance', 'rental', 'investment', 'other'),
  isRecurring: fc.boolean(),
  taxable: fc.boolean(),
  federalTaxWithholding: fc.float({ min: 0, max: Math.fround(0.4), noNaN: true }),
  stateTaxWithholding: fc.float({ min: 0, max: Math.fround(0.15), noNaN: true }),
  socialSecurityTaxWithholding: fc.float({ min: 0, max: Math.fround(0.062), noNaN: true }),
  medicareTaxWithholding: fc.float({ min: 0, max: Math.fround(0.0145), noNaN: true })
});

export const expenseEventArbitrary: fc.Arbitrary<ExpenseEvent> = fc.record({
  type: fc.constant('expense' as EventType),
  month: fc.integer({ min: 1, max: 12 }),
  amount: moneyAmount,
  category: fc.constantFrom('housing', 'food', 'transportation', 'healthcare', 'entertainment', 'other'),
  isRecurring: fc.boolean(),
  taxDeductible: fc.boolean()
});

export const contributionEventArbitrary: fc.Arbitrary<ContributionEvent> = fc.record({
  type: fc.constant('contribution' as EventType),
  month: fc.integer({ min: 1, max: 12 }),
  amount: moneyAmount,
  accountType: fc.constantFrom('taxable', 'tax_deferred', 'roth', 'hsa') as fc.Arbitrary<AccountType>,
  assetAllocation: fc.record({
    us_stock_market: percentage,
    international_stock_market: percentage,
    emerging_market_stock: percentage,
    us_bond_market: percentage,
    international_bond_market: percentage,
    real_estate: percentage,
    commodities: percentage,
    cash: percentage
  })
});

export const rebalanceEventArbitrary: fc.Arbitrary<RebalanceEvent> = fc.record({
  type: fc.constant('rebalance' as EventType),
  month: fc.integer({ min: 1, max: 12 }),
  accountType: fc.constantFrom('taxable', 'tax_deferred', 'roth', 'hsa') as fc.Arbitrary<AccountType>,
  targetAllocation: fc.record({
    us_stock_market: percentage,
    international_stock_market: percentage,
    emerging_market_stock: percentage,
    us_bond_market: percentage,
    international_bond_market: percentage,
    real_estate: percentage,
    commodities: percentage,
    cash: percentage
  })
});

export const financialEventArbitrary: fc.Arbitrary<FinancialEvent> = fc.oneof(
  incomeEventArbitrary,
  expenseEventArbitrary,
  contributionEventArbitrary,
  rebalanceEventArbitrary
);

// Event ledger generation
export const eventLedgerArbitrary = fc.array(financialEventArbitrary, { 
  minLength: 1, 
  maxLength: 100 
}).map(events => {
  // Sort events by month to maintain temporal consistency
  return events.sort((a, b) => a.month - b.month);
});

// Constrained arbitraries for specific testing scenarios

// Generate valid simulation states (all invariants should pass)
export const validSimulationStateArbitrary = simulationStateArbitrary.map(state => {
  // Ensure age and time consistency
  const totalMonths = state.ageMonths;
  const yearsSinceStart = Math.floor(state.monthOffset / 12);
  const monthsInCurrentYear = state.monthOffset % 12;
  
  return {
    ...state,
    currentYear: 2024 + yearsSinceStart,
    currentMonth: monthsInCurrentYear,
    ageMonths: totalMonths
  };
});

// Generate problematic states that might reveal edge cases
export const edgeCaseSimulationStateArbitrary = fc.oneof(
  // Zero values scenario
  simulationStateArbitrary.map(state => ({
    ...state,
    accounts: {
      taxable: { ...state.accounts.taxable, cash: 0, totalValue: 0 },
      taxDeferred: { ...state.accounts.taxDeferred, cash: 0, totalValue: 0 },
      roth: { ...state.accounts.roth, cash: 0, totalValue: 0 },
      hsa: { ...state.accounts.hsa, cash: 0, totalValue: 0 },
      cash: { ...state.accounts.cash, cash: 0, totalValue: 0 }
    }
  })),
  
  // High debt scenario
  simulationStateArbitrary.map(state => ({
    ...state,
    liabilities: [
      {
        originalPrincipalAmount: 500_000,
        currentPrincipalBalance: 450_000,
        annualInterestRate: 0.07,
        remainingTermInMonths: 300,
        monthlyPayment: 3_000,
        name: 'High Debt Scenario',
        type: 'mortgage' as const
      }
    ]
  })),
  
  // Very high income scenario
  simulationStateArbitrary.map(state => ({
    ...state,
    taxState: {
      ...state.taxState,
      ytdOrdinaryIncome: 1_000_000,
      ytdShortTermGains: 100_000,
      ytdLongTermGains: 200_000
    }
  })),
  
  // Retirement age scenario
  simulationStateArbitrary.map(state => ({
    ...state,
    ageMonths: 65 * 12, // 65 years old
    isRetired: true
  }))
);

// Generate temporal sequences for testing state transitions
export const stateSequenceArbitrary = fc.array(
  validSimulationStateArbitrary,
  { minLength: 2, maxLength: 12 }
).map(states => {
  // Ensure proper temporal progression
  return states.map((state, index) => ({
    ...state,
    monthOffset: index,
    currentMonth: index % 12,
    currentYear: 2024 + Math.floor(index / 12),
    ageMonths: (states[0]?.ageMonths || 25 * 12) + index
  }));
});

// Utility functions for property-based testing

export function generateFuzzTestSuite<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  testFunction: (input: T) => boolean | void,
  options: {
    numRuns?: number;
    seed?: number;
    verbose?: boolean;
  } = {}
) {
  const { numRuns = 100, seed, verbose = false } = options;
  
  return {
    name,
    run: () => {
      try {
        fc.assert(
          fc.property(arbitrary, testFunction),
          { 
            numRuns,
            seed,
            verbose,
            // Stop on first failure for debugging
            endOnFailure: true
          }
        );
        return { passed: true, runs: numRuns };
      } catch (error) {
        return { 
          passed: false, 
          error: error instanceof Error ? error.message : String(error),
          runs: numRuns 
        };
      }
    }
  };
}

// Pre-built fuzz test suites

export const simulationStateFuzzTests = {
  // Test that simulation states maintain basic invariants
  basicInvariants: generateFuzzTestSuite(
    'Simulation State Basic Invariants',
    validSimulationStateArbitrary,
    (state) => {
      // These should never throw or return invalid values
      const netWorth = state.accounts.taxable.totalValue + 
                      state.accounts.taxDeferred.totalValue + 
                      state.accounts.roth.totalValue + 
                      state.accounts.hsa.totalValue + 
                      state.accounts.cash.totalValue;
      
      // Net worth should be finite
      if (!isFinite(netWorth)) {
        throw new Error(`Net worth is not finite: ${netWorth}`);
      }
      
      // Age should be reasonable
      if (state.ageMonths < 0 || state.ageMonths > 120 * 12) {
        throw new Error(`Age is unreasonable: ${state.ageMonths} months`);
      }
      
      // Month should be valid
      if (state.currentMonth < 0 || state.currentMonth > 11) {
        throw new Error(`Invalid month: ${state.currentMonth}`);
      }
      
      return true;
    }
  ),

  // Test edge cases don't crash the system
  edgeCaseHandling: generateFuzzTestSuite(
    'Edge Case Handling',
    edgeCaseSimulationStateArbitrary,
    (state) => {
      // Should handle edge cases without crashing
      try {
        const totalAssets = Object.values(state.accounts).reduce(
          (sum, account) => sum + account.totalValue, 0
        ) + state.realEstate.reduce((sum, property) => sum + property.currentValue, 0);
        
        const totalLiabilities = state.liabilities.reduce(
          (sum, liability) => sum + liability.currentPrincipalBalance, 0
        );
        
        // Should not produce NaN or Infinity
        if (!isFinite(totalAssets) || !isFinite(totalLiabilities)) {
          throw new Error('Financial calculations produced non-finite values');
        }
        
        return true;
      } catch (error) {
        throw new Error(`Edge case handling failed: ${error}`);
      }
    }
  ),

  // Test temporal consistency across state sequences
  temporalConsistency: generateFuzzTestSuite(
    'Temporal Consistency',
    stateSequenceArbitrary,
    (states) => {
      for (let i = 1; i < states.length; i++) {
        const prev = states[i - 1];
        const current = states[i];
        
        // Age should progress
        if (current.ageMonths !== prev.ageMonths + 1) {
          throw new Error(`Age progression inconsistent: ${prev.ageMonths} -> ${current.ageMonths}`);
        }
        
        // Month offset should progress
        if (current.monthOffset !== prev.monthOffset + 1) {
          throw new Error(`Month offset inconsistent: ${prev.monthOffset} -> ${current.monthOffset}`);
        }
        
        // Calendar should progress correctly
        if (prev.currentMonth === 11) {
          if (current.currentMonth !== 0 || current.currentYear !== prev.currentYear + 1) {
            throw new Error('Year transition failed');
          }
        } else {
          if (current.currentMonth !== prev.currentMonth + 1 || current.currentYear !== prev.currentYear) {
            throw new Error('Month progression failed');
          }
        }
      }
      
      return true;
    }
  )
};

export const eventLedgerFuzzTests = {
  // Test that event ledgers can be processed without errors
  eventProcessing: generateFuzzTestSuite(
    'Event Ledger Processing',
    eventLedgerArbitrary,
    (events) => {
      // Events should be temporally ordered
      for (let i = 1; i < events.length; i++) {
        if (events[i].month < events[i - 1].month) {
          throw new Error('Events not temporally ordered');
        }
      }
      
      // All events should have valid months
      for (const event of events) {
        if (event.month < 1 || event.month > 12) {
          throw new Error(`Invalid event month: ${event.month}`);
        }
      }
      
      // All amounts should be finite
      for (const event of events) {
        if ('amount' in event && !isFinite(event.amount)) {
          throw new Error(`Event amount not finite: ${event.amount}`);
        }
      }
      
      return true;
    }
  )
};

// Export all fuzz test suites
export const allFuzzTests = {
  ...simulationStateFuzzTests,
  ...eventLedgerFuzzTests
};