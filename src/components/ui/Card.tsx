import React from 'react';

interface CardProps {
  children: React.ReactNode;
  interactive?: boolean;
  accent?: 'left' | 'top' | 'none';
  accentColor?: 'success' | 'warning' | 'danger' | 'info';
  compact?: boolean;
  dense?: boolean;  // Ultra-dense mode for maximum information density
  className?: string;
  onClick?: () => void;
}

/**
 * Card component with 6px rounding and optional left/top accent border
 *
 * Padding variants:
 * - default: p-3 (12px)
 * - compact: p-2 (8px)
 * - dense: px-2 py-1.5 (8px horizontal, 6px vertical)
 */
export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  accent = 'none',
  accentColor,
  compact = false,
  dense = false,
  className = '',
  onClick,
}) => {
  const accentColors = {
    success: 'border-areum-success',
    warning: 'border-areum-warning',
    danger: 'border-areum-danger',
    info: 'border-areum-accent',
  };

  const accentBorderClass = accentColor && accent !== 'none'
    ? accent === 'left'
      ? `border-l-2 ${accentColors[accentColor]}`
      : `border-t-2 ${accentColors[accentColor]}`
    : '';

  const interactiveClasses = interactive
    ? 'cursor-pointer hover:border-areum-border-hover hover:bg-areum-canvas/50 transition-all'
    : '';

  const paddingClass = dense ? 'px-2 py-1.5' : compact ? 'p-2' : 'p-3';

  return (
    <div
      className={`bg-areum-surface border border-areum-border rounded-md-areum ${paddingClass} ${accentBorderClass} ${interactiveClasses} ${className}`}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
};

// CardContent wrapper for consistent content spacing within cards
interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};
