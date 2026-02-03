/**
 * Goal Status Helpers - Convert simulation data into user-friendly status and guidance
 *
 * Part of Goal UX Redesign (Phase 1)
 * Transforms technical simulation data into plain English action guidance
 */

export type GoalStatus = 'on-track' | 'at-risk' | 'critical' | 'unknown';

/**
 * Determine goal status from statusTag
 */
export function determineGoalStatus(statusTag?: string): GoalStatus {
  if (!statusTag) return 'unknown';

  const normalized = statusTag.toLowerCase();

  if (normalized === 'excellent' || normalized === 'good') {
    return 'on-track';
  }

  if (normalized === 'concerning') {
    return 'at-risk';
  }

  if (normalized === 'critical') {
    return 'critical';
  }

  return 'unknown';
}

/**
 * Get status icon (emoji) for visual identification
 */
export function getStatusIcon(status: GoalStatus): string {
  switch (status) {
    case 'on-track':
      return '✅';
    case 'at-risk':
      return '⚠️';
    case 'critical':
      return '❌';
    default:
      return '❓';
  }
}

/**
 * Get status label in plain English
 */
export function getStatusLabel(status: GoalStatus): string {
  switch (status) {
    case 'on-track':
      return 'On Track';
    case 'at-risk':
      return 'Needs Attention';
    case 'critical':
      return 'At Risk';
    default:
      return 'Unknown';
  }
}

/**
 * Calculate estimated monthly savings needed to reach goal
 *
 * This is a SIMPLIFIED calculation for UI guidance only.
 * The actual simulation uses more sophisticated calculations with investment returns.
 *
 * @param targetAmount - Goal target amount
 * @param currentProgress - Current saved amount
 * @param monthsRemaining - Months until target date
 * @returns Estimated monthly amount needed
 */
export function calculateMonthlyNeeded(
  targetAmount: number,
  currentProgress: number,
  monthsRemaining: number
): number {
  if (monthsRemaining <= 0) return 0;

  const remainingAmount = Math.max(0, targetAmount - currentProgress);

  // Simple division - doesn't account for investment returns
  // This is intentionally simplified for clarity
  return remainingAmount / monthsRemaining;
}

/**
 * Generate action guidance text based on goal status
 *
 * This converts technical simulation results into clear, actionable guidance
 * that users can understand and act on.
 */
export function generateActionGuidance(
  status: GoalStatus,
  monthlyNeeded: number,
  currentMonthly?: number
): string {
  const monthlyNeededFormatted = formatCurrencyShort(monthlyNeeded);

  switch (status) {
    case 'on-track':
      if (currentMonthly && currentMonthly > 0) {
        return `Keep saving ${formatCurrencyShort(currentMonthly)}/month`;
      }
      return `On pace to reach goal`;

    case 'at-risk':
      if (currentMonthly && monthlyNeeded > currentMonthly) {
        const difference = monthlyNeeded - currentMonthly;
        return `Need ${formatCurrencyShort(difference)}/mo more (currently ${formatCurrencyShort(currentMonthly)}/mo)`;
      }
      return `Need ${monthlyNeededFormatted}/month to stay on track`;

    case 'critical':
      if (currentMonthly && monthlyNeeded > currentMonthly) {
        const difference = monthlyNeeded - currentMonthly;
        return `Need ${formatCurrencyShort(difference)}/mo more (currently ${formatCurrencyShort(currentMonthly)}/mo)`;
      }
      return `Need ${monthlyNeededFormatted}/month - consider extending timeline`;

    default:
      return 'Run simulation to see status';
  }
}

/**
 * Format currency in short form (e.g., $1.2K, $450K, $1.2M)
 *
 * Note: This duplicates utils/formatting.ts function but kept here
 * to make this module self-contained
 */
function formatCurrencyShort(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 1_000_000) {
    return `${sign}$${(absAmount / 1_000_000).toFixed(1)}M`;
  }

  if (absAmount >= 1_000) {
    return `${sign}$${(absAmount / 1_000).toFixed(1)}K`;
  }

  return `${sign}$${absAmount.toFixed(0)}`;
}

/**
 * Calculate months remaining until target date
 */
export function calculateMonthsRemaining(targetDate: string | Date | undefined): number {
  if (!targetDate) return 0;

  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();

  const diffTime = target.getTime() - now.getTime();
  const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Average days per month

  return Math.max(0, Math.round(diffMonths));
}

/**
 * Explain success probability in plain English (with percentage)
 */
export function explainSuccessProbability(probability: number): string {
  const percentage = Math.round(probability * 100);

  if (percentage >= 95) {
    return `${percentage}% - Extremely likely to succeed`;
  }

  if (percentage >= 85) {
    return `${percentage}% - Very likely to succeed`;
  }

  if (percentage >= 70) {
    return `${percentage}% - Good chance of success`;
  }

  if (percentage >= 50) {
    return `${percentage}% - Moderate chance, consider adjustments`;
  }

  return `${percentage}% - Low probability, needs significant changes`;
}

/**
 * Explain success probability in plain English (description only, no percentage)
 */
export function getProbabilityDescription(probability: number): string {
  const percentage = Math.round(probability * 100);

  if (percentage >= 95) {
    return 'Extremely likely to succeed';
  }

  if (percentage >= 85) {
    return 'Very likely to succeed';
  }

  if (percentage >= 70) {
    return 'Good chance of success';
  }

  if (percentage >= 50) {
    return 'Moderate chance, consider adjustments';
  }

  return 'Low probability, needs significant changes';
}

/**
 * Get relative time description (e.g., "2 years", "6 months")
 */
export function getRelativeTimeDescription(targetDate: string | Date | undefined): string {
  if (!targetDate) return 'No target date';

  const months = calculateMonthsRemaining(targetDate);

  if (months === 0) return 'Target date reached';
  if (months < 0) return 'Target date passed';

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }

  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }

  return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
}
