/**
 * Validation Service - Runtime JSON Schema validation using AJV
 * 
 * This service provides runtime validation for critical data structures
 * using the existing JSON schemas to ensure data integrity at runtime.
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import { FinancialEvent } from '../types';
import { AnyDynamicEvent, DynamicEventType } from '../types/events/dynamicEvents';
import { logger } from '@/utils/logger';

// Define schemas inline to avoid TypeScript import issues
const financialEventSchema = {
  type: "object",
  required: ["id", "type", "description", "priority", "monthOffset"],
  properties: {
    id: { type: "string" },
    type: {
      type: "string",
      enum: [
        // Core financial events
        "INCOME",
        "SCHEDULED_CONTRIBUTION",
        "RECURRING_EXPENSE",
        "ONE_TIME_EVENT",

        // Debt management events
        "LIABILITY_ADD",
        "LIABILITY_PAYMENT",
        "DEBT_PAYMENT",
        "DEBT_CONSOLIDATION",
        "REFINANCE",
        "HOME_EQUITY_LOAN",

        // Retirement events
        "SOCIAL_SECURITY_INCOME",
        "PENSION_INCOME",
        "ANNUITY_PAYMENT",
        "REQUIRED_MINIMUM_DISTRIBUTION",
        "WITHDRAWAL",
        "ACCOUNT_TRANSFER",

        // Tax strategies
        "ROTH_CONVERSION",
        "MEGA_BACKDOOR_ROTH",
        "QUALIFIED_CHARITABLE_DISTRIBUTION",

        // Healthcare
        "HEALTHCARE_COST",

        // Insurance events
        "LIFE_INSURANCE_PREMIUM",
        "LIFE_INSURANCE_PAYOUT",
        "DISABILITY_INSURANCE_PREMIUM",
        "DISABILITY_INSURANCE_PAYOUT",
        "LONG_TERM_CARE_INSURANCE_PREMIUM",
        "LONG_TERM_CARE_PAYOUT",

        // Investment strategies
        "STRATEGY_ASSET_ALLOCATION_SET",
        "STRATEGY_REBALANCING_RULE_SET",
        "REBALANCE_PORTFOLIO",
        "TAX_LOSS_HARVESTING_SALE",
        "TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE",
        "STRATEGIC_CAPITAL_GAINS_REALIZATION",

        // Strategic trade management
        "STRATEGIC_TRADE",
        "ADJUST_CASH_RESERVE_SELL_ASSETS",
        "ADJUST_CASH_RESERVE_BUY_ASSETS",

        // Equity compensation
        "RSU_VESTING",
        "RSU_SALE",

        // Enhanced income types
        "RENTAL_INCOME",
        "DIVIDEND_INCOME",

        // Real Estate events
        "REAL_ESTATE_PURCHASE",
        "REAL_ESTATE_SALE",

        // Education events
        "FIVE_TWO_NINE_CONTRIBUTION",
        "FIVE_TWO_NINE_WITHDRAWAL",
        "TUITION_PAYMENT",

        // Business & Self-Employment events
        "BUSINESS_INCOME",
        "QUARTERLY_ESTIMATED_TAX_PAYMENT",

        // Estate & Gifting events
        "ANNUAL_GIFT",
        "LARGE_GIFT",
        "INHERITANCE",

        // Risk management
        "CONCENTRATION_RISK_ALERT",

        // Planning
        "GOAL_DEFINE",
        "FINANCIAL_MILESTONE",
        "INITIAL_STATE",

        // Dynamic Events - Smart financial automation
        "CONDITIONAL_CONTRIBUTION",
        "WATERFALL_ALLOCATION",
        "PERCENTAGE_CONTRIBUTION",
        "SMART_DEBT_PAYMENT",
        "GOAL_DRIVEN_CONTRIBUTION",
        "EMERGENCY_FUND_MAINTENANCE",

        // Advanced Dynamic Events - Portfolio management and lifecycle
        "AUTOMATIC_REBALANCING",
        "INCOME_RESPONSIVE_SAVINGS",
        "LIFECYCLE_ADJUSTMENT",
        "TAX_LOSS_HARVESTING",

        // Advanced Investment Strategy Events
        "LEVERAGED_INVESTMENT",
        "BRIDGE_STRATEGY",
        "MORTGAGE_PAYOFF",

        // Lifecycle Transition Events
        "RELOCATION",
        "REAL_ESTATE_APPRECIATION",
        "PROPERTY_MAINTENANCE",
        "HEALTHCARE_TRANSITION",
        "CAREER_CHANGE",

        // Major Purchase Events
        "VEHICLE_PURCHASE",
        "HOME_IMPROVEMENT",

        // Professional Development Events
        "EDUCATION_EXPENSE",

        // Family Events
        "FAMILY_EVENT",

        // Legacy event types for backward compatibility
        "MORTGAGE_ORIGINATION",
        "MORTGAGE_PAYMENT",
        "STRATEGY_TAX_LOSS_HARVESTING_SET",
        "STRATEGY_ROTH_CONVERSION_LADDER_SET",
        "STRATEGY_GUARDRAILS_SET",

        // Strategy Policy Events - Duration-based strategies
        "STRATEGY_POLICY",
        "STRATEGY_EXECUTION"
      ]
    },
    description: { type: "string" },
    name: { type: "string" },
    priority: { type: "integer" },
    monthOffset: { type: "integer", minimum: 0 },
    amount: { type: "number" },
    startDateOffset: { type: "integer", minimum: 0 },
    endDateOffset: { type: "integer", minimum: 0 },
    frequency: { 
      type: "string",
      enum: ["monthly", "annually", "weekly", "biweekly", "quarterly", "semiannually", "one-time"]
    },
    annualGrowthRate: { type: "number" },
    source: { type: "string" },
    accountType: { 
      type: "string",
      enum: ["cash", "taxable", "tax_deferred", "roth", "529", "401k", "rothIra", "ira", "hsa"]
    },
    targetAccountType: { 
      type: "string", 
      enum: ["cash", "taxable", "tax_deferred", "roth", "529"]
    }, // Added for modern account mapping
    category: { type: "string" },
    isNet: { type: "boolean" },
    metadata: { type: "object" },
    
    // Event-specific properties
    company: { type: "string" },
    assetClass: { type: "string" },
    
    // Goal Define Event properties
    goalType: {
      type: "string",
      enum: ["RETIREMENT", "MAJOR_PURCHASE", "EDUCATION", "EMERGENCY_FUND", "SAVINGS", "REAL_ESTATE", "CUSTOM"]
    },
    targetAmount: { type: "number" },
    targetMonthOffset: { type: "integer", minimum: 0 },
    targetDateOffset: { type: "integer", minimum: 0 },
    goalPriority: { 
      type: "string",
      enum: ["HIGH", "MEDIUM", "LOW"]
    },
    sourceAccountType: { type: "string" },
    sourceAccountCategory: { type: "string" },
    fundingStrategy: { 
      type: "string",
      enum: ["deplete_specific_account", "proportional_withdrawal", "cash_flow_priority", "custom"]
    },
    fundingSources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          accountType: { type: "string" },
          priority: { type: "integer" },
          maxPercentage: { type: "number" }
        }
      }
    },
    isFlexible: { type: "boolean" },
    minimumAmount: { type: "number" },
    maximumAmount: { type: "number" },
    inflationAdjustment: { type: "number" },
    adjustForInflation: { type: "boolean" },
    customInflationRate: { type: "number" },
    trackSurplusShortfall: { type: "boolean" },
    surplusAction: { 
      type: "string",
      enum: ["reinvest", "redirect_to_goal", "increase_spending", "none"]
    },
    surplusTargetGoalId: { type: "string" },
    shortfallAction: { 
      type: "string",
      enum: ["extend_timeline", "reduce_amount", "increase_savings", "none"]
    },
    linkedEvents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          eventType: { type: "string" },
          eventParams: { type: "object" },
          triggerCondition: { 
            type: "string",
            enum: ["on_goal_achievement", "on_funding_start", "on_milestone"]
          }
        }
      }
    },

    // Income event properties
    grossAmount: { type: "number" },
    netAmount: { type: "number" },
    taxRate: { type: "number" },
    employer: { type: "string" },
    
    // Expense event properties
    expenseCategory: { type: "string" },
    isEssential: { type: "boolean" },
    
    // Healthcare cost properties
    coverageType: { type: "string" },
    deductible: { type: "number" },
    outOfPocketMax: { type: "number" },
    premiumAmount: { type: "number" },
    
    // 401k contribution properties
    contributionType: { 
      type: "string",
      enum: ["TRADITIONAL", "ROTH", "BOTH"]
    },
    employeeContribution: { type: "number" },
    employerMatch: { type: "number" },
    catchUpContribution: { type: "number" },
    
    // Job event properties
    salary: { type: "number" },
    bonusAmount: { type: "number" },
    equityValue: { type: "number" },
    benefits: { type: "object" },
    
    // Home event properties
    homeValue: { type: "number" },
    downPayment: { type: "number" },
    mortgageAmount: { type: "number" },
    interestRate: { type: "number" },
    propertyTaxRate: { type: "number" },
    maintenanceCostRate: { type: "number" },
    
    // Move event properties
    movingCosts: { type: "number" },
    newLocation: { type: "string" },
    costOfLivingChange: { type: "number" },
    
    // Living expenses accelerator properties
    accelerationRate: { type: "number" },
    accelerationType: { 
      type: "string",
      enum: ["PERCENTAGE", "FIXED_AMOUNT"]
    },

    // Real Estate Purchase properties
    property: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        type: { 
          type: "string",
          enum: ["primary_residence", "rental_property", "vacation_home", "commercial", "land"]
        },
        purchasePrice: { type: "number" },
        purchaseDate: { type: "string" },
        address: { type: "string" },
        sqft: { type: "number" },
        yearBuilt: { type: "number" },
        lotSize: { type: "number" },
        propertyTaxRate: { type: "number" },
        insuranceCost: { type: "number" },
        hoaFees: { type: "number" },
        maintenanceRate: { type: "number" },
        appreciationRate: { type: "number" }
      }
    },
    financing: {
      type: "object",
      properties: {
        downPaymentAmount: { type: "number" },
        downPaymentSource: { type: "string" },
        liquidationStrategy: {
          type: "object",
          properties: {
            order: {
              type: "array",
              items: { type: "string" }
            },
            taxOptimized: { type: "boolean" },
            preserveEmergencyFund: { type: "boolean" },
            minimumCashReserve: { type: "number" }
          }
        },
        mortgage: {
          type: "object",
          properties: {
            principalAmount: { type: "number" },
            annualInterestRate: { type: "number" },
            termInMonths: { type: "number" },
            monthlyPayment: { type: "number" },
            mortgageId: { type: "string" },
            loanType: { type: "string" },
            pmiRequired: { type: "boolean" },
            pmiRate: { type: "number" },
            pointsPaid: { type: "number" }
          }
        }
      }
    },
    closingCosts: {
      type: "object",
      properties: {
        totalAmount: { type: "number" },
        source: { type: "string" },
        liquidationStrategy: {
          type: "object",
          properties: {
            order: {
              type: "array",
              items: { type: "string" }
            },
            taxOptimized: { type: "boolean" },
            preserveEmergencyFund: { type: "boolean" },
            minimumCashReserve: { type: "number" }
          }
        },
        breakdown: {
          type: "object",
          properties: {
            lenderFees: { type: "number" },
            titleInsurance: { type: "number" },
            appraisal: { type: "number" },
            inspection: { type: "number" },
            attorneyFees: { type: "number" },
            recordingFees: { type: "number" },
            transferTax: { type: "number" },
            prepaidItems: { type: "number" },
            escrow: { type: "number" },
            other: { type: "number" }
          }
        }
      }
    },

    // Dynamic Event Properties
    isDynamic: { type: "boolean" },
    evaluationFrequency: { 
      type: "string",
      enum: ["MONTHLY", "QUARTERLY", "ANNUALLY", "ON_TRIGGER"]
    },
    conditions: { type: "object" },
    fallbackBehavior: { 
      type: "string",
      enum: ["SKIP", "REDUCE_AMOUNT", "DEFER_TO_NEXT_PERIOD", "USE_ALTERNATIVE_SOURCE", "NOTIFY_USER"]
    },
    strategyContext: {
      type: "object",
      properties: {
        strategyId: { type: "string" },
        generatedBy: { type: "string" },
        canUserEdit: { type: "boolean" }
      }
    },

    // Conditional Contribution properties
    cashThreshold: { type: "number" },
    contributionStrategy: {
      type: "object",
      properties: {
        type: { 
          type: "string",
          enum: ["FIXED_AMOUNT", "PERCENTAGE_OF_EXCESS", "ALL_EXCESS"]
        },
        percentage: { type: "number" }
      }
    },

    // Waterfall Allocation properties
    totalAmount: { type: "number" },
    waterfall: {
      type: "array",
      items: {
        type: "object",
        properties: {
          priority: { type: "integer" },
          targetAccount: { type: "string" },
          maxAmount: { type: "number" },
          description: { type: "string" },
          conditions: { type: "object" }
        }
      }
    },
    remainder: {
      type: "object",
      properties: {
        action: { 
          type: "string",
          enum: ["INVEST_TAXABLE", "KEEP_CASH", "DISTRIBUTE_EVENLY"]
        },
        targetAccount: { type: "string" }
      }
    },

    // Percentage Contribution properties
    savingsRate: { type: "number" },
    incomeSource: {
      type: "object",
      properties: {
        includeTypes: { 
          type: "array",
          items: { type: "string" }
        },
        excludeTypes: { 
          type: "array", 
          items: { type: "string" }
        },
        useGross: { type: "boolean" }
      }
    },
    limits: {
      type: "object",
      properties: {
        minMonthly: { type: "number" },
        maxMonthly: { type: "number" },
        maxAnnual: { type: "number" }
      }
    },
    incomeAdjustment: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        thresholds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              incomeChange: { type: "number" },
              savingsRateAdjustment: { type: "number" }
            }
          }
        }
      }
    },

    // Smart Debt Payment properties
    strategy: { 
      type: "string",
      enum: ["AVALANCHE", "SNOWBALL", "HIGHEST_PAYMENT", "CUSTOM"]
    },
    extraPayment: {
      type: "object",
      properties: {
        type: { 
          type: "string",
          enum: ["FIXED_AMOUNT", "PERCENTAGE_OF_INCOME", "SURPLUS_AFTER_EXPENSES"]
        },
        amount: { type: "number" },
        percentage: { type: "number" }
      }
    },
    targetDebts: { 
      type: "array",
      items: { type: "string" }
    },
    emergencyFundTarget: { type: "number" },
    completionAction: {
      type: "object",
      properties: {
        redirectTo: { type: "string" },
        continueAmount: { type: "boolean" }
      }
    },

    // Goal Driven Contribution properties
    linkedGoalId: { type: "string" },
    baseContribution: { type: "number" },
    adjustmentStrategy: {
      type: "object",
      properties: {
        type: { 
          type: "string",
          enum: ["TIME_BASED", "PROGRESS_BASED", "HYBRID"]
        },
        timeBasedMultiplier: { type: "number" },
        progressThresholds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              progressPercentage: { type: "number" },
              contributionMultiplier: { type: "number" }
            }
          }
        },
        maxMultiplier: { type: "number" }
      }
    },

    // Emergency Fund Maintenance properties
    target: {
      type: "object",
      properties: {
        type: { 
          type: "string",
          enum: ["MONTHS_OF_EXPENSES", "FIXED_AMOUNT", "PERCENTAGE_OF_INCOME"]
        },
        value: { type: "number" }
      }
    },
    emergencyAccount: { type: "string" },
    topUpStrategy: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        maxMonthlyTopUp: { type: "number" },
        priorityLevel: { type: "integer" }
      }
    },
    surplusStrategy: {
      type: "object",
      properties: {
        action: { 
          type: "string",
          enum: ["INVEST", "GOAL_CONTRIBUTION", "DEBT_PAYMENT"]
        },
        targetAccount: { type: "string" },
        linkedGoalId: { type: "string" },
        maxSurplusMultiplier: { type: "number" }
      }
    },
    withdrawalConditions: {
      type: "object",
      properties: {
        allowedReasons: { 
          type: "array",
          items: { type: "string" }
        },
        requiresUserApproval: { type: "boolean" }
      }
    }
  },
  additionalProperties: true // Allow additional properties for different event types
};

const simulationInputSchema = {
  type: "object",
  required: ["initialAccounts", "events", "config", "monthsToRun"],
  properties: {
    initialAccounts: { type: "object" },
    events: { 
      type: "array",
      items: { type: "object" }
    },
    config: { type: "object" },
    monthsToRun: { type: "integer", minimum: 1 }
  }
};

const simulationResultSchema = {
  oneOf: [
    // Accept raw array (legacy format)
    {
      type: "array",
      items: { type: "object" }
    },
    // Accept single simulation result (what individual workers return)
    // WASM returns success + monthlyData (no separate data field required)
    {
      type: "object",
      properties: {
        success: { type: "boolean" },
        error: { type: "string" },
        monthlyData: {
          oneOf: [
            { type: "array", items: { type: "object" } },
            { type: "null" }
          ]
        },
        finalNetWorth: { type: "number" },
        payload: {
          type: "array",
          items: { type: "object" }
        }
      },
      required: ["success"],
      additionalProperties: true
    },
    // Accept complete SimulationPayload structure (what WASM backend returns)
    {
      type: "object",
      properties: {
        planInputs: { type: "object" },
        planProjection: {
          type: "object",
          properties: {
            monthlyData: { type: "array", items: { type: "object" } },
            yearlyData: { type: "array", items: { type: "object" } },
            charts: { type: "object" },
            analysis: { type: "object" },
            summary: { type: "object" }
          }
        }
      },
      required: ["planProjection"]
    }
  ]
};

// Create AJV instance with strict mode for better validation
const ajv = new Ajv({ 
  allErrors: true,
  verbose: true,
  strict: true
});

// Compile schemas at module initialization for better performance
let validateFinancialEvent: ValidateFunction<FinancialEvent> = ajv.compile(financialEventSchema);
let validateSimulationInput: ValidateFunction = ajv.compile(simulationInputSchema);
let validateSimulationResult: ValidateFunction = ajv.compile(simulationResultSchema);

// Export validators
export { validateSimulationInput, validateSimulationResult };

// Function to recompile financial event schema (for debugging/hot reload)
export function recompileFinancialEventSchema() {
  validateFinancialEvent = ajv.compile(financialEventSchema);
  logger.debug('Recompiled financial event schema', 'DATA');
}

// Function to recompile simulation result schema (for debugging/hot reload)
export function recompileSimulationResultSchema() {
  validateSimulationResult = ajv.compile(simulationResultSchema);
  logger.dataLog('Recompiled simulation result schema', 'DATA', {
    schemaOptions: simulationResultSchema.oneOf.length,
    option2Properties: simulationResultSchema.oneOf[1]?.properties ? Object.keys(simulationResultSchema.oneOf[1].properties) : 'n/a'
  });
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: ErrorObject[];
  errorMessage?: string;
}

/**
 * Validates a financial event against the JSON schema
 * 
 * @param event - The financial event to validate
 * @returns Validation result with detailed error information
 */
