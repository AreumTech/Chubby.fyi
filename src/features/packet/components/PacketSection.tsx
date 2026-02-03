/**
 * PacketSection - Generic collapsible section for packet viewer
 *
 * Provides consistent styling and collapse behavior for packet sections.
 */

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Heading, Text } from '@/components/ui/Typography';

// =============================================================================
// TYPES
// =============================================================================

interface PacketSectionProps {
  /** Section title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Section content */
  children: React.ReactNode;
  /** Whether section starts collapsed */
  defaultCollapsed?: boolean;
  /** Whether section can be collapsed */
  collapsible?: boolean;
  /** Optional header actions */
  headerActions?: React.ReactNode;
  /** Card accent color */
  accentColor?: 'success' | 'warning' | 'danger' | 'info';
  /** Optional className */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PacketSection: React.FC<PacketSectionProps> = ({
  title,
  subtitle,
  children,
  defaultCollapsed = false,
  collapsible = true,
  headerActions,
  accentColor,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleToggle = useCallback(() => {
    if (collapsible) {
      setIsCollapsed((prev) => !prev);
    }
  }, [collapsible]);

  return (
    <Card
      accent={accentColor ? 'left' : 'none'}
      accentColor={accentColor}
      className={className}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between ${
          collapsible ? 'cursor-pointer' : ''
        } ${isCollapsed ? '' : 'mb-3'}`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {collapsible && (
            <ChevronIcon isExpanded={!isCollapsed} />
          )}
          <div className="min-w-0">
            <Heading size="sm" className="text-areum-text-secondary">
              {title}
            </Heading>
            {subtitle && !isCollapsed && (
              <Text size="xs" color="tertiary" className="mt-0.5 truncate">
                {subtitle}
              </Text>
            )}
          </div>
        </div>

        {headerActions && !isCollapsed && (
          <div onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && children}
    </Card>
  );
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface ChevronIconProps {
  isExpanded: boolean;
}

const ChevronIcon: React.FC<ChevronIconProps> = ({ isExpanded }) => (
  <svg
    className={`w-4 h-4 text-areum-text-tertiary transition-transform ${
      isExpanded ? 'rotate-90' : ''
    }`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

export default PacketSection;
