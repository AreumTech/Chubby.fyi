/**
 * Comprehensive Event Validation Service
 * 
 * Validates all 42+ event types for proper frequency normalization
 * and account targeting to prevent the inflation bug.
 */

import type { FinancialEvent } from '@/types';
import { normalizeToMonthly, validateConversion, type AmountWithFrequency } from './frequencyNormalization';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedAmount?: number;
  recommendedFrequency?: string;
}

/**
 * Comprehensive validation for all financial events
 */
export function validateFinancialEvent(event: FinancialEvent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic required fields
  if (!event.id) errors.push('Event ID is required');
  if (!event.type) errors.push('Event type is required');

  // Amount validation
  const amountValidation = validateEventAmount(event);
  errors.push(...amountValidation.errors);
  warnings.push(...amountValidation.warnings);

  // Frequency validation
  const frequencyValidation = validateEventFrequency(event);
  errors.push(...frequencyValidation.errors);
  warnings.push(...frequencyValidation.warnings);

  // Account target validation
  const accountValidation = validateEventAccountTarget(event);
  errors.push(...accountValidation.errors);
  warnings.push(...accountValidation.warnings);

  // Type-specific validation
  const typeValidation = validateEventTypeSpecific(event);
  errors.push(...typeValidation.errors);
  warnings.push(...typeValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedAmount: amountValidation.normalizedAmount,
    recommendedFrequency: frequencyValidation.recommendedFrequency
  };
}

/**
 * Validate event amount and frequency conversion
 */
