/**
 * MC Results Extractor
 *
 * Centralized logic for extracting Monte Carlo results from WASM payloads.
 * This module ensures consistent field naming and structure across:
 *   - Simulation service HTTP response
 *   - MCP server tool responses
 *   - Future Workers deployment
 *
 * WASM returns results in planProjection.summary.portfolioStats with
 * different field names than the MCP-expected format. This module
 * handles the mapping.
 *
 * ## Display Policy (v2)
 *
 * - Default output: P10/P50/P75 only (planning-relevant range)
 * - P90/P95 kept internally for trace/audit but not surfaced by default
 * - The MCP layer handles what to show; this module extracts all percentiles
 *
 * @module mcExtractor
 */

/**
 * Standard MC result field names (MCP/API convention)
 * @typedef {Object} MCResults
 * @property {number} everBreachProbability - Probability of running out of money
 * @property {number} finalNetWorthP5 - 5th percentile final value
 * @property {number} finalNetWorthP10 - 10th percentile final value
 * @property {number} finalNetWorthP25 - 25th percentile final value
 * @property {number} finalNetWorthP50 - 50th percentile (median) final value
 * @property {number} finalNetWorthP75 - 75th percentile final value
 * @property {number} finalNetWorthP90 - 90th percentile final value
 * @property {number} finalNetWorthP95 - 95th percentile final value
 * @property {number} successRate - Percentage of paths that didn't breach
 * @property {number} [minCashP5] - 5th percentile minimum cash
 * @property {number} [minCashP50] - Median minimum cash
 * @property {number} [minCashP95] - 95th percentile minimum cash
 * @property {number} [runwayP5] - 5th percentile runway in months
 * @property {number} [runwayP50] - Median runway in months
 * @property {number} [runwayP95] - 95th percentile runway in months
 * @property {Array} [netWorthTrajectory] - Percentile bands over time (P10/P50/P75 at each year)
 */

/**
 * Field mapping from WASM portfolioStats to MCP convention
 * Key = MCP field name, Value = WASM field name
 */
const FIELD_MAPPING = {
  finalNetWorthP5: 'p5FinalValue',
  finalNetWorthP10: 'p10FinalValue',
  finalNetWorthP25: 'p25FinalValue',
  finalNetWorthP50: 'p50FinalValue',
  finalNetWorthP75: 'p75FinalValue',
  finalNetWorthP90: 'p90FinalValue',
  finalNetWorthP95: 'p95FinalValue',
  // These map 1:1
  minCashP5: 'minCashP5',
  minCashP50: 'minCashP50',
  minCashP95: 'minCashP95',
  runwayP5: 'runwayP5',
  runwayP50: 'runwayP50',
  runwayP95: 'runwayP95',
  successRate: 'successRate',
};

/**
 * Extract MC results from WASM portfolioStats format
 * Maps WASM field names to MCP-standard names
 *
 * @param {Object} portfolioStats - Raw portfolioStats from WASM
 * @returns {MCResults} Standardized MC results
 */
function mapPortfolioStatsToMC(portfolioStats) {
  const result = {
    // Derived field: breach probability is inverse of success rate
    // IMPORTANT: Use ?? not || because successRate=0 is valid (0 || 1 = 1, but 0 ?? 1 = 0)
    everBreachProbability: 1 - (portfolioStats.successRate ?? 1),
  };

  // Map all fields using the mapping table
  for (const [mcField, wasmField] of Object.entries(FIELD_MAPPING)) {
    if (portfolioStats[wasmField] !== undefined) {
      result[mcField] = portfolioStats[wasmField];
    }
  }

  // Pass through exemplarPath for trace/replay support
  // This enables "show me that path again" without re-running MC
  if (portfolioStats.exemplarPath) {
    result.exemplarPath = portfolioStats.exemplarPath;
  }

  // Pass through netWorthTrajectory for widget trajectory bars
  // This is the percentile bands over time (P10/P50/P75 at each year)
  if (portfolioStats.netWorthTrajectory) {
    result.netWorthTrajectory = portfolioStats.netWorthTrajectory;
  }

  return result;
}

/**
 * Extract MC results from various WASM payload formats
 *
 * Handles multiple payload structures:
 * 1. Direct mc field: payload.mc
 * 2. monteCarloResults field: payload.monteCarloResults
 * 3. Raw MC results: payload.everBreachProbability exists
 * 4. Nested in planProjection: payload.planProjection.summary.portfolioStats
 *
 * @param {Object} payload - WASM output payload
 * @returns {MCResults|null} Extracted MC results or null if not found
 */
export function extractMCFromPayload(payload) {
  if (!payload) return null;

  // Case 1: Direct mc field (already mapped)
  if (payload.mc) {
    return payload.mc;
  }

  // Case 2: monteCarloResults field
  if (payload.monteCarloResults) {
    return payload.monteCarloResults;
  }

  // Case 3: Payload itself looks like MC results
  if (payload.everBreachProbability !== undefined) {
    return payload;
  }

  // Case 4: Nested in planProjection (standard WASM output)
  const portfolioStats = payload?.planProjection?.summary?.portfolioStats;
  if (portfolioStats) {
    return mapPortfolioStatsToMC(portfolioStats);
  }

  return null;
}

/**
 * Validate MC results have required fields
 *
 * @param {MCResults} mc - MC results to validate
 * @returns {{valid: boolean, missing: string[]}} Validation result
 */
export function validateMCResults(mc) {
  const required = [
    'everBreachProbability',
    'finalNetWorthP50',
    'successRate',
  ];

  const missing = required.filter((field) => mc[field] === undefined);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Create empty/default MC results for error cases
 * All percentiles set to 0, success rate to 0
 *
 * @returns {MCResults} Empty MC results
 */
export function emptyMCResults() {
  return {
    everBreachProbability: 1,
    finalNetWorthP5: 0,
    finalNetWorthP10: 0,
    finalNetWorthP25: 0,
    finalNetWorthP50: 0,
    finalNetWorthP75: 0,
    finalNetWorthP90: 0,
    finalNetWorthP95: 0,
    successRate: 0,
    minCashP5: 0,
    minCashP50: 0,
    minCashP95: 0,
  };
}
