/**
 * Account Mapping Tests
 * Prevents regression of the 401k inflation bug
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeAccountType, isValidAccountType, ACCOUNT_TYPE_MAPPING } from '@/types/accountTypes';
import { validateEventPipeline } from '@/services/eventValidationPipeline';
import { normalizeEventToMonthly } from '@/services/eventNormalization';

describe('Account Type System', () => {
  describe('Account Type Validation', () => {
    it('should recognize all standard account types', () => {
      const standardTypes = ['cash', 'taxable', 'tax_deferred', 'roth', '529'];
      
      standardTypes.forEach(type => {
        expect(isValidAccountType(type)).toBe(true);
      });
    });
    
    it('should recognize all legacy account types', () => {
      const legacyTypes = ['401k', 'rothIra', 'ira', 'roth401k', 'hsa', 'brokerage'];
      
      legacyTypes.forEach(type => {
        expect(isValidAccountType(type)).toBe(true);
      });
    });
    
    it('should reject invalid account types', () => {
      const invalidTypes = ['401K', 'checking_account', 'investment', 'crypto', ''];
      
      invalidTypes.forEach(type => {
        expect(isValidAccountType(type)).toBe(false);
      });
    });
  });
  
  describe('Account Type Normalization', () => {
    it('should map 401k to tax_deferred (THE CRITICAL MAPPING)', () => {
      expect(normalizeAccountType('401k')).toBe('tax_deferred');
    });
    
    it('should map rothIra to roth', () => {
      expect(normalizeAccountType('rothIra')).toBe('roth');
    });
    
    it('should leave standard types unchanged', () => {
      expect(normalizeAccountType('tax_deferred')).toBe('tax_deferred');
      expect(normalizeAccountType('roth')).toBe('roth');
      expect(normalizeAccountType('taxable')).toBe('taxable');
      expect(normalizeAccountType('cash')).toBe('cash');
    });
    
    it('should handle all legacy mappings correctly', () => {
      Object.entries(ACCOUNT_TYPE_MAPPING).forEach(([legacy, standard]) => {
        expect(normalizeAccountType(legacy as any)).toBe(standard);
      });
    });
    
    it('should throw for invalid account types', () => {
      expect(() => normalizeAccountType('invalid' as any)).toThrow();
    });
  });
});

describe('Event Validation Pipeline', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  
  beforeEach(() => {
    consoleSpy.mockClear();
  });
  
  describe('Account Mapping Bug Prevention', () => {
    it('should catch missing account types on contributions', () => {
      const events = [{
        id: 'test-contribution',
        name: 'Test Contribution',
        type: 'SCHEDULED_CONTRIBUTION',
        amount: 1000,
        frequency: 'monthly'
        // Missing accountType or targetAccountType
      }];
      
      const report = validateEventPipeline(events as any);
      
      expect(report.valid).toBe(false);
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].message).toContain('requires account specification');
    });
    
    it('should detect the 401k mapping scenario', () => {
      const events = [{
        id: 'event-401k-contribution',
        name: '401k Contribution', 
        type: 'SCHEDULED_CONTRIBUTION',
        amount: 23000,
        frequency: 'annually',
        accountType: '401k' // Legacy field that caused the bug
      }];
      
      const report = validateEventPipeline(events as any);
      
      expect(report.valid).toBe(true); // Should be valid after mapping
      expect(report.stats.fixedMappings).toBe(1); // Should detect the mapping
      expect(report.warnings.some(w => w.message.includes('401k'))).toBe(true);
    });
    
    it('should reject invalid account types', () => {
      const events = [{
        id: 'test-invalid',
        name: 'Invalid Account',
        type: 'SCHEDULED_CONTRIBUTION', 
        amount: 1000,
        frequency: 'monthly',
        accountType: 'investment_account' // Invalid
      }];
      
      const report = validateEventPipeline(events as any);
      
      expect(report.valid).toBe(false);
      expect(report.errors.some(e => e.message.includes('Invalid accountType'))).toBe(true);
    });
    
    it('should prevent using both accountType and targetAccountType', () => {
      const events = [{
        id: 'test-both',
        name: 'Both Account Fields',
        type: 'SCHEDULED_CONTRIBUTION',
        amount: 1000,
        frequency: 'monthly',
        accountType: '401k',
        targetAccountType: 'tax_deferred'
      }];
      
      const report = validateEventPipeline(events as any);
      
      expect(report.valid).toBe(true);
      expect(report.warnings.some(e => e.message.includes('both targetAccountType and accountType'))).toBe(true);
    });
  });
  
  describe('Contribution Limit Validation', () => {
    it('should warn about 401k contribution limits', () => {
      const events = [{
        id: 'test-401k-limit',
        name: '401k Over Limit',
        type: 'SCHEDULED_CONTRIBUTION',
        amount: 25000, // Over 2024 limit
        frequency: 'annually',
        targetAccountType: 'tax_deferred'
      }];
      
      const report = validateEventPipeline(events as any);
      
      expect(report.warnings.some(w => w.message.includes('exceeds 2025 limit'))).toBe(true);
    });
    
    it('should warn about Roth IRA contribution limits', () => {
      const events = [{
        id: 'test-roth-limit',
        name: 'Roth Over Limit',
        type: 'SCHEDULED_CONTRIBUTION',
        amount: 8000, // Over 2024 limit
        frequency: 'annually', 
        targetAccountType: 'roth'
      }];
      
      const report = validateEventPipeline(events as any);
      
      expect(report.warnings.some(w => w.message.includes('exceeds 2024 limit'))).toBe(true);
    });
  });
});

describe('Event Normalization with Account Mapping', () => {
  it('should normalize the problematic 401k event correctly', () => {
    const event401k = {
      id: 'event-401k-contribution',
      name: '401k Contribution',
      type: 'SCHEDULED_CONTRIBUTION',
      amount: 23000,
      frequency: 'annually',
      accountType: '401k', // The bug-causing field
      startDateOffset: 0,
      endDateOffset: 420
    };
    
    const normalized = normalizeEventToMonthly(event401k as any, 2024);
    
    // Check frequency normalization
    expect(normalized.monthlyAmount).toBeCloseTo(23000 / 12, 2);
    expect(normalized.originalAmount).toBe(23000);
    expect(normalized.originalFrequency).toBe('annually');
    
    // Check account mapping (this was the bug)
    expect(normalized.targetAccountType).toBe('tax_deferred');
  });
  
  it('should handle rothIra mapping', () => {
    const eventRoth = {
      id: 'event-roth',
      name: 'Roth Contribution',
      type: 'SCHEDULED_CONTRIBUTION',
      amount: 500,
      frequency: 'monthly',
      accountType: 'rothIra'
    };
    
    const normalized = normalizeEventToMonthly(eventRoth as any, 2024);
    
    expect(normalized.targetAccountType).toBe('roth');
  });
  
  it('should not modify standard account types', () => {
    const eventStandard = {
      id: 'event-standard',
      name: 'Standard Account',
      type: 'SCHEDULED_CONTRIBUTION',
      amount: 1000,
      frequency: 'monthly',
      targetAccountType: 'tax_deferred'
    };
    
    const normalized = normalizeEventToMonthly(eventStandard as any, 2024);
    
    expect(normalized.targetAccountType).toBe('tax_deferred');
  });
});

describe('Integration: Full Pipeline Protection', () => {
  it('should prevent the exact 401k bug scenario end-to-end', () => {
    // This is the exact event that caused the billion-dollar bug
    const problematicEvent = {
      events: [{
        id: 'event-401k-contribution',
        name: '401k Contribution',
        type: 'SCHEDULED_CONTRIBUTION',
        amount: 23000,
        frequency: 'annually',
        monthOffset: 0,
        startDateOffset: 0,
        endDateOffset: 420,
        accountType: '401k', // The problematic field
        assetClass: 'US_STOCKS_TOTAL_MARKET',
        priority: 'SCHEDULED_CONTRIBUTION',
        description: '$23,000/year 401k contribution (max)'
      }]
    };
    
    // Step 1: Validation should pass with warnings
    const validationReport = validateEventPipeline(problematicEvent.events as any);
    expect(validationReport.valid).toBe(true);
    expect(validationReport.stats.fixedMappings).toBe(1);
    
    // Step 2: Normalization should map correctly  
    const normalized = normalizeEventToMonthly(problematicEvent.events[0] as any, 2024);
    expect(normalized.targetAccountType).toBe('tax_deferred');
    expect(normalized.monthlyAmount).toBeCloseTo(1916.67, 2);
    
    // Step 3: Final check - no more billion-dollar bug
    expect(normalized.monthlyAmount * 420).toBeCloseTo(805000, 0); // Total contributions
    expect(normalized.monthlyAmount).toBeLessThan(5000); // Reasonable monthly amount
    
    console.log('✅ 401k inflation bug is prevented by the new system!');
  });
});
