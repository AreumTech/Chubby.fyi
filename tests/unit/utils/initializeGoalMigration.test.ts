/**
 * Tests for Goal Migration Initialization Utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  initializeGoalMigration, 
  checkMigrationNeeded, 
  forceMigration,
  type MigrationInitOptions,
  type MigrationInitResult 
} from '@/utils/initializeGoalMigration';
import { goalMigrationService } from '@/services/goalMigrationService';
import { goalMigrationRunner } from '@/utils/goalMigrationRunner';

// Mock the dependencies
vi.mock('@/services/goalMigrationService');
vi.mock('@/utils/goalMigrationRunner');

const mockGoalMigrationService = vi.mocked(goalMigrationService);
const mockGoalMigrationRunner = vi.mocked(goalMigrationRunner);

describe('initializeGoalMigration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockGoalMigrationService.isMigrationNeeded.mockReturnValue(false);
    mockGoalMigrationService.getMigrationStatus.mockReturnValue({
      migrationNeeded: false,
      totalLegacyGoals: 0,
      totalEnhancedGoals: 0,
      scenarioBreakdown: []
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when migration is not needed', () => {
    it('should return success without running migration', async () => {
      mockGoalMigrationService.isMigrationNeeded.mockReturnValue(false);

      const result = await initializeGoalMigration();

      expect(result).toEqual({
        migrationNeeded: false,
        success: true,
        migratedGoalsCount: 0,
        errors: [],
        backupCreated: false
      });

      expect(mockGoalMigrationRunner.runSilentMigration).not.toHaveBeenCalled();
      expect(mockGoalMigrationRunner.runMigration).not.toHaveBeenCalled();
    });
  });

  describe('when migration is needed', () => {
    beforeEach(() => {
      mockGoalMigrationService.isMigrationNeeded.mockReturnValue(true);
      mockGoalMigrationService.getMigrationStatus.mockReturnValue({
        migrationNeeded: true,
        totalLegacyGoals: 5,
        totalEnhancedGoals: 0,
        scenarioBreakdown: [
          {
            scenarioName: 'Test Scenario',
            legacyGoals: 5,
            enhancedGoals: 0,
            migrationNeeded: true
          }
        ]
      });
    });

    it('should run silent migration by default', async () => {
      const mockMigrationResult = {
        success: true,
        migratedGoals: [{ id: '1' }, { id: '2' }, { id: '3' }],
        skippedGoals: [],
        errors: [],
        backupCreated: true,
        rollbackAvailable: true
      };

      mockGoalMigrationRunner.runSilentMigration.mockResolvedValue(mockMigrationResult);

      const result = await initializeGoalMigration();

      expect(mockGoalMigrationRunner.runSilentMigration).toHaveBeenCalledOnce();
      expect(result).toEqual({
        migrationNeeded: true,
        success: true,
        migratedGoalsCount: 3,
        errors: [],
        backupCreated: true
      });
    });

    it('should run interactive migration when silent=false', async () => {
      const mockMigrationResult = {
        success: true,
        migratedGoals: [{ id: '1' }],
        skippedGoals: [],
        errors: [],
        backupCreated: true,
        rollbackAvailable: true
      };

      mockGoalMigrationRunner.runMigration.mockResolvedValue(mockMigrationResult);

      const options: MigrationInitOptions = {
        silent: false,
        requireUserConsent: true,
        showProgress: true,
        autoCleanup: false,
        maxRetries: 2
      };

      const result = await initializeGoalMigration(options);

      expect(mockGoalMigrationRunner.runMigration).toHaveBeenCalledWith({
        requireUserConsent: true,
        showProgressDialog: true,
        autoCleanupLegacyGoals: false,
        maxRetries: 2
      });

      expect(result).toEqual({
        migrationNeeded: true,
        success: true,
        migratedGoalsCount: 1,
        errors: [],
        backupCreated: true
      });
    });

    it('should handle migration errors gracefully', async () => {
      const migrationError = new Error('Migration failed due to storage issue');
      mockGoalMigrationRunner.runSilentMigration.mockRejectedValue(migrationError);

      const result = await initializeGoalMigration();

      expect(result).toEqual({
        migrationNeeded: true,
        success: false,
        migratedGoalsCount: 0,
        errors: ['Migration failed due to storage issue'],
        backupCreated: false
      });
    });

    it('should handle migration result with errors', async () => {
      const mockMigrationResult = {
        success: false,
        migratedGoals: [],
        skippedGoals: [{ id: 'skipped' }],
        errors: ['Invalid goal format', 'Missing target amount'],
        backupCreated: true,
        rollbackAvailable: true
      };

      mockGoalMigrationRunner.runSilentMigration.mockResolvedValue(mockMigrationResult);

      const result = await initializeGoalMigration();

      expect(result).toEqual({
        migrationNeeded: true,
        success: false,
        migratedGoalsCount: 0,
        errors: ['Invalid goal format', 'Missing target amount'],
        backupCreated: true
      });
    });

    it('should handle null migration result (user declined)', async () => {
      mockGoalMigrationRunner.runSilentMigration.mockResolvedValue(null);

      const result = await initializeGoalMigration();

      expect(result).toEqual({
        migrationNeeded: true,
        success: true,
        migratedGoalsCount: 0,
        errors: [],
        backupCreated: false
      });
    });
  });

  describe('with different options', () => {
    beforeEach(() => {
      mockGoalMigrationService.isMigrationNeeded.mockReturnValue(true);
    });

    it('should pass correct options to migration runner', async () => {
      const mockMigrationResult = {
        success: true,
        migratedGoals: [],
        skippedGoals: [],
        errors: [],
        backupCreated: true,
        rollbackAvailable: true
      };

      mockGoalMigrationRunner.runMigration.mockResolvedValue(mockMigrationResult);

      const options: MigrationInitOptions = {
        silent: false,
        requireUserConsent: false,
        showProgress: true,
        autoCleanup: true,
        maxRetries: 5
      };

      await initializeGoalMigration(options);

      expect(mockGoalMigrationRunner.runMigration).toHaveBeenCalledWith({
        requireUserConsent: false,
        showProgressDialog: true,
        autoCleanupLegacyGoals: true,
        maxRetries: 5
      });
    });
  });
});

describe('checkMigrationNeeded', () => {
  it('should return migration status summary', () => {
    mockGoalMigrationService.isMigrationNeeded.mockReturnValue(true);
    mockGoalMigrationService.getMigrationStatus.mockReturnValue({
      migrationNeeded: true,
      totalLegacyGoals: 8,
      totalEnhancedGoals: 2,
      scenarioBreakdown: [
        {
          scenarioName: 'Scenario 1',
          legacyGoals: 5,
          enhancedGoals: 1,
          migrationNeeded: true
        },
        {
          scenarioName: 'Scenario 2',
          legacyGoals: 3,
          enhancedGoals: 1,
          migrationNeeded: true
        }
      ]
    });

    const result = checkMigrationNeeded();

    expect(result).toEqual({
      isNeeded: true,
      totalLegacyGoals: 8,
      totalEnhancedGoals: 2,
      scenariosNeedingMigration: 2
    });
  });

  it('should handle no migration needed case', () => {
    mockGoalMigrationService.isMigrationNeeded.mockReturnValue(false);
    mockGoalMigrationService.getMigrationStatus.mockReturnValue({
      migrationNeeded: false,
      totalLegacyGoals: 0,
      totalEnhancedGoals: 5,
      scenarioBreakdown: [
        {
          scenarioName: 'Scenario 1',
          legacyGoals: 0,
          enhancedGoals: 5,
          migrationNeeded: false
        }
      ]
    });

    const result = checkMigrationNeeded();

    expect(result).toEqual({
      isNeeded: false,
      totalLegacyGoals: 0,
      totalEnhancedGoals: 5,
      scenariosNeedingMigration: 0
    });
  });
});

describe('forceMigration', () => {
  it('should force migration to run', async () => {
    const mockMigrationResult = {
      success: true,
      migratedGoals: [{ id: '1' }, { id: '2' }],
      skippedGoals: [],
      errors: [],
      backupCreated: true,
      rollbackAvailable: true
    };

    mockGoalMigrationRunner.runMigration.mockResolvedValue(mockMigrationResult);

    const result = await forceMigration();

    expect(mockGoalMigrationRunner.runMigration).toHaveBeenCalledWith({
      requireUserConsent: false,
      showProgressDialog: false,
      autoCleanupLegacyGoals: false,
      maxRetries: 1
    });

    expect(result).toEqual({
      migrationNeeded: true,
      success: true,
      migratedGoalsCount: 2,
      errors: [],
      backupCreated: true
    });
  });

  it('should handle force migration failure', async () => {
    const migrationError = new Error('Force migration failed');
    mockGoalMigrationRunner.runMigration.mockRejectedValue(migrationError);

    const result = await forceMigration();

    expect(result).toEqual({
      migrationNeeded: true,
      success: false,
      migratedGoalsCount: 0,
      errors: ['Force migration failed'],
      backupCreated: false
    });
  });
});

describe('edge cases', () => {
  it('should handle migration service errors during status check', async () => {
    mockGoalMigrationService.isMigrationNeeded.mockImplementation(() => {
      throw new Error('Status check failed');
    });

    const result = await initializeGoalMigration();

    expect(result).toEqual({
      migrationNeeded: false,
      success: false,
      migratedGoalsCount: 0,
      errors: ['Status check failed'],
      backupCreated: false
    });
  });

  it('should handle non-Error exceptions', async () => {
    mockGoalMigrationService.isMigrationNeeded.mockReturnValue(true);
    mockGoalMigrationService.getMigrationStatus.mockReturnValue({
      migrationNeeded: true,
      totalLegacyGoals: 1,
      totalEnhancedGoals: 0,
      scenarioBreakdown: []
    });
    mockGoalMigrationRunner.runSilentMigration.mockRejectedValue('String error');

    const result = await initializeGoalMigration();

    expect(result.errors).toEqual(['Unknown migration error']);
    expect(result.success).toBe(false);
  });
});

describe('integration scenarios', () => {
  it('should handle partial migration success', async () => {
    mockGoalMigrationService.isMigrationNeeded.mockReturnValue(true);
    mockGoalMigrationService.getMigrationStatus.mockReturnValue({
      migrationNeeded: true,
      totalLegacyGoals: 2,
      totalEnhancedGoals: 0,
      scenarioBreakdown: []
    });
    
    const mockMigrationResult = {
      success: true,
      migratedGoals: [{ id: '1' }, { id: '2' }],
      skippedGoals: [{ id: 'invalid' }],
      errors: ['Goal "invalid" has missing target amount'],
      backupCreated: true,
      rollbackAvailable: true
    };

    mockGoalMigrationRunner.runSilentMigration.mockResolvedValue(mockMigrationResult);

    const result = await initializeGoalMigration();

    expect(result).toEqual({
      migrationNeeded: true,
      success: true,
      migratedGoalsCount: 2,
      errors: ['Goal "invalid" has missing target amount'],
      backupCreated: true
    });
  });

  it('should work with all options enabled', async () => {
    mockGoalMigrationService.isMigrationNeeded.mockReturnValue(true);
    mockGoalMigrationService.getMigrationStatus.mockReturnValue({
      migrationNeeded: true,
      totalLegacyGoals: 1,
      totalEnhancedGoals: 0,
      scenarioBreakdown: []
    });
    
    const mockMigrationResult = {
      success: true,
      migratedGoals: [{ id: '1' }],
      skippedGoals: [],
      errors: [],
      backupCreated: true,
      rollbackAvailable: true
    };

    mockGoalMigrationRunner.runMigration.mockResolvedValue(mockMigrationResult);

    const options: MigrationInitOptions = {
      silent: false,
      requireUserConsent: true,
      showProgress: true,
      autoCleanup: true,
      maxRetries: 10
    };

    const result = await initializeGoalMigration(options);

    expect(mockGoalMigrationRunner.runMigration).toHaveBeenCalledWith({
      requireUserConsent: true,
      showProgressDialog: true,
      autoCleanupLegacyGoals: true,
      maxRetries: 10
    });

    expect(result.success).toBe(true);
    expect(result.migratedGoalsCount).toBe(1);
  });
});
