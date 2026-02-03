/**
 * DraftChange Store Slice
 *
 * Manages the state of draft changes and the state machine that
 * governs the flow from user input to simulation.
 */

import { StateCreator } from 'zustand';
import {
  DraftChangeV0,
  ConfirmedChange,
  ChangeScope,
  createDraftChange,
  confirmDraftChange as confirmDraft,
  canConfirmDraftChange,
} from '@/features/chat/types/draftChangeSchema';
import {
  DraftChangeState,
  DraftChangeAction,
  getInitialState,
  isValidTransition,
  canAcceptInput,
  canRunSimulation,
  validateStateInvariants,
} from '@/features/chat/types/draftChangeStateMachine';

// =============================================================================
// SLICE INTERFACE
// =============================================================================

export interface DraftChangeSlice {
  // === State ===

  /** Current state machine state */
  draftChangeState: DraftChangeState;

  /** All draft changes by ID */
  draftChanges: Map<string, DraftChangeV0>;

  /** Confirmed changes ready for simulation */
  confirmedChanges: ConfirmedChange[];

  // === Actions ===

  /**
   * Propose a new draft change
   * Returns the ID of the created change
   */
  proposeDraftChange: (
    change: Omit<DraftChangeV0, 'id' | 'status' | 'validationErrors'>
  ) => string;

  /**
   * Open the review modal for a specific change
   */
  openChangeReview: (changeId: string) => void;

  /**
   * Close the review modal
   */
  closeChangeReview: () => void;

  /**
   * Confirm a draft change with a scope
   */
  confirmDraftChange: (changeId: string, scope: ChangeScope) => void;

  /**
   * Discard a draft change
   */
  discardDraftChange: (changeId: string) => void;

  /**
   * Update validation errors for a draft change
   */
  setValidationErrors: (changeId: string, errors: string[]) => void;

  /**
   * Start simulation - transitions to SIMULATING state
   * (packetId is set by simulationComplete after packet creation)
   */
  startSimulation: () => void;

  /**
   * Mark simulation as complete
   */
  simulationComplete: (packetId: string) => void;

  /**
   * Mark simulation as failed
   */
  simulationError: (error: string, recoverable?: boolean) => void;

  /**
   * Reset the state machine to initial state
   */
  resetDraftChangeState: () => void;

  /**
   * Clear all draft changes (keeps confirmed changes)
   */
  clearDraftChanges: () => void;

  // === Selectors ===

  /** Get pending draft changes */
  getPendingDraftChanges: () => DraftChangeV0[];

  /** Get draft change by ID */
  getDraftChangeById: (id: string) => DraftChangeV0 | undefined;

  /** Check if input is allowed */
  canAcceptDraftInput: () => boolean;

  /** Check if simulation can run */
  canTriggerSimulation: () => boolean;
}

// =============================================================================
// SLICE IMPLEMENTATION
// =============================================================================

export const createDraftChangeSlice: StateCreator<
  DraftChangeSlice,
  [],
  [],
  DraftChangeSlice
