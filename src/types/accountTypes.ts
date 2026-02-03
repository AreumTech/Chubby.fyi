/**
 * Strict Account Type System
 * Prevents account mapping bugs through type safety
 */

import { logger } from '@/utils/logger';

// ===== STANDARDIZED ACCOUNT TYPES =====
export type StandardAccountType = 
  | 'cash'
  | 'taxable' 
  | 'tax_deferred'  // 401k, traditional IRA, etc.
  | 'roth'          // Roth IRA, Roth 401k, etc.
  | 'hsa'           // Health Savings Account
  | '529';

// ===== LEGACY ACCOUNT TYPES (for migration) =====
export type LegacyAccountType = 
  | '401k'           // Maps to tax_deferred
  | 'rothIra'        // Maps to roth
  | 'ira'            // Maps to tax_deferred
  | 'roth401k'       // Maps to roth
  | 'hsa'            // Maps to tax_deferred
  | 'brokerage'      // Maps to taxable
  | 'checking'       // Maps to cash
  | 'savings';       // Maps to cash

export type AccountType = StandardAccountType | LegacyAccountType;

// ===== ACCOUNT MAPPING CONFIGURATION =====
export const ACCOUNT_TYPE_MAPPING: Record<LegacyAccountType, StandardAccountType> = {
  '401k': 'tax_deferred',
  'rothIra': 'roth', 
  'ira': 'tax_deferred',
  'roth401k': 'roth',
  'hsa': 'hsa',
  'brokerage': 'taxable',
  'checking': 'cash',
  'savings': 'cash'
} as const;

// ===== TYPE GUARDS =====
export function isStandardAccountType(type: string): type is StandardAccountType {
  return ['cash', 'taxable', 'tax_deferred', 'roth', 'hsa', '529'].includes(type);
}

export function isLegacyAccountType(type: string): type is LegacyAccountType {
  return type in ACCOUNT_TYPE_MAPPING;
}

export function isValidAccountType(type: string): type is AccountType {
  return isStandardAccountType(type) || isLegacyAccountType(type);
}

// ===== SAFE ACCOUNT TYPE CONVERTER =====
export function normalizeAccountType(accountType: AccountType): StandardAccountType {
  if (isStandardAccountType(accountType)) {
    return accountType;
  }
  
  if (isLegacyAccountType(accountType)) {
    const normalized = ACCOUNT_TYPE_MAPPING[accountType];
    logger.dataLog(`Account type normalized: '${accountType}' → '${normalized}'`);
    return normalized;
  }
  
  // This should never happen with proper typing
  throw new Error(`Invalid account type: ${accountType}`);
}

// ===== VALIDATION FUNCTIONS =====
export function validateAccountType(accountType: unknown): AccountType {
  if (typeof accountType !== 'string') {
    throw new Error(`Account type must be string, got ${typeof accountType}`);
  }
  
  if (!isValidAccountType(accountType)) {
    throw new Error(`Invalid account type: "${accountType}". Valid types: ${
      [...Object.values(ACCOUNT_TYPE_MAPPING), ...Object.keys(ACCOUNT_TYPE_MAPPING)].join(', ')
    }`);
  }
  
  return accountType;
}

// ===== ACCOUNT TYPE METADATA =====
export interface AccountTypeInfo {
  standard: StandardAccountType;
  legacy: LegacyAccountType[];
  description: string;
  taxTreatment: 'pre-tax' | 'post-tax' | 'tax-free-growth';
  contributionLimits?: {
    annual2024?: number;
    annual2025?: number;
    catchUp50Plus?: number;
    catchUp55Plus?: number;
    enhancedCatchUp60to63?: number;
    familyLimit?: number;
    incomeLimits?: {
      single2025?: number;
      marriedJoint2025?: number;
    };
  };
}

export const ACCOUNT_TYPE_INFO: Record<StandardAccountType, AccountTypeInfo> = {
  cash: {
    standard: 'cash',
    legacy: ['checking', 'savings'],
    description: 'Cash accounts (checking, savings, money market)',
    taxTreatment: 'post-tax'
  },
  taxable: {
    standard: 'taxable', 
    legacy: ['brokerage'],
    description: 'Taxable investment accounts',
    taxTreatment: 'post-tax'
  },
  tax_deferred: {
    standard: 'tax_deferred',
    legacy: ['401k', 'ira'],
    description: 'Tax-deferred accounts (401k, Traditional IRA)',
    taxTreatment: 'pre-tax',
    contributionLimits: {
      annual2025: 23500, // 401k limit
      catchUp50Plus: 7500,
      enhancedCatchUp60to63: 11250 // Ages 60-63 (SECURE 2.0)
    }
  },
  roth: {
    standard: 'roth',
    legacy: ['rothIra', 'roth401k'], 
    description: 'Roth accounts (Roth IRA, Roth 401k)',
    taxTreatment: 'tax-free-growth',
    contributionLimits: {
      annual2025: 7000, // Roth IRA limit (unchanged for 2025)
      catchUp50Plus: 1000,
      incomeLimits: {
        single2025: 150000, // Full contribution phaseout starts
        marriedJoint2025: 236000 // Full contribution phaseout starts
      }
    }
  },
  hsa: {
    standard: 'hsa',
    legacy: ['hsa'],
    description: 'Health Savings Account',
    taxTreatment: 'pre-tax',
    contributionLimits: {
      annual2025: 4300, // HSA individual limit for 2025
      catchUp55Plus: 1000,
      familyLimit: 8550 // HSA family limit for 2025
    }
  },
  '529': {
    standard: '529',
    legacy: [],
    description: '529 Education Savings Plans',
    taxTreatment: 'tax-free-growth'
  }
};