/**
 * Simulation Service - HTTP Server
 *
 * Pure simulation HTTP service that runs WASM and returns packets.
 *
 * Architecture:
 *   MCP Server → HTTP POST /simulate → This Service → WASM → SimulationPayload
 *
 * This service:
 * - Loads WASM on startup
 * - Exposes POST /simulate endpoint
 * - Transforms Bronze params → SimulationInput
 * - Calls WASM runSimulationWithUIPayload
 * - Wraps result as packet-like response
 *
 * @module server
 */

import express from 'express';
import { initWASM, isWASMReady } from './loader.js';
import { bronzeParamsToSimulationInput, extractBronzeParams } from './adapter.js';
import { extractMCFromPayload } from './mcExtractor.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const tierPolicy = require('./tierPolicy.json');

const app = express();

// CORS middleware for widget test harness
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// WASM functions reference (set after initialization)
let wasmFunctions = null;
let initError = null;

/**
 * Transform DeterministicResults to annual snapshots for 'annual' verbosity
 * @param {Object} deterministicResult - Full deterministic simulation result
 * @param {number} startYear - Simulation start year
 * @param {number} startAge - Starting age
 * @returns {Array} Annual snapshots
 */
function extractAnnualSnapshots(deterministicResult, startYear, startAge) {
  const yearlyData = deterministicResult.yearlyData || deterministicResult.YearlyData || [];
  return yearlyData.map((year, index) => {
    // Calculate return percentage from investment growth and start value
    const startVal = year.startNetWorth || year.StartNetWorth || 0;
    const growth = year.investmentGrowth || year.InvestmentGrowth || 0;
    const returnPct = startVal > 0 ? (growth / startVal) * 100 : 0;

    return {
      year: year.year || (startYear + index),
      age: year.age || (startAge + index),
      startBalance: year.startNetWorth || year.StartNetWorth || 0,
      endBalance: year.endNetWorth || year.EndNetWorth || 0,
      totalIncome: year.totalIncome || year.TotalIncome || 0,
      totalExpenses: year.totalExpenses || year.TotalExpenses || 0,
      contributions: year.totalContributions || year.TotalContributions || 0,
      withdrawals: year.totalWithdrawals || year.TotalWithdrawals || 0,
      investmentGrowth: growth,
      returnPct: Math.round(returnPct * 10) / 10, // Round to 1 decimal
    };
  });
}

/**
 * Transform DeterministicResults to trace data for 'trace' verbosity
 * @param {Object} deterministicResult - Full deterministic simulation result
 * @param {number} seed - The seed used for this path
 * @returns {Object} Trace data
 */
