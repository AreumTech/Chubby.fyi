import type { SimulationState } from '../types/state/simulation';
import type { Account } from '../types/state/account';
import type { Holding } from '../types/state/account';
import type { Liability } from '../types/state/liability';
import type { SimulationEvent } from '../types/events';
import { calculateNetWorth, calculateTotalDebt } from '../types/state/simulation';

export interface InvariantViolation {
  invariantName: string;
  description: string;
  expected: number | string;
  actual: number | string;
  tolerance?: number;
  severity: 'error' | 'warning';
}

export interface InvariantCheckResult {
  passed: boolean;
  violations: InvariantViolation[];
  checkedInvariants: string[];
}

const FINANCIAL_TOLERANCE = 0.01; // $0.01 tolerance for financial calculations

export function assertInvariants(
  state: SimulationState,
  previousState?: SimulationState,
  monthEvents?: SimulationEvent[]
): InvariantCheckResult {
  const violations: InvariantViolation[] = [];
  const checkedInvariants: string[] = [];

  // 1. Accounting Equation Invariants
  violations.push(...checkAccountingEquation(state));
  checkedInvariants.push('AccountingEquation', 'NetWorthCalculation');

  // 2. Account Balance Invariants
  violations.push(...checkAccountBalances(state));
  checkedInvariants.push('AccountBalances', 'HoldingValues');

  // 3. Liability and Debt Invariants
  violations.push(...checkLiabilityInvariants(state));
  checkedInvariants.push('LiabilityConsistency');

  // 4. Tax State Consistency
  if (previousState) {
    violations.push(...checkTaxStateConsistency(previousState, state));
    checkedInvariants.push('TaxStateConsistency', 'CapitalLossCarryover');
  }

  // 5. Time and Age Progression
  if (previousState) {
    violations.push(...checkTimeProgression(previousState, state));
    checkedInvariants.push('AgeProgression', 'CalendarProgression');
  }

  // 6. Cash Flow Conservation
  if (previousState && monthEvents) {
    violations.push(...checkCashFlowConservation(previousState, state, monthEvents));
    checkedInvariants.push('CashFlowConservation');
  }

  // 7. Investment Return Bounds
  if (previousState) {
    violations.push(...checkInvestmentReturnBounds(previousState, state));
    checkedInvariants.push('InvestmentReturnBounds');
  }

  // 8. Value Consistency Checks
  violations.push(...checkValueConsistency(state));
  checkedInvariants.push('ValueConsistency', 'NonNegativeValues');

  return {
    passed: violations.length === 0,
    violations,
    checkedInvariants
  };
}

function checkAccountingEquation(state: SimulationState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  try {
    // Calculate total assets manually since calculateTotalAssets doesn't exist
    const totalAssets = 
      state.accounts.taxable.totalValue +
      state.accounts.taxDeferred.totalValue +
      state.accounts.roth.totalValue +
      state.accounts.hsa.totalValue +
      state.accounts.cash.totalValue +
      state.realEstate.reduce((sum, property) => sum + property.currentValue, 0);
    
    const totalLiabilities = calculateTotalDebt(state);
    const netWorth = calculateNetWorth(state);

    // Ensure we're dealing with finite numbers
    if (!isFinite(totalAssets) || !isFinite(totalLiabilities) || !isFinite(netWorth)) {
      violations.push({
        invariantName: 'AccountingEquation',
        description: 'All financial values must be finite numbers',
        expected: 'finite numbers',
        actual: `Assets: ${totalAssets}, Liabilities: ${totalLiabilities}, NetWorth: ${netWorth}`,
        severity: 'error'
      });
      return violations;
    }

    // Calculate dynamic tolerance based on scale of numbers involved
    const scale = Math.max(Math.abs(totalAssets), Math.abs(totalLiabilities), Math.abs(netWorth), 1);
    const dynamicTolerance = Math.max(FINANCIAL_TOLERANCE, scale * 1e-10); // Scale-based tolerance

    // Assets = Liabilities + Net Worth
    const expectedBalance = totalLiabilities + netWorth;
    const assetDifference = Math.abs(totalAssets - expectedBalance);
    
    if (assetDifference > dynamicTolerance) {
      violations.push({
        invariantName: 'AccountingEquation',
        description: 'Assets must equal Liabilities + Net Worth',
        expected: expectedBalance,
        actual: totalAssets,
        tolerance: dynamicTolerance,
        severity: 'error'
      });
    }

    // Net worth calculation consistency
    const calculatedNetWorth = 
      state.accounts.taxable.totalValue +
      state.accounts.taxDeferred.totalValue +
      state.accounts.roth.totalValue +
      state.accounts.hsa.totalValue +
      state.accounts.cash.totalValue +
      state.realEstate.reduce((sum, property) => sum + property.currentValue, 0) -
      state.liabilities.reduce((sum, liability) => sum + liability.currentPrincipalBalance, 0);

    const netWorthDifference = Math.abs(calculatedNetWorth - netWorth);
    if (netWorthDifference > dynamicTolerance) {
      violations.push({
        invariantName: 'NetWorthCalculation',
        description: 'Manual net worth calculation must match utility function',
        expected: netWorth,
        actual: calculatedNetWorth,
        tolerance: dynamicTolerance,
        severity: 'error'
      });
    }
  } catch (error) {
    violations.push({
      invariantName: 'AccountingEquation',
      description: `Failed to calculate accounting equation: ${error}`,
      expected: 'No error',
      actual: 'Error occurred',
      severity: 'error'
    });
  }

  return violations;
}

