import { StateCreator } from 'zustand';
import { FinancialEvent, SimulationMode } from '../../types';
import { EnhancedGoal } from '../../types/enhanced-goal';

interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface UIStateSlice {
  // Transient UI state - changes frequently
  isEditModalOpen: boolean;
  editingEvent: FinancialEvent | null;
  isEventCreationModalOpen: boolean;
  isGoalCreationModalOpen: boolean;
  isGoalEditModalOpen: boolean;
  editingGoal: FinancialEvent | null;
  // Enhanced Goal edit modal state
  isEnhancedGoalEditModalOpen: boolean;
  editingEnhancedGoal: EnhancedGoal | null;
  confirmationModal: ConfirmationModalState;
  showSettings: boolean;
  showAdvancedSettings: boolean;
  showApplicationSettings: boolean;
  showStrategyModal: boolean;
  initialStrategyId: string | null;
  showQuickstartWizard: boolean;
  showOnboardingChoice: boolean;
  isOrchestrating: boolean;
  selectedDeepDiveCalendarYear: number | null;

  // Deterministic mode state
  simulationMode: SimulationMode;
  deterministicExpandedYears: number[];  // Years currently expanded in spreadsheet view

  // Actions
  setIsEditModalOpen: (open: boolean) => void;
  setEditingEvent: (event: FinancialEvent | null) => void;
  setIsEventCreationModalOpen: (open: boolean) => void;
  setIsGoalCreationModalOpen: (open: boolean) => void;
  setIsGoalEditModalOpen: (open: boolean) => void;
  setEditingGoal: (goal: FinancialEvent | null) => void;
  // Enhanced Goal actions
  setIsEnhancedGoalEditModalOpen: (open: boolean) => void;
  setEditingEnhancedGoal: (goal: EnhancedGoal | null) => void;
  setConfirmationModal: (modal: ConfirmationModalState | ((prev: ConfirmationModalState) => ConfirmationModalState)) => void;
  setShowSettings: (show: boolean) => void;
  setShowAdvancedSettings: (show: boolean) => void;
  setShowApplicationSettings: (show: boolean) => void;
  setShowStrategyModal: (show: boolean) => void;
  setInitialStrategyId: (strategyId: string | null) => void;
  setShowQuickstartWizard: (show: boolean) => void;
  setShowOnboardingChoice: (show: boolean) => void;
  setIsOrchestrating: (orchestrating: boolean) => void;
  setSelectedDeepDiveCalendarYear: (year: number | null) => void;

  // Deterministic mode actions
  setSimulationMode: (mode: SimulationMode) => void;
  toggleDeterministicYearExpansion: (year: number) => void;
  clearDeterministicExpandedYears: () => void;
}

export const createUIStateSlice: StateCreator<UIStateSlice, [], [], UIStateSlice> = (set) => ({
  // Initial state
  isEditModalOpen: false,
  editingEvent: null,
  isEventCreationModalOpen: false,
  isGoalCreationModalOpen: false,
  isGoalEditModalOpen: false,
  editingGoal: null,
  // Enhanced Goal edit modal state
  isEnhancedGoalEditModalOpen: false,
  editingEnhancedGoal: null,
  confirmationModal: {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  },
  showSettings: false,
  showAdvancedSettings: false,
  showApplicationSettings: false,
  showStrategyModal: false,
  initialStrategyId: null,
  showQuickstartWizard: false,
  showOnboardingChoice: false,
  isOrchestrating: false,
  selectedDeepDiveCalendarYear: null,

  // Deterministic mode initial state
  simulationMode: 'monteCarlo' as SimulationMode,
  deterministicExpandedYears: [],

  // Actions
  setIsEditModalOpen: (open) => set({ isEditModalOpen: open }),
  setEditingEvent: (event) => set({ editingEvent: event }),
  setIsEventCreationModalOpen: (open) => set({ isEventCreationModalOpen: open }),
  setIsGoalCreationModalOpen: (open) => set({ isGoalCreationModalOpen: open }),
  setIsGoalEditModalOpen: (open) => set({ isGoalEditModalOpen: open }),
  setEditingGoal: (goal) => set({ editingGoal: goal }),
  // Enhanced Goal actions
  setIsEnhancedGoalEditModalOpen: (open) => set({ isEnhancedGoalEditModalOpen: open }),
  setEditingEnhancedGoal: (goal) => set({ editingEnhancedGoal: goal }),
  
  setConfirmationModal: (modal) => set((state) => ({
    confirmationModal: typeof modal === 'function' ? modal(state.confirmationModal) : modal
  })),
  
  setShowSettings: (show) => set({ showSettings: show }),
  setShowAdvancedSettings: (show) => set({ showAdvancedSettings: show }),
  setShowApplicationSettings: (show) => set({ showApplicationSettings: show }),
  setShowStrategyModal: (show) => set({ showStrategyModal: show }),
  setInitialStrategyId: (strategyId) => set({ initialStrategyId: strategyId }),
  setShowQuickstartWizard: (show) => set({ showQuickstartWizard: show }),
  setShowOnboardingChoice: (show) => set({ showOnboardingChoice: show }),
  setIsOrchestrating: (orchestrating) => set({ isOrchestrating: orchestrating }),
  setSelectedDeepDiveCalendarYear: (year) => set({ selectedDeepDiveCalendarYear: year }),

  // Deterministic mode actions
  setSimulationMode: (mode) => set({ simulationMode: mode }),
  toggleDeterministicYearExpansion: (year) => set((state) => {
    const expandedYears = [...state.deterministicExpandedYears];
    const index = expandedYears.indexOf(year);
    if (index >= 0) {
      expandedYears.splice(index, 1);
    } else {
      expandedYears.push(year);
    }
    return { deterministicExpandedYears: expandedYears };
  }),
  clearDeterministicExpandedYears: () => set({ deterministicExpandedYears: [] }),
});