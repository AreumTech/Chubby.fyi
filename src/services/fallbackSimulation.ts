/**
 * JavaScript Fallback Simulation Engine
 * 
 * Provides a basic simulation engine when WASM is unavailable.
 * This is a simplified version that covers essential functionality
 * to ensure the application remains functional even if WASM fails.
 */

import { AccountHoldingsMonthEnd, SimulationEvent, AppConfig, EventType, EventPriority } from '@/types';
import { showInfo } from '@/utils/notifications';
import { logger } from '@/utils/logger';

interface FallbackSimulationResult {
  success: boolean;
  monthlyData: FallbackMonthlyData[];
  error?: string;
}

interface FallbackMonthlyData {
  monthOffset: number;
  netWorth: number;
  cashFlow: number;
  accounts: AccountHoldingsMonthEnd;
  returns: {
    spy: number;
    bnd: number;
    intl: number;
    home: number;
    rent: number;
    inflation: number;
  };
  
  // Simplified flow tracking
  incomeThisMonth: number;
  expensesThisMonth: number;
  contributionsToInvestmentsThisMonth: number;
  debtPaymentsPrincipalThisMonth: number;
  debtPaymentsInterestThisMonth: number;
  rothConversionAmountThisMonth: number;
  oneTimeEventsImpactThisMonth: number;
  divestmentProceedsThisMonth: number;
  rebalancingTradesNetEffectThisMonth: number;
  taxWithheldThisMonth: number;
  dividendsReceivedThisMonth: {
    qualified: number;
    ordinary: number;
  };
  
  // Simplified tax tracking
  ordinaryIncomeForTaxYTD: number;
  stcgForTaxYTD: number;
  ltcgForTaxYTD: number;
  qualifiedDividendIncomeYTD: number;
  ordinaryDividendIncomeYTD: number;
  itemizedDeductibleInterestPaidYTD: number;
  preTaxContributionsYTD: number;
  taxWithholdingYTD: number;
  
  // Annual results (optional)
  taxPaidAnnual?: number;
  rmdAmountAnnual?: number;
  irmaaMedicarePremiumAdjustment?: number;
  capitalLossCarryoverEndYear?: number;
  activeFilingStatus?: string;
  activeNumDependents?: number;
}

interface FallbackMonteCarloResult {
  success: boolean;
  numberOfRuns: number;
  finalNetWorthP10: number;
  finalNetWorthP25: number;
  finalNetWorthP50: number;
  finalNetWorthP75: number;
  finalNetWorthP90: number;
  probabilityOfSuccess: number;
  error?: string;
}

class FallbackSimulationEngine {
  private readonly DEFAULT_RETURNS = {
    spy: 0.08 / 12,      // 8% annual -> monthly
    bnd: 0.04 / 12,      // 4% annual -> monthly
    intl: 0.07 / 12,     // 7% annual -> monthly
    home: 0.04 / 12,     // 4% annual -> monthly
    rent: 0.03 / 12,     // 3% annual -> monthly
    inflation: 0.025 / 12 // 2.5% annual -> monthly
  };

  private readonly DEFAULT_VOLATILITIES = {
    spy: 0.175 / Math.sqrt(12),    // Annual vol -> monthly
    bnd: 0.045 / Math.sqrt(12),
    intl: 0.20 / Math.sqrt(12),
    home: 0.10 / Math.sqrt(12),
    rent: 0.08 / Math.sqrt(12),
    inflation: 0.015 / Math.sqrt(12)
  };