export function validateFinancialEventWithResult(event: unknown): ValidationResult {
  // Recompile schema on first use to ensure latest changes
  if (typeof (globalThis as any).__schemaRecompiled === 'undefined') {
    recompileFinancialEventSchema();
    (globalThis as any).__schemaRecompiled = true;
  }
  
  const isValid = validateFinancialEvent(event);
  
  if (!isValid) {
    const errorMessage = ajv.errorsText(validateFinancialEvent.errors);
    
    // Debug logging to see what's failing
    logger.debug('Validation failed for event:', 'DATA', {
      eventId: (event as any)?.id,
      eventType: (event as any)?.type,
      eventData: event,
      errors: validateFinancialEvent.errors,
      errorMessage
    });
    
    return {
      isValid: false,
      errors: validateFinancialEvent.errors || [],
      errorMessage
    };
  }
  
  return { isValid: true };
}

/**
 * Validates simulation input data
 * 
 * @param input - The simulation input to validate
 * @returns Validation result with detailed error information
 */
export function validateSimulationInputWithResult(input: unknown): ValidationResult {
  const isValid = validateSimulationInput(input);
  
  if (!isValid) {
    const errorMessage = ajv.errorsText(validateSimulationInput.errors);
    return {
      isValid: false,
      errors: validateSimulationInput.errors || [],
      errorMessage
    };
  }
  
  return { isValid: true };
}

