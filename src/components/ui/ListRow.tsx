import React from 'react';

interface ListRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
}

/**
 * Simple list row component for sidebar items.
 * No cards, no shadows - just clean, uniform rows.
 */
export const ListRow: React.FC<ListRowProps> = ({
  children,
  onClick,
  className = '',
  interactive = false,
}) => {
  const baseClasses = 'px-3 py-2 border-b border-gray-100';
  const interactiveClasses = interactive
    ? 'cursor-pointer hover:bg-gray-50 transition-colors'
    : '';

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
};
