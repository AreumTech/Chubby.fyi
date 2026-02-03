import React from 'react';
import { useAppStore, initializeAppStore } from './appStore';

// Stable empty array reference to prevent unnecessary re-renders
const EMPTY_ARRAY: any[] = [];

// Legacy compatibility - redirect to new store
export const useStoreInitialization = () => {
  React.useEffect(() => {
    initializeAppStore();
  }, []);
};

// Convenience hooks that combine multiple stores for common use cases
export const useModalState = () => {
  const {
    isEditModalOpen,
    editingEvent,
    isEventCreationModalOpen,
    isGoalCreationModalOpen,
    isGoalEditModalOpen,
    editingGoal,
    confirmationModal,
    showSettings,
    showAdvancedSettings,
    showStrategyModal,
    setIsEditModalOpen,
    setEditingEvent,
    setIsEventCreationModalOpen,
    setIsGoalCreationModalOpen,
    setIsGoalEditModalOpen,
    setEditingGoal,
    setConfirmationModal,
    setShowSettings,
    setShowAdvancedSettings,
    setShowStrategyModal,
  } = useAppStore();
  
  return {
    isEditModalOpen,
    editingEvent,
    isEventCreationModalOpen,
    isGoalCreationModalOpen,
    isGoalEditModalOpen,
    editingGoal,
    confirmationModal,
    showSettings,
    showAdvancedSettings,
    showStrategyModal,
    setIsEditModalOpen,
    setEditingEvent,
    setIsEventCreationModalOpen,
    setIsGoalCreationModalOpen,
    setIsGoalEditModalOpen,
    setEditingGoal,
    setConfirmationModal,
    setShowSettings,
    setShowAdvancedSettings,
    setShowStrategyModal,
  };
};

export const usePlanData = () => {
  // Use individual selectors for stable references - each returns a stable value
  const config = useAppStore(state => state.config);
  const scenarios = useAppStore(state => state.scenarios);
  const activeScenarioId = useAppStore(state => state.activeScenarioId);

  // Select eventLedger directly from the active scenario to get stable reference
  const eventLedger = useAppStore(state => {
    const activeScenario = state.scenarios[state.activeScenarioId];
    return activeScenario?.eventLedger || EMPTY_ARRAY;
  });

  // Select activeScenario directly
  const activeScenario = useAppStore(state => state.scenarios[state.activeScenarioId]);

  // Get action functions individually - these are stable references
  const setConfig = useAppStore(state => state.setConfig);
  const setEventLedger = useAppStore(state => state.setEventLedger);
  const setScenarios = useAppStore(state => state.setScenarios);
  const setActiveScenarioId = useAppStore(state => state.setActiveScenarioId);
  const updateActiveScenario = useAppStore(state => state.updateActiveScenario);
  const duplicateScenario = useAppStore(state => state.duplicateScenario);
  const deleteScenario = useAppStore(state => state.deleteScenario);
  const renameScenario = useAppStore(state => state.renameScenario);

  // Note: This return object is created fresh each render, but that's okay since
  // the individual values are stable. Components should destructure what they need.
  return {
    config,
    scenarios,
    activeScenarioId,
    eventLedger,
    activeScenario,
    setConfig,
    setEventLedger,
    setScenarios,
    setActiveScenarioId,
    updateActiveScenario,
    duplicateScenario,
    deleteScenario,
    renameScenario,
    // Legacy compatibility
    currentScenarioName: activeScenario?.name || '',
    setCurrentScenarioName: (name: string) => {
      if (activeScenario) {
        renameScenario(activeScenario.id, name);
      }
    },
  };
};

export const useSimulationData = () => {
  const { simulationPayload, setSimulationPayload, isOrchestrating, selectedDeepDiveCalendarYear, setIsOrchestrating, setSelectedDeepDiveCalendarYear } = useAppStore();
  
  return {
    simulationPayload,
    isOrchestrating,
    selectedDeepDiveCalendarYear,
    setSimulationPayload,
    setIsOrchestrating,
    setSelectedDeepDiveCalendarYear,
  };
};