function checkAccountBalances(state: SimulationState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  const accounts = [
    { name: 'taxable', account: state.accounts.taxable },
    { name: 'taxDeferred', account: state.accounts.taxDeferred },
    { name: 'roth', account: state.accounts.roth },
    { name: 'hsa', account: state.accounts.hsa },
    { name: 'cash', account: state.accounts.cash }
  ];

  accounts.forEach(({ name, account }) => {
    violations.push(...checkAccountBalance(account, name));
    account.holdings.forEach((holding, index) => {
      violations.push(...checkHoldingValues(holding, `${name}.holdings[${index}]`));
    });
  });

  return violations;
}

function checkAccountBalance(account: Account, accountName: string): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  const holdingsValue = account.holdings.reduce(
    (sum, holding) => sum + holding.currentMarketValueTotal, 0
  );
  const expectedTotal = holdingsValue + account.cash;

  if (Math.abs(account.totalValue - expectedTotal) > FINANCIAL_TOLERANCE) {
    violations.push({
      invariantName: 'AccountBalance',
      description: `${accountName} total value must equal holdings + cash`,
      expected: expectedTotal,
      actual: account.totalValue,
      tolerance: FINANCIAL_TOLERANCE,
      severity: 'error'
    });
  }

  // Cost basis consistency
  const holdingsCostBasis = account.holdings.reduce(
    (sum, holding) => sum + holding.costBasisTotal, 0
  );
  if (Math.abs(account.totalCostBasis - holdingsCostBasis) > FINANCIAL_TOLERANCE) {
    violations.push({
      invariantName: 'AccountCostBasis',
      description: `${accountName} total cost basis must equal sum of holdings cost basis`,
      expected: holdingsCostBasis,
      actual: account.totalCostBasis,
      tolerance: FINANCIAL_TOLERANCE,
      severity: 'error'
    });
  }

  // Unrealized gains consistency
  const holdingsUnrealizedGains = account.holdings.reduce(
    (sum, holding) => sum + holding.unrealizedGainLossTotal, 0
  );
  if (Math.abs(account.totalUnrealizedGains - holdingsUnrealizedGains) > FINANCIAL_TOLERANCE) {
    violations.push({
      invariantName: 'AccountUnrealizedGains',
      description: `${accountName} total unrealized gains must equal sum of holdings unrealized gains`,
      expected: holdingsUnrealizedGains,
      actual: account.totalUnrealizedGains,
      tolerance: FINANCIAL_TOLERANCE,
      severity: 'error'
    });
  }

  return violations;
}

