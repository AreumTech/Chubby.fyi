/**
 * Stochastic path generator
 *
 * Generates a single realized path of market shocks for auditability.
 * Uses wasmBridge for WASM bindings.
 *
 * WASM BOUNDARY: All WASM calls go through wasmBridge.ts
 * See: docs/WASM_BRIDGE_MIGRATION.md
 */

import type { StochasticModelConfig } from '@/types';
import type { StochasticReturns } from '@/types/api/payload';
import { wasmBridge } from './wasmBridge';

export interface RealizedShock {
  equity_return: number;
  bond_return: number;
  inflation: number;
  intl_return?: number;
  other_return?: number;
  individual_stock_return?: number;
  home_return?: number;
  rental_return?: number;
}

export interface StochasticPathResult {
  shocks: RealizedShock[];
  rawReturns: StochasticReturns[];
}

export async function generatePath(
  seed: number,
  horizon: number,
  modelParams: StochasticModelConfig
): Promise<StochasticPathResult> {
  const config = {
    ...modelParams,
    simulationMode: 'stochastic',
    randomSeed: seed,
  };

  // Initialize state via bridge
  let state = await wasmBridge.initializeStochasticState(config);
  const rawReturns: StochasticReturns[] = [];
  const shocks: RealizedShock[] = [];

  for (let t = 0; t < horizon; t += 1) {
    const result = await wasmBridge.generateStochasticReturns(state, config);
    if (result?.success === false) {
      throw new Error(result?.error || 'Failed to generate stochastic returns');
    }

    const returns: StochasticReturns = result.returns;
    rawReturns.push(returns);
    shocks.push({
      equity_return: returns.SPY,
      bond_return: returns.BND,
      inflation: returns.Inflation,
      intl_return: returns.Intl,
      other_return: returns.Other,
      individual_stock_return: returns.IndividualStock,
      home_return: returns.Home,
      rental_return: returns.Rent,
    });

    state = result.newState;
  }

  return { shocks, rawReturns };
}