  /**
   * Run a single simulation path using simplified JavaScript logic
   */
  async runSingleSimulation(
    initialAccounts: AccountHoldingsMonthEnd,
    events: SimulationEvent[],
    config: AppConfig,
    monthsToRun: number
  ): Promise<FallbackMonthlyData[]> {
    try {
      showInfo(
        'Using Fallback Engine',
        'WASM unavailable, using simplified JavaScript simulation',
        5000
      );

      const results: FallbackMonthlyData[] = [];
      let currentAccounts = { ...initialAccounts };
      
      // Initialize tracking variables
      let yearToDateTracking = {
        ordinaryIncome: 0,
        stcg: 0,
        ltcg: 0,
        qualifiedDividends: 0,
        ordinaryDividends: 0,
        interestPaid: 0,
        preTaxContributions: 0,
        taxWithholding: 0
      };

      for (let month = 0; month < monthsToRun; month++) {
        const monthlyData = await this.simulateMonth(
          month,
          currentAccounts,
          events,
          yearToDateTracking,
          config
        );
        
        results.push(monthlyData);
        currentAccounts = monthlyData.accounts;
        
        // Reset YTD tracking at year end
        if (month > 0 && (month + 1) % 12 === 0) {
          yearToDateTracking = {
            ordinaryIncome: 0,
            stcg: 0,
            ltcg: 0,
            qualifiedDividends: 0,
            ordinaryDividends: 0,
            interestPaid: 0,
            preTaxContributions: 0,
            taxWithholding: 0
          };
        }
      }

      return results;
    } catch (error) {
      logger.error('Fallback simulation failed:', 'SIMULATION', error);
      throw new Error(`Fallback simulation failed: ${error}`);
    }
  }

  /**
   * Run Monte Carlo simulation using the fallback engine
   */
  async runMonteCarloSimulation(
    initialAccounts: AccountHoldingsMonthEnd,
    events: SimulationEvent[],
    config: AppConfig,
    monthsToRun: number,
    numberOfRuns: number
  ): Promise<FallbackMonteCarloResult> {
    try {
      showInfo(
        'Monte Carlo Fallback',
        `Running ${numberOfRuns} simulations with fallback engine`,
        5000
      );

      // Limit runs for performance in fallback mode
      const limitedRuns = Math.min(numberOfRuns, 100);
      const finalNetWorths: number[] = [];

      for (let run = 0; run < limitedRuns; run++) {
        try {
          const results = await this.runSingleSimulation(
            initialAccounts,
            events,
            config,
            monthsToRun
          );
          
          if (results.length > 0) {
            finalNetWorths.push(results[results.length - 1].netWorth);
          }
        } catch (runError) {
          logger.warn(`Fallback simulation run ${run} failed:`, 'SIMULATION', runError);
          // Continue with other runs
        }
      }

      if (finalNetWorths.length === 0) {
        throw new Error('All simulation runs failed');
      }

      // Calculate percentiles
      finalNetWorths.sort((a, b) => a - b);
      const getPercentile = (p: number) => {
        const index = Math.floor(finalNetWorths.length * p);
        return finalNetWorths[Math.min(index, finalNetWorths.length - 1)];
      };

      // Simple success criteria (net worth > $1M)
      const successCount = finalNetWorths.filter(nw => nw > 1000000).length;
      const probabilityOfSuccess = (successCount / finalNetWorths.length) * 100;

      return {
        success: true,
        numberOfRuns: limitedRuns,
        finalNetWorthP10: getPercentile(0.1),
        finalNetWorthP25: getPercentile(0.25),
        finalNetWorthP50: getPercentile(0.5),
        finalNetWorthP75: getPercentile(0.75),
        finalNetWorthP90: getPercentile(0.9),
        probabilityOfSuccess
      };
    } catch (error) {
      logger.error('Fallback Monte Carlo simulation failed:', 'SIMULATION', error);
      return {
        success: false,
        numberOfRuns: 0,
        finalNetWorthP10: 0,
        finalNetWorthP25: 0,
        finalNetWorthP50: 0,
        finalNetWorthP75: 0,
        finalNetWorthP90: 0,
        probabilityOfSuccess: 0,
        error: String(error)
      };
    }
  }

