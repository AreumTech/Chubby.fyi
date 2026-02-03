/**
 * PFOS-E Event Normalization Tests
 *
 * Tests for Phase 2: Event Type Consolidation Cut-Over
 * Verifies that legacy event types are correctly converted to consolidated types
 * while preserving PFOS-E metadata inference.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  normalizeEventForPFOSE,
  normalizeEventsForPFOSE,
  getConsolidatedEventType,
  isLegacyEventType,
  validatePFOSECompliance,
  PFOSE_PHASE2_ENABLED,
} from '@/services/eventPFOSENormalization';
import { EventType } from '@/types/events';

describe('eventPFOSENormalization', () => {
  describe('Phase 2: Event Type Consolidation', () => {
    describe('getConsolidatedEventType', () => {
      it('converts INCOME to CASHFLOW_INCOME', () => {
        expect(getConsolidatedEventType(EventType.INCOME)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('converts SOCIAL_SECURITY_INCOME to CASHFLOW_INCOME', () => {
        expect(getConsolidatedEventType(EventType.SOCIAL_SECURITY_INCOME)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('converts PENSION_INCOME to CASHFLOW_INCOME', () => {
        expect(getConsolidatedEventType(EventType.PENSION_INCOME)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('converts DIVIDEND_INCOME to CASHFLOW_INCOME', () => {
        expect(getConsolidatedEventType(EventType.DIVIDEND_INCOME)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('converts RENTAL_INCOME to CASHFLOW_INCOME', () => {
        expect(getConsolidatedEventType(EventType.RENTAL_INCOME)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('converts BUSINESS_INCOME to CASHFLOW_INCOME', () => {
        expect(getConsolidatedEventType(EventType.BUSINESS_INCOME)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('converts ANNUITY_PAYMENT to CASHFLOW_INCOME', () => {
        expect(getConsolidatedEventType(EventType.ANNUITY_PAYMENT)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('converts RSU_VESTING to CASHFLOW_INCOME', () => {
        expect(getConsolidatedEventType(EventType.RSU_VESTING)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('converts INHERITANCE to CASHFLOW_INCOME', () => {
        expect(getConsolidatedEventType(EventType.INHERITANCE)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('converts RECURRING_EXPENSE to CASHFLOW_EXPENSE', () => {
        expect(getConsolidatedEventType(EventType.RECURRING_EXPENSE)).toBe(EventType.CASHFLOW_EXPENSE);
      });

      it('converts ONE_TIME_EVENT to CASHFLOW_EXPENSE', () => {
        expect(getConsolidatedEventType(EventType.ONE_TIME_EVENT)).toBe(EventType.CASHFLOW_EXPENSE);
      });

      it('converts HEALTHCARE_COST to CASHFLOW_EXPENSE', () => {
        expect(getConsolidatedEventType(EventType.HEALTHCARE_COST)).toBe(EventType.CASHFLOW_EXPENSE);
      });

      it('converts TUITION_PAYMENT to CASHFLOW_EXPENSE', () => {
        expect(getConsolidatedEventType(EventType.TUITION_PAYMENT)).toBe(EventType.CASHFLOW_EXPENSE);
      });

      it('converts VEHICLE_PURCHASE to CASHFLOW_EXPENSE', () => {
        expect(getConsolidatedEventType(EventType.VEHICLE_PURCHASE)).toBe(EventType.CASHFLOW_EXPENSE);
      });

      it('converts HOME_IMPROVEMENT to CASHFLOW_EXPENSE', () => {
        expect(getConsolidatedEventType(EventType.HOME_IMPROVEMENT)).toBe(EventType.CASHFLOW_EXPENSE);
      });

      it('converts LIFE_INSURANCE_PREMIUM to INSURANCE_PREMIUM', () => {
        expect(getConsolidatedEventType(EventType.LIFE_INSURANCE_PREMIUM)).toBe(EventType.INSURANCE_PREMIUM);
      });

      it('converts DISABILITY_INSURANCE_PREMIUM to INSURANCE_PREMIUM', () => {
        expect(getConsolidatedEventType(EventType.DISABILITY_INSURANCE_PREMIUM)).toBe(EventType.INSURANCE_PREMIUM);
      });

      it('converts LONG_TERM_CARE_INSURANCE_PREMIUM to INSURANCE_PREMIUM', () => {
        expect(getConsolidatedEventType(EventType.LONG_TERM_CARE_INSURANCE_PREMIUM)).toBe(EventType.INSURANCE_PREMIUM);
      });

      it('converts LIFE_INSURANCE_PAYOUT to INSURANCE_PAYOUT', () => {
        expect(getConsolidatedEventType(EventType.LIFE_INSURANCE_PAYOUT)).toBe(EventType.INSURANCE_PAYOUT);
      });

      it('converts DISABILITY_INSURANCE_PAYOUT to INSURANCE_PAYOUT', () => {
        expect(getConsolidatedEventType(EventType.DISABILITY_INSURANCE_PAYOUT)).toBe(EventType.INSURANCE_PAYOUT);
      });

      it('converts LONG_TERM_CARE_PAYOUT to INSURANCE_PAYOUT', () => {
        expect(getConsolidatedEventType(EventType.LONG_TERM_CARE_PAYOUT)).toBe(EventType.INSURANCE_PAYOUT);
      });

      it('converts SCHEDULED_CONTRIBUTION to ACCOUNT_CONTRIBUTION', () => {
        expect(getConsolidatedEventType(EventType.SCHEDULED_CONTRIBUTION)).toBe(EventType.ACCOUNT_CONTRIBUTION);
      });

      it('converts FIVE_TWO_NINE_CONTRIBUTION to ACCOUNT_CONTRIBUTION', () => {
        expect(getConsolidatedEventType(EventType.FIVE_TWO_NINE_CONTRIBUTION)).toBe(EventType.ACCOUNT_CONTRIBUTION);
      });

      it('preserves already-consolidated types (CASHFLOW_INCOME)', () => {
        expect(getConsolidatedEventType(EventType.CASHFLOW_INCOME)).toBe(EventType.CASHFLOW_INCOME);
      });

      it('preserves already-consolidated types (CASHFLOW_EXPENSE)', () => {
        expect(getConsolidatedEventType(EventType.CASHFLOW_EXPENSE)).toBe(EventType.CASHFLOW_EXPENSE);
      });

      it('preserves already-consolidated types (INSURANCE_PREMIUM)', () => {
        expect(getConsolidatedEventType(EventType.INSURANCE_PREMIUM)).toBe(EventType.INSURANCE_PREMIUM);
      });

      it('preserves already-consolidated types (INSURANCE_PAYOUT)', () => {
        expect(getConsolidatedEventType(EventType.INSURANCE_PAYOUT)).toBe(EventType.INSURANCE_PAYOUT);
      });

      it('preserves already-consolidated types (ACCOUNT_CONTRIBUTION)', () => {
        expect(getConsolidatedEventType(EventType.ACCOUNT_CONTRIBUTION)).toBe(EventType.ACCOUNT_CONTRIBUTION);
      });

      it('preserves unaffected event types (WITHDRAWAL)', () => {
        expect(getConsolidatedEventType(EventType.WITHDRAWAL)).toBe(EventType.WITHDRAWAL);
      });

      it('preserves unaffected event types (ROTH_CONVERSION)', () => {
        expect(getConsolidatedEventType(EventType.ROTH_CONVERSION)).toBe(EventType.ROTH_CONVERSION);
      });
    });

    describe('isLegacyEventType', () => {
      it('returns true for legacy income types', () => {
        expect(isLegacyEventType(EventType.INCOME)).toBe(true);
        expect(isLegacyEventType(EventType.SOCIAL_SECURITY_INCOME)).toBe(true);
        expect(isLegacyEventType(EventType.PENSION_INCOME)).toBe(true);
      });

      it('returns true for legacy expense types', () => {
        expect(isLegacyEventType(EventType.RECURRING_EXPENSE)).toBe(true);
        expect(isLegacyEventType(EventType.ONE_TIME_EVENT)).toBe(true);
      });

      it('returns true for legacy insurance types', () => {
        expect(isLegacyEventType(EventType.LIFE_INSURANCE_PREMIUM)).toBe(true);
        expect(isLegacyEventType(EventType.LIFE_INSURANCE_PAYOUT)).toBe(true);
      });

      it('returns true for legacy contribution types', () => {
        expect(isLegacyEventType(EventType.SCHEDULED_CONTRIBUTION)).toBe(true);
      });

      it('returns false for consolidated types', () => {
        expect(isLegacyEventType(EventType.CASHFLOW_INCOME)).toBe(false);
        expect(isLegacyEventType(EventType.CASHFLOW_EXPENSE)).toBe(false);
        expect(isLegacyEventType(EventType.INSURANCE_PREMIUM)).toBe(false);
      });

      it('returns false for unaffected types', () => {
        expect(isLegacyEventType(EventType.WITHDRAWAL)).toBe(false);
        expect(isLegacyEventType(EventType.ROTH_CONVERSION)).toBe(false);
      });
    });

    describe('normalizeEventForPFOSE with Phase 2 enabled', () => {
      // These tests assume PFOSE_PHASE2_ENABLED = true
      it('converts INCOME to CASHFLOW_INCOME and preserves original type', () => {
        const event = {
          id: 'test-1',
          type: EventType.INCOME,
          amount: 5000,
          monthOffset: 0,
        };

        const normalized = normalizeEventForPFOSE(event);

        if (PFOSE_PHASE2_ENABLED) {
          expect(normalized.type).toBe(EventType.CASHFLOW_INCOME);
          expect(normalized._originalLegacyType).toBe(EventType.INCOME);
        } else {
          expect(normalized.type).toBe(EventType.INCOME);
        }
      });

      it('converts RECURRING_EXPENSE to CASHFLOW_EXPENSE and preserves original type', () => {
        const event = {
          id: 'test-2',
          type: EventType.RECURRING_EXPENSE,
          amount: 2000,
          monthOffset: 0,
        };

        const normalized = normalizeEventForPFOSE(event);

        if (PFOSE_PHASE2_ENABLED) {
          expect(normalized.type).toBe(EventType.CASHFLOW_EXPENSE);
          expect(normalized._originalLegacyType).toBe(EventType.RECURRING_EXPENSE);
        } else {
          expect(normalized.type).toBe(EventType.RECURRING_EXPENSE);
        }
      });

      it('converts LIFE_INSURANCE_PREMIUM to INSURANCE_PREMIUM', () => {
        const event = {
          id: 'test-3',
          type: EventType.LIFE_INSURANCE_PREMIUM,
          amount: 500,
          monthOffset: 0,
        };

        const normalized = normalizeEventForPFOSE(event);

        if (PFOSE_PHASE2_ENABLED) {
          expect(normalized.type).toBe(EventType.INSURANCE_PREMIUM);
          expect(normalized._originalLegacyType).toBe(EventType.LIFE_INSURANCE_PREMIUM);
        }
      });

      it('converts SCHEDULED_CONTRIBUTION to ACCOUNT_CONTRIBUTION', () => {
        const event = {
          id: 'test-4',
          type: EventType.SCHEDULED_CONTRIBUTION,
          amount: 1000,
          monthOffset: 0,
          targetAccountType: 'tax_deferred',
        };

        const normalized = normalizeEventForPFOSE(event);

        if (PFOSE_PHASE2_ENABLED) {
          expect(normalized.type).toBe(EventType.ACCOUNT_CONTRIBUTION);
          expect(normalized._originalLegacyType).toBe(EventType.SCHEDULED_CONTRIBUTION);
        }
      });

      it('preserves already-consolidated types without setting _originalLegacyType', () => {
        const event = {
          id: 'test-5',
          type: EventType.CASHFLOW_INCOME,
          amount: 5000,
          monthOffset: 0,
        };

        const normalized = normalizeEventForPFOSE(event);

        expect(normalized.type).toBe(EventType.CASHFLOW_INCOME);
        expect(normalized._originalLegacyType).toBeUndefined();
      });

      it('preserves unaffected event types without setting _originalLegacyType', () => {
        const event = {
          id: 'test-6',
          type: EventType.WITHDRAWAL,
          amount: 10000,
          monthOffset: 0,
        };

        const normalized = normalizeEventForPFOSE(event);

        expect(normalized.type).toBe(EventType.WITHDRAWAL);
        expect(normalized._originalLegacyType).toBeUndefined();
      });
    });

    describe('PFOS-E metadata inference after type conversion', () => {
      it('infers correct taxProfile for converted income events', () => {
        const event = {
          id: 'test-tax-1',
          type: EventType.SOCIAL_SECURITY_INCOME,
          amount: 2500,
          monthOffset: 0,
        };

        const normalized = normalizeEventForPFOSE(event);

        // Type should be converted but taxProfile should be inferred from original type
        expect(normalized.taxProfile).toBe('social_security_benefit');
      });

      it('infers correct driverKey for converted income events', () => {
        const event = {
          id: 'test-driver-1',
          type: EventType.PENSION_INCOME,
          amount: 3000,
          monthOffset: 0,
        };

        const normalized = normalizeEventForPFOSE(event);

        // driverKey should be inferred from original type
        expect(normalized.driverKey).toBe('income:retirement');
      });

      it('infers correct expenseNature for converted expense events', () => {
        const event = {
          id: 'test-expense-1',
          type: EventType.ONE_TIME_EVENT,
          amount: 5000,
          monthOffset: 0,
        };

        const normalized = normalizeEventForPFOSE(event);

        // expenseNature should be inferred from original type
        expect(normalized.expenseNature).toBe('shock');
      });

      it('preserves explicitly provided PFOS-E metadata', () => {
        const event = {
          id: 'test-explicit-1',
          type: EventType.INCOME,
          amount: 5000,
          monthOffset: 0,
          taxProfile: 'qualified_dividend',
          driverKey: 'income:investment',
        };

        const normalized = normalizeEventForPFOSE(event);

        // Explicitly provided metadata should be preserved
        expect(normalized.taxProfile).toBe('qualified_dividend');
        expect(normalized.driverKey).toBe('income:investment');
      });
    });

    describe('normalizeEventsForPFOSE batch processing', () => {
      it('converts multiple events correctly', () => {
        const events = [
          { id: 'batch-1', type: EventType.INCOME, amount: 5000, monthOffset: 0 },
          { id: 'batch-2', type: EventType.RECURRING_EXPENSE, amount: 2000, monthOffset: 0 },
          { id: 'batch-3', type: EventType.SCHEDULED_CONTRIBUTION, amount: 1000, monthOffset: 0 },
          { id: 'batch-4', type: EventType.WITHDRAWAL, amount: 10000, monthOffset: 0 },
        ];

        const normalized = normalizeEventsForPFOSE(events);

        expect(normalized).toHaveLength(4);

        if (PFOSE_PHASE2_ENABLED) {
          expect(normalized[0].type).toBe(EventType.CASHFLOW_INCOME);
          expect(normalized[1].type).toBe(EventType.CASHFLOW_EXPENSE);
          expect(normalized[2].type).toBe(EventType.ACCOUNT_CONTRIBUTION);
          expect(normalized[3].type).toBe(EventType.WITHDRAWAL); // Unaffected
        }
      });
    });
  });

  describe('PFOS-E Compliance Validation', () => {
    it('validates income events have required taxProfile', () => {
      const event = {
        type: EventType.INCOME,
        amount: 5000,
        taxProfile: 'ordinary_income',
        driverKey: 'income:employment',
      };

      const normalized = normalizeEventForPFOSE(event);
      const errors = validatePFOSECompliance(normalized);

      expect(errors).toHaveLength(0);
    });

    it('validates expense events have required expenseNature', () => {
      const event = {
        type: EventType.RECURRING_EXPENSE,
        amount: 2000,
        driverKey: 'expense:fixed',
        expenseNature: 'fixed',
      };

      const normalized = normalizeEventForPFOSE(event);
      const errors = validatePFOSECompliance(normalized);

      expect(errors).toHaveLength(0);
    });
  });
});
