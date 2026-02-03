/* eslint-disable */
/**
 * This file was automatically generated from JSON Schema.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run npm run generate-types to regenerate this file.
 */

/**
 * Aggregated results from Monte Carlo simulation
 */
export interface SimulationResults {
  /**
   * Whether the simulation completed successfully
   */
  success: boolean;
  /**
   * Number of simulation runs performed
   */
  numberOfRuns?: number;
  /**
   * 10th percentile of final net worth
   */
  finalNetWorthP10?: number;
  /**
   * 25th percentile of final net worth
   */
  finalNetWorthP25?: number;
  /**
   * 50th percentile (median) of final net worth
   */
  finalNetWorthP50?: number;
  /**
   * 75th percentile of final net worth
   */
  finalNetWorthP75?: number;
  /**
   * 90th percentile of final net worth
   */
  finalNetWorthP90?: number;
  /**
   * Probability of achieving financial goals
   */
  probabilityOfSuccess?: number;
  /**
   * Probability of bankruptcy during simulation
   */
  probabilityOfBankruptcy?: number;
  /**
   * Number of simulation runs that resulted in bankruptcy
   */
  bankruptcyCount?: number;
  /**
   * Error message if simulation failed
   */
  error?: string;
}
