/* eslint-disable */
/**
 * This file was automatically generated from JSON Schema.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run npm run generate-types to regenerate this file.
 */

/**
 * Input data for financial simulation
 */
export interface SimulationInput {
  initialAccounts: {
    taxable?: {
      holdings?: {}[];
      totalValue?: number;
    };
    tax_deferred?: {
      holdings?: {}[];
      totalValue?: number;
    };
    roth?: {
      holdings?: {}[];
      totalValue?: number;
    };
    cash: number;
  };
  events: {
    id: string;
    type: string;
    monthOffset: number;
    amount: number;
    metadata?: {};
  }[];
  config: StochasticModelConfig;
  monthsToRun: number;
  withdrawalStrategy: WithdrawalSequence;
  /**
   * Array of financial goals to track during simulation
   */
  goals?: {
    id: string;
    name: string;
    description?: string;
    targetAmount: number;
    targetMonthOffset: number;
    priority: number;
    category: 'RETIREMENT' | 'EDUCATION' | 'MAJOR_PURCHASE' | 'CUSTOM';
  }[];
}
export interface StochasticModelConfig {
  seed?: number;
  correlationMatrix?: number[][];
  expectedReturns: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^[a-zA-Z_]+$".
     */
    [k: string]: number;
  };
  volatilities: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^[a-zA-Z_]+$".
     */
    [k: string]: number;
  };
}
export interface WithdrawalSequence {
  strategy: 'taxable_first' | 'tax_deferred_first' | 'proportional' | 'bucket_strategy';
  buckets?: {
    accountType: 'taxable' | 'tax_deferred' | 'roth';
    priority: number;
    percentage?: number;
  }[];
}
