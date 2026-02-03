import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabGroupProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * TabGroup component - Notion-inspired tab navigation
 *
 * Visual Design:
 * - Contained tabs with pill-style active state
 * - Light gray background container with 1px border
 * - Active tab: white background with subtle shadow
 * - Inactive tabs: transparent with hover state
 * - 3px border radius on container and tabs
 *
 * Sizes:
 * - sm: 11px text, minimal padding (for inline/compact usage)
 * - md: 13px text, comfortable padding (default)
 */
export const TabGroup: React.FC<TabGroupProps> = ({
  tabs,
  activeTab,
  onChange,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      container: 'gap-0.5 p-0.5',
      button: 'px-2 py-1 text-xs-areum',
    },
    md: {
      container: 'gap-1 p-1',
      button: 'px-3 py-1.5 text-sm-areum',
    },
  };

  return (
    <div className={`flex border border-areum-border bg-areum-canvas rounded-sm-areum ${sizeClasses[size].container} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`${sizeClasses[size].button} font-medium transition-colors rounded-sm-areum ${
            activeTab === tab.id
              ? 'bg-areum-surface text-areum-text-primary shadow-sm'
              : 'text-areum-text-secondary hover:text-areum-text-primary'
          }`}
        >
          {tab.icon && <span className="mr-1">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
