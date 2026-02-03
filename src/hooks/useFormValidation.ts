import { useState, useCallback, useMemo } from 'react';
import { EventType } from '@/types/events/base';
import { logger } from '@/utils/logger';

export interface ValidationRule {
  validate: (value: any, formData?: any) => string | null;
  message: string;
}

export interface ValidationRules {
  [field: string]: ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  hasErrors: boolean;
}

/**
 * Common validation rules for form fields
 */
export const commonValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined) {
        return message;
      }
      if (typeof value === 'string') {
        return value.trim() === '' ? message : null;
      }
      return null;
    },
    message
  }),

  positiveNumber: (message = 'Must be a positive number'): ValidationRule => ({
    validate: (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) || num <= 0 ? message : null;
    },
    message
  }),

  nonNegativeNumber: (message = 'Must be a non-negative number'): ValidationRule => ({
    validate: (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) || num < 0 ? message : null;
    },
    message
  }),

  validYear: (minYear = 2000, maxYear = 2100): ValidationRule => ({
    validate: (value) => {
      const year = typeof value === 'string' ? parseInt(value) : value;
      return isNaN(year) || year < minYear || year > maxYear 
        ? `Year must be between ${minYear} and ${maxYear}` 
        : null;
    },
    message: `Year must be between ${minYear} and ${maxYear}`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      const str = value?.toString() || '';
      return str.length > max ? (message || `Maximum ${max} characters allowed`) : null;
    },
    message: message || `Maximum ${max} characters allowed`
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      const str = value?.toString() || '';
      return str.length < min ? (message || `Minimum ${min} characters required`) : null;
    },
    message: message || `Minimum ${min} characters required`
  }),

  email: (message = 'Must be a valid email address'): ValidationRule => ({
    validate: (value) => {
      if (!value) return null; // Allow empty if not required
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(value) ? message : null;
    },
    message
  }),

  percentage: (message = 'Must be between 0 and 100'): ValidationRule => ({
    validate: (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) || num < 0 || num > 100 ? message : null;
    },
    message
  }),

  interestRate: (message = 'Must be between 0% and 50%'): ValidationRule => ({
    validate: (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) || num < 0 || num > 50 ? message : null;
    },
    message
  }),

  dateAfter: (startFieldName: string, message = 'End date must be after start date'): ValidationRule => ({
    validate: (value, formData) => {
      if (!value || !formData?.[startFieldName]) return null;
      return value <= formData[startFieldName] ? message : null;
    },
    message
  }),

  reasonableAmount: (maxAmount = 10000000, message?: string): ValidationRule => ({
    validate: (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return null; // Let other validators handle NaN
      return Math.abs(num) > maxAmount ? (message || `Amount seems unusually large (over $${maxAmount.toLocaleString()})`) : null;
    },
    message: message || `Amount seems unusually large`
  }),

  stockSymbol: (message = 'Must be a valid stock symbol (1-5 letters)'): ValidationRule => ({
    validate: (value) => {
      if (!value) return null; // Allow empty if not required
      const symbol = typeof value === 'string' ? value.trim() : '';
      if (!symbol) return null;
      const symbolRegex = /^[A-Z]{1,5}$/;
      return symbolRegex.test(symbol) ? null : message;
    },
    message
  }),

  futureDate: (message = 'Date must be in the future'): ValidationRule => ({
    validate: (value) => {
      if (!value) return null;
      const date = new Date(value);
      const now = new Date();
      return date <= now ? message : null;
    },
    message
  }),

  validAccountType: (validTypes: string[], message = 'Invalid account type'): ValidationRule => ({
    validate: (value) => {
      if (!value) return null;
      return !validTypes.includes(value) ? `${message}. Valid types: ${validTypes.join(', ')}` : null;
    },
    message
  }),

  reasonableSharePrice: (message = 'Share price seems unrealistic (should be $0.01-$10,000)'): ValidationRule => ({
    validate: (value) => {
      if (!value) return null;
      const price = parseFloat(value);
      if (isNaN(price)) return null;
      
      if (price < 0.01 || price > 10000) {
        return message;
      }
      return null;
    },
    message
  })
};

/**
 * Event-type specific validation rules
 */
