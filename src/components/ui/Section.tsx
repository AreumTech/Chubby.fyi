import React from 'react';

interface SectionProps {
  number?: number;
  title?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;  // Reduced padding for sections with nested cards
  dense?: boolean;    // Ultra-dense mode for maximum information density
}

/**
 * Section component - replaces SectionContainer + SectionHeader
 * Notion-inspired section with optional numbered header
 *
 * Variants:
 * - default: p-6 padding, mb-4 header spacing
 * - compact: p-4 padding, mb-3 header spacing
 * - dense: p-3 padding, mb-2 header spacing (maximum density)
 */
export const Section: React.FC<SectionProps> = ({
  number,
  title,
  children,
  className = '',
  compact = false,
  dense = false,
}) => {
  const paddingClass = dense ? 'p-3' : compact ? 'p-4' : 'p-6';
  const headerMargin = dense ? 'mb-2' : compact ? 'mb-3' : 'mb-4';
  const headerSize = dense ? 'text-sm-areum' : 'text-md-areum';

  return (
    <section
      className={`bg-areum-surface border border-areum-border rounded-md-areum ${paddingClass} ${className}`}
      style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
    >
      {(number !== undefined || title) && (
        <h2 className={`${headerSize} uppercase tracking-wide font-semibold text-areum-text-secondary ${headerMargin}`}>
          {number !== undefined && <span className="font-mono text-areum-text-tertiary">({number})</span>}
          {number !== undefined && title && ' '}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
};
