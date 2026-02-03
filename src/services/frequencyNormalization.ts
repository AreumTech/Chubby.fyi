/**
 * Frequency Normalization Service
 *
 * SEMANTIC DESIGN:
 * - UI Layer: Users enter amounts in whatever frequency makes sense (salary yearly, groceries monthly)
 * - Normalization Layer: Everything gets converted to monthly amounts for simulation
 * - WASM Layer: Only receives monthly amounts, no frequency confusion
 * - Results Layer: Absolute values at snapshots, no flow/frequency concerns
 */

import { logger } from '@/utils/logger';

export interface AmountWithFrequency {
  amount: number;
  frequency: 'monthly' | 'annually' | 'weekly' | 'biweekly' | 'quarterly' | 'semiannually' | 'one-time' | 'once';
}

export interface MonthlyAmount {
  monthlyAmount: number;
  originalAmount: number;
  originalFrequency: string;
}

/**
 * Convert any frequency to monthly amount for simulation engine
 * This is the SINGLE source of truth for frequency conversion
 */
export function normalizeToMonthly(input: AmountWithFrequency): MonthlyAmount {
  const { amount, frequency } = input;
  
  let monthlyAmount: number;
  
  switch (frequency) {
    case 'monthly':
      monthlyAmount = amount;
      break;
    case 'annually':
      monthlyAmount = amount / 12;
      break;
    case 'weekly':
      monthlyAmount = (amount * 52) / 12; // 52 weeks per year, 12 months per year
      break;
    case 'biweekly':
      monthlyAmount = (amount * 26) / 12; // 26 pay periods per year
      break;
    case 'quarterly':
      monthlyAmount = amount / 3; // 3 months per quarter
      break;
    case 'semiannually':
      monthlyAmount = amount / 6; // 6 months per half year
      break;
    case 'one-time':
    case 'once': // Alias for 'one-time' used in some strategy events
      monthlyAmount = amount; // One-time events: full amount applied only at monthOffset
      break;
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
  
  return {
    monthlyAmount,
    originalAmount: amount,
    originalFrequency: frequency
  };
}

/**
 * Convert monthly amount back to display frequency for UI
 * Used when showing results to users in their preferred units
 */
export function denormalizeFromMonthly(monthlyAmount: number, targetFrequency: string): number {
  switch (targetFrequency) {
    case 'monthly':
      return monthlyAmount;
    case 'annually':
      return monthlyAmount * 12;
    case 'weekly':
      return (monthlyAmount * 12) / 52;
    case 'biweekly':
      return (monthlyAmount * 12) / 26;
    case 'quarterly':
      return monthlyAmount * 3;
    case 'semiannually':
      return monthlyAmount * 6;
    default:
      return monthlyAmount;
  }
}

/**
 * Validate that conversion is working correctly
 */
export function validateConversion(original: AmountWithFrequency): boolean {
  const normalized = normalizeToMonthly(original);
  const roundTrip = denormalizeFromMonthly(normalized.monthlyAmount, original.frequency);
  
  // Allow for small floating point differences
  const difference = Math.abs(roundTrip - original.amount);
  const tolerance = Math.max(0.01, original.amount * 0.0001); // 0.01% tolerance
  
  if (difference > tolerance) {
    logger.error(`🚨 Frequency conversion failed round-trip test:`, {
      original: original.amount,
      frequency: original.frequency,
      normalized: normalized.monthlyAmount,
      roundTrip,
      difference,
      tolerance
    });
    return false;
  }
  
  return true;
}

/**
 * Apply growth to a monthly amount over time
 * Growth rates are always expressed annually, but applied to monthly amounts
 */
export function applyGrowthToMonthly(
  monthlyAmount: number, 
  annualGrowthRate: number, 
  yearsFromStart: number
): number {
  if (annualGrowthRate === 0) return monthlyAmount;
  
  // Convert annual growth rate to monthly, then apply for the total months
  const monthlyGrowthRate = Math.pow(1 + annualGrowthRate, 1/12) - 1;
  const totalMonths = yearsFromStart * 12;
  
  return monthlyAmount * Math.pow(1 + monthlyGrowthRate, totalMonths);
}