export const eventValidationRules = {
  [EventType.INCOME]: {
    amount: [
      commonValidationRules.required('Annual income is required'),
      commonValidationRules.positiveNumber('Income must be greater than 0'),
      commonValidationRules.reasonableAmount(10000000, 'Income amount seems unusually high')
    ],
    company: [commonValidationRules.maxLength(100)],
    source: [commonValidationRules.maxLength(100)]
  },

  [EventType.RECURRING_EXPENSE]: {
    amount: [
      commonValidationRules.required('Amount is required'),
      commonValidationRules.positiveNumber('Amount must be greater than 0'),
      commonValidationRules.reasonableAmount(1000000, 'Monthly expense amount seems unusually high')
    ],
    startDateOffset: [commonValidationRules.required('Start date is required')],
    endDateOffset: [commonValidationRules.dateAfter('startDateOffset')]
  },

  [EventType.ONE_TIME_EVENT]: {
    amount: [
      commonValidationRules.required('Amount is required'),
      // Allow negative amounts for one-time events (expenses)
      commonValidationRules.reasonableAmount(10000000, 'Amount seems unusually large')
    ],
    monthOffset: [commonValidationRules.required('Date is required')]
  },

  [EventType.SCHEDULED_CONTRIBUTION]: {
    amount: [
      commonValidationRules.required('Contribution amount is required'),
      commonValidationRules.positiveNumber('Contribution must be greater than 0'),
      commonValidationRules.reasonableAmount(100000, 'Monthly contribution seems unusually high')
    ],
    accountType: [commonValidationRules.required('Account type is required')]
  },

  [EventType.LIABILITY_ADD]: {
    'liability.originalPrincipalAmount': [
      commonValidationRules.required('Original principal amount is required'),
      commonValidationRules.positiveNumber('Principal amount must be greater than 0')
    ],
    'liability.annualInterestRate': [
      commonValidationRules.required('Interest rate is required'),
      commonValidationRules.nonNegativeNumber('Interest rate cannot be negative'),
      commonValidationRules.interestRate('Interest rate must be between 0% and 50%')
    ],
    'liability.remainingTermInMonths': [
      commonValidationRules.required('Loan term is required'),
      commonValidationRules.positiveNumber('Loan term must be greater than 0')
    ],
    'liability.monthlyPayment': [
      commonValidationRules.required('Monthly payment is required'),
      commonValidationRules.positiveNumber('Monthly payment must be greater than 0')
    ]
  },

  [EventType.ROTH_CONVERSION]: {
    amount: [
      commonValidationRules.required('Conversion amount is required'),
      commonValidationRules.positiveNumber('Conversion amount must be greater than 0'),
      commonValidationRules.reasonableAmount(1000000, 'Conversion amount seems unusually high')
    ],
    monthOffset: [commonValidationRules.required('Conversion date is required')]
  },

  [EventType.INITIAL_STATE]: {
    currentAge: [
      commonValidationRules.required('Age is required'),
      commonValidationRules.positiveNumber('Age must be greater than 0')
    ],
    startYear: [
      commonValidationRules.required('Start year is required'),
      commonValidationRules.validYear(2020, 2100)
    ],
    initialMonth: [
      commonValidationRules.required('Start month is required')
    ],
    initialCash: [
      commonValidationRules.required('Initial cash is required'),
      commonValidationRules.nonNegativeNumber('Initial cash cannot be negative'),
      commonValidationRules.reasonableAmount(100000000, 'Initial cash amount seems unusually high')
    ],
    filingStatus: [
      commonValidationRules.required('Filing status is required')
    ]
  },

  // RSU Events
  [EventType.RSU_VESTING]: {
    description: [commonValidationRules.maxLength(100)],
    symbol: [commonValidationRules.stockSymbol(), commonValidationRules.maxLength(10, 'Stock symbol too long')],
    targetAccountType: [
      commonValidationRules.required('Target account is required'),
      commonValidationRules.validAccountType(['taxable', 'tax_deferred', 'roth'], 'Invalid account type for RSU vesting')
    ],
    shares: [
      commonValidationRules.positiveNumber('Number of shares must be greater than 0'),
      commonValidationRules.reasonableAmount(1000000, 'Number of shares seems unusually high')
    ],
    sharePrice: [
      commonValidationRules.reasonableSharePrice(),
      commonValidationRules.positiveNumber('Share price must be greater than 0')
    ],
    totalValue: [
      commonValidationRules.positiveNumber('Total value must be greater than 0'),
      commonValidationRules.reasonableAmount(100000000, 'Total value seems unusually high')
    ],
    taxWithholdingRate: [
      commonValidationRules.nonNegativeNumber('Tax withholding rate cannot be negative'),
      commonValidationRules.percentage('Tax withholding rate must be between 0% and 100%')
    ]
  },

  [EventType.RSU_SALE]: {
    description: [commonValidationRules.maxLength(100)],
    symbol: [commonValidationRules.stockSymbol(), commonValidationRules.maxLength(10, 'Stock symbol too long')],
    shares: [
      commonValidationRules.required('Number of shares is required'),
      commonValidationRules.positiveNumber('Number of shares must be greater than 0')
    ],
    salePrice: [
      commonValidationRules.required('Sale price is required'),
      commonValidationRules.reasonableSharePrice(),
      commonValidationRules.positiveNumber('Sale price must be greater than 0')
    ],
    costBasis: [
      commonValidationRules.reasonableSharePrice(),
      commonValidationRules.positiveNumber('Cost basis must be greater than 0')
    ]
  },

  // Strategic Events
  [EventType.STRATEGIC_TRADE]: {
    description: [commonValidationRules.maxLength(100)],
    tradeType: [commonValidationRules.required('Trade type is required')],
    amount: [
      commonValidationRules.required('Trade amount is required'),
      commonValidationRules.positiveNumber('Trade amount must be greater than 0'),
      commonValidationRules.reasonableAmount(10000000, 'Trade amount seems unusually high')
    ],
    targetAccountType: [
      commonValidationRules.required('Target account is required'),
      commonValidationRules.validAccountType(['cash', 'taxable', 'tax_deferred', 'roth'], 'Invalid account type for strategic trade')
    ],
    strategy: [commonValidationRules.maxLength(200, 'Strategy description too long')]
  },

  [EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION]: {
    description: [commonValidationRules.maxLength(100)],
    realizationType: [commonValidationRules.required('Realization type is required')],
    amount: [
      commonValidationRules.required('Amount is required'),
      commonValidationRules.positiveNumber('Amount must be greater than 0')
    ],
    sourceAccountType: [
      commonValidationRules.required('Source account is required'),
      commonValidationRules.validAccountType(['taxable'], 'Capital gains can only be realized from taxable accounts')
    ],
    estimatedTaxRate: [
      commonValidationRules.nonNegativeNumber('Tax rate cannot be negative'),
      commonValidationRules.percentage('Tax rate must be between 0% and 100%')
    ]
  },

  // Goal & Planning Events
  [EventType.GOAL_DEFINE]: {
    description: [commonValidationRules.maxLength(100)],
    goalType: [commonValidationRules.required('Goal type is required')],
    targetAmount: [
      commonValidationRules.required('Target amount is required'),
      commonValidationRules.positiveNumber('Target amount must be greater than 0'),
      commonValidationRules.reasonableAmount(100000000, 'Target amount seems unusually high')
    ],
    priority: [commonValidationRules.required('Priority is required')],
    timeline: [commonValidationRules.positiveNumber('Timeline must be greater than 0 years')]
  },

  [EventType.CONCENTRATION_RISK_ALERT]: {
    description: [commonValidationRules.maxLength(100)],
    assetType: [commonValidationRules.required('Asset type is required')],
    concentrationPercentage: [
      commonValidationRules.required('Concentration percentage is required'),
      commonValidationRules.positiveNumber('Percentage must be greater than 0'),
      commonValidationRules.percentage('Concentration must be between 0% and 100%')
    ],
    recommendedAction: [commonValidationRules.required('Recommended action is required')],
    riskLevel: [commonValidationRules.required('Risk level is required')]
  },

  [EventType.FINANCIAL_MILESTONE]: {
    description: [commonValidationRules.maxLength(100)],
    milestoneType: [commonValidationRules.required('Milestone type is required')],
    targetValue: [
      commonValidationRules.required('Target value is required'),
      commonValidationRules.positiveNumber('Target value must be greater than 0')
    ],
    currentValue: [
      commonValidationRules.nonNegativeNumber('Current value cannot be negative')
    ],
    targetDate: [commonValidationRules.required('Target date is required')]
  },

  // Life Events
  [EventType.CAREER_CHANGE]: {
    description: [commonValidationRules.maxLength(100)],
    changeType: [commonValidationRules.required('Change type is required')],
    incomeChange: [commonValidationRules.reasonableAmount(10000000, 'Income change seems unusually high')],
    newJobTitle: [commonValidationRules.maxLength(100, 'Job title too long')],
    newCompany: [commonValidationRules.maxLength(100, 'Company name too long')],
    transitionPeriod: [commonValidationRules.positiveNumber('Transition period must be greater than 0')]
  },

  [EventType.FAMILY_EVENT]: {
    description: [commonValidationRules.maxLength(100)],
    eventType: [commonValidationRules.required('Event type is required')],
    financialImpact: [commonValidationRules.reasonableAmount(1000000, 'Financial impact seems unusually high')],
    ongoingCosts: [commonValidationRules.nonNegativeNumber('Ongoing costs cannot be negative')],
    duration: [commonValidationRules.positiveNumber('Duration must be greater than 0')]
  },

  // Tax Strategy Events
  [EventType.TAX_LOSS_HARVESTING_SALE]: {
    description: [commonValidationRules.maxLength(100)],
    assetType: [commonValidationRules.required('Asset type is required')],
    lossAmount: [
      commonValidationRules.required('Loss amount is required'),
      commonValidationRules.positiveNumber('Loss amount must be greater than 0')
    ],
    sourceAccount: [
      commonValidationRules.required('Source account is required'),
      commonValidationRules.validAccountType(['taxable'], 'Tax loss harvesting only applies to taxable accounts')
    ],
    replacementStrategy: [commonValidationRules.maxLength(200, 'Strategy description too long')]
  }
};

