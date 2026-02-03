/**
 * Structured Error Handling for MCP Server
 *
 * Error codes follow the pattern: CATEGORY_SPECIFIC_ERROR
 * This enables clients to handle errors programmatically.
 */

/**
 * Error codes for MCP server operations
 */
export const ErrorCode = {
  // Input validation errors
  MISSING_INPUT: 'MISSING_INPUT',
  INVALID_RANGE: 'INVALID_RANGE',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Service errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  SERVICE_TIMEOUT: 'SERVICE_TIMEOUT',
  CONNECTION_FAILED: 'CONNECTION_FAILED',

  // WASM/Simulation errors
  WASM_PANIC: 'WASM_PANIC',
  SIMULATION_ERROR: 'SIMULATION_ERROR',
  CONFIG_LOAD_FAILED: 'CONFIG_LOAD_FAILED',

  // Parse errors
  PARSE_ERROR: 'PARSE_ERROR',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',

  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Structured error with code, message, and optional details
 */
export class SimulationError extends Error {
  public readonly code: ErrorCodeType;
  public readonly details: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(
    code: ErrorCodeType,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'SimulationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SimulationError);
    }
  }

  /**
   * Convert to JSON-serializable object for MCP response
   */
  toJSON(): {
    success: false;
    error: string;
    code: ErrorCodeType;
    details: Record<string, unknown>;
    timestamp: string;
  } {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }

  /**
   * Create from unknown error (catch block)
   */
  static fromUnknown(error: unknown, fallbackCode: ErrorCodeType = ErrorCode.UNKNOWN_ERROR): SimulationError {
    if (error instanceof SimulationError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
        return new SimulationError(
          ErrorCode.CONNECTION_FAILED,
          'Cannot connect to simulation service',
          { originalError: error.message }
        );
      }

      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return new SimulationError(
          ErrorCode.SERVICE_TIMEOUT,
          'Simulation service timed out',
          { originalError: error.message }
        );
      }

      return new SimulationError(fallbackCode, error.message, {
        originalError: error.message,
        stack: error.stack,
      });
    }

    return new SimulationError(fallbackCode, String(error));
  }
}

/**
 * Validation helpers that throw SimulationError
 */
export const validate = {
  /**
   * Validate required field exists
   */
  required<T>(value: T | undefined | null, fieldName: string): T {
    if (value === undefined || value === null) {
      throw new SimulationError(ErrorCode.MISSING_INPUT, `Missing required field: ${fieldName}`, {
        field: fieldName,
      });
    }
    return value;
  },

  /**
   * Validate number is within range
   */
  range(value: number, min: number, max: number, fieldName: string): number {
    if (value < min || value > max) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `${fieldName} must be between ${min} and ${max}, got ${value}`,
        { field: fieldName, value, min, max }
      );
    }
    return value;
  },

  /**
   * Validate value is positive number (> 0)
   */
  positive(value: number, fieldName: string): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new SimulationError(ErrorCode.INVALID_TYPE, `${fieldName} must be a number`, {
        field: fieldName,
        value,
        expectedType: 'number',
      });
    }
    if (value <= 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `${fieldName} must be positive (> 0), got ${value}`,
        { field: fieldName, value }
      );
    }
    return value;
  },

  /**
   * Validate value is non-negative number (>= 0)
   * Use for values like expectedIncome where 0 is valid (retirement scenarios)
   */
  nonNegative(value: number, fieldName: string): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new SimulationError(ErrorCode.INVALID_TYPE, `${fieldName} must be a number`, {
        field: fieldName,
        value,
        expectedType: 'number',
      });
    }
    if (value < 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `${fieldName} must be non-negative (>= 0), got ${value}`,
        { field: fieldName, value }
      );
    }
    return value;
  },

  /**
   * Validate string is non-empty
   */
  nonEmptyString(value: string | undefined | null, fieldName: string): string {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new SimulationError(ErrorCode.MISSING_INPUT, `${fieldName} must be a non-empty string`, {
        field: fieldName,
      });
    }
    return value;
  },
};
