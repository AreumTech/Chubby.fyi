/**
 * Real Estate Events - Property purchase and sale events
 * 
 * This module contains events related to real estate transactions including
 * home purchases and sales with proper asset/liability modeling.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';
import { RealEstateAsset } from '../state/simulation';
import { LiabilityReference } from './liability';

// =============================================================================
// REAL ESTATE PURCHASE
// =============================================================================

export const REAL_ESTATE_PURCHASE_EVENT_TYPE = EventType.REAL_ESTATE_PURCHASE;

/**
 * Comprehensive real estate purchase event that handles:
 * - Creating the real estate asset
 * - Adding the mortgage liability (if applicable)
 * - Processing the down payment from specified accounts
 * - Handling closing costs and fees
 */
export interface RealEstatePurchaseEvent extends BaseEvent {
  type: typeof REAL_ESTATE_PURCHASE_EVENT_TYPE;
  
  // Property details
  property: {
    id: string;
    name: string;
    type: 'primary_residence' | 'rental_property' | 'vacation_home' | 'commercial' | 'land';
    purchasePrice: number;
    purchaseDate?: string; // Will default to event date if not specified
    
    // Annual property expenses (optional, for rental properties)
    annualExpenses?: {
      propertyTax: number;
      insurance: number;
      maintenance: number;
      management: number;
      other: number;
    };
    
    // Rental income (for investment properties)
    annualRentalIncome?: number;
  };
  
  // Financing details
  financing: {
    downPaymentAmount: number;
    downPaymentSource: AccountType | 'cash' | 'multiple'; // Where down payment comes from
    
    // Mortgage details (optional for cash purchases)
    mortgage?: {
      principalAmount: number; // Total loan amount
      annualInterestRate: number;
      termInMonths: number;
      monthlyPayment?: number; // Will be calculated if not provided
      mortgageId?: string; // Custom ID for the mortgage liability
    };
  };
  
  // Closing costs and fees
  closingCosts: {
    totalAmount: number;
    source: AccountType | 'cash' | 'multiple'; // How closing costs are paid
    breakdown?: {
      lenderFees: number;
      titleInsurance: number;
      appraisal: number;
      inspection: number;
      other: number;
    };
  };
  
  // Liquidation strategy for down payment + closing costs
  liquidationStrategy?: {
    preferredOrder: AccountType[]; // Order of accounts to liquidate from
    maxFromAnyAccount?: number; // Maximum to withdraw from any single account
    taxOptimization?: boolean; // Whether to optimize for tax efficiency
  };
}

export function isRealEstatePurchaseEvent(event: { type: EventType }): event is RealEstatePurchaseEvent {
  return event.type === REAL_ESTATE_PURCHASE_EVENT_TYPE;
}

// =============================================================================
// REAL ESTATE SALE
// =============================================================================

export const REAL_ESTATE_SALE_EVENT_TYPE = EventType.REAL_ESTATE_SALE;

/**
 * Real estate sale event that handles:
 * - Selling the real estate asset
 * - Paying off associated mortgage (if any)
 * - Calculating capital gains/losses
 * - Distributing net proceeds to specified accounts
 */
export interface RealEstateSaleEvent extends BaseEvent {
  type: typeof REAL_ESTATE_SALE_EVENT_TYPE;
  
  // Property being sold
  propertyId: string; // ID of the RealEstateAsset being sold
  salePrice: number;
  saleDate?: string; // Will default to event date if not specified
  
  // Sale costs
  sellingCosts: {
    totalAmount: number;
    breakdown?: {
      realtorCommission: number;
      stagingCosts: number;
      repairs: number;
      legal: number;
      other: number;
    };
  };
  
  // What to do with net proceeds after paying off mortgage and costs
  proceedsDistribution: {
    targetAccount: AccountType | 'cash';
    // Optional: split proceeds across multiple accounts
    distributionPlan?: Array<{
      accountType: AccountType | 'cash';
      percentage: number; // Must sum to 100 across all entries
    }>;
  };
  
  // Tax planning
  taxPlanning?: {
    // Whether to use 1031 like-kind exchange (for investment properties)
    use1031Exchange?: boolean;
    replacementPropertyDeadline?: string;
    
    // Capital gains optimization
    harvestLossesFromOtherAccounts?: boolean;
  };
}

export function isRealEstateSaleEvent(event: { type: EventType }): event is RealEstateSaleEvent {
  return event.type === REAL_ESTATE_SALE_EVENT_TYPE;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate monthly mortgage payment using standard amortization formula
 */
export function calculateMonthlyMortgagePayment(
  principal: number,
  annualRate: number,
  termInMonths: number
): number {
  if (annualRate === 0) {
    return principal / termInMonths;
  }
  
  const monthlyRate = annualRate / 12;
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, termInMonths);
  const denominator = Math.pow(1 + monthlyRate, termInMonths) - 1;
  
  return numerator / denominator;
}

/**
 * Calculate total cash needed for a real estate purchase
 */
export function calculateTotalCashNeeded(event: RealEstatePurchaseEvent): number {
  return event.financing.downPaymentAmount + event.closingCosts.totalAmount;
}

/**
 * Create a mortgage liability from purchase event details
 */
export function createMortgageLiabilityFromPurchase(
  event: RealEstatePurchaseEvent
): LiabilityReference | null {
  if (!event.financing.mortgage) {
    return null; // Cash purchase
  }
  
  const mortgage = event.financing.mortgage;
  const monthlyPayment = mortgage.monthlyPayment || 
    calculateMonthlyMortgagePayment(
      mortgage.principalAmount,
      mortgage.annualInterestRate,
      mortgage.termInMonths
    );
  
  return {
    id: mortgage.mortgageId || `mortgage-${event.property.id}`,
    name: `Mortgage for ${event.property.name}`,
    type: 'mortgage',
    originalPrincipalAmount: mortgage.principalAmount,
    currentPrincipalBalance: mortgage.principalAmount,
    annualInterestRate: mortgage.annualInterestRate,
    remainingTermInMonths: mortgage.termInMonths,
    monthlyPayment: monthlyPayment,
    startDate: event.property.purchaseDate,
    linkedAssetId: event.property.id
  };
}

/**
 * Create a real estate asset from purchase event details
 */
export function createRealEstateAssetFromPurchase(
  event: RealEstatePurchaseEvent,
  mortgageLiabilityId?: string
): RealEstateAsset {
  return {
    id: event.property.id,
    name: event.property.name,
    type: event.property.type,
    currentValue: event.property.purchasePrice,
    purchasePrice: event.property.purchasePrice,
    purchaseDate: event.property.purchaseDate || new Date().toISOString().split('T')[0],
    mortgageBalance: event.financing.mortgage?.principalAmount,
    mortgageLiabilityId: mortgageLiabilityId,
    annualRentalIncome: event.property.annualRentalIncome,
    annualExpenses: event.property.annualExpenses
  };
}

// =============================================================================
// TYPE GUARDS AND UNIONS
// =============================================================================

/**
 * Union type for all real estate events
 */
export type RealEstateEvents = 
  | RealEstatePurchaseEvent
  | RealEstateSaleEvent;

/**
 * Type guard for any real estate event
 */
export function isRealEstateEvent(event: { type: EventType }): event is RealEstateEvents {
  return isRealEstatePurchaseEvent(event) || isRealEstateSaleEvent(event);
}