  /**
   * Simulate a single month with simplified logic
   */
  private async simulateMonth(
    monthOffset: number,
    accounts: AccountHoldingsMonthEnd,
    events: SimulationEvent[],
    yearToDateTracking: any,
    config: AppConfig
  ): Promise<FallbackMonthlyData> {
    // Generate market returns with some randomness
    const returns = this.generateMarketReturns();
    
    // Start with current accounts
    const newAccounts = { ...accounts };
    
    // Apply market returns to investments
    if (newAccounts.taxable) {
      newAccounts.taxable *= (1 + returns.spy * 0.7 + returns.bnd * 0.3); // Simple 70/30 allocation
    }
    if (newAccounts.tax_deferred) {
      newAccounts.tax_deferred *= (1 + returns.spy * 0.8 + returns.bnd * 0.2); // Aggressive allocation
    }
    if (newAccounts.roth) {
      newAccounts.roth *= (1 + returns.spy * 0.9 + returns.bnd * 0.1); // Very aggressive
    }
    
    // Process events for this month
    const monthlyFlows = this.processEventsForMonth(monthOffset, events);
    
    // Apply cash flows
    newAccounts.cash = (newAccounts.cash || 0) + monthlyFlows.netCashFlow;
    
    // Rebalance if cash gets too high or low
    if (newAccounts.cash > 50000) {
      // Move excess cash to taxable investments
      const excess = newAccounts.cash - 10000;
      newAccounts.cash -= excess;
      newAccounts.taxable = (newAccounts.taxable || 0) + excess;
    } else if (newAccounts.cash < 0) {
      // Sell from taxable to cover shortfall
      const shortfall = -newAccounts.cash;
      if ((newAccounts.taxable || 0) >= shortfall) {
        newAccounts.taxable = (newAccounts.taxable || 0) - shortfall;
        newAccounts.cash = 0;
      }
    }

    // Calculate total net worth
    const netWorth = (newAccounts.cash || 0) + 
                    (newAccounts.taxable || 0) + 
                    (newAccounts.tax_deferred || 0) + 
                    (newAccounts.roth || 0);

    // Update YTD tracking
    yearToDateTracking.ordinaryIncome += monthlyFlows.income;
    yearToDateTracking.qualifiedDividends += monthlyFlows.dividends.qualified;
    yearToDateTracking.ordinaryDividends += monthlyFlows.dividends.ordinary;

    return {
      monthOffset,
      netWorth,
      cashFlow: monthlyFlows.netCashFlow,
      accounts: newAccounts,
      returns,
      
      // Monthly flows
      incomeThisMonth: monthlyFlows.income,
      expensesThisMonth: monthlyFlows.expenses,
      contributionsToInvestmentsThisMonth: monthlyFlows.contributions,
      debtPaymentsPrincipalThisMonth: monthlyFlows.debtPayments,
      debtPaymentsInterestThisMonth: 0,
      rothConversionAmountThisMonth: monthlyFlows.rothConversions,
      oneTimeEventsImpactThisMonth: monthlyFlows.oneTimeEvents,
      divestmentProceedsThisMonth: 0, // Fallback doesn't track forced divestments separately
      rebalancingTradesNetEffectThisMonth: 0,
      taxWithheldThisMonth: monthlyFlows.taxes,
      dividendsReceivedThisMonth: monthlyFlows.dividends,
      
      // YTD tracking
      ordinaryIncomeForTaxYTD: yearToDateTracking.ordinaryIncome,
      stcgForTaxYTD: yearToDateTracking.stcg,
      ltcgForTaxYTD: yearToDateTracking.ltcg,
      qualifiedDividendIncomeYTD: yearToDateTracking.qualifiedDividends,
      ordinaryDividendIncomeYTD: yearToDateTracking.ordinaryDividends,
      itemizedDeductibleInterestPaidYTD: yearToDateTracking.interestPaid,
      preTaxContributionsYTD: yearToDateTracking.preTaxContributions,
      taxWithholdingYTD: yearToDateTracking.taxWithholding,
      
      // Annual results (simplified)
      taxPaidAnnual: monthOffset % 12 === 11 ? monthlyFlows.taxes * 12 : undefined,
      activeFilingStatus: 'single'
    };
  }

