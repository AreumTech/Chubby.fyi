// Strategy Center V2 - Flat List View

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui';
import { StrategyConfigurationModal } from './modals/StrategyConfigurationModal';
import { StrategyDeepDiveModal } from './modals/StrategyDeepDiveModal';
import { Modal } from './ui';
import { useAppStore } from '../store/appStore';
import { useCommandBus } from '../hooks/useCommandBus';
import { strategyEngineService } from '../services/strategies';
import type {
  StrategyEngine,
  StrategyExecutionContext,
  StrategyResult
} from '../types/strategy';
import { logger } from '@/utils/logger';
import { H2, H5, BodyBase, Caption } from '@/components/ui/Typography';

interface StrategyCenterV2Props {
  isOpen: boolean;
  onClose: () => void;
}

// Strategy status categories
type StrategyStatus = 'functional' | 'info-only' | 'coming-soon';

interface StrategyWithStatus {
  strategy: StrategyEngine;
  status: StrategyStatus;
  isSimpleConfig: boolean;
}

export const StrategyCenterV2: React.FC<StrategyCenterV2Props> = ({ isOpen, onClose }) => {
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [configureStrategy, setConfigureStrategy] = useState<StrategyEngine | null>(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [deepDiveStrategy, setDeepDiveStrategy] = useState<StrategyEngine | null>(null);

  const { dispatch: _dispatch } = useCommandBus();
  const store = useAppStore();
  const activeScenario = store.getActiveScenario();
  const initialStrategyId = store.initialStrategyId;

  // Handle direct strategy opening from active strategies
  useEffect(() => {
    if (isOpen && initialStrategyId) {
      const strategy = strategyEngineService.getStrategy(initialStrategyId);
      if (strategy) {
        setConfigureStrategy(strategy);
        setShowConfiguration(true);
        // Clear the initialStrategyId after opening
        store.setInitialStrategyId(null);
      }
    }
  }, [isOpen, initialStrategyId, store]);

  // Categorize all strategies by status
  const categorizedStrategies = useMemo(() => {
    const allStrategies = strategyEngineService.getAllStrategies();

    // Define functional strategies (can be configured and applied)
    const functionalIds = ['investment-optimization', 'asset-allocation', 'retirement-withdrawal', 'tax-withholding'];

    // Define info-only strategies (educational content only)
    const infoOnlyIds = ['social-security-optimization', 'roth-conversion', 'tax-loss-harvesting'];

    // Define coming soon strategies
    const comingSoonIds = ['debt-payoff-strategy', 'college-planning', 'home-purchase', 'wealth-transfer'];

    // Strategies that go straight to configuration (no deep dive)
    const simpleConfigIds = ['investment-optimization', 'asset-allocation', 'glide-path', 'retirement-withdrawal', 'tax-withholding'];

    // Hidden categories
    const hiddenCategories = ['ADVANCED_INVESTMENT'];

    const strategies: StrategyWithStatus[] = allStrategies
      .filter(strategy => !hiddenCategories.includes(strategy.category))
      .map(strategy => {
        let status: StrategyStatus = 'coming-soon';

        if (functionalIds.includes(strategy.id)) {
          status = 'functional';
        } else if (infoOnlyIds.includes(strategy.id)) {
          status = 'info-only';
        } else if (comingSoonIds.includes(strategy.id)) {
          status = 'coming-soon';
        }

        return {
          strategy,
          status,
          isSimpleConfig: simpleConfigIds.includes(strategy.id)
        };
      });

    // Group by status
    return {
      functional: strategies.filter(s => s.status === 'functional'),
      infoOnly: strategies.filter(s => s.status === 'info-only'),
      comingSoon: strategies.filter(s => s.status === 'coming-soon')
    };
  }, []);

  // Create execution context
  const executionContext = useMemo(() => {
    const events = activeScenario?.eventLedger || [];

    return {
      config: store.config,
      currentEvents: events,
      userInputs: {},
      startDate: new Date(),
      currentAge: store.config.currentAge,
      currentYear: new Date().getFullYear()
    } as StrategyExecutionContext;
  }, [activeScenario, store]);

  const handleSaveConfiguration = async (config: any) => {
    if (configureStrategy) {
      logger.info(`Executing strategy: ${configureStrategy.name}`, 'UI', config);

      try {
        // Execute strategy through command bus
        const context: StrategyExecutionContext = {
          ...executionContext,
          userInputs: config
        };

        // Import createCommand
        const { createCommand } = await import('../commands/types');

        await _dispatch(createCommand.executeStrategy(
          configureStrategy.id,
          context,
          activeScenario?.id || 'default'
        ));

        logger.info(`Strategy ${configureStrategy.name} executed successfully`);

        // Close modals
        setShowConfiguration(false);
        setConfigureStrategy(null);
        onClose();

        // Note: Simulation will run automatically via executeStrategyHandler

      } catch (error) {
        logger.error(`Failed to execute strategy: ${error}`);
        // TODO: Show error toast to user
      }
    }
  };

  const handleStrategyClick = (strategyWithStatus: StrategyWithStatus) => {
    if (strategyWithStatus.status === 'coming-soon') {
      return; // Do nothing for coming soon strategies
    }

    const { strategy, isSimpleConfig } = strategyWithStatus;

    if (isSimpleConfig) {
      setConfigureStrategy(strategy);
      setShowConfiguration(true);
    } else {
      setDeepDiveStrategy(strategy);
      setShowDeepDive(true);
    }
  };

  // Get emoji for each strategy
  const getStrategyEmoji = (strategyId: string): string => {
    const emojiMap: Record<string, string> = {
      'investment-optimization': '💰',
      'asset-allocation': '📊',
      'retirement-withdrawal': '🏖️',
      'tax-withholding': '💵',
      'social-security-optimization': '👴',
      'roth-conversion': '🔄',
      'tax-loss-harvesting': '📉',
      'debt-payoff-strategy': '💳',
      'college-planning': '🎓',
      'home-purchase': '🏠',
      'wealth-transfer': '💼'
    };
    return emojiMap[strategyId] || '📋';
  };

  // Render a compact strategy card
  const renderStrategyCard = (strategyWithStatus: StrategyWithStatus) => {
    const { strategy, status, isSimpleConfig } = strategyWithStatus;
    const isComingSoon = status === 'coming-soon';
    const isInfoOnly = status === 'info-only';
    const emoji = getStrategyEmoji(strategy.id);

    return (
      <Card
        key={strategy.id}
        className={`border border-gray-200 transition-all ${
          isComingSoon ? 'opacity-50' : 'hover:shadow-lg hover:border-blue-400 cursor-pointer'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
              isComingSoon ? 'bg-gray-100' : status === 'info-only' ? 'bg-blue-50' : 'bg-gradient-to-br from-blue-50 to-indigo-50'
            }`}>
              {emoji}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <H5 as="h3" className="truncate">
                  {strategy.name}
                </H5>
                {isInfoOnly && (
                  <Caption className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium whitespace-nowrap">
                    Learn
                  </Caption>
                )}
              </div>
              <BodyBase color="secondary" className="line-clamp-1 mb-2">
                {strategy.config.description}
              </BodyBase>
              <div className="flex items-center gap-3">
                <Caption color="tertiary" className="flex items-center gap-1">
                  <span>📊</span>
                  <span>{strategy.config.difficultyLevel}</span>
                </Caption>
                <Caption color="tertiary">•</Caption>
                <Caption color="tertiary" className="flex items-center gap-1">
                  <span>⏱️</span>
                  <span>{strategy.config.estimatedTimeframe}mo</span>
                </Caption>
              </div>
            </div>

            {/* Button */}
            <Button
              size="sm"
              variant={isComingSoon ? 'ghost' : 'primary'}
              onClick={() => handleStrategyClick(strategyWithStatus)}
              disabled={isComingSoon}
              className={`flex-shrink-0 ${
                isComingSoon
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : isInfoOnly
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isComingSoon ? 'Soon' : isSimpleConfig ? 'Configure' : 'View'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMainContent = () => {
    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="border-b border-gray-200 pb-4">
          <H2 className="mb-1">Strategy Center</H2>
          <BodyBase color="secondary">
            Apply strategies to optimize your financial plan
          </BodyBase>
        </div>

        {/* All Strategies in one list with subtle dividers */}
        <div className="space-y-2">
          {/* Functional Strategies */}
          {categorizedStrategies.functional.map(renderStrategyCard)}

          {/* Info-Only Strategies */}
          {categorizedStrategies.infoOnly.length > 0 && (
            <>
              {categorizedStrategies.functional.length > 0 && (
                <div className="py-2">
                  <div className="border-t border-gray-200"></div>
                </div>
              )}
              {categorizedStrategies.infoOnly.map(renderStrategyCard)}
            </>
          )}

          {/* Coming Soon Strategies */}
          {categorizedStrategies.comingSoon.length > 0 && (
            <>
              {(categorizedStrategies.functional.length > 0 || categorizedStrategies.infoOnly.length > 0) && (
                <div className="py-2">
                  <div className="border-t border-dashed border-gray-300"></div>
                </div>
              )}
              {categorizedStrategies.comingSoon.map(renderStrategyCard)}
            </>
          )}
        </div>
      </div>
    );
  };

  const strategyCenterModal = (
    <Modal
      isOpen={isOpen && !showConfiguration && !showDeepDive}
      onClose={onClose}
      size="xl"
      title="Strategy Center"
      bodyClassName="px-6 py-6"
    >
      <div className="max-w-full max-h-[70vh] overflow-y-auto">
        {renderMainContent()}
      </div>
    </Modal>
  );

  return (
    <>
      {strategyCenterModal}

      {/* Strategy Deep Dive Modal rendered outside to avoid nested modal stacking */}
      <StrategyDeepDiveModal
        isOpen={showDeepDive}
        onClose={() => {
          setShowDeepDive(false);
          setDeepDiveStrategy(null);
        }}
        onConfigure={() => {
          if (deepDiveStrategy) {
            setConfigureStrategy(deepDiveStrategy);
            setShowConfiguration(true);
            setShowDeepDive(false);
          }
        }}
        strategy={deepDiveStrategy}
      />

      {/* Strategy Configuration Modal rendered outside to avoid nested modal stacking */}
      <StrategyConfigurationModal
        isOpen={showConfiguration}
        onClose={() => {
          setShowConfiguration(false);
          setConfigureStrategy(null);
        }}
        onSave={handleSaveConfiguration}
        strategy={configureStrategy}
        context={executionContext}
      />
    </>
  );
};
