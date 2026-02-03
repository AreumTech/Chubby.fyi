import React from 'react';
import { Text, Meta } from './Typography';

interface MetricProps {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    direction: 'positive' | 'negative' | 'neutral';
  };
  icon?: string;
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

/**
 * Metric component - display key numbers with labels and optional deltas
 *
 * Visual Hierarchy:
 * - Label: 11px gray (Meta component)
 * - Value: varies by variant
 * - Delta: 11px with semantic colors
 *
 * Variants:
 * - default: Vertical stack (label above value, value 16px)
 * - compact: Horizontal inline (label • value, value 14px)
 * - inline: Ultra-compact (label:value, value 13px, no separator)
 *
 * Delta Direction Colors:
 * - positive: Green (success)
 * - negative: Red (danger)
 * - neutral: Gray (tertiary)
 */
export const Metric: React.FC<MetricProps> = ({
  label,
  value,
  delta,
  icon,
  variant = 'default',
  className = '',
}) => {
  const deltaColorClasses = {
    positive: 'text-areum-success-text',
    negative: 'text-areum-danger-text',
    neutral: 'text-areum-text-tertiary',
  };

  // Ultra-compact inline variant
  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs-areum ${className}`}>
        {icon && <span className="text-xs">{icon}</span>}
        <span className="text-areum-text-tertiary">{label}:</span>
        <span className="font-semibold text-areum-text-primary">{value}</span>
        {delta && (
          <span className={`font-medium ${deltaColorClasses[delta.direction]}`}>
            {delta.value}
          </span>
        )}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {icon && <span className="text-xs">{icon}</span>}
        <Meta>{label}</Meta>
        <Text size="sm" weight="semibold">{value}</Text>
        {delta && (
          <span className={`text-xs-areum font-medium ${deltaColorClasses[delta.direction]}`}>
            {delta.value}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-1 mb-0.5">
        {icon && <span className="text-sm">{icon}</span>}
        <Meta>{label}</Meta>
      </div>
      <div className="flex items-baseline gap-2">
        <Text size="md" weight="semibold">{value}</Text>
        {delta && (
          <span className={`text-xs-areum font-medium ${deltaColorClasses[delta.direction]}`}>
            {delta.value}
          </span>
        )}
      </div>
    </div>
  );
};
