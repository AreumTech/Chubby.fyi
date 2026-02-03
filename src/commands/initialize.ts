/**
 * Command Bus Initialization
 * 
 * This file initializes the command bus system for the application.
 * Import and call this early in your application startup (e.g., in main.tsx or App.tsx).
 */

import { initializeCommandBus } from './index';
import { logger } from '@/utils/logger';
import { wasmWorkerPool } from '@/services/wasmWorkerPool';
import { runSimulation } from '@/services/simulationService';
import { wasmSimulationEngine } from '@/services/wasmSimulation';
import { dataService } from '@/services/dataService';
import { loadMainThreadWASM } from '@/services/wasmMainThreadLoader';

/**
 * Initialize the command bus with appropriate settings for the environment
 */
export async function initializeCommandBusForApp() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const commandBus = await initializeCommandBus({
    enableLogging: isDevelopment, // Enable logging in development
    enableMetrics: false // Can be enabled for production monitoring
  });

  if (isDevelopment) {
    // Add command bus to window for debugging in development
    (window as any).commandBus = commandBus;
    logger.commandLog('Command bus initialized and available as window.commandBus');

    // Initialize and expose WASM services for debugging
    try {
      // Load main thread WASM first (for chart generation)
      const mainThreadWASMLoaded = await loadMainThreadWASM();
      if (mainThreadWASMLoaded) {
        logger.commandLog('✅ Main thread WASM loaded with chart generation support');
      } else {
        logger.warn('⚠️  Main thread WASM failed to load, falling back to worker pool');
      }

      // Then initialize worker pool
      await wasmWorkerPool.initialize();
      (window as any).wasmWorkerPool = wasmWorkerPool;
      (window as any).simulationService = { runSimulation };
      (window as any).wasmSimulationEngine = wasmSimulationEngine;

      // Add forceJsEngine function for debugging
      (window as any).forceJsEngine = (enable: boolean = true) => {
        if (enable) {
          wasmSimulationEngine.forceFallbackMode();
          logger.commandLog('Forced JavaScript fallback engine enabled');
        } else {
          wasmSimulationEngine.resetAndRetryWASM();
          logger.commandLog('Attempting to re-enable WASM engine');
        }
      };

      logger.commandLog('WASM worker pool initialized and available as window.wasmWorkerPool');
      logger.commandLog('forceJsEngine() function available for debugging');
      logger.commandLog(`Using ${wasmWorkerPool.workerCount || 0} WASM workers for parallel processing`);

      // Expose dataService for debugging
      (window as any).dataService = dataService;
      logger.commandLog('DataService exposed as window.dataService for debugging');

      // Expose useAppStore for debugging
      const { useAppStore } = await import('@/store/appStore');
      (window as any).useAppStore = useAppStore;
      logger.commandLog('useAppStore exposed as window.useAppStore for debugging');
    } catch (error) {
      logger.error('Failed to initialize WASM worker pool:', error);
    }
  }

  return commandBus;
}