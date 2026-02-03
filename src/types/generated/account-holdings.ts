/* eslint-disable */
/**
 * This file was automatically generated from JSON Schema.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run npm run generate-types to regenerate this file.
 */

export type AssetClass =
  | 'cash'
  | 'stocks'
  | 'bonds'
  | 'international_stocks'
  | 'emerging_markets'
  | 'real_estate'
  | 'commodities'
  | 'crypto';

/**
 * Complete account holdings snapshot at month end
 */
export interface AccountHoldingsMonthEnd {
  taxable?: Account;
  tax_deferred?: Account;
  roth?: Account;
  cash: number;
}
export interface Account {
  holdings: Holding[];
  totalValue: number;
}
export interface Holding {
  id: string;
  assetClass: AssetClass;
  quantity: number;
  costBasisPerUnit: number;
  costBasisTotal: number;
  currentMarketPricePerUnit: number;
  currentMarketValueTotal: number;
  unrealizedGainLossTotal: number;
  purchaseMonth: number;
  lots?: TaxLot[];
}
export interface TaxLot {
  quantity: number;
  costBasisPerUnit: number;
  purchaseMonth: number;
}
