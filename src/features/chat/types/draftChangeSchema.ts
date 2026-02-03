/**
 * DraftChange Schema v0 - PFOS-E Compliant
 *
 * DraftChanges capture proposed modifications from user input (manual or LLM-parsed).
 * They flow through a state machine: pending → confirmed → applied to simulation.
 *
 * PFOS-E Safety Rules:
 * - Explicit uncertainty: confidence scores visible in advanced mode
 * - Auditable provenance: sourceMessageId + sourceSpan for traceability
 * - Validation errors surfaced, never hidden
 */

// =============================================================================
// DRAFT CHANGE STATUS
// =============================================================================

/**
 * DraftChangeStatus - Lifecycle state of a proposed change
 */
export type DraftChangeStatus = 'pending' | 'confirmed' | 'discarded';

/**
 * ChangeScope - How the change should be applied
 *
 * - scenario_only: Apply only to current scenario exploration
 * - baseline_candidate: Candidate to update the user's baseline profile
 */
export type ChangeScope = 'scenario_only' | 'baseline_candidate';

// =============================================================================
// DRAFT CHANGE V0
// =============================================================================

/**
 * DraftChangeV0 - A proposed modification to the financial profile
 *
 * Created when user provides input (manual form or LLM parsing).
 * Must be confirmed before being applied to simulation.
 */
export interface DraftChangeV0 {
  /** Unique change identifier */
  id: string;

  /** Current lifecycle status */
  status: DraftChangeStatus;

  // === What Changed ===

  /**
   * Entity type being modified
   * Examples: "ExpenseProfile", "IncomeStream", "AccountBalance", "Goal"
   */
  entityType: string;

  /** Entity ID for existing entity updates (undefined for new entities) */
  entityId?: string;

  /**
   * Structured path to the field being changed
   * Examples: ["annual_spend"], ["salary", "amount"], ["account", "balance"]
   */
  fieldPath: string[];

  /** Previous value (undefined for new fields) */
  oldValue: unknown;

  /** New value being proposed */
  newValue: unknown;

  /** Unit of the value (for display formatting) */
  unit?: string;

  // === Scope ===

  /** How this change should be applied */
  scope: ChangeScope;

  /** Month offset when change takes effect (optional) */
  effectiveMonthOffset?: number;

  // === Provenance ===

  /**
   * Confidence score (0-1)
   * Hidden unless advanced mode enabled.
   * Lower confidence triggers review prompts.
   */
  confidence: number;

  /** Message ID that created this change */
  sourceMessageId: string;

  /** Text offsets in source message (for highlighting) */
  sourceSpan?: {
    start: number;
    end: number;
  };

  /** Parsing caveats or notes */
  notes?: string;

  // === Validation ===

  /** Validation errors (must be empty to confirm) */
  validationErrors: string[];
}

// =============================================================================
// CONFIRMED CHANGE
// =============================================================================

/**
 * ConfirmedChange - A change that has been reviewed and approved
 *
 * Only confirmed changes are applied to simulation.
 */
export interface ConfirmedChange {
  /** Reference to original draft change */
  draftChangeId: string;

  /** Path to the changed field */
  fieldPath: string[];

  /** Previous value */
  oldValue: unknown;

  /** New value */
  newValue: unknown;

  /** When the change was confirmed */
  confirmedAt: Date;

  /** Scope selected during confirmation */
  scope: ChangeScope;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique draft change ID
 */
export function generateDraftChangeId(): string {
  return `dc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new draft change with defaults
 */
export function createDraftChange(
  params: Omit<DraftChangeV0, 'id' | 'status' | 'validationErrors'>
): DraftChangeV0 {
  return {
    id: generateDraftChangeId(),
    status: 'pending',
    validationErrors: [],
    ...params,
  };
}

/**
 * Confirm a draft change
 */
export function confirmDraftChange(
  draft: DraftChangeV0,
  scope: ChangeScope
): ConfirmedChange {
  if (draft.validationErrors.length > 0) {
    throw new Error(
      `Cannot confirm draft change ${draft.id}: has validation errors`
    );
  }

  return {
    draftChangeId: draft.id,
    fieldPath: draft.fieldPath,
    oldValue: draft.oldValue,
    newValue: draft.newValue,
    confirmedAt: new Date(),
    scope,
  };
}

/**
 * Check if a draft change can be confirmed
 */
export function canConfirmDraftChange(draft: DraftChangeV0): boolean {
  return (
    draft.status === 'pending' &&
    draft.validationErrors.length === 0
  );
}

/**
 * Format a field path for display
 * ["salary", "amount"] → "Salary Amount"
 */
export function formatFieldPath(fieldPath: string[]): string {
  return fieldPath
    .map((part) =>
      part
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' > ');
}

/**
 * Format a value for display based on unit
 */
export function formatChangeValue(value: unknown, unit?: string): string {
  if (value === undefined || value === null) {
    return '—';
  }

  if (typeof value === 'number') {
    if (unit === 'USD' || unit === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (unit === 'percent') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toLocaleString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}
