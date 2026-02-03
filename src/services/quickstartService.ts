/**
 * Quickstart Service - Pure Input Collection Layer
 *
 * ARCHITECTURAL PRINCIPLE: This service is now a "dumb" input collection layer that
 * gathers minimal user inputs and sends them to the backend for complete plan generation.
 *
 * ALL financial plan generation, event creation, and scenario building have been moved
 * to the WASM backend. This service only collects and validates input data.
 *
 * WASM BOUNDARY: All WASM calls go through wasmBridge.ts
 * See: docs/WASM_BRIDGE_MIGRATION.md
 */

import { logger } from '@/utils/logger';
import { wasmBridge } from './wasmBridge';

// =============================================================================
// QUICKSTART INPUT TYPES (Simplified)
// =============================================================================

export interface QuickstartInputs {
  // Personal info
  currentAge: number;
  retirementAge: number;

  // Income
  annualSalary: number;
  annualBonus?: number;
  otherIncome?: number;

  // Tax info
  filingStatus?: 'single' | 'married';
  state?: string;

  // Expenses
  annualExpenses: number;
  retirementExpenses?: number;
  averageIndexedExpenses?: number;
  hasChildren?: boolean;

  // Current financial position
  currentSavings?: number;
  currentDebt?: number;

  // Housing
  housingType?: 'rent' | 'own' | 'other';
  currentHomeValue?: number;
  mortgageRemaining?: number;

  // Accounts
  accounts?: Array<{
    type: 'taxable' | 'tax_deferred' | 'roth' | 'cash';
    balance: number;
  }>;
  targetAccountTypes?: string[]; // User's preferred account types for contributions

  // Goals (optional)
  customGoals?: Array<{
    name: string;
    targetAmount: number;
    targetYear?: number;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;

  // Preferences
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  savingsRate?: number; // User's target savings rate
  safetyMultiplier?: number; // Safety margin for FIRE calculations (1.25 = 25% buffer)
  inflationRate?: number; // Expected inflation rate
}

export interface QuickstartBackendRequest {
  inputs: QuickstartInputs;
  requestType: 'quickstart-plan';
  includeRecommendations: boolean;
}

export interface QuickstartBackendResponse {
  success: boolean;
  simulationPayload?: any; // Complete SimulationPayload from backend
  error?: string;
  recommendations?: string[];
  scenarioId?: string;
}

export interface QuickstartResults {
  success: boolean;
  simulationPayload?: any;
  error?: string;
  recommendations?: string[];
  warnings?: string[];
  scenarioId?: string;

  // FIRE analysis results
  retirementTarget?: number;
  requiredSavingsRate?: number;
  yearsToFire?: number;
  feasibilityLevel?: 'excellent' | 'good' | 'challenging' | 'difficult';
  monthlyContribution?: number;

  // Generated events for review
  events?: Array<{
    type: string;
    description: string;
    startDate: string;
    amount?: number;
  }>;
}

// =============================================================================
// PURE INPUT VALIDATION AND COLLECTION
// =============================================================================

/**
 * Validates quickstart inputs (no financial calculations)
 */
export function validateQuickstartInputs(inputs: QuickstartInputs): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Basic validation only
  if (!inputs.currentAge || inputs.currentAge < 18 || inputs.currentAge > 100) {
    errors.push('Current age must be between 18 and 100');
  }

  if (!inputs.retirementAge || inputs.retirementAge <= inputs.currentAge) {
    errors.push('Retirement age must be greater than current age');
  }

  if (!inputs.annualSalary || inputs.annualSalary <= 0) {
    errors.push('Annual salary must be greater than 0');
  }

  if (!inputs.annualExpenses || inputs.annualExpenses <= 0) {
    errors.push('Annual expenses must be greater than 0');
  }

