/**
 * Event Validation Pipeline
 * Prevents bugs like the 401k issue through comprehensive runtime validation
 */

import type { FinancialEvent } from '@/types';
import { isValidAccountType, normalizeAccountType, type StandardAccountType } from '../types/accountTypes';
import { validateConversion } from './frequencyNormalization';
import { getEventAmount } from './eventFieldAccessor';

export interface ValidationError {
  eventId: string;
  eventName: string;
  errorType: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  fix?: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    totalEvents: number;
    validEvents: number;
    fixedMappings: number;
    unknownAccounts: number;
  };
}

/**
 * Comprehensive validation pipeline for financial events
 * FAIL FAST: Critical errors stop processing
 * WARN LOUD: Warnings are logged prominently
 * FIX SMART: Auto-fix known issues with logging
 */
export function validateEventPipeline(events: FinancialEvent[]): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let fixedMappings = 0;
  let unknownAccounts = 0;

  for (const event of events) {
    // === CRITICAL VALIDATIONS (will throw) ===
    
    // 1. Required fields
    if (!event.id) {
      errors.push({
        eventId: event.id || 'UNKNOWN',
        eventName: event.name || 'UNNAMED',
        errorType: 'CRITICAL',
        message: 'Missing required field: id'
      });
      continue;
    }

    if (!event.type) {
      errors.push({
        eventId: event.id,
        eventName: event.name || 'UNNAMED',
        errorType: 'CRITICAL',
        message: 'Missing required field: type'
      });
      continue;
    }

    // 2. Amount validation
    const amountValidation = validateEventAmount(event);
    errors.push(...amountValidation.filter(e => e.errorType === 'CRITICAL'));
    warnings.push(...amountValidation.filter(e => e.errorType === 'WARNING'));

    // 3. Account type validation (THE BIG ONE)
    const accountValidation = validateEventAccount(event);
    errors.push(...accountValidation.errors);
    warnings.push(...accountValidation.warnings);
    fixedMappings += accountValidation.fixedMappings;
    unknownAccounts += accountValidation.unknownAccounts;

    // 4. Event-specific validations
    const specificValidation = validateEventSpecific(event);
    errors.push(...specificValidation.filter(e => e.errorType === 'CRITICAL'));
    warnings.push(...specificValidation.filter(e => e.errorType === 'WARNING'));
  }

  const valid = errors.length === 0;
  
  return {
    valid,
    errors,
    warnings,
    stats: {
      totalEvents: events.length,
      validEvents: events.length - errors.length,
      fixedMappings,
      unknownAccounts
    }
  };
}

/**
 * Validate event amount and frequency conversion
 */
function validateEventAmount(event: FinancialEvent): ValidationError[] {
  const issues: ValidationError[] = [];

  // Events that don't require any cash flow amount (tracking/planning events)
  const noAmountRequired = [
    'GOAL_DEFINE',
    'FINANCIAL_MILESTONE',
    'INITIAL_STATE',
    'REAL_ESTATE_PURCHASE',
    'REAL_ESTATE_APPRECIATION', // Tracking event
    'CONCENTRATION_RISK_ALERT',
    'STRATEGY_ASSET_ALLOCATION_SET',
    'STRATEGY_REBALANCING_RULE_SET',
    'LIFECYCLE_ADJUSTMENT',
    'STRATEGY_POLICY',     // Meta-event for timeline visualization
    'STRATEGY_EXECUTION'   // Strategy action tracking
  ];

  const requiresAmount = !noAmountRequired.includes(event.type);

  let amount: number | undefined;
  let frequency: string | undefined;

  // Use type-safe event field accessor for amount extraction
  const extracted = getEventAmount(event);
  if (extracted !== null && extracted.source !== 'none') {
    amount = extracted.amount;
    frequency = extracted.frequency;
  }

  if (requiresAmount && amount === undefined) {
    issues.push({
      eventId: event.id,
      eventName: event.name,
      errorType: 'CRITICAL',
      message: `Event type "${event.type}" requires an amount but none found`
    });
    return issues;
  }
  
  if (amount !== undefined) {
    // Validate amount is realistic
    if (!isFinite(amount) || isNaN(amount)) {
      issues.push({
        eventId: event.id,
        eventName: event.name,
        errorType: 'CRITICAL',
        message: `Amount must be finite number, got: ${amount}`
      });
      return issues;
    }
    
    // Check for suspiciously large amounts
    const absAmount = Math.abs(amount);
    if (frequency === 'monthly' && absAmount > 500000) {
      issues.push({
        eventId: event.id,
        eventName: event.name,
        errorType: 'WARNING',
        message: `Very large monthly amount: $${absAmount.toLocaleString()}. Check if this should be annual?`,
        fix: 'Consider using frequency: "annually" if this is a yearly amount'
      });
    }
    
    if (frequency === 'annually' && absAmount > 50000000) {
      issues.push({
        eventId: event.id,
        eventName: event.name,
        errorType: 'WARNING',
        message: `Extremely large annual amount: $${absAmount.toLocaleString()}. Verify this is correct.`
      });
    }
    
    // Test frequency conversion accuracy
    if (frequency) {
      try {
        const isValid = validateConversion({ amount: absAmount, frequency: frequency as any });
        if (!isValid) {
          issues.push({
            eventId: event.id,
            eventName: event.name,
            errorType: 'WARNING',
            message: 'Frequency conversion may lose precision'
          });
        }
      } catch (error) {
        issues.push({
          eventId: event.id,
          eventName: event.name,
          errorType: 'CRITICAL',
          message: `Frequency conversion failed: ${error}`
        });
      }
    }
  }
  
  return issues;
}

