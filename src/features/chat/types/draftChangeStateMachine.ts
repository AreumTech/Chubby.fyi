/**
 * DraftChange State Machine - PFOS-E Compliant
 *
 * Manages the lifecycle of draft changes from input to simulation.
 * Ensures type-safe transitions and prevents invalid states.
 *
 * State Flow:
 * IDLE → EDITING → CONFIRMING → EDITING → SIMULATING → READY
 *          ↑                       │
 *          └───────────────────────┘
 *
 * Any state can transition to ERROR, which requires explicit RESET.
 */

import { ChangeScope, DraftChangeV0 } from './draftChangeSchema';

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * DraftChangeState - Current state of the draft change system
 *
 * Note: SIMULATING does not have packetId - the ID is only known after
 * the packet is created by packetSlice (single source of truth for IDs).
 */
export type DraftChangeState =
  | { type: 'IDLE' }
  | { type: 'EDITING'; pendingChangeIds: string[] }
  | { type: 'CONFIRMING'; changeId: string }
  | { type: 'SIMULATING' }
  | { type: 'READY'; packetId: string }
  | { type: 'ERROR'; error: string; recoverable: boolean };

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * DraftChangeAction - Actions that trigger state transitions
 */
export type DraftChangeAction =
  | { type: 'PROPOSE_CHANGE'; change: Omit<DraftChangeV0, 'id' | 'status' | 'validationErrors'> }
  | { type: 'OPEN_REVIEW'; changeId: string }
  | { type: 'CLOSE_REVIEW' }
  | { type: 'CONFIRM_CHANGE'; changeId: string; scope: ChangeScope }
  | { type: 'DISCARD_CHANGE'; changeId: string }
  | { type: 'RUN_SIMULATION' }
  | { type: 'SIMULATION_COMPLETE'; packetId: string }
  | { type: 'SIMULATION_ERROR'; error: string }
  | { type: 'RESET' };

// =============================================================================
// STATE TRANSITION LOGIC
// =============================================================================

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  currentState: DraftChangeState,
  action: DraftChangeAction
): boolean {
  switch (action.type) {
    case 'PROPOSE_CHANGE':
      // Can propose changes in IDLE or EDITING states
      return currentState.type === 'IDLE' || currentState.type === 'EDITING';

    case 'OPEN_REVIEW':
      // Can only open review in EDITING state
      return currentState.type === 'EDITING';

    case 'CLOSE_REVIEW':
      // Can only close review in CONFIRMING state
      return currentState.type === 'CONFIRMING';

    case 'CONFIRM_CHANGE':
      // Can confirm in CONFIRMING state
      return currentState.type === 'CONFIRMING';

    case 'DISCARD_CHANGE':
      // Can discard in CONFIRMING or EDITING state
      return (
        currentState.type === 'CONFIRMING' ||
        currentState.type === 'EDITING'
      );

    case 'RUN_SIMULATION':
      // Can only run simulation from EDITING state
      return currentState.type === 'EDITING';

    case 'SIMULATION_COMPLETE':
      // Must be in SIMULATING state
      return currentState.type === 'SIMULATING';

    case 'SIMULATION_ERROR':
      // Must be in SIMULATING state
      return currentState.type === 'SIMULATING';

    case 'RESET':
      // Can reset from any state
      return true;

    default:
      return false;
  }
}

/**
 * Get the initial state
 */
export function getInitialState(): DraftChangeState {
  return { type: 'IDLE' };
}

// =============================================================================
// STATE SELECTORS
// =============================================================================

/**
 * Check if currently in a state that allows user input
 */
export function canAcceptInput(state: DraftChangeState): boolean {
  return state.type === 'IDLE' || state.type === 'EDITING';
}

/**
 * Check if simulation can be triggered
 */
export function canRunSimulation(
  state: DraftChangeState,
  confirmedChangeCount: number
): boolean {
  return state.type === 'EDITING' && confirmedChangeCount > 0;
}

/**
 * Check if the system is busy (simulating or in error state)
 */
export function isBusy(state: DraftChangeState): boolean {
  return state.type === 'SIMULATING';
}

/**
 * Check if there's an error that needs attention
 */
export function hasError(state: DraftChangeState): boolean {
  return state.type === 'ERROR';
}

/**
 * Check if a packet is ready for viewing
 */
export function isPacketReady(state: DraftChangeState): state is { type: 'READY'; packetId: string } {
  return state.type === 'READY';
}

/**
 * Get the current packet ID if available
 */
export function getCurrentPacketId(state: DraftChangeState): string | null {
  if (state.type === 'READY') {
    return state.packetId;
  }
  return null;
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: DraftChangeState): string {
  switch (state.type) {
    case 'IDLE':
      return 'Ready for input';
    case 'EDITING':
      return `${state.pendingChangeIds.length} change(s) pending`;
    case 'CONFIRMING':
      return 'Reviewing change';
    case 'SIMULATING':
      return 'Running simulation...';
    case 'READY':
      return 'Packet ready';
    case 'ERROR':
      return state.recoverable ? 'Error (recoverable)' : 'Error';
    default:
      return 'Unknown state';
  }
}

// =============================================================================
// STATE MACHINE INVARIANTS
// =============================================================================

/**
 * Validate state machine invariants
 *
 * Called in dev/test to catch state corruption early.
 */
export function validateStateInvariants(
  state: DraftChangeState,
  draftChanges: Map<string, DraftChangeV0>
): void {
  switch (state.type) {
    case 'EDITING':
      // All pending change IDs must exist in the draft changes map
      for (const id of state.pendingChangeIds) {
        if (!draftChanges.has(id)) {
          throw new Error(
            `State invariant violation: EDITING state references non-existent change ${id}`
          );
        }
      }
      break;

    case 'CONFIRMING':
      // The change being confirmed must exist
      if (!draftChanges.has(state.changeId)) {
        throw new Error(
          `State invariant violation: CONFIRMING state references non-existent change ${state.changeId}`
        );
      }
      break;
  }
}