  if (inputs.annualExpenses >= inputs.annualSalary) {
    errors.push('Annual expenses should be less than annual salary for FIRE planning');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Prepares quickstart inputs for backend submission (no plan generation)
 */
export function prepareQuickstartRequest(
  inputs: QuickstartInputs,
  includeRecommendations = true
): QuickstartBackendRequest {
  logger.dataLog('Preparing quickstart request for backend plan generation');

  // Simple data cleaning and defaults
  const cleanInputs: QuickstartInputs = {
    ...inputs,
    // Apply sensible defaults
    filingStatus: inputs.filingStatus || 'single',
    retirementExpenses: inputs.retirementExpenses || inputs.annualExpenses,
    riskTolerance: inputs.riskTolerance || 'moderate',
    customGoals: inputs.customGoals || [],
    currentSavings: inputs.currentSavings || 0,
    currentDebt: inputs.currentDebt || 0
  };

  return {
    inputs: cleanInputs,
    requestType: 'quickstart-plan',
    includeRecommendations
  };
}

/**
 * Submits quickstart inputs to backend for complete plan generation
 * This replaces ALL client-side financial plan generation
 */
export async function generateQuickstartPlan(inputs: QuickstartInputs): Promise<QuickstartBackendResponse> {
  logger.dataLog('Submitting quickstart inputs to backend for complete plan generation');

  // Validate inputs first
  const validation = validateQuickstartInputs(inputs);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errors.join('; ')
    };
  }

  try {
    // Prepare request for backend
    const request = prepareQuickstartRequest(inputs, true);

    // TODO: Replace with actual backend API call
    // For now, return a placeholder that indicates backend processing is needed
    const response = await callQuickstartBackendAPI(request);

    if (response.success) {
      logger.dataLog('Received complete SimulationPayload from backend quickstart generation');
      return response;
    } else {
      logger.error('Backend quickstart plan generation failed', 'ERROR', response.error);
      return response;
    }

  } catch (error) {
    logger.error('Failed to generate quickstart plan', 'ERROR', error);
    return {
      success: false,
      error: 'Failed to communicate with backend plan generation service'
    };
  }
}

/**
 * Backend API call for quickstart plan generation using wasmBridge
 */
