/**
 * Account State Types - Investment accounts and holdings
 * 
 * This module contains all account-related state definitions including
 * accounts, holdings, and account structures used by the simulation engine.
 */

import { AssetClass, AccountCategory, LotAcquisitionType } from '../common';
import { AccountType } from '../accountTypes';

// =============================================================================
// HOLDINGS - Individual investment positions
// =============================================================================

/**
 * Represents a specific investment holding within an account
 * Contains both cost basis and current market value information
 */
export interface Holding {
  /** Unique identifier for this holding */
  id: string;
  
  /** Asset class classification */
  assetClass: AssetClass;
  
  /** Symbol or identifier for the specific asset */
  assetSymbolOrIdentifier: string;
  
  /** Number of shares/units owned */
  quantity: number;
  
  /** Original purchase price per unit */
  purchasePricePerUnit: number;
  
  /** Total cost basis (quantity × purchase price + fees) */
  costBasisTotal: number;
  
  /** Current market price per unit */
  currentMarketPricePerUnit: number;
  
  /** Current total market value */
  currentMarketValueTotal: number;
  
  /** Unrealized gain/loss */
  unrealizedGainLossTotal: number;
  
  /** Date when this position was opened */
  openTransactionDate: string;
  
  /** Whether this holding generates qualified dividends */
  isQualifiedDividendSource?: boolean;
  
  /** How this position was acquired */
  lotAcquisitionType?: LotAcquisitionType;
  
  /** More specific account type if needed */
  specificAccountType?: AccountType;
}

// =============================================================================
// ACCOUNT - Container for holdings and cash
// =============================================================================

/**
 * Represents an investment account with holdings and cash
 * Used by the simulation engine to track account state
 */
export interface Account {
  /** Cash balance in the account */
  cash: number;
  
  /** Array of investment holdings */
  holdings: Holding[];
  
  /** Total account value (cash + holdings) */
  totalValue: number;
  
  /** Total cost basis of all holdings */
  totalCostBasis: number;
  
  /** Total unrealized gains across all holdings */
  totalUnrealizedGains: number;
}

// =============================================================================
// ACCOUNT STRUCTURES - Different ways to organize accounts
// =============================================================================

/**
 * Initial account holdings structure for setting up simulations
 * Used when defining the starting state of a financial plan
 */
export interface InitialAccountHoldings {
  /** Initial cash amount */
  cash?: number;

  /** Holdings in taxable accounts */
  taxable?: Holding[];

  /** Holdings in tax-deferred accounts (401k, IRA) */
  tax_deferred?: Holding[];

  /** Holdings in Roth accounts */
  roth?: Holding[];

  /** Holdings in HSA accounts */
  hsa?: Holding[];

  /** Holdings in 529 accounts */
  fiveTwoNine?: Holding[];
}

/**
 * Month-end account holdings snapshot
 * Used for simulation results and analysis
 */
export interface AccountHoldingsMonthEnd {
  /** Taxable account state */
  taxable?: Account;
  
  /** Tax-deferred account state */
  tax_deferred?: Account;
  
  /** Roth account state */
  roth?: Account;
  
  /** Simple cash balance (for backwards compatibility) */
  cash?: number;
}

// =============================================================================
// NEW ACCOUNT MODEL - Enhanced account structure
// =============================================================================

/**
 * Enhanced account model supporting multiple accounts of the same type
 * This is the future direction for account modeling
 */
export interface AccountNew {
  /** Unique identifier for this account */
  id: string;
  
  /** User-friendly name for the account */
  name: string;
  
  /** High-level category */
  category: AccountCategory;
  
  /** Specific account type */
  type: AccountType;
  
  /** Current account state */
  state?: Account;
  
  /** Additional metadata */
  metadata?: {
    /** Institution name */
    institution?: string;
    
    /** Account number (masked) */
    accountNumber?: string;
    
    /** Whether this is the primary account of its type */
    isPrimary?: boolean;
    
    /** Custom color for UI display */
    color?: string;
    
    /** Whether to include in simulation */
    includeInSimulation?: boolean;
  };
}





// =============================================================================
// ASSET CLASS BREAKDOWN - For analysis and reporting
// =============================================================================

/**
 * Calculate total value of holdings array
 */
export function calculateHoldingsValue(holdings: Holding[]): number {
  return holdings.reduce((total, holding) => total + holding.currentMarketValueTotal, 0);
}

/**
 * Calculate total cost basis of holdings array
 */
export function calculateHoldingsCostBasis(holdings: Holding[]): number {
  return holdings.reduce((total, holding) => total + holding.costBasisTotal, 0);
}

/**
 * Calculate unrealized gains for holdings array
 */
export function calculateUnrealizedGains(holdings: Holding[]): number {
  return holdings.reduce((total, holding) => total + holding.unrealizedGainLossTotal, 0);
}

/**
 * Get holdings by asset class
 */
export function getHoldingsByAssetClass(holdings: Holding[], assetClass: AssetClass): Holding[] {
  return holdings.filter(holding => holding.assetClass === assetClass);
}

/**
 * Calculate account total value
 */
export function calculateAccountValue(account: Account): number {
  return account.cash + calculateHoldingsValue(account.holdings);
}