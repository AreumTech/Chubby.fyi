/**
 * Goal Migration Runner
 * 
 * Utility to automatically run goal migration during app initialization.
 * Handles user consent, progress reporting, and error recovery.
 */

import { goalMigrationService, type MigrationResult } from '../services/goalMigrationService';
import { logger } from './logger';

interface MigrationRunnerConfig {
  requireUserConsent: boolean;
  showProgressDialog: boolean;
  autoCleanupLegacyGoals: boolean;
  maxRetries: number;
}

interface MigrationProgressCallback {
  (stage: 'starting' | 'backing_up' | 'migrating' | 'validating' | 'completed' | 'error', 
   message: string, 
   progress?: number): void;
}

class GoalMigrationRunner {
  private readonly defaultConfig: MigrationRunnerConfig = {
    requireUserConsent: true,
    showProgressDialog: true,
    autoCleanupLegacyGoals: false,
    maxRetries: 3
  };

  /**
   * Main entry point - run migration with user interaction
   */
  async runMigration(
    config: Partial<MigrationRunnerConfig> = {},
    progressCallback?: MigrationProgressCallback
  ): Promise<MigrationResult | null> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      // Step 1: Check if migration is needed
      if (!goalMigrationService.isMigrationNeeded()) {
        logger.info('✅ No goal migration needed');
        return null;
      }

      // Step 2: Get migration status
      const status = goalMigrationService.getMigrationStatus();
      logger.info('📊 Migration status:', status);

      // Step 3: Get user consent if required
      if (finalConfig.requireUserConsent) {
        const userConsent = await this.getUserConsent(status);
        if (!userConsent) {
          logger.info('❌ User declined goal migration');
          return null;
        }
      }

      // Step 4: Run migration with progress reporting
      progressCallback?.('starting', 'Initializing goal migration...', 0);
      
      let result: MigrationResult | null = null;
      let retryCount = 0;

