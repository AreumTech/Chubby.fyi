/**
 * Goal Migration Service
 * 
 * Converts legacy Goal objects to new EnhancedGoal format with proper account targeting.
 * Handles edge cases, validation, backup, and rollback functionality.
 */

import { Goal } from '../types/generated/goal';
import { EnhancedGoal, StandardAccountType } from '../types/enhanced-goal';
import { useAppStore } from '../store/appStore';
import { logger } from '../utils/logger';

// Migration configuration
interface GoalMigrationConfig {
  version: number;
  backupKey: string;
  storageKey: string;
}

// Legacy goal type mappings
const LEGACY_CATEGORY_TO_ACCOUNT_TYPE: Record<Goal['category'], StandardAccountType> = {
  'RETIREMENT': 'tax_deferred',
  'EDUCATION': '529',
  'MAJOR_PURCHASE': 'taxable',
  'CUSTOM': 'cash'
};

// Enhanced category mappings for better user experience
const LEGACY_TO_ENHANCED_CATEGORY: Record<Goal['category'], EnhancedGoal['category']> = {
  'RETIREMENT': 'RETIREMENT',
  'EDUCATION': 'EDUCATION', 
  'MAJOR_PURCHASE': 'CUSTOM',
  'CUSTOM': 'CUSTOM'
};

// Priority mappings (legacy uses numbers, enhanced uses strings)
const LEGACY_PRIORITY_TO_ENHANCED: Record<number, EnhancedGoal['priority']> = {
  1: 'HIGH',
  2: 'MEDIUM', 
  3: 'LOW'
};

interface MigrationResult {
  success: boolean;
  migratedGoals: EnhancedGoal[];
  skippedGoals: Goal[];
  errors: string[];
  backupCreated: boolean;
  rollbackAvailable: boolean;
}

interface GoalMigrationReport {
  totalLegacyGoals: number;
  successfulMigrations: number;
  skippedGoals: number;
  errors: string[];
  mappingDetails: Array<{
    legacyGoal: Goal;
    enhancedGoal?: EnhancedGoal;
    error?: string;
  }>;
}

class GoalMigrationService {
  private readonly config: GoalMigrationConfig = {
    version: 1,
    backupKey: 'pathfinder-legacy-goals-backup',
    storageKey: 'pathfinder-app-storage'
  };

