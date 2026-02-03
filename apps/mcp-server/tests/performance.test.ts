/**
 * Performance Tests for MCP Simulation Service
 *
 * Measures simulation latency across different configurations:
 * - Different MC path counts (10, 50, 100, 500, 1000)
 * - Different verbosity levels (summary, annual, trace)
 * - Different horizon lengths
 *
 * Run with: npx tsx apps/mcp-server/tests/performance.test.ts
 *
 * Environment variables:
 *   SIMULATION_SERVICE_URL - Override service URL (default: http://localhost:3002)
 *   PERF_ITERATIONS - Number of iterations per test (default: 5)
 *   PERF_WARMUP - Number of warmup runs before timing (default: 1)
 */

// Test configuration
const SIMULATION_SERVICE_URL = process.env.SIMULATION_SERVICE_URL || 'http://localhost:3002';
const ITERATIONS = parseInt(process.env.PERF_ITERATIONS || '5', 10);
const WARMUP_RUNS = parseInt(process.env.PERF_WARMUP || '1', 10);

// Standard test inputs (Bronze tier)
const BASE_INPUT = {
  packetBuildRequest: {
    seed: 12345,
    startYear: 2026,
    mcPaths: 100,
    verbosity: 'summary' as const,
    horizon: { startMonth: 0, endMonth: 360 },
    confirmedChanges: [
      { fieldPath: ['profile', 'investableAssets'], newValue: 300000 },
      { fieldPath: ['profile', 'annualSpending'], newValue: 50000 },
      { fieldPath: ['profile', 'currentAge'], newValue: 40 },
      { fieldPath: ['profile', 'expectedIncome'], newValue: 100000 },
    ],
  },
};

interface PerformanceResult {
  name: string;
  iterations: number;
  timings: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  stdDev: number;
}

/**
 * Calculate statistics from timing array
 */
function calculateStats(timings: number[]): Omit<PerformanceResult, 'name' | 'iterations' | 'timings'> {
  const sorted = [...timings].sort((a, b) => a - b);
  const sum = timings.reduce((a, b) => a + b, 0);
  const mean = sum / timings.length;
  const variance = timings.reduce((acc, t) => acc + Math.pow(t - mean, 2), 0) / timings.length;

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean),
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    stdDev: Math.round(Math.sqrt(variance)),
  };
}

/**
 * Format milliseconds for display
 */
function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Run simulation and return timing
 */
