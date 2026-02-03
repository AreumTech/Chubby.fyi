/**
 * Unit tests for WASM-only simulation preprocessor
 * 
 * These tests validate the core event preprocessing logic that converts
 * financial events with startDateOffset/endDateOffset into monthly simulation events.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { preprocessEventsForWASM_OLD as preprocessEventsForWASM } from '@/hooks/wasmOnlySimulation';
import { 
  EventType, 
  EventPriority, 
  IncomeEvent, 
  RecurringExpenseEvent, 
  ScheduledContributionEvent,
  OneTimeEvent,
  FinancialEvent
} from '@/types';

describe('preprocessEventsForWASM', () => {
  describe('Recurring Event Detection', () => {
    it('should identify income events with startDateOffset as recurring', () => {
      const incomeEvent: IncomeEvent = {
        id: 'test-income',
        type: EventType.INCOME,
        description: 'Test Income',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Salary',
        amount: 5000,
        startDateOffset: 0,
        endDateOffset: 11
      };

      const result = preprocessEventsForWASM([incomeEvent], 600);
      
      // Should generate 12 monthly events (months 0-11)
      expect(result.length).toBe(12);
      expect(result[0].monthOffset).toBe(0);
      expect(result[11].monthOffset).toBe(11);
    });

    it('should identify recurring expense events with startDateOffset as recurring', () => {
      const expenseEvent: RecurringExpenseEvent = {
        id: 'test-expense',
        type: EventType.RECURRING_EXPENSE,
        description: 'Test Expense',
        priority: EventPriority.RECURRING_EXPENSE,
        monthOffset: 0,
        amount: 2000,
        startDateOffset: 6,
        endDateOffset: 17
      };

      const result = preprocessEventsForWASM([expenseEvent], 600);
      
      // Should generate 12 monthly events (months 6-17)
      expect(result.length).toBe(12);
      expect(result[0].monthOffset).toBe(6);
      expect(result[11].monthOffset).toBe(17);
    });

    it('should identify scheduled contribution events with startDateOffset as recurring', () => {
      const contributionEvent: ScheduledContributionEvent = {
        id: 'test-contribution',
        type: EventType.SCHEDULED_CONTRIBUTION,
        description: 'Test Contribution',
        priority: EventPriority.SCHEDULED_CONTRIBUTION,
        monthOffset: 0,
        accountType: '401k',
        amount: 1500,
        startDateOffset: 0,
        endDateOffset: 23
      };

      const result = preprocessEventsForWASM([contributionEvent], 600);
      
      // Should generate 24 monthly events (months 0-23)
      expect(result.length).toBe(24);
      expect(result[0].monthOffset).toBe(0);
      expect(result[23].monthOffset).toBe(23);
    });

    it('should NOT identify events without startDateOffset as recurring', () => {
      const oneTimeEvent: OneTimeEvent = {
        id: 'test-onetime',
        type: EventType.ONE_TIME_EVENT,
        description: 'Test One-Time Event',
        priority: EventPriority.DEFAULT_FINANCIAL_EVENT,
        monthOffset: 60,
        amount: 10000
      };

      const result = preprocessEventsForWASM([oneTimeEvent], 600);
      
      // Should keep as single event
      expect(result.length).toBe(1);
      expect(result[0].monthOffset).toBe(60);
      expect(result[0].amount).toBe(10000);
    });
  });

  describe('Event Expansion Logic', () => {
    it('should handle events with no endDateOffset (indefinite duration)', () => {
      const incomeEvent: IncomeEvent = {
        id: 'test-income',
        type: EventType.INCOME,
        description: 'Test Income',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Salary',
        amount: 5000,
        startDateOffset: 0
        // No endDateOffset - should run to maxMonthOffset
      };

      const maxMonthOffset = 35; // 3 years
      const result = preprocessEventsForWASM([incomeEvent], maxMonthOffset);
      
      // Should generate events from month 0 to 35 (36 total events)
      expect(result.length).toBe(36);
      expect(result[0].monthOffset).toBe(0);
      expect(result[35].monthOffset).toBe(35);
    });

    it('should handle annual events correctly (legacy frequency support)', () => {
      const annualIncomeEvent = {
        id: 'test-annual-income',
        type: EventType.INCOME,
        description: 'Annual Bonus',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Bonus',
        amount: 12000, // Annual amount
        frequency: 'annually', // Legacy frequency indicator
        startDateOffset: 0,
        endDateOffset: 23 // 2 years
      } as any;

      const result = preprocessEventsForWASM([annualIncomeEvent], 600);
      
      // Should generate 24 monthly events (2 years * 12 months)
      // Each event should have amount of 1000 (12000 / 12)
      expect(result.length).toBe(24);
      expect(result[0].amount).toBe(1000);
      expect(result[0].monthOffset).toBe(0);
      expect(result[23].monthOffset).toBe(23);
    });

    it('should apply annual growth rate correctly', () => {
      const growingIncomeEvent: IncomeEvent = {
        id: 'test-growing-income',
        type: EventType.INCOME,
        description: 'Growing Income',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Salary',
        amount: 5000,
        startDateOffset: 0,
        endDateOffset: 23, // 2 years
        annualGrowthRate: 0.05 // 5% annual growth
      };

      const result = preprocessEventsForWASM([growingIncomeEvent], 600);
      
      // Should generate 24 monthly events
      expect(result.length).toBe(24);
      
      // First year should have original amount
      expect(result[0].amount).toBe(5000);
      expect(result[11].amount).toBe(5000);
      
      // Second year should have grown amount (5000 * 1.05 = 5250)
      expect(result[12].amount).toBeCloseTo(5250, 2);
      expect(result[23].amount).toBeCloseTo(5250, 2);
    });

    it('should limit excessively long events for safety', () => {
      const longEvent: RecurringExpenseEvent = {
        id: 'test-long-event',
        type: EventType.RECURRING_EXPENSE,
        description: 'Very Long Event',
        priority: EventPriority.RECURRING_EXPENSE,
        monthOffset: 0,
        amount: 1000,
        startDateOffset: 0,
        endDateOffset: 1500 // 125 years - should be limited
      };

      const result = preprocessEventsForWASM([longEvent], 2000);
      
      // Should be limited to 1200 months (100 years)
      expect(result.length).toBeLessThanOrEqual(1200);
    });
  });

  describe('Event Validation and Safety', () => {
    it('should skip events with invalid amounts', () => {
      const invalidAmountEvent = {
        id: 'test-invalid',
        type: EventType.INCOME,
        description: 'Invalid Amount Event',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Salary',
        amount: NaN, // Invalid amount
        startDateOffset: 0,
        endDateOffset: 11
      } as any;

      const result = preprocessEventsForWASM([invalidAmountEvent], 600);
      
      // Should skip the invalid event
      expect(result.length).toBe(0);
    });

    it('should handle string amounts by converting to numbers', () => {
      const stringAmountEvent = {
        id: 'test-string-amount',
        type: EventType.INCOME,
        description: 'String Amount Event',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Salary',
        amount: '5000', // String amount
        startDateOffset: 0,
        endDateOffset: 11
      } as any;

      const result = preprocessEventsForWASM([stringAmountEvent], 600);
      
      // Should convert string amount and process normally
      expect(result.length).toBe(12);
      expect(result[0].amount).toBe(5000);
    });

    it('should warn about very large amounts', () => {
      const largeAmountEvent: IncomeEvent = {
        id: 'test-large-amount',
        type: EventType.INCOME,
        description: 'Large Amount Event',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Salary',
        amount: 20000000, // 20 million - should trigger warning
        startDateOffset: 0,
        endDateOffset: 11
      };

      const result = preprocessEventsForWASM([largeAmountEvent], 600);
      
      // Should still process but log warning (check console output in integration tests)
      expect(result.length).toBe(12);
      expect(result[0].amount).toBe(20000000);
    });

    it('should remove legacy properties from generated events', () => {
      const legacyEvent = {
        id: 'test-legacy',
        type: EventType.INCOME,
        description: 'Legacy Event',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Salary',
        amount: 5000,
        frequency: 'monthly', // Legacy property
        startDateOffset: 0,
        endDateOffset: 11,
        annualGrowthRate: 0.03 // Should be removed from output
      } as any;

      const result = preprocessEventsForWASM([legacyEvent], 600);
      
      expect(result.length).toBe(12);
      expect((result[0] as any).frequency).toBeUndefined();
      expect((result[0] as any).startDateOffset).toBeUndefined();
      expect((result[0] as any).endDateOffset).toBeUndefined();
      expect((result[0] as any).annualGrowthRate).toBeUndefined();
    });
  });

  describe('Comprehensive Event Type Coverage', () => {
    it('should handle all recurring event types correctly', () => {
      const events: FinancialEvent[] = [
        // Income Event
        {
          id: 'income-1',
          type: EventType.INCOME,
          description: 'Salary',
          priority: EventPriority.INCOME,
          monthOffset: 0,
          source: 'Job',
          amount: 6000,
          startDateOffset: 0,
          endDateOffset: 11
        } as IncomeEvent,
        
        // Recurring Expense Event
        {
          id: 'expense-1',
          type: EventType.RECURRING_EXPENSE,
          description: 'Rent',
          priority: EventPriority.RECURRING_EXPENSE,
          monthOffset: 0,
          amount: 2000,
          startDateOffset: 0,
          endDateOffset: 11
        } as RecurringExpenseEvent,
        
        // Scheduled Contribution Event
        {
          id: 'contribution-1',
          type: EventType.SCHEDULED_CONTRIBUTION,
          description: '401k Contribution',
          priority: EventPriority.SCHEDULED_CONTRIBUTION,
          monthOffset: 0,
          accountType: '401k',
          amount: 1500,
          startDateOffset: 0,
          endDateOffset: 11
        } as ScheduledContributionEvent,
        
        // One-Time Event (should not be expanded)
        {
          id: 'onetime-1',
          type: EventType.ONE_TIME_EVENT,
          description: 'Car Purchase',
          priority: EventPriority.DEFAULT_FINANCIAL_EVENT,
          monthOffset: 6,
          amount: 30000
        } as OneTimeEvent
      ];

      const result = preprocessEventsForWASM(events, 600);
      
      // Should have 36 expanded events (3 recurring × 12 months) + 1 one-time = 37 total
      expect(result.length).toBe(37);
      
      // Check each event type is represented correctly
      const incomeEvents = result.filter(e => e.type === EventType.INCOME);
      const expenseEvents = result.filter(e => e.type === EventType.RECURRING_EXPENSE);
      const contributionEvents = result.filter(e => e.type === EventType.SCHEDULED_CONTRIBUTION);
      const oneTimeEvents = result.filter(e => e.type === EventType.ONE_TIME_EVENT);
      
      expect(incomeEvents.length).toBe(12);
      expect(expenseEvents.length).toBe(12);
      expect(contributionEvents.length).toBe(12);
      expect(oneTimeEvents.length).toBe(1);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle events that start and end in the same month', () => {
      const singleMonthEvent: IncomeEvent = {
        id: 'single-month',
        type: EventType.INCOME,
        description: 'Single Month Bonus',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Bonus',
        amount: 5000,
        startDateOffset: 6,
        endDateOffset: 6 // Same month
      };

      const result = preprocessEventsForWASM([singleMonthEvent], 600);
      
      expect(result.length).toBe(1);
      expect(result[0].monthOffset).toBe(6);
      expect(result[0].amount).toBe(5000);
    });

    it('should handle events with startDateOffset > endDateOffset gracefully', () => {
      const invalidRangeEvent: IncomeEvent = {
        id: 'invalid-range',
        type: EventType.INCOME,
        description: 'Invalid Range Event',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'Salary',
        amount: 5000,
        startDateOffset: 10,
        endDateOffset: 5 // End before start
      };

      const result = preprocessEventsForWASM([invalidRangeEvent], 600);
      
      // Should generate no events for invalid range
      expect(result.length).toBe(0);
    });

    it('should handle zero amounts correctly', () => {
      const zeroAmountEvent: IncomeEvent = {
        id: 'zero-amount',
        type: EventType.INCOME,
        description: 'Zero Amount Event',
        priority: EventPriority.INCOME,
        monthOffset: 0,
        source: 'None',
        amount: 0,
        startDateOffset: 0,
        endDateOffset: 5
      };

      const result = preprocessEventsForWASM([zeroAmountEvent], 600);
      
      expect(result.length).toBe(6);
      expect(result[0].amount).toBe(0);
    });

    it('should handle negative amounts (e.g., for expense events)', () => {
      const negativeAmountEvent: RecurringExpenseEvent = {
        id: 'negative-amount',
        type: EventType.RECURRING_EXPENSE,
        description: 'Expense with Negative Amount',
        priority: EventPriority.RECURRING_EXPENSE,
        monthOffset: 0,
        amount: -1000, // Negative for expense
        startDateOffset: 0,
        endDateOffset: 11
      };

      const result = preprocessEventsForWASM([negativeAmountEvent], 600);
      
      expect(result.length).toBe(12);
      expect(result[0].amount).toBe(-1000);
    });
  });
});
