/**
 * WASM Boundary Service
 *
 * Type-safe wrapper for WASM simulation calls with runtime validation.
 * This service ensures that both input and output are validated at the
 * WASM boundary, catching issues early.
 */

import { z } from 'zod';
import {
  WasmInputSchema,
  SimulationPayloadSchemaCaseInsensitive,
  normalizeWasmOutput,
  type WasmInput,
  type WasmOutput,
} from '@/types/schemas/wasmSchemas';
import { logger } from '@/utils/logger';
import type { SimulationPayload } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

// Note: Window interface extensions are defined in src/types/global.d.ts
// We use type assertions here to avoid conflicts

/**
 * Error type for WASM boundary validation failures
 */
export class WasmBoundaryError extends Error {
  constructor(
    message: string,
    public readonly validationErrors?: z.ZodError | unknown,
    public readonly context?: 'input' | 'output' | 'execution' | 'availability'
  ) {
    super(message);
    this.name = 'WasmBoundaryError';
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate WASM input and throw detailed error if invalid
 */
export function assertValidWasmInput(input: unknown): asserts input is WasmInput {
  const result = WasmInputSchema.safeParse(input);
  if (!result.success) {
    logger.error('WASM input validation failed:', 'WASM', result.error.issues);
    throw new WasmBoundaryError(
      'Invalid WASM input structure',
      result.error,
      'input'
    );
  }
}

/**
 * Validate WASM output and throw detailed error if invalid
 */
export function assertValidWasmOutput(output: unknown): asserts output is WasmOutput {
  // First normalize casing
  const normalized = normalizeWasmOutput(output);

  const result = SimulationPayloadSchemaCaseInsensitive.safeParse(normalized);
  if (!result.success) {
    logger.error('WASM output validation failed:', 'WASM', result.error.issues);
    throw new WasmBoundaryError(
      'Invalid WASM output structure',
      result.error,
      'output'
    );
  }
}

// =============================================================================
// WASM CALLS
// =============================================================================

/**
 * Check if WASM is available and ready
 */
export function isWasmAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as { wasmReady?: boolean; runSimulationWithUIPayload?: unknown };
  return win.wasmReady === true && typeof win.runSimulationWithUIPayload === 'function';
}

/**
 * Type-safe WASM simulation call with validation
 *
 * @param input - Simulation input (will be validated)
 * @param numberOfRuns - Number of Monte Carlo runs
 * @returns Validated SimulationPayload
 * @throws WasmBoundaryError if validation fails
 */
export async function callWasmSimulation(
  input: WasmInput,
  numberOfRuns: number
): Promise<SimulationPayload> {
  // Validate input
  assertValidWasmInput(input);

  // Check WASM availability
  if (!isWasmAvailable()) {
    throw new WasmBoundaryError(
      'WASM simulation engine is not available',
      undefined,
      'availability'
    );
  }

  // Call WASM
  const win = window as unknown as { runSimulationWithUIPayload: (input: unknown, runs: number) => unknown };
  let result: unknown;
  try {
    result = win.runSimulationWithUIPayload(input, numberOfRuns);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new WasmBoundaryError(
      `WASM execution failed: ${errorMessage}`,
      undefined,
      'execution'
    );
  }

  // Parse if string (Go may return JSON string)
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch {
      throw new WasmBoundaryError(
        'WASM returned invalid JSON',
        undefined,
        'output'
      );
    }
  }

  // Normalize casing (Go uses PascalCase)
  result = normalizeWasmOutput(result);

  // Validate output
  assertValidWasmOutput(result);

  return result as unknown as SimulationPayload;
}

/**
 * Validate input without calling WASM (useful for pre-flight checks)
 */
export function validateSimulationInput(input: unknown): {
  valid: boolean;
  errors?: z.ZodError;
} {
  const result = WasmInputSchema.safeParse(input);
  return {
    valid: result.success,
    errors: result.success ? undefined : result.error,
  };
}

/**
 * Create a minimal valid WASM input for testing
 */
export function createMinimalWasmInput(overrides?: Partial<WasmInput>): WasmInput {
  return {
    initialAccounts: {
      cash: 10000,
      taxable: { totalValue: 0 },
      tax_deferred: { totalValue: 0 },
      roth: { totalValue: 0 },
    },
    events: [],
    config: {},
    monthsToRun: 360, // 30 years
    initialAge: 30,
    startYear: new Date().getFullYear(),
    goals: [],
    ...overrides,
  };
}
