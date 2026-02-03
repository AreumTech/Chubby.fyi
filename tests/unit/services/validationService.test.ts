/**
 * Validation Service Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  validateFinancialEventWithResult,
  isValidFinancialEvent,
  logValidationError
} from '@/services/validationService';

describe('ValidationService', () => {
  describe('validateFinancialEventWithResult', () => {
    it('should validate a correct financial event', () => {
      const validEvent = {
        id: "test-123",
        type: "INCOME",
        description: "Test income",
        priority: 1,
        monthOffset: 12,
        amount: 5000
      };

      const result = validateFinancialEventWithResult(validEvent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject event with invalid type', () => {
      const invalidEvent = {
        id: "test-456",
        type: "INVALID_TYPE",
        description: "Test invalid",
        priority: 1,
        monthOffset: 12
      };

      const result = validateFinancialEventWithResult(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errorMessage).toContain('type');
    });

    it('should reject event with missing required fields', () => {
      const incompleteEvent = {
        id: "test-789",
        type: "INCOME",
        description: "Incomplete event"
        // Missing priority and monthOffset
      };

      const result = validateFinancialEventWithResult(incompleteEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errorMessage).toContain('required');
    });

    it('should reject event with negative monthOffset', () => {
      const invalidEvent = {
        id: "test-negative",
        type: "INCOME",
        description: "Negative month offset",
        priority: 1,
        monthOffset: -5
      };

      const result = validateFinancialEventWithResult(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('>= 0');
    });
  });

  describe('isValidFinancialEvent', () => {
    it('should return true for valid event', () => {
      const validEvent = {
        id: "test-123",
        type: "INCOME",
        description: "Test income",
        priority: 1,
        monthOffset: 12
      };

      expect(isValidFinancialEvent(validEvent)).toBe(true);
    });

    it('should return false for invalid event', () => {
      const invalidEvent = {
        id: "test-456",
        type: "INVALID_TYPE",
        description: "Test invalid"
      };

      expect(isValidFinancialEvent(invalidEvent)).toBe(false);
    });
  });

  describe('logValidationError', () => {
    it('should not throw when logging validation errors', () => {
      const validationResult = {
        isValid: false,
        errors: [{ 
          instancePath: '/type',
          schemaPath: '#/properties/type/enum',
          keyword: 'enum',
          params: { allowedValues: ['INCOME', 'EXPENSE'] },
          message: 'must be equal to one of the allowed values'
        }],
        errorMessage: 'Invalid type'
      };

      expect(() => {
        logValidationError('Test context', validationResult);
      }).not.toThrow();
    });
  });
});