function extractTraceData(deterministicResult, seed) {
  // Use monthlySnapshots for month-by-month data
  const monthlySnapshots = deterministicResult.monthlySnapshots ||
    deterministicResult.MonthlySnapshots || [];
  const eventTrace = deterministicResult.eventTrace ||
    deterministicResult.EventTrace || [];
  // RealizedPathVariables contains market returns per month
  const realizedVars = deterministicResult.realizedPathVariables ||
    deterministicResult.RealizedPathVariables || [];

  // Transform monthly snapshots
  const months = monthlySnapshots.map((state) => ({
    month: state.monthOffset ?? state.MonthOffset ?? 0,
    year: state.calendarYear || state.CalendarYear || 0,
    calendarMonth: state.calendarMonth || state.CalendarMonth || 0,
    age: state.age || state.Age || 0,
    netWorth: state.netWorth || state.NetWorth || 0,
    cash: state.cashBalance || state.CashBalance || 0,
    taxable: state.taxableBalance || state.TaxableBalance || 0,
    taxDeferred: state.taxDeferredBalance || state.TaxDeferredBalance || 0,
    roth: state.rothBalance || state.RothBalance || 0,
    income: state.incomeThisMonth || state.IncomeThisMonth || 0,
    expenses: state.expensesThisMonth || state.ExpensesThisMonth || 0,
    eventIds: state.eventIds || state.EventIds || [],
  }));

  // Transform event trace
  const events = eventTrace.map((entry) => ({
    month: entry.monthOffset ?? entry.MonthOffset ?? 0,
    id: entry.eventId || entry.EventId || '',
    name: entry.eventName || entry.EventName || '',
    type: entry.eventType || entry.EventType || '',
    amount: entry.amount || entry.Amount || 0,
    description: entry.description || entry.Description || '',
    netWorthBefore: entry.netWorthBefore || entry.NetWorthBefore || 0,
    netWorthAfter: entry.netWorthAfter || entry.NetWorthAfter || 0,
    cashBefore: entry.cashBefore || entry.CashBefore || 0,
    cashAfter: entry.cashAfter || entry.CashAfter || 0,
  }));

  // Transform market returns (RealizedMonthVariables)
  // Note: Go uses bndReturn (not bondReturn)
  const marketReturns = realizedVars.map((vars) => ({
    month: vars.monthOffset ?? vars.MonthOffset ?? 0,
    monthString: vars.month || vars.Month || '', // YYYY-MM format
    spyReturn: vars.spyReturn ?? vars.SPYReturn ?? 0,
    bondReturn: vars.bndReturn ?? vars.BNDReturn ?? 0, // Map bndReturn → bondReturn for API consistency
    intlReturn: vars.intlReturn ?? vars.IntlReturn ?? 0,
    inflation: vars.inflation ?? vars.Inflation ?? 0,
    homeValueGrowth: vars.homeValueGrowth ?? vars.HomeValueGrowth ?? 0,
    weightedReturn: vars.weightedReturn ?? vars.WeightedReturn ?? 0,
  }));

  return {
    months,
    events,
    marketReturns,
    monthCount: months.length,
    eventCount: events.length,
    simulationMode: deterministicResult.simulationMode || 'stochastic',
    seed: deterministicResult.seed || seed,
    finalNetWorth: deterministicResult.finalNetWorth || 0,
  };
}

/**
 * Extract first-month events for each displayed year (lightweight "show the math")
 * Returns a map of age → array of events for month 1 of that year
 *
 * @param {Object} deterministicResult - Full deterministic simulation result
 * @param {number} startYear - Simulation start year
 * @param {number} currentAge - User's current age
 * @returns {Object} Map of age → first month events
 */
function extractFirstMonthEvents(deterministicResult, startYear, currentAge) {
  const eventTrace = deterministicResult.eventTrace ||
    deterministicResult.EventTrace || [];

  if (!eventTrace || eventTrace.length === 0) {
    return {};
  }

  // Group events by year — prefer January (month 0), fallback to first available month
  const eventsByAge = {};
  const fallbackByAge = {}; // first available month's events when January is missing

  for (const entry of eventTrace) {
    const monthOffset = entry.monthOffset ?? entry.MonthOffset ?? 0;
    const yearOffset = Math.floor(monthOffset / 12);
    const monthInYear = monthOffset % 12;
    const age = currentAge + yearOffset;

    const evt = {
      n: entry.eventName || entry.EventName || '',           // name
      t: entry.eventType || entry.EventType || '',           // type
      d: Math.round(entry.amount || entry.Amount || 0),      // delta amount
      cb: Math.round(entry.cashBefore || entry.CashBefore || 0),   // cash before
      ca: Math.round(entry.cashAfter || entry.CashAfter || 0),     // cash after
    };

    if (monthInYear === 0) {
      // January event — primary
      if (!eventsByAge[age]) eventsByAge[age] = [];
      eventsByAge[age].push(evt);
    } else if (!fallbackByAge[age]) {
      // First non-January event for this year — fallback
      fallbackByAge[age] = { month: monthInYear, events: [evt] };
    } else if (fallbackByAge[age].month === monthInYear) {
      // Same month as existing fallback — accumulate
      fallbackByAge[age].events.push(evt);
    }
  }

  // Fill gaps: for any age with no January events, use fallback
  for (const age of Object.keys(fallbackByAge)) {
    if (!eventsByAge[age]) {
      eventsByAge[age] = fallbackByAge[age].events;
    }
  }

  return eventsByAge;
}

