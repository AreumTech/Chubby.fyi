/**
 * Goal Migration CLI Utility
 * 
 * Command-line interface for testing and managing goal migration.
 * Useful for development, debugging, and manual migration tasks.
 * 
 * Usage in browser console:
 * ```javascript
 * import('./src/utils/migrationCLI.js').then(cli => {
 *   cli.migrationCLI.status();
 *   cli.migrationCLI.migrate();
 *   cli.migrationCLI.rollback();
 * });
 * ```
 */

import { goalMigrationService } from '../services/goalMigrationService';
import { goalMigrationRunner } from './goalMigrationRunner';
import { logger } from './logger';
import { 
  initializeGoalMigration, 
  checkMigrationNeeded, 
  forceMigration,
  getDetailedMigrationStatus 
} from './initializeGoalMigration';

interface CLICommand {
  name: string;
  description: string;
  fn: (...args: any[]) => Promise<any> | any;
}

class MigrationCLI {
  private commands: Map<string, CLICommand> = new Map();

  constructor() {
    this.registerCommands();
    this.setupGlobalAccess();
  }

  private registerCommands() {
    const commands: CLICommand[] = [
      {
        name: 'status',
        description: 'Show detailed migration status',
        fn: this.getStatus.bind(this)
      },
      {
        name: 'check',
        description: 'Check if migration is needed',
        fn: this.checkNeeded.bind(this)
      },
      {
        name: 'migrate',
        description: 'Run silent migration',
        fn: this.runMigration.bind(this)
      },
      {
        name: 'migrate-interactive',
        description: 'Run interactive migration with user prompts',
        fn: this.runInteractiveMigration.bind(this)
      },
      {
        name: 'force',
        description: 'Force migration to run (ignores need check)',
        fn: this.forceMigration.bind(this)
      },
      {
        name: 'rollback',
        description: 'Rollback the last migration',
        fn: this.rollbackMigration.bind(this)
      },
      {
        name: 'cleanup',
        description: 'Clean up legacy goals after successful migration',
        fn: this.cleanupLegacyGoals.bind(this)
      },
      {
        name: 'help',
        description: 'Show available commands',
        fn: this.showHelp.bind(this)
      },
      {
        name: 'test',
        description: 'Run migration test scenarios',
        fn: this.runTests.bind(this)
      }
    ];

    commands.forEach(cmd => this.commands.set(cmd.name, cmd));
  }

  private setupGlobalAccess() {
    // Make CLI available globally for browser console access
    if (typeof window !== 'undefined') {
      (window as any).migrationCLI = this.createPublicInterface();
    }
  }

  private createPublicInterface() {
    const publicInterface: any = {};
    
    this.commands.forEach((command, name) => {
      publicInterface[name] = command.fn;
    });

    // Add alias methods
    publicInterface.run = publicInterface.migrate;
    publicInterface.interactive = publicInterface['migrate-interactive'];
    publicInterface.details = publicInterface.status;

    return publicInterface;
  }

  // Command implementations

  async getStatus() {
    logger.info('📊 Goal Migration Status Report');
    logger.info('================================');
    
    try {
      const detailed = getDetailedMigrationStatus();
      logger.info(detailed);
      
      const summary = checkMigrationNeeded();
      logger.info('\n📋 Quick Summary:');
      logger.info(`• Migration needed: ${summary.isNeeded ? 'YES' : 'NO'}`);
      logger.info(`• Legacy goals: ${summary.totalLegacyGoals}`);
      logger.info(`• Enhanced goals: ${summary.totalEnhancedGoals}`);
      logger.info(`• Scenarios needing migration: ${summary.scenariosNeedingMigration}`);
      
      return summary;
    } catch (error) {
      logger.error('❌ Failed to get migration status:', error);
      return null;
    }
  }

  checkNeeded() {
    logger.info('🔍 Checking migration status...');
    
    try {
      const result = checkMigrationNeeded();
      
      if (result.isNeeded) {
        logger.info(`✅ Migration IS needed:`);
        logger.info(`   • ${result.totalLegacyGoals} legacy goals found`);
        logger.info(`   • ${result.scenariosNeedingMigration} scenarios need migration`);
      } else {
        logger.info('✅ Migration NOT needed - all goals are already enhanced');
      }
      
      return result;
    } catch (error) {
      logger.error('❌ Failed to check migration status:', error);
      return null;
    }
  }

  async runMigration() {
    logger.info('🚀 Starting silent migration...');
    
    try {
      const result = await initializeGoalMigration({
        silent: true,
        requireUserConsent: false,
        showProgress: false,
        autoCleanup: false
      });
      
      if (result.migrationNeeded) {
        if (result.success) {
          logger.info(`✅ Migration completed successfully!`);
          logger.info(`   • ${result.migratedGoalsCount} goals migrated`);
          if (result.errors.length > 0) {
            logger.warn(`   • ${result.errors.length} warnings:`, result.errors);
          }
        } else {
          logger.error(`❌ Migration failed:`, result.errors);
        }
      } else {
        logger.info('ℹ️ No migration needed');
      }
      
      return result;
    } catch (error) {
      logger.error('❌ Migration failed with error:', error);
      return null;
    }
  }