async function callQuickstartBackendAPI(request: QuickstartBackendRequest): Promise<QuickstartBackendResponse> {
  logger.dataLog('Calling WASM backend for quickstart plan generation via wasmBridge');

  try {
    logger.dataLog('Calling wasmBridge.generateQuickstartPlan with inputs', request.inputs);

    // Call via bridge - it handles WASM loading, retry, and normalization
    const wasmResult = await wasmBridge.generateQuickstartPlan(request.inputs);

    if (!wasmResult.success) {
      logger.error('WASM quickstart plan generation failed', 'WASM', wasmResult.error);
      return {
        success: false,
        error: wasmResult.error || 'WASM quickstart plan generation failed'
      };
    }

    logger.dataLog('WASM quickstart plan generation successful');

    return {
      success: true,
      simulationPayload: wasmResult.simulationPayload,
      recommendations: wasmResult.recommendations,
      scenarioId: wasmResult.scenarioId
    };

  } catch (error) {
    logger.error('Error calling WASM quickstart plan generation', 'ERROR', error);
    return {
      success: false,
      error: `WASM integration error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// =============================================================================
// MIGRATION HELPERS (Temporary during transition)
// =============================================================================

/**
 * Legacy compatibility wrapper
 * TODO: Remove after all components are updated to use generateQuickstartPlan
 */
export function processQuickstartInputs(_inputs: QuickstartInputs): any {
  logger.warn('Legacy processQuickstartInputs called - should migrate to generateQuickstartPlan', 'UI');

  // Return minimal structure to prevent crashes during migration
  return {
    success: false,
    error: 'Legacy quickstart processing disabled. Use generateQuickstartPlan instead.',
    needsBackendImplementation: true
  };
}

/**
 * Helper to calculate basic FIRE target using WASM backend
 * NOTE: This is for UI preview only - actual calculations should be done by backend
 */
export async function previewFireTarget(annualExpenses: number, retirementExpenses?: number): Promise<{
  target: number;
  isPreview: boolean;
}> {
  logger.dataLog('Calculating FIRE target using wasmBridge');

  try {
    // Prepare input for WASM function
    const input = {
      annualExpenses,
      retirementExpenses: retirementExpenses || 0
    };

    // Call via bridge - it handles WASM loading and errors
    const result = await wasmBridge.previewFireTarget(input);

    if (result.success) {
      return {
        target: result.target || 0,
        isPreview: result.isPreview || true
      };
    } else {
      logger.error('WASM FIRE target calculation failed:', 'WASM', result.error);
      // Fallback to client-side calculation
      const expenses = retirementExpenses || annualExpenses;
      const target = expenses * 25;
      return {
        target,
        isPreview: true
      };
    }

  } catch (error) {
    logger.error('Failed to call WASM FIRE target calculation:', 'WASM', error);
    // Fallback to client-side calculation
    const expenses = retirementExpenses || annualExpenses;
    const target = expenses * 25;
    return {
      target,
      isPreview: true
    };
  }
}

/**
 * Helper to get quickstart input summary for display using wasmBridge
 */
export async function getInputSummary(inputs: QuickstartInputs): Promise<{
  yearsToRetirement: number;
  savingsNeeded: number;
  isPreview: boolean;
}> {
  logger.dataLog('Calculating quickstart input summary using wasmBridge');

  try {
    // Prepare input for WASM function
    const input = {
      currentAge: inputs.currentAge,
      retirementAge: inputs.retirementAge,
      annualExpenses: inputs.annualExpenses,
      retirementExpenses: inputs.retirementExpenses || 0,
      currentSavings: inputs.currentSavings || 0
    };

    // Call via bridge - it handles WASM loading and errors
    const result = await wasmBridge.calculateQuickstartGoalAnalysis(input);

    if (result.success) {
      return {
        yearsToRetirement: result.yearsToRetirement || 0,
        savingsNeeded: result.savingsNeeded || 0,
        isPreview: result.isPreview || true
      };
    } else {
      logger.error('WASM quickstart goal analysis failed:', 'WASM', result.error);

      // Fallback calculation
      const yearsToRetirement = inputs.retirementAge - inputs.currentAge;
      const fireTarget = await previewFireTarget(inputs.annualExpenses, inputs.retirementExpenses);
      const currentSavings = inputs.currentSavings || 0;
      const savingsNeeded = Math.max(0, fireTarget.target - currentSavings);

      return {
        yearsToRetirement,
        savingsNeeded,
        isPreview: true
      };
    }

  } catch (error) {
    logger.error('Failed to call WASM quickstart goal analysis:', 'WASM', error);

    // Fallback calculation
    const yearsToRetirement = inputs.retirementAge - inputs.currentAge;
    const fireTarget = await previewFireTarget(inputs.annualExpenses, inputs.retirementExpenses);
    const currentSavings = inputs.currentSavings || 0;
    const savingsNeeded = Math.max(0, fireTarget.target - currentSavings);

    return {
      yearsToRetirement,
      savingsNeeded,
      isPreview: true
    };
  }
}

// =============================================================================
// REMOVED CLIENT-SIDE BUSINESS LOGIC
// =============================================================================

/*
The following functions have been REMOVED and moved to the backend:

- generateEventsFromQuickstart() -> Backend plan generation
- calculateFireTarget() -> Backend FIRE analysis
- calculateRequiredSavingsRate() -> Backend savings analysis
- assessFeasibility() -> Backend feasibility analysis
- generateScenarioSummary() -> Backend summary generation
- All event creation logic -> Backend event generation
- All account setup logic -> Backend account configuration
- All tax calculation logic -> Backend tax planning

These functions generated hundreds of lines of client-side financial calculations
that violated the "dumb display" principle. All this logic is now handled by the
WASM backend through the comprehensive SimulationPayload transformer.
*/

/**
 * Generate scenario summary for display (temporary implementation)
 */
export function generateScenarioSummary(results: any): string {
  if (!results || !results.simulationPayload) {
    return 'Scenario summary not available - simulation results needed';
  }

  const payload = results.simulationPayload;
  if (!payload.planProjection?.summary) {
    return 'Scenario analysis completed - view detailed charts and projections below';
  }

  const summary = payload.planProjection.summary;
  const parts = [];

  if (summary.goalOutcomes?.length > 0) {
    const successfulGoals = summary.goalOutcomes.filter((g: any) => g.probabilityOfSuccess > 0.7).length;
    parts.push(`${successfulGoals} of ${summary.goalOutcomes.length} goals likely achievable`);
  }

  if (summary.planHealth?.overallScore !== undefined) {
    const score = Math.round(summary.planHealth.overallScore * 100);
    parts.push(`Plan health score: ${score}%`);
  }

  return parts.length > 0 ? parts.join('. ') + '.' : 'Financial plan analysis completed successfully.';
}

export const QUICKSTART_MIGRATION_STATUS = {
  clientSideGenerationRemoved: true,
  backendIntegrationRequired: true,
  legacyFunctionsRemoved: [
    'generateEventsFromQuickstart',
    'calculateFireTarget',
    'calculateRequiredSavingsRate',
    'assessFeasibility'
  ],
  nextSteps: [
    'Implement backend quickstart endpoint',
    'Create WASM quickstart plan generator',
    'Update UI components to use generateQuickstartPlan',
    'Remove legacy processQuickstartInputs calls'
  ]
} as const;