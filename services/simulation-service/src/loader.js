/**
 * WASM Loader for Node.js
 *
 * Handles:
 * 1. Polyfills (MUST be first - before wasm_exec.js)
 * 2. WASM instantiation
 * 3. Financial config loading
 *
 * @module loader
 */

import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Paths relative to project root
const PROJECT_ROOT = join(__dirname, '../../..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const CONFIG_DIR = join(PUBLIC_DIR, 'config');

/**
 * Apply polyfills BEFORE loading wasm_exec.js
 * CRITICAL: These must be set on globalThis before Go runtime loads
 */
async function applyPolyfills() {
  // crypto polyfill for Node.js
  if (!globalThis.crypto) {
    const { webcrypto } = await import('crypto');
    globalThis.crypto = webcrypto;
  }

  // performance polyfill for Node.js
  if (!globalThis.performance) {
    const { performance } = await import('perf_hooks');
    globalThis.performance = performance;
  }

  // TextEncoder/TextDecoder (usually available in Node 18+, but just in case)
  if (!globalThis.TextEncoder) {
    const { TextEncoder, TextDecoder } = await import('util');
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
  }

  console.error('✅ Polyfills applied');
}

/**
 * Load wasm_exec.js (Go WASM runtime)
 * This sets up globalThis.Go constructor
 */
async function loadWasmExec() {
  const wasmExecPath = join(PUBLIC_DIR, 'wasm_exec.js');

  if (!fs.existsSync(wasmExecPath)) {
    throw new Error(`wasm_exec.js not found at: ${wasmExecPath}`);
  }

  // wasm_exec.js expects to run in global context and sets up globalThis.Go
  // We need to import it as a side-effect module
  const wasmExecCode = fs.readFileSync(wasmExecPath, 'utf8');

  // Execute in global context using Function constructor
  const fn = new Function(wasmExecCode);
  fn();

  if (!globalThis.Go) {
    throw new Error('wasm_exec.js did not set up globalThis.Go');
  }

  console.error('✅ wasm_exec.js loaded');
}

/**
 * Load financial configuration data from disk
 * CRITICAL: Key names MUST EXACTLY match Go expectations in main.go
 *
 * Key mapping (file name → WASM key):
 * - rmd_table_2024.json → rmd_table
 * - contribution_limits_2025.json → contribution_limits_2024
 */
async function loadConfigsIntoWASM() {
  // EXACT config file list from wasmMainThreadLoader.ts / wasmWorkerPool.ts
  // Key names MUST match what Go expects
  const configFiles = {
    tax_brackets_2024: 'tax_brackets_2024.json',
    rmd_table: 'rmd_table_2024.json',
    contribution_limits_2024: 'contribution_limits_2025.json',
    fica_tax: 'fica_tax_2024.json',
    state_tax_brackets: 'state_tax_brackets.json',
    irmaa_brackets: 'irmaa_brackets_2024.json',
    asset_returns: 'asset_returns_historical.json',
    monthly_real_estate: 'monthly_real_estate_data.json',
    dividend_model: 'dividend_model_data.json',
    defaults: 'defaults.json',
  };

  const configData = {};

  for (const [key, filename] of Object.entries(configFiles)) {
    const filePath = join(CONFIG_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`⚠️ Config file not found: ${filePath}`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Parse and re-stringify to ensure valid JSON
      const parsed = JSON.parse(content);
      configData[key] = JSON.stringify(parsed);
    } catch (err) {
      console.error(`❌ Failed to load config ${filename}:`, err.message);
      throw new Error(`Config load failed: ${filename}`);
    }
  }

  // Wait for WASM to expose loadConfigurationData
  if (!globalThis.loadConfigurationData) {
    throw new Error('WASM not ready: loadConfigurationData not available');
  }

  const loadResult = globalThis.loadConfigurationData(configData);

  if (!loadResult || !loadResult.success) {
    const errorMsg = loadResult?.error || 'Unknown error';
    throw new Error(`Failed to load configuration into WASM: ${errorMsg}`);
  }

  console.error('✅ Financial configuration loaded into WASM');
}

/**
 * Wait for WASM to expose required functions
 * @param {number} timeoutMs - Max time to wait
 */
function waitForWASMReady(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      // Check for the function we need
      if (globalThis.runSimulationWithUIPayload && globalThis.loadConfigurationData) {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('WASM initialization timeout - functions not exposed'));
        return;
      }

      setTimeout(check, 50);
    };

    check();
  });
}

/**
 * Initialize WASM and load configs
 *
 * @returns {Promise<{runSimulationWithUIPayload: Function}>}
 */
export async function initWASM() {
  console.error('🔧 Starting WASM initialization...');

  // Step 1: Apply polyfills FIRST
  await applyPolyfills();

  // Step 2: Load wasm_exec.js (sets up Go constructor)
  await loadWasmExec();

  // Step 3: Load and instantiate WASM
  const wasmPath = join(PUBLIC_DIR, 'pathfinder.wasm');

  if (!fs.existsSync(wasmPath)) {
    throw new Error(`pathfinder.wasm not found at: ${wasmPath}`);
  }

  console.error('📦 Loading WASM binary...');
  const wasmBytes = fs.readFileSync(wasmPath);

  const go = new globalThis.Go();
  const { instance } = await WebAssembly.instantiate(wasmBytes, go.importObject);

  console.error('🚀 Starting Go runtime...');

  // Start Go runtime (async, don't await - it runs forever with select{})
  go.run(instance).catch((err) => {
    // Go runtime exits with code 0 on normal shutdown (select{})
    // Only log actual errors
    if (!err.message?.includes('exit code 0') && !err.message?.includes('unreachable')) {
      console.error('Go WASM error:', err);
    }
  });

  // Step 4: Wait for WASM to expose functions
  console.error('⏳ Waiting for WASM functions...');
  await waitForWASMReady();

  // Step 5: Load configs BEFORE accepting requests
  console.error('📊 Loading financial configurations...');
  await loadConfigsIntoWASM();

  console.error('✅ WASM initialization complete');

  // Return UI-ready simulation function
  return {
    runSimulationWithUIPayload: globalThis.runSimulationWithUIPayload,
    runMonteCarloSimulation: globalThis.runMonteCarloSimulation,
    runDeterministicSimulation: globalThis.runDeterministicSimulation,
    // JSON-based wrapper for deterministic simulation (supports trace data in Node.js)
    runDeterministicSimulationJSON: globalThis.runDeterministicSimulationJSON,
  };
}

/**
 * Check if WASM functions are available
 */
export function isWASMReady() {
  return !!(globalThis.runSimulationWithUIPayload && globalThis.loadConfigurationData);
}
