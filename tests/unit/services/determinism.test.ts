/**
 * Golden Determinism Tests - PFOS-E Compliance
 *
 * These tests verify the core PFOS-E principle:
 * "Same seed + same inputs = identical output"
 *
 * This is critical for:
 * - Reproducible financial simulations
 * - Audit trails and compliance
 * - "Show the math" functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runSimulation } from '@/features/packet/services/packetBuildService';
import type { PacketBuildRequest } from '@/features/packet/types/packetSchema';
import type { ConfirmedChange } from '@/features/chat/types/draftChangeSchema';

// Helper to create a deterministic PacketBuildRequest
function createBronzeRequest(overrides: Partial<{
  seed: number;
  startYear: number;
  investableAssets: number;
  annualSpending: number;
  currentAge: number;
  expectedIncome: number;
}>): PacketBuildRequest {
  const seed = overrides.seed ?? 12345;
  const startYear = overrides.startYear ?? 2024;
  const investableAssets = overrides.investableAssets ?? 500000;
  const annualSpending = overrides.annualSpending ?? 60000;
  const currentAge = overrides.currentAge ?? 35;
  const expectedIncome = overrides.expectedIncome ?? 100000;

  const confirmedChanges: ConfirmedChange[] = [
    {
      draftChangeId: `dc-investable-${seed}`,
      fieldPath: ['profile', 'investableAssets'],
      oldValue: 0,
      newValue: investableAssets,
      confirmedAt: new Date('2024-01-01T00:00:00Z'), // Fixed timestamp for determinism
      scope: 'baseline_candidate',
    },
    {
      draftChangeId: `dc-spending-${seed}`,
      fieldPath: ['profile', 'annualSpending'],
      oldValue: 0,
      newValue: annualSpending,
      confirmedAt: new Date('2024-01-01T00:00:00Z'),
      scope: 'baseline_candidate',
    },
    {
      draftChangeId: `dc-age-${seed}`,
      fieldPath: ['profile', 'currentAge'],
      oldValue: 0,
      newValue: currentAge,
      confirmedAt: new Date('2024-01-01T00:00:00Z'),
      scope: 'baseline_candidate',
    },
    {
      draftChangeId: `dc-income-${seed}`,
      fieldPath: ['profile', 'expectedIncome'],
      oldValue: 0,
      newValue: expectedIncome,
      confirmedAt: new Date('2024-01-01T00:00:00Z'),
      scope: 'baseline_candidate',
    },
    {
      draftChangeId: `dc-startyear-${seed}`,
      fieldPath: ['profile', 'startYear'],
      oldValue: 0,
      newValue: startYear,
      confirmedAt: new Date('2024-01-01T00:00:00Z'),
      scope: 'baseline_candidate',
    },
  ];

  return {
    baselineHash: `bronze-${seed}`,
    confirmedChanges,
    scenarios: [
      {
        id: 'baseline',
        label: 'BASELINE',
        description: 'Current trajectory',
        changeOverrides: [],
      },
    ],
    seed,
    startYear,
    horizon: {
      startMonth: 0,
      endMonth: 360, // 30 years
    },
    mcPaths: 1,
    question: 'Determinism test',
    dataTier: 'bronze',
  };
}

describe('PFOS-E Determinism', () => {
  // Skip these tests if WASM is not available (e.g., in CI without WASM build)
  // In real usage, these would be integration tests that require WASM
  const skipWasmTests = process.env.SKIP_WASM_TESTS === 'true';

  describe('Same Seed Produces Identical Output', () => {
    it.skipIf(skipWasmTests)('same seed produces identical P50', async () => {
      const request = createBronzeRequest({ seed: 12345 });

      const r1 = await runSimulation(request);
      const r2 = await runSimulation(request);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r1.mcResults?.finalNetWorthP50).toBe(r2.mcResults?.finalNetWorthP50);
    });

    it.skipIf(skipWasmTests)('same seed produces identical P10', async () => {
      const request = createBronzeRequest({ seed: 67890 });

      const r1 = await runSimulation(request);
      const r2 = await runSimulation(request);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r1.mcResults?.finalNetWorthP10).toBe(r2.mcResults?.finalNetWorthP10);
    });

    it.skipIf(skipWasmTests)('same seed produces identical P90', async () => {
      const request = createBronzeRequest({ seed: 11111 });

      const r1 = await runSimulation(request);
      const r2 = await runSimulation(request);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r1.mcResults?.finalNetWorthP90).toBe(r2.mcResults?.finalNetWorthP90);
    });

    it.skipIf(skipWasmTests)('same seed produces identical baseSeed in output', async () => {
      const request = createBronzeRequest({ seed: 99999 });

      const r1 = await runSimulation(request);
      const r2 = await runSimulation(request);

      expect(r1.mcResults?.baseSeed).toBe(request.seed);
      expect(r2.mcResults?.baseSeed).toBe(request.seed);
      expect(r1.mcResults?.baseSeed).toBe(r2.mcResults?.baseSeed);
    });
  });

  describe('Different Seed Produces Different Output', () => {
    it.skipIf(skipWasmTests)('different seed produces different P50', async () => {
      const r1 = await runSimulation(createBronzeRequest({ seed: 12345 }));
      const r2 = await runSimulation(createBronzeRequest({ seed: 67890 }));

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);

      // With different seeds, P50 values should differ
      // (statistically very unlikely to be identical with different seeds)
      expect(r1.mcResults?.finalNetWorthP50).not.toBe(r2.mcResults?.finalNetWorthP50);
    });
  });

  describe('Request Validation', () => {
    it('rejects request without seed', async () => {
      const request = createBronzeRequest({ seed: 0 });
      request.seed = 0; // Invalid seed

      const result = await runSimulation(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('seed');
    });

    it('rejects request with negative seed', async () => {
      const request = createBronzeRequest({ seed: -1 });

      const result = await runSimulation(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('seed');
    });

    it('rejects request without startYear', async () => {
      const request = createBronzeRequest({ startYear: 0 });
      request.startYear = 0; // Invalid startYear

      const result = await runSimulation(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('startYear');
    });
  });

  describe('Blocked Outputs for Bronze Tier', () => {
    it.skipIf(skipWasmTests)('returns blocked outputs for bronze tier', async () => {
      const request = createBronzeRequest({ seed: 12345 });

      const result = await runSimulation(request);

      expect(result.success).toBe(true);
      expect(result.blockedOutputs).toBeDefined();
      expect(result.blockedOutputs!.length).toBeGreaterThan(0);
    });

    it.skipIf(skipWasmTests)('sensitivity analysis is blocked for bronze tier', async () => {
      const request = createBronzeRequest({ seed: 12345 });

      const result = await runSimulation(request);

      expect(result.success).toBe(true);
      const sensitivityBlocked = result.blockedOutputs?.find(
        b => b.outputName === 'Sensitivity Analysis'
      );
      expect(sensitivityBlocked).toBeDefined();
    });
  });

  describe('Engine Inputs Hash', () => {
    it.skipIf(skipWasmTests)('produces consistent engineInputsHash for same inputs', async () => {
      const request = createBronzeRequest({ seed: 12345 });

      const r1 = await runSimulation(request);
      const r2 = await runSimulation(request);

      expect(r1.engineInputsHash).toBe(r2.engineInputsHash);
    });

    it.skipIf(skipWasmTests)('produces different engineInputsHash for different seeds', async () => {
      const r1 = await runSimulation(createBronzeRequest({ seed: 12345 }));
      const r2 = await runSimulation(createBronzeRequest({ seed: 67890 }));

      expect(r1.engineInputsHash).not.toBe(r2.engineInputsHash);
    });

    it.skipIf(skipWasmTests)('engineInputsHash contains seed', async () => {
      const seed = 12345;
      const result = await runSimulation(createBronzeRequest({ seed }));

      expect(result.engineInputsHash).toContain(String(seed));
    });
  });
});

describe('PFOS-E Type Safety', () => {
  describe('P25/P75 are optional', () => {
    it.skipIf(process.env.SKIP_WASM_TESTS === 'true')('P25 and P75 may be undefined', async () => {
      const request = createBronzeRequest({ seed: 12345 });

      const result = await runSimulation(request);

      expect(result.success).toBe(true);
      // P25 and P75 are optional - should not be fake approximations
      // They are either undefined or actual computed values
      if (result.mcResults?.finalNetWorthP25 !== undefined) {
        expect(typeof result.mcResults.finalNetWorthP25).toBe('number');
      }
      if (result.mcResults?.finalNetWorthP75 !== undefined) {
        expect(typeof result.mcResults.finalNetWorthP75).toBe('number');
      }
    });
  });
});
