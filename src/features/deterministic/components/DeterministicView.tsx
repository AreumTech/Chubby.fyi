/**
 * DeterministicView - Main container for deterministic simulation mode
 *
 * Shows a single-path projection with constant growth rates, providing
 * a detailed spreadsheet view with progressive disclosure of event details.
 *
 * Supports two return modes:
 * - Deterministic: Uses mean expected returns (smooth, baseline projection)
 * - Stochastic: Uses seeded random returns (one illustrative path with market variation)
 */

import React, { useState, useCallback } from 'react';
import { dataService } from '@/services/dataService';
import { runDeterministicSimulation } from '@/services/simulationService';
import { wasmBridge } from '@/services/wasmBridge';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui';
import { MultiSheetSpreadsheet } from './MultiSheetSpreadsheet';
import { MonteCarloSummaryPanel } from './MonteCarloSummaryPanel';
import { formatCurrencyShort } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import { useAppStore } from '@/store/appStore';
import type { MonteCarloResults } from '@/types/api/payload';

/** Default seed for reproducible stochastic simulations */
const DEFAULT_STOCHASTIC_SEED = 1234;

/** Default number of MC paths (keep low to avoid OOM) */
const DEFAULT_MC_PATHS = 10;

/**
 * Inline assumptions subtitle showing constant growth rates
 */
const AssumptionsSubtitle: React.FC = () => {
  const assumptions = dataService.getDeterministicAssumptions();

  if (!assumptions) return null;

  const formatRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  return (
    <div className="text-xs-areum text-areum-text-tertiary mb-3">
      Assumes annual returns: {formatRate(assumptions.stockReturnAnnual)} stocks · {formatRate(assumptions.bondReturnAnnual)} bonds · {formatRate(assumptions.inflationAnnual)} inflation
    </div>
  );
};

/**
 * Returns mode toggle component
 * Switches between deterministic (mean) and stochastic (seeded random) returns
 */
const ReturnsModeToggle: React.FC<{
  mode: 'deterministic' | 'stochastic';
  onModeChange: (mode: 'deterministic' | 'stochastic') => void;
  disabled?: boolean;
}> = ({ mode, onModeChange, disabled }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs-areum text-areum-text-tertiary">Returns:</span>
      <div className="flex border border-areum-border rounded-sm-areum overflow-hidden">
        <button
          onClick={() => onModeChange('deterministic')}
          disabled={disabled}
          className={`px-2 py-1 text-xs-areum font-medium transition-colors ${
            mode === 'deterministic'
              ? 'bg-areum-accent text-white'
              : 'bg-areum-surface text-areum-text-secondary hover:bg-areum-canvas'
          } disabled:opacity-50`}
          title="Use mean expected returns (smooth baseline projection)"
        >
          Mean
        </button>
        <button
          onClick={() => onModeChange('stochastic')}
          disabled={disabled}
          className={`px-2 py-1 text-xs-areum font-medium transition-colors ${
            mode === 'stochastic'
              ? 'bg-areum-accent text-white'
              : 'bg-areum-surface text-areum-text-secondary hover:bg-areum-canvas'
          } disabled:opacity-50`}
          title="Use seeded random returns (one illustrative path with market variation)"
        >
          Stochastic
        </button>
      </div>
    </div>
  );
};

/**
 * Main deterministic view component
 */
