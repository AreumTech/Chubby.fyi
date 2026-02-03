/**
 * useModalManagerCommands Hook - Command Bus version of useModalManager
 *
 * This hook provides modal management functionality using the Command Bus pattern.
 * It replaces direct store access with command dispatching for better consistency.
 */

import { useCallback, useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { useCommandBus } from "./useCommandBus";
import { createCommand } from "@/commands/types";
import { FinancialEvent, EventType } from "@/types";
import { createEventTemplate } from "@/services/eventTemplateService";
import { logger } from '@/utils/logger';

// Stable empty array for fallback
const EMPTY_EVENT_LEDGER: FinancialEvent[] = [];

export const useModalManagerCommands = () => {
  const { dispatch } = useCommandBus();

  // Use individual selectors for stable references instead of subscribing to entire store
  const config = useAppStore(state => state.config);
  const isEditModalOpen = useAppStore(state => state.isEditModalOpen);
  const editingEvent = useAppStore(state => state.editingEvent);
  const isEventCreationModalOpen = useAppStore(state => state.isEventCreationModalOpen);
  const isGoalCreationModalOpen = useAppStore(state => state.isGoalCreationModalOpen);
  const isGoalEditModalOpen = useAppStore(state => state.isGoalEditModalOpen);
  const editingGoal = useAppStore(state => state.editingGoal);
  const confirmationModal = useAppStore(state => state.confirmationModal);
  const showSettings = useAppStore(state => state.showSettings);
  const showAdvancedSettings = useAppStore(state => state.showAdvancedSettings);
  const showApplicationSettings = useAppStore(state => state.showApplicationSettings);
  const showStrategyModal = useAppStore(state => state.showStrategyModal);
  const showQuickstartWizard = useAppStore(state => state.showQuickstartWizard);
  const showOnboardingChoice = useAppStore(state => state.showOnboardingChoice);

  // Get eventLedger directly for stable reference
  const eventLedger = useAppStore(state => {
    const activeScenario = state.scenarios[state.activeScenarioId];
    return activeScenario?.eventLedger || EMPTY_EVENT_LEDGER;
  });

  // Event modals
  const openEditModal = useCallback(
    async (eventId: string | null, newEventType?: EventType) => {
      try {
        if (eventId) {
          // Find the event by ID and open for editing
          const event = eventLedger.find((e) => e.id === eventId);

          if (event && event.type === EventType.GOAL_DEFINE) {
            await dispatch(createCommand.openModal("goal_edit", event));
            return;
          }

          await dispatch(createCommand.openModal("event_edit", event));
        } else if (newEventType) {
          // Use the centralized service to create the event template
          const newEventTemplate = createEventTemplate(
            newEventType,
            config,
            () => eventLedger // Pass a stable getter
          );
          await dispatch(
            createCommand.openModal("event_edit", newEventTemplate)
          );
        } else {
          await dispatch(createCommand.openModal("event_creation"));
        }
      } catch (error) {
        logger.error(`Failed to open edit modal: ${error}`);
      }
    },
    [dispatch, config, eventLedger]
  );

  const closeEditModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("event_edit"));
    } catch (error) {
      logger.error(`Failed to close edit modal: ${error}`);
    }
  }, [dispatch]);

  const openEventCreationModal = useCallback(async () => {
    try {
      await dispatch(createCommand.openModal("event_creation"));
    } catch (error) {
      logger.error(`Failed to open event creation modal: ${error}`);
    }
  }, [dispatch]);

  const closeEventCreationModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("event_creation"));
    } catch (error) {
      logger.error(`Failed to close event creation modal: ${error}`);
    }
  }, [dispatch]);

  // Goal modals
  const openGoalCreationModal = useCallback(async () => {
    try {
      await dispatch(createCommand.openModal("goal_creation"));
    } catch (error) {
      logger.error(`Failed to open goal creation modal: ${error}`);
    }
  }, [dispatch]);

  const closeGoalCreationModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("goal_creation"));
    } catch (error) {
      logger.error(`Failed to close goal creation modal: ${error}`);
    }
  }, [dispatch]);

  const openGoalEditModal = useCallback(
    async (goal: FinancialEvent) => {
      try {
        await dispatch(createCommand.openModal("goal_edit", goal));
      } catch (error) {
        logger.error(`Failed to open goal edit modal: ${error}`);
      }
    },
    [dispatch]
  );

  const closeGoalEditModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("goal_edit"));
    } catch (error) {
      logger.error(`Failed to close goal edit modal: ${error}`);
    }
  }, [dispatch]);

  // Settings modals
  const openSettingsModal = useCallback(async () => {
    try {
      await dispatch(createCommand.openModal("settings"));
    } catch (error) {
      logger.error(`Failed to open settings modal: ${error}`);
    }
  }, [dispatch]);

  const closeSettingsModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("settings"));
    } catch (error) {
      logger.error(`Failed to close settings modal: ${error}`);
    }
  }, [dispatch]);

  const openAdvancedSettingsModal = useCallback(async () => {
    try {
      await dispatch(createCommand.openModal("advancedSettings"));
    } catch (error) {
      logger.error(`Failed to open advanced settings modal: ${error}`);
    }
  }, [dispatch]);

  const closeAdvancedSettingsModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("advancedSettings"));
    } catch (error) {
      logger.error(`Failed to close advanced settings modal: ${error}`);
    }
  }, [dispatch]);

  // Strategy modal
  const openStrategyModal = useCallback(async () => {
    try {
      await dispatch(createCommand.openModal("strategy"));
    } catch (error) {
      logger.error(`Failed to open strategy modal: ${error}`);
    }
  }, [dispatch]);

  const closeStrategyModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("strategy"));
    } catch (error) {
      logger.error(`Failed to close strategy modal: ${error}`);
    }
  }, [dispatch]);

  // Application settings modal
  const openApplicationSettingsModal = useCallback(async () => {
    try {
      await dispatch(createCommand.openModal("applicationSettings"));
    } catch (error) {
      logger.error(`Failed to open application settings modal: ${error}`);
    }
  }, [dispatch]);

  const closeApplicationSettingsModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("applicationSettings"));
    } catch (error) {
      logger.error(`Failed to close application settings modal: ${error}`);
    }
  }, [dispatch]);

  // Quickstart modal
  const openQuickstartModal = useCallback(async () => {
    try {
      await dispatch(createCommand.openModal("quickstart"));
    } catch (error) {
      logger.error(`Failed to open quickstart modal: ${error}`);
    }
  }, [dispatch]);

  const closeQuickstartModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("quickstart"));
    } catch (error) {
      logger.error(`Failed to close quickstart modal: ${error}`);
    }
  }, [dispatch]);

  // Onboarding modal
  const openOnboardingModal = useCallback(async () => {
    try {
      await dispatch(createCommand.openModal("onboarding"));
    } catch (error) {
      logger.error(`Failed to open onboarding modal: ${error}`);
    }
  }, [dispatch]);

  const closeOnboardingModal = useCallback(async () => {
    try {
      await dispatch(createCommand.closeModal("onboarding"));
    } catch (error) {
      logger.error(`Failed to close onboarding modal: ${error}`);
    }
  }, [dispatch]);

  // Confirmation modal
  const openConfirmationModal = useCallback(
    async (title: string, message: string, onConfirm: () => void) => {
      try {
        await dispatch(
          createCommand.showConfirmation(title, message, onConfirm)
        );
      } catch (error) {
        logger.error(`Failed to open confirmation modal: ${error}`);
      }
    },
    [dispatch]
  );

  const closeConfirmationModal = useCallback(async () => {
    try {
      // Confirmation modal doesn't have a specific close command, it manages its own state
      // For now, we can trigger it with empty values to close
      await dispatch(createCommand.showConfirmation("", "", () => {}));
    } catch (error) {
      logger.error(`Failed to close confirmation modal: ${error}`);
    }
  }, [dispatch]);

  // Memoize the modals object to prevent creating new objects on every render
  const modals = useMemo(() => ({
    editEvent: {
      isOpen: isEditModalOpen,
      editingEvent,
      open: openEditModal,
      close: closeEditModal,
    },
    eventCreation: {
      isOpen: isEventCreationModalOpen,
      open: openEventCreationModal,
      close: closeEventCreationModal,
    },
    goalCreation: {
      isOpen: isGoalCreationModalOpen,
      open: openGoalCreationModal,
      close: closeGoalCreationModal,
    },
    goalEdit: {
      isOpen: isGoalEditModalOpen,
      editingGoal,
      open: openGoalEditModal,
      close: closeGoalEditModal,
    },
    confirmation: {
      isOpen: confirmationModal.isOpen,
      title: confirmationModal.title,
      message: confirmationModal.message,
      onConfirm: confirmationModal.onConfirm,
      open: openConfirmationModal,
      close: closeConfirmationModal,
    },
    settings: {
      isOpen: showSettings,
      open: openSettingsModal,
      close: closeSettingsModal,
    },
    advancedSettings: {
      isOpen: showAdvancedSettings,
      open: openAdvancedSettingsModal,
      close: closeAdvancedSettingsModal,
    },
    strategy: {
      isOpen: showStrategyModal,
      open: openStrategyModal,
      close: closeStrategyModal,
    },
    applicationSettings: {
      isOpen: showApplicationSettings,
      open: openApplicationSettingsModal,
      close: closeApplicationSettingsModal,
    },
    quickstart: {
      isOpen: showQuickstartWizard,
      open: openQuickstartModal,
      close: closeQuickstartModal,
    },
    onboarding: {
      isOpen: showOnboardingChoice,
      open: openOnboardingModal,
      close: closeOnboardingModal,
    },
  }), [
    isEditModalOpen, editingEvent, openEditModal, closeEditModal,
    isEventCreationModalOpen, openEventCreationModal, closeEventCreationModal,
    isGoalCreationModalOpen, openGoalCreationModal, closeGoalCreationModal,
    isGoalEditModalOpen, editingGoal, openGoalEditModal, closeGoalEditModal,
    confirmationModal.isOpen, confirmationModal.title, confirmationModal.message, confirmationModal.onConfirm,
    openConfirmationModal, closeConfirmationModal,
    showSettings, openSettingsModal, closeSettingsModal,
    showAdvancedSettings, openAdvancedSettingsModal, closeAdvancedSettingsModal,
    showStrategyModal, openStrategyModal, closeStrategyModal,
    showApplicationSettings, openApplicationSettingsModal, closeApplicationSettingsModal,
    showQuickstartWizard, openQuickstartModal, closeQuickstartModal,
    showOnboardingChoice, openOnboardingModal, closeOnboardingModal,
  ]);

  // Return memoized modals object
  return {
    modals,
    openEditModal,
    closeEditModal,
    closeConfirmation: closeConfirmationModal,
  };
};