/**
 * Custom hook for form validation with enhanced error handling
 */
export function useFormValidation(validationRules: ValidationRules) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const validateField = useCallback((fieldName: string, value: any, formData?: any): { error: string | null; warning: string | null } => {
    const rules = validationRules[fieldName];
    if (!rules) return { error: null, warning: null };

    let error: string | null = null;
    let warning: string | null = null;

    for (const rule of rules) {
      try {
        const result = rule.validate(value, formData);
        if (result) {
          // Check if this is a warning-level validation (for reasonable amounts, etc.)
          if (rule.message.includes('unusually') || rule.message.includes('seems')) {
            warning = result;
          } else {
            error = result;
            break; // Stop on first error
          }
        }
      } catch (validationError) {
        logger.error(`Validation error for field ${fieldName}: ${validationError}`);
        error = 'Validation failed unexpectedly';
        break;
      }
    }

    return { error, warning };
  }, [validationRules]);

  const validateForm = useCallback((formData: any): ValidationResult => {
    setIsValidating(true);
    const newErrors: Record<string, string> = {};
    const newWarnings: Record<string, string> = {};

    try {
      Object.keys(validationRules).forEach(fieldName => {
        const fieldValue = getNestedValue(formData, fieldName);
        const { error, warning } = validateField(fieldName, fieldValue, formData);
        
        if (error) {
          newErrors[fieldName] = error;
        }
        if (warning) {
          newWarnings[fieldName] = warning;
        }
      });

      setErrors(newErrors);
      setWarnings(newWarnings);
      setIsValidating(false);

      return {
        isValid: Object.keys(newErrors).length === 0,
        errors: newErrors,
        hasErrors: Object.keys(newErrors).length > 0
      };
    } catch (formValidationError) {
      logger.error(`Form validation failed: ${formValidationError}`);
      setIsValidating(false);
      
      // Add a general validation error
      const generalError = { general: 'Form validation failed. Please check your inputs.' };
      setErrors(generalError);
      
      return {
        isValid: false,
        errors: generalError,
        hasErrors: true
      };
    }
  }, [validationRules, validateField]);

  const validateSingleField = useCallback((fieldName: string, value: any, formData?: any) => {
    try {
      const { error, warning } = validateField(fieldName, value, formData);
      
      setErrors(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[fieldName] = error;
        } else {
          delete newErrors[fieldName];
        }
        return newErrors;
      });

      setWarnings(prev => {
        const newWarnings = { ...prev };
        if (warning) {
          newWarnings[fieldName] = warning;
        } else {
          delete newWarnings[fieldName];
        }
        return newWarnings;
      });

      return !error;
    } catch (fieldValidationError) {
      logger.error(`Single field validation failed for ${fieldName}: ${fieldValidationError}`);
      setErrors(prev => ({
        ...prev,
        [fieldName]: 'Validation failed for this field'
      }));
      return false;
    }
  }, [validateField]);

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setWarnings({});
    setTouchedFields(new Set());
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    setWarnings(prev => {
      const newWarnings = { ...prev };
      delete newWarnings[fieldName];
      return newWarnings;
    });
  }, []);

  const hasFieldError = useCallback((fieldName: string): boolean => {
    return !!errors[fieldName];
  }, [errors]);

  const hasFieldWarning = useCallback((fieldName: string): boolean => {
    return !!warnings[fieldName];
  }, [warnings]);

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return errors[fieldName];
  }, [errors]);

  const getFieldWarning = useCallback((fieldName: string): string | undefined => {
    return warnings[fieldName];
  }, [warnings]);

  const isFieldTouched = useCallback((fieldName: string): boolean => {
    return touchedFields.has(fieldName);
  }, [touchedFields]);

  const shouldShowError = useCallback((fieldName: string): boolean => {
    return hasFieldError(fieldName) && isFieldTouched(fieldName);
  }, [hasFieldError, isFieldTouched]);

  const shouldShowWarning = useCallback((fieldName: string): boolean => {
    return hasFieldWarning(fieldName) && isFieldTouched(fieldName) && !hasFieldError(fieldName);
  }, [hasFieldWarning, isFieldTouched, hasFieldError]);

  return {
    errors,
    warnings,
    isValidating,
    validateForm,
    validateSingleField,
    markFieldTouched,
    clearErrors,
    clearFieldError,
    hasFieldError,
    hasFieldWarning,
    getFieldError,
    getFieldWarning,
    isFieldTouched,
    shouldShowError,
    shouldShowWarning,
    validateField
  };
}

