/* eslint-disable */
/**
 * This file was automatically generated from JSON Schema.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run npm run generate-types to regenerate this file.
 */

/**
 * Result of a single simulation run
 */
export interface SimulationResult {
  /**
   * Whether the simulation completed successfully
   */
  success: boolean;
  /**
   * Monthly data for each month of the simulation
   */
  monthlyData?: {
    monthOffset: number;
    netWorth: number;
    cashFlow: number;
    accounts: {};
    returns: {};
  }[];
  /**
   * Error message if simulation failed
   */
  error?: string;
}
