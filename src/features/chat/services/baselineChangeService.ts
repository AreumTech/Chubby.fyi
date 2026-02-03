/**
 * Baseline Change Service
 *
 * Applies confirmed baseline_candidate changes to the user's plan.
 * Maps chat-originated changes to the appropriate planSlice updates.
 *
 * PFOS-E Safety Rules:
 * - Explicit application: Only baseline_candidate scoped changes are applied
 * - Auditable: Logs all changes applied to baseline
 * - No silent defaults: Unknown field paths are logged and skipped
 */

import { ConfirmedChange } from '@/features/chat/types/draftChangeSchema';
import { InitialStateEvent } from '@/types/events/initial-state';
import { AssetClass } from '@/types/common';
import { Holding } from '@/types/state/account';
import { logger } from '@/utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ApplyBaselineChangesParams {
  confirmedChanges: ConfirmedChange[];
  currentInitialState: InitialStateEvent;
  setInitialState: (state: InitialStateEvent) => void;
}

export interface ApplyBaselineResult {
  applied: number;
  skipped: number;
  details: Array<{
    fieldPath: string[];
    success: boolean;
    reason?: string;
  }>;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create a Holding object with sensible defaults for Bronze tier
 */
function createHolding(
  value: number,
  assetClass: AssetClass = AssetClass.US_STOCKS_TOTAL_MARKET
): Holding {
  const pricePerUnit = 500; // Simplified price per share
  const quantity = Math.floor(value / pricePerUnit);
  const actualValue = quantity * pricePerUnit;

  return {
    id: `holding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    assetClass,
    assetSymbolOrIdentifier: assetClass === AssetClass.US_STOCKS_TOTAL_MARKET ? 'VTI' : 'CASH',
    quantity,
    purchasePricePerUnit: pricePerUnit,
    costBasisTotal: actualValue * 0.8, // Assume 20% unrealized gains
    currentMarketPricePerUnit: pricePerUnit,
    currentMarketValueTotal: actualValue,
    unrealizedGainLossTotal: actualValue * 0.2,
    openTransactionDate: new Date().toISOString().split('T')[0],
  };
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Apply confirmed baseline_candidate changes to the user's plan
 *
 * This is called after successful simulation to persist changes
 * that the user marked as baseline updates.
 */
export function applyBaselineChanges(
  params: ApplyBaselineChangesParams
): ApplyBaselineResult {
  const { confirmedChanges, currentInitialState, setInitialState } = params;

  // Filter for baseline_candidate scope only
  const baselineChanges = confirmedChanges.filter(
    (c) => c.scope === 'baseline_candidate'
  );

  if (baselineChanges.length === 0) {
    logger.debug('[BaselineChangeService] No baseline_candidate changes to apply');
    return { applied: 0, skipped: 0, details: [] };
  }

  logger.info(
    `[BaselineChangeService] Applying ${baselineChanges.length} baseline changes`
  );

  const result: ApplyBaselineResult = {
    applied: 0,
    skipped: 0,
    details: [],
  };

  // Clone the initial state for modifications
  let updatedState = { ...currentInitialState };
  let stateModified = false;

  for (const change of baselineChanges) {
    const fieldName = change.fieldPath[0]; // Primary field name

    try {
      switch (fieldName) {
        case 'investableAssets': {
          const totalAssets = Number(change.newValue);
          if (isNaN(totalAssets)) {
            throw new Error(`Invalid investableAssets value: ${change.newValue}`);
          }

          // Distribute across accounts (Bronze tier simple allocation)
          // 10% cash, 30% taxable, 60% tax_deferred
          const cashAmount = totalAssets * 0.1;
          const taxableAmount = totalAssets * 0.3;
          const taxDeferredAmount = totalAssets * 0.6;

          // Create proper Holding objects
          const taxableHolding = createHolding(taxableAmount, AssetClass.US_STOCKS_TOTAL_MARKET);
          const taxDeferredHolding = createHolding(taxDeferredAmount, AssetClass.US_STOCKS_TOTAL_MARKET);
          // Tax-deferred has no unrealized gains (pre-tax)
          taxDeferredHolding.costBasisTotal = taxDeferredHolding.currentMarketValueTotal;
          taxDeferredHolding.unrealizedGainLossTotal = 0;

          updatedState = {
            ...updatedState,
            initialCash: cashAmount,
            initialAccounts: {
              ...updatedState.initialAccounts,
              taxable: [taxableHolding],
              tax_deferred: [taxDeferredHolding],
              roth: updatedState.initialAccounts.roth || [],
            },
          };
          stateModified = true;

          logger.info('[BaselineChangeService] Applied investableAssets', {
            total: totalAssets,
            cash: cashAmount,
            taxable: taxableAmount,
            taxDeferred: taxDeferredAmount,
          });

          result.applied++;
          result.details.push({
            fieldPath: change.fieldPath,
            success: true,
          });
          break;
        }

        case 'currentAge': {
          const age = Number(change.newValue);
          if (isNaN(age) || age < 18 || age > 100) {
            throw new Error(`Invalid currentAge value: ${change.newValue}`);
          }

          updatedState = {
            ...updatedState,
            currentAge: age,
          };
          stateModified = true;

          logger.info('[BaselineChangeService] Applied currentAge', { age });
          result.applied++;
          result.details.push({
            fieldPath: change.fieldPath,
            success: true,
          });
          break;
        }

        case 'annualSpending':
        case 'expectedIncome': {
          // PFOS-E Phase 3: These require creating events in the event ledger
          // Explicitly blocked with clear user-facing message
          // Values ARE used for this simulation run, but don't persist to baseline
          logger.info(
            `[BaselineChangeService] ${fieldName} used for simulation but not persisted`,
            { value: change.newValue }
          );
          result.skipped++;
          result.details.push({
            fieldPath: change.fieldPath,
            success: false,
            reason: `${fieldName === 'annualSpending' ? 'Spending' : 'Income'} persistence not yet supported. Value used for this simulation only.`,
          });
          break;
        }

        default: {
          logger.warn(
            `[BaselineChangeService] Unknown field path: ${change.fieldPath.join('.')}`
          );
          result.skipped++;
          result.details.push({
            fieldPath: change.fieldPath,
            success: false,
            reason: `Unknown field: ${fieldName}`,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        `[BaselineChangeService] Failed to apply change: ${change.fieldPath.join('.')}`,
        error
      );
      result.skipped++;
      result.details.push({
        fieldPath: change.fieldPath,
        success: false,
        reason: message,
      });
    }
  }

  // Apply the accumulated state changes
  if (stateModified) {
    setInitialState(updatedState);
    logger.info('[BaselineChangeService] Initial state updated', {
      applied: result.applied,
      skipped: result.skipped,
    });
  }

  return result;
}

/**
 * Check if there are any baseline_candidate changes to apply
 */
export function hasBaselineChanges(confirmedChanges: ConfirmedChange[]): boolean {
  return confirmedChanges.some((c) => c.scope === 'baseline_candidate');
}

/**
 * Fields that can be persisted to baseline (supported)
 */
export const SUPPORTED_BASELINE_FIELDS = ['investableAssets', 'currentAge'] as const;

/**
 * Fields that are used for simulation but NOT persisted to baseline
 * These require event creation in the event ledger (future work)
 */
export const BLOCKED_BASELINE_FIELDS = ['annualSpending', 'expectedIncome'] as const;

/**
 * Check if a field is blocked from baseline persistence
 */
export function isBlockedBaselineField(fieldName: string): boolean {
  return (BLOCKED_BASELINE_FIELDS as readonly string[]).includes(fieldName);
}

/**
 * Get a user-friendly message explaining why a field is blocked
 */
export function getBlockedFieldMessage(fieldName: string): string | null {
  if (fieldName === 'annualSpending') {
    return 'Spending persistence not yet supported. Value will be used for this simulation only.';
  }
  if (fieldName === 'expectedIncome') {
    return 'Income persistence not yet supported. Value will be used for this simulation only.';
  }
  return null;
}

export default {
  applyBaselineChanges,
  hasBaselineChanges,
  isBlockedBaselineField,
  getBlockedFieldMessage,
  SUPPORTED_BASELINE_FIELDS,
  BLOCKED_BASELINE_FIELDS,
};