// =============================================================================
// WASM Initialization (runs on startup)
// =============================================================================

async function startServer() {
  console.error('🚀 Simulation Service starting...');
  console.error('');

  try {
    console.error('🔧 Initializing WASM engine...');
    wasmFunctions = await initWASM();
    console.error('');
    console.error('✅ WASM engine ready');
    console.error('');
  } catch (err) {
    console.error('');
    console.error('❌ WASM initialization failed:', err.message);
    console.error('');
    console.error('Stack:', err.stack);
    initError = err;
    // Don't exit - server can still respond with errors
  }

  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.error(`🌐 Simulation service listening on http://localhost:${PORT}`);
    console.error('');
    console.error('Endpoints:');
    console.error(`  GET  http://localhost:${PORT}/health`);
    console.error(`  POST http://localhost:${PORT}/simulate`);
    console.error('');
  });
}

// =============================================================================
// Health Check Endpoint
// =============================================================================

app.get('/health', (req, res) => {
  const status = {
    status: wasmFunctions ? 'ok' : 'degraded',
    wasmLoaded: !!wasmFunctions,
    wasmReady: isWASMReady(),
    timestamp: new Date().toISOString(),
  };

  if (initError) {
    status.status = 'error';
    status.error = initError.message;
  }

  const httpStatus = wasmFunctions ? 200 : 503;
  res.status(httpStatus).json(status);
});

// =============================================================================
// Main Simulation Endpoint
// =============================================================================