/**
 * Enhanced validation rules with business logic
 */
export const advancedValidationRules = {
  /**
   * Validate RSU fields have either shares+price OR totalValue
   */
  rsuValueRequired: (message = 'Either specify shares & price, or total value'): ValidationRule => ({
    validate: (value, formData) => {
      const hasShares = formData?.shares && formData?.sharePrice;
      const hasTotalValue = formData?.totalValue;
      
      if (!hasShares && !hasTotalValue) {
        return message;
      }
      return null;
    },
    message
  }),

  /**
   * Validate tax withholding is reasonable (10-50%)
   */
  reasonableTaxWithholding: (message = 'Tax withholding rate should typically be 10-50%'): ValidationRule => ({
    validate: (value) => {
      if (value === undefined || value === null || value === '') return null;
      const rate = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(rate)) return null;
      
      // Convert to percentage if it's a decimal
      const percentage = rate > 1 ? rate : rate * 100;
      
      if (percentage < 10 || percentage > 50) {
        return message;
      }
      return null;
    },
    message
  }),

  /**
   * Validate career change income is reasonable
   */
  reasonableIncomeChange: (message = 'Income change seems unrealistic (>500% increase or decrease)'): ValidationRule => ({
    validate: (value, formData) => {
      if (!value || !formData?.currentIncome) return null;
      
      const change = Math.abs(parseFloat(value));
      const current = parseFloat(formData.currentIncome);
      
      if (current > 0 && change > current * 5) {
        return message;
      }
      return null;
    },
    message
  }),

  /**
   * Validate concentration risk percentage is concerning
   */
  concentrationRiskThreshold: (message = 'Concentrations above 20% typically warrant attention'): ValidationRule => ({
    validate: (value) => {
      if (!value) return null;
      const percentage = parseFloat(value);
      
      if (percentage < 20) {
        return 'Concentration below 20% is generally acceptable';
      }
      return null;
    },
    message
  }),

  /**
   * Validate milestone timeline is achievable
   */
  achievableTimeline: (message = 'Timeline seems too aggressive for the target amount'): ValidationRule => ({
    validate: (value, formData) => {
      if (!value || !formData?.targetAmount || !formData?.currentValue) return null;
      
      const timeline = parseFloat(value); // years
      const target = parseFloat(formData.targetAmount);
      const current = parseFloat(formData.currentValue) || 0;
      const needed = target - current;
      
      if (needed > 0 && timeline > 0) {
        const requiredMonthly = needed / (timeline * 12);
        
        // Flag if requires more than $10k/month savings
        if (requiredMonthly > 10000) {
          return `Requires approximately $${Math.round(requiredMonthly).toLocaleString()}/month - timeline may be too aggressive`;
        }
      }
      return null;
    },
    message
  })
};

