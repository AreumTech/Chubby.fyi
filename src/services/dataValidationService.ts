/**
 * Data Validation Service
 * 
 * Provides comprehensive validation and corruption detection for persisted data,
 * simulation inputs, and application state.
 */

import { logger } from '@/utils/logger';
import { showInfo, showSuccess, handleError } from '@/utils/notifications';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctionsMade: string[];
}

export interface DataHealthCheck {
  storageSize: number;
  lastModified: Date | null;
  corruptionRisk: 'low' | 'medium' | 'high';
  issues: string[];
  recommendations: string[];
}

class DataValidationService {
  private readonly MAX_REASONABLE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_ARRAY_LENGTH = 100000;
  private readonly MAX_STRING_LENGTH = 10000;
  private readonly MAX_NUMBER_VALUE = Number.MAX_SAFE_INTEGER / 1000; // Reasonable financial limit

  /**
   * Validate localStorage data integrity
   */
  validateLocalStorageData(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      correctionsMade: []
    };

    try {
      // Check if localStorage is available
      if (typeof Storage === 'undefined' || !window.localStorage) {
        result.errors.push('localStorage is not available');
        result.isValid = false;
        return result;
      }

      // Check localStorage size
      const storageSize = this.calculateLocalStorageSize();
      if (storageSize > this.MAX_REASONABLE_SIZE) {
        result.warnings.push(`localStorage size (${this.formatBytes(storageSize)}) is unusually large`);
      }

      // Validate each stored item
      const appStorageKey = 'pathfinder-app-storage';
      const appData = localStorage.getItem(appStorageKey);
      
      if (appData) {
        this.validateAppData(appData, result);
      }

      // Check for orphaned keys
      this.checkForOrphanedKeys(result);

      // Validate data consistency
      this.validateDataConsistency(result);

    } catch (error) {
      result.errors.push(`Storage validation failed: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate application data structure
   */
  private validateAppData(appDataString: string, result: ValidationResult): void {
    try {
      const appData = JSON.parse(appDataString);
      
      // Validate state structure
      if (appData.state) {
        this.validateStateStructure(appData.state, result);
      }

      // Validate scenarios
      if (appData.state?.scenarios) {
        this.validateScenarios(appData.state.scenarios, result);
      }

      // Validate configuration
      if (appData.state?.config) {
        this.validateConfiguration(appData.state.config, result);
      }

    } catch (parseError) {
      result.errors.push('Failed to parse application data: corrupted JSON');
      result.isValid = false;
    }
  }

  /**
   * Validate state structure
   */
  private validateStateStructure(state: any, result: ValidationResult): void {
    const requiredFields = ['scenarios', 'activeScenarioId', 'config'];
    
    for (const field of requiredFields) {
      if (!(field in state)) {
        result.warnings.push(`Missing required field: ${field}`);
      }
    }

    // Check for unexpected fields that might indicate corruption
    const knownFields = [
      'scenarios', 'activeScenarioId', 'config', 'showSettings', 
      'showAdvancedSettings', 'showApplicationSettings', 'selectedDeepDiveCalendarYear'
    ];
    
    const unexpectedFields = Object.keys(state).filter(key => !knownFields.includes(key));
    if (unexpectedFields.length > 0) {
      result.warnings.push(`Unexpected fields found: ${unexpectedFields.join(', ')}`);
    }
  }

  /**
   * Validate scenarios data
   */
  private validateScenarios(scenarios: any, result: ValidationResult): void {
    if (!scenarios || typeof scenarios !== 'object') {
      result.errors.push('Scenarios data is not a valid object');
      result.isValid = false;
      return;
    }

    const scenarioIds = Object.keys(scenarios);
    
    if (scenarioIds.length === 0) {
      result.warnings.push('No scenarios found');
    }

    for (const scenarioId of scenarioIds) {
      const scenario = scenarios[scenarioId];
      this.validateScenario(scenarioId, scenario, result);
    }
  }

  /**
   * Validate individual scenario
   */
  private validateScenario(scenarioId: string, scenario: any, result: ValidationResult): void {
    if (!scenario || typeof scenario !== 'object') {
      result.errors.push(`Scenario ${scenarioId} is not a valid object`);
      result.isValid = false;
      return;
    }

    // Check required scenario fields
    const requiredFields = ['id', 'name', 'eventLedger'];
    for (const field of requiredFields) {
      if (!(field in scenario)) {
        result.errors.push(`Scenario ${scenarioId} missing required field: ${field}`);
        result.isValid = false;
      }
    }

    // Validate event ledger
    if (scenario.eventLedger && Array.isArray(scenario.eventLedger)) {
      this.validateEventLedger(scenarioId, scenario.eventLedger, result);
    } else {
      result.errors.push(`Scenario ${scenarioId} has invalid event ledger`);
      result.isValid = false;
    }

    // Check for reasonable data sizes
    if (scenario.eventLedger && scenario.eventLedger.length > this.MAX_ARRAY_LENGTH) {
      result.warnings.push(`Scenario ${scenarioId} has unusually large event ledger (${scenario.eventLedger.length} events)`);
    }
  }

  /**
   * Validate event ledger
   */
  private validateEventLedger(scenarioId: string, eventLedger: any[], result: ValidationResult): void {
    for (let i = 0; i < eventLedger.length; i++) {
      const event = eventLedger[i];
      this.validateEvent(scenarioId, i, event, result);
    }
  }

  /**
   * Validate individual event
   */
  private validateEvent(scenarioId: string, eventIndex: number, event: any, result: ValidationResult): void {
    if (!event || typeof event !== 'object') {
      result.errors.push(`Scenario ${scenarioId}, event ${eventIndex} is not a valid object`);
      result.isValid = false;
      return;
    }

    // Check required event fields
    const requiredFields = ['id', 'type', 'name'];
    for (const field of requiredFields) {
      if (!(field in event)) {
        result.errors.push(`Scenario ${scenarioId}, event ${eventIndex} missing field: ${field}`);
        result.isValid = false;
      }
    }

    // Validate numeric fields
    this.validateEventNumericFields(scenarioId, eventIndex, event, result);

    // Validate string fields
    this.validateEventStringFields(scenarioId, eventIndex, event, result);

    // Check for data anomalies
    this.checkEventAnomalies(scenarioId, eventIndex, event, result);
  }

  /**
   * Validate numeric fields in events
   */
  private validateEventNumericFields(scenarioId: string, eventIndex: number, event: any, result: ValidationResult): void {
    const numericFields = ['amount', 'monthOffset', 'endMonthOffset'];
    
    for (const field of numericFields) {
      if (field in event) {
        const value = event[field];
        
        if (typeof value === 'number') {
          // Check for NaN, Infinity
          if (!Number.isFinite(value)) {
            result.errors.push(`Scenario ${scenarioId}, event ${eventIndex} has invalid ${field}: ${value}`);
            result.isValid = false;
          }
          
          // Check for unreasonably large values
          if (Math.abs(value) > this.MAX_NUMBER_VALUE) {
            result.warnings.push(`Scenario ${scenarioId}, event ${eventIndex} has unusually large ${field}: ${value}`);
          }
          
          // Check for negative values where inappropriate
          if (field === 'monthOffset' && value < 0) {
            result.warnings.push(`Scenario ${scenarioId}, event ${eventIndex} has negative ${field}: ${value}`);
          }
        } else if (value !== null && value !== undefined) {
          result.errors.push(`Scenario ${scenarioId}, event ${eventIndex} has non-numeric ${field}: ${typeof value}`);
          result.isValid = false;
        }
      }
    }
  }

  /**
   * Validate string fields in events
   */
  private validateEventStringFields(scenarioId: string, eventIndex: number, event: any, result: ValidationResult): void {
    const stringFields = ['name', 'description', 'type'];
    
    for (const field of stringFields) {
      if (field in event) {
        const value = event[field];
        
        if (typeof value === 'string') {
          if (value.length > this.MAX_STRING_LENGTH) {
            result.warnings.push(`Scenario ${scenarioId}, event ${eventIndex} has unusually long ${field} (${value.length} chars)`);
          }
          
          // Check for potentially corrupted strings (lots of repeated characters)
          if (this.hasRepeatedCharacterPattern(value)) {
            result.warnings.push(`Scenario ${scenarioId}, event ${eventIndex} has suspicious ${field} pattern`);
          }
        } else if (value !== null && value !== undefined) {
          result.errors.push(`Scenario ${scenarioId}, event ${eventIndex} has non-string ${field}: ${typeof value}`);
          result.isValid = false;
        }
      }
    }
  }

  /**
   * Check for event data anomalies
   */
  private checkEventAnomalies(scenarioId: string, eventIndex: number, event: any, result: ValidationResult): void {
    // Check for circular references
    try {
      JSON.stringify(event);
    } catch (circularError) {
      result.errors.push(`Scenario ${scenarioId}, event ${eventIndex} has circular reference`);
      result.isValid = false;
    }

    // Check for unusually large object
    const eventString = JSON.stringify(event);
    if (eventString.length > 10000) {
      result.warnings.push(`Scenario ${scenarioId}, event ${eventIndex} is unusually large (${eventString.length} chars)`);
    }
  }

  /**
   * Validate configuration data
   */
  private validateConfiguration(config: any, result: ValidationResult): void {
    if (!config || typeof config !== 'object') {
      result.errors.push('Configuration is not a valid object');
      result.isValid = false;
      return;
    }

    // Validate stochastic config if present
    if (config.stochasticConfig) {
      this.validateStochasticConfig(config.stochasticConfig, result);
    }

    // Check for reasonable configuration values
    this.validateConfigurationValues(config, result);
  }

  /**
   * Validate stochastic configuration
   */
  private validateStochasticConfig(stochasticConfig: any, result: ValidationResult): void {
    const numericFields = [
      'simulationYears', 'monteCarloRuns', 'meanSpyReturn', 'meanBondReturn',
      'volatilitySpy', 'volatilityBond', 'meanInflation'
    ];

    for (const field of numericFields) {
      if (field in stochasticConfig) {
        const value = stochasticConfig[field];
        
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          result.errors.push(`Invalid stochastic config ${field}: ${value}`);
          result.isValid = false;
        }
      }
    }

    // Check correlation matrix if present
    if (stochasticConfig.correlationMatrix && Array.isArray(stochasticConfig.correlationMatrix)) {
      this.validateCorrelationMatrix(stochasticConfig.correlationMatrix, result);
    }
  }

  /**
   * Validate correlation matrix
   */
  private validateCorrelationMatrix(matrix: any[], result: ValidationResult): void {
    if (!Array.isArray(matrix)) {
      result.errors.push('Correlation matrix is not an array');
      result.isValid = false;
      return;
    }

    // Check if it's a square matrix
    const size = matrix.length;
    for (let i = 0; i < size; i++) {
      if (!Array.isArray(matrix[i]) || matrix[i].length !== size) {
        result.errors.push('Correlation matrix is not square');
        result.isValid = false;
        return;
      }
      
      // Check diagonal values should be 1
      if (Math.abs(matrix[i][i] - 1) > 0.01) {
        result.warnings.push(`Correlation matrix diagonal value ${i} is not 1: ${matrix[i][i]}`);
      }
      
      // Check for valid correlation values
      for (let j = 0; j < size; j++) {
        const value = matrix[i][j];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < -1 || value > 1) {
          result.errors.push(`Invalid correlation value at [${i}][${j}]: ${value}`);
          result.isValid = false;
        }
      }
    }
  }

  /**
   * Validate configuration values for reasonableness
   */
  private validateConfigurationValues(config: any, result: ValidationResult): void {
    // Check for unreasonable simulation parameters
    if (config.stochasticConfig?.simulationYears > 200) {
      result.warnings.push(`Unusually long simulation period: ${config.stochasticConfig.simulationYears} years`);
    }
    
    if (config.stochasticConfig?.monteCarloRuns > 10000) {
      result.warnings.push(`Very high Monte Carlo runs: ${config.stochasticConfig.monteCarloRuns}`);
    }
  }

  /**
   * Check for orphaned localStorage keys
   */
  private checkForOrphanedKeys(result: ValidationResult): void {
    const knownKeys = ['pathfinder-app-storage'];
    const orphanedKeys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !knownKeys.includes(key) && key.startsWith('pathfinder')) {
        orphanedKeys.push(key);
      }
    }

    if (orphanedKeys.length > 0) {
      result.warnings.push(`Found ${orphanedKeys.length} orphaned storage keys: ${orphanedKeys.join(', ')}`);
    }
  }

  /**
   * Validate data consistency
   */
  private validateDataConsistency(result: ValidationResult): void {
    try {
      const appData = localStorage.getItem('pathfinder-app-storage');
      if (!appData) return;

      const parsed = JSON.parse(appData);
      const state = parsed.state;
      
      if (!state) return;

      // Check if active scenario exists
      if (state.activeScenarioId && state.scenarios && !state.scenarios[state.activeScenarioId]) {
        result.errors.push(`Active scenario ${state.activeScenarioId} does not exist`);
        result.isValid = false;
      }

      // Check for duplicate scenario IDs
      if (state.scenarios) {
        const scenarioIds = Object.keys(state.scenarios);
        const scenarioNames = scenarioIds.map(id => state.scenarios[id]?.name).filter(Boolean);
        const duplicateNames = scenarioNames.filter((name, index) => scenarioNames.indexOf(name) !== index);
        
        if (duplicateNames.length > 0) {
          result.warnings.push(`Duplicate scenario names found: ${duplicateNames.join(', ')}`);
        }
      }

    } catch (error) {
      result.warnings.push(`Data consistency check failed: ${error}`);
    }
  }

  /**
   * Perform data health check
   */
  performDataHealthCheck(): DataHealthCheck {
    const storageSize = this.calculateLocalStorageSize();
    const lastModified = this.getLastModifiedDate();
    const validationResult = this.validateLocalStorageData();
    
    const corruptionRisk = this.assessCorruptionRisk(validationResult, storageSize);
    const issues = [...validationResult.errors, ...validationResult.warnings];
    const recommendations = this.generateRecommendations(validationResult, corruptionRisk, storageSize);

    return {
      storageSize,
      lastModified,
      corruptionRisk,
      issues,
      recommendations
    };
  }

  /**
   * Clean corrupted data with user confirmation
   */
  async cleanCorruptedData(): Promise<{ success: boolean; cleaned: string[] }> {
    const result = { success: false, cleaned: [] as string[] };

    try {
      const validationResult = this.validateLocalStorageData();
      
      if (validationResult.isValid) {
        showInfo('Data Validation', 'No corruption detected, cleaning not needed', 3000);
        result.success = true;
        return result;
      }

      const shouldClean = confirm(
        `Data corruption detected:\n${validationResult.errors.join('\n')}\n\nThis will reset your application data. Continue?`
      );

      if (!shouldClean) {
        return result;
      }

      // Backup current data before cleaning
      this.createDataBackup();

      // Clean localStorage
      localStorage.clear();
      result.cleaned.push('localStorage');

      // Show success message
      showSuccess(
        'Data Cleaned',
        'Corrupted data has been removed. Application will restart with clean state.',
        5000
      );

      result.success = true;
      
      // Reload page after delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      handleError(error, 'Data Cleaning', 'Failed to clean corrupted data');
    }

    return result;
  }

  /**
   * Create backup of current data
   */
  private createDataBackup(): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `pathfinder-backup-${timestamp}`;
      const currentData = localStorage.getItem('pathfinder-app-storage');
      
      if (currentData) {
        localStorage.setItem(backupKey, currentData);
        logger.info(`Data backed up to ${backupKey}`);
      }
    } catch (error) {
      logger.warn('Failed to create data backup:', error);
    }
  }

  /**
   * Calculate localStorage size in bytes
   */
  private calculateLocalStorageSize(): number {
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        totalSize += (key.length + (value?.length || 0)) * 2; // UTF-16 = 2 bytes per char
      }
    }
    
    return totalSize;
  }

  /**
   * Get last modified date of storage data
   */
  private getLastModifiedDate(): Date | null {
    try {
      const appData = localStorage.getItem('pathfinder-app-storage');
      if (!appData) return null;

      const parsed = JSON.parse(appData);
      return parsed.version ? new Date(parsed.version) : null;
    } catch {
      return null;
    }
  }

  /**
   * Assess corruption risk level
   */
  private assessCorruptionRisk(validation: ValidationResult, storageSize: number): 'low' | 'medium' | 'high' {
    if (validation.errors.length > 0) {
      return 'high';
    }
    
    if (validation.warnings.length > 5 || storageSize > this.MAX_REASONABLE_SIZE) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate data health recommendations
   */
  private generateRecommendations(validation: ValidationResult, corruptionRisk: 'low' | 'medium' | 'high', storageSize: number): string[] {
    const recommendations: string[] = [];

    if (corruptionRisk === 'high') {
      recommendations.push('Consider clearing application data and starting fresh');
      recommendations.push('Export important scenarios before clearing data');
    } else if (corruptionRisk === 'medium') {
      recommendations.push('Monitor data integrity closely');
      recommendations.push('Consider exporting scenarios as backup');
    }

    if (storageSize > this.MAX_REASONABLE_SIZE / 2) {
      recommendations.push('Consider removing unused scenarios to reduce storage size');
    }

    if (validation.warnings.length > 3) {
      recommendations.push('Review and clean up scenario data');
    }

    if (recommendations.length === 0) {
      recommendations.push('Data appears healthy, no action needed');
    }

    return recommendations;
  }

  /**
   * Check if string has suspicious repeated character patterns
   */
  private hasRepeatedCharacterPattern(str: string): boolean {
    if (str.length < 10) return false;
    
    // Check for runs of the same character
    for (let i = 0; i < str.length - 5; i++) {
      let runLength = 1;
      for (let j = i + 1; j < str.length && str[j] === str[i]; j++) {
        runLength++;
      }
      if (runLength > 5) return true;
    }
    
    return false;
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const dataValidationService = new DataValidationService();