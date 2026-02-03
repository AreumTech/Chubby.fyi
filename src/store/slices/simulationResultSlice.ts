import { StateCreator } from 'zustand';
import { SimulationPayload } from '../../types';

export interface SimulationResultSlice {
  // Large simulation data - changes only after simulation runs
  simulationPayload: SimulationPayload | null;
  
  // Actions
  setSimulationPayload: (payload: SimulationPayload | null | ((prev: SimulationPayload | null) => SimulationPayload | null)) => void;
}

export const createSimulationResultSlice: StateCreator<SimulationResultSlice, [], [], SimulationResultSlice> = (set) => ({
  // Initial state
  simulationPayload: null,
  
  // Actions
  setSimulationPayload: (payload) => set((state) => ({
    simulationPayload: typeof payload === 'function' ? payload(state.simulationPayload) : payload
  })),
});