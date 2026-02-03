/**
 * Goal Migration Hook
 * 
 * React hook to handle goal migration during app initialization.
 * Provides state management and UI integration for the migration process.
 */

import { useState, useEffect, useCallback } from 'react';
import { goalMigrationRunner, type MigrationResult } from '../utils/goalMigrationRunner';
import { goalMigrationService } from '../services/goalMigrationService';
import { logger } from '@/utils/logger';

interface GoalMigrationState {
  // Migration status
  isNeeded: boolean;
  isRunning: boolean;
  isCompleted: boolean;
  hasError: boolean;
  
  // Progress tracking
  currentStage: string;
  currentMessage: string;
  progress: number;
  
  // Results
  result: MigrationResult | null;
  error: string | null;
  
  // User control
  hasUserConsent: boolean;
  isConsentRequired: boolean;
}

interface GoalMigrationActions {
  startMigration: () => Promise<void>;
  skipMigration: () => void;
  rollbackMigration: () => Promise<void>;
  retryMigration: () => Promise<void>;
  cleanupLegacyGoals: () => void;
  dismissError: () => void;
}

interface UseGoalMigrationOptions {
  autoStart?: boolean;
  requireUserConsent?: boolean;
  onComplete?: (result: MigrationResult) => void;
  onError?: (error: string) => void;
  onSkipped?: () => void;
}