  /**
   * Generate market returns with some randomness
   */
  private generateMarketReturns() {
    const addNoise = (baseReturn: number, volatility: number) => {
      const noise = (Math.random() - 0.5) * 2 * volatility;
      return baseReturn + noise;
    };

    return {
      spy: addNoise(this.DEFAULT_RETURNS.spy, this.DEFAULT_VOLATILITIES.spy),
      bnd: addNoise(this.DEFAULT_RETURNS.bnd, this.DEFAULT_VOLATILITIES.bnd),
      intl: addNoise(this.DEFAULT_RETURNS.intl, this.DEFAULT_VOLATILITIES.intl),
      home: addNoise(this.DEFAULT_RETURNS.home, this.DEFAULT_VOLATILITIES.home),
      rent: addNoise(this.DEFAULT_RETURNS.rent, this.DEFAULT_VOLATILITIES.rent),
      inflation: addNoise(this.DEFAULT_RETURNS.inflation, this.DEFAULT_VOLATILITIES.inflation)
    };
  }

  /**
   * Process events for a specific month
   */
  private processEventsForMonth(monthOffset: number, events: SimulationEvent[]) {
    let income = 0;
    let expenses = 0;
    let contributions = 0;
    let debtPayments = 0;
    let rothConversions = 0;
    let oneTimeEvents = 0;
    let taxes = 0;
    let dividends = { qualified: 0, ordinary: 0 };

    // Filter events that apply to this month
    const applicableEvents = events.filter(event => {
      if (!event.monthOffset) return false;
      
      // Handle different event timing logic
      switch (event.type) {
        case EventType.INCOME:
          return monthOffset >= event.monthOffset; // Recurring from start month
        case EventType.RECURRING_EXPENSE:
          return monthOffset >= event.monthOffset && 
                 (!event.endMonthOffset || monthOffset <= event.endMonthOffset);
        case EventType.ONE_TIME_EVENT:
          return monthOffset === event.monthOffset;
        case EventType.SCHEDULED_CONTRIBUTION:
          return monthOffset >= event.monthOffset;
        default:
          return false;
      }
    });

    // Process each applicable event
    applicableEvents.forEach(event => {
      const amount = event.amount || 0;
      
      switch (event.type) {
        case EventType.INCOME:
          income += amount / 12; // Assume annual amount, convert to monthly
          taxes += amount * 0.25 / 12; // Simplified 25% tax rate
          break;
          
        case EventType.RECURRING_EXPENSE:
          expenses += amount;
          break;
          
        case EventType.ONE_TIME_EVENT:
          oneTimeEvents += amount;
          break;
          
        case EventType.SCHEDULED_CONTRIBUTION:
          contributions += amount;
          break;
          
        case EventType.ROTH_CONVERSION:
          rothConversions += amount;
          taxes += amount * 0.22; // Simplified tax on conversion
          break;
      }
    });

    // Add simplified dividend income (1% annual yield on investments)
    dividends.qualified += income * 0.01 / 12;

    return {
      income,
      expenses,
      contributions,
      debtPayments,
      rothConversions,
      oneTimeEvents,
      taxes,
      dividends,
      netCashFlow: income - expenses - contributions - debtPayments - taxes + oneTimeEvents
    };
  }

  /**
   * Check if fallback engine is available
   */
  isAvailable(): boolean {
    return true; // JavaScript fallback is always available
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      available: true,
      type: 'JavaScript Fallback',
      performance: 'Limited',
      features: 'Basic simulation capabilities'
    };
  }
}

// Export singleton instance
export const fallbackSimulationEngine = new FallbackSimulationEngine();

// Export types
export type {
  FallbackSimulationResult,
  FallbackMonthlyData,
  FallbackMonteCarloResult
};