/**
 * Golden Tests for MCP Simulation Determinism
 *
 * Verifies: same seed + same inputs = identical output
 * This is a critical PFOS-E requirement for reproducibility.
 *
 * Run with: npx tsx apps/mcp-server/src/__tests__/determinism.test.ts
 */

// Simple test framework for direct execution
const describe = (name: string, fn: () => void) => { console.log(`\n=== ${name} ===`); fn(); };
const it = async (name: string, fn: () => Promise<void>, _timeout?: number) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
    process.exitCode = 1;
  }
};
const expect = (actual: any) => ({
  toBe: (expected: any) => { if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`); },
  toBeTypeOf: (type: string) => { if (typeof actual !== type) throw new Error(`Expected type ${type}, got ${typeof actual}`); },
  toBeDefined: () => { if (actual === undefined) throw new Error(`Expected defined, got undefined`); },
  toBeUndefined: () => { if (actual !== undefined) throw new Error(`Expected undefined, got ${actual}`); },
  toBeGreaterThan: (expected: number) => { if (!(actual > expected)) throw new Error(`Expected ${actual} > ${expected}`); },
});
const beforeAll = async (fn: () => Promise<void>) => { await fn(); };

// Test constants
const SIMULATION_SERVICE_URL = process.env.SIMULATION_SERVICE_URL || 'http://localhost:3002';
const TEST_TIMEOUT = 120000; // 2 minutes for MC simulations

// Standard test inputs (Bronze tier)
const STANDARD_TEST_INPUT = {
  packetBuildRequest: {
    seed: 12345,
    startYear: 2026,
    mcPaths: 100,
    verbosity: 'summary',
    horizon: { startMonth: 0, endMonth: 360 },
    confirmedChanges: [
      { fieldPath: ['profile', 'investableAssets'], newValue: 300000 },
      { fieldPath: ['profile', 'annualSpending'], newValue: 50000 },
      { fieldPath: ['profile', 'currentAge'], newValue: 40 },
      { fieldPath: ['profile', 'expectedIncome'], newValue: 100000 },
    ],
  },
};

/**
 * Helper to run simulation via HTTP
 */
async function runSimulation(input: typeof STANDARD_TEST_INPUT): Promise<any> {
  const response = await fetch(`${SIMULATION_SERVICE_URL}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Simulation failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Check if simulation service is available
 */
async function isServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${SIMULATION_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe('MCP Simulation Determinism', () => {
  let serviceAvailable = false;

  beforeAll(async () => {
    serviceAvailable = await isServiceAvailable();
  });

  describe('Golden Tests', () => {
    it(
      'same seed produces identical MC results',
      async () => {
        if (!serviceAvailable) {
          console.log('Skipping: Simulation service not available');
          return;
        }

        // Run simulation twice with same seed
        const result1 = await runSimulation(STANDARD_TEST_INPUT);
        const result2 = await runSimulation(STANDARD_TEST_INPUT);

        // Both should succeed
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);

        // MC results should be identical
        expect(result1.mc.finalNetWorthP50).toBe(result2.mc.finalNetWorthP50);
        expect(result1.mc.finalNetWorthP10).toBe(result2.mc.finalNetWorthP10);
        expect(result1.mc.finalNetWorthP90).toBe(result2.mc.finalNetWorthP90);
        expect(result1.mc.everBreachProbability).toBe(result2.mc.everBreachProbability);

        // ExemplarPath should be identical
        expect(result1.exemplarPath?.pathSeed).toBe(result2.exemplarPath?.pathSeed);
        expect(result1.exemplarPath?.pathIndex).toBe(result2.exemplarPath?.pathIndex);
        expect(result1.exemplarPath?.terminalWealth).toBe(result2.exemplarPath?.terminalWealth);
      },
      TEST_TIMEOUT
    );

    it(
      'different seeds produce different results',
      async () => {
        if (!serviceAvailable) {
          console.log('Skipping: Simulation service not available');
          return;
        }

        const input1 = { ...STANDARD_TEST_INPUT };
        const input2 = {
          packetBuildRequest: {
            ...STANDARD_TEST_INPUT.packetBuildRequest,
            seed: 54321, // Different seed
          },
        };

        const result1 = await runSimulation(input1);
        const result2 = await runSimulation(input2);

        // Both should succeed
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);

        // Results should differ (with high probability)
        // Note: There's a tiny chance they could be equal, but extremely unlikely
        const resultsMatch =
          result1.mc.finalNetWorthP50 === result2.mc.finalNetWorthP50 &&
          result1.mc.finalNetWorthP10 === result2.mc.finalNetWorthP10 &&
          result1.mc.finalNetWorthP90 === result2.mc.finalNetWorthP90;

        expect(resultsMatch).toBe(false);
      },
      TEST_TIMEOUT
    );

    it(
      'exemplarPath is always returned in summary mode',
      async () => {
        if (!serviceAvailable) {
          console.log('Skipping: Simulation service not available');
          return;
        }

        const result = await runSimulation(STANDARD_TEST_INPUT);

        expect(result.success).toBe(true);
        expect(result.exemplarPath).toBeDefined();
        expect(result.exemplarPath.pathSeed).toBeTypeOf('number');
        expect(result.exemplarPath.pathIndex).toBeTypeOf('number');
        expect(result.exemplarPath.terminalWealth).toBeTypeOf('number');
        expect(result.exemplarPath.selectionCriterion).toBe('median_terminal_wealth');
      },
      TEST_TIMEOUT
    );
  });

  describe('Verbosity Levels', () => {
    it(
      'summary verbosity returns MC results without trace',
      async () => {
        if (!serviceAvailable) {
          console.log('Skipping: Simulation service not available');
          return;
        }

        const input = {
          packetBuildRequest: {
            ...STANDARD_TEST_INPUT.packetBuildRequest,
            verbosity: 'summary',
          },
        };

        const result = await runSimulation(input);

        expect(result.success).toBe(true);
        expect(result.mc).toBeDefined();
        expect(result.exemplarPath).toBeDefined();
        expect(result.annualSnapshots).toBeUndefined();
        expect(result.trace).toBeUndefined();
      },
      TEST_TIMEOUT
    );

    it(
      'annual verbosity includes annualSnapshots with year-by-year data',
      async () => {
        if (!serviceAvailable) {
          console.log('Skipping: Simulation service not available');
          return;
        }

        const input = {
          packetBuildRequest: {
            ...STANDARD_TEST_INPUT.packetBuildRequest,
            verbosity: 'annual',
          },
        };

        const result = await runSimulation(input);

        expect(result.success).toBe(true);
        expect(result.exemplarPath).toBeDefined();
        expect(result.annualSnapshots).toBeDefined();
        // Should have 30 years of data
        expect(result.annualSnapshots.length).toBe(30);
        // First year should have realistic values
        expect(result.annualSnapshots[0].startBalance).toBeGreaterThan(0);
      },
      TEST_TIMEOUT
    );

    it(
      'trace verbosity includes full month-by-month data',
      async () => {
        if (!serviceAvailable) {
          console.log('Skipping: Simulation service not available');
          return;
        }

        const input = {
          packetBuildRequest: {
            ...STANDARD_TEST_INPUT.packetBuildRequest,
            verbosity: 'trace',
            horizon: { startMonth: 0, endMonth: 120 }, // 10 years for faster test
            mcPaths: 20,
          },
        };

        const result = await runSimulation(input);

        expect(result.success).toBe(true);
        expect(result.trace).toBeDefined();
        expect(result.trace.monthCount).toBe(120);
        expect(result.trace.eventCount).toBeGreaterThan(0);
        expect(result.trace.months[0].netWorth).toBeGreaterThan(0);
      },
      TEST_TIMEOUT
    );
  });

  describe('Bug Fixes Verification', () => {
    it(
      'horizonMonths is honored (not hardcoded to 360)',
      async () => {
        if (!serviceAvailable) {
          console.log('Skipping: Simulation service not available');
          return;
        }

        // Run with 10-year horizon (120 months)
        const shortHorizonInput = {
          packetBuildRequest: {
            ...STANDARD_TEST_INPUT.packetBuildRequest,
            horizon: { startMonth: 0, endMonth: 120 },
            mcPaths: 20, // Fewer paths for speed
          },
        };

        // Run with 30-year horizon (360 months)
        const longHorizonInput = {
          packetBuildRequest: {
            ...STANDARD_TEST_INPUT.packetBuildRequest,
            horizon: { startMonth: 0, endMonth: 360 },
            mcPaths: 20,
          },
        };

        const shortResult = await runSimulation(shortHorizonInput);
        const longResult = await runSimulation(longHorizonInput);

        expect(shortResult.success).toBe(true);
        expect(longResult.success).toBe(true);

        // 30-year horizon should have significantly higher P50
        // (more time for compounding)
        expect(longResult.mc.finalNetWorthP50).toBeGreaterThan(
          shortResult.mc.finalNetWorthP50 * 2
        );
      },
      TEST_TIMEOUT
    );

    it(
      'breach probability handles 0% correctly (not false positive)',
      async () => {
        if (!serviceAvailable) {
          console.log('Skipping: Simulation service not available');
          return;
        }

        // High income, low spending = should have 0% breach
        const safeInput = {
          packetBuildRequest: {
            ...STANDARD_TEST_INPUT.packetBuildRequest,
            confirmedChanges: [
              { fieldPath: ['profile', 'investableAssets'], newValue: 1000000 },
              { fieldPath: ['profile', 'annualSpending'], newValue: 30000 },
              { fieldPath: ['profile', 'currentAge'], newValue: 40 },
              { fieldPath: ['profile', 'expectedIncome'], newValue: 200000 },
            ],
            mcPaths: 50,
          },
        };

        const result = await runSimulation(safeInput);

        expect(result.success).toBe(true);
        // Should be exactly 0, not undefined or NaN
        expect(result.mc.everBreachProbability).toBe(0);
      },
      TEST_TIMEOUT
    );
  });
});

// Run tests when executed directly with tsx
// Note: All test functions are async and check serviceAvailable internally
