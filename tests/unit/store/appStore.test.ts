import { describe, it, expect, beforeEach } from 'vitest';
import { create, type StoreApi } from 'zustand';
import { DEFAULT_APP_CONFIG } from '@/config/appConfig';
import { createPlanSlice, type PlanSlice } from '@/store/slices/planSlice';
import { createUIStateSlice, type UIStateSlice } from '@/store/slices/uiStateSlice';
import { createSimulationResultSlice, type SimulationResultSlice } from '@/store/slices/simulationResultSlice';

type TestStore = PlanSlice & UIStateSlice & SimulationResultSlice;

const createTestStore = (): StoreApi<TestStore> =>
  create<TestStore>()((...a) => ({
    ...createPlanSlice(...a),
    ...createUIStateSlice(...a),
    ...createSimulationResultSlice(...a),
  }));

describe('AppStore slices', () => {
  let store: StoreApi<TestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should initialize with default values', () => {
    const state = store.getState();
    
    expect(state.config).toEqual(DEFAULT_APP_CONFIG);
    // Check the scenario-based structure
    expect(Object.keys(state.scenarios).length).toBeGreaterThan(0);
    expect(state.activeScenarioId).toBeDefined();
    const activeScenario = state.scenarios[state.activeScenarioId];
    expect(activeScenario.eventLedger.length).toBeGreaterThan(0); // includes INITIAL_STATE
    expect(activeScenario.name).toBeDefined();
    // UI state checks
    expect(state.simulationPayload).toBeNull();
    expect(state.isOrchestrating).toBe(false);
  });

  it('should update config', () => {
    const { setConfig } = store.getState();
    
    setConfig(prev => ({ ...prev, currentAge: 35 }));
    
    const state = store.getState();
    expect(state.config.currentAge).toBe(35);
  });

  it('should update modal states', () => {
    const { setIsEditModalOpen, setIsEventCreationModalOpen } = store.getState();
    
    setIsEditModalOpen(true);
    setIsEventCreationModalOpen(true);
    
    const state = store.getState();
    expect(state.isEditModalOpen).toBe(true);
    expect(state.isEventCreationModalOpen).toBe(true);
  });

  it('should update event ledger', () => {
    const { setEventLedger, getActiveScenario } = store.getState();
    const mockEvent = {
      id: 'test-1',
      type: 'INCOME' as const,
      name: 'Test Income',
      priority: 'INCOME' as const,
      amount: 5000,
      startDateOffset: 0,
      endDateOffset: 120
    };
    
    setEventLedger([mockEvent]);
    
    const activeScenario = getActiveScenario();
    expect(activeScenario?.eventLedger).toHaveLength(1);
    expect(activeScenario?.eventLedger[0]).toEqual(mockEvent);
  });
});