/**
 * Get nested value from object using dot notation with error handling
 */
function getNestedValue(obj: any, path: string): any {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  } catch (error) {
    logger.warn(`Failed to get nested value for path ${path}: ${error}`, 'GENERAL');
    return undefined;
  }
}

/**
 * Create event-specific validation rules
 */
export function createEventValidationRules(eventType: EventType): ValidationRules {
  return eventValidationRules[eventType] || {};
}

/**
 * Hook for event form validation with pre-configured rules
 */
export function useEventFormValidation(eventType: EventType) {
  // Memoize rules to prevent recreating validateForm on every render
  const rules = useMemo(() => createEventValidationRules(eventType), [eventType]);
  return useFormValidation(rules);
}

// =============================================================================
// CENTRALIZED EVENT VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate RSU Vesting Event
 */
export function validateRsuVestingEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.symbol?.trim()) {
    errors.push('Company symbol is required');
  }

  if (!event.shares && !event.totalValue) {
    errors.push('Either shares or total value must be specified');
  }

  if (event.shares && event.shares <= 0) {
    errors.push('Shares must be positive');
  }

  if (event.totalValue && event.totalValue <= 0) {
    errors.push('Total value must be positive');
  }

  if (event.taxWithholdingRate && (event.taxWithholdingRate < 0 || event.taxWithholdingRate > 1)) {
    errors.push('Tax withholding rate must be between 0 and 1');
  }

  return errors;
}

