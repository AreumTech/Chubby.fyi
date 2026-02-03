/**
 * Main Thread WASM Loader
 *
 * Loads the WASM module in the main thread to enable access to UI-optimized
 * simulation functions that generate complete chart data.
 */

import { logger } from '@/utils/logger';
import { loadFinancialConfigData } from './wasmWorkerPool';

let wasmLoaded = false;
let wasmLoading = false;
let goInstance: any = null; // Keep reference to prevent garbage collection

/**
 * Load WASM module in the main thread
 * This enables access to runSimulationWithUIPayload function
 */
export async function loadMainThreadWASM(): Promise<boolean> {
  if (wasmLoaded) {
    logger.dataLog('Main thread WASM already loaded');
    return true;
  }

  if (wasmLoading) {
    logger.dataLog('Main thread WASM already loading, waiting...');
    // Wait for the existing load to complete
    let attempts = 0;
    while (wasmLoading && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return wasmLoaded;
  }

  wasmLoading = true;
  logger.dataLog('🔧 Loading WASM module in main thread...');

  try {
    // Check if wasm_exec.js Go runtime is loaded
    if (typeof (window as any).Go === 'undefined') {
      // Load wasm_exec.js
      const script = document.createElement('script');
      script.src = '/wasm_exec.js';
      document.head.appendChild(script);

      // Wait for script to load
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      logger.dataLog('✅ Loaded wasm_exec.js Go runtime');
    }

    // Initialize Go runtime and keep global reference
    goInstance = new (window as any).Go();

    // Load and instantiate WASM module
    logger.dataLog('📦 Fetching pathfinder.wasm...');
    const response = await fetch('/pathfinder.wasm');
    const wasmBytes = await response.arrayBuffer();

    logger.dataLog('⚙️  Instantiating WASM module...');
    const result = await WebAssembly.instantiate(wasmBytes, goInstance.importObject);

    // Run the Go program (this registers all exported functions)
    // CRITICAL: The program must stay running (it has select{} at the end)
    // Don't await this - let it run in background
    logger.dataLog('🚀 Running Go WASM program...');
    goInstance.run(result.instance).catch((err: any) => {
      // Only log if it's not the normal "program exited" message
      if (err && !err.message?.includes('exit code 0')) {
        logger.error('❌ Go WASM program error:', 'WASM', err);
      }
    });

    // Give the Go program a moment to initialize and register functions
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the function is available
    if (typeof (window as any).runSimulationWithUIPayload === 'function') {
      logger.dataLog('✅ runSimulationWithUIPayload function is available');

      // Load financial configuration data
      logger.dataLog('📊 Loading financial configuration data...');
      const rawConfigData = await loadFinancialConfigData();

      // Convert to format expected by WASM (stringified JSON values)
      // CRITICAL: Key names must EXACTLY match what Go expects in main.go loadConfigurationDataJS
      const configData = {
        tax_brackets_2024: JSON.stringify(rawConfigData.taxBrackets),
        rmd_table: JSON.stringify(rawConfigData.rmdTable),  // FIX: Go expects "rmd_table" not "rmd_table_2024"
        contribution_limits_2024: JSON.stringify(rawConfigData.contributionLimits),  // FIX: Go expects "contribution_limits_2024" not "2025"
        fica_tax: JSON.stringify(rawConfigData.ficaTax),  // FIX: Go expects "fica_tax" not "fica_rates"
        state_tax_brackets: JSON.stringify(rawConfigData.stateTax),
        irmaa_brackets: JSON.stringify(rawConfigData.irmaa),  // FIX: Go expects "irmaa_brackets" not "irmaa_brackets_2024"
        asset_returns: JSON.stringify(rawConfigData.assetReturns),
        // CRITICAL: Use discrete monthly real estate dataset (production), not placeholder annual
        monthly_real_estate: JSON.stringify(rawConfigData.monthlyRealEstate),
        dividend_model: JSON.stringify(rawConfigData.dividendModel),  // FIX: Go expects "dividend_model" not "dividend_model_data"
        defaults: JSON.stringify(rawConfigData.defaults)  // CRITICAL: Centralized defaults configuration
      };

      // Load configuration into WASM
      if (typeof (window as any).loadConfigurationData === 'function') {
        const loadResult = (window as any).loadConfigurationData(configData);
        if (loadResult && loadResult.success) {
          logger.dataLog('✅ Financial configuration loaded into WASM');
        } else {
          logger.error('❌ Failed to load configuration into WASM:', 'WASM', loadResult);
          return false;
        }
      } else {
        logger.error('❌ loadConfigurationData function not found', 'WASM');
        return false;
      }

      // Optional: sanity-check config state if helper is available
      try {
        const check = (window as any).checkConfigState ? (window as any).checkConfigState() : null;
        if (check) {
          logger.dataLog(`Config state: ${JSON.stringify(check)}`);
        }
      } catch {
        // no-op
      }

      wasmLoaded = true;
      logger.dataLog('✅ Main thread WASM fully initialized with configuration!');
      return true;
    } else {
      logger.error('❌ WASM loaded but runSimulationWithUIPayload not found', 'WASM');
      return false;
    }

  } catch (error) {
    logger.error('❌ Failed to load main thread WASM:', 'WASM', error);
    return false;
  } finally {
    wasmLoading = false;
  }
}

/**
 * Check if main thread WASM is loaded and still running
 */
export function isMainThreadWASMLoaded(): boolean {
  return wasmLoaded &&
         typeof (window as any).runSimulationWithUIPayload === 'function' &&
         goInstance !== null;
}

/**
 * Reset WASM state to allow reloading
 */
export function resetWASM(): void {
  wasmLoaded = false;
  wasmLoading = false;
  goInstance = null;
  logger.dataLog('WASM state reset');
}

/**
 * Get the WASM function if available
 */
export function getWASMUIPayloadFunction(): Function | null {
  if (isMainThreadWASMLoaded()) {
    return (window as any).runSimulationWithUIPayload;
  }
  return null;
}
