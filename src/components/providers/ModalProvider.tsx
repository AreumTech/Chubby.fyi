import React, { useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { useModalManagerCommands } from '@/hooks/useModalManagerCommands';
import { useEventLedgerCommands } from '@/hooks/useEventLedgerCommands';
import { useSimulationOrchestratorCommands } from '@/hooks/useSimulationOrchestratorCommands';
import { useCommandBus } from '@/hooks/useCommandBus';
import { createCommand } from '@/commands/types';
import { getMonthOffsetFromCalendarYear } from '@/utils/financialCalculations';
import { handleError, showSuccess } from '@/utils/notifications';
import { FinancialEvent } from '@/types';

// Modal Components
import { ModernEditEventModal } from '@/features/event-timeline/components/ModernEditEventModal';
import { SmartEventCreationModal } from '@/components/modals/SmartEventCreationModal';
import { GoalEditModal } from '@/components/modals/GoalEditModal';
import { EnhancedGoalCreationModal } from '@/components/modals/EnhancedGoalCreationModal';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { PolicyCenter } from '@/components/PolicyCenter';
import { UnifiedSettingsModal } from '@/components/modals/UnifiedSettingsModal';
import { QuickstartWizard, QuickstartResults } from '@/components/quickstart/QuickstartWizard';
import { OnboardingChoice } from '@/components/onboarding/OnboardingChoice';
import { useEnhancedGoalCommands } from '@/hooks/useEnhancedGoalCommands';
import { dataService } from '@/services/dataService';
import { StandardAccountType, EnhancedGoal } from '@/types/enhanced-goal';
import { logger } from '@/utils/logger';

interface ModalProviderProps {
  children: React.ReactNode;
}

// Stable empty array to prevent re-renders when no events exist
const EMPTY_EVENT_LEDGER: any[] = [];

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  // Get state from store using selectors - select directly to avoid getter creating new arrays
  const config = useAppStore(state => state.config);
  const eventLedger = useAppStore(state => {
    const activeScenario = state.scenarios[state.activeScenarioId];
    return activeScenario?.eventLedger || EMPTY_EVENT_LEDGER;
  });
  
  // Get command hooks
  const { modals, openEditModal } = useModalManagerCommands();
  const { saveEvent, deleteEvent } = useEventLedgerCommands();
  const { runNewSimulation } = useSimulationOrchestratorCommands();
  const { dispatch } = useCommandBus();
  
  // Enhanced Goal commands
  const {
    isEnhancedGoalEditModalOpen,
    editingEnhancedGoal,
    closeEnhancedGoalEditModal
  } = useEnhancedGoalCommands();

  // Memoize current account data for enhanced goal modal
  const currentAccountData = useMemo(() => {
    try {
      if (!dataService.hasData()) return [];

      const accountBalances = dataService.getAccountBalances();
      return Object.entries(accountBalances).map(([type, balance]) => ({
        type: type as StandardAccountType,
        balance: balance || 0,
        name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      }));
    } catch (error) {
      logger.warn('Could not get account data', 'DATA', error);
      return [];
    }
  }, []);

  // Memoize estimated annual expenses for smart defaults
  const estimatedAnnualExpenses = useMemo(() => {
    try {
      if (!dataService.hasData()) return 60000; // Default fallback

      const cashFlowData = dataService.getCashFlowChartData();
      if (cashFlowData && cashFlowData.timeSeries && cashFlowData.timeSeries.length > 0) {
        const currentYearData = cashFlowData.timeSeries.find(d => d.year === new Date().getFullYear());
        return Math.abs(currentYearData?.expenses || 60000);
      }
      return 60000;
    } catch (error) {
      logger.warn('Could not get expense data', 'DATA', error);
      return 60000; // Default fallback
    }
  }, []);

  // Handler for creating enhanced goals - memoized to prevent re-renders
  const handleCreateEnhancedGoal = useCallback(async (goalData: Omit<EnhancedGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const enhancedGoal: EnhancedGoal = {
        ...goalData,
        id: `enhanced-goal-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await dispatch(createCommand.createEnhancedGoal(enhancedGoal, true));
      modals.goalCreation.close();

      // Show success message
      showSuccess(
        '🎯 Goal Created!',
        `Successfully created "${enhancedGoal.name}" goal. Track your progress in the dashboard.`
      );
    } catch (error) {
      logger.error('Failed to create enhanced goal', 'ERROR', error);
      handleError(error, 'Goal Creation', 'Failed to create goal. Please try again.');
    }
  }, [dispatch, modals.goalCreation]);

  // Event management callbacks - memoized to prevent re-renders
  const saveEventFromModal = useCallback((eventData: FinancialEvent) => {
    saveEvent(eventData, runNewSimulation);
    modals.editEvent.close();
  }, [saveEvent, runNewSimulation, modals.editEvent]);

  const deleteEventFromModal = useCallback((eventId: string) => {
    deleteEvent(eventId, runNewSimulation);
    modals.editEvent.close();
  }, [deleteEvent, runNewSimulation, modals.editEvent]);

  // Legacy goal management callbacks removed - now using enhanced goals

  // Quickstart completion handler - memoized to prevent re-renders
  const handleQuickstartComplete = useCallback(async (results: QuickstartResults) => {
    try {
      logger.info('Quickstart completed with results', 'UI', results);

      // Show success notification with helpful tips
      showSuccess(
        '🎉 Your FIRE plan is ready!',
        `Created ${results.events?.length || 0} events. Now you can customize your plan, add more events, or explore different scenarios. Welcome to AreumFire!`
      );

      // The QuickstartWizard component handles event creation and simulation
      // This is just for any additional handling needed
    } catch (error) {
      logger.error('Failed to handle quickstart completion', 'ERROR', error);
    }
  }, []);

  // Memoized callback for SmartEventCreationModal onSave
  const handleEventCreationSave = useCallback((event: FinancialEvent) => {
    saveEvent(event, runNewSimulation);
    modals.eventCreation.close();
  }, [saveEvent, runNewSimulation, modals.eventCreation]);

  // Memoized callback for ConfirmationModal onConfirm
  const handleConfirmationConfirm = useCallback(() => {
    modals.confirmation.onConfirm();
    modals.confirmation.close();
  }, [modals.confirmation]);

  // Memoized callback for UnifiedSettingsModal onClose
  const handleSettingsClose = useCallback(() => {
    modals.advancedSettings.close();
    modals.applicationSettings.close();
  }, [modals.advancedSettings, modals.applicationSettings]);

  // Memoized callbacks for OnboardingChoice
  const handleOnboardingClose = useCallback(() => {
    modals.onboarding?.close();
    localStorage.setItem('onboardingSeen', 'true');
  }, [modals.onboarding]);

  const handleOnboardingGuided = useCallback(() => {
    modals.onboarding?.close();
    modals.quickstart.open();
  }, [modals.onboarding, modals.quickstart]);

  const handleOnboardingAdvanced = useCallback(() => {
    modals.onboarding?.close();
    localStorage.setItem('onboardingSeen', 'true');
  }, [modals.onboarding]);

  const handleOnboardingExample = useCallback((persona: any) => {
    modals.onboarding?.close();
    if (persona) {
      dispatch(createCommand.loadPersonaEventManifest(persona));
      logger.info(`Loading persona "${persona.title}" with full event manifest`, 'UI');
    } else {
      dispatch(createCommand.loadExampleScenario());
    }
    localStorage.setItem('onboardingSeen', 'true');
  }, [modals.onboarding, dispatch]);

  return (
    <>
      {children}
      
      {/* Event Edit Modal */}
      <ModernEditEventModal
        isOpen={modals.editEvent.isOpen && !!modals.editEvent.editingEvent}
        onClose={modals.editEvent.close}
        eventToEdit={modals.editEvent.editingEvent}
        appConfig={config}
        getMonthOffsetFromCalendarYear={getMonthOffsetFromCalendarYear}
      />
      
      {/* Event Creation Modal */}
      <SmartEventCreationModal
        isOpen={modals.eventCreation.isOpen}
        onClose={modals.eventCreation.close}
        onSave={handleEventCreationSave}
        appConfig={config}
        eventLedger={eventLedger}
        getMonthOffsetFromCalendarYear={getMonthOffsetFromCalendarYear}
      />
      
      {/* Enhanced Goal Creation Modal */}
      <EnhancedGoalCreationModal
        isOpen={modals.goalCreation.isOpen}
        onClose={modals.goalCreation.close}
        onCreateGoal={handleCreateEnhancedGoal}
        currentAccounts={currentAccountData}
        annualExpenses={estimatedAnnualExpenses}
      />
      
      {/* Legacy Goal Edit Modal - keeping for backward compatibility */}
      {modals.goalEdit.editingGoal && (
        <div>
          {/* Note: Legacy GoalEditModal is temporarily disabled during Enhanced Goal migration */}
          {/* TODO: Remove this once all goals are migrated to Enhanced Goals */}
        </div>
      )}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modals.confirmation.isOpen}
        title={modals.confirmation.title}
        message={modals.confirmation.message}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        confirmButtonColor="red"
        onConfirm={handleConfirmationConfirm}
        onCancel={modals.confirmation.close}
      />

      {/* Unified Settings Modal - handles both app and simulation settings */}
      <UnifiedSettingsModal
        isOpen={modals.advancedSettings.isOpen || modals.applicationSettings.isOpen}
        onClose={handleSettingsClose}
      />

      {/* Policy Center Modal - Edit always-active singleton policy settings */}
      <PolicyCenter
        isOpen={modals.strategy.isOpen}
        onClose={modals.strategy.close}
      />

      {/* Onboarding Choice */}
      <OnboardingChoice
        isOpen={modals.onboarding?.isOpen || false}
        onClose={handleOnboardingClose}
        onChooseGuided={handleOnboardingGuided}
        onChooseAdvanced={handleOnboardingAdvanced}
        onChooseExample={handleOnboardingExample}
      />

      {/* Enhanced Goal Edit Modal */}
      {editingEnhancedGoal && (
        <GoalEditModal
          isOpen={isEnhancedGoalEditModalOpen}
          onClose={closeEnhancedGoalEditModal}
          goalToEdit={editingEnhancedGoal}
        />
      )}
      
      {/* Quickstart Wizard */}
      <QuickstartWizard
        isOpen={modals.quickstart.isOpen}
        onClose={modals.quickstart.close}
        onComplete={handleQuickstartComplete}
        baseYear={config.simulationStartYear}
        baseMonth={config.currentMonth}
        currentAge={config.currentAge}
      />
    </>
  );
};