app.post('/simulate', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check WASM availability
    if (!wasmFunctions) {
      return res.status(503).json({
        success: false,
        error: 'WASM not initialized',
        details: initError?.message || 'Service starting up',
        code: 'SERVICE_UNAVAILABLE',
      });
    }

    // Extract and validate request
    const { packetBuildRequest } = req.body;

    if (!packetBuildRequest) {
      return res.status(400).json({
        success: false,
        error: 'Missing packetBuildRequest in request body',
        code: 'MISSING_INPUT',
      });
    }

    const {
      seed,
      startYear,
      mcPaths = 1,
      verbosity = 'annual', // Default to 'annual' for year-by-year snapshots + firstMonthEvents
      pathSeed, // Advanced: specific path to replay
      taxConfig, // MCP v3: effective rate tax configuration
    } = packetBuildRequest;

    // Validate required fields
    if (seed === undefined || seed === null) {
      return res.status(400).json({
        success: false,
        error: 'seed is required for deterministic simulation',
        code: 'MISSING_INPUT',
        details: { field: 'seed' },
      });
    }

    if (!startYear) {
      return res.status(400).json({
        success: false,
        error: 'startYear is required',
        code: 'MISSING_INPUT',
        details: { field: 'startYear' },
      });
    }

    // Extract Bronze params from confirmedChanges
    // DEBUG: Log incoming request
    console.error(`📥 Incoming packetBuildRequest keys: ${Object.keys(packetBuildRequest).join(', ')}`);
    console.error(`   confirmedChanges: ${packetBuildRequest.confirmedChanges ? packetBuildRequest.confirmedChanges.length + ' items' : 'none'}`);
    if (packetBuildRequest.confirmedChanges) {
      packetBuildRequest.confirmedChanges.forEach((c, i) => {
        console.error(`   [${i}] fieldPath=${JSON.stringify(c.fieldPath)} newValue=${c.newValue}`);
      });
    }

    const bronzeParams = extractBronzeParams(packetBuildRequest);

    console.error(`📊 Running simulation: seed=${seed}, mcPaths=${mcPaths}, verbosity=${verbosity}`);
    console.error(`   investableAssets=${bronzeParams.investableAssets}`);
    console.error(`   annualSpending=${bronzeParams.annualSpending}`);
    console.error(`   currentAge=${bronzeParams.currentAge}`);
    console.error(`   expectedIncome=${bronzeParams.expectedIncome}`);
    if (bronzeParams.taxConfig?.enabled) {
      const rate = Math.round(bronzeParams.taxConfig.effectiveRate * 100);
      console.error(`   taxConfig: ${rate}% effective rate (${bronzeParams.taxConfig.filingStatus}, ${bronzeParams.taxConfig.state})`);
    }

    // Transform to CORRECT SimulationInput shape
    const simulationInput = bronzeParamsToSimulationInput(bronzeParams);

    let mcResults = null;
    let payload = null;
    let exemplarPath = null;
    let replaySeed = pathSeed;

    // =========================================================================
    // STEP 1: Run MC (unless pathSeed provided for direct replay)
    // =========================================================================
    if (pathSeed) {
      // Direct replay mode - skip MC entirely
      console.error(`🔄 Direct replay mode: pathSeed=${pathSeed}`);
    } else {
      // Run Monte Carlo simulation
      let wasmResult;
      try {
        wasmResult = wasmFunctions.runSimulationWithUIPayload(
          JSON.stringify(simulationInput),
          mcPaths
        );
      } catch (wasmError) {
        console.error('❌ WASM execution error:', wasmError.message);
        return res.status(500).json({
          success: false,
          error: 'WASM simulation failed',
          code: 'WASM_PANIC',
          details: wasmError.message,
        });
      }

      // Parse WASM result if it's a string
      if (typeof wasmResult === 'string') {
        try {
          payload = JSON.parse(wasmResult);
        } catch (parseError) {
          console.error('❌ Failed to parse WASM result:', parseError.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to parse WASM result',
            code: 'PARSE_ERROR',
            details: parseError.message,
          });
        }
      } else {
        payload = wasmResult;
      }

      // Check for WASM-level errors
      if (payload && payload.error) {
        console.error('❌ WASM returned error:', payload.error);
        return res.status(500).json({
          success: false,
          error: payload.error,
          code: 'SIMULATION_ERROR',
        });
      }

      // Extract MC results including exemplarPath
      mcResults = payload?.mc || extractMCFromPayload(payload);
      exemplarPath = mcResults?.exemplarPath ||
        payload?.planProjection?.summary?.portfolioStats?.exemplarPath;
      replaySeed = exemplarPath?.pathSeed;

      // For summary verbosity (and no pathSeed), return now - no replay needed
      if (verbosity === 'summary') {
        const elapsed = Date.now() - startTime;
        console.error(`✅ Simulation complete in ${elapsed}ms (summary mode)`);

        return res.json({
          success: true,
          payload: payload,
          mc: mcResults,
          exemplarPath: exemplarPath,
          blockedOutputs: buildBlockedOutputs('bronze'),
          baseSeed: seed,
          pathsRun: mcPaths,
          elapsedMs: elapsed,
        });
      }
    }

    // =========================================================================
    // STEP 2: Replay path for annual/trace verbosity (or direct pathSeed replay)
    // =========================================================================
    if (!replaySeed) {
      console.error('⚠️ No seed available for replay, returning MC results only');
      const elapsed = Date.now() - startTime;
      return res.json({
        success: true,
        payload: payload,
        mc: mcResults,
        exemplarPath: exemplarPath,
        blockedOutputs: buildBlockedOutputs('bronze'),
        baseSeed: seed,
        pathsRun: mcPaths,
        elapsedMs: elapsed,
        traceNote: {
          message: 'No exemplarPath seed available for replay',
          workaround: 'Run with explicit pathSeed parameter or check MC paths > 0',
        },
      });
    }

    console.error(`🔬 Replaying path with seed=${replaySeed} for ${verbosity} verbosity`);

    // CRITICAL: Use STOCHASTIC single-path mode for replay (not deterministic)
    // MC paths use stochastic mode, so replay must use the same mode
    const replayInput = {
      ...simulationInput,
      config: {
        ...simulationInput.config,
        simulationMode: 'stochastic',
        randomSeed: replaySeed,
      },
    };
    console.error(`   Replay config: simulationMode=${replayInput.config.simulationMode}, randomSeed=${replayInput.config.randomSeed}`);

    let traceResult;
    let traceError = null;

    // Try JSON-based deterministic simulation (supports full trace)
    if (wasmFunctions.runDeterministicSimulationJSON) {
      try {
        const traceWasmResult = wasmFunctions.runDeterministicSimulationJSON(
          JSON.stringify(replayInput)
        );

        if (typeof traceWasmResult === 'string') {
          traceResult = JSON.parse(traceWasmResult);
        } else {
          traceResult = traceWasmResult;
        }

        if (!traceResult.success) {
          traceError = traceResult.error || 'Unknown trace error';
          traceResult = null;
        } else {
          // Debug: log what we got back
          console.error(`   Trace result: mode=${traceResult.simulationMode}, seed=${traceResult.seed}, realizedPathVars=${(traceResult.realizedPathVariables || []).length}`);
        }
      } catch (err) {
        console.error('⚠️ Trace replay failed:', err.message);
        traceError = err.message;
      }
    } else {
      traceError = 'runDeterministicSimulationJSON not available (WASM needs rebuild)';
    }

    const elapsed = Date.now() - startTime;
    console.error(`✅ Simulation complete in ${elapsed}ms`);

    // Build response
    const response = {
      success: true,
      payload: payload,
      mc: mcResults,
      exemplarPath: exemplarPath,
      blockedOutputs: buildBlockedOutputs('bronze'),
      baseSeed: pathSeed || seed,
      pathsRun: pathSeed ? 1 : mcPaths,
      elapsedMs: elapsed,
      replayMode: !!pathSeed,
    };

    // Add trace data if available
    if (traceResult) {
      // Debug: log trace data availability
      console.error(`📋 Trace data: yearlyData=${(traceResult.yearlyData || traceResult.YearlyData || []).length}, eventTrace=${(traceResult.eventTrace || traceResult.EventTrace || []).length}`);

      // Add annual snapshots for 'annual' or 'trace' verbosity
      if (verbosity === 'annual' || verbosity === 'trace') {
        response.annualSnapshots = extractAnnualSnapshots(
          traceResult,
          startYear,
          bronzeParams.currentAge
        );
        console.error(`   → annualSnapshots: ${response.annualSnapshots?.length || 0} entries`);

        // Add first-month events for "show the math" (lightweight trace)
        response.firstMonthEvents = extractFirstMonthEvents(
          traceResult,
          startYear,
          bronzeParams.currentAge
        );
        console.error(`   → firstMonthEvents: ${Object.keys(response.firstMonthEvents || {}).length} ages`);
      }

      // Add full trace for 'trace' verbosity
      if (verbosity === 'trace') {
        response.trace = extractTraceData(traceResult, replaySeed);
      }
    } else {
      // Include note if trace failed
      response.traceNote = {
        message: 'Trace replay failed: ' + (traceError || 'Unknown error'),
        exemplarPathSeed: replaySeed,
        workaround: 'Re-run in web app TestHarness with this seed for full trace visualization',
      };
    }

    res.json(response);
  } catch (error) {
    console.error('❌ Simulation endpoint error:', error.message);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

// MC extraction logic centralized in mcExtractor.js

/**
 * Build blocked outputs list based on tier
 * Derives from tierPolicy.json instead of hardcoding
 */
function buildBlockedOutputs(tier) {
  const tierConfig = tierPolicy.tiers[tier] || tierPolicy.tiers[tierPolicy.defaultTier];
  if (!tierConfig) {
    console.error(`Unknown tier: ${tier}, using empty blocked outputs`);
    return [];
  }
  return tierConfig.blockedOutputs || [];
}

// =============================================================================
// Error Handling
// =============================================================================

// Handle uncaught errors gracefully
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Don't exit - try to keep serving
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit - try to keep serving
});

// =============================================================================
// Start Server
// =============================================================================

startServer();
