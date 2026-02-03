/**
 * Form Validation Hook Tests
 * 
 * Tests for the comprehensive form validation system including
 * common validation rules, event-specific validation, and error handling.
 */

import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useFormValidation, 
  useEventFormValidation,
  commonValidationRules,
  advancedValidationRules,
  createEventValidationRules
} from '@/hooks/useFormValidation';
import { EventType } from '@/types/events/base';

describe('useFormValidation Hook', () => {
  describe('Common Validation Rules', () => {
    test('required rule should validate correctly', () => {
      const rule = commonValidationRules.required('Field is required');
      
      expect(rule.validate('')).toBe('Field is required');
      expect(rule.validate('   ')).toBe('Field is required');
      expect(rule.validate(null)).toBe('Field is required');
      expect(rule.validate(undefined)).toBe('Field is required');
      expect(rule.validate('valid')).toBeNull();
      expect(rule.validate(0)).toBeNull(); // 0 is valid
    });

    test('positiveNumber rule should validate correctly', () => {
      const rule = commonValidationRules.positiveNumber();
      
      expect(rule.validate(-1)).toBe('Must be a positive number');
      expect(rule.validate(0)).toBe('Must be a positive number');
      expect(rule.validate('invalid')).toBe('Must be a positive number');
      expect(rule.validate('')).toBe('Must be a positive number');
      expect(rule.validate(1)).toBeNull();
      expect(rule.validate(0.1)).toBeNull();
      expect(rule.validate('5.5')).toBeNull();
    });

    test('nonNegativeNumber rule should validate correctly', () => {
      const rule = commonValidationRules.nonNegativeNumber();
      
      expect(rule.validate(-1)).toBe('Must be a non-negative number');
      expect(rule.validate('-5')).toBe('Must be a non-negative number');
      expect(rule.validate('invalid')).toBe('Must be a non-negative number');
      expect(rule.validate(0)).toBeNull();
      expect(rule.validate(1)).toBeNull();
      expect(rule.validate('0')).toBeNull();
    });

    test('percentage rule should validate correctly', () => {
      const rule = commonValidationRules.percentage();
      
      expect(rule.validate(-1)).toBe('Must be between 0 and 100');
      expect(rule.validate(101)).toBe('Must be between 0 and 100');
      expect(rule.validate('150')).toBe('Must be between 0 and 100');
      expect(rule.validate(0)).toBeNull();
      expect(rule.validate(50)).toBeNull();
      expect(rule.validate(100)).toBeNull();
      expect(rule.validate('25.5')).toBeNull();
    });

    test('validYear rule should validate correctly', () => {
      const rule = commonValidationRules.validYear(2020, 2030);
      
      expect(rule.validate(2019)).toBe('Year must be between 2020 and 2030');
      expect(rule.validate(2031)).toBe('Year must be between 2020 and 2030');
      expect(rule.validate('1999')).toBe('Year must be between 2020 and 2030');
      expect(rule.validate('invalid')).toBe('Year must be between 2020 and 2030');
      expect(rule.validate(2025)).toBeNull();
      expect(rule.validate('2024')).toBeNull();
    });

    test('reasonableAmount rule should validate correctly', () => {
      const rule = commonValidationRules.reasonableAmount(1000);
      
      expect(rule.validate(1500)).toContain('Amount seems unusually large');
      expect(rule.validate(-1500)).toContain('Amount seems unusually large');
      expect(rule.validate('2000')).toContain('Amount seems unusually large');
      expect(rule.validate(500)).toBeNull();
      expect(rule.validate(-500)).toBeNull();
      expect(rule.validate('invalid')).toBeNull(); // NaN handling
    });

    test('stockSymbol rule should validate correctly', () => {
      const rule = commonValidationRules.stockSymbol();
      
      expect(rule.validate('AAPL')).toBeNull();
      expect(rule.validate('MSFT')).toBeNull();
      expect(rule.validate('T')).toBeNull();
      expect(rule.validate('GOOGL')).toBeNull();
      expect(rule.validate('')).toBeNull(); // Empty is allowed
      expect(rule.validate('aapl')).toBe('Must be a valid stock symbol (1-5 letters)');
      expect(rule.validate('TOOLONG')).toBe('Must be a valid stock symbol (1-5 letters)');
      expect(rule.validate('123')).toBe('Must be a valid stock symbol (1-5 letters)');
      expect(rule.validate('A1B2')).toBe('Must be a valid stock symbol (1-5 letters)');
    });

    test('reasonableSharePrice rule should validate correctly', () => {
      const rule = commonValidationRules.reasonableSharePrice();
      
      expect(rule.validate(150)).toBeNull();
      expect(rule.validate('45.50')).toBeNull();
      expect(rule.validate(0.50)).toBeNull();
      expect(rule.validate(0.005)).toBe('Share price seems unrealistic (should be $0.01-$10,000)');
      expect(rule.validate(15000)).toBe('Share price seems unrealistic (should be $0.01-$10,000)');
      expect(rule.validate('')).toBeNull(); // Empty is allowed
    });
  });

  describe('Advanced Validation Rules', () => {
    test('rsuValueRequired rule should validate RSU value requirements', () => {
      const rule = advancedValidationRules.rsuValueRequired();
      
      // Should pass with shares and price
      expect(rule.validate(null, { shares: 100, sharePrice: 150 })).toBeNull();
      
      // Should pass with total value
      expect(rule.validate(null, { totalValue: 15000 })).toBeNull();
      
      // Should pass with both
      expect(rule.validate(null, { shares: 100, sharePrice: 150, totalValue: 15000 })).toBeNull();
      
      // Should fail with neither
      expect(rule.validate(null, {})).toBe('Either specify shares & price, or total value');
      expect(rule.validate(null, { shares: 100 })).toBe('Either specify shares & price, or total value');
      expect(rule.validate(null, { sharePrice: 150 })).toBe('Either specify shares & price, or total value');
    });

    test('reasonableTaxWithholding rule should validate tax rates', () => {
      const rule = advancedValidationRules.reasonableTaxWithholding();
      
      expect(rule.validate(0.22)).toBeNull(); // 22% as decimal is acceptable
      expect(rule.validate(0.05)).toBe('Tax withholding rate should typically be 10-50%');
      expect(rule.validate(22)).toBeNull(); // 22% as percentage
      expect(rule.validate(35)).toBeNull(); // 35% - reasonable
      expect(rule.validate(5)).toBe('Tax withholding rate should typically be 10-50%');
      expect(rule.validate(60)).toBe('Tax withholding rate should typically be 10-50%');
      expect(rule.validate('')).toBeNull(); // Empty allowed
      expect(rule.validate(null)).toBeNull(); // Null allowed
    });

    test('concentrationRiskThreshold rule should identify risk levels', () => {
      const rule = advancedValidationRules.concentrationRiskThreshold();
      
      expect(rule.validate(15)).toBe('Concentration below 20% is generally acceptable');
      expect(rule.validate(5)).toBe('Concentration below 20% is generally acceptable');
      expect(rule.validate(25)).toBeNull(); // Above 20% is concerning
      expect(rule.validate(50)).toBeNull(); // High concentration
      expect(rule.validate('')).toBeNull(); // Empty allowed
    });

    test('achievableTimeline rule should validate milestone timelines', () => {
      const rule = advancedValidationRules.achievableTimeline();
      
      // Reasonable scenario: $50k goal, $30k current, 5 years = $4k/year = $333/month
      expect(rule.validate(5, { targetAmount: 50000, currentValue: 30000 })).toBeNull();
      
      // Aggressive scenario: $200k goal, $10k current, 1 year = $190k/year = $15.8k/month
      const result = rule.validate(1, { targetAmount: 200000, currentValue: 10000 });
      expect(result).toContain('timeline may be too aggressive');
      expect(result).toContain('15,833'); // Monthly amount
      
      // Missing data should pass
      expect(rule.validate(5, {})).toBeNull();
      expect(rule.validate(5, { targetAmount: 50000 })).toBeNull();
    });
  });

  describe('Event-Specific Validation Rules', () => {
    test('should create validation rules for RSU_VESTING', () => {
      const rules = createEventValidationRules(EventType.RSU_VESTING);
      
      expect(rules.description).toBeDefined();
      expect(rules.symbol).toBeDefined();
      expect(rules.targetAccountType).toBeDefined();
      expect(rules.shares).toBeDefined();
      expect(rules.sharePrice).toBeDefined();
      expect(rules.taxWithholdingRate).toBeDefined();
    });

    test('should create validation rules for STRATEGIC_TRADE', () => {
      const rules = createEventValidationRules(EventType.STRATEGIC_TRADE);
      
      expect(rules.description).toBeDefined();
      expect(rules.tradeType).toBeDefined();
      expect(rules.amount).toBeDefined();
      expect(rules.targetAccountType).toBeDefined();
      expect(rules.strategy).toBeDefined();
    });

    test('should create validation rules for GOAL_DEFINE', () => {
      const rules = createEventValidationRules(EventType.GOAL_DEFINE);
      
      expect(rules.description).toBeDefined();
      expect(rules.goalType).toBeDefined();
      expect(rules.targetAmount).toBeDefined();
      expect(rules.priority).toBeDefined();
      expect(rules.timeline).toBeDefined();
    });

    test('should return empty rules for unknown event type', () => {
      const rules = createEventValidationRules('UNKNOWN_EVENT' as EventType);
      expect(Object.keys(rules)).toHaveLength(0);
    });
  });

  describe('useFormValidation Hook Functionality', () => {
    test('should initialize with empty errors', () => {
      const rules = {
        name: [commonValidationRules.required('Name is required')]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      expect(result.current.errors).toEqual({});
      expect(result.current.warnings).toEqual({});
      expect(result.current.isValidating).toBe(false);
    });

    test('should validate form correctly', () => {
      const rules = {
        name: [commonValidationRules.required('Name is required')],
        amount: [commonValidationRules.positiveNumber('Amount must be positive')]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      act(() => {
        const validation = result.current.validateForm({ name: '', amount: -5 });
        expect(validation.isValid).toBe(false);
        expect(validation.errors.name).toBe('Name is required');
        expect(validation.errors.amount).toBe('Amount must be positive');
        expect(validation.hasErrors).toBe(true);
      });
    });

    test('should validate single field correctly', () => {
      const rules = {
        email: [commonValidationRules.email('Invalid email')]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      let isValid = false;
      act(() => {
        isValid = result.current.validateSingleField('email', 'invalid-email');
      });
      expect(isValid).toBe(false);
      expect(result.current.errors.email).toBe('Invalid email');

      act(() => {
        isValid = result.current.validateSingleField('email', 'user@example.com');
      });
      expect(isValid).toBe(true);
      expect(result.current.errors.email).toBeUndefined();
    });

    test('should handle field touching correctly', () => {
      const rules = {
        name: [commonValidationRules.required()]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      expect(result.current.isFieldTouched('name')).toBe(false);
      
      act(() => {
        result.current.markFieldTouched('name');
      });
      
      expect(result.current.isFieldTouched('name')).toBe(true);
    });

    test('should clear errors correctly', () => {
      const rules = {
        name: [commonValidationRules.required('Name is required')]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      act(() => {
        result.current.validateForm({ name: '' });
      });
      
      expect(Object.keys(result.current.errors)).toHaveLength(1);
      
      act(() => {
        result.current.clearErrors();
      });
      
      expect(result.current.errors).toEqual({});
      expect(result.current.warnings).toEqual({});
    });

    test('should handle validation errors gracefully', () => {
      // Create a rule that throws an error
      const badRule = {
        validate: () => { throw new Error('Validation failed'); },
        message: 'Bad rule'
      };
      
      const rules = {
        name: [badRule]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      act(() => {
        const validation = result.current.validateForm({ name: 'test' });
        expect(validation.isValid).toBe(false);
        expect(validation.errors.name).toBe('Validation failed unexpectedly');
      });
    });
  });

  describe('useEventFormValidation Hook', () => {
    test('should initialize with event-specific rules', () => {
      const { result } = renderHook(() => useEventFormValidation(EventType.RSU_VESTING));
      
      expect(result.current.validateForm).toBeDefined();
      expect(result.current.hasFieldError).toBeDefined();
      expect(result.current.getFieldError).toBeDefined();
    });

    test('should validate RSU vesting form correctly', () => {
      const { result } = renderHook(() => useEventFormValidation(EventType.RSU_VESTING));
      
      act(() => {
        const validation = result.current.validateForm({
          description: '', // Required field missing
          symbol: 'TOOLONG', // Invalid symbol
          shares: -100, // Negative shares
          taxWithholdingRate: 150 // Invalid percentage
        });
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.symbol).toContain('symbol');
        expect(validation.errors.shares).toContain('greater than 0');
        expect(validation.errors.taxWithholdingRate).toContain('0% and 100%');
      });
    });

    test('should validate strategic trade form correctly', () => {
      const { result } = renderHook(() => useEventFormValidation(EventType.STRATEGIC_TRADE));
      
      act(() => {
        const validation = result.current.validateForm({
          description: 'Valid trade',
          tradeType: 'BUY',
          amount: 50000,
          targetAccountType: 'taxable',
          strategy: 'Buy low, sell high'
        });
        
        expect(validation.isValid).toBe(true);
        expect(Object.keys(validation.errors)).toHaveLength(0);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle nested field validation', () => {
      const rules = {
        'liability.originalPrincipalAmount': [commonValidationRules.required(), commonValidationRules.positiveNumber()]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      act(() => {
        const validation = result.current.validateForm({
          liability: {
            originalPrincipalAmount: -1000
          }
        });
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors['liability.originalPrincipalAmount']).toBe('Must be a positive number');
      });
    });

    test('should handle malformed form data gracefully', () => {
      const rules = {
        name: [commonValidationRules.required()]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      act(() => {
        const validation = result.current.validateForm(null);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.name).toBeDefined();
      });
    });

    test('should handle circular references in form data', () => {
      const rules = {
        name: [commonValidationRules.required()]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      const circularData: any = { name: 'test' };
      circularData.circular = circularData;
      
      act(() => {
        // Should not crash with circular reference
        const validation = result.current.validateForm(circularData);
        expect(validation).toBeDefined();
      });
    });

    test('should provide helpful error messages', () => {
      const rules = {
        amount: [
          commonValidationRules.required('Amount is required'),
          commonValidationRules.positiveNumber('Amount must be positive'),
          commonValidationRules.reasonableAmount(1000, 'Amount is unusually high')
        ]
      };
      
      const { result } = renderHook(() => useFormValidation(rules));
      
      act(() => {
        // Test required validation
        result.current.validateSingleField('amount', '');
      });
      expect(result.current.getFieldError('amount')).toBe('Amount is required');

      act(() => {
        // Test positive number validation
        result.current.validateSingleField('amount', -5);
      });
      expect(result.current.getFieldError('amount')).toBe('Amount must be positive');

      act(() => {
        // Test reasonable amount validation (should be warning)
        result.current.validateSingleField('amount', 2000);
      });
      expect(result.current.getFieldWarning('amount')).toBe('Amount is unusually high');
    });
  });
});
