import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'xs' | 'sm' | 'md';

interface StatusBadgeProps {
  variant: BadgeVariant;
  size?: BadgeSize;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * StatusBadge component - consistent badge styling across the app
 *
 * Uses areum semantic color tokens for backgrounds, borders, and text.
 *
 * Variants:
 * - success: Green (on-track, positive states)
 * - warning: Amber (at-risk, caution states)
 * - danger: Red (critical, negative states)
 * - info: Blue (informational)
 * - neutral: Gray (default, inactive states)
 *
 * Sizes:
 * - xs: 10px text, minimal padding (for ultra-compact inline)
 * - sm: 11px text, compact padding (for inline badges)
 * - md: 13px text, comfortable padding (for prominent badges)
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  size = 'sm',
  icon,
  children,
  className = '',
}) => {
  const variantClasses = {
    success: 'bg-areum-success-bg text-areum-success border-areum-success/30',
    warning: 'bg-areum-warning-bg text-areum-warning border-areum-warning/30',
    danger: 'bg-areum-danger-bg text-areum-danger border-areum-danger/30',
    info: 'bg-areum-accent/10 text-areum-accent border-areum-accent/30',
    neutral: 'bg-areum-canvas text-areum-text-secondary border-areum-border',
  };

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs-areum px-1.5 py-0.5 gap-1',
    md: 'text-sm-areum px-2 py-1 gap-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-sm-areum whitespace-nowrap ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
