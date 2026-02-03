/**
 * IllustrativeTraceSection - Exemplar path trace preview
 *
 * Shows a condensed view of the exemplar simulation path.
 * Fetches real trace data via wasmBridge.runDeterministicSimulation() using pathSeed.
 *
 * PFOS-E compliant: Shows uncertainty context, highlights potential issues.
 * Phase 2: Now fetches real trace data instead of generating fake milestones.
 */

import React, { useEffect, useCallback } from 'react';
import { SimulationPacketV0 } from '@/features/packet/types/packetSchema';
import { PacketSection } from '../PacketSection';
import { Text, Meta } from '@/components/ui/Typography';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';
import { wasmBridge } from '@/services/wasmBridge';
import { logger } from '@/utils/logger';

// =============================================================================
// TYPES
// =============================================================================

interface IllustrativeTraceSectionProps {
  packet: SimulationPacketV0;
  /** Callback when user wants to see full trace */
  onViewFullTrace?: () => void;
}

interface TraceMilestone {
  label: string;
  monthOffset: number;
  netWorth: number;
  description: string;
  highlight?: 'success' | 'warning' | 'danger';
}

// =============================================================================
// COMPONENT
// =============================================================================

export const IllustrativeTraceSection: React.FC<IllustrativeTraceSectionProps> = ({
  packet,
  onViewFullTrace,
}) => {
  const { traceRef, mcResults, id: packetId } = packet;

  // Access trace data from store
  const traceData = useAppStore((s) => s.getTraceData(packetId));
  const setTraceData = useAppStore((s) => s.setTraceData);

  // Fetch trace data when component mounts or traceRef changes
  const fetchTraceData = useCallback(async () => {
    if (!traceRef || !traceRef.pathSeed) {
      return;
    }

    // Check if already loaded or loading
    if (traceData?.status === 'loaded' || traceData?.status === 'loading') {
      return;
    }

    // Mark as loading
    setTraceData(packetId, {
      pathSeed: traceRef.pathSeed,
      status: 'loading',
    });

    try {
      logger.info('[IllustrativeTraceSection] Fetching trace data', {
        packetId,
        pathSeed: traceRef.pathSeed,
      });

      // Build minimal inputs for deterministic simulation
      // Use the same inputs that would have been used for the MC simulation
      const confirmedChanges = packet.scenarios[0]?.appliedChanges ?? [];
      const investableAssets = findChangeValue(confirmedChanges, 'investableAssets') || 500000;
      const annualSpending = findChangeValue(confirmedChanges, 'annualSpending') || 60000;
      const expectedIncome = findChangeValue(confirmedChanges, 'expectedIncome') || 0;
      const currentAge = findChangeValue(confirmedChanges, 'currentAge') || 35;

      const initialState = {
        currentAge,
        startYear: new Date().getFullYear(),
        initialCash: investableAssets * 0.1,
        initialAccounts: {
          cash: investableAssets * 0.1,
          taxable: {
            totalValue: investableAssets * 0.3,
            holdings: [{ assetClass: 'SPY', currentMarketValueTotal: investableAssets * 0.3 }],
          },
          tax_deferred: {
            totalValue: investableAssets * 0.6,
            holdings: [{ assetClass: 'SPY', currentMarketValueTotal: investableAssets * 0.6 }],
          },
          roth: { totalValue: 0, holdings: [] },
        },
      };

      const events: any[] = [];
      if (annualSpending > 0) {
        events.push({
          id: `expense-trace-${Date.now()}`,
          type: 'EXPENSE',
          monthOffset: 0,
          amount: annualSpending / 12,
          frequency: 'monthly',
          name: 'Living Expenses',
        });
      }
      if (expectedIncome > 0) {
        events.push({
          id: `income-trace-${Date.now()}`,
          type: 'INCOME',
          monthOffset: 0,
          amount: expectedIncome / 12,
          frequency: 'monthly',
          name: 'Expected Income',
        });
      }

      const config = {
        currentAge,
        simulationEndAge: currentAge + Math.ceil((packet.horizon.endMonth - packet.horizon.startMonth) / 12),
        withdrawalStrategy: 'TAX_EFFICIENT',
        stochasticConfig: {
          simulationMode: 'stochastic' as const,
          randomSeed: traceRef.pathSeed,
          cashFloor: 0,
        },
      };

      // Run deterministic simulation with the exemplar path seed
      const result = await wasmBridge.runDeterministicSimulation(
        initialState,
        events,
        config,
        { mode: 'stochastic', seed: traceRef.pathSeed }
      );

      // Cast to DeterministicPayload - the structure is compatible
      setTraceData(packetId, {
        pathSeed: traceRef.pathSeed,
        status: 'loaded',
        payload: result as any, // WASM results are compatible but have different type name
      });

      logger.info('[IllustrativeTraceSection] Trace data loaded', {
        packetId,
        monthsCount: result.monthlySnapshots?.length,
        finalNetWorth: result.finalNetWorth,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[IllustrativeTraceSection] Failed to fetch trace data', error);
      setTraceData(packetId, {
        pathSeed: traceRef.pathSeed,
        status: 'error',
        error: errorMessage,
      });
    }
  }, [packetId, traceRef, traceData?.status, setTraceData, packet]);

  useEffect(() => {
    fetchTraceData();
  }, [fetchTraceData]);

  // No trace reference available
  if (!traceRef) {
    return (
      <PacketSection
        title="ILLUSTRATIVE PATH"
        subtitle="Single path trace not available"
        defaultCollapsed
      >
        <div className="p-3 bg-areum-canvas rounded-md-areum border border-areum-border">
          <Text size="sm" color="secondary">
            No exemplar path was selected for this simulation.
            Run with trace enabled to see detailed month-by-month progression.
          </Text>
        </div>
      </PacketSection>
    );
  }

  // Generate milestones from real trace data or show loading/error state
  const milestones = traceData?.status === 'loaded' && traceData.payload
    ? generateMilestonesFromTracePayload(traceData.payload)
    : [];

  return (
    <PacketSection
      title="ILLUSTRATIVE PATH"
      subtitle={`Seed ${traceRef.pathSeed} • ${traceRef.selectionCriterion.replace(/_/g, ' ')}`}
      defaultCollapsed
    >
      <div className="space-y-4">
        {/* Disclaimer */}
        <div className="p-3 bg-areum-info-bg rounded-md-areum border border-areum-info-border">
          <Text size="xs" color="secondary">
            This shows ONE possible path from {mcResults?.numberOfRuns || 1000} simulations.
            The median (P50) outcome was selected to illustrate typical progression.
            Your actual results may vary significantly.
          </Text>
        </div>

        {/* Trace Info */}
        <div className="flex items-center gap-4 py-2 border-b border-areum-border">
          <div>
            <Meta>PATH SEED</Meta>
            <Text size="sm" weight="medium" className="font-mono">
              {traceRef.pathSeed}
            </Text>
          </div>
          <div>
            <Meta>SELECTION</Meta>
            <Text size="sm" weight="medium">
              {formatSelectionCriterion(traceRef.selectionCriterion)}
            </Text>
          </div>
          {traceData?.status === 'loaded' && traceData.payload && (
            <div>
              <Meta>FINAL NET WORTH</Meta>
              <Text size="sm" weight="medium">
                {formatCurrency(traceData.payload.finalNetWorth)}
              </Text>
            </div>
          )}
        </div>

        {/* Loading State */}
        {traceData?.status === 'loading' && (
          <div className="p-3 bg-areum-canvas rounded-md-areum border border-areum-border">
            <div className="flex items-center gap-2">
              <LoadingSpinner />
              <Text size="sm" color="secondary">
                Loading trace data...
              </Text>
            </div>
          </div>
        )}

        {/* Error State */}
        {traceData?.status === 'error' && (
          <div className="p-3 bg-areum-danger-bg rounded-md-areum border border-areum-danger-border">
            <Text size="sm" className="text-areum-danger">
              Failed to load trace data: {traceData.error}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTraceData}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Milestones from real trace data */}
        {traceData?.status === 'loaded' && milestones.length > 0 && (
          <div className="space-y-2">
            <Meta>KEY MILESTONES</Meta>
            <div className="space-y-2">
              {milestones.map((milestone, index) => (
                <MilestoneRow key={index} milestone={milestone} />
              ))}
            </div>
          </div>
        )}

        {/* View Full Trace Button */}
        {onViewFullTrace && (
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={onViewFullTrace}>
              <TraceIcon />
              <span className="ml-2">View Full Trace</span>
            </Button>
          </div>
        )}

        {/* Trace Not Loaded Notice */}
        {!onViewFullTrace && traceData?.status !== 'loading' && (
          <div className="p-3 bg-areum-canvas rounded-md-areum border border-areum-border">
            <Text size="sm" color="secondary">
              Full trace data available in the detailed simulation view.
            </Text>
          </div>
        )}
      </div>
    </PacketSection>
  );
};

// =============================================================================
// MILESTONE ROW
// =============================================================================

interface MilestoneRowProps {
  milestone: TraceMilestone;
}

const MilestoneRow: React.FC<MilestoneRowProps> = ({ milestone }) => {
  const highlightColors = {
    success: 'border-l-areum-success',
    warning: 'border-l-areum-warning',
    danger: 'border-l-areum-danger',
  };

  const borderClass = milestone.highlight
    ? `border-l-2 ${highlightColors[milestone.highlight]} pl-3`
    : 'pl-3 border-l-2 border-l-transparent';

  return (
    <div className={`py-2 ${borderClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <Text size="sm" weight="medium">
            {milestone.label}
          </Text>
          <Meta>Month {milestone.monthOffset}</Meta>
        </div>
        <Text size="sm" weight="semibold">
          {formatCurrency(milestone.netWorth)}
        </Text>
      </div>
      <Text size="xs" color="tertiary" className="mt-1">
        {milestone.description}
      </Text>
    </div>
  );
};

// =============================================================================
// ICONS
// =============================================================================

const TraceIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const LoadingSpinner: React.FC = () => (
  <svg
    className="w-4 h-4 animate-spin text-areum-accent"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSelectionCriterion(criterion: string): string {
  // Convert "median_terminal_wealth" to "Median Terminal Wealth"
  return criterion
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Find a value from confirmed changes by field path
 */
function findChangeValue(changes: any[], fieldName: string): number | null {
  const change = changes.find((c: any) => c.fieldPath?.includes(fieldName));
  return change?.newValue ?? null;
}

/**
 * Generate milestones from real trace payload
 *
 * Extracts key points from the actual simulation trace:
 * - Start (month 0)
 * - Yearly checkpoints
 * - End of simulation
 */
function generateMilestonesFromTracePayload(
  payload: any
): TraceMilestone[] {
  const milestones: TraceMilestone[] = [];
  const snapshots = payload.monthlySnapshots || [];

  if (snapshots.length === 0) {
    return [];
  }

  // Start milestone (month 0)
  const startSnapshot = snapshots[0];
  if (startSnapshot) {
    milestones.push({
      label: 'Simulation Start',
      monthOffset: startSnapshot.monthOffset || 0,
      netWorth: startSnapshot.netWorth || 0,
      description: 'Initial net worth at beginning of simulation',
    });
  }

  // Year 5 (month 60)
  const year5Index = Math.min(60, snapshots.length - 1);
  const year5Snapshot = snapshots[year5Index];
  if (year5Snapshot && year5Index > 0) {
    milestones.push({
      label: 'Year 5',
      monthOffset: year5Snapshot.monthOffset || year5Index,
      netWorth: year5Snapshot.netWorth || 0,
      description: '5-year checkpoint',
    });
  }

  // Year 10 (month 120)
  const year10Index = Math.min(120, snapshots.length - 1);
  const year10Snapshot = snapshots[year10Index];
  if (year10Snapshot && year10Index > year5Index) {
    milestones.push({
      label: 'Year 10',
      monthOffset: year10Snapshot.monthOffset || year10Index,
      netWorth: year10Snapshot.netWorth || 0,
      description: '10-year checkpoint',
    });
  }

  // Year 20 (month 240)
  const year20Index = Math.min(240, snapshots.length - 1);
  const year20Snapshot = snapshots[year20Index];
  if (year20Snapshot && year20Index > year10Index) {
    milestones.push({
      label: 'Year 20',
      monthOffset: year20Snapshot.monthOffset || year20Index,
      netWorth: year20Snapshot.netWorth || 0,
      description: '20-year checkpoint',
    });
  }

  // End milestone
  const endSnapshot = snapshots[snapshots.length - 1];
  if (endSnapshot && snapshots.length > 1) {
    const startNetWorth = startSnapshot?.netWorth || 0;
    const endNetWorth = endSnapshot.netWorth || 0;
    const highlight = endNetWorth > startNetWorth ? 'success' : (endNetWorth <= 0 ? 'danger' : 'warning');

    milestones.push({
      label: 'Simulation End',
      monthOffset: endSnapshot.monthOffset || snapshots.length - 1,
      netWorth: endNetWorth,
      description: `Final net worth at end of simulation${payload.isBankrupt ? ' (DEPLETED)' : ''}`,
      highlight,
    });
  }

  // Add bankruptcy warning if applicable
  if (payload.isBankrupt && payload.bankruptcyMonth !== undefined) {
    milestones.push({
      label: 'Depletion Event',
      monthOffset: payload.bankruptcyMonth,
      netWorth: 0,
      description: 'Portfolio depleted in this path',
      highlight: 'danger',
    });
  }

  return milestones;
}

export default IllustrativeTraceSection;
