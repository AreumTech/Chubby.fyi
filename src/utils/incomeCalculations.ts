/**
 * Income Calculation Utilities
 * 
 * Helper functions for calculating total income from event ledger
 * Used by contribution forms for percentage-based calculations
 */

import { FinancialEvent, EventType } from '@/types';

/**
 * Calculate total annual income from event ledger
 */
export function calculateTotalAnnualIncome(eventLedger: FinancialEvent[]): number {
  let totalAnnualIncome = 0;
  
  const currentYear = new Date().getFullYear();
  
  // Filter for active income events in current year
  const incomeEvents = eventLedger.filter(event => {
    // Check if event is an income type
    const isIncomeEvent = [
      EventType.INCOME,
      EventType.SOCIAL_SECURITY_INCOME,
      EventType.PENSION_INCOME,
      EventType.RENTAL_INCOME,
      EventType.BUSINESS_INCOME,
      EventType.DIVIDEND_INCOME
    ].includes(event.type);
    
    if (!isIncomeEvent || !event.amount) return false;
    
    // Check if event is active (started and not ended)
    const hasStarted = !event.startDateOffset || event.startDateOffset <= 0;
    const hasNotEnded = !event.endDateOffset || event.endDateOffset > 0;
    
    return hasStarted && hasNotEnded;
  });
  
  // Sum up annual amounts
  for (const event of incomeEvents) {
    const amount = Number(event.amount) || 0;
    
    // Use correct frequency defaults based on event type
    let frequency = event.frequency;
    if (!frequency) {
      switch (event.type) {
        case EventType.INCOME:
          frequency = 'annually'; // W2 Income defaults to annually
          break;
        case EventType.BUSINESS_INCOME:
        case EventType.RENTAL_INCOME:
        case EventType.SOCIAL_SECURITY_INCOME:
        case EventType.PENSION_INCOME:
          frequency = 'monthly'; // Other income streams default to monthly
          break;
        case EventType.DIVIDEND_INCOME:
          frequency = 'quarterly'; // Dividend income defaults to quarterly
          break;
        default:
          frequency = 'monthly';
      }
    }
    
    let annualAmount = amount;
    
    // Convert to annual amount
    if (frequency === 'monthly') {
      annualAmount = amount * 12;
    } else if (frequency === 'one-time') {
      // Skip one-time events for ongoing income calculation
      continue;
    }
    // 'annually' stays as is
    
    totalAnnualIncome += annualAmount;
  }
  
  return Math.round(totalAnnualIncome);
}

/**
 * Calculate monthly income from event ledger
 */
export function calculateTotalMonthlyIncome(eventLedger: FinancialEvent[]): number {
  return Math.round(calculateTotalAnnualIncome(eventLedger) / 12);
}

/**
 * Get income breakdown by source for display purposes
 */
export function getIncomeBreakdown(eventLedger: FinancialEvent[]): Array<{
  source: string;
  type: EventType;
  monthlyAmount: number;
  annualAmount: number;
  frequency: string;
}> {
  const incomeEvents = eventLedger.filter(event => {
    const isIncomeEvent = [
      EventType.INCOME,
      EventType.SOCIAL_SECURITY_INCOME,
      EventType.PENSION_INCOME,
      EventType.RENTAL_INCOME,
      EventType.BUSINESS_INCOME,
      EventType.DIVIDEND_INCOME
    ].includes(event.type);
    
    if (!isIncomeEvent || !event.amount) return false;
    
    const hasStarted = !event.startDateOffset || event.startDateOffset <= 0;
    const hasNotEnded = !event.endDateOffset || event.endDateOffset > 0;
    
    return hasStarted && hasNotEnded;
  });
  
  return incomeEvents.map(event => {
    const amount = Number(event.amount) || 0;
    
    // Use correct frequency defaults based on event type
    let frequency = event.frequency;
    if (!frequency) {
      switch (event.type) {
        case EventType.INCOME:
          frequency = 'annually'; // W2 Income defaults to annually
          break;
        case EventType.BUSINESS_INCOME:
        case EventType.RENTAL_INCOME:
        case EventType.SOCIAL_SECURITY_INCOME:
        case EventType.PENSION_INCOME:
          frequency = 'monthly'; // Other income streams default to monthly
          break;
        case EventType.DIVIDEND_INCOME:
          frequency = 'quarterly'; // Dividend income defaults to quarterly
          break;
        default:
          frequency = 'monthly';
      }
    }
    
    let monthlyAmount = amount;
    let annualAmount = amount;
    
    if (frequency === 'monthly') {
      annualAmount = amount * 12;
    } else if (frequency === 'annually') {
      monthlyAmount = amount / 12;
    }
    
    return {
      source: event.description || event.name || 'Income',
      type: event.type,
      monthlyAmount: Math.round(monthlyAmount),
      annualAmount: Math.round(annualAmount),
      frequency: frequency
    };
  });
}

/**
 * Calculate effective tax rate for net income calculations
 * This is a simplified estimation - real implementation would be more complex
 */
export function estimateEffectiveTaxRate(annualIncome: number, filingStatus: 'single' | 'married' = 'single'): number {
  // Simplified progressive tax estimation for 2025
  // This is a rough approximation
  
  const brackets = filingStatus === 'single' 
    ? [
        { min: 0, max: 11600, rate: 0.10 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 100525, rate: 0.22 },
        { min: 100525, max: 191950, rate: 0.24 },
        { min: 191950, max: 243725, rate: 0.32 },
        { min: 243725, max: 609350, rate: 0.35 },
        { min: 609350, max: Infinity, rate: 0.37 }
      ]
    : [
        { min: 0, max: 23200, rate: 0.10 },
        { min: 23200, max: 94300, rate: 0.12 },
        { min: 94300, max: 201050, rate: 0.22 },
        { min: 201050, max: 383900, rate: 0.24 },
        { min: 383900, max: 487450, rate: 0.32 },
        { min: 487450, max: 731200, rate: 0.35 },
        { min: 731200, max: Infinity, rate: 0.37 }
      ];
  
  let totalTax = 0;
  let remainingIncome = annualIncome;
  
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    
    const taxableInThisBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    totalTax += taxableInThisBracket * bracket.rate;
    remainingIncome -= taxableInThisBracket;
  }
  
  // Add estimated state tax and FICA
  const stateTaxRate = 0.05; // Rough average
  const ficaRate = 0.0765; // Social Security + Medicare
  
  const additionalTax = annualIncome * (stateTaxRate + ficaRate);
  totalTax += additionalTax;
  
  return Math.min(totalTax / annualIncome, 0.5); // Cap at 50%
}

/**
 * Calculate net income after taxes
 */
export function calculateNetIncome(annualIncome: number, filingStatus: 'single' | 'married' = 'single'): number {
  const effectiveTaxRate = estimateEffectiveTaxRate(annualIncome, filingStatus);
  return Math.round(annualIncome * (1 - effectiveTaxRate));
}