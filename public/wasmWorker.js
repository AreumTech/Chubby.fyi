/**
 * WebWorker for WASM Simulation
 *
 * This worker runs WASM simulation instances in a separate thread
 * to avoid blocking the main UI thread.
 */

// Polyfill for global variable (needed by some WASM runtimes)
if (typeof global === 'undefined') {
  var global = globalThis;
}

// Import the Go WASM support script
importScripts('/wasm_exec.js');

// Global WASM state
let wasmModule = null;
let wasmLoaded = false;
let go = null;

// File-based logger with size limits
class FileLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100; // Keep only last 100 entries
    this.filters = ['🚨🚨🚨 EMPLOYMENT-INCOME-TEST', '🔍 [INCOME-HANDLER]', '🚨 [MONTHLY-DATA-DEBUG]'];
  }

  shouldLog(message) {
    return this.filters.some(filter => message.includes(filter));
  }

  log(level, message) {
    if (!this.shouldLog(message)) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    this.logs.push(logEntry);
    
    // Rolling log - keep only recent entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Send to main thread for file storage
    self.postMessage({
      type: 'debug_log',
      level: level,
      message: logEntry
    });
  }

  getLogs() {
    return [...this.logs];
  }
}

const fileLogger = new FileLogger();

// IMPORTANT: DO NOT override console methods in web workers!
// The Go WASM runtime uses console internally and overriding it causes SIGILL crashes.
// Instead, we wrap console methods to filter output while preserving functionality.

// Global flag to control logging - set from main thread
// Start with logging DISABLED by default for clean testing
let ENABLE_LOGGING = false; // Reduce console spam, enable only critical logs

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

// Wrap console methods to respect ENABLE_LOGGING flag
console.log = function(...args) {
  if (ENABLE_LOGGING) {
    originalConsole.log.apply(console, args);
  }
};

console.info = function(...args) {
  if (ENABLE_LOGGING) {
    originalConsole.info.apply(console, args);
  }
};

console.debug = function(...args) {
  if (ENABLE_LOGGING) {
    originalConsole.debug.apply(console, args);
  }
};

console.warn = function(...args) {
  if (ENABLE_LOGGING) {
    originalConsole.warn.apply(console, args);
  }
};

// Always allow errors to be logged
console.error = function(...args) {
  originalConsole.error.apply(console, args);
};

/**
 * Wait for WASM to signal it's ready
 */
