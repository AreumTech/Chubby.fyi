/* eslint-disable */
/**
 * This file was automatically generated from JSON Schema.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run npm run generate-types to regenerate this file.
 */

/**
 * Comprehensive monthly simulation snapshot data
 */
export interface MonthlyData {
  /**
   * Month number in simulation (0-based)
   */
  monthOffset: number;
  /**
   * Total net worth at month end
   */
  netWorth: number;
  /**
   * Net cash flow for the month
   */
  cashFlow: number;
  /**
   * Account holdings at month end
   */
  accounts: {
    taxable?: {
      holdings: {
        id: string;
        assetClass: string;
        quantity: number;
        costBasisPerUnit: number;
        costBasisTotal: number;
        currentMarketPricePerUnit: number;
        currentMarketValueTotal: number;
        unrealizedGainLossTotal: number;
        purchaseMonth: number;
      }[];
      totalValue: number;
    };
    tax_deferred?: {
      holdings: {
        id: string;
        assetClass: string;
        quantity: number;
        costBasisPerUnit: number;
        costBasisTotal: number;
        currentMarketPricePerUnit: number;
        currentMarketValueTotal: number;
        unrealizedGainLossTotal: number;
        purchaseMonth: number;
      }[];
      totalValue: number;
    };
    roth?: {
      holdings: {
        id: string;
        assetClass: string;
        quantity: number;
        costBasisPerUnit: number;
        costBasisTotal: number;
        currentMarketPricePerUnit: number;
        currentMarketValueTotal: number;
        unrealizedGainLossTotal: number;
        purchaseMonth: number;
      }[];
      totalValue: number;
    };
    cash: number;
  };
  returns: StochasticReturns;
  /**
   * Total income received this month
   */
  incomeThisMonth: number;
  /**
   * Employment income received this month
   */
  employmentIncomeThisMonth?: number;
  /**
   * Total expenses paid this month
   */
  expensesThisMonth: number;
  /**
   * Total contributions to investments this month
   */
  contributionsToInvestmentsThisMonth: number;
  /**
   * Total withdrawals from investments this month
   */
  withdrawalsFromInvestmentsThisMonth?: number;
  /**
   * Taxes owed this month
   */
  taxesOwedThisMonth?: number;
  /**
   * Taxes paid this month
   */
  taxesPaidThisMonth?: number;
  /**
   * Capital gains tax paid this month
   */
  capitalGainsTaxPaidThisMonth?: number;
  /**
   * Capital gains realized this month
   */
  capitalGainsRealizedThisMonth?: number;
  /**
   * Capital losses realized this month
   */
  capitalLossesRealizedThisMonth?: number;
  /**
   * Dividends received this month
   */
  dividendsReceivedThisMonth?: number;
  /**
   * Interest income received this month
   */
  interestReceivedThisMonth?: number;
  /**
   * Costs associated with rebalancing this month
   */
  rebalancingCostsThisMonth?: number;
  /**
   * Tax benefits from loss harvesting this month
   */
  taxLossHarvestingBenefitThisMonth?: number;
  /**
   * Amount converted from traditional to Roth this month
   */
  rothConversionAmountThisMonth?: number;
  /**
   * Required minimum distribution amount this month
   */
  requiredMinimumDistributionThisMonth?: number;
  /**
   * Proceeds from forced asset sales (not income) this month
   */
  divestmentProceedsThisMonth?: number;
}
/**
 * Asset class returns for the month
 */
export interface StochasticReturns {
  stocks?: number;
  bonds?: number;
  international_stocks?: number;
  emerging_markets?: number;
  real_estate?: number;
  commodities?: number;
  cash?: number;
  crypto?: number;
}