function checkHoldingValues(holding: Holding, holdingName: string): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Market value calculation
  const expectedMarketValue = holding.quantity * holding.currentMarketPricePerUnit;
  if (Math.abs(holding.currentMarketValueTotal - expectedMarketValue) > FINANCIAL_TOLERANCE) {
    violations.push({
      invariantName: 'HoldingMarketValue',
      description: `${holdingName} market value must equal quantity × price`,
      expected: expectedMarketValue,
      actual: holding.currentMarketValueTotal,
      tolerance: FINANCIAL_TOLERANCE,
      severity: 'error'
    });
  }

  // Cost basis calculation
  const expectedCostBasis = holding.quantity * holding.purchasePricePerUnit;
  if (Math.abs(holding.costBasisTotal - expectedCostBasis) > FINANCIAL_TOLERANCE) {
    violations.push({
      invariantName: 'HoldingCostBasis',
      description: `${holdingName} cost basis must equal quantity × purchase price`,
      expected: expectedCostBasis,
      actual: holding.costBasisTotal,
      tolerance: FINANCIAL_TOLERANCE,
      severity: 'error'
    });
  }

  // Unrealized gain calculation
  const expectedUnrealizedGain = expectedMarketValue - expectedCostBasis;
  if (Math.abs(holding.unrealizedGainLossTotal - expectedUnrealizedGain) > FINANCIAL_TOLERANCE) {
    violations.push({
      invariantName: 'HoldingUnrealizedGain',
      description: `${holdingName} unrealized gain must equal market value - cost basis`,
      expected: expectedUnrealizedGain,
      actual: holding.unrealizedGainLossTotal,
      tolerance: FINANCIAL_TOLERANCE,
      severity: 'error'
    });
  }

  // Quantity must be non-negative
  if (holding.quantity < 0) {
    violations.push({
      invariantName: 'HoldingQuantity',
      description: `${holdingName} quantity cannot be negative`,
      expected: '≥ 0',
      actual: holding.quantity,
      severity: 'error'
    });
  }

  // Prices must be non-negative
  if (holding.currentMarketPricePerUnit < 0) {
    violations.push({
      invariantName: 'HoldingMarketPrice',
      description: `${holdingName} market price cannot be negative`,
      expected: '≥ 0',
      actual: holding.currentMarketPricePerUnit,
      severity: 'error'
    });
  }

  if (holding.purchasePricePerUnit < 0) {
    violations.push({
      invariantName: 'HoldingPurchasePrice',
      description: `${holdingName} purchase price cannot be negative`,
      expected: '≥ 0',
      actual: holding.purchasePricePerUnit,
      severity: 'error'
    });
  }

  return violations;
}

function checkLiabilityInvariants(state: SimulationState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  state.liabilities.forEach((liability, index) => {
    // Principal balance cannot be negative
    if (liability.currentPrincipalBalance < 0) {
      violations.push({
        invariantName: 'LiabilityPrincipalBalance',
        description: `Liability[${index}] principal balance cannot be negative`,
        expected: '≥ 0',
        actual: liability.currentPrincipalBalance,
        severity: 'error'
      });
    }

    // Interest rate should be reasonable (0% to 50% annually)
    if (liability.annualInterestRate < 0 || liability.annualInterestRate > 0.5) {
      violations.push({
        invariantName: 'LiabilityInterestRate',
        description: `Liability[${index}] interest rate should be between 0% and 50%`,
        expected: '0 to 0.5',
        actual: liability.annualInterestRate,
        severity: 'warning'
      });
    }

    // Remaining term should be non-negative
    if (liability.remainingTermInMonths < 0) {
      violations.push({
        invariantName: 'LiabilityRemainingTerm',
        description: `Liability[${index}] remaining term cannot be negative`,
        expected: '≥ 0',
        actual: liability.remainingTermInMonths,
        severity: 'error'
      });
    }

    // Monthly payment should be positive if there's remaining balance
    // Allow for paid-off or minimal balance loans to have zero payment
    const MIN_BALANCE_FOR_PAYMENT = 0.01; // Only require payment for balances > $0.01
    if (liability.currentPrincipalBalance > MIN_BALANCE_FOR_PAYMENT && liability.monthlyPayment <= 0) {
      violations.push({
        invariantName: 'LiabilityMonthlyPayment',
        description: `Liability[${index}] monthly payment must be positive when balance exists`,
        expected: '> 0',
        actual: liability.monthlyPayment,
        severity: 'error'
      });
    }
  });

  return violations;
}