/**
 * Validate RSU Sale Event
 */
export function validateRsuSaleEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.symbol?.trim()) {
    errors.push('Company symbol is required');
  }

  if (!event.shares && !event.totalProceeds) {
    errors.push('Either shares or total proceeds must be specified');
  }

  if (event.shares && event.shares <= 0) {
    errors.push('Shares must be positive');
  }

  if (event.totalProceeds && event.totalProceeds <= 0) {
    errors.push('Total proceeds must be positive');
  }

  return errors;
}

/**
 * Validate 529 Contribution Event
 */
export function validateFiveTwoNineContributionEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.planName?.trim()) {
    errors.push('Plan name is required');
  }

  if (event.contributionAmount <= 0) {
    errors.push('Contribution amount must be positive');
  }

  if (event.stateTaxDeduction && event.stateTaxDeduction < 0) {
    errors.push('State tax deduction cannot be negative');
  }

  return errors;
}

/**
 * Validate 529 Withdrawal Event
 */
export function validateFiveTwoNineWithdrawalEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.planName?.trim()) {
    errors.push('Plan name is required');
  }

  if (event.withdrawalAmount <= 0) {
    errors.push('Withdrawal amount must be positive');
  }

  if (event.withdrawalPurpose === 'qualified_education' && !event.educationExpenseType) {
    errors.push('Education expense type is required for qualified withdrawals');
  }

  return errors;
}

/**
 * Validate Tuition Payment Event
 */
export function validateTuitionPaymentEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.studentName?.trim()) {
    errors.push('Student name is required');
  }

  if (!event.institutionName?.trim()) {
    errors.push('Institution name is required');
  }

  if (event.tuitionAmount <= 0) {
    errors.push('Tuition amount must be positive');
  }

  if (event.fiveTwoNineAmount && event.fiveTwoNineAmount > event.tuitionAmount) {
    errors.push('529 plan amount cannot exceed tuition amount');
  }

  return errors;
}

/**
 * Validate Business Income Event
 */
export function validateBusinessIncomeEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.businessName?.trim()) {
    errors.push('Business name is required');
  }

  if (event.incomeAmount <= 0) {
    errors.push('Income amount must be positive');
  }

  if (event.businessExpenses && event.businessExpenses < 0) {
    errors.push('Business expenses cannot be negative');
  }

  if (event.homeOfficeDeduction && event.homeOfficeDeduction < 0) {
    errors.push('Home office deduction cannot be negative');
  }

  return errors;
}

/**
 * Validate Quarterly Estimated Tax Payment Event
 */
export function validateQuarterlyEstimatedTaxPaymentEvent(event: any): string[] {
  const errors: string[] = [];

  if (event.paymentAmount <= 0) {
    errors.push('Payment amount must be positive');
  }

  if (event.quarter < 1 || event.quarter > 4) {
    errors.push('Quarter must be between 1 and 4');
  }

  if (event.taxYear < 2020 || event.taxYear > 2050) {
    errors.push('Tax year must be reasonable');
  }

  if (event.federalAmount && event.federalAmount < 0) {
    errors.push('Federal amount cannot be negative');
  }

  if (event.stateAmount && event.stateAmount < 0) {
    errors.push('State amount cannot be negative');
  }

  return errors;
}