function validateEventAmount(event: FinancialEvent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let normalizedAmount: number | undefined;

  // Check if event has amount
  let amount: number | undefined;
  let frequency: string | undefined;

  if ('amount' in event && event.amount !== undefined) {
    if (typeof event.amount === 'string') {
      const parsed = parseFloat(event.amount);
      if (isNaN(parsed)) {
        errors.push(`Invalid amount: "${event.amount}"`);
        return { isValid: false, errors, warnings };
      }
      amount = parsed;
    } else if (typeof event.amount === 'number') {
      amount = event.amount;
    }

    frequency = 'frequency' in event ? event.frequency : undefined;
  } else if ('annualAmount' in event && event.annualAmount !== undefined) {
    amount = event.annualAmount;
    frequency = 'annually';
  }

  // Some events don't have amounts (planning events)
  if (amount === undefined) {
    if (requiresAmount(event.type)) {
      errors.push(`Event type "${event.type}" requires an amount`);
    }
    return { isValid: errors.length === 0, errors, warnings };
  }

  // Validate amount is realistic
  if (!isFinite(amount) || isNaN(amount)) {
    errors.push(`Amount must be a finite number: ${amount}`);
    return { isValid: false, errors, warnings };
  }

  // Check for extremely large amounts that might indicate unit confusion
  const absAmount = Math.abs(amount);
  if (frequency === 'monthly' && absAmount > 1_000_000) {
    warnings.push(`Very large monthly amount: $${absAmount.toLocaleString()}. Is this correct?`);
  }
  if (frequency === 'annually' && absAmount > 10_000_000) {
    warnings.push(`Very large annual amount: $${absAmount.toLocaleString()}. Is this correct?`);
  }

  // Test frequency conversion
  if (frequency) {
    try {
      const amountWithFreq: AmountWithFrequency = { amount, frequency: frequency as any };
      const isValid = validateConversion(amountWithFreq);
      if (!isValid) {
        errors.push('Frequency conversion validation failed');
      } else {
        const normalized = normalizeToMonthly(amountWithFreq);
        normalizedAmount = normalized.monthlyAmount;
        
        // Check if normalized amount is realistic
        if (Math.abs(normalizedAmount) > 1_000_000) {
          warnings.push(`Large normalized monthly amount: $${normalizedAmount.toLocaleString()}`);
        }
      }
    } catch (error) {
      errors.push(`Frequency conversion failed: ${error}`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings, normalizedAmount };
}

/**
 * Validate event frequency
 */
function validateEventFrequency(event: FinancialEvent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let recommendedFrequency: string | undefined;

  const frequency = 'frequency' in event ? event.frequency : undefined;
  
  // Get recommended frequency for this event type
  const recommended = getRecommendedFrequency(event.type);
  if (recommended) {
    recommendedFrequency = recommended;
    
    if (frequency && frequency !== recommended) {
      warnings.push(`Event type "${event.type}" typically uses "${recommended}" frequency, but "${frequency}" specified`);
    }
  }

  // Validate frequency is supported
  const supportedFrequencies = ['monthly', 'annually', 'weekly', 'biweekly', 'quarterly', 'semiannually', 'one-time'];
  if (frequency && !supportedFrequencies.includes(frequency)) {
    errors.push(`Unsupported frequency: "${frequency}". Supported: ${supportedFrequencies.join(', ')}`);
  }

  return { isValid: errors.length === 0, errors, warnings, recommendedFrequency };
}

/**
 * Validate event account targeting
 */
function validateEventAccountTarget(event: FinancialEvent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const targetAccountType = 'targetAccountType' in event ? event.targetAccountType : undefined;

  // Events that require explicit account targeting
  if (event.type === 'SCHEDULED_CONTRIBUTION' && !targetAccountType) {
    errors.push('SCHEDULED_CONTRIBUTION events must specify targetAccountType');
  }

  // Validate account type is supported
  const supportedAccountTypes = ['cash', 'taxable', 'tax_deferred', 'roth', '401k', 'rothIra', 'ira', '529'];
  if (targetAccountType && !supportedAccountTypes.includes(targetAccountType)) {
    warnings.push(`Uncommon account type: "${targetAccountType}"`);
  }

  // Account type compatibility warnings
  if (event.type === 'ROTH_CONVERSION' && targetAccountType && !['roth', 'rothIra'].includes(targetAccountType)) {
    warnings.push('ROTH_CONVERSION typically targets roth or rothIra accounts');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Type-specific validation
 */
function validateEventTypeSpecific(event: FinancialEvent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (event.type) {
    case 'QUARTERLY_ESTIMATED_TAX_PAYMENT':
      if ('frequency' in event && event.frequency !== 'quarterly') {
        warnings.push('QUARTERLY_ESTIMATED_TAX_PAYMENT should use quarterly frequency');
      }
      break;

    case 'REQUIRED_MINIMUM_DISTRIBUTION':
      if ('frequency' in event && event.frequency !== 'annually') {
        warnings.push('REQUIRED_MINIMUM_DISTRIBUTION should use annually frequency');
      }
      break;

    case 'ONE_TIME_EVENT':
      if ('frequency' in event && event.frequency !== 'one-time') {
        warnings.push('ONE_TIME_EVENT should use one-time frequency');
      }
      break;

    case 'GOAL_DEFINE':
      // Goals don't need amounts, but if they have them, they should be target amounts
      if ('amount' in event && event.amount && event.amount < 1000) {
        warnings.push('Goal amounts are typically larger (target amounts)');
      }
      break;

    case 'SCHEDULED_CONTRIBUTION':
      // Validate contribution limits
      if ('amount' in event && event.amount) {
        const amount = typeof event.amount === 'string' ? parseFloat(event.amount) : event.amount;
        const frequency = 'frequency' in event ? event.frequency : 'monthly';
        
        let annualAmount = amount;
        if (frequency === 'monthly') annualAmount = amount * 12;
        
        // 401k contribution limit check (2025 limits)
        const targetAccount = 'targetAccountType' in event ? event.targetAccountType : undefined;
        if (targetAccount === '401k' || targetAccount === 'tax_deferred') {
          if (annualAmount > 23500) {
            warnings.push(`401k contribution exceeds 2025 limit: $${annualAmount.toLocaleString()}`);
          }
        }
        
        // IRA contribution limit check
        if (targetAccount === 'ira' || targetAccount === 'roth' || targetAccount === 'rothIra') {
          if (annualAmount > 7000) {
            warnings.push(`IRA contribution exceeds 2025 limit: $${annualAmount.toLocaleString()}`);
          }
        }
      }
      break;
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Check if event type requires an amount
 */
function requiresAmount(eventType: string): boolean {
  const noAmountEvents = [
    'GOAL_DEFINE',
    'FINANCIAL_MILESTONE', 
    'CONCENTRATION_RISK_ALERT',
    'INITIAL_STATE',
    'STRATEGY_ASSET_ALLOCATION_SET',
    'STRATEGY_REBALANCING_RULE_SET'
  ];
  
  return !noAmountEvents.includes(eventType);
}

/**
 * Get recommended frequency for event type
 */
function getRecommendedFrequency(eventType: string): string | undefined {
  const frequencyMap: Record<string, string> = {
    'INCOME': 'annually',
    'RECURRING_EXPENSE': 'monthly',
    'SCHEDULED_CONTRIBUTION': 'monthly',
    'QUARTERLY_ESTIMATED_TAX_PAYMENT': 'quarterly',
    'REQUIRED_MINIMUM_DISTRIBUTION': 'annually',
    'ONE_TIME_EVENT': 'one-time',
    'GOAL_DEFINE': 'one-time',
    'REAL_ESTATE_PURCHASE': 'one-time',
    'REAL_ESTATE_SALE': 'one-time',
    'ROTH_CONVERSION': 'annually',
    'LIFE_INSURANCE_PREMIUM': 'monthly',
    'FIVE_TWO_NINE_CONTRIBUTION': 'annually'
  };
  
  return frequencyMap[eventType];
}

/**
 * Validate a batch of events for common issues
 */
export function validateEventBatch(events: FinancialEvent[]): {
  overallValid: boolean;
  eventResults: Array<{ event: FinancialEvent; validation: ValidationResult }>;
  batchWarnings: string[];
} {
  const eventResults = events.map(event => ({
    event,
    validation: validateFinancialEvent(event)
  }));

  const batchWarnings: string[] = [];
  
  // Check for common batch issues
  const incomeEvents = events.filter(e => e.type === 'INCOME');
  const expenseEvents = events.filter(e => e.type === 'RECURRING_EXPENSE');
  
  if (incomeEvents.length === 0) {
    batchWarnings.push('No income events found - simulation may not be realistic');
  }
  
  if (expenseEvents.length === 0) {
    batchWarnings.push('No expense events found - simulation may not be realistic');
  }

  // Check for duplicate IDs
  const ids = events.map(e => e.id).filter(id => id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    batchWarnings.push(`Duplicate event IDs found: ${duplicateIds.join(', ')}`);
  }

  const overallValid = eventResults.every(r => r.validation.isValid);

  return {
    overallValid,
    eventResults,
    batchWarnings
  };
}