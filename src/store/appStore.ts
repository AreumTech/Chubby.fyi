import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPlanSlice, PlanSlice } from './slices/planSlice';
import { createUIStateSlice, UIStateSlice } from './slices/uiStateSlice';
import { createSimulationResultSlice, SimulationResultSlice } from './slices/simulationResultSlice';
import { createDraftChangeSlice, DraftChangeSlice } from './slices/draftChangeSlice';
import { createPacketSlice, PacketSlice } from './slices/packetSlice';
import { DEFAULT_APP_CONFIG } from '@/config/appConfig';

export type AppStore = PlanSlice & UIStateSlice & SimulationResultSlice & DraftChangeSlice & PacketSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createPlanSlice(...a),
      ...createUIStateSlice(...a),
      ...createSimulationResultSlice(...a),
      ...createDraftChangeSlice(...a),
      ...createPacketSlice(...a),
    }),
    {
      name: 'pathfinder-app-storage',
      version: 7, // Fixed contribution routing + correlation matrix migration
      // Only persist plan data and UI state, not large simulation results
      partialize: (state) => ({
        // Plan data
        config: state.config,
        scenarios: state.scenarios,
        activeScenarioId: state.activeScenarioId,
        // UI state that should persist
        showSettings: state.showSettings,
        showAdvancedSettings: state.showAdvancedSettings,
        showApplicationSettings: state.showApplicationSettings,
        selectedDeepDiveCalendarYear: state.selectedDeepDiveCalendarYear,
        // Packet state (bookmarked packets persist)
        packetSequence: state.packetSequence,
        // Note: packets Map is NOT persisted - packets are regenerated on demand
      }),
      // Migration function to fix old stored configs
      migrate: (persistedState: any, version: number) => {
        // Fix correlation matrix if it's 6x6 (from versions < 6)
        if (persistedState.config?.stochasticConfig?.correlationMatrix) {
          const matrix = persistedState.config.stochasticConfig.correlationMatrix;
          if (matrix.length === 6 || (matrix.length > 0 && matrix[0].length === 6)) {
            console.info('🔧 [STORAGE-MIGRATION] Upgrading correlation matrix from 6x6 to 8x8');
            persistedState.config.stochasticConfig.correlationMatrix = DEFAULT_APP_CONFIG.stochasticConfig.correlationMatrix;
          }
        }

        // Fix contribution routing (version 7+)
        // Corrects events that have accountType but wrong/missing targetAccountType
        if (persistedState.scenarios && version < 7) {
          console.info('🔧 [STORAGE-MIGRATION] Fixing contribution routing for saved events');
          let fixedCount = 0;

          Object.values(persistedState.scenarios).forEach((scenario: any) => {
            if (scenario?.eventLedger?.events) {
              scenario.eventLedger.events.forEach((event: any) => {
                // Only process contribution events
                if (event.type === 'SCHEDULED_CONTRIBUTION' || event.type === 'CONTRIBUTION') {
                  // Check if event has legacy accountType in metadata
                  const legacyAccountType = event.metadata?.accountType || event.accountType;

                  if (legacyAccountType && event.targetAccountType === 'taxable') {
                    // Map legacy accountType to correct targetAccountType
                    let correctedTarget: string | null = null;

                    switch (legacyAccountType) {
                      case '401k':
                      case '403b':
                      case '401k_traditional':
                      case 'ira':
                      case 'traditional_ira':
                        correctedTarget = 'tax_deferred';
                        break;
                      case 'rothIra':
                      case '401k_roth':
                      case 'roth_ira':
                      case 'roth':
                        correctedTarget = 'roth';
                        break;
                      case 'hsa':
                        correctedTarget = 'hsa';
                        break;
                      case '529':
                        correctedTarget = '529';
                        break;
                    }

                    if (correctedTarget) {
                      console.info(
                        `🔧 [ROUTING-FIX] Event "${event.id}" (${event.name}): ` +
                        `${legacyAccountType} → ${correctedTarget} (was: ${event.targetAccountType})`
                      );
                      event.targetAccountType = correctedTarget;
                      fixedCount++;
                    }
                  }
                }
              });
            }
          });

          if (fixedCount > 0) {
            console.info(`✅ [STORAGE-MIGRATION] Fixed ${fixedCount} contribution routing issues`);
          }
        }

        return persistedState;
      },
      // Use default localStorage - no custom storage needed for now
    }
  )
);

// Setup inter-slice subscriptions for automatic simulation clearing
export const initializeAppStore = () => {
  useAppStore.subscribe(
    (state) => ({ 
      scenarios: state.scenarios, 
      activeScenarioId: state.activeScenarioId, 
      config: state.config 
    }),
    (current, previous) => {
      // Check if the active scenario changed or if the active scenario's event ledger changed
      const currentActiveScenario = current.scenarios[current.activeScenarioId];
      const previousActiveScenario = previous.scenarios[previous.activeScenarioId];
      
      if (
        current.activeScenarioId !== previous.activeScenarioId ||
        currentActiveScenario?.eventLedger !== previousActiveScenario?.eventLedger ||
        current.config !== previous.config
      ) {
        // Clear simulation results when core data changes
        useAppStore.getState().setSimulationPayload(null);
      }
    },
    { 
      equalityFn: (a, b) => 
        a.scenarios === b.scenarios && 
        a.activeScenarioId === b.activeScenarioId && 
        a.config === b.config 
    }
  );
};