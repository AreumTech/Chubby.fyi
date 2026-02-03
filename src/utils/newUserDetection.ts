/**
 * New User Detection Utilities
 * 
 * Handles detection of new users and tracking of quickstart wizard completion
 * to provide smooth onboarding experience.
 */

import { useAppStore } from '@/store/appStore';
import { dataService } from '@/services/dataService';
import { logger } from '@/utils/logger';

const QUICKSTART_COMPLETION_KEY = 'pathfinder-quickstart-completed';
const QUICKSTART_DISMISSED_KEY = 'pathfinder-quickstart-dismissed';

/**
 * Checks if a user is considered "new" and should see the quickstart wizard
 * A new user is someone who:
 * 1. Has no events in their event ledger (beyond the default empty scenario)
 * 2. Has no simulation data
 * 3. Has not completed or dismissed the quickstart wizard
 */
export const isNewUser = (): boolean => {
  const store = useAppStore.getState();
  
  // Check if user has dismissed or completed quickstart
  if (hasCompletedQuickstart() || hasDismissedQuickstart()) {
    return false;
  }
  
  // Check if user has any meaningful data
  const activeScenario = store.getActiveScenario();
  const hasEvents = activeScenario?.eventLedger && activeScenario.eventLedger.length > 0;
  const hasSimulationData = dataService.hasData();
  
  // User is new if they don't have events or simulation data
  return !hasEvents && !hasSimulationData;
};

/**
 * Checks if the user has completed the quickstart wizard
 */
export const hasCompletedQuickstart = (): boolean => {
  try {
    return localStorage.getItem(QUICKSTART_COMPLETION_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Marks the quickstart wizard as completed
 */
export const markQuickstartCompleted = (): void => {
  try {
    localStorage.setItem(QUICKSTART_COMPLETION_KEY, 'true');
    // Clear dismissed flag if it exists
    localStorage.removeItem(QUICKSTART_DISMISSED_KEY);
  } catch (error) {
    logger.warn('Failed to save quickstart completion state:', error);
  }
};

/**
 * Checks if the user has dismissed the quickstart wizard
 */
export const hasDismissedQuickstart = (): boolean => {
  try {
    return localStorage.getItem(QUICKSTART_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Marks the quickstart wizard as dismissed
 */
export const markQuickstartDismissed = (): void => {
  try {
    localStorage.setItem(QUICKSTART_DISMISSED_KEY, 'true');
  } catch (error) {
    logger.warn('Failed to save quickstart dismissal state:', error);
  }
};

/**
 * Resets quickstart tracking (useful for testing or "start over" scenarios)
 */
export const resetQuickstartTracking = (): void => {
  try {
    localStorage.removeItem(QUICKSTART_COMPLETION_KEY);
    localStorage.removeItem(QUICKSTART_DISMISSED_KEY);
  } catch (error) {
    logger.warn('Failed to reset quickstart tracking:', error);
  }
};

/**
 * Checks if user should see the "Try Quick Setup Again" option
 * This is for users who have dismissed the wizard but might want to try it again
 */
export const shouldShowQuickstartOption = (): boolean => {
  const store = useAppStore.getState();
  const activeScenario = store.getActiveScenario();
  
  // Show option if user has dismissed but hasn't completed,
  // and still doesn't have much data
  return hasDismissedQuickstart() && 
         !hasCompletedQuickstart() && 
         (!activeScenario?.eventLedger || activeScenario.eventLedger.length < 3);
};