  async runInteractiveMigration() {
    logger.info('👤 Starting interactive migration...');
    
    try {
      const result = await initializeGoalMigration({
        silent: false,
        requireUserConsent: true,
        showProgress: true,
        autoCleanup: false
      });
      
      logger.info('✅ Interactive migration completed');
      return result;
    } catch (error) {
      logger.error('❌ Interactive migration failed:', error);
      return null;
    }
  }

  async forceMigration() {
    logger.info('🚨 Force migration starting (ignoring need check)...');
    
    try {
      const result = await forceMigration();
      
      if (result.success) {
        logger.info(`✅ Force migration completed!`);
        logger.info(`   • ${result.migratedGoalsCount} goals migrated`);
      } else {
        logger.error(`❌ Force migration failed:`, result.errors);
      }
      
      return result;
    } catch (error) {
      logger.error('❌ Force migration failed with error:', error);
      return null;
    }
  }

  async rollbackMigration() {
    logger.info('🔄 Rolling back migration...');
    
    try {
      const success = await goalMigrationRunner.rollback();
      
      if (success) {
        logger.info('✅ Migration rollback completed successfully');
        logger.info('ℹ️ Page will reload to apply changes');
      } else {
        logger.error('❌ Migration rollback failed');
      }
      
      return success;
    } catch (error) {
      logger.error('❌ Rollback failed with error:', error);
      return false;
    }
  }

  cleanupLegacyGoals() {
    logger.info('🧹 Cleaning up legacy goals...');
    
    try {
      goalMigrationRunner.cleanupLegacyGoals();
      logger.info('✅ Legacy goals cleanup completed');
      return true;
    } catch (error) {
      logger.error('❌ Cleanup failed:', error);
      return false;
    }
  }

  showHelp() {
    logger.info('🎯 Goal Migration CLI Commands');
    logger.info('==============================');
    
    this.commands.forEach((command, name) => {
      logger.info(`${name.padEnd(20)} - ${command.description}`);
    });
    
    logger.info('\nUsage Examples:');
    logger.info('migrationCLI.status()              // Show migration status');
    logger.info('migrationCLI.migrate()             // Run silent migration');
    logger.info('migrationCLI.interactive()         // Run with user prompts');
    logger.info('migrationCLI.force()               // Force migration');
    logger.info('migrationCLI.rollback()            // Undo migration');
    logger.info('migrationCLI.cleanup()             // Remove legacy data');
    
    return this.commands;
  }

  async runTests() {
    logger.info('🧪 Running migration test scenarios...');
    
    const tests = [
      {
        name: 'Status Check',
        fn: () => this.checkNeeded()
      },
      {
        name: 'Detailed Status',
        fn: () => this.getStatus()
      }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        logger.info(`\n🔬 Running test: ${test.name}`);
        const result = await test.fn();
        logger.info(`✅ Test passed: ${test.name}`);
        results.push({ test: test.name, success: true, result });
      } catch (error) {
        logger.error(`❌ Test failed: ${test.name}`, error);
        results.push({ test: test.name, success: false, error });
      }
    }
    
    logger.info('\n📊 Test Summary:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      logger.info(`${status} ${result.test}`);
    });
    
    return results;
  }

  // Utility methods

  exportMigrationData() {
    logger.info('📦 Exporting migration data...');
    
    try {
      const status = goalMigrationService.getMigrationStatus();
      const data = {
        timestamp: new Date().toISOString(),
        migrationStatus: status,
        detailedStatus: getDetailedMigrationStatus()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `migration-data-${Date.now()}.json`;
      a.click();
      
      logger.info('✅ Migration data exported');
      return data;
    } catch (error) {
      logger.error('❌ Export failed:', error);
      return null;
    }
  }

  simulate(scenarioName: string) {
    logger.info(`🎭 Simulating migration scenario: ${scenarioName}`);
    
    const scenarios = {
      'no-migration': () => {
        logger.info('Simulating: No migration needed');
        return { migrationNeeded: false };
      },
      'simple-migration': () => {
        logger.info('Simulating: Simple migration with 3 goals');
        return { migrationNeeded: true, goalCount: 3 };
      },
      'complex-migration': () => {
        logger.info('Simulating: Complex migration with 10+ goals');
        return { migrationNeeded: true, goalCount: 15 };
      },
      'error-scenario': () => {
        logger.info('Simulating: Migration with errors');
        throw new Error('Simulated migration error');
      }
    };
    
    const scenario = scenarios[scenarioName as keyof typeof scenarios];
    if (!scenario) {
      logger.error(`❌ Unknown scenario: ${scenarioName}`);
      logger.info('Available scenarios:', Object.keys(scenarios).join(', '));
      return null;
    }
    
    try {
      return scenario();
    } catch (error) {
      logger.error(`❌ Scenario simulation failed:`, error);
      return null;
    }
  }
}

// Create singleton instance
export const migrationCLI = new MigrationCLI();

// Export for module usage
export { MigrationCLI };

// Setup global access in browser
if (typeof window !== 'undefined') {
  logger.info('🎯 Goal Migration CLI loaded! Try: migrationCLI.help()');
}