async function runSimulation(input: typeof BASE_INPUT): Promise<{ timing: number; success: boolean }> {
  const start = performance.now();

  try {
    const response = await fetch(`${SIMULATION_SERVICE_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const result = await response.json();
    const timing = Math.round(performance.now() - start);

    return { timing, success: result.success === true };
  } catch (error) {
    const timing = Math.round(performance.now() - start);
    return { timing, success: false };
  }
}

/**
 * Run a performance test with warmup and multiple iterations
 */
async function runPerfTest(
  name: string,
  inputOverrides: Partial<typeof BASE_INPUT.packetBuildRequest>
): Promise<PerformanceResult | null> {
  const input = {
    packetBuildRequest: {
      ...BASE_INPUT.packetBuildRequest,
      ...inputOverrides,
    },
  };

  // Warmup runs
  for (let i = 0; i < WARMUP_RUNS; i++) {
    await runSimulation(input);
  }

  // Timed runs
  const timings: number[] = [];
  let failures = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    // Use different seed each iteration to avoid caching effects
    const iterInput = {
      packetBuildRequest: {
        ...input.packetBuildRequest,
        seed: 12345 + i,
      },
    };

    const { timing, success } = await runSimulation(iterInput);
    if (success) {
      timings.push(timing);
    } else {
      failures++;
    }
  }

  if (timings.length === 0) {
    console.log(`  ✗ ${name} - all iterations failed`);
    return null;
  }

  const stats = calculateStats(timings);
  return {
    name,
    iterations: timings.length,
    timings,
    ...stats,
  };
}

/**
 * Print a performance result
 */
function printResult(result: PerformanceResult): void {
  console.log(`  ✓ ${result.name}`);
  console.log(`    Iterations: ${result.iterations}`);
  console.log(`    Min: ${formatMs(result.min)} | Max: ${formatMs(result.max)}`);
  console.log(`    Mean: ${formatMs(result.mean)} | Median: ${formatMs(result.median)}`);
  console.log(`    P95: ${formatMs(result.p95)} | StdDev: ${formatMs(result.stdDev)}`);
}

/**
 * Print summary table
 */
function printSummaryTable(results: PerformanceResult[]): void {
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                    PERFORMANCE SUMMARY                          │');
  console.log('├───────────────────────────────┬─────────┬─────────┬─────────────┤');
  console.log('│ Test                          │  Median │    P95  │    StdDev   │');
  console.log('├───────────────────────────────┼─────────┼─────────┼─────────────┤');

  for (const r of results) {
    const name = r.name.padEnd(29);
    const median = formatMs(r.median).padStart(7);
    const p95 = formatMs(r.p95).padStart(7);
    const stdDev = formatMs(r.stdDev).padStart(9);
    console.log(`│ ${name} │ ${median} │ ${p95} │ ${stdDev}   │`);
  }

  console.log('└───────────────────────────────┴─────────┴─────────┴─────────────┘');
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

/**
 * Main test runner
 */
async function runPerformanceTests(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           MCP Simulation Performance Tests                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nService URL: ${SIMULATION_SERVICE_URL}`);
  console.log(`Iterations: ${ITERATIONS} (+ ${WARMUP_RUNS} warmup)`);

  // Check service availability
  console.log('\nChecking service availability...');
  const available = await isServiceAvailable();
  if (!available) {
    console.log('\n✗ Simulation service not available at', SIMULATION_SERVICE_URL);
    console.log('  Make sure to start the service with: npm run dev (in root)');
    process.exit(1);
  }
  console.log('✓ Service is available\n');

  const results: PerformanceResult[] = [];

  // Test 1: MC Path Scaling
  console.log('=== MC Path Scaling ===');
  console.log('Tests how latency scales with number of Monte Carlo paths\n');

  for (const paths of [10, 50, 100, 500, 1000]) {
    const result = await runPerfTest(`${paths} MC paths`, { mcPaths: paths });
    if (result) {
      printResult(result);
      results.push(result);
    }
    console.log();
  }

  // Test 2: Verbosity Levels
  console.log('=== Verbosity Levels ===');
  console.log('Tests overhead of different output verbosity levels (100 paths)\n');

  for (const verbosity of ['summary', 'annual', 'trace'] as const) {
    const result = await runPerfTest(`verbosity: ${verbosity}`, {
      verbosity,
      mcPaths: 100,
      // Use shorter horizon for trace to avoid massive payloads
      horizon: verbosity === 'trace' ? { startMonth: 0, endMonth: 120 } : { startMonth: 0, endMonth: 360 },
    });
    if (result) {
      printResult(result);
      results.push(result);
    }
    console.log();
  }

  // Test 3: Horizon Length
  console.log('=== Horizon Length ===');
  console.log('Tests how latency scales with simulation horizon (100 paths)\n');

  for (const years of [10, 20, 30, 40]) {
    const months = years * 12;
    const result = await runPerfTest(`${years}-year horizon`, {
      horizon: { startMonth: 0, endMonth: months },
      mcPaths: 100,
    });
    if (result) {
      printResult(result);
      results.push(result);
    }
    console.log();
  }

  // Test 4: Typical Use Cases
  console.log('=== Typical Use Cases ===');
  console.log('Tests common real-world configurations\n');

  // Quick estimate (ChatGPT interactive)
  const quickResult = await runPerfTest('Quick estimate (50 paths)', {
    mcPaths: 50,
    verbosity: 'summary',
    horizon: { startMonth: 0, endMonth: 360 },
  });
  if (quickResult) {
    printResult(quickResult);
    results.push(quickResult);
  }
  console.log();

  // Standard analysis (default)
  const standardResult = await runPerfTest('Standard (100 paths)', {
    mcPaths: 100,
    verbosity: 'summary',
    horizon: { startMonth: 0, endMonth: 360 },
  });
  if (standardResult) {
    printResult(standardResult);
    results.push(standardResult);
  }
  console.log();

  // Detailed analysis (for deep dives)
  const detailedResult = await runPerfTest('Detailed (500 paths + annual)', {
    mcPaths: 500,
    verbosity: 'annual',
    horizon: { startMonth: 0, endMonth: 360 },
  });
  if (detailedResult) {
    printResult(detailedResult);
    results.push(detailedResult);
  }
  console.log();

  // Print summary
  printSummaryTable(results);

  // Performance budget check
  console.log('\n=== Performance Budget Check ===');
  const standardTest = results.find((r) => r.name === 'Standard (100 paths)');
  if (standardTest) {
    const budget = 3000; // 3 second budget for standard request
    if (standardTest.p95 <= budget) {
      console.log(`✓ Standard request P95 (${formatMs(standardTest.p95)}) within ${formatMs(budget)} budget`);
    } else {
      console.log(`✗ Standard request P95 (${formatMs(standardTest.p95)}) exceeds ${formatMs(budget)} budget`);
      process.exitCode = 1;
    }
  }

  console.log('\nPerformance tests complete.');
}

// Run tests
runPerformanceTests().catch((error) => {
  console.error('Performance test error:', error);
  process.exit(1);
});
