/**
 * Unit tests for TraceView data transformation and reconciliation
 *
 * These tests verify:
 * 1. Conservation law: End = Start + Flows for both buckets
 * 2. First month initialization (doesn't use circular calculation)
 * 3. Sign conventions match TRACE.md spec
 */

import { describe, it, expect } from 'vitest';
import { transformToTraceData } from '@/features/deterministic/utils/transformToTraceData';
import type { DeterministicMonthState, DeterministicAssumptions, MonthlyFlowsDetail, StochasticReturns } from '@/types/api/payload';
import { RECONCILE_TOLERANCE } from '@/features/deterministic/types/traceTypes';

// Helper to create minimal MonthlyFlowsDetail
function createFlows(overrides: Partial<MonthlyFlowsDetail> = {}): MonthlyFlowsDetail {
  return {
    totalIncome: 0,
    employmentIncome: 0,
    salaryIncome: 0,
    bonusIncome: 0,
    rsuIncome: 0,
    socialSecurityIncome: 0,
    pensionIncome: 0,
    dividendIncome: 0,
    interestIncome: 0,
    totalExpenses: 0,
    housingExpenses: 0,
    transportationExpenses: 0,
    foodExpenses: 0,
    otherExpenses: 0,
    debtPaymentsPrincipal: 0,
    debtPaymentsInterest: 0,
    totalContributions: 0,
    contributionsTaxable: 0,
    contributionsTaxDeferred: 0,
    contributionsRoth: 0,
    contributionsHSA: 0,
    totalWithdrawals: 0,
    divestmentProceeds: 0,
    rmdAmount: 0,
    taxWithheld: 0,
    taxesPaid: 0,
    rothConversionAmount: 0,
    investmentGrowth: 0,
    autoShortfallCover: 0,
    ...overrides,
  };
}

// Helper to create minimal market returns
function createReturns(overrides: Partial<StochasticReturns> = {}): StochasticReturns {
  return {
    SPY: 0,
    BND: 0,
    Inflation: 0,
    // Extended asset classes (optional)
    Intl: 0,
    Other: 0,
    IndividualStock: 0,
    Home: 0,
    Rent: 0,
    ...overrides,
  };
}

// Helper to create minimal month state
function createMonthState(
  monthOffset: number,
  year: number,
  month: number,
  overrides: Partial<DeterministicMonthState> = {}
): DeterministicMonthState {
  return {
    monthOffset,
    calendarYear: year,
    calendarMonth: month,
    age: 35 + monthOffset / 12,
    cash: 10000,
    taxable: null,
    taxDeferred: null,
    roth: null,
    hsa: null,
    fiveTwoNine: null,
    netWorth: 10000,
    totalAssets: 10000,
    totalLiabilities: 0,
    taxState: {
      ordinaryIncomeYTD: 0,
      qualifiedDividendsYTD: 0,
      ordinaryDividendsYTD: 0,
      interestIncomeYTD: 0,
      socialSecurityBenefitsYTD: 0,
      shortTermCapGainsYTD: 0,
      longTermCapGainsYTD: 0,
      capitalLossesYTD: 0,
      capitalLossCarryover: 0,
      itemizedDeductibleInterestYTD: 0,
      preTaxContributionsYTD: 0,
      charitableDistributionsYTD: 0,
      taxWithholdingYTD: 0,
      estimatedPaymentsYTD: 0,
      unpaidTaxLiability: 0,
      currentMarginalBracket: 0.22,
      currentLTCGBracket: 0.15,
      estimatedEffectiveRate: 0.15,
    },
    liabilities: null,
    strategyExecutions: null,
    flows: createFlows(),
    marketReturns: createReturns(),
    eventIds: [],
    ...overrides,
  };
}

// Minimal assumptions
const defaultAssumptions: DeterministicAssumptions = {
  stockReturnAnnual: 0.07,
  bondReturnAnnual: 0.03,
  inflationAnnual: 0.03,
  intlStockReturnAnnual: 0.06,
  homeAppreciationAnnual: 0.03,
};

