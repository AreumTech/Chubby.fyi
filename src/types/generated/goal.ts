/* eslint-disable */
/**
 * This file was automatically generated from JSON Schema.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run npm run generate-types to regenerate this file.
 */

/**
 * A financial goal with a target amount and date.
 */
export interface Goal {
  /**
   * Unique identifier for the goal.
   */
  id: string;
  /**
   * User-defined name for the goal.
   */
  name: string;
  /**
   * A brief description of the goal.
   */
  description?: string;
  /**
   * The target monetary amount for the goal.
   */
  targetAmount: number;
  /**
   * The simulation month by which to achieve the goal.
   */
  targetMonthOffset: number;
  /**
   * Priority of the goal (1=High, 2=Medium, 3=Low).
   */
  priority: number;
  /**
   * The category of the goal.
   */
  category: 'RETIREMENT' | 'EDUCATION' | 'MAJOR_PURCHASE' | 'CUSTOM';
}