  /**
   * Main migration function - converts all legacy goals to enhanced format
   */
  async migrateGoals(): Promise<MigrationResult> {
    logger.info('🔄 Starting goal migration process...');
    
    const result: MigrationResult = {
      success: false,
      migratedGoals: [],
      skippedGoals: [],
      errors: [],
      backupCreated: false,
      rollbackAvailable: false
    };

    try {
      // Step 1: Get current store state
      const store = useAppStore.getState();
      const scenarios = store.scenarios;
      
      if (!scenarios || Object.keys(scenarios).length === 0) {
        result.errors.push('No scenarios found in store');
        return result;
      }

      // Step 2: Create backup of current state
      result.backupCreated = await this.createBackup();
      if (!result.backupCreated) {
        result.errors.push('Failed to create backup - aborting migration');
        return result;
      }

      // Step 3: Process each scenario
      let totalMigrated = 0;
      let totalSkipped = 0;

      for (const [scenarioId, scenario] of Object.entries(scenarios)) {
        if (!scenario.goals || scenario.goals.length === 0) {
          logger.info(`📋 Scenario "${scenario.name}" has no legacy goals to migrate`);
          continue;
        }

        // Skip if scenario already has enhanced goals
        if (scenario.enhancedGoals && scenario.enhancedGoals.length > 0) {
          logger.info(`✅ Scenario "${scenario.name}" already has enhanced goals, skipping migration`);
          continue;
        }

        logger.info(`🎯 Migrating ${scenario.goals.length} goals in scenario "${scenario.name}"`);

        const migrationReport = this.migrateScenarioGoals(scenario.goals);
        
        // Update scenario with migrated goals
        if (migrationReport.successfulMigrations > 0) {
          const enhancedGoals = migrationReport.mappingDetails
            .filter(detail => detail.enhancedGoal)
            .map(detail => detail.enhancedGoal!);

          // Update the store
          store.setScenarios(prevScenarios => ({
            ...prevScenarios,
            [scenarioId]: {
              ...scenario,
              enhancedGoals: enhancedGoals,
              // Keep legacy goals for rollback capability
              goals: scenario.goals
            }
          }));

          totalMigrated += migrationReport.successfulMigrations;
        }

        totalSkipped += migrationReport.skippedGoals;
        result.errors.push(...migrationReport.errors);
      }

      // Step 4: Finalize results
      result.migratedGoals = this.getAllEnhancedGoals();
      result.success = totalMigrated > 0;
      result.rollbackAvailable = result.backupCreated;

      logger.info(`✅ Migration completed: ${totalMigrated} goals migrated, ${totalSkipped} skipped`);
      
      if (result.errors.length > 0) {
        logger.warn('⚠️ Migration completed with warnings:', result.errors);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Migration failed: ${errorMessage}`);
      logger.error('❌ Goal migration failed:', error);
      
      // Attempt rollback on critical failure
      if (result.backupCreated) {
        logger.info('🔄 Attempting automatic rollback...');
        await this.rollbackMigration();
      }
      
      return result;
    }
  }

  /**
   * Migrate goals for a specific scenario
   */
  private migrateScenarioGoals(legacyGoals: Goal[]): GoalMigrationReport {
    const report: GoalMigrationReport = {
      totalLegacyGoals: legacyGoals.length,
      successfulMigrations: 0,
      skippedGoals: 0,
      errors: [],
      mappingDetails: []
    };

    for (const legacyGoal of legacyGoals) {
      try {
        // Validate legacy goal
        const validationError = this.validateLegacyGoal(legacyGoal);
        if (validationError) {
          report.errors.push(`Goal "${legacyGoal.name}": ${validationError}`);
          report.mappingDetails.push({
            legacyGoal,
            error: validationError
          });
          report.skippedGoals++;
          continue;
        }

        // Convert to enhanced goal
        const enhancedGoal = this.convertLegacyToEnhanced(legacyGoal);
        
        // Validate enhanced goal
        const enhancedValidationError = this.validateEnhancedGoal(enhancedGoal);
        if (enhancedValidationError) {
          report.errors.push(`Converted goal "${enhancedGoal.name}": ${enhancedValidationError}`);
          report.mappingDetails.push({
            legacyGoal,
            error: enhancedValidationError
          });
          report.skippedGoals++;
          continue;
        }

        // Success!
        report.mappingDetails.push({
          legacyGoal,
          enhancedGoal
        });
        report.successfulMigrations++;

        // Goal migrated successfully

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
        report.errors.push(`Goal "${legacyGoal.name}": ${errorMessage}`);
        report.mappingDetails.push({
          legacyGoal,
          error: errorMessage
        });
        report.skippedGoals++;
      }
    }

    return report;
  }

  /**
   * Convert a single legacy goal to enhanced format
   */
  private convertLegacyToEnhanced(legacyGoal: Goal): EnhancedGoal {
    const now = new Date();
    
    // Calculate target date from monthOffset
    const targetDate = legacyGoal.targetMonthOffset > 0 
      ? new Date(now.getFullYear(), now.getMonth() + legacyGoal.targetMonthOffset)
      : undefined;

    // Determine target account type
    const targetAccountType = LEGACY_CATEGORY_TO_ACCOUNT_TYPE[legacyGoal.category];
    
    // Create enhanced category
    const enhancedCategory = LEGACY_TO_ENHANCED_CATEGORY[legacyGoal.category];
    
    // Convert priority
    const priority = LEGACY_PRIORITY_TO_ENHANCED[legacyGoal.priority] || 'MEDIUM';

    // Generate account name based on goal type
    const accountName = this.generateAccountName(legacyGoal);

    const enhancedGoal: EnhancedGoal = {
      id: legacyGoal.id,
      name: legacyGoal.name,
      description: legacyGoal.description || this.generateDescription(legacyGoal),
      targetAmount: legacyGoal.targetAmount,
      targetDate,
      targetAccount: {
        type: targetAccountType,
        name: accountName
      },
      category: enhancedCategory,
      priority,
      // Initialize tracking fields
      currentAmount: 0,
      progressPercentage: 0,
      monthlyContributionNeeded: undefined,
      // Set default funding strategy for retirement goals
      fundingStrategy: this.generateFundingStrategy(legacyGoal, targetAccountType),
      // Metadata
      createdAt: now,
      updatedAt: now,
      isActive: true
    };

    return enhancedGoal;
  }

  /**
   * Generate appropriate account name based on goal
   */
  private generateAccountName(legacyGoal: Goal): string {
    switch (legacyGoal.category) {
      case 'RETIREMENT':
        return `${legacyGoal.name} Fund`;
      case 'EDUCATION':
        return `${legacyGoal.name} 529`;
      case 'MAJOR_PURCHASE':
        return `${legacyGoal.name} Savings`;
      case 'CUSTOM':
        return legacyGoal.name;
      default:
        return legacyGoal.name;
    }
  }

  /**
   * Generate description if missing
   */
  private generateDescription(legacyGoal: Goal): string {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(legacyGoal.targetAmount);

    switch (legacyGoal.category) {
      case 'RETIREMENT':
        return `Build retirement savings of ${formattedAmount}`;
      case 'EDUCATION':
        return `Save ${formattedAmount} for education expenses`;
      case 'MAJOR_PURCHASE':
        return `Save ${formattedAmount} for major purchase`;
      case 'CUSTOM':
        return `Financial goal to reach ${formattedAmount}`;
      default:
        return `Reach ${formattedAmount} target`;
    }
  }

  /**
   * Generate funding strategy for goal
   */
  private generateFundingStrategy(
    legacyGoal: Goal, 
    accountType: StandardAccountType
  ): EnhancedGoal['fundingStrategy'] {
    // Only generate strategy for retirement goals
    if (legacyGoal.category === 'RETIREMENT') {
      return {
        automaticContributions: true,
        contributionFrequency: 'monthly',
        sourceAccount: 'cash' // Default source account
      };
    }

    return undefined;
  }

  /**
   * Validate legacy goal before conversion
   */
  private validateLegacyGoal(goal: Goal): string | null {
    if (!goal.id) return 'Missing goal ID';
    if (!goal.name?.trim()) return 'Missing or empty goal name';
    if (typeof goal.targetAmount !== 'number' || goal.targetAmount <= 0) {
      return 'Invalid target amount';
    }
    if (!Object.keys(LEGACY_CATEGORY_TO_ACCOUNT_TYPE).includes(goal.category)) {
      return `Unknown category: ${goal.category}`;
    }
    if (typeof goal.priority !== 'number' || goal.priority < 1 || goal.priority > 3) {
      return 'Invalid priority (must be 1, 2, or 3)';
    }
    if (typeof goal.targetMonthOffset !== 'number' || goal.targetMonthOffset < 0) {
      return 'Invalid target month offset';
    }

    return null;
  }

  /**
   * Validate enhanced goal after conversion
   */
  private validateEnhancedGoal(goal: EnhancedGoal): string | null {
    if (!goal.id) return 'Missing enhanced goal ID';
    if (!goal.name?.trim()) return 'Missing enhanced goal name';
    if (typeof goal.targetAmount !== 'number' || goal.targetAmount <= 0) {
      return 'Invalid enhanced goal target amount';
    }
    if (!goal.targetAccount?.type) return 'Missing target account type';
    if (!(['cash', 'taxable', 'tax_deferred', 'roth', '529', 'hsa'] as StandardAccountType[]).includes(goal.targetAccount.type)) {
      return `Invalid target account type: ${goal.targetAccount.type}`;
    }
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(goal.priority)) {
      return `Invalid enhanced priority: ${goal.priority}`;
    }

    return null;
  }

  /**
   * Create backup of current state
   */
  private async createBackup(): Promise<boolean> {
    try {
      const currentData = localStorage.getItem(this.config.storageKey);
      if (!currentData) {
        logger.info('📋 No existing data to backup');
        return true;
      }

      const timestamp = new Date().toISOString();
      const backupKey = `${this.config.backupKey}-${timestamp}`;
      
      localStorage.setItem(backupKey, currentData);
      
      // Also create a latest backup
      localStorage.setItem(this.config.backupKey, currentData);
      
      logger.info(`💾 Backup created: ${backupKey}`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to create backup:', error);
      return false;
    }
  }

  /**
   * Rollback to previous state
   */
  async rollbackMigration(): Promise<boolean> {
    try {
      const backupData = localStorage.getItem(this.config.backupKey);
      if (!backupData) {
        logger.error('❌ No backup available for rollback');
        return false;
      }

      // Validate backup data
      const parsed = JSON.parse(backupData);
      if (!parsed || typeof parsed !== 'object') {
        logger.error('❌ Invalid backup data format');
        return false;
      }

      // Restore backup
      localStorage.setItem(this.config.storageKey, backupData);
      
      logger.info('✅ Successfully rolled back to pre-migration state');
      
      // Reload to apply changes
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      
      return true;
    } catch (error) {
      logger.error('❌ Rollback failed:', error);
      return false;
    }
  }

  /**
   * Check if migration is needed
   */
  isMigrationNeeded(): boolean {
    const store = useAppStore.getState();
    const scenarios = store.scenarios;
    
    for (const scenario of Object.values(scenarios)) {
      // If any scenario has legacy goals but no enhanced goals, migration is needed
      if (scenario.goals && scenario.goals.length > 0 && 
          (!scenario.enhancedGoals || scenario.enhancedGoals.length === 0)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get all enhanced goals from store
   */
  private getAllEnhancedGoals(): EnhancedGoal[] {
    const store = useAppStore.getState();
    const scenarios = store.scenarios;
    
    const allEnhancedGoals: EnhancedGoal[] = [];
    
    for (const scenario of Object.values(scenarios)) {
      if (scenario.enhancedGoals) {
        allEnhancedGoals.push(...scenario.enhancedGoals);
      }
    }
    
    return allEnhancedGoals;
  }

  /**
   * Get migration status report
   */
  getMigrationStatus(): {
    migrationNeeded: boolean;
    totalLegacyGoals: number;
    totalEnhancedGoals: number;
    scenarioBreakdown: Array<{
      scenarioName: string;
      legacyGoals: number;
      enhancedGoals: number;
      migrationNeeded: boolean;
    }>;
  } {
    const store = useAppStore.getState();
    const scenarios = store.scenarios;
    
    let totalLegacyGoals = 0;
    let totalEnhancedGoals = 0;
    let migrationNeeded = false;
    
    const scenarioBreakdown = Object.values(scenarios).map(scenario => {
      const legacyCount = scenario.goals?.length || 0;
      const enhancedCount = scenario.enhancedGoals?.length || 0;
      const needsMigration = legacyCount > 0 && enhancedCount === 0;
      
      totalLegacyGoals += legacyCount;
      totalEnhancedGoals += enhancedCount;
      
      if (needsMigration) {
        migrationNeeded = true;
      }
      
      return {
        scenarioName: scenario.name,
        legacyGoals: legacyCount,
        enhancedGoals: enhancedCount,
        migrationNeeded: needsMigration
      };
    });
    
    return {
      migrationNeeded,
      totalLegacyGoals,
      totalEnhancedGoals,
      scenarioBreakdown
    };
  }

  /**
   * Remove legacy goals after successful migration (optional cleanup)
   */
  cleanupLegacyGoals(): void {
    const store = useAppStore.getState();
    const scenarios = store.scenarios;
    
    let cleanedScenarios = false;
    
    for (const [scenarioId, scenario] of Object.entries(scenarios)) {
      if (scenario.goals && scenario.goals.length > 0 && 
          scenario.enhancedGoals && scenario.enhancedGoals.length > 0) {
        
        // Remove legacy goals but keep enhanced ones
        store.setScenarios(prevScenarios => ({
          ...prevScenarios,
          [scenarioId]: {
            ...scenario,
            goals: [] // Clear legacy goals
          }
        }));
        
        cleanedScenarios = true;
      }
    }
    
    if (cleanedScenarios) {
      logger.info('🧹 Legacy goals cleaned up successfully');
    }
  }
}

// Export singleton instance
export const goalMigrationService = new GoalMigrationService();

// Export types for external use
export type { MigrationResult, GoalMigrationReport };