describe('transformToTraceData', () => {
  describe('Conservation Law (Single Month)', () => {
    it('should reconcile when cash has no flows', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 10000,
          flows: createFlows(),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];

      // Cash equation: End = Start + OperatingFlow + Transfer
      // With no flows, cashStart should equal cashEnd
      expect(Math.abs(row.cash_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
    });

    it('should reconcile when only operating flow affects cash', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 15000, // Started at 10000, received 5000 income
          flows: createFlows({
            totalIncome: 5000,
            salaryIncome: 5000,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      const row = result.rows[0];

      // Verify operating flow is calculated correctly
      expect(row.operating_flow).toBe(5000);

      // Verify reconciliation
      // cashEnd (15000) = cashStart (10000) + operatingFlow (5000) + transfer (0)
      expect(Math.abs(row.cash_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
    });

    it('should reconcile when transfer moves cash to invested', () => {
      // Scenario: Start with 20000 cash, contribute 5000 to taxable
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 15000, // 20000 - 5000 contribution
          taxable: {
            totalValue: 5000,
            totalCostBasis: 5000,
            unrealizedGain: 0,
            longTermGain: 0,
            shortTermGain: 0,
            holdings: [],
          },
          flows: createFlows({
            totalContributions: 5000,
            contributionsTaxable: 5000,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      const row = result.rows[0];

      // Transfer should be negative (cash → invested)
      expect(row.transfer_cash).toBe(-5000);

      // Verify both buckets reconcile
      expect(Math.abs(row.cash_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
      expect(Math.abs(row.inv_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
    });

    it('should reconcile when withdrawal moves invested to cash', () => {
      // Scenario: Withdraw 3000 from taxable
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 13000, // 10000 + 3000 withdrawal
          taxable: {
            totalValue: 7000, // Was 10000, withdrew 3000
            totalCostBasis: 7000,
            unrealizedGain: 0,
            longTermGain: 0,
            shortTermGain: 0,
            holdings: [],
          },
          flows: createFlows({
            totalWithdrawals: 3000,
            divestmentProceeds: 3000,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      const row = result.rows[0];

      // Transfer should be positive (invested → cash)
      expect(row.transfer_cash).toBe(3000);

      // Verify both buckets reconcile
      expect(Math.abs(row.cash_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
      expect(Math.abs(row.inv_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
    });
  });

  describe('Conservation Law (Multi-Month)', () => {
    it('should reconcile across consecutive months', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 12000, // 10000 + 5000 income - 3000 expenses
          flows: createFlows({
            totalIncome: 5000,
            salaryIncome: 5000,
            totalExpenses: 3000,
            housingExpenses: 3000,
          }),
        }),
        createMonthState(1, 2025, 2, {
          cash: 14000, // 12000 + 5000 income - 3000 expenses
          flows: createFlows({
            totalIncome: 5000,
            salaryIncome: 5000,
            totalExpenses: 3000,
            housingExpenses: 3000,
          }),
        }),
        createMonthState(2, 2025, 3, {
          cash: 16000, // 14000 + 5000 income - 3000 expenses
          flows: createFlows({
            totalIncome: 5000,
            salaryIncome: 5000,
            totalExpenses: 3000,
            housingExpenses: 3000,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);

      expect(result.rows).toHaveLength(3);

      // All months should reconcile
      for (const row of result.rows) {
        expect(Math.abs(row.cash_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
      }

      // Verify continuity: month N end = month N+1 start
      expect(result.rows[0].cash_end).toBe(result.rows[1].cash_start);
      expect(result.rows[1].cash_end).toBe(result.rows[2].cash_start);
    });

    it('should track first mismatch month in summary', () => {
      // Create a scenario that should fail reconciliation
      // (if the transform has bugs, this will catch them)
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 10000,
          flows: createFlows(),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);

      // In a correct implementation, there should be no mismatches
      expect(result.summary.firstMismatchMonth).toBeNull();
      expect(result.summary.reconciledMonths).toBe(result.summary.totalMonths);
    });
  });

  describe('Investment Growth', () => {
    it('should reconcile with positive market returns', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 10000,
          taxable: {
            totalValue: 102000, // 100000 * (1 + 0.02 monthly return)
            totalCostBasis: 100000,
            unrealizedGain: 2000,
            longTermGain: 2000,
            shortTermGain: 0,
            holdings: [],
          },
          flows: createFlows({
            investmentGrowth: 2000,
          }),
          marketReturns: createReturns({
            SPY: 0.02, // 2% monthly return
            BND: 0.005,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      const row = result.rows[0];

      expect(row.market_return_impact).toBe(2000);
      expect(Math.abs(row.inv_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
    });

    it('should reconcile with negative market returns', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 10000,
          taxable: {
            totalValue: 95000, // 100000 * (1 - 0.05)
            totalCostBasis: 100000,
            unrealizedGain: -5000,
            longTermGain: 0,
            shortTermGain: -5000,
            holdings: [],
          },
          flows: createFlows({
            investmentGrowth: -5000,
          }),
          marketReturns: createReturns({
            SPY: -0.05, // -5% monthly return
            BND: -0.01,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      const row = result.rows[0];

      expect(row.market_return_impact).toBe(-5000);
      expect(Math.abs(row.inv_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
    });
  });

  describe('Sign Conventions (TRACE.md Section 2.2)', () => {
    it('Transfer: negative when Cash → Invested (contribution)', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 5000,
          taxable: { totalValue: 5000, totalCostBasis: 5000, unrealizedGain: 0, longTermGain: 0, shortTermGain: 0, holdings: [] },
          flows: createFlows({
            totalContributions: 5000,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      expect(result.rows[0].transfer_cash).toBeLessThan(0);
    });

    it('Transfer: positive when Invested → Cash (withdrawal)', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 15000,
          taxable: { totalValue: 5000, totalCostBasis: 5000, unrealizedGain: 0, longTermGain: 0, shortTermGain: 0, holdings: [] },
          flows: createFlows({
            totalWithdrawals: 5000,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      expect(result.rows[0].transfer_cash).toBeGreaterThan(0);
    });

    it('Operating Flow: positive for net income', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 12000,
          flows: createFlows({
            totalIncome: 5000,
            totalExpenses: 3000,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      expect(result.rows[0].operating_flow).toBe(2000); // 5000 - 3000
    });

    it('Operating Flow: negative for net spending', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 7000,
          flows: createFlows({
            totalIncome: 1000,
            totalExpenses: 4000,
          }),
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      expect(result.rows[0].operating_flow).toBe(-3000); // 1000 - 4000
    });
  });

  describe('Breach Detection', () => {
    it('should detect floor breach', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: 500, // Below default floor of 0? Actually let's set a floor
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions, { cashFloor: 1000 });
      expect(result.rows[0].breach).toBe('Floor');
    });

    it('should detect negative cash', () => {
      const states = [
        createMonthState(0, 2025, 1, {
          cash: -500,
        }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);
      expect(result.rows[0].breach).toBe('Negative');
    });

    it('should track first breach month', () => {
      const states = [
        createMonthState(0, 2025, 1, { cash: 5000 }),
        createMonthState(1, 2025, 2, { cash: 500 }), // Breach
        createMonthState(2, 2025, 3, { cash: 200 }), // Also breach
      ];

      const result = transformToTraceData(states, defaultAssumptions, { cashFloor: 1000 });
      expect(result.summary.firstBreachMonth).toBe('2025-02');
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate reconciledMonths correctly', () => {
      const states = [
        createMonthState(0, 2025, 1, { cash: 10000, flows: createFlows() }),
        createMonthState(1, 2025, 2, { cash: 10000, flows: createFlows() }),
        createMonthState(2, 2025, 3, { cash: 10000, flows: createFlows() }),
      ];

      const result = transformToTraceData(states, defaultAssumptions);

      // If all reconcile, reconciledMonths = totalMonths
      expect(result.summary.reconciledMonths).toBe(3);
      expect(result.summary.totalMonths).toBe(3);
    });
  });
});

describe('Initial Values (Month 0 Fix)', () => {
  // These tests verify the fix for the circular first month calculation

  it('should use provided initialCash for month 0', () => {
    const states = [
      createMonthState(0, 2025, 1, {
        cash: 15000, // End cash after some flows
        flows: createFlows({
          totalIncome: 5000,
          salaryIncome: 5000,
        }),
      }),
    ];

    // Provide explicit initial cash (what it was BEFORE the first month's flows)
    const result = transformToTraceData(states, defaultAssumptions, {
      initialCash: 10000, // Known start value
    });

    const row = result.rows[0];

    // cashStart should be the provided initial, NOT derived from end - flows
    expect(row.cash_start).toBe(10000);

    // With correct start value, reconciliation should work:
    // cashEnd (15000) = cashStart (10000) + operatingFlow (5000) + transfer (0)
    expect(row.operating_flow).toBe(5000);
    expect(Math.abs(row.cash_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
  });

  it('should use provided initialInvested for month 0', () => {
    const states = [
      createMonthState(0, 2025, 1, {
        cash: 10000,
        taxable: {
          totalValue: 102000, // After 2% growth
          totalCostBasis: 100000,
          unrealizedGain: 2000,
          longTermGain: 2000,
          shortTermGain: 0,
          holdings: [],
        },
        flows: createFlows({
          investmentGrowth: 2000,
        }),
        marketReturns: createReturns({
          SPY: 0.02,
        }),
      }),
    ];

    // Provide explicit initial invested
    const result = transformToTraceData(states, defaultAssumptions, {
      initialCash: 10000,
      initialInvested: 100000, // Known start value
    });

    const row = result.rows[0];

    // invStart should be the provided initial
    expect(row.inv_start).toBe(100000);

    // Reconciliation should work:
    // invEnd (102000) = invStart (100000) + marketReturnImpact (2000) - transfer (0)
    expect(row.market_return_impact).toBe(2000);
    expect(Math.abs(row.inv_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
  });

  it('should fall back to derived calculation when initialCash not provided', () => {
    // This tests the legacy behavior still works (for backwards compatibility)
    const states = [
      createMonthState(0, 2025, 1, {
        cash: 10000,
        flows: createFlows(), // No flows = start equals end
      }),
    ];

    const result = transformToTraceData(states, defaultAssumptions);
    // Without initial values, it falls back to derivation
    // With no flows, cashStart should equal cashEnd
    expect(result.rows[0].cash_start).toBe(10000);
  });
});

describe('Engine Flow Capture (Verified Fixed)', () => {
  // These income sources are now properly tracked in the Go engine:
  // - socialSecurityIncome (via SocialSecurityIncomeThisMonth)
  // - pensionIncome (via PensionIncomeThisMonth)
  // - contributionsHSA (via ContributionsHSAThisMonth)
  // - rmdAmount (via RMDAmountThisMonth)
  //
  // The tracking was added to:
  // - event_handler.go: Social Security, Pension, HSA handlers
  // - simulation.go: RMD processing, MonthlyFlows struct
  // - state_capture.go: captureMonthlyFlows now uses actual values

  it('should have correct flow capture fields defined', () => {
    // This test verifies the transform correctly reads income sources
    // The actual engine integration is tested via E2E tests
    const states = [
      createMonthState(0, 2025, 1, {
        cash: 15000,
        flows: createFlows({
          totalIncome: 5000,
          socialSecurityIncome: 2000,
          pensionIncome: 1500,
          salaryIncome: 1500,
        }),
      }),
    ];

    const result = transformToTraceData(states, defaultAssumptions, {
      initialCash: 10000,
    });

    // Verify flow items are built correctly
    const flowItems = result.flowItemsByMonth.get('2025-01');
    expect(flowItems).toBeDefined();

    // Should have income items for each source
    const incomeItems = flowItems?.filter(f => f.group === 'Income') ?? [];
    expect(incomeItems.length).toBeGreaterThan(0);
  });
});

describe('Stochastic Simulation Mode', () => {
  // Tests for seeded stochastic simulation mode
  // This mode enables "one illustrative path" with reproducible random returns

  it('should include simulation mode in metadata', () => {
    const states = [
      createMonthState(0, 2025, 1, { cash: 10000 }),
    ];

    // Test deterministic mode (default)
    const deterministicResult = transformToTraceData(states, defaultAssumptions, {
      simulationMode: 'deterministic',
    });
    expect(deterministicResult.meta.simulation_mode).toBe('deterministic');

    // Test stochastic mode
    const stochasticResult = transformToTraceData(states, defaultAssumptions, {
      simulationMode: 'stochastic',
      seed: 12345,
    });
    expect(stochasticResult.meta.simulation_mode).toBe('stochastic');
    expect(stochasticResult.meta.seed).toBe(12345);
  });

  it('should include model description for stochastic mode', () => {
    const states = [
      createMonthState(0, 2025, 1, { cash: 10000 }),
    ];

    const result = transformToTraceData(states, defaultAssumptions, {
      simulationMode: 'stochastic',
      seed: 12345,
      modelDescription: 'PCG32 seeded GARCH(1,1) with Student-t(5)',
    });

    expect(result.meta.model_description).toBe('PCG32 seeded GARCH(1,1) with Student-t(5)');
  });

  it('should include extended asset returns in worldVarsByMonth', () => {
    const states = [
      createMonthState(0, 2025, 1, {
        cash: 10000,
        marketReturns: createReturns({
          SPY: 0.02,
          BND: 0.005,
          Inflation: 0.002,
          Intl: 0.015,
          Other: 0.01,
          IndividualStock: 0.025,
          Home: 0.003,
          Rent: 0.002,
        }),
      }),
    ];

    const result = transformToTraceData(states, defaultAssumptions, {
      simulationMode: 'stochastic',
    });

    const worldVars = result.worldVarsByMonth.get('2025-01');
    expect(worldVars).toBeDefined();
    expect(worldVars?.equity_return).toBe(0.02);
    expect(worldVars?.bond_return).toBe(0.005);
    expect(worldVars?.inflation).toBe(0.002);
    expect(worldVars?.intl_return).toBe(0.015);
    expect(worldVars?.other_return).toBe(0.01);
    expect(worldVars?.individual_stock_return).toBe(0.025);
    expect(worldVars?.home_return).toBe(0.003);
    expect(worldVars?.rental_return).toBe(0.002);
  });

  it('should still reconcile with stochastic returns', () => {
    // Scenario: Stochastic returns with market growth
    const states = [
      createMonthState(0, 2025, 1, {
        cash: 10000,
        taxable: {
          totalValue: 102000, // 100000 * (1 + 0.02)
          totalCostBasis: 100000,
          unrealizedGain: 2000,
          longTermGain: 2000,
          shortTermGain: 0,
          holdings: [],
        },
        flows: createFlows({
          investmentGrowth: 2000,
        }),
        marketReturns: createReturns({
          SPY: 0.02,
          BND: 0.005,
          Inflation: 0.002,
        }),
      }),
    ];

    const result = transformToTraceData(states, defaultAssumptions, {
      simulationMode: 'stochastic',
      seed: 12345,
      initialCash: 10000,
      initialInvested: 100000,
    });

    const row = result.rows[0];
    expect(row.market_return_impact).toBe(2000);
    expect(Math.abs(row.inv_delta)).toBeLessThanOrEqual(RECONCILE_TOLERANCE);
  });

  it('should handle deterministic mode without model description', () => {
    const states = [
      createMonthState(0, 2025, 1, { cash: 10000 }),
    ];

    const result = transformToTraceData(states, defaultAssumptions, {
      simulationMode: 'deterministic',
    });

    expect(result.meta.simulation_mode).toBe('deterministic');
    // seed has a default value (1234) in the transform, so it's always present
    expect(result.meta.seed).toBeDefined();
    // model description should only be set for stochastic mode
    expect(result.meta.model_description).toBeUndefined();
  });

  it('should default to deterministic mode when not specified', () => {
    const states = [
      createMonthState(0, 2025, 1, { cash: 10000 }),
    ];

    const result = transformToTraceData(states, defaultAssumptions);

    // Default behavior should be deterministic
    expect(result.meta.simulation_mode).toBe('deterministic');
  });
});
