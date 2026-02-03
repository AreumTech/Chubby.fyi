/**
 * DraftChange State Machine Tests
 *
 * Tests for the state machine that governs draft change lifecycle.
 * Validates transition rules, selectors, and invariants.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DraftChangeState,
  DraftChangeAction,
  isValidTransition,
  getInitialState,
  canAcceptInput,
  canRunSimulation,
  isBusy,
  hasError,
  isPacketReady,
  getCurrentPacketId,
  getStateDescription,
  validateStateInvariants,
} from '@/features/chat/types/draftChangeStateMachine';
import { DraftChangeV0 } from '@/features/chat/types/draftChangeSchema';

// =============================================================================
// TEST HELPERS
// =============================================================================

const createMockDraftChange = (id: string): DraftChangeV0 => ({
  id,
  status: 'pending',
  entityType: 'TestEntity',
  fieldPath: ['testField'],
  oldValue: 100,
  newValue: 200,
  scope: 'scenario_only',
  confidence: 1.0,
  sourceMessageId: 'msg-1',
  validationErrors: [],
});

// =============================================================================
// INITIAL STATE TESTS
// =============================================================================

describe('getInitialState', () => {
  it('returns IDLE state', () => {
    const state = getInitialState();
    expect(state.type).toBe('IDLE');
  });
});

// =============================================================================
// TRANSITION VALIDATION TESTS
// =============================================================================

describe('isValidTransition', () => {
  describe('PROPOSE_CHANGE', () => {
    const proposeAction: DraftChangeAction = {
      type: 'PROPOSE_CHANGE',
      change: {
        entityType: 'Test',
        fieldPath: ['test'],
        oldValue: null,
        newValue: 100,
        scope: 'scenario_only',
        confidence: 1.0,
        sourceMessageId: 'msg-1',
      },
    };

    it('allows PROPOSE_CHANGE from IDLE', () => {
      const state: DraftChangeState = { type: 'IDLE' };
      expect(isValidTransition(state, proposeAction)).toBe(true);
    });

    it('allows PROPOSE_CHANGE from EDITING', () => {
      const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: ['c1'] };
      expect(isValidTransition(state, proposeAction)).toBe(true);
    });

    it('rejects PROPOSE_CHANGE from CONFIRMING', () => {
      const state: DraftChangeState = { type: 'CONFIRMING', changeId: 'c1' };
      expect(isValidTransition(state, proposeAction)).toBe(false);
    });

    it('rejects PROPOSE_CHANGE from SIMULATING', () => {
      const state: DraftChangeState = { type: 'SIMULATING' };
      expect(isValidTransition(state, proposeAction)).toBe(false);
    });

    it('rejects PROPOSE_CHANGE from READY', () => {
      const state: DraftChangeState = { type: 'READY', packetId: 'AF-001' };
      expect(isValidTransition(state, proposeAction)).toBe(false);
    });

    it('rejects PROPOSE_CHANGE from ERROR', () => {
      const state: DraftChangeState = { type: 'ERROR', error: 'test', recoverable: true };
      expect(isValidTransition(state, proposeAction)).toBe(false);
    });
  });

  describe('OPEN_REVIEW', () => {
    const openReviewAction: DraftChangeAction = { type: 'OPEN_REVIEW', changeId: 'c1' };

    it('allows OPEN_REVIEW from EDITING', () => {
      const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: ['c1'] };
      expect(isValidTransition(state, openReviewAction)).toBe(true);
    });

    it('rejects OPEN_REVIEW from IDLE', () => {
      const state: DraftChangeState = { type: 'IDLE' };
      expect(isValidTransition(state, openReviewAction)).toBe(false);
    });

    it('rejects OPEN_REVIEW from SIMULATING', () => {
      const state: DraftChangeState = { type: 'SIMULATING' };
      expect(isValidTransition(state, openReviewAction)).toBe(false);
    });
  });

  describe('CLOSE_REVIEW', () => {
    const closeReviewAction: DraftChangeAction = { type: 'CLOSE_REVIEW' };

    it('allows CLOSE_REVIEW from CONFIRMING', () => {
      const state: DraftChangeState = { type: 'CONFIRMING', changeId: 'c1' };
      expect(isValidTransition(state, closeReviewAction)).toBe(true);
    });

    it('rejects CLOSE_REVIEW from EDITING', () => {
      const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: [] };
      expect(isValidTransition(state, closeReviewAction)).toBe(false);
    });
  });

  describe('CONFIRM_CHANGE', () => {
    const confirmAction: DraftChangeAction = {
      type: 'CONFIRM_CHANGE',
      changeId: 'c1',
      scope: 'baseline_candidate',
    };

    it('allows CONFIRM_CHANGE from CONFIRMING', () => {
      const state: DraftChangeState = { type: 'CONFIRMING', changeId: 'c1' };
      expect(isValidTransition(state, confirmAction)).toBe(true);
    });

    it('rejects CONFIRM_CHANGE from EDITING', () => {
      const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: ['c1'] };
      expect(isValidTransition(state, confirmAction)).toBe(false);
    });
  });

  describe('DISCARD_CHANGE', () => {
    const discardAction: DraftChangeAction = { type: 'DISCARD_CHANGE', changeId: 'c1' };

    it('allows DISCARD_CHANGE from CONFIRMING', () => {
      const state: DraftChangeState = { type: 'CONFIRMING', changeId: 'c1' };
      expect(isValidTransition(state, discardAction)).toBe(true);
    });

    it('allows DISCARD_CHANGE from EDITING', () => {
      const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: ['c1'] };
      expect(isValidTransition(state, discardAction)).toBe(true);
    });

    it('rejects DISCARD_CHANGE from IDLE', () => {
      const state: DraftChangeState = { type: 'IDLE' };
      expect(isValidTransition(state, discardAction)).toBe(false);
    });
  });

  describe('RUN_SIMULATION', () => {
    const runSimAction: DraftChangeAction = { type: 'RUN_SIMULATION' };

    it('allows RUN_SIMULATION from EDITING', () => {
      const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: [] };
      expect(isValidTransition(state, runSimAction)).toBe(true);
    });

    it('rejects RUN_SIMULATION from IDLE', () => {
      const state: DraftChangeState = { type: 'IDLE' };
      expect(isValidTransition(state, runSimAction)).toBe(false);
    });

    it('rejects RUN_SIMULATION from SIMULATING', () => {
      const state: DraftChangeState = { type: 'SIMULATING' };
      expect(isValidTransition(state, runSimAction)).toBe(false);
    });
  });

  describe('SIMULATION_COMPLETE', () => {
    const completeAction: DraftChangeAction = {
      type: 'SIMULATION_COMPLETE',
      packetId: 'AF-001',
    };

    it('allows SIMULATION_COMPLETE from SIMULATING', () => {
      const state: DraftChangeState = { type: 'SIMULATING' };
      expect(isValidTransition(state, completeAction)).toBe(true);
    });

    it('rejects SIMULATION_COMPLETE from EDITING', () => {
      const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: [] };
      expect(isValidTransition(state, completeAction)).toBe(false);
    });
  });

  describe('SIMULATION_ERROR', () => {
    const errorAction: DraftChangeAction = {
      type: 'SIMULATION_ERROR',
      error: 'Simulation failed',
    };

    it('allows SIMULATION_ERROR from SIMULATING', () => {
      const state: DraftChangeState = { type: 'SIMULATING' };
      expect(isValidTransition(state, errorAction)).toBe(true);
    });

    it('rejects SIMULATION_ERROR from other states', () => {
      const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: [] };
      expect(isValidTransition(state, errorAction)).toBe(false);
    });
  });

  describe('RESET', () => {
    const resetAction: DraftChangeAction = { type: 'RESET' };

    it('allows RESET from any state', () => {
      const states: DraftChangeState[] = [
        { type: 'IDLE' },
        { type: 'EDITING', pendingChangeIds: ['c1'] },
        { type: 'CONFIRMING', changeId: 'c1' },
        { type: 'SIMULATING' },
        { type: 'READY', packetId: 'AF-001' },
        { type: 'ERROR', error: 'test', recoverable: true },
      ];

      states.forEach((state) => {
        expect(isValidTransition(state, resetAction)).toBe(true);
      });
    });
  });
});

// =============================================================================
// SELECTOR TESTS
// =============================================================================

describe('State Selectors', () => {
  describe('canAcceptInput', () => {
    it('returns true for IDLE', () => {
      expect(canAcceptInput({ type: 'IDLE' })).toBe(true);
    });

    it('returns true for EDITING', () => {
      expect(canAcceptInput({ type: 'EDITING', pendingChangeIds: [] })).toBe(true);
    });

    it('returns false for CONFIRMING', () => {
      expect(canAcceptInput({ type: 'CONFIRMING', changeId: 'c1' })).toBe(false);
    });

    it('returns false for SIMULATING', () => {
      expect(canAcceptInput({ type: 'SIMULATING' })).toBe(false);
    });
  });

  describe('canRunSimulation', () => {
    it('returns true for EDITING with confirmed changes', () => {
      expect(canRunSimulation({ type: 'EDITING', pendingChangeIds: [] }, 1)).toBe(true);
    });

    it('returns false for EDITING with no confirmed changes', () => {
      expect(canRunSimulation({ type: 'EDITING', pendingChangeIds: [] }, 0)).toBe(false);
    });

    it('returns false for IDLE even with confirmed changes', () => {
      expect(canRunSimulation({ type: 'IDLE' }, 1)).toBe(false);
    });
  });

  describe('isBusy', () => {
    it('returns true for SIMULATING', () => {
      expect(isBusy({ type: 'SIMULATING' })).toBe(true);
    });

    it('returns false for other states', () => {
      expect(isBusy({ type: 'IDLE' })).toBe(false);
      expect(isBusy({ type: 'EDITING', pendingChangeIds: [] })).toBe(false);
    });
  });

  describe('hasError', () => {
    it('returns true for ERROR state', () => {
      expect(hasError({ type: 'ERROR', error: 'test', recoverable: true })).toBe(true);
    });

    it('returns false for other states', () => {
      expect(hasError({ type: 'IDLE' })).toBe(false);
    });
  });

  describe('isPacketReady', () => {
    it('returns true for READY state', () => {
      const state: DraftChangeState = { type: 'READY', packetId: 'AF-001' };
      expect(isPacketReady(state)).toBe(true);
    });

    it('returns false for other states', () => {
      expect(isPacketReady({ type: 'IDLE' })).toBe(false);
      expect(isPacketReady({ type: 'SIMULATING' })).toBe(false);
    });
  });

  describe('getCurrentPacketId', () => {
    it('returns packet ID for READY state', () => {
      expect(getCurrentPacketId({ type: 'READY', packetId: 'AF-001' })).toBe('AF-001');
    });

    it('returns null for other states', () => {
      expect(getCurrentPacketId({ type: 'IDLE' })).toBe(null);
      expect(getCurrentPacketId({ type: 'SIMULATING' })).toBe(null);
    });
  });

  describe('getStateDescription', () => {
    it('returns correct description for each state', () => {
      expect(getStateDescription({ type: 'IDLE' })).toBe('Ready for input');
      expect(getStateDescription({ type: 'EDITING', pendingChangeIds: ['a', 'b'] })).toBe(
        '2 change(s) pending'
      );
      expect(getStateDescription({ type: 'CONFIRMING', changeId: 'c1' })).toBe(
        'Reviewing change'
      );
      expect(getStateDescription({ type: 'SIMULATING' })).toBe('Running simulation...');
      expect(getStateDescription({ type: 'READY', packetId: 'AF-001' })).toBe('Packet ready');
      expect(getStateDescription({ type: 'ERROR', error: 'test', recoverable: true })).toBe(
        'Error (recoverable)'
      );
      expect(getStateDescription({ type: 'ERROR', error: 'test', recoverable: false })).toBe(
        'Error'
      );
    });
  });
});

// =============================================================================
// INVARIANT TESTS
// =============================================================================

describe('validateStateInvariants', () => {
  it('passes for valid EDITING state', () => {
    const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: ['c1', 'c2'] };
    const changes = new Map<string, DraftChangeV0>([
      ['c1', createMockDraftChange('c1')],
      ['c2', createMockDraftChange('c2')],
    ]);

    expect(() => validateStateInvariants(state, changes)).not.toThrow();
  });

  it('throws for EDITING state with missing change', () => {
    const state: DraftChangeState = { type: 'EDITING', pendingChangeIds: ['c1', 'c2'] };
    const changes = new Map<string, DraftChangeV0>([
      ['c1', createMockDraftChange('c1')],
      // 'c2' is missing
    ]);

    expect(() => validateStateInvariants(state, changes)).toThrow(
      /references non-existent change c2/
    );
  });

  it('passes for valid CONFIRMING state', () => {
    const state: DraftChangeState = { type: 'CONFIRMING', changeId: 'c1' };
    const changes = new Map<string, DraftChangeV0>([
      ['c1', createMockDraftChange('c1')],
    ]);

    expect(() => validateStateInvariants(state, changes)).not.toThrow();
  });

  it('throws for CONFIRMING state with missing change', () => {
    const state: DraftChangeState = { type: 'CONFIRMING', changeId: 'c1' };
    const changes = new Map<string, DraftChangeV0>();

    expect(() => validateStateInvariants(state, changes)).toThrow(
      /references non-existent change c1/
    );
  });

  it('passes for IDLE state (no invariants to check)', () => {
    const state: DraftChangeState = { type: 'IDLE' };
    const changes = new Map<string, DraftChangeV0>();

    expect(() => validateStateInvariants(state, changes)).not.toThrow();
  });
});

// =============================================================================
// INTEGRATION: FULL STATE FLOW TESTS
// =============================================================================

describe('State Flow Integration', () => {
  it('validates complete happy path: IDLE → EDITING → CONFIRMING → EDITING → SIMULATING → READY', () => {
    // Start at IDLE
    let state: DraftChangeState = getInitialState();
    expect(state.type).toBe('IDLE');

    // Can accept input
    expect(canAcceptInput(state)).toBe(true);

    // Propose a change → EDITING
    expect(
      isValidTransition(state, {
        type: 'PROPOSE_CHANGE',
        change: {
          entityType: 'Test',
          fieldPath: ['test'],
          oldValue: null,
          newValue: 100,
          scope: 'scenario_only',
          confidence: 1.0,
          sourceMessageId: 'msg-1',
        },
      })
    ).toBe(true);

    state = { type: 'EDITING', pendingChangeIds: ['c1'] };
    expect(canAcceptInput(state)).toBe(true);
    expect(canRunSimulation(state, 0)).toBe(false); // No confirmed changes yet

    // Open review → CONFIRMING
    expect(isValidTransition(state, { type: 'OPEN_REVIEW', changeId: 'c1' })).toBe(true);
    state = { type: 'CONFIRMING', changeId: 'c1' };
    expect(canAcceptInput(state)).toBe(false);

    // Confirm change → back to EDITING
    expect(
      isValidTransition(state, {
        type: 'CONFIRM_CHANGE',
        changeId: 'c1',
        scope: 'baseline_candidate',
      })
    ).toBe(true);
    state = { type: 'EDITING', pendingChangeIds: [] };
    expect(canRunSimulation(state, 1)).toBe(true); // Now has 1 confirmed change

    // Run simulation → SIMULATING
    expect(isValidTransition(state, { type: 'RUN_SIMULATION' })).toBe(true);
    state = { type: 'SIMULATING' };
    expect(isBusy(state)).toBe(true);
    expect(canAcceptInput(state)).toBe(false);

    // Simulation complete → READY
    expect(
      isValidTransition(state, { type: 'SIMULATION_COMPLETE', packetId: 'AF-001' })
    ).toBe(true);
    state = { type: 'READY', packetId: 'AF-001' };
    expect(isPacketReady(state)).toBe(true);
    expect(getCurrentPacketId(state)).toBe('AF-001');
  });

  it('validates error recovery path: SIMULATING → ERROR → RESET → IDLE', () => {
    // Start in SIMULATING
    let state: DraftChangeState = { type: 'SIMULATING' };

    // Simulation fails → ERROR
    expect(
      isValidTransition(state, { type: 'SIMULATION_ERROR', error: 'Network timeout' })
    ).toBe(true);
    state = { type: 'ERROR', error: 'Network timeout', recoverable: true };
    expect(hasError(state)).toBe(true);

    // Reset → back to IDLE
    expect(isValidTransition(state, { type: 'RESET' })).toBe(true);
    state = getInitialState();
    expect(state.type).toBe('IDLE');
    expect(hasError(state)).toBe(false);
  });

  it('validates discard path: EDITING → CONFIRMING → DISCARD → EDITING', () => {
    let state: DraftChangeState = { type: 'EDITING', pendingChangeIds: ['c1'] };

    // Open review
    expect(isValidTransition(state, { type: 'OPEN_REVIEW', changeId: 'c1' })).toBe(true);
    state = { type: 'CONFIRMING', changeId: 'c1' };

    // Discard change
    expect(isValidTransition(state, { type: 'DISCARD_CHANGE', changeId: 'c1' })).toBe(true);
    // State transitions handled by slice - would go back to EDITING or IDLE
  });
});
