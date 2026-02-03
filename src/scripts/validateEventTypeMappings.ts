/**
 * Validation script to ensure all event type mappings are complete
 * Run with: npx tsx src/scripts/validateEventTypeMappings.ts
 */

import { 
  VALID_WASM_EVENT_TYPES, 
  FRONTEND_TO_WASM_EVENT_TYPE_MAP, 
  mapEventTypeForWASM,
  type WASMEventType 
} from '../types/wasmEventTypes';
import { logger } from '@/utils/logger';

logger.debug('Validating Event Type Mappings...', 'GENERAL');

// Test 1: All mapped types should be valid WASM types
logger.debug('1. Checking that all mapped targets are valid WASM types...', 'GENERAL');
let errors = 0;

for (const [frontendType, wasmType] of Object.entries(FRONTEND_TO_WASM_EVENT_TYPE_MAP)) {
  if (!VALID_WASM_EVENT_TYPES.has(wasmType)) {
    logger.error(`Frontend type '${frontendType}' maps to invalid WASM type '${wasmType}'`);
    errors++;
  }
}

if (errors === 0) {
  logger.debug('All mapped targets are valid WASM types', 'GENERAL');
} else {
  logger.error(`Found ${errors} invalid mappings`);
}

// Test 2: Test that mapping function works for all registered types
logger.debug('2. Testing mapping function for all registered types...', 'GENERAL');
const testTypes = [
  'INCOME', 'EXPENSE', 'CONTRIBUTION', 'WITHDRAWAL', 'TRANSFER', 'ROTH_CONVERSION',
  'SCHEDULED_CONTRIBUTION', 'RECURRING_EXPENSE', 'ONE_TIME_EXPENSE',
  'SOCIAL_SECURITY_INCOME', 'PENSION_INCOME', 'BUSINESS_INCOME',
  'HEALTHCARE_COST', 'TUITION_PAYMENT', 'TAX_PAYMENT'
];

for (const testType of testTypes) {
  try {
    const mapped = mapEventTypeForWASM(testType);
    logger.debug(`✅ ${testType} → ${mapped}`, 'GENERAL');
  } catch (error) {
    logger.error(`${testType} → ERROR`, 'ERROR', error.message);
    errors++;
  }
}

// Test 3: Test that invalid types throw proper errors
logger.debug('3. Testing that invalid types throw proper errors...', 'GENERAL');
const invalidTypes = ['INVALID_TYPE', 'UNKNOWN_EVENT', 'BAD_TYPE'];

for (const invalidType of invalidTypes) {
  try {
    mapEventTypeForWASM(invalidType);
    logger.error(`${invalidType} should have thrown an error but didn't`);
    errors++;
  } catch (error) {
    logger.debug(`✅ ${invalidType} properly throws error: ${error.message.split('\n')[0]}`, 'GENERAL');
  }
}

// Test 4: Check for circular mappings
logger.debug('4. Checking for circular mappings...', 'GENERAL');
const checkedTypes = new Set<string>();
const visitedTypes = new Set<string>();

function checkCircularMapping(type: string, path: string[] = []): boolean {
  if (visitedTypes.has(type)) {
    if (path.includes(type)) {
      logger.error(`Circular mapping detected: ${[...path, type].join(' → ')}`);
      return true;
    }
    return false;
  }
  
  visitedTypes.add(type);
  
  if (FRONTEND_TO_WASM_EVENT_TYPE_MAP[type] && FRONTEND_TO_WASM_EVENT_TYPE_MAP[type] !== type) {
    const target = FRONTEND_TO_WASM_EVENT_TYPE_MAP[type];
    return checkCircularMapping(target, [...path, type]);
  }
  
  return false;
}

let circularFound = false;
for (const frontendType of Object.keys(FRONTEND_TO_WASM_EVENT_TYPE_MAP)) {
  if (!checkedTypes.has(frontendType)) {
    if (checkCircularMapping(frontendType)) {
      circularFound = true;
      errors++;
    }
    checkedTypes.add(frontendType);
  }
}

if (!circularFound) {
  logger.debug('No circular mappings found', 'GENERAL');
}

// Summary
logger.debug('VALIDATION SUMMARY', 'GENERAL');
logger.debug('='.repeat(50), 'GENERAL');
logger.debug(`Total mappings: ${Object.keys(FRONTEND_TO_WASM_EVENT_TYPE_MAP).length}`, 'GENERAL');
logger.debug(`Valid WASM types: ${VALID_WASM_EVENT_TYPES.size}`, 'GENERAL');
logger.debug(`Errors found: ${errors}`, 'GENERAL');

if (errors === 0) {
  logger.debug('ALL VALIDATIONS PASSED! Event type system is robust.', 'GENERAL');
  process.exit(0);
} else {
  logger.error(`VALIDATION FAILED with ${errors} errors. Fix the issues above.`);
  process.exit(1);
}