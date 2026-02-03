/**
 * UI State Command Handlers
 * 
 * These handlers manage UI state changes including modal management,
 * confirmation dialogs, and other transient UI states.
 */

import { useAppStore } from "@/store/appStore";
import { CommandHandler } from '../commandBus';
import { logger } from '@/utils/logger';
import { 
  OpenModalCommand,
  CloseModalCommand,
  ShowConfirmationCommand,
  SetDeepDiveYearCommand
} from '../types';

export const openModalHandler: CommandHandler<OpenModalCommand> = async (command) => {
  const { modalType, data } = command.payload;
  const uiState = useAppStore.getState();
  
  switch (modalType) {
    case 'event_creation':
      uiState.setIsEventCreationModalOpen(true);
      break;
    case 'event_edit':
      logger.debug('[openModalHandler] Opening event_edit modal with data:', data);
      uiState.setIsEditModalOpen(true);
      if (data) {
        uiState.setEditingEvent(data);
        logger.debug('[openModalHandler] Set editing event:', data);
      } else {
        logger.warn('[openModalHandler] No data provided for event_edit modal');
      }
      break;
    case 'goal_creation':
      uiState.setIsGoalCreationModalOpen(true);
      break;
    case 'goal_edit':
      uiState.setIsGoalEditModalOpen(true);
      if (data) {
        uiState.setEditingGoal(data);
      }
      break;
    case 'settings':
      uiState.setShowSettings(true);
      break;
    case 'advancedSettings':
      uiState.setShowAdvancedSettings(true);
      break;
    case 'strategy':
      uiState.setShowStrategyModal(true);
      if (data?.strategyId) {
        uiState.setInitialStrategyId(data.strategyId);
      }
      break;
    case 'applicationSettings':
      uiState.setShowApplicationSettings(true);
      break;
    case 'quickstart':
      uiState.setShowQuickstartWizard(true);
      break;
    case 'onboarding':
      uiState.setShowOnboardingChoice(true);
      break;
    default:
      logger.warn(`[openModalHandler] Unknown modal type: ${modalType}`);
  }
};

export const closeModalHandler: CommandHandler<CloseModalCommand> = async (command) => {
  const { modalType } = command.payload;
  const uiState = useAppStore.getState();
  
  switch (modalType) {
    case 'event_creation':
      uiState.setIsEventCreationModalOpen(false);
      break;
    case 'event_edit':
      uiState.setIsEditModalOpen(false);
      uiState.setEditingEvent(null);
      break;
    case 'goal_creation':
      uiState.setIsGoalCreationModalOpen(false);
      break;
    case 'goal_edit':
      uiState.setIsGoalEditModalOpen(false);
      uiState.setEditingGoal(null);
      break;
    case 'settings':
      uiState.setShowSettings(false);
      break;
    case 'advancedSettings':
      uiState.setShowAdvancedSettings(false);
      break;
    case 'strategy':
      uiState.setShowStrategyModal(false);
      uiState.setInitialStrategyId(null);
      break;
    case 'applicationSettings':
      uiState.setShowApplicationSettings(false);
      break;
    case 'quickstart':
      uiState.setShowQuickstartWizard(false);
      break;
    case 'onboarding':
      uiState.setShowOnboardingChoice(false);
      break;
    default:
      logger.warn(`[closeModalHandler] Unknown modal type: ${modalType}`);
  }
};

export const showConfirmationHandler: CommandHandler<ShowConfirmationCommand> = async (command) => {
  const { title, message, onConfirm } = command.payload;
  const { setConfirmationModal } = useAppStore.getState();
  
  setConfirmationModal({
    isOpen: true,
    title,
    message,
    onConfirm
  });
};

export const setDeepDiveYearHandler: CommandHandler<SetDeepDiveYearCommand> = async (command) => {
  const { year } = command.payload;
  const { setSelectedDeepDiveCalendarYear } = useAppStore.getState();
  
  setSelectedDeepDiveCalendarYear(year);
};