> = (set, get) => ({
  // === Initial State ===
  draftChangeState: getInitialState(),
  draftChanges: new Map(),
  confirmedChanges: [],

  // === Actions ===

  proposeDraftChange: (changeParams) => {
    const state = get().draftChangeState;
    const action: DraftChangeAction = { type: 'PROPOSE_CHANGE', change: changeParams };

    if (!isValidTransition(state, action)) {
      console.warn('[DraftChangeSlice] Cannot propose change in current state:', state.type);
      throw new Error(`Cannot propose change in state: ${state.type}`);
    }

    const change = createDraftChange(changeParams);

    set((s) => {
      const newDraftChanges = new Map(s.draftChanges);
      newDraftChanges.set(change.id, change);

      // Transition to EDITING state if not already there
      const currentPendingIds =
        s.draftChangeState.type === 'EDITING'
          ? s.draftChangeState.pendingChangeIds
          : [];

      const newState: DraftChangeState = {
        type: 'EDITING',
        pendingChangeIds: [...currentPendingIds, change.id],
      };

      // Validate invariants in dev
      if (process.env.NODE_ENV !== 'production') {
        validateStateInvariants(newState, newDraftChanges);
      }

      return {
        draftChanges: newDraftChanges,
        draftChangeState: newState,
      };
    });

    return change.id;
  },

  openChangeReview: (changeId) => {
    const state = get().draftChangeState;
    const action: DraftChangeAction = { type: 'OPEN_REVIEW', changeId };

    if (!isValidTransition(state, action)) {
      console.warn('[DraftChangeSlice] Cannot open review in current state:', state.type);
      return;
    }

    const change = get().draftChanges.get(changeId);
    if (!change) {
      console.warn('[DraftChangeSlice] Change not found:', changeId);
      return;
    }

    set({
      draftChangeState: { type: 'CONFIRMING', changeId },
    });
  },

  closeChangeReview: () => {
    const state = get().draftChangeState;
    const action: DraftChangeAction = { type: 'CLOSE_REVIEW' };

    if (!isValidTransition(state, action)) {
      return;
    }

    // Return to EDITING state with current pending changes
    const pendingChangeIds = Array.from(get().draftChanges.entries())
      .filter(([_, change]) => change.status === 'pending')
      .map(([id]) => id);

    set({
      draftChangeState: {
        type: pendingChangeIds.length > 0 ? 'EDITING' : 'IDLE',
        ...(pendingChangeIds.length > 0 ? { pendingChangeIds } : {}),
      } as DraftChangeState,
    });
  },

  confirmDraftChange: (changeId, scope) => {
    const state = get().draftChangeState;
    const action: DraftChangeAction = { type: 'CONFIRM_CHANGE', changeId, scope };

    if (!isValidTransition(state, action)) {
      console.warn('[DraftChangeSlice] Cannot confirm in current state:', state.type);
      return;
    }

    const change = get().draftChanges.get(changeId);
    if (!change) {
      console.warn('[DraftChangeSlice] Change not found:', changeId);
      return;
    }

    if (!canConfirmDraftChange(change)) {
      console.warn('[DraftChangeSlice] Change has validation errors:', change.validationErrors);
      return;
    }

    const confirmed = confirmDraft(change, scope);

    set((s) => {
      const newDraftChanges = new Map(s.draftChanges);
      newDraftChanges.set(changeId, { ...change, status: 'confirmed' });

      // Get remaining pending changes
      const pendingChangeIds = Array.from(newDraftChanges.entries())
        .filter(([_, c]) => c.status === 'pending')
        .map(([id]) => id);

      return {
        draftChanges: newDraftChanges,
        confirmedChanges: [...s.confirmedChanges, confirmed],
        draftChangeState:
          pendingChangeIds.length > 0
            ? { type: 'EDITING', pendingChangeIds }
            : { type: 'EDITING', pendingChangeIds: [] },
      };
    });
  },

  discardDraftChange: (changeId) => {
    const state = get().draftChangeState;
    const action: DraftChangeAction = { type: 'DISCARD_CHANGE', changeId };

    if (!isValidTransition(state, action)) {
      console.warn('[DraftChangeSlice] Cannot discard in current state:', state.type);
      return;
    }

    const change = get().draftChanges.get(changeId);
    if (!change) {
      return;
    }

    set((s) => {
      const newDraftChanges = new Map(s.draftChanges);
      newDraftChanges.set(changeId, { ...change, status: 'discarded' });

      // Get remaining pending changes
      const pendingChangeIds = Array.from(newDraftChanges.entries())
        .filter(([_, c]) => c.status === 'pending')
        .map(([id]) => id);

      // Stay in EDITING if there are pending changes OR confirmed changes
      // (user can still run simulation with confirmed changes)
      const hasWorkInProgress = pendingChangeIds.length > 0 || s.confirmedChanges.length > 0;

      return {
        draftChanges: newDraftChanges,
        draftChangeState: hasWorkInProgress
          ? { type: 'EDITING', pendingChangeIds }
          : { type: 'IDLE' },
      };
    });
  },

  setValidationErrors: (changeId, errors) => {
    const change = get().draftChanges.get(changeId);
    if (!change) {
      return;
    }

    set((s) => {
      const newDraftChanges = new Map(s.draftChanges);
      newDraftChanges.set(changeId, { ...change, validationErrors: errors });
      return { draftChanges: newDraftChanges };
    });
  },

  startSimulation: () => {
    const state = get().draftChangeState;
    const action: DraftChangeAction = { type: 'RUN_SIMULATION' };

    if (!isValidTransition(state, action)) {
      throw new Error(`Cannot start simulation in state: ${state.type}`);
    }

    const confirmedCount = get().confirmedChanges.length;
    if (!canRunSimulation(state, confirmedCount)) {
      throw new Error('No confirmed changes to simulate');
    }

    // Transition to SIMULATING - packetId will be set when simulation completes
    // (packetSlice is the single source of truth for ID generation)
    set({
      draftChangeState: { type: 'SIMULATING' },
    });
  },

  simulationComplete: (packetId) => {
    const state = get().draftChangeState;
    const action: DraftChangeAction = { type: 'SIMULATION_COMPLETE', packetId };

    if (!isValidTransition(state, action)) {
      console.warn('[DraftChangeSlice] Unexpected simulation complete in state:', state.type);
      return;
    }

    set({
      draftChangeState: { type: 'READY', packetId },
    });
  },

  simulationError: (error, recoverable = true) => {
    const state = get().draftChangeState;
    const action: DraftChangeAction = { type: 'SIMULATION_ERROR', error };

    if (!isValidTransition(state, action)) {
      console.warn('[DraftChangeSlice] Unexpected simulation error in state:', state.type);
      return;
    }

    set({
      draftChangeState: { type: 'ERROR', error, recoverable },
    });
  },

  resetDraftChangeState: () => {
    set({
      draftChangeState: getInitialState(),
      draftChanges: new Map(),
      confirmedChanges: [],
    });
  },

  clearDraftChanges: () => {
    set((s) => ({
      draftChanges: new Map(),
      draftChangeState:
        s.confirmedChanges.length > 0
          ? { type: 'EDITING', pendingChangeIds: [] }
          : { type: 'IDLE' },
    }));
  },

  // === Selectors ===

  getPendingDraftChanges: () => {
    return Array.from(get().draftChanges.values()).filter(
      (change) => change.status === 'pending'
    );
  },

  getDraftChangeById: (id) => {
    return get().draftChanges.get(id);
  },

  canAcceptDraftInput: () => {
    return canAcceptInput(get().draftChangeState);
  },

  canTriggerSimulation: () => {
    const state = get().draftChangeState;
    const confirmedCount = get().confirmedChanges.length;
    return canRunSimulation(state, confirmedCount);
  },
});
