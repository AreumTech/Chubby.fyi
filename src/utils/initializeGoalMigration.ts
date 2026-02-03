/**
 * Goal Migration Initialization Utility
 * 
 * Simple utility function to run goal migration during app initialization.
 * This is a convenience wrapper around the existing comprehensive migration system.
 * 
 * Usage:
 * ```typescript
 * import { initializeGoalMigration } from './utils/initializeGoalMigration';
 * 
 * // In your app initialization
 * await initializeGoalMigration();
 * ```
 */

import { goalMigrationRunner } from './goalMigrationRunner';
import { goalMigrationService } from '../services/goalMigrationService';
import { logger } from './logger';

interface MigrationInitOptions {
  /** Whether to require explicit user consent before migration */
  requireUserConsent?: boolean;
  /** Whether to show progress dialogs during migration */
  showProgress?: boolean;
  /** Whether to automatically clean up legacy goals after successful migration */
  autoCleanup?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Whether to run silently without any user interaction */
  silent?: boolean;
}

interface MigrationInitResult {
  /** Whether migration was needed */
  migrationNeeded: boolean;
  /** Whether migration was successful */
  success: boolean;
  /** Number of goals migrated */
  migratedGoalsCount: number;
  /** Any errors that occurred */
  errors: string[];
  /** Whether a backup was created */
  backupCreated: boolean;
}

/**
 * Initialize goal migration during app startup
 * 
 * This function:
 * 1. Checks if migration is needed
 * 2. Runs the migration process
 * 3. Handles errors gracefully
 * 4. Returns a summary of the migration result
 */
export async function initializeGoalMigration(
  options: MigrationInitOptions = {}
): Promise<MigrationInitResult> {
  const {
    requireUserConsent = false,
    showProgress = false,
    autoCleanup = false,
    maxRetries = 3,
    silent = true
  } = options;

  const result: MigrationInitResult = {
    migrationNeeded: false,
    success: false,
    migratedGoalsCount: 0,
    errors: [],
    backupCreated: false
  };

  try {
    logger.info('🔍 Checking for goal migration needs...');

    // Step 1: Check if migration is needed
    const migrationNeeded = goalMigrationService.isMigrationNeeded();
    result.migrationNeeded = migrationNeeded;

    if (!migrationNeeded) {
      logger.info('✅ No goal migration needed');
      result.success = true;
      return result;
    }

    // Step 2: Get migration status for logging
    const status = goalMigrationService.getMigrationStatus();
    logger.info(`📊 Found ${status.totalLegacyGoals} legacy goals across ${status.scenarioBreakdown.length} scenarios`);

    // Step 3: Run appropriate migration type
    let migrationResult;
    
    if (silent) {
      logger.info('🤫 Running silent migration...');
      migrationResult = await goalMigrationRunner.runSilentMigration();
    } else {
      logger.info('👤 Running interactive migration...');
      migrationResult = await goalMigrationRunner.runMigration({
        requireUserConsent,
        showProgressDialog: showProgress,
        autoCleanupLegacyGoals: autoCleanup,
        maxRetries
      });
    }

    // Step 4: Process results
    if (migrationResult) {
      result.success = migrationResult.success;
      result.migratedGoalsCount = migrationResult.migratedGoals.length;
      result.errors = migrationResult.errors;
      result.backupCreated = migrationResult.backupCreated;

      if (migrationResult.success) {
        logger.info(`✅ Successfully migrated ${migrationResult.migratedGoals.length} goals`);
        
        if (migrationResult.errors.length > 0) {
          logger.warn(`⚠️ Migration completed with ${migrationResult.errors.length} warnings:`, migrationResult.errors);
        }
      } else {
        logger.error('❌ Migration failed:', migrationResult.errors);
      }
    } else {
      // Migration was not run (user declined or not needed)
      logger.info('📋 Migration was skipped or not needed');
      result.success = true;
    }

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
    logger.error('❌ Goal migration initialization failed:', errorMessage);
    
    result.errors.push(errorMessage);
    result.success = false;
    
    return result;
  }
}

/**
 * Check if goal migration is needed without running it
 */
export function checkMigrationNeeded(): {
  isNeeded: boolean;
  totalLegacyGoals: number;
  totalEnhancedGoals: number;
  scenariosNeedingMigration: number;
} {
  const isNeeded = goalMigrationService.isMigrationNeeded();
  const status = goalMigrationService.getMigrationStatus();
  
  return {
    isNeeded,
    totalLegacyGoals: status.totalLegacyGoals,
    totalEnhancedGoals: status.totalEnhancedGoals,
    scenariosNeedingMigration: status.scenarioBreakdown.filter(s => s.migrationNeeded).length
  };
}

/**
 * Force migration to run even if it appears not needed (for testing/debugging)
 */
export async function forceMigration(): Promise<MigrationInitResult> {
  logger.warn('🚨 Force migration requested - running regardless of need check');
  
  try {
    const migrationResult = await goalMigrationRunner.runMigration({
      requireUserConsent: false,
      showProgressDialog: false,
      autoCleanupLegacyGoals: false,
      maxRetries: 1
    });

    return {
      migrationNeeded: true,
      success: migrationResult?.success ?? false,
      migratedGoalsCount: migrationResult?.migratedGoals.length ?? 0,
      errors: migrationResult?.errors ?? [],
      backupCreated: migrationResult?.backupCreated ?? false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Force migration failed';
    return {
      migrationNeeded: true,
      success: false,
      migratedGoalsCount: 0,
      errors: [errorMessage],
      backupCreated: false
    };
  }
}

/**
 * Get detailed migration status for debugging
 */
export function getDetailedMigrationStatus(): string {
  return goalMigrationRunner.getDetailedStatus();
}

// Export types for external use
export type { MigrationInitOptions, MigrationInitResult };