/**
 * Validate Annual Gift Event
 */
export function validateAnnualGiftEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.recipientName?.trim()) {
    errors.push('Recipient name is required');
  }

  if (event.giftAmount <= 0) {
    errors.push('Gift amount must be positive');
  }

  if (event.annualExclusionAmount && event.annualExclusionAmount < 0) {
    errors.push('Annual exclusion amount cannot be negative');
  }

  return errors;
}

/**
 * Validate Large Gift Event
 */
export function validateLargeGiftEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.recipientName?.trim()) {
    errors.push('Recipient name is required');
  }

  if (event.giftAmount <= 0) {
    errors.push('Gift amount must be positive');
  }

  if (event.exemptionAmountUsed < 0) {
    errors.push('Exemption amount used cannot be negative');
  }

  if (event.exemptionAmountUsed > event.giftAmount) {
    errors.push('Exemption amount used cannot exceed gift amount');
  }

  if (event.discountPercentage && (event.discountPercentage < 0 || event.discountPercentage > 1)) {
    errors.push('Discount percentage must be between 0 and 1');
  }

  return errors;
}

/**
 * Validate Inheritance Event
 */
export function validateInheritanceEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.decedentName?.trim()) {
    errors.push('Decedent name is required');
  }

  if (event.inheritanceAmount <= 0) {
    errors.push('Inheritance amount must be positive');
  }

  if (event.originalBasis && event.originalBasis < 0) {
    errors.push('Original basis cannot be negative');
  }

  if (event.steppedUpBasis && event.steppedUpBasis < 0) {
    errors.push('Stepped-up basis cannot be negative');
  }

  return errors;
}

/**
 * Validate Goal Define Event
 */
export function validateGoalDefineEvent(event: any): string[] {
  const errors: string[] = [];

  if (event.targetAmount <= 0) {
    errors.push('Target amount must be positive');
  }

  if (event.targetDateOffset <= 0) {
    errors.push('Target date must be in the future');
  }

  if (event.minimumAmount && event.minimumAmount >= event.targetAmount) {
    errors.push('Minimum amount must be less than target amount');
  }

  if (event.maximumAmount && event.maximumAmount <= event.targetAmount) {
    errors.push('Maximum amount must be greater than target amount');
  }

  if (event.customInflationRate && event.customInflationRate < 0) {
    errors.push('Custom inflation rate cannot be negative');
  }

  if (event.fundingSources) {
    const totalMaxPercentage = event.fundingSources.reduce((sum: number, source: any) =>
      sum + (source.maxPercentage || 0), 0);
    if (totalMaxPercentage > 1) {
      errors.push('Total maximum percentage from all funding sources cannot exceed 100%');
    }
  }

  return errors;
}

/**
 * Validate Concentration Risk Alert Event
 */
export function validateConcentrationRiskAlertEvent(event: any): string[] {
  const errors: string[] = [];

  if (!event.assetIdentifier?.trim()) {
    errors.push('Asset identifier is required');
  }

  if (event.thresholdPercentage <= 0 || event.thresholdPercentage > 1) {
    errors.push('Threshold percentage must be between 0 and 1');
  }

  if (event.targetPercentageAfterRebalance &&
      (event.targetPercentageAfterRebalance <= 0 || event.targetPercentageAfterRebalance >= event.thresholdPercentage)) {
    errors.push('Target percentage after rebalance must be positive and less than threshold');
  }

  if (event.checkFrequencyMonths <= 0) {
    errors.push('Check frequency must be positive');
  }

  return errors;
}

/**
 * Validate Financial Milestone Event
 */
export function validateFinancialMilestoneEvent(event: any): string[] {
  const errors: string[] = [];

  if (event.targetValue <= 0) {
    errors.push('Target value must be positive');
  }

  if (event.evaluationDateOffset <= 0) {
    errors.push('Evaluation date must be in the future');
  }

  if (event.tolerancePercentage && (event.tolerancePercentage < 0 || event.tolerancePercentage > 1)) {
    errors.push('Tolerance percentage must be between 0 and 1');
  }

  return errors;
}
