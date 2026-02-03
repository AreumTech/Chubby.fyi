/**
 * ProgressBar Component - Visual progress indicator with status-based coloring
 *
 * Part of Goal UX Redesign (Phase 1)
 * Provides clear visual feedback on goal progress with traffic light colors
 */

import React from 'react';

export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Status determines color: on-track (green), at-risk (yellow), critical (red) */
  status: 'on-track' | 'at-risk' | 'critical' | 'unknown';
  /** Height of progress bar in pixels */
  height?: number;
  /** Show percentage label inside bar */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ProgressBar - Visual indicator of goal progress
 *
 * Design principles:
 * - Color conveys status at a glance (green = good, yellow = warning, red = urgent)
 * - Smooth animation on changes
 * - Accessible with ARIA labels
 * - Large enough to be easily visible (min 8px height)
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status,
  height = 12,
  showLabel = false,
  className = ''
}) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Status-based colors (traffic light pattern)
  const getColorClasses = () => {
    switch (status) {
      case 'on-track':
        return {
          bg: 'bg-green-500',
          text: 'text-green-700'
        };
      case 'at-risk':
        return {
          bg: 'bg-amber-500',
          text: 'text-amber-700'
        };
      case 'critical':
        return {
          bg: 'bg-red-500',
          text: 'text-red-700'
        };
      default:
        return {
          bg: 'bg-gray-500',
          text: 'text-gray-700'
        };
    }
  };

  const colors = getColorClasses();

  // Accessibility label
  const ariaLabel = `Progress: ${clampedProgress.toFixed(0)}% complete, status: ${status.replace('-', ' ')}`;

  return (
    <div className={`relative ${className}`} aria-label={ariaLabel}>
      {/* Background track */}
      <div
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        {/* Progress fill */}
        <div
          className={`h-full ${colors.bg} transition-all duration-500 ease-out flex items-center justify-end px-2`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Optional label inside bar */}
          {showLabel && clampedProgress > 15 && (
            <span className="text-white text-xs font-semibold drop-shadow-sm">
              {clampedProgress.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ProgressBarWithLabels - Progress bar with descriptive labels above and below
 */
export interface ProgressBarWithLabelsProps extends ProgressBarProps {
  /** Label above progress bar (e.g., current amount) */
  topLabel?: string;
  /** Label below progress bar (e.g., target amount) */
  bottomLabel?: string;
}

export const ProgressBarWithLabels: React.FC<ProgressBarWithLabelsProps> = ({
  topLabel,
  bottomLabel,
  ...progressBarProps
}) => {
  return (
    <div className="space-y-1">
      {topLabel && (
        <div className="flex justify-between text-sm">
          <span className="font-medium">{topLabel}</span>
        </div>
      )}
      <ProgressBar {...progressBarProps} />
      {bottomLabel && (
        <div className="text-xs text-gray-600">
          {bottomLabel}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
