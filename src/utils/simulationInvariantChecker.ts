import { 
  assertInvariants, 
  InvariantCheckResult, 
  InvariantViolation 
} from './invariantTesting';
import type { SimulationState } from '../types/state/simulation';
import type { SimulationEvent } from '../types/events';
import { logger } from './logger';

export interface SimulationInvariantConfig {
  enableInvariantChecking: boolean;
  checkOnlyInDebugMode: boolean;
  failOnInvariantViolation: boolean;
  logViolations: boolean;
  violationLogLevel: 'error' | 'warn' | 'info';
}

export const DEFAULT_INVARIANT_CONFIG: SimulationInvariantConfig = {
  enableInvariantChecking: process.env.NODE_ENV !== 'production',
  checkOnlyInDebugMode: true,
  failOnInvariantViolation: process.env.NODE_ENV === 'test',
  logViolations: true,
  violationLogLevel: 'error'
};

export interface SimulationStep {
  monthOffset: number;
  state: SimulationState;
  events: SimulationEvent[];
  timestamp: number;
}

export class SimulationInvariantChecker {
  private config: SimulationInvariantConfig;
  private violations: InvariantViolation[] = [];
  private checkHistory: Map<number, InvariantCheckResult> = new Map();
  private previousState: SimulationState | undefined;

  constructor(config: Partial<SimulationInvariantConfig> = {}) {
    this.config = { ...DEFAULT_INVARIANT_CONFIG, ...config };
  }

  /**
   * Check invariants for a single simulation state
   */
  checkState(
    currentState: SimulationState,
    monthEvents?: SimulationEvent[],
    context?: string
  ): InvariantCheckResult {
    if (!this.shouldCheck()) {
      return { passed: true, violations: [], checkedInvariants: [] };
    }

    const result = assertInvariants(
      currentState,
      this.previousState,
      monthEvents
    );

    // Store result for history
    this.checkHistory.set(currentState.monthOffset, result);

    // Log violations if configured
    if (result.violations.length > 0 && this.config.logViolations) {
      this.logViolations(result.violations, context);
    }

    // Accumulate violations
    this.violations.push(...result.violations);

    // Update previous state for next check
    this.previousState = { ...currentState };

    // Fail if configured to do so
    if (!result.passed && this.config.failOnInvariantViolation) {
      throw new SimulationInvariantError(
        `Invariant violations detected${context ? ` in ${context}` : ''}`,
        result.violations
      );
    }

    return result;
  }

  /**
   * Check invariants for a sequence of simulation states
   */
  checkSequence(
    states: SimulationState[],
    eventsByMonth?: Map<number, SimulationEvent[]>,
    context?: string
  ): InvariantCheckResult[] {
    const results: InvariantCheckResult[] = [];

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      const monthEvents = eventsByMonth?.get(state.monthOffset);
      const stepContext = `${context || 'sequence'} step ${i} (month ${state.monthOffset})`;
      
      const result = this.checkState(state, monthEvents, stepContext);
      results.push(result);
    }

    return results;
  }

  /**
   * Check invariants for simulation steps with full context
   */
  checkSimulationSteps(
    steps: SimulationStep[],
    context?: string
  ): InvariantCheckResult[] {
    const results: InvariantCheckResult[] = [];

    for (const step of steps) {
      const stepContext = `${context || 'simulation'} month ${step.monthOffset}`;
      const result = this.checkState(step.state, step.events, stepContext);
      results.push(result);
    }

    return results;
  }

  /**
   * Get all violations found during checking
   */
  getAllViolations(): InvariantViolation[] {
    return [...this.violations];
  }

  /**
   * Get violations by severity
   */
  getViolationsBySeverity(severity: 'error' | 'warning'): InvariantViolation[] {
    return this.violations.filter(v => v.severity === severity);
  }

  /**
   * Get check history for analysis
   */
  getCheckHistory(): Map<number, InvariantCheckResult> {
    return new Map(this.checkHistory);
  }

  /**
   * Reset checker state
   */
  reset(): void {
    this.violations = [];
    this.checkHistory.clear();
    this.previousState = undefined;
  }

  /**
   * Generate a summary report of all checks
   */
  generateReport(): SimulationInvariantReport {
    const totalChecks = this.checkHistory.size;
    const failedChecks = Array.from(this.checkHistory.values()).filter(r => !r.passed).length;
    const errorViolations = this.getViolationsBySeverity('error');
    const warningViolations = this.getViolationsBySeverity('warning');

    const violationsByInvariant = this.violations.reduce((acc, violation) => {
      acc[violation.invariantName] = (acc[violation.invariantName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalChecks,
        passedChecks: totalChecks - failedChecks,
        failedChecks,
        totalViolations: this.violations.length,
        errorViolations: errorViolations.length,
        warningViolations: warningViolations.length
      },
      violationsByInvariant,
      violations: this.violations,
      config: this.config
    };
  }

  private shouldCheck(): boolean {
    if (!this.config.enableInvariantChecking) {
      return false;
    }

    if (this.config.checkOnlyInDebugMode) {
      return process.env.NODE_ENV === 'development' || 
             process.env.NODE_ENV === 'test' ||
             (typeof window !== 'undefined' && (window as any).__AREUM_DEBUG__);
    }

    return true;
  }

  private logViolations(violations: InvariantViolation[], context?: string): void {
    const logLevel = this.config.violationLogLevel;
    const prefix = `[SimulationInvariantChecker]${context ? ` ${context}` : ''}`;

    violations.forEach(violation => {
      const message = `${prefix} ${violation.invariantName}: ${violation.description}. Expected: ${violation.expected}, Actual: ${violation.actual}`;
      
      switch (logLevel) {
        case 'error':
          logger.error(message);
          break;
        case 'warn':
          logger.warn(message);
          break;
        case 'info':
          logger.info(message);
          break;
      }
    });
  }
}

export class SimulationInvariantError extends Error {
  public readonly violations: InvariantViolation[];

  constructor(message: string, violations: InvariantViolation[]) {
    super(message);
    this.name = 'SimulationInvariantError';
    this.violations = violations;
  }
}

export interface SimulationInvariantReport {
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    totalViolations: number;
    errorViolations: number;
    warningViolations: number;
  };
  violationsByInvariant: Record<string, number>;
  violations: InvariantViolation[];
  config: SimulationInvariantConfig;
}

/**
 * Global invariant checker instance for use throughout the application
 */
export const globalInvariantChecker = new SimulationInvariantChecker();

/**
 * Utility function to check a single state with the global checker
 */
export function checkSimulationStateInvariants(
  state: SimulationState,
  monthEvents?: SimulationEvent[],
  context?: string
): InvariantCheckResult {
  return globalInvariantChecker.checkState(state, monthEvents, context);
}

/**
 * Utility function to check a sequence of states with the global checker
 */
export function checkSimulationSequenceInvariants(
  states: SimulationState[],
  eventsByMonth?: Map<number, SimulationEvent[]>,
  context?: string
): InvariantCheckResult[] {
  return globalInvariantChecker.checkSequence(states, eventsByMonth, context);
}

/**
 * Middleware function for integrating invariant checking into simulation pipelines
 */
export function withInvariantChecking<T extends SimulationState>(
  simulationStep: (state: T, ...args: any[]) => T,
  context?: string
) {
  return (state: T, ...args: any[]): T => {
    // Check input state
    checkSimulationStateInvariants(state, undefined, `${context || 'step'} input`);
    
    // Execute simulation step
    const newState = simulationStep(state, ...args);
    
    // Check output state
    checkSimulationStateInvariants(newState, undefined, `${context || 'step'} output`);
    
    return newState;
  };
}