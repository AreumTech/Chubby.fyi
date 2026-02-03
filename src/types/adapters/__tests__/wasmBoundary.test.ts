/**
 * WASM Boundary Adapter Tests
 *
 * Validates that type adapters maintain WASM compatibility.
 * Critical for ensuring the type consolidation doesn't break WASM boundary.
 */

import { describe, it, expect } from 'vitest';
import {
  adaptAccountTypeForWasm,
  adaptEventForWasm,
  validateWasmMonthlyData,
  isWasmCompatibleEvent,
  assertWasmBoundary
} from '../wasmBoundary';
import type { StandardAccountType } from '../../accountTypes';
import type { IncomeEvent } from '../../events/income';
import { EventType, EventPriority } from '../../events/base';

describe('WASM Boundary Adapters', () => {
  describe('adaptAccountTypeForWasm', () => {
    it('maps standard account types correctly', () => {
      expect(adaptAccountTypeForWasm('cash')).toBe('cash');
      expect(adaptAccountTypeForWasm('taxable')).toBe('taxable');
      expect(adaptAccountTypeForWasm('tax_deferred')).toBe('tax_deferred');
      expect(adaptAccountTypeForWasm('roth')).toBe('roth');
    });

    it('maps non-standard account types to WASM equivalents', () => {
      expect(adaptAccountTypeForWasm('hsa')).toBe('tax_deferred');
      expect(adaptAccountTypeForWasm('529')).toBe('taxable');
    });

    it('produces only WASM-compatible account types', () => {
      const standardTypes: StandardAccountType[] = ['cash', 'taxable', 'tax_deferred', 'roth', 'hsa', '529'];
      const wasmCompatibleTypes = ['cash', 'taxable', 'tax_deferred', 'roth'];

      standardTypes.forEach(type => {
        const adapted = adaptAccountTypeForWasm(type);
        expect(wasmCompatibleTypes).toContain(adapted);
      });
    });
  });

  describe('adaptEventForWasm', () => {
    it('preserves core event fields', () => {
      const frontendEvent: IncomeEvent = {
        id: 'test-event-1',
        type: EventType.INCOME,
        description: 'Test income event',
        priority: EventPriority.INCOME,
        monthOffset: 12,
        amount: 5000,
        name: 'Test Income Event',
        source: 'Employment',
        isNet: false,
        startDateOffset: 0,
        endDateOffset: 360,
        annualGrowthRate: 0.03
      };

      const wasmEvent = adaptEventForWasm(frontendEvent);

      expect(wasmEvent.id).toBe('test-event-1');
      expect(wasmEvent.type).toBe(EventType.INCOME);
      expect(wasmEvent.description).toBe('Test income event');
      expect(wasmEvent.priority).toBe(EventPriority.INCOME);
      expect(wasmEvent.monthOffset).toBe(12);
      expect(wasmEvent.amount).toBe(5000);
    });

    it('handles optional fields correctly', () => {
      const eventWithOptionals: IncomeEvent = {
        id: 'test-event-2',
        type: EventType.INCOME,
        description: 'Test contribution',
        priority: EventPriority.INCOME,
        monthOffset: 6,
        amount: 1000,
        name: 'Test Contribution',
        source: 'Side Income',
        isNet: false,
        annualGrowthRate: 0.03,
        startDateOffset: 0,
        endDateOffset: 360
      };

      const wasmEvent = adaptEventForWasm(eventWithOptionals);

      expect(wasmEvent.annualGrowthRate).toBe(0.03);
      expect(wasmEvent.startDateOffset).toBe(0);
      expect(wasmEvent.endDateOffset).toBe(360);
    });

    it('omits undefined optional fields', () => {
      const minimalEvent: IncomeEvent = {
        id: 'test-event-3',
        type: EventType.INCOME,
        description: 'Minimal event',
        priority: EventPriority.INCOME,
        monthOffset: 24,
        name: 'Minimal Event',
        source: 'Test Source',
        isNet: false,
        startDateOffset: 0,
        endDateOffset: 12
      };

      const wasmEvent = adaptEventForWasm(minimalEvent);

      expect(wasmEvent).not.toHaveProperty('amount');
    });
  });

  describe('validateWasmMonthlyData', () => {
    it('validates correct WASM monthly data structure', () => {
      const validData = {
        monthOffset: 12,
        netWorth: 100000,
        cashFlow: 5000,
        accounts: {
          cash: 10000,
          taxable: { holdings: [], totalValue: 50000 },
          tax_deferred: { holdings: [], totalValue: 30000 },
          roth: { holdings: [], totalValue: 10000 }
        },
        returns: {
          stocks: 0.08,
          bonds: 0.04
        },
        incomeThisMonth: 8000,
        expensesThisMonth: 3000,
        contributionsToInvestmentsThisMonth: 1000
      };

      expect(validateWasmMonthlyData(validData)).toBe(true);
    });

    it('rejects invalid data structures', () => {
      expect(validateWasmMonthlyData(null)).toBe(false);
      expect(validateWasmMonthlyData(undefined)).toBe(false);
      expect(validateWasmMonthlyData({})).toBe(false);
      expect(validateWasmMonthlyData({ monthOffset: 1 })).toBe(false);
    });
  });

  describe('isWasmCompatibleEvent', () => {
    it('validates compatible events', () => {
      const compatibleEvent: IncomeEvent = {
        id: 'compatible-1',
        type: EventType.INCOME,
        description: 'Compatible event',
        priority: EventPriority.INCOME,
        monthOffset: 12,
        name: 'Compatible Event',
        source: 'Test Source',
        isNet: false,
        startDateOffset: 0,
        endDateOffset: 12
      };

      expect(isWasmCompatibleEvent(compatibleEvent)).toBe(true);
    });

    it('handles events with invalid data gracefully', () => {
      const invalidEvent = {
        id: 123, // Invalid type
        type: EventType.INCOME,
        description: 'Invalid event',
        priority: 'invalid', // Invalid type
        monthOffset: 12
      } as any;

      expect(isWasmCompatibleEvent(invalidEvent)).toBe(false);
    });
  });

  describe('assertWasmBoundary', () => {
    it('passes valid data through', () => {
      const validData = {
        monthOffset: 12,
        netWorth: 100000,
        cashFlow: 5000,
        accounts: { cash: 10000 }
      };

      const result = assertWasmBoundary(
        validData,
        validateWasmMonthlyData,
        'test validation'
      );

      expect(result).toBe(validData);
    });

    it('throws error for invalid data', () => {
      const invalidData = { invalid: 'data' };

      expect(() => {
        assertWasmBoundary(
          invalidData,
          validateWasmMonthlyData,
          'test validation'
        );
      }).toThrow('WASM boundary violation in test validation');
    });
  });

  describe('Integration Tests', () => {
    it('maintains type consistency across adapter chain', () => {
      // Test complete flow: Frontend → Adapter → WASM
      const frontendEvent: IncomeEvent = {
        id: 'integration-test',
        type: EventType.INCOME,
        description: 'Integration test event',
        priority: EventPriority.INCOME,
        monthOffset: 24,
        amount: 2000,
        name: 'Integration Test',
        source: 'Test Source',
        isNet: false,
        startDateOffset: 0,
        endDateOffset: 12
      };

      // Step 1: Adapt event for WASM
      const wasmEvent = adaptEventForWasm(frontendEvent);
      expect(isWasmCompatibleEvent(frontendEvent)).toBe(true);

      // Step 2: Verify all required WASM fields are present
      expect(wasmEvent).toMatchObject({
        id: 'integration-test',
        type: EventType.INCOME,
        description: 'Integration test event',
        priority: EventPriority.INCOME,
        monthOffset: 24,
        amount: 2000
      });

      // Step 3: Verify WASM event has no frontend-specific fields
      expect(wasmEvent).not.toHaveProperty('name');
    });

    it('handles account type transformation end-to-end', () => {
      const accountTypes: StandardAccountType[] = ['hsa', '529'];

      accountTypes.forEach(accountType => {
        const wasmType = adaptAccountTypeForWasm(accountType);
        expect(['cash', 'taxable', 'tax_deferred', 'roth']).toContain(wasmType);
      });
    });
  });
});