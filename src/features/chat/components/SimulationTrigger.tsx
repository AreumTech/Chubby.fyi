/**
 * SimulationTrigger - "Run Simulation" button with state feedback
 *
 * Shows different states based on the draft change state machine:
 * - Ready to run (with confirmed changes)
 * - Running (loading spinner)
 * - Complete (success message)
 * - Error (error message with retry)
 */

import React, { useCallback, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Text, Meta } from '@/components/ui/Typography';
import { Input } from '@/components/ui/input';
import { getStateDescription } from '@/features/chat/types/draftChangeStateMachine';
import { DataTier, PacketBuildRequest } from '@/features/packet/types/packetSchema';
import { runSimulation } from '@/features/packet/services/packetBuildService';
import {
  applyBaselineChanges,
  hasBaselineChanges,
} from '@/features/chat/services/baselineChangeService';
import { ConfirmedChange } from '@/features/chat/types/draftChangeSchema';

// =============================================================================
// TYPES
// =============================================================================

interface SimulationTriggerProps {
  /** Called when simulation starts */
  onSimulationStart?: () => void;
  /** Called when simulation completes successfully */
  onSimulationComplete?: (packetId: string) => void;
  /** Called when simulation fails */
  onSimulationError?: (error: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const SimulationTrigger: React.FC<SimulationTriggerProps> = ({
  onSimulationStart,
  onSimulationComplete,
  onSimulationError,
}) => {
  const draftChangeState = useAppStore((s) => s.draftChangeState);
  const confirmedChanges = useAppStore((s) => s.confirmedChanges);
  const canTrigger = useAppStore((s) => s.canTriggerSimulation());
  const startSimulation = useAppStore((s) => s.startSimulation);
  const simulationComplete = useAppStore((s) => s.simulationComplete);
  const simulationError = useAppStore((s) => s.simulationError);
  const resetState = useAppStore((s) => s.resetDraftChangeState);
  const createPacket = useAppStore((s) => s.createPacket);

  // Plan slice access for baseline changes
  const getActiveScenario = useAppStore((s) => s.getActiveScenario);
  const setInitialState = useAppStore((s) => s.setInitialState);

  // Seed control for reproducibility testing
  const [customSeed, setCustomSeed] = useState<string>('');
  const [showSeedInput, setShowSeedInput] = useState(false);

  // Generate a random seed
  const generateRandomSeed = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 2147483647);
    setCustomSeed(newSeed.toString());
    return newSeed;
  }, []);

  const handleRunSimulation = useCallback(async () => {
    // DEBUG: Immediate console.log
    console.log('[PFOS-E DEBUG] handleRunSimulation clicked!');

    try {
      // Transition to SIMULATING state
      startSimulation();
      onSimulationStart?.();

      // Derive metadata from confirmed changes
      const currentAge = deriveCurrentAge(confirmedChanges) || 35;
      // TESTING: Short horizon until worker pool is wired
      const simulationEndAge = currentAge + 10; // 10 years for testing
      const horizonMonths = 120; // 10 years = 120 months

      // Use custom seed if provided, otherwise generate random
      const seed = customSeed && !isNaN(parseInt(customSeed, 10))
        ? parseInt(customSeed, 10)
        : Math.floor(Math.random() * 2147483647);

      // Compute baseline hash from confirmed changes for replay verification
      const baselineHash = computeBaselineHash(confirmedChanges);

      // Derive data tier from completeness of confirmed changes
      const dataTier = deriveDataTier(confirmedChanges);

      // Build the request from confirmed changes
      // PFOS-E: startYear is required for determinism (no Date.now())
      // Extract from confirmedChanges or fail loudly
      const startYearChange = confirmedChanges.find(
        c => c.fieldPath.at(-1) === 'startYear'
      );
      if (!startYearChange || typeof startYearChange.newValue !== 'number') {
        throw new Error(
          'PFOS-E: startYear is required for deterministic simulation. ' +
          'Add a confirmed change with fieldPath ending in "startYear".'
        );
      }
      const startYear = startYearChange.newValue as number;

      const request: PacketBuildRequest = {
        baselineHash,
        confirmedChanges,
        scenarios: [
          {
            id: 'baseline',
            label: 'BASELINE',
            description: 'Current trajectory',
            changeOverrides: [],
          },
        ],
        seed,
        startYear,
        horizon: { startMonth: 0, endMonth: horizonMonths },
        question: 'What tends to happen under these assumptions?',
        dataTier,
        mcPaths: 5, // TESTING: Bare minimum until worker pool is wired
      };

      // Run simulation via packetBuildService
      const result = await runSimulation(request);

      if (!result.success || !result.mcResults) {
        throw new Error(result.error || 'Simulation failed');
      }

      // Create packet via store (single source of truth for ID)
      // PFOS-E Phase 1: Now passes blockedOutputs from simulation result
      if (!result.engineInputsHash) {
        throw new Error(
          'PFOS-E: engineInputsHash is required from simulation result. ' +
          'Cannot fall back to Date.now() - breaks determinism.'
        );
      }
      const packetId = createPacket({
        request,
        mcResults: result.mcResults,
        engineInputsHash: result.engineInputsHash,
        blockedOutputs: result.blockedOutputs,
      });

      // Apply baseline_candidate changes to the user's plan
      if (hasBaselineChanges(confirmedChanges)) {
        const activeScenario = getActiveScenario();
        if (activeScenario) {
          applyBaselineChanges({
            confirmedChanges,
            currentInitialState: activeScenario.initialState,
            setInitialState,
          });
        }
      }

      // Complete with the real packet ID from packetSlice
      simulationComplete(packetId);
      onSimulationComplete?.(packetId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Simulation failed';
      simulationError(errorMessage);
      onSimulationError?.(errorMessage);
    }
  }, [
    startSimulation,
    simulationComplete,
    simulationError,
    confirmedChanges,
    createPacket,
    getActiveScenario,
    setInitialState,
    onSimulationStart,
    onSimulationComplete,
    onSimulationError,
    customSeed,
  ]);

  const handleRetry = useCallback(() => {
    resetState();
  }, [resetState]);

  // Render based on state
  const stateType = draftChangeState.type;

  if (stateType === 'IDLE') {
    return (
      <Card compact className="text-center">
        <Text size="sm" color="secondary">
          Enter your financial information to run a simulation
        </Text>
      </Card>
    );
  }

  if (stateType === 'SIMULATING') {
    return (
      <Card compact>
        <div className="flex items-center justify-center gap-3 py-2">
          <LoadingSpinner />
          <Text size="sm" weight="medium">
            Running simulation...
          </Text>
        </div>
      </Card>
    );
  }

  if (stateType === 'READY') {
    const packetId = draftChangeState.packetId;
    return (
      <Card accent="left" accentColor="success" compact>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SuccessIcon />
            <div>
              <Text size="sm" weight="medium">
                Simulation Complete
              </Text>
              <Meta className="font-mono">{packetId}</Meta>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            New Simulation
          </Button>
        </div>
      </Card>
    );
  }

  if (stateType === 'ERROR') {
    return (
      <Card accent="left" accentColor="danger" compact>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ErrorIcon />
            <div>
              <Text size="sm" weight="medium" className="text-areum-danger">
                Simulation Failed
              </Text>
              <Meta>{draftChangeState.error}</Meta>
            </div>
          </div>
          {draftChangeState.recoverable && (
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // EDITING or CONFIRMING state
  return (
    <Card compact>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Text size="sm" color="secondary">
              {confirmedChanges.length} change{confirmedChanges.length !== 1 ? 's' : ''} confirmed
            </Text>
            <Meta>{getStateDescription(draftChangeState)}</Meta>
          </div>
          <Button
            onClick={handleRunSimulation}
            disabled={!canTrigger}
            className="min-w-[140px]"
          >
            <PlayIcon />
            <span className="ml-2">Run Simulation</span>
          </Button>
        </div>

        {/* Seed Control for Reproducibility Testing */}
        <div className="pt-2 border-t border-areum-border">
          <button
            type="button"
            onClick={() => setShowSeedInput(!showSeedInput)}
            className="flex items-center gap-1 text-xs text-areum-text-secondary hover:text-areum-text-primary"
          >
            <SeedIcon />
            <span>Seed control</span>
            <span className="text-areum-text-tertiary">
              {showSeedInput ? '▲' : '▼'}
            </span>
          </button>

          {showSeedInput && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="text"
                value={customSeed}
                onChange={(e) => setCustomSeed(e.target.value)}
                placeholder="Enter seed (or leave empty for random)"
                className="flex-1 h-8 text-xs font-mono"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={generateRandomSeed}
                className="h-8 text-xs"
              >
                🎲 Random
              </Button>
            </div>
          )}

          {customSeed && (
            <Meta className="mt-1 font-mono">
              Seed: {customSeed}
            </Meta>
          )}
        </div>
      </div>
    </Card>
  );
};

// =============================================================================
// ICONS
// =============================================================================

const LoadingSpinner: React.FC = () => (
  <svg
    className="w-5 h-5 animate-spin text-areum-accent"
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

const PlayIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const SuccessIcon: React.FC = () => (
  <svg className="w-5 h-5 text-areum-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg className="w-5 h-5 text-areum-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SeedIcon: React.FC = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
);

// =============================================================================
// HELPER FUNCTIONS - Metadata Derivation
// =============================================================================

/**
 * Derive current age from confirmed changes
 */
function deriveCurrentAge(confirmedChanges: ConfirmedChange[]): number | null {
  const ageChange = confirmedChanges.find(c => c.fieldPath.includes('currentAge'));
  if (ageChange && typeof ageChange.newValue === 'number') {
    return ageChange.newValue;
  }
  return null;
}

/**
 * Compute baseline hash from confirmed changes for replay verification
 */
function computeBaselineHash(confirmedChanges: ConfirmedChange[]): string {
  const hashInput = JSON.stringify(
    confirmedChanges.map(c => ({
      fieldPath: c.fieldPath,
      newValue: c.newValue,
    }))
  );

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `baseline-${Math.abs(hash).toString(16)}`;
}

/**
 * Derive data tier from completeness of confirmed changes
 *
 * Bronze: Has investableAssets (minimal)
 * Silver: Has investableAssets + spending + income + age
 * Gold: Full profile (not implemented yet)
 */
function deriveDataTier(confirmedChanges: ConfirmedChange[]): DataTier {
  // Extract the last element of each fieldPath (the actual field name)
  // fieldPath structure: ['profile', 'investableAssets'] → 'investableAssets'
  const fields = new Set(
    confirmedChanges.map(c => c.fieldPath.at(-1)).filter(Boolean)
  );

  // Check for Silver tier fields
  const hasSilverFields = (
    fields.has('investableAssets') &&
    fields.has('annualSpending') &&
    fields.has('expectedIncome') &&
    fields.has('currentAge')
  );

  if (hasSilverFields) {
    return 'silver';
  }

  // Default to Bronze
  return 'bronze';
}

export default SimulationTrigger;
