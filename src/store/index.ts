// Consolidated store exports
export { useAppStore, initializeAppStore } from './appStore';

// Legacy compatibility exports - redirect to consolidated store
export { useModalState, usePlanData, useSimulationData, useStoreInitialization } from './storeManager';