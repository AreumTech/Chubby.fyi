// Reusable tab navigation component for strategy deep dive modals
import React from 'react';

interface Tab {
  name: string;
  content: React.ReactNode;
}

interface StrategyTabsProps {
  tabs: Tab[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

export const StrategyTabs: React.FC<StrategyTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="border-b border-gray-200 px-6">
      <div className="flex space-x-8">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === index
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>
    </div>
  );
};