      while (retryCount < finalConfig.maxRetries) {
        try {
          progressCallback?.('backing_up', 'Creating backup of current data...', 20);
          
          progressCallback?.('migrating', 'Converting legacy goals to enhanced format...', 40);
          
          result = await goalMigrationService.migrateGoals();
          
          progressCallback?.('validating', 'Validating migrated goals...', 80);
          
          if (result.success) {
            break;
          } else {
            throw new Error(`Migration failed: ${result.errors.join(', ')}`);
          }
        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.warn(`⚠️ Migration attempt ${retryCount} failed: ${errorMessage}`);
          
          if (retryCount >= finalConfig.maxRetries) {
            progressCallback?.('error', `Migration failed after ${finalConfig.maxRetries} attempts`, 0);
            throw error;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!result || !result.success) {
        throw new Error('Migration failed after all retry attempts');
      }

      // Step 5: Show completion dialog
      progressCallback?.('completed', `Successfully migrated ${result.migratedGoals.length} goals`, 100);
      
      if (finalConfig.showProgressDialog) {
        this.showCompletionDialog(result);
      }

      // Step 6: Optional cleanup
      if (finalConfig.autoCleanupLegacyGoals && result.success) {
        try {
          goalMigrationService.cleanupLegacyGoals();
          logger.info('🧹 Legacy goals automatically cleaned up');
        } catch (error) {
          logger.warn('⚠️ Failed to cleanup legacy goals:', error);
        }
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Migration runner failed:', errorMessage);
      
      progressCallback?.('error', `Migration failed: ${errorMessage}`, 0);
      
      // Show error dialog
      if (finalConfig.showProgressDialog) {
        this.showErrorDialog(errorMessage);
      }
      
      throw error;
    }
  }

  /**
   * Silent migration for development/testing (no user interaction)
   */
  async runSilentMigration(): Promise<MigrationResult | null> {
    return this.runMigration({
      requireUserConsent: false,
      showProgressDialog: false,
      autoCleanupLegacyGoals: false,
      maxRetries: 1
    });
  }

  /**
   * Get user consent for migration
   */
  private async getUserConsent(status: ReturnType<typeof goalMigrationService.getMigrationStatus>): Promise<boolean> {
    return new Promise((resolve) => {
      const message = this.buildConsentMessage(status);
      
      // In a real app, this would show a proper modal dialog
      // For now, using browser confirm dialog
      const consent = confirm(message);
      resolve(consent);
    });
  }

  /**
   * Build consent message for user
   */
  private buildConsentMessage(status: ReturnType<typeof goalMigrationService.getMigrationStatus>): string {
    const scenarios = status.scenarioBreakdown.filter(s => s.migrationNeeded);
    
    let message = `🎯 Goal System Upgrade Available\n\n`;
    message += `We've improved how goals work in PathFinder Pro! Your current goals can be upgraded to the new enhanced format with better account targeting and tracking.\n\n`;
    message += `Migration Details:\n`;
    message += `• ${status.totalLegacyGoals} legacy goals found\n`;
    message += `• ${scenarios.length} scenarios need migration\n\n`;
    
    if (scenarios.length > 0) {
      message += `Affected Scenarios:\n`;
      scenarios.forEach(s => {
        message += `• "${s.scenarioName}": ${s.legacyGoals} goals\n`;
      });
      message += `\n`;
    }
    
    message += `The migration will:\n`;
    message += `✅ Convert your goals to the new enhanced format\n`;
    message += `✅ Map goals to appropriate account types\n`;
    message += `✅ Preserve all your existing goal data\n`;
    message += `✅ Create a backup for easy rollback\n\n`;
    message += `Would you like to upgrade your goals now?`;
    
    return message;
  }

  /**
   * Show completion dialog
   */
  private showCompletionDialog(result: MigrationResult): void {
    let message = `🎉 Goal Migration Completed!\n\n`;
    message += `✅ Successfully migrated ${result.migratedGoals.length} goals\n`;
    
    if (result.skippedGoals.length > 0) {
      message += `⚠️ Skipped ${result.skippedGoals.length} goals (see console for details)\n`;
    }
    
    if (result.errors.length > 0) {
      message += `⚠️ ${result.errors.length} warnings (see console for details)\n`;
    }
    
    message += `\nYour goals are now using the enhanced format with better account targeting and progress tracking.\n\n`;
    
    if (result.rollbackAvailable) {
      message += `💾 A backup was created - you can rollback if needed by contacting support.`;
    }
    
    alert(message);
  }

  /**
   * Show error dialog
   */
  private showErrorDialog(errorMessage: string): void {
    const message = `❌ Goal Migration Failed\n\n` +
      `We encountered an error while upgrading your goals:\n\n` +
      `${errorMessage}\n\n` +
      `Your existing goals are safe and unchanged. Please try again or contact support if the problem persists.`;
    
    alert(message);
  }

  /**
   * Create a progress indicator for console
   */
  createConsoleProgressLogger(): MigrationProgressCallback {
    return (stage, message, progress) => {
      const progressBar = progress !== undefined 
        ? ` [${Math.round(progress)}%]`
        : '';
      
      const stageEmoji = {
        starting: '🚀',
        backing_up: '💾',
        migrating: '🔄',
        validating: '✅',
        completed: '🎉',
        error: '❌'
      }[stage] || '📋';
      
      logger.info(`${stageEmoji} ${message}${progressBar}`);
    };
  }

  /**
   * Rollback migration (emergency use)
   */
  async rollback(): Promise<boolean> {
    try {
      logger.info('🔄 Starting migration rollback...');
      const success = await goalMigrationService.rollbackMigration();
      
      if (success) {
        logger.info('✅ Migration rollback completed');
        alert('Goal migration has been rolled back. Your data has been restored to the previous state.');
      } else {
        logger.error('❌ Migration rollback failed');
        alert('Failed to rollback migration. Please contact support.');
      }
      
      return success;
    } catch (error) {
      logger.error('❌ Rollback error:', error);
      alert('Error during rollback. Please contact support.');
      return false;
    }
  }

  /**
   * Manual cleanup of legacy goals (after successful migration)
   */
  cleanupLegacyGoals(): void {
    const consent = confirm(
      '🧹 Clean Up Legacy Goals\n\n' +
      'This will remove the old goal format from your data, keeping only the new enhanced goals.\n\n' +
      'This action cannot be undone. Are you sure you want to proceed?'
    );
    
    if (consent) {
      try {
        goalMigrationService.cleanupLegacyGoals();
        alert('✅ Legacy goals cleaned up successfully!');
      } catch (error) {
        logger.error('❌ Cleanup failed:', error);
        alert('Failed to cleanup legacy goals. Your data is safe.');
      }
    }
  }

  /**
   * Get detailed migration status for debugging
   */
  getDetailedStatus(): string {
    const status = goalMigrationService.getMigrationStatus();
    
    let report = `=== Goal Migration Status ===\n\n`;
    report += `Migration Needed: ${status.migrationNeeded ? 'YES' : 'NO'}\n`;
    report += `Total Legacy Goals: ${status.totalLegacyGoals}\n`;
    report += `Total Enhanced Goals: ${status.totalEnhancedGoals}\n\n`;
    
    report += `Scenario Breakdown:\n`;
    status.scenarioBreakdown.forEach(scenario => {
      report += `\n"${scenario.scenarioName}":\n`;
      report += `  Legacy Goals: ${scenario.legacyGoals}\n`;
      report += `  Enhanced Goals: ${scenario.enhancedGoals}\n`;
      report += `  Needs Migration: ${scenario.migrationNeeded ? 'YES' : 'NO'}\n`;
    });
    
    return report;
  }
}

// Export singleton instance
export const goalMigrationRunner = new GoalMigrationRunner();

// Export for advanced usage
export { GoalMigrationRunner };