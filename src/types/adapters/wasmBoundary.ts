/**
 * WASM Boundary Adapters
 *
 * Bridges frontend complexity with WASM simplicity.
 * Maintains type safety while allowing rich frontend types.
 */

// Generated types (WASM contract)
import type {
  FinancialEvent as WasmFinancialEvent,
  MonthlyData as WasmMonthlyData,
  SimulationInput as WasmSimulationInput
} from '../generated';

// Frontend types (UI complexity)
import type { FinancialEvent as FrontendFinancialEvent } from '../events';
import type { StandardAccountType } from '../accountTypes';

/**
 * ACCOUNTTYPE ADAPTER
 *
 * Converts between frontend account types and WASM account structure.
 * WASM uses: { taxable, tax_deferred, roth, cash }
 * Frontend uses: StandardAccountType enum
 */
export function adaptAccountTypeForWasm(
  accountType: StandardAccountType
): 'taxable' | 'tax_deferred' | 'roth' | 'cash' {
  const wasmAccountMap: Record<StandardAccountType, 'taxable' | 'tax_deferred' | 'roth' | 'cash'> = {
    cash: 'cash',
    taxable: 'taxable',
    tax_deferred: 'tax_deferred',
    roth: 'roth',
    hsa: 'tax_deferred', // HSA maps to tax_deferred in WASM
    '529': 'taxable'     // 529 maps to taxable in WASM
  };

  return wasmAccountMap[accountType];
}

/**
 * FINANCIALEVENT ADAPTER
 *
 * Converts frontend event (65+ complex types) to WASM event (40 simple types).
 * Preserves preprocessing layer - don't break existing event system.
 */
export function adaptEventForWasm(event: FrontendFinancialEvent): WasmFinancialEvent {
  // Extract base fields that exist in both systems
  const baseEvent: WasmFinancialEvent = {
    id: event.id,
    type: event.type, // Type enum should match between systems
    description: event.description,
    priority: event.priority,
    monthOffset: event.monthOffset
  };

  // Add optional fields if they exist
  if ('amount' in event && event.amount !== undefined) {
    baseEvent.amount = event.amount;
  }

  if ('accountType' in event && event.accountType) {
    baseEvent.accountType = event.accountType;
  }

  if ('annualGrowthRate' in event && event.annualGrowthRate !== undefined) {
    baseEvent.annualGrowthRate = event.annualGrowthRate;
  }

  // Add other WASM-compatible fields as needed
  if ('startDateOffset' in event && event.startDateOffset !== undefined) {
    baseEvent.startDateOffset = event.startDateOffset;
  }

  if ('endDateOffset' in event && event.endDateOffset !== undefined) {
    baseEvent.endDateOffset = event.endDateOffset;
  }

  return baseEvent;
}

/**
 * MONTHLYDATA ADAPTER
 *
 * Ensures WASM output structure matches expected format.
 * MonthlyData from WASM should already match generated types.
 */
export function validateWasmMonthlyData(data: unknown): data is WasmMonthlyData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'monthOffset' in data &&
    'netWorth' in data &&
    'cashFlow' in data &&
    'accounts' in data
  );
}

/**
 * TYPE COMPATIBILITY CHECKS
 *
 * Runtime validation that frontend → WASM adaptation is working.
 */
export function isWasmCompatibleEvent(event: FrontendFinancialEvent): boolean {
  try {
    const adapted = adaptEventForWasm(event);
    const result = (
      typeof adapted.id === 'string' &&
      typeof adapted.type === 'string' &&
      typeof adapted.description === 'string' &&
      typeof adapted.priority === 'number' &&
      typeof adapted.monthOffset === 'number'
    );

    // Debug logging removed - tests should pass now

    return result;
  } catch {
    return false;
  }
}

/**
 * WASM BOUNDARY GUARD
 *
 * Ensures data crossing WASM boundary is compatible.
 */
export function assertWasmBoundary<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
  context: string
): T {
  if (!validator(data)) {
    throw new Error(`WASM boundary violation in ${context}: Invalid data structure`);
  }
  return data;
}