export function useGoalMigration(options: UseGoalMigrationOptions = {}) {
  const {
    autoStart = false,
    requireUserConsent = true,
    onComplete,
    onError,
    onSkipped
  } = options;

  const [state, setState] = useState<GoalMigrationState>({
    isNeeded: false,
    isRunning: false,
    isCompleted: false,
    hasError: false,
    currentStage: '',
    currentMessage: '',
    progress: 0,
    result: null,
    error: null,
    hasUserConsent: false,
    isConsentRequired: requireUserConsent
  });

  // Check if migration is needed on mount
  useEffect(() => {
    const checkMigrationNeeded = () => {
      try {
        const isNeeded = goalMigrationService.isMigrationNeeded();
        setState(prev => ({ ...prev, isNeeded }));
        
        // Auto-start if enabled and migration is needed
        if (autoStart && isNeeded && !requireUserConsent) {
          startMigration();
        }
      } catch (error) {
        logger.error(`Failed to check migration status: ${error}`);
      }
    };

    checkMigrationNeeded();
  }, [autoStart, requireUserConsent]);

  const updateProgress = useCallback((
    stage: string, 
    message: string, 
    progress?: number
  ) => {
    setState(prev => ({
      ...prev,
      currentStage: stage,
      currentMessage: message,
      progress: progress ?? prev.progress
    }));
  }, []);

  const startMigration = useCallback(async () => {
    if (state.isRunning) {
      logger.warn('Migration already in progress', 'GENERAL');
      return;
    }

    setState(prev => ({
      ...prev,
      isRunning: true,
      hasError: false,
      error: null,
      progress: 0,
      currentStage: 'starting',
      currentMessage: 'Initializing migration...'
    }));

    try {
      const result = await goalMigrationRunner.runMigration(
        {
          requireUserConsent: false, // We handle consent in the hook
          showProgressDialog: false, // We show progress in UI
          autoCleanupLegacyGoals: false, // Let user decide
          maxRetries: 3
        },
        updateProgress
      );

      if (result) {
        setState(prev => ({
          ...prev,
          isRunning: false,
          isCompleted: true,
          result,
          currentStage: 'completed',
          currentMessage: `Successfully migrated ${result.migratedGoals.length} goals`,
          progress: 100
        }));

        onComplete?.(result);
      } else {
        // Migration not needed or cancelled
        setState(prev => ({
          ...prev,
          isRunning: false,
          isNeeded: false,
          currentStage: 'skipped',
          currentMessage: 'Migration not needed'
        }));
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Migration failed';
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        hasError: true,
        error: errorMessage,
        currentStage: 'error',
        currentMessage: errorMessage
      }));

      onError?.(errorMessage);
    }
  }, [state.isRunning, updateProgress, onComplete, onError]);

  const skipMigration = useCallback(() => {
    setState(prev => ({
      ...prev,
      isNeeded: false,
      currentStage: 'skipped',
      currentMessage: 'Migration skipped by user'
    }));
    
    onSkipped?.();
  }, [onSkipped]);

  const rollbackMigration = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isRunning: true,
        currentStage: 'rollback',
        currentMessage: 'Rolling back migration...'
      }));

      const success = await goalMigrationRunner.rollback();
      
      if (success) {
        setState(prev => ({
          ...prev,
          isRunning: false,
          isCompleted: false,
          hasError: false,
          error: null,
          result: null,
          currentStage: 'rollback_complete',
          currentMessage: 'Migration rolled back successfully'
        }));
      } else {
        throw new Error('Rollback failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        hasError: true,
        error: errorMessage,
        currentStage: 'rollback_error',
        currentMessage: errorMessage
      }));
    }
  }, []);

  const retryMigration = useCallback(async () => {
    setState(prev => ({
      ...prev,
      hasError: false,
      error: null
    }));
    
    await startMigration();
  }, [startMigration]);

  const cleanupLegacyGoals = useCallback(() => {
    try {
      goalMigrationRunner.cleanupLegacyGoals();
      
      setState(prev => ({
        ...prev,
        currentStage: 'cleanup_complete',
        currentMessage: 'Legacy goals cleaned up'
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cleanup failed';
      
      setState(prev => ({
        ...prev,
        hasError: true,
        error: errorMessage,
        currentStage: 'cleanup_error',
        currentMessage: errorMessage
      }));
    }
  }, []);

  const dismissError = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasError: false,
      error: null
    }));
  }, []);

  const grantConsent = useCallback(() => {
    setState(prev => ({ ...prev, hasUserConsent: true }));
  }, []);

  const actions: GoalMigrationActions = {
    startMigration,
    skipMigration,
    rollbackMigration,
    retryMigration,
    cleanupLegacyGoals,
    dismissError
  };

  // Additional computed properties
  const migrationStatus = goalMigrationService.getMigrationStatus();
  
  const shouldShowConsentDialog = state.isNeeded && 
    state.isConsentRequired && 
    !state.hasUserConsent && 
    !state.isRunning && 
    !state.isCompleted;

  const shouldShowProgressDialog = state.isRunning || 
    (state.isCompleted && state.result);

  const shouldShowErrorDialog = state.hasError && state.error;

  return {
    // State
    ...state,
    migrationStatus,
    
    // Computed flags
    shouldShowConsentDialog,
    shouldShowProgressDialog,
    shouldShowErrorDialog,
    
    // Actions
    ...actions,
    grantConsent,
    
    // Utilities
    getDetailedStatus: goalMigrationRunner.getDetailedStatus
  };
}

// Additional utility hooks for specific use cases

/**
 * Hook for silent migration during app startup
 */
export function useAutoMigration(onComplete?: (result: MigrationResult | null) => void) {
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    const runSilentMigration = async () => {
      try {
        const result = await goalMigrationRunner.runSilentMigration();
        onComplete?.(result);
      } catch (error) {
        logger.error(`Silent migration failed: ${error}`);
        onComplete?.(null);
      } finally {
        setIsComplete(true);
      }
    };

    runSilentMigration();
  }, [onComplete]);

  return { isComplete };
}

/**
 * Hook to check migration status without running migration
 */
export function useMigrationStatus() {
  const [status, setStatus] = useState(() => 
    goalMigrationService.getMigrationStatus()
  );

  const refresh = useCallback(() => {
    setStatus(goalMigrationService.getMigrationStatus());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...status,
    refresh,
    isNeeded: goalMigrationService.isMigrationNeeded()
  };
}