function checkTaxStateConsistency(prevState: SimulationState, currentState: SimulationState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Year-to-date accumulations should reset at year boundaries
  if (currentState.currentYear > prevState.currentYear) {
    const taxState = currentState.taxState;
    
    if (taxState.ytdOrdinaryIncome !== 0) {
      violations.push({
        invariantName: 'TaxStateYearBoundary',
        description: 'YTD ordinary income should reset to 0 at year boundary',
        expected: 0,
        actual: taxState.ytdOrdinaryIncome,
        severity: 'error'
      });
    }

    if (taxState.ytdShortTermGains !== 0) {
      violations.push({
        invariantName: 'TaxStateYearBoundary',
        description: 'YTD short term gains should reset to 0 at year boundary',
        expected: 0,
        actual: taxState.ytdShortTermGains,
        severity: 'error'
      });
    }

    if (taxState.ytdLongTermGains !== 0) {
      violations.push({
        invariantName: 'TaxStateYearBoundary',
        description: 'YTD long term gains should reset to 0 at year boundary',
        expected: 0,
        actual: taxState.ytdLongTermGains,
        severity: 'error'
      });
    }

    if (taxState.ytdQualifiedDividends !== 0) {
      violations.push({
        invariantName: 'TaxStateYearBoundary',
        description: 'YTD qualified dividends should reset to 0 at year boundary',
        expected: 0,
        actual: taxState.ytdQualifiedDividends,
        severity: 'error'
      });
    }

    if (taxState.ytdPreTaxContributions !== 0) {
      violations.push({
        invariantName: 'TaxStateYearBoundary',
        description: 'YTD pre-tax contributions should reset to 0 at year boundary',
        expected: 0,
        actual: taxState.ytdPreTaxContributions,
        severity: 'error'
      });
    }

    if (taxState.ytdTaxWithholding !== 0) {
      violations.push({
        invariantName: 'TaxStateYearBoundary',
        description: 'YTD tax withholding should reset to 0 at year boundary',
        expected: 0,
        actual: taxState.ytdTaxWithholding,
        severity: 'error'
      });
    }
  }

  // Capital loss carryover should persist or decrease (not increase without losses)
  if (currentState.currentYear > prevState.currentYear && 
      currentState.taxState.capitalLossCarryover > prevState.taxState.capitalLossCarryover) {
    violations.push({
      invariantName: 'CapitalLossCarryover',
      description: 'Capital loss carryover should not increase at year boundary without new losses',
      expected: `≤ ${prevState.taxState.capitalLossCarryover}`,
      actual: currentState.taxState.capitalLossCarryover,
      severity: 'warning'
    });
  }

  return violations;
}

function checkTimeProgression(prevState: SimulationState, currentState: SimulationState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  const monthsPassed = currentState.monthOffset - prevState.monthOffset;
  
  // Age progression should be consistent with time progression
  const expectedAgeMonths = prevState.ageMonths + monthsPassed;
  if (currentState.ageMonths !== expectedAgeMonths) {
    violations.push({
      invariantName: 'AgeProgression',
      description: 'Age progression should match time progression',
      expected: expectedAgeMonths,
      actual: currentState.ageMonths,
      severity: 'error'
    });
  }

  // Calendar date progression (for single month steps)
  if (monthsPassed === 1) {
    if (prevState.currentMonth === 11) {
      // December to January - year should increment
      if (currentState.currentMonth !== 0 || currentState.currentYear !== prevState.currentYear + 1) {
        violations.push({
          invariantName: 'CalendarProgression',
          description: 'December should progress to January of next year',
          expected: `Month: 0, Year: ${prevState.currentYear + 1}`,
          actual: `Month: ${currentState.currentMonth}, Year: ${currentState.currentYear}`,
          severity: 'error'
        });
      }
    } else {
      // Normal month progression
      if (currentState.currentMonth !== prevState.currentMonth + 1 || 
          currentState.currentYear !== prevState.currentYear) {
        violations.push({
          invariantName: 'CalendarProgression',
          description: 'Month should increment normally within year',
          expected: `Month: ${prevState.currentMonth + 1}, Year: ${prevState.currentYear}`,
          actual: `Month: ${currentState.currentMonth}, Year: ${currentState.currentYear}`,
          severity: 'error'
        });
      }
    }
  }

  return violations;
}

function checkCashFlowConservation(
  prevState: SimulationState, 
  currentState: SimulationState, 
  monthEvents: SimulationEvent[]
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  try {
    const prevCash = getTotalCash(prevState);
    const currentCash = getTotalCash(currentState);
    
    // Calculate total net worth changes to understand context
    const prevNetWorth = calculateNetWorth(prevState);
    const currentNetWorth = calculateNetWorth(currentState);
    const netWorthChange = Math.abs(currentNetWorth - prevNetWorth);
    
    // Dynamic tolerance based on scale and activity level
    const scale = Math.max(prevCash, currentCash, 1);
    const baseTolerance = Math.max(1000, scale * 0.1); // $1000 or 10% of cash, whichever is larger
    const activityTolerance = netWorthChange * 0.5; // Allow tolerance based on portfolio activity
    const dynamicTolerance = Math.max(baseTolerance, activityTolerance);
    
    const cashChange = Math.abs(currentCash - prevCash);
    
    if (cashChange > dynamicTolerance) {
      violations.push({
        invariantName: 'CashFlowConservation',
        description: 'Large unexplained change in total cash relative to portfolio activity',
        expected: `${prevCash} ± ${dynamicTolerance.toFixed(2)}`,
        actual: currentCash,
        tolerance: dynamicTolerance,
        severity: 'warning'
      });
    }
  } catch (error) {
    violations.push({
      invariantName: 'CashFlowConservation',
      description: `Failed to check cash flow conservation: ${error}`,
      expected: 'No error',
      actual: 'Error occurred',
      severity: 'warning'
    });
  }

  return violations;
}

