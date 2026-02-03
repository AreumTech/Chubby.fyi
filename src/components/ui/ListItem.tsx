import React from 'react';

interface BadgeProps {
  text: string;
  color: 'success' | 'warning' | 'danger' | 'info' | 'gray';
}

interface ListItemProps {
  icon?: React.ReactNode;
  primary: string;
  secondary?: string;
  meta?: string;
  badge?: BadgeProps;
  expandable?: boolean;
  expanded?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * ListItem component - single-line by default, 28px height
 * Format: [icon] primary • secondary [meta] [badge]
 */
export const ListItem: React.FC<ListItemProps> = ({
  icon,
  primary,
  secondary,
  meta,
  badge,
  expandable = false,
  expanded = false,
  onClick,
  className = '',
}) => {
  const badgeColors = {
    success: 'bg-areum-success-bg text-areum-success-text border-areum-success-border',
    warning: 'bg-areum-warning-bg text-areum-warning-text border-areum-warning-border',
    danger: 'bg-areum-danger-bg text-areum-danger-text border-areum-danger-border',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-areum-surface text-areum-text-secondary border-areum-border',
  };

  return (
    <div
      className={`flex items-center gap-2 px-2 cursor-pointer transition-colors hover:bg-areum-canvas border-b border-areum-border ${className}`}
      onClick={onClick}
      style={{ height: '28px' }}
    >
      {icon && <div className="shrink-0 text-sm">{icon}</div>}

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm-areum font-medium text-areum-text-primary truncate">
          {primary}
        </span>

        {secondary && (
          <>
            <span className="text-areum-text-tertiary">•</span>
            <span className="text-sm-areum text-areum-text-secondary truncate">
              {secondary}
            </span>
          </>
        )}
      </div>

      {meta && (
        <span className="shrink-0 text-xs-areum text-areum-text-tertiary font-mono">
          {meta}
        </span>
      )}

      {badge && (
        <span className={`shrink-0 text-xs-areum font-medium px-2 py-0.5 border rounded-sm-areum ${badgeColors[badge.color]}`}>
          {badge.text}
        </span>
      )}

      {expandable && (
        <span className="shrink-0 text-xs-areum text-areum-text-tertiary">
          {expanded ? '▼' : '▶'}
        </span>
      )}
    </div>
  );
};
