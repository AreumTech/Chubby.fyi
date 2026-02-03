/**
 * Haptic Feedback Utilities for Mobile Experience
 * 
 * Provides standardized haptic feedback patterns for different interaction types
 * to enhance the mobile user experience.
 */

import { logger } from '@/utils/logger';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Trigger haptic feedback based on interaction type
 */
export const triggerHaptic = (pattern: HapticPattern = 'light'): void => {
  // Check if the Vibration API is supported
  if (!('vibrate' in navigator)) {
    return;
  }

  const patterns: Record<HapticPattern, number | number[]> = {
    light: 5,           // Very light tap (button press, selection)
    medium: 15,         // Medium feedback (tab switch, successful action)
    heavy: 25,          // Strong feedback (important action, FAB press)
    success: [30, 10, 30], // Success pattern (refresh complete, task done)
    warning: [15, 5, 15, 5, 15], // Warning pattern (validation error)
    error: [50, 20, 50], // Error pattern (critical error, failed action)
    selection: 10       // Item selection (list item, card tap)
  };

  try {
    navigator.vibrate(patterns[pattern]);
  } catch (error) {
    // Silently fail if vibration is not supported or fails
    logger.debug('Haptic feedback not available:', error);
  }
};

/**
 * Enhanced haptic feedback for specific UI interactions
 */
export const hapticFeedback = {
  /**
   * Light tap feedback for button presses
   */
  buttonTap: () => triggerHaptic('light'),

  /**
   * Medium feedback for tab switching
   */
  tabSwitch: () => triggerHaptic('medium'),

  /**
   * Heavy feedback for important actions
   */
  primaryAction: () => triggerHaptic('heavy'),

  /**
   * Success feedback for completed actions
   */
  success: () => triggerHaptic('success'),

  /**
   * Warning feedback for validation errors
   */
  warning: () => triggerHaptic('warning'),

  /**
   * Error feedback for critical errors
   */
  error: () => triggerHaptic('error'),

  /**
   * Selection feedback for list items
   */
  itemSelect: () => triggerHaptic('selection'),

  /**
   * Swipe gesture feedback
   */
  swipe: () => triggerHaptic('medium'),

  /**
   * Pull-to-refresh feedback
   */
  pullRefresh: () => triggerHaptic('success'),

  /**
   * Chart interaction feedback
   */
  chartInteraction: () => triggerHaptic('light'),

  /**
   * Year/focus change feedback
   */
  focusChange: () => triggerHaptic('medium')
};

/**
 * Check if haptic feedback is available
 */
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};

/**
 * Custom hook for haptic feedback in React components
 */
export const useHapticFeedback = () => {
  return {
    triggerHaptic,
    hapticFeedback,
    isSupported: isHapticSupported()
  };
};