/**
 * Validates simulation result data
 *
 * @param result - The simulation result to validate
 * @returns Validation result with detailed error information
 */
export function validateSimulationResultWithResult(result: unknown): ValidationResult {
  const isValid = validateSimulationResult(result);

  if (!isValid) {
    const errorMessage = ajv.errorsText(validateSimulationResult.errors);
    return {
      isValid: false,
      errors: validateSimulationResult.errors || [],
      errorMessage
    };
  }

  return { isValid: true };
}

/**
 * Utility function to log validation errors in a structured way
 * 
 * @param context - Context where validation failed (e.g., "event creation", "worker response")
 * @param validationResult - The validation result containing errors
 */
export function logValidationError(context: string, validationResult: ValidationResult): void {
  if (!validationResult.isValid) {
    logger.error(`${context} validation failed:`, 'DATA', {
      message: validationResult.errorMessage,
      errors: validationResult.errors,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Type guard to check if an object is a valid FinancialEvent
 * 
 * @param obj - Object to check
 * @returns True if object is a valid FinancialEvent
 */
export function isValidFinancialEvent(obj: unknown): obj is FinancialEvent {
  return validateFinancialEvent(obj);
}

/**
 * Validates a dynamic event and its specific conditions
 * 
 * @param event - The dynamic event to validate
 * @returns Validation result with detailed error information
 */
export function validateDynamicEvent(event: unknown): ValidationResult {
  // First validate as a regular financial event
  const baseValidation = validateFinancialEventWithResult(event);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  const dynamicEvent = event as AnyDynamicEvent;
  
  // Additional dynamic event validations
  const errors: string[] = [];

  // Check if it's marked as dynamic
  if (!dynamicEvent.isDynamic) {
    errors.push('Dynamic events must have isDynamic: true');
  }

  // Validate specific event type requirements
  switch (dynamicEvent.type) {
    case 'CONDITIONAL_CONTRIBUTION':
      if (typeof dynamicEvent.cashThreshold !== 'number' || dynamicEvent.cashThreshold < 0) {
        errors.push('CONDITIONAL_CONTRIBUTION requires valid cashThreshold');
      }
      if (!dynamicEvent.contributionStrategy?.type) {
        errors.push('CONDITIONAL_CONTRIBUTION requires contributionStrategy.type');
      }
      break;

    case 'WATERFALL_ALLOCATION':
      if (typeof dynamicEvent.totalAmount !== 'number' || dynamicEvent.totalAmount <= 0) {
        errors.push('WATERFALL_ALLOCATION requires positive totalAmount');
      }
      if (!Array.isArray(dynamicEvent.waterfall) || dynamicEvent.waterfall.length === 0) {
        errors.push('WATERFALL_ALLOCATION requires non-empty waterfall array');
      }
      break;

    case 'PERCENTAGE_CONTRIBUTION':
      if (typeof dynamicEvent.savingsRate !== 'number' || 
          dynamicEvent.savingsRate < 0 || dynamicEvent.savingsRate > 1) {
        errors.push('PERCENTAGE_CONTRIBUTION requires savingsRate between 0 and 1');
      }
      if (!dynamicEvent.incomeSource?.includeTypes?.length) {
        errors.push('PERCENTAGE_CONTRIBUTION requires incomeSource.includeTypes');
      }
      break;

    case 'SMART_DEBT_PAYMENT':
      if (!dynamicEvent.strategy) {
        errors.push('SMART_DEBT_PAYMENT requires strategy');
      }
      if (!dynamicEvent.extraPayment?.type || typeof dynamicEvent.extraPayment.amount !== 'number') {
        errors.push('SMART_DEBT_PAYMENT requires valid extraPayment configuration');
      }
      if (typeof dynamicEvent.emergencyFundTarget !== 'number' || dynamicEvent.emergencyFundTarget < 0) {
        errors.push('SMART_DEBT_PAYMENT requires valid emergencyFundTarget');
      }
      break;

    case 'GOAL_DRIVEN_CONTRIBUTION':
      if (!dynamicEvent.targetGoalId) {
        errors.push('GOAL_DRIVEN_CONTRIBUTION requires targetGoalId');
      }
      if (typeof dynamicEvent.adjustmentStrategy?.baseContribution !== 'number' || dynamicEvent.adjustmentStrategy?.baseContribution < 0) {
        errors.push('GOAL_DRIVEN_CONTRIBUTION requires positive adjustmentStrategy.baseContribution');
      }
      if (!dynamicEvent.adjustmentStrategy?.type) {
        errors.push('GOAL_DRIVEN_CONTRIBUTION requires adjustmentStrategy.type');
      }
      break;

    case 'EMERGENCY_FUND_MAINTENANCE':
      if (typeof dynamicEvent.targetMonths !== 'number' || dynamicEvent.targetMonths <= 0) {
        errors.push('EMERGENCY_FUND_MAINTENANCE requires positive targetMonths');
      }
      if (!dynamicEvent.emergencyFundAccount) {
        errors.push('EMERGENCY_FUND_MAINTENANCE requires emergencyFundAccount');
      }
      break;
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errorMessage: errors.join('; '),
      errors: errors.map(msg => ({ message: msg } as ErrorObject))
    };
  }

  return { isValid: true };
}

/**
 * Type guard to check if an object is a valid dynamic event
 * 
 * @param obj - Object to check
 * @returns True if object is a valid dynamic event
 */
export function isValidDynamicEvent(obj: unknown): obj is AnyDynamicEvent {
  const validation = validateDynamicEvent(obj);
  return validation.isValid;
}

/**
 * Validates that condition objects have proper structure
 * 
 * @param conditions - Condition set to validate
 * @returns Validation result
 */
export function validateConditionSet(conditions: unknown): ValidationResult {
  if (!conditions || typeof conditions !== 'object') {
    return { isValid: true }; // Conditions are optional
  }

  const errors: string[] = [];
  const conditionObj = conditions as any;

  // Validate balance conditions
  if (conditionObj.cashBalance) {
    if (conditionObj.cashBalance.min !== undefined && typeof conditionObj.cashBalance.min !== 'number') {
      errors.push('cashBalance.min must be a number');
    }
    if (conditionObj.cashBalance.max !== undefined && typeof conditionObj.cashBalance.max !== 'number') {
      errors.push('cashBalance.max must be a number');
    }
  }

  // Validate income conditions
  if (conditionObj.income) {
    if (conditionObj.income.minMonthly !== undefined && typeof conditionObj.income.minMonthly !== 'number') {
      errors.push('income.minMonthly must be a number');
    }
    if (conditionObj.income.maxAnnual !== undefined && typeof conditionObj.income.maxAnnual !== 'number') {
      errors.push('income.maxAnnual must be a number');
    }
  }

  // Validate age conditions
  if (conditionObj.age) {
    if (conditionObj.age.min !== undefined && typeof conditionObj.age.min !== 'number') {
      errors.push('age.min must be a number');
    }
    if (conditionObj.age.max !== undefined && typeof conditionObj.age.max !== 'number') {
      errors.push('age.max must be a number');
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errorMessage: errors.join('; '),
      errors: errors.map(msg => ({ message: msg } as ErrorObject))
    };
  }

  return { isValid: true };
}