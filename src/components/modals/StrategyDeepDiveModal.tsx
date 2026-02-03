// Strategy modal

import React, { useState } from 'react';
import { Modal } from '../ui';
import { Button } from '../ui';
import { Badge } from '../ui/badge';
import type { StrategyEngine } from '../../types/strategy';
import { getStrategyContent } from './strategy-deep-dive/strategyContentDefinitions';
import { getStrategyButtonText } from './strategy-deep-dive/strategyFooterUtils';
import { StrategyTabs } from './strategy-deep-dive/StrategyTabs';

interface StrategyDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigure: () => void;
  strategy: StrategyEngine | null;
}

export const StrategyDeepDiveModal: React.FC<StrategyDeepDiveModalProps> = ({
  isOpen,
  onClose,
  onConfigure,
  strategy
}) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!strategy) return null;

  const strategyContent = getStrategyContent(strategy.id);
  const isInformationalOnly = strategy.id === 'social-security-optimization' ||
                              strategy.id === 'roth-conversion' ||
                              strategy.id === 'tax-loss-harvesting';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={strategyContent.title}
      bodyClassName="p-0"
      footer={
        <div className="flex items-center justify-between w-full px-6 py-4 border-t border-gray-200">
          <Badge variant="outline" className="text-blue-700 border-blue-200">
            Difficulty: {strategyContent.difficulty}
          </Badge>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Return to Dashboard
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onConfigure();
              }}
              disabled={isInformationalOnly}
              className={isInformationalOnly ? "bg-gray-300 cursor-not-allowed text-gray-500" : "bg-indigo-600 hover:bg-indigo-700"}
              title={isInformationalOnly ? "Configuration coming soon" : undefined}
            >
              {isInformationalOnly ? "View Configuration (Coming Soon)" : getStrategyButtonText(strategy.id)}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <StrategyTabs
          tabs={strategyContent.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {strategyContent.tabs[activeTab]?.content}
        </div>
      </div>
    </Modal>
  );
};