export const DeterministicView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcResults, setMcResults] = useState<MonteCarloResults | null>(null);

  // Get and update config from store
  const config = useAppStore((state) => state.config);
  const setConfig = useAppStore((state) => state.setConfig);
  const getActiveScenario = useAppStore((state) => state.getActiveScenario);
  const getEventLedger = useAppStore((state) => state.getEventLedger);

  // Current returns mode from config (default to deterministic)
  const currentMode = config.stochasticConfig?.simulationMode || 'deterministic';

  const hasDeterministicData = dataService.hasDeterministicData();
  const deterministicPayload = dataService.getDeterministicPayload();

  // Handle mode change - updates config and triggers re-run
  const handleModeChange = useCallback((newMode: 'deterministic' | 'stochastic') => {
    setConfig((prev) => ({
      ...prev,
      stochasticConfig: {
        ...prev.stochasticConfig,
        simulationMode: newMode,
        // Set seed for stochastic mode (enables reproducibility)
        randomSeed: newMode === 'stochastic' ? DEFAULT_STOCHASTIC_SEED : 0,
      },
    }));
  }, [setConfig]);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const modeLabel = currentMode === 'stochastic' ? 'stochastic (seeded)' : 'deterministic (mean)';
      logger.info(`[DeterministicView] Running ${modeLabel} simulation...`);
      await runDeterministicSimulation();
      logger.info('[DeterministicView] Simulation completed');
    } catch (err: any) {
      logger.error('[DeterministicView] Simulation failed:', err);
      setError(err?.message || 'Simulation failed');
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Run Monte Carlo simulation using current scenario data
   * Returns MC results with percentiles and breach probabilities
   *
   * Uses wasmBridge for all WASM communication (see docs/WASM_BRIDGE_MIGRATION.md)
   */
  const handleRunMonteCarlo = useCallback(async (): Promise<MonteCarloResults> => {
    const activeScenario = getActiveScenario();
    if (!activeScenario?.initialState) {
      throw new Error('No active scenario');
    }

    const initialState = activeScenario.initialState;
    const eventLedger = getEventLedger();

    // Use wasmBridge - all input normalization happens in the bridge
    const result = await wasmBridge.runMonteCarloSimulation(
      initialState,
      eventLedger,
      config,
      DEFAULT_MC_PATHS
    );

    // Store results for display
    setMcResults(result as MonteCarloResults);
    return result as MonteCarloResults;
  }, [config, getActiveScenario, getEventLedger]);

  if (!hasDeterministicData || !deterministicPayload) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-areum-text-secondary">Run a deterministic simulation to see detailed projections.</p>
        <Button
          onClick={handleRunSimulation}
          disabled={isRunning}
          variant="primary"
        >
          {isRunning ? 'Running...' : 'Run Simulation'}
        </Button>
        {error && (
          <p className="text-areum-danger text-sm-areum">{error}</p>
        )}
      </div>
    );
  }

  const yearlyData = deterministicPayload.yearlyData || [];
  const eventTrace = deterministicPayload.eventTrace || [];

  // Calculate growth metrics
  const startNetWorth = yearlyData.length > 0 ? yearlyData[0].startNetWorth : 0;
  const totalGrowth = deterministicPayload.finalNetWorth - startNetWorth;

  // Calculate CAGR (Compound Annual Growth Rate) - more meaningful than total %
  const years = yearlyData.length > 0 ? yearlyData.length : 1;
  const cagr = startNetWorth > 0 && deterministicPayload.finalNetWorth > 0
    ? (Math.pow(deterministicPayload.finalNetWorth / startNetWorth, 1 / years) - 1) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Section - Matching GoalAnalysisSection style */}
      <Section number={1} title="PROJECTION SUMMARY" className="mb-4" dense>
        <AssumptionsSubtitle />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-3 bg-areum-canvas border border-areum-border rounded-sm-areum">
            <div className="text-xs-areum text-areum-text-tertiary uppercase tracking-wide mb-1">Starting</div>
            <div className="text-md-areum font-semibold font-mono text-areum-text-primary">
              {formatCurrencyShort(startNetWorth)}
            </div>
          </div>
          <div className="p-3 bg-areum-canvas border border-areum-border rounded-sm-areum">
            <div className="text-xs-areum text-areum-text-tertiary uppercase tracking-wide mb-1">Final Net Worth</div>
            <div className="text-md-areum font-semibold font-mono text-areum-text-primary">
              {formatCurrencyShort(deterministicPayload.finalNetWorth)}
            </div>
          </div>
          <div className="p-3 bg-areum-canvas border border-areum-border rounded-sm-areum">
            <div className="text-xs-areum text-areum-text-tertiary uppercase tracking-wide mb-1">Total Growth</div>
            <div className={`text-md-areum font-semibold font-mono ${totalGrowth >= 0 ? 'text-areum-success' : 'text-areum-danger'}`}>
              {totalGrowth >= 0 ? '+' : ''}{formatCurrencyShort(totalGrowth)}
            </div>
            <div className="text-xs-areum text-areum-text-tertiary">
              {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%/yr
            </div>
          </div>
          <div className="p-3 bg-areum-canvas border border-areum-border rounded-sm-areum">
            <div className="text-xs-areum text-areum-text-tertiary uppercase tracking-wide mb-1">Status</div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${deterministicPayload.isBankrupt ? 'bg-areum-danger' : 'bg-areum-success'}`} />
              <span className={`text-md-areum font-semibold ${deterministicPayload.isBankrupt ? 'text-areum-danger' : 'text-areum-success'}`}>
                {deterministicPayload.isBankrupt ? 'Insolvent' : 'Solvent'}
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* Simulation Trace Spreadsheet with Source Events */}
      <Section number={2} title="DETAILED PROJECTION" className="mb-4" dense>
        {/* Controls row */}
        <div className="flex items-center justify-between mb-2">
          <ReturnsModeToggle
            mode={currentMode as 'deterministic' | 'stochastic'}
            onModeChange={handleModeChange}
            disabled={isRunning}
          />
          <div className="flex items-center gap-3">
            <div className="text-xs-areum text-areum-text-tertiary">
              {yearlyData.length} years · {eventTrace.length.toLocaleString()} events
            </div>
            <button
              onClick={handleRunSimulation}
              disabled={isRunning}
              className="px-2 py-1 text-xs-areum font-medium text-areum-accent hover:bg-areum-accent/10 border border-areum-accent/30 rounded-sm-areum transition-colors disabled:opacity-50"
            >
              {isRunning ? 'Running...' : 'Re-run'}
            </button>
          </div>
        </div>

        <MultiSheetSpreadsheet
          comprehensiveStates={deterministicPayload.comprehensiveMonthlyStates}
          assumptions={deterministicPayload.assumptions}
          eventTrace={eventTrace}
          simulationMode={deterministicPayload.simulationMode}
          seed={deterministicPayload.seed}
          modelDescription={deterministicPayload.modelDescription}
          realizedPathVariables={deterministicPayload.realizedPathVariables}
        />
      </Section>

      {/* Monte Carlo Summary Panel */}
      <MonteCarloSummaryPanel
        numberOfRuns={DEFAULT_MC_PATHS}
        onRunMonteCarlo={handleRunMonteCarlo}
        results={mcResults}
      />
    </div>
  );
};