async function waitForWASMReady(timeout = 10000) {
  const startTime = Date.now();

  while (!self.wasmReady) {
    if (Date.now() - startTime > timeout) {
      throw new Error('WASM module failed to initialize within timeout');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Initialize WASM module in the worker
 */
async function initializeWASM() {
  if (wasmLoaded) {
    // Already loaded
    return;
  }

  try {
    // Initialize Go WASM runtime
    go = new Go();

    // Load the WASM module
    // console.log('[Worker] Fetching WASM file...');
    const wasmResponse = await fetch('/pathfinder.wasm', {
      cache: self.location.hostname === 'localhost' ? 'no-cache' : 'default'
    });
    if (!wasmResponse.ok) {
      throw new Error(`Failed to fetch WASM: ${wasmResponse.status} ${wasmResponse.statusText}`);
    }

    const wasmBytes = await wasmResponse.arrayBuffer();
    const wasmInstance = await WebAssembly.instantiate(wasmBytes, go.importObject);

    // Run the Go program - catch any runtime errors
    try {
      // Start the Go runtime - it should run indefinitely
      const goRunPromise = go.run(wasmInstance.instance);
      
      // Handle Go program exit (which should never happen)
      goRunPromise.catch(err => {
        console.error('[Worker] CRITICAL: Go program exited unexpectedly:', err);
        // Reset state so we can reinitialize if needed
        wasmLoaded = false;
        wasmModule = null;
      }).then(() => {
        console.error('[Worker] CRITICAL: Go program terminated - this should not happen');
        // Reset state so we can reinitialize if needed
        wasmLoaded = false;
        wasmModule = null;
      });
      
    } catch (error) {
      console.error('[Worker] Error starting Go runtime:', error);
      throw error;
    }
    
    // Wait for WASM to signal it's ready
    await waitForWASMReady();

    // Verify exported functions are available

    // Get references to exported functions
    if (ENABLE_LOGGING) {
      originalConsole.log('[WASM-DEBUG] Available WASM functions:', Object.getOwnPropertyNames(self).filter(name => typeof self[name] === 'function' && name.includes('run')));
      originalConsole.log('[WASM-DEBUG] runSingleSimulationJSON available:', !!self.runSingleSimulationJSON);
      originalConsole.log('[WASM-DEBUG] runMonteCarloSimulationJSON available:', !!self.runMonteCarloSimulationJSON);
    }

    if (!self.runMonteCarloSimulation || !self.runSingleSimulation) {
      console.error('[WASM-ERROR] Legacy WASM exported functions not found!');
      console.error('[WASM-ERROR] Available functions:', Object.getOwnPropertyNames(self).filter(name => typeof self[name] === 'function'));
      throw new Error('Legacy WASM exported functions not found');
    }

    if (!self.runSingleSimulationJSON) {
      console.error('[WASM-ERROR] runSingleSimulationJSON function not found!');
      console.error('[WASM-ERROR] This function is required for JSON marshalling.');
      throw new Error('runSingleSimulationJSON function not found');
    }

    // DEBUG: Check what functions are actually available
    if (ENABLE_LOGGING) {
      originalConsole.log('[WORKER-INIT] Available WASM functions:');
      originalConsole.log('[WORKER-INIT] runSingleSimulationJSON:', typeof self.runSingleSimulationJSON);
      originalConsole.log('[WORKER-INIT] runMonteCarloSimulationJSON:', typeof self.runMonteCarloSimulationJSON);
      originalConsole.log('[WORKER-INIT] runSimulationWithUIPayload:', typeof self.runSimulationWithUIPayload);
    }

    // Wait a bit for all WASM functions to register
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check what functions are available
    const availableFuncs = Object.getOwnPropertyNames(self).filter(name => typeof self[name] === 'function');
    console.log('[Worker] All available functions:', availableFuncs.filter(f => f.includes('load') || f.includes('Config')));

    wasmModule = {
      runMonteCarloSimulation: self.runMonteCarloSimulation,
      runSingleSimulation: self.runSingleSimulation,
      runSingleSimulationJSON: self.runSingleSimulationJSON,
      runMonteCarloSimulationJSON: self.runMonteCarloSimulationJSON,
      runSimulationWithUIPayload: self.runSimulationWithUIPayload,
      testMathFunctions: self.testMathFunctions,
      loadConfigurationData: self.loadConfigurationData || null,
      checkConfigState: self.checkConfigState || null,
    };

    // Log what functions we actually have
    if (ENABLE_LOGGING) {
      console.log('[Worker] WASM functions available:', Object.keys(wasmModule).filter(k => typeof wasmModule[k] === 'function'));
    }

    // DEBUG: Verify wasmModule has the functions
    if (ENABLE_LOGGING) {
      originalConsole.log('[WORKER-INIT] wasmModule.runSingleSimulationJSON:', typeof wasmModule.runSingleSimulationJSON);
      originalConsole.log('[WORKER-INIT] wasmModule.runSimulationWithUIPayload:', typeof wasmModule.runSimulationWithUIPayload);
    }

    wasmLoaded = true;

  } catch (error) {
    console.error('[Worker] Failed to load WASM simulation engine:', error);
    console.error('[Worker] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`WASM loading failed: ${error.message || error}`);
  }
}

/**
 * Get default stochastic configuration
 */
function getDefaultStochasticConfig() {
  return {
    // Asset returns (annual)
    meanSpyReturn: 0.10,
    meanBondReturn: 0.04,
    meanIntlStockReturn: 0.09,
    meanInflation: 0.025,
    meanHomeValueAppreciation: 0.03,
    meanRentalIncomeGrowth: 0.025,
    
    // Volatilities (annual)
    volatilitySpy: 0.16,
    volatilityBond: 0.05,
    volatilityIntlStock: 0.18,
    volatilityInflation: 0.01,
    volatilityHomeValue: 0.08,
    volatilityRentalIncomeGrowth: 0.05,
    
    // GARCH parameters for SPY (realistic values)
    garchSpyOmega: 0.000001,
    garchSpyAlpha: 0.1,
    garchSpyBeta: 0.85,
    
    // GARCH parameters for Bond
    garchBondOmega: 0.0000005,
    garchBondAlpha: 0.05,
    garchBondBeta: 0.90,
    
    // AR(1) parameters
    ar1InflationPhi: 0.7,
    ar1HomeValuePhi: 0.8,
    ar1RentalIncomePhi: 0.6,
    
    // Correlation matrix (6x6: SPY, BND, INFL, INTL, HOME, RENT)
    correlationMatrix: [
      [1.0, -0.2, 0.1, 0.8, 0.3, 0.1],
      [-0.2, 1.0, 0.0, -0.1, 0.1, 0.0],
      [0.1, 0.0, 1.0, 0.2, 0.4, 0.3],
      [0.8, -0.1, 0.2, 1.0, 0.2, 0.1],
      [0.3, 0.1, 0.4, 0.2, 1.0, 0.2],
      [0.1, 0.0, 0.3, 0.1, 0.2, 1.0]
    ],
    
    // Fat tail parameter for Student's t-distribution
    fatTailParameter: 10.0,
    
    // Seed for reproducible randomness
    seedValue: Math.floor(Math.random() * 1000000)
  };
}


/**
 * Validate events before sending to WASM
 */
function validateEventsForWASM(events) {
  if (!Array.isArray(events)) {
    throw new Error('Events must be an array');
  }

  // Valid WASM event types - imported from centralized registry
  // Note: This mirrors /src/types/wasmEventTypes.ts to maintain sync
  const validWASMEventTypes = new Set([
    // Core SimulatorEventType values (generated_interface_types.go)
    'INCOME', 'EXPENSE', 'CONTRIBUTION', 'WITHDRAWAL', 'TRANSFER', 'ROTH_CONVERSION', 'TAX_PAYMENT', 'RMD',
    // Extended event registry types
    'RECURRING_EXPENSE', 'ONE_TIME_EXPENSE', 'SCHEDULED_CONTRIBUTION',
    // Income stream events
    'SOCIAL_SECURITY_INCOME', 'PENSION_INCOME', 'DIVIDEND_INCOME', 'ANNUITY_PAYMENT',
    // Capital gains and investment events
    'CAPITAL_GAINS_REALIZATION', 'RSU_VESTING', 'RSU_SALE',
    // Portfolio management events
    'REBALANCE_PORTFOLIO', 'TAX_LOSS_HARVESTING_SALE', 'STRATEGIC_CAPITAL_GAINS_REALIZATION',
    'TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE',
    // Healthcare and charitable events
    'HEALTHCARE_COST', 'QUALIFIED_CHARITABLE_DISTRIBUTION',
    // Cash management events
    'ADJUST_CASH_RESERVE_SELL_ASSETS', 'ADJUST_CASH_RESERVE_BUY_ASSETS',
    // Planning and monitoring events
    'GOAL_DEFINE', 'CONCENTRATION_RISK_ALERT',
    // Distribution events
    'REQUIRED_MINIMUM_DISTRIBUTION',
    // Debt and liability events
    'ONE_TIME_EVENT', 'LIABILITY_ADD', 'MORTGAGE_ORIGINATION', 'LIABILITY_PAYMENT', 'DEBT_PAYMENT',
    // Real estate events
    'REAL_ESTATE_PURCHASE', 'REAL_ESTATE_SALE',
    // Strategy configuration events
    'STRATEGY_ASSET_ALLOCATION_SET', 'STRATEGY_REBALANCING_RULE_SET',
    // Initial state events
    'INITIAL_STATE',
    // Insurance events
    'LIFE_INSURANCE_PREMIUM', 'LIFE_INSURANCE_PAYOUT',
    'DISABILITY_INSURANCE_PREMIUM', 'DISABILITY_INSURANCE_PAYOUT',
    'LONG_TERM_CARE_INSURANCE_PREMIUM', 'LONG_TERM_CARE_PAYOUT',
    // Education events
    'FIVE_TWO_NINE_CONTRIBUTION', 'FIVE_TWO_NINE_WITHDRAWAL', 'TUITION_PAYMENT',
    // Business events
    'BUSINESS_INCOME', 'QUARTERLY_ESTIMATED_TAX_PAYMENT',
    // Additional types found in WASM registry
    'ONE_TIME_EVENT', 'HEALTHCARE'
  ]);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (!event || typeof event !== 'object') {
      throw new Error(`Event at index ${i} is not a valid object`);
    }

    if (!event.type) {
      throw new Error(`Event at index ${i} missing required 'type' field`);
    }

    if (!validWASMEventTypes.has(event.type)) {
      throw new Error(`Event at index ${i} has invalid type '${event.type}'. Valid types: ${Array.from(validWASMEventTypes).join(', ')}`);
    }

    // Validate amount field for financial events
    if (event.amount !== undefined && (typeof event.amount !== 'number' || isNaN(event.amount))) {
      throw new Error(`Event at index ${i} has invalid amount: ${event.amount}`);
    }
  }
}

/**
 * Run a single simulation path
 */
async function runSingleSimulation(input) {
  // OPTIMIZED: Only initialize WASM once per worker for better performance and stability
  // WASM instances are stateless for our Monte Carlo simulations
  if (!wasmLoaded || !wasmModule) {
    await initializeWASM();
  }

  if (!wasmModule) {
    throw new Error('WASM module not loaded');
  }

  // Input validation happens below

  // Validate input structure
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid simulation input: must be an object');
  }

  if (!input.events) {
    throw new Error('Invalid simulation input: missing events array');
  }

  // Validate events before processing
  try {
    validateEventsForWASM(input.events);
  } catch (validationError) {
    console.error('[Worker] Event validation failed:', validationError);
    throw new Error(`Event validation failed: ${validationError.message}`);
  }

  // Ensure config has default stochastic settings
  const simulationInput = {
    ...input,
    events: input.events, // Use events as-is (preprocessing happens in main thread)
    config: input.config || getDefaultStochasticConfig()
  };

  try {
    // Pass worker identifier to WASM function for debugging (only in dev)
    const workerDebugId = `worker_${Math.random().toString(36).substr(2, 6)}`;
    
    let result;
    try {
      // CRITICAL FIX: Pass only one argument to match Go function signature
      // The Go function runSingleSimulationJS only expects input data, not workerDebugId
      result = wasmModule.runSingleSimulation(simulationInput);

      // Log what WASM actually returns when debugging
      console.log('[Worker] WASM runSingleSimulation result:', {
        success: result?.success,
        error: result?.error,
        hasMonthlyData: !!result?.monthlyData,
        monthlyDataType: typeof result?.monthlyData,
        monthlyDataLength: result?.monthlyData?.length,
        finalNetWorth: result?.finalNetWorth,
        allKeys: Object.keys(result || {})
      });
    } catch (wasmError) {
      // Since we reinitialize for every simulation, any error is a real failure
      throw new Error(`WASM simulation failed: ${wasmError.message}`);
    }

    if (!result.success) {
      console.error('[Worker] WASM simulation returned success:false', {
        error: result.error,
        fullResult: result,
        inputSummary: {
          eventsCount: simulationInput.events?.length,
          monthsToRun: simulationInput.monthsToRun,
          hasConfig: !!simulationInput.config
        }
      });
      throw new Error(result.error || 'Simulation failed');
    }

    return {
      success: true,
      data: result.monthlyData || [],  // validation expects 'data' field as array
      monthlyData: result.monthlyData || [],  // keep for backward compatibility
      finalNetWorth: result.finalNetWorth
    };
  } catch (error) {
    console.error('[Worker] Single simulation failed:', error);
    throw error;
  }
}

/**
 * Run Monte Carlo simulation
 */
async function runMonteCarloSimulation(input, numberOfRuns) {
  await initializeWASM();

  if (!wasmModule) {
    throw new Error('WASM module not loaded');
  }

  // Ensure config has default stochastic settings
  const simulationInput = {
    ...input,
    config: input.config || getDefaultStochasticConfig()
  };

  try {
    const results = await wasmModule.runMonteCarloSimulation(simulationInput, numberOfRuns);

    if (!results.success) {
      throw new Error(results.error || 'Simulation failed');
    }

    return results;
  } catch (error) {
    console.error('[Worker] Monte Carlo simulation failed:', error);
    throw error;
  }
}

/**
 * Run a single simulation path using JSON marshalling (NEW - ROBUST)
 */
async function runSingleSimulationJSON(input) {
  await initializeWASM();

  if (!wasmModule) {
    throw new Error('WASM module not loaded');
  }

  // Check if config is loaded in WASM
  const checkConfigFunc = self.checkConfigState || globalThis.checkConfigState || checkConfigState;
  if (checkConfigFunc) {
    const configState = checkConfigFunc();
    console.log('[runSingleSimulationJSON] WASM config state:', configState);
  } else {
    console.log('[runSingleSimulationJSON] checkConfigState function not available');
  }

  // Normalize config format: handle both legacy nested { stochasticConfig: {...} } and new flattened format
  let normalizedConfig;
  if (input.config && input.config.stochasticConfig) {
    // Legacy format from test-simulation.html: { config: { stochasticConfig: {...} } }
    if (ENABLE_LOGGING) {
      originalConsole.warn('[WORKER-COMPAT] Detected legacy nested stochasticConfig format, flattening...');
    }
    normalizedConfig = input.config.stochasticConfig;
  } else if (input.config) {
    // New flattened format from main UI: { config: {...} }
    normalizedConfig = input.config;
  } else {
    // Fallback to defaults
    normalizedConfig = getDefaultStochasticConfig();
  }

  const simulationInput = {
    ...input,
    config: normalizedConfig
  };

  try {
    // ROBUST JSON MARSHALLING: Use JSON.stringify() to serialize the entire input
    const inputJSON = JSON.stringify(simulationInput);

    // Always log critical debugging info
    console.log('[runSingleSimulationJSON] Prepared input:', {
      jsonLength: inputJSON.length,
      eventsCount: simulationInput.events?.length,
      monthsToRun: simulationInput.monthsToRun,
      hasConfig: !!simulationInput.config
    });

    // DEBUG: Log the JSON being sent to WASM (first 500 chars) - FORCE OUTPUT
    // Minimal logging for production use
    if (ENABLE_LOGGING) {
      originalConsole.log('[WORKER-DEBUG] JSON length:', inputJSON.length, 'starting with:', inputJSON.substring(0, 30));
    }

    // DEBUG: Log what we're actually sending to WASM
    if (ENABLE_LOGGING) {
      originalConsole.log('[WORKER-DEBUG] About to call WASM with inputJSON type:', typeof inputJSON);
      originalConsole.log('[WORKER-DEBUG] inputJSON is string?', typeof inputJSON === 'string');
      originalConsole.log('[WORKER-DEBUG] inputJSON preview:', inputJSON.substring(0, 100));
    }

    // DEBUG: Check WASM function before calling
    if (ENABLE_LOGGING) {
      originalConsole.log('[WORKER-DEBUG] wasmModule exists:', !!wasmModule);
      originalConsole.log('[WORKER-DEBUG] runSingleSimulationJSON exists:', !!wasmModule.runSingleSimulationJSON);
      originalConsole.log('[WORKER-DEBUG] runSingleSimulationJSON type:', typeof wasmModule.runSingleSimulationJSON);
    }

    // DEBUGGING: Test calling WASM function with a simple string first
    if (ENABLE_LOGGING) {
      try {
        originalConsole.log('[WORKER-DEBUG] Testing WASM with simple string...');
        const testResult = wasmModule.runSingleSimulationJSON('{"test": true}');
        originalConsole.log('[WORKER-DEBUG] Simple string test result:', testResult);
      } catch (testError) {
        originalConsole.error('[WORKER-DEBUG] Simple string test failed:', testError);
      }
    }

    // Check what we're about to send
    console.log('[runSingleSimulationJSON] About to send to WASM:', {
      jsonLength: inputJSON.length,
      firstChars: inputJSON.substring(0, 50),
      isString: typeof inputJSON === 'string'
    });

    // Call new JSON-based WASM function
    // The function is registered on the global object, not on wasmModule
    // CRITICAL: Make sure we're passing a string, not an object
    if (typeof inputJSON !== 'string') {
      throw new Error(`Expected JSON string but got ${typeof inputJSON}`);
    }

    // Try multiple ways to find the function
    const runSimFunc = wasmModule?.runSingleSimulationJSON ||
                      self.runSingleSimulationJSON ||
                      globalThis.runSingleSimulationJSON ||
                      runSingleSimulationJSON;
    if (!runSimFunc) {
      throw new Error('runSingleSimulationJSON function not found');
    }

    // Log what we're about to pass to ensure it's a string
    console.log('[runSingleSimulationJSON] Calling WASM with string of length:', inputJSON.length);
    console.log('[runSingleSimulationJSON] Function type:', typeof runSimFunc);

    // CRITICAL FIX: The Go WASM function may be expecting the string to be passed differently
    // Try calling it with .call() to ensure proper context
    let result;
    try {
      // First attempt: Direct call with string primitive
      const jsonString = String(inputJSON);
      console.log('[runSingleSimulationJSON] Attempt 1 - Direct call with string:', jsonString.length, 'chars');
      result = runSimFunc(jsonString);
    } catch (e1) {
      console.log('[runSingleSimulationJSON] Direct call failed:', e1.message);
      try {
        // Second attempt: Call with explicit this context
        console.log('[runSingleSimulationJSON] Attempt 2 - Call with context');
        result = runSimFunc.call(null, inputJSON);
      } catch (e2) {
        console.log('[runSingleSimulationJSON] Context call failed:', e2.message);
        // Third attempt: Pass as an array (some WASM bridges expect this)
        console.log('[runSingleSimulationJSON] Attempt 3 - Pass as arguments array');
        result = runSimFunc.apply(null, [inputJSON]);
      }
    }

    // Always log the result for debugging
    console.log('[runSingleSimulationJSON] WASM result:', {
      success: result?.success,
      hasMonthlyData: !!result?.monthlyData,
      monthlyDataLength: result?.monthlyData?.length || 0,
      error: result?.error,
      allKeys: Object.keys(result || {})
    });

    if (ENABLE_LOGGING) {
      originalConsole.log('[WORKER-DEBUG] Result success:', result?.success, 'monthlyData:', !!result?.monthlyData);
    }

    if (!result.success) {
      console.error('[runSingleSimulationJSON] Simulation failed:', result.error || 'Unknown error');
      throw new Error(result.error || 'Simulation failed');
    }

    return {
      success: true,
      monthlyData: result.monthlyData,
      finalNetWorth: result.finalNetWorth
    };
  } catch (error) {
    console.error('[Worker] JSON-based single simulation failed:', error);
    throw error;
  }
}

/**
 * Run Monte Carlo simulation using JSON marshalling (NEW - ROBUST)
 */
async function runMonteCarloSimulationJSON(input, numberOfRuns) {
  await initializeWASM();

  if (!wasmModule) {
    throw new Error('WASM module not loaded');
  }

  // Normalize config format: handle both legacy nested { stochasticConfig: {...} } and new flattened format
  let normalizedConfig;
  if (input.config && input.config.stochasticConfig) {
    // Legacy format from test-simulation.html: { config: { stochasticConfig: {...} } }
    if (ENABLE_LOGGING) {
      originalConsole.warn('[WORKER-COMPAT] Detected legacy nested stochasticConfig format in Monte Carlo, flattening...');
    }
    normalizedConfig = input.config.stochasticConfig;
  } else if (input.config) {
    // New flattened format from main UI: { config: {...} }
    normalizedConfig = input.config;
  } else {
    // Fallback to defaults
    normalizedConfig = getDefaultStochasticConfig();
  }

  const simulationInput = {
    ...input,
    config: normalizedConfig
  };

  try {
    // ROBUST JSON MARSHALLING: Use JSON.stringify() to serialize the entire input
    const inputJSON = JSON.stringify(simulationInput);

    // CRITICAL: Log only essential info
    if (inputJSON.length < 100) {
      originalConsole.error('JSON TOO SHORT:', inputJSON.length, 'chars');
    }

    // Call new JSON-based WASM function
    const results = wasmModule.runMonteCarloSimulationJSON(inputJSON, numberOfRuns);

    if (!results.success) {
      throw new Error(results.error || 'Simulation failed');
    }

    return results;
  } catch (error) {
    console.error('[Worker] JSON-based Monte Carlo simulation failed:', error);
    throw error;
  }
}

/**
 * Handle messages from the main thread
 */
self.onmessage = async function(event) {
  const { id, type, payload } = event.data;

  try {
    let result;

    switch (type) {
      case 'INIT_WASM':
        await initializeWASM();
        result = { success: true, loaded: wasmLoaded };
        break;

      case 'RUN_SINGLE_SIMULATION':
        result = await runSingleSimulation(payload.input);
        break;

      case 'RUN_SINGLE_SIMULATION_JSON':
        // TEMPORARY FIX: Use legacy function that works with objects
        // The JSON version has issues with string passing to WASM
        console.log('[Worker] Using legacy runSingleSimulation instead of JSON version');
        console.log('[Worker] Input structure:', {
          hasInput: !!payload.input,
          inputType: typeof payload.input,
          hasEvents: !!payload.input?.events,
          eventsLength: payload.input?.events?.length,
          hasConfig: !!payload.input?.config,
          hasInitialAccounts: !!payload.input?.initialAccounts
        });
        try {
          result = await runSingleSimulation(payload.input);
          console.log('[Worker] Legacy simulation result:', {
            success: result?.success,
            hasMonthlyData: !!result?.monthlyData,
            monthlyDataLength: result?.monthlyData?.length,
            error: result?.error
          });
        } catch (legacyError) {
          console.error('[Worker] Legacy function error:', legacyError);
          throw legacyError;
        }
        break;

  case 'RUN_SIMULATION_WITH_UI_PAYLOAD':
    // NEW: Use complete UI payload transformer for full SimulationPayload
    result = await runSimulationWithUIPayload(payload.input, payload.numberOfRuns);
    // Normalize result shape before posting back
    try {
      if (typeof result === 'string') {
        result = JSON.parse(result);
      }
      if (result && !result.planProjection && result.PlanProjection) {
        result.planProjection = result.PlanProjection;
      }
      if (result && !result.planInputs && result.PlanInputs) {
        result.planInputs = result.PlanInputs;
      }
    } catch (_e) {
      // leave as-is; consumer may handle
    }
    break;

      case 'RUN_MONTE_CARLO_JSON':
        result = await runMonteCarloSimulationJSON(payload.input, payload.numberOfRuns);
        break;

      case 'RUN_MONTE_CARLO_BATCH_JSON':
        // Run a batch of single JSON simulations for parallel processing
        const { input: batchInput, batchSize: jsonBatchSize, startIndex: jsonStartIndex } = payload;

        let jsonBatchResults = [];
        try {
          for (let i = 0; i < jsonBatchSize; i++) {
            // Report progress periodically
            if (i % Math.max(1, Math.floor(jsonBatchSize / 10)) === 0) {
              self.postMessage({
                id,
                type: 'PROGRESS',
                payload: {
                  completed: i,
                  total: jsonBatchSize,
                  batchIndex: jsonStartIndex
                }
              });
            }

            try {
              // FIXED: Use JSON marshalling API for batch processing
              const singleResult = await runMonteCarloSimulationJSON(batchInput, 1);
              jsonBatchResults.push(singleResult);
            } catch (simError) {
              console.error(`[Worker] JSON simulation ${i+1} failed:`, simError);
              // Return a failed result to maintain array length
              jsonBatchResults.push({
                success: false,
                error: simError.message,
                finalNetWorth: 0,
                monthlyData: []
              });
            }
          }
        } catch (batchError) {
          console.error('[Worker] JSON batch processing failed:', batchError);
          throw batchError;
        }

        result = jsonBatchResults;
        break;

      case 'RUN_MONTE_CARLO_BATCH':
        // Run a batch of simulations for parallel processing
        const { input, batchSize, startIndex } = payload;
        
        let batchResults = [];
        try {
        for (let i = 0; i < batchSize; i++) {
            // Report progress periodically
          if (i % Math.max(1, Math.floor(batchSize / 10)) === 0) {
            self.postMessage({
              id,
              type: 'PROGRESS',
              payload: {
                completed: i,
                total: batchSize,
                batchIndex: startIndex
              }
            });
          }

          try {
            // PERFORMANCE: Removed debug logging from hot path
            const startTime = Date.now();
            
            // BALANCED: Reasonable timeout for simulation completion
            const simulationPromise = runSingleSimulation(input);
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error(`Simulation ${i+1} timed out after 10 seconds - likely WASM issue`));
              }, 10000); // OPTIMIZED: 10 seconds timeout after performance improvements
            });
            
            let singleResult;
            try {
              // PERFORMANCE: Removed debug logging from hot path
              singleResult = await Promise.race([simulationPromise, timeoutPromise]);
            } catch (timeoutError) {
              console.error(`🚨 [WORKER-MSG] CRITICAL: Simulation ${i+1} failed with timeout:`, timeoutError);
              // Return a failed result instead of throwing to continue batch
              singleResult = {
                success: false,
                error: timeoutError.message,
                finalNetWorth: 0,
                monthlyData: []
              };
            }
            
            batchResults.push(singleResult);
          } catch (simError) {
            console.error(`❌ [Worker] Simulation ${i+1} failed - Error type:`, typeof simError);
            console.error(`❌ [Worker] Simulation ${i+1} failed - Error constructor:`, simError?.constructor?.name);
            console.error(`❌ [Worker] Simulation ${i+1} failed - Error keys:`, Object.keys(simError || {}));
            console.error(`❌ [Worker] Simulation ${i+1} failed - Message:`, simError.message);
            console.error(`❌ [Worker] Simulation ${i+1} failed - Stack:`, simError.stack);
            console.error(`❌ [Worker] Simulation ${i+1} failed - Full:`, JSON.stringify(simError, null, 2));
            console.error(`❌ [Worker] Current batch progress: ${i}/${batchSize} simulations completed`);
            throw simError;
          }
        }

          result = batchResults;
        } catch (batchError) {
          console.error(`[WORKER-ERROR] Batch processing failed:`, batchError);
          result = [];
        }
        
        // NOTE: Do NOT clear batchResults here as it's assigned to result
        // The memory will be freed when the result is processed
        break;

      case 'TEST_MATH':
        await initializeWASM();
        if (!wasmModule) {
          throw new Error('WASM module not loaded');
        }
        result = await wasmModule.testMathFunctions();
        break;

      case 'LOAD_CONFIG':
        // Load financial configuration data into WASM
        await initializeWASM();
        if (!wasmModule) {
          throw new Error('WASM module not loaded');
        }
        // The WASM registers loadConfigurationData on the global object
        // In a worker, we need to check both self and globalThis
        const loadConfigFunc = wasmModule.loadConfigurationData || self.loadConfigurationData || globalThis.loadConfigurationData;
        if (!loadConfigFunc) {
          console.warn('[Worker] loadConfigurationData not found, config loading may be handled differently');
          // Return success to continue initialization
          result = { success: true, message: 'Config loading skipped - function not available' };
        } else {
          console.log('[Worker] Calling loadConfigurationData with', Object.keys(payload || {}));
          result = loadConfigFunc(payload);
          console.log('[Worker] loadConfigurationData result:', result);
        }
        break;

      case 'SET_LOGGING':
        // Control logging from main thread
        ENABLE_LOGGING = payload.enabled || false;
        result = { success: true, loggingEnabled: ENABLE_LOGGING };
        break;

      case 'SET_SIMULATION_VERBOSITY':
        // Set WASM simulation verbosity level (0-3)
        if (typeof payload.level !== 'number' || payload.level < 0 || payload.level > 3) {
          throw new Error('Invalid verbosity level. Must be 0-3.');
        }

        // Enable worker logging when verbosity < 3 (not PATH-only mode)
        ENABLE_LOGGING = payload.level < 3;

        // Debug: Log the change
        console.log(`[Worker] Setting simulation verbosity to ${payload.level}, ENABLE_LOGGING=${ENABLE_LOGGING}`);

        // Call WASM function to set verbosity
        if (self.setSimulationVerbosity) {
          const wasmResult = self.setSimulationVerbosity(payload.level);
          console.log(`[Worker] WASM setSimulationVerbosity result:`, wasmResult);
          result = {
            success: true,
            level: payload.level,
            workerLogging: ENABLE_LOGGING,
            wasmResult: wasmResult
          };
        } else {
          console.error('[Worker] WASM setSimulationVerbosity function not available!');
          result = {
            success: false,
            error: 'WASM setSimulationVerbosity function not available'
          };
        }
        break;

      case 'GET_SIMULATION_VERBOSITY':
        // Get current WASM simulation verbosity level
        if (self.getSimulationVerbosity) {
          const verbosity = self.getSimulationVerbosity();
          result = {
            success: true,
            verbosity: verbosity,
            workerLogging: ENABLE_LOGGING
          };
        } else {
          result = {
            success: false,
            error: 'WASM getSimulationVerbosity function not available'
          };
        }
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    // Send success response
    self.postMessage({
      id,
      type: 'SUCCESS',
      payload: result
    });

  } catch (error) {
    console.error('[Worker] Error processing message:', error.message || error);
    console.error('[Worker] Error stack:', error.stack);

    // Send error response
    self.postMessage({
      id,
      type: 'ERROR',
      payload: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};

// Handle worker errors
self.onerror = function(error) {
  console.error('[Worker] Unhandled error:', error);
  self.postMessage({
    type: 'ERROR',
    payload: {
      message: `Worker error: ${error.message}`,
      filename: error.filename,
      lineno: error.lineno
    }
  });
};

// Handle worker termination for cleanup
self.addEventListener('beforeunload', function() {
  // Clean up WASM module
  if (wasmModule) {
    wasmModule = null;
  }

  // Clean up Go runtime
  if (go) {
    go = null;
  }

  wasmLoaded = false;
});

// Cleanup function for manual termination
function cleanup() {
  // Clear any pending timeouts or intervals
  const highestTimeoutId = setTimeout(() => {});
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }

  // Clean up WASM references
  wasmModule = null;
  go = null;
  wasmLoaded = false;

  // Clear global references
  if (self.runMonteCarloSimulation) {
    self.runMonteCarloSimulation = null;
  }
  if (self.runSingleSimulation) {
    self.runSingleSimulation = null;
  }
  if (self.runSingleSimulationJSON) {
    self.runSingleSimulationJSON = null;
  }
  if (self.runMonteCarloSimulationJSON) {
    self.runMonteCarloSimulationJSON = null;
  }
  if (self.testMathFunctions) {
    self.testMathFunctions = null;
  }
  if (self.wasmReady) {
    self.wasmReady = false;
  }
}

// Listen for cleanup message
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEANUP') {
    cleanup();
    self.postMessage({
      id: event.data.id,
      type: 'SUCCESS',
      payload: { cleaned: true }
    });
  }
});