/**
 * Validate event account specifications
 * THIS IS THE KEY FUNCTION THAT PREVENTS 401K BUGS
 */
function validateEventAccount(event: FinancialEvent): {
  errors: ValidationError[];
  warnings: ValidationError[];
  fixedMappings: number;
  unknownAccounts: number;
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let fixedMappings = 0;
  let unknownAccounts = 0;
  
  // Events that MUST have account specification
  const requiresAccount = ['SCHEDULED_CONTRIBUTION'].includes(event.type);
  
  // Check for account specification
  const hasTargetAccount = 'targetAccountType' in event && event.targetAccountType;
  const hasLegacyAccount = 'accountType' in event && event.accountType;
  
  if (requiresAccount && !hasTargetAccount && !hasLegacyAccount) {
    errors.push({
      eventId: event.id,
      eventName: event.name,
      errorType: 'CRITICAL',
      message: `Event type "${event.type}" requires account specification`,
      fix: 'Add targetAccountType: "tax_deferred" | "roth" | "taxable" | "cash" | "529"'
    });
    return { errors, warnings, fixedMappings, unknownAccounts };
  }
  
  // Validate account types if present
  if (hasTargetAccount) {
    const targetAccount = (event as any).targetAccountType;
    if (!isValidAccountType(targetAccount)) {
      errors.push({
        eventId: event.id,
        eventName: event.name,
        errorType: 'CRITICAL',
        message: `Invalid targetAccountType: "${targetAccount}"`,
        fix: 'Use one of: cash, taxable, tax_deferred, roth, 529'
      });
      unknownAccounts++;
    }
  }
  
  if (hasLegacyAccount) {
    const legacyAccount = (event as any).accountType;
    if (!isValidAccountType(legacyAccount)) {
      errors.push({
        eventId: event.id,
        eventName: event.name,
        errorType: 'CRITICAL',
        message: `Invalid accountType: "${legacyAccount}"`,
        fix: 'Use one of: cash, taxable, tax_deferred, roth, 529, 401k, rothIra, ira'
      });
      unknownAccounts++;
    } else {
      // Check if mapping will occur
      const normalized = normalizeAccountType(legacyAccount as any);
      if (legacyAccount !== normalized) {
        warnings.push({
          eventId: event.id,
          eventName: event.name,
          errorType: 'INFO',
          message: `Legacy account type "${legacyAccount}" will be mapped to "${normalized}"`,
          fix: `Consider updating to targetAccountType: "${normalized}"`
        });
        fixedMappings++;
      }
    }
  }
  
  // Warn if both target and legacy exist (will use targetAccountType)
  if (hasTargetAccount && hasLegacyAccount) {
    warnings.push({
      eventId: event.id,
      eventName: event.name || 'UNNAMED',
      errorType: 'INFO',
      message: 'Event has both targetAccountType and accountType - targetAccountType will be used',
      fix: 'Remove accountType for cleaner data'
    });
  }
  
  return { errors, warnings, fixedMappings, unknownAccounts };
}

/**
 * Event-specific validation rules
 */
function validateEventSpecific(event: FinancialEvent): ValidationError[] {
  const issues: ValidationError[] = [];
  
  switch (event.type) {
    case 'REAL_ESTATE_PURCHASE':
      // Real estate purchases have nested financial information
      if ('property' in event && event.property && typeof event.property === 'object') {
        const property = event.property as any;
        if (!property.purchasePrice || typeof property.purchasePrice !== 'number') {
          issues.push({
            eventId: event.id,
            eventName: event.name,
            errorType: 'CRITICAL',
            message: 'REAL_ESTATE_PURCHASE events must have property.purchasePrice'
          });
        }
      } else {
        issues.push({
          eventId: event.id,
          eventName: event.name,
          errorType: 'CRITICAL',
          message: 'REAL_ESTATE_PURCHASE events must have a property object'
        });
      }
      break;

    case 'SCHEDULED_CONTRIBUTION':
      // Validate contribution limits
      if ('amount' in event && event.amount) {
        const amount = typeof event.amount === 'string' ? parseFloat(event.amount) : event.amount;
        const frequency = 'frequency' in event ? event.frequency : 'monthly';
        
        let annualAmount = amount;
        if (frequency === 'monthly') annualAmount = amount * 12;
        
        // Get account type for limit checking
        const accountType = 'targetAccountType' in event ? event.targetAccountType : 
                          'accountType' in event ? event.accountType : undefined;
        
        if (accountType === 'tax_deferred' || accountType === '401k') {
          if (annualAmount > 23500) {
            issues.push({
              eventId: event.id,
              eventName: event.name,
              errorType: 'WARNING',
              message: `401k contribution $${annualAmount.toLocaleString()} exceeds 2025 limit of $23,500`
            });
          }
        }
        
        if (accountType === 'roth' || accountType === 'rothIra') {
          if (annualAmount > 7000) {
            issues.push({
              eventId: event.id,
              eventName: event.name,
              errorType: 'WARNING',
              message: `Roth IRA contribution $${annualAmount.toLocaleString()} exceeds 2024 limit of $7,000`
            });
          }
        }
      }
      break;
      
    case 'QUARTERLY_ESTIMATED_TAX_PAYMENT':
      if ('frequency' in event && event.frequency !== 'quarterly') {
        issues.push({
          eventId: event.id,
          eventName: event.name,
          errorType: 'WARNING',
          message: 'Quarterly tax payments should use frequency: "quarterly"'
        });
      }
      break;
  }
  
  return issues;
}