function checkInvestmentReturnBounds(prevState: SimulationState, currentState: SimulationState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  try {
    const prevInvestmentValue = calculateInvestmentValue(prevState);
    const currentInvestmentValue = calculateInvestmentValue(currentState);
    
    if (prevInvestmentValue > 0) {
      const monthlyReturn = (currentInvestmentValue - prevInvestmentValue) / prevInvestmentValue;
      
      // Monthly returns should generally be between -50% and +50% (extreme bounds)
      if (monthlyReturn < -0.5 || monthlyReturn > 0.5) {
        violations.push({
          invariantName: 'InvestmentReturnBounds',
          description: 'Monthly investment return is outside reasonable bounds',
          expected: '-50% to +50%',
          actual: `${(monthlyReturn * 100).toFixed(2)}%`,
          severity: 'warning'
        });
      }
    }
  } catch (error) {
    violations.push({
      invariantName: 'InvestmentReturnBounds',
      description: `Failed to check investment return bounds: ${error}`,
      expected: 'No error',
      actual: 'Error occurred',
      severity: 'warning'
    });
  }

  return violations;
}

function checkValueConsistency(state: SimulationState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Check for NaN or Infinity values
  const checkValue = (value: number, name: string, context: string) => {
    if (isNaN(value)) {
      violations.push({
        invariantName: 'ValueConsistency',
        description: `${name} in ${context} cannot be NaN`,
        expected: 'finite number',
        actual: 'NaN',
        severity: 'error'
      });
    }
    
    if (!isFinite(value)) {
      violations.push({
        invariantName: 'ValueConsistency',
        description: `${name} in ${context} cannot be Infinity`,
        expected: 'finite number',
        actual: value,
        severity: 'error'
      });
    }
  };

  // Check account values
  Object.entries(state.accounts).forEach(([accountName, account]) => {
    checkValue(account.cash, 'cash', accountName);
    checkValue(account.totalValue, 'totalValue', accountName);
    checkValue(account.totalCostBasis, 'totalCostBasis', accountName);
    checkValue(account.totalUnrealizedGains, 'totalUnrealizedGains', accountName);
    
    account.holdings.forEach((holding, index) => {
      checkValue(holding.quantity, 'quantity', `${accountName}.holdings[${index}]`);
      checkValue(holding.currentMarketValueTotal, 'currentMarketValueTotal', `${accountName}.holdings[${index}]`);
      checkValue(holding.costBasisTotal, 'costBasisTotal', `${accountName}.holdings[${index}]`);
      checkValue(holding.unrealizedGainLossTotal, 'unrealizedGainLossTotal', `${accountName}.holdings[${index}]`);
    });
  });

  // Check liability values
  state.liabilities.forEach((liability, index) => {
    checkValue(liability.currentPrincipalBalance, 'currentPrincipalBalance', `liabilities[${index}]`);
    checkValue(liability.monthlyPayment, 'monthlyPayment', `liabilities[${index}]`);
    checkValue(liability.annualInterestRate, 'annualInterestRate', `liabilities[${index}]`);
  });

  // Check tax state values
  Object.entries(state.taxState).forEach(([key, value]) => {
    if (typeof value === 'number') {
      checkValue(value, key, 'taxState');
    }
  });

  return violations;
}

// Helper functions
function getTotalCash(state: SimulationState): number {
  return Object.values(state.accounts).reduce((sum, account) => sum + account.cash, 0);
}

function calculateInvestmentValue(state: SimulationState): number {
  return Object.values(state.accounts).reduce((sum, account) => {
    return sum + account.holdings.reduce((holdingSum, holding) => {
      return holdingSum + holding.currentMarketValueTotal;
    }, 0);
  }, 0) + state.realEstate.reduce((sum, property) => sum + property.currentValue, 0);
}

// Export for testing
export const InvariantTestingInternal = {
  checkAccountingEquation,
  checkAccountBalances,
  checkLiabilityInvariants,
  checkTaxStateConsistency,
  checkTimeProgression,
  checkCashFlowConservation,
  checkInvestmentReturnBounds,
  checkValueConsistency,
  FINANCIAL_TOLERANCE
};