// NEW: Run simulation with complete UI payload transformer
async function runSimulationWithUIPayload(input, numberOfRuns) {
  // OPTIMIZED: Only initialize WASM once per worker for better performance and stability
  if (!wasmLoaded || !wasmModule) {
    await initializeWASM();
  }

  if (!wasmModule) {
    throw new Error('WASM module not loaded');
  }

  // Call the UI payload transformer function directly from WASM module
  if (!wasmModule.runSimulationWithUIPayload) {
    throw new Error('runSimulationWithUIPayload function not available in WASM module');
  }

  try {
    // Convert input to the format expected by WASM UI payload transformer
    const wasmInput = JSON.stringify(input);
    let result = wasmModule.runSimulationWithUIPayload(wasmInput, numberOfRuns || 1);

    // FIX #1: Normalize result BEFORE validation (WASM returns PascalCase, UI expects camelCase)
    try {
      // Parse if string
      if (typeof result === 'string') {
        result = JSON.parse(result);
      }

      // Force plain-object conversion to break any proxy references
      result = JSON.parse(JSON.stringify(result));

      // Map PascalCase to camelCase
      if (result && !result.planProjection && result.PlanProjection) {
        result.planProjection = result.PlanProjection;
      }
      if (result && !result.planInputs && result.PlanInputs) {
        result.planInputs = result.PlanInputs;
      }

      // Log keys for debugging (one-time)
      if (ENABLE_LOGGING) {
        originalConsole.log('[Worker] UI Payload keys after normalization:', Object.keys(result || {}));
        originalConsole.log('[Worker] Has planProjection:', !!result?.planProjection);
      }
    } catch (normError) {
      console.error('[Worker] Normalization error:', normError);
      // Continue with original result if normalization fails
    }

    // Validate structure (allow empty content - UI can handle gracefully)
    if (!result || typeof result !== 'object') {
      console.error('[Worker] Invalid result type from UI payload transformer:', typeof result);
      throw new Error('Invalid result from UI payload transformer - not an object');
    }

    if (!result.planProjection || typeof result.planProjection !== 'object') {
      console.error('[Worker] Missing or invalid planProjection:', result);
      console.error('[Worker] Available keys:', Object.keys(result || {}));
      throw new Error('Invalid result from UI payload transformer - missing or invalid planProjection');
    }

    // Valid structure found - return it (UI can handle empty content gracefully)
    // The UI payload transformer returns a SimulationPayload directly, not wrapped in success envelope
    return result;
  } catch (error) {
    console.error('[Worker] UI payload simulation failed:', error);
    throw error;
  }
}

// Worker initialized
