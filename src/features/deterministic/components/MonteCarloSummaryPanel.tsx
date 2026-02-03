/**
 * MonteCarloSummaryPanel - Displays MC simulation summary stats
 *
 * Shows P5/P50/P95 percentiles, breach probability, and exemplar path reference
 * per CHAT.md spec sections 10.2-10.4
 */
import React, { useState, useCallback } from 'react';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui';
import { formatCurrencyShort } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import type { MonteCarloResults } from '@/types/api/payload';

interface MonteCarloSummaryPanelProps {
  /** Number of MC paths to run */
  numberOfRuns?: number;
  /** Callback to trigger MC simulation */
  onRunMonteCarlo?: () => Promise<MonteCarloResults>;
  /** Pre-loaded results (optional) */
  results?: MonteCarloResults | null;
}

/**
 * Format a percentile row: "P5: $X / P50: $Y / P95: $Z"
 */
const PercentileRow: React.FC<{
  label: string;
  p5?: number;
  p50?: number;
  p95?: number;
}> = ({ label, p5, p50, p95 }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-areum-border-light last:border-0">
    <span className="text-sm-areum text-areum-text-secondary">{label}</span>
    <div className="flex gap-4 text-sm-areum font-mono">
      <span className="text-areum-text-tertiary">P5: {p5 != null ? formatCurrencyShort(p5) : '—'}</span>
      <span className="text-areum-text-primary font-medium">P50: {p50 != null ? formatCurrencyShort(p50) : '—'}</span>
      <span className="text-areum-text-tertiary">P95: {p95 != null ? formatCurrencyShort(p95) : '—'}</span>
    </div>
  </div>
);

/**
 * Format probability as percentage
 */
const formatPct = (value?: number): string => {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
};

export const MonteCarloSummaryPanel: React.FC<MonteCarloSummaryPanelProps> = ({
  numberOfRuns = 100,
  onRunMonteCarlo,
  results: preloadedResults,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<MonteCarloResults | null>(preloadedResults || null);
  const [error, setError] = useState<string | null>(null);

  const handleRunMonteCarlo = useCallback(async () => {
    if (!onRunMonteCarlo) return;

    setIsRunning(true);
    setError(null);
    try {
      logger.info(`[MC] Running Monte Carlo with ${numberOfRuns} paths...`);
      const mcResults = await onRunMonteCarlo();
      setResults(mcResults);
      logger.info(`[MC] Complete: P50=${formatCurrencyShort(mcResults.finalNetWorthP50)}`);
    } catch (err: any) {
      logger.error('[MC] Failed:', err);
      setError(err?.message || 'Monte Carlo simulation failed');
    } finally {
      setIsRunning(false);
    }
  }, [onRunMonteCarlo, numberOfRuns]);

  // No results yet - show run button
  if (!results) {
    return (
      <Section title="MONTE CARLO SUMMARY" number={2}>
        <div className="p-4 text-center">
          <p className="text-sm-areum text-areum-text-secondary mb-3">
            Run {numberOfRuns} stochastic paths to see outcome distributions
          </p>
          {error && (
            <p className="text-sm-areum text-areum-danger mb-3">{error}</p>
          )}
          <Button
            onClick={handleRunMonteCarlo}
            disabled={isRunning || !onRunMonteCarlo}
            variant="primary"
            size="sm"
          >
            {isRunning ? 'Running...' : `Run ${numberOfRuns} Paths`}
          </Button>
        </div>
      </Section>
    );
  }

  // Show results
  return (
    <Section title="MONTE CARLO SUMMARY" number={2}>
      <div className="p-3">
        {/* Header with seed and path count */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-areum-border">
          <span className="text-xs-areum text-areum-text-tertiary">
            {results.numberOfRuns} paths · Seed: {(results as any).baseSeed || '—'}
          </span>
          <Button
            onClick={handleRunMonteCarlo}
            disabled={isRunning}
            variant="ghost"
            size="sm"
          >
            {isRunning ? 'Running...' : 'Re-run'}
          </Button>
        </div>

        {/* Terminal Wealth Percentiles */}
        <div className="mb-4">
          <h4 className="text-xs-areum font-semibold text-areum-text-secondary uppercase tracking-wide mb-2">
            Terminal Net Worth
          </h4>
          <PercentileRow
            label="End of horizon"
            p5={results.finalNetWorthP5 ?? results.finalNetWorthP10}
            p50={results.finalNetWorthP50}
            p95={results.finalNetWorthP95 ?? results.finalNetWorthP90}
          />
        </div>

        {/* Min Cash Percentiles */}
        {(results.minCashP5 != null || results.minCashP50 != null) && (
          <div className="mb-4">
            <h4 className="text-xs-areum font-semibold text-areum-text-secondary uppercase tracking-wide mb-2">
              Minimum Cash (Lifetime)
            </h4>
            <PercentileRow
              label="Lowest point"
              p5={results.minCashP5}
              p50={results.minCashP50}
              p95={results.minCashP95}
            />
          </div>
        )}

        {/* Probabilities */}
        <div className="mb-4">
          <h4 className="text-xs-areum font-semibold text-areum-text-secondary uppercase tracking-wide mb-2">
            Event Probabilities
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm-areum">
              <span className="text-areum-text-secondary">Spending becomes constrained</span>
              <span className="font-mono text-areum-text-primary">
                {formatPct(results.everBreachProbability)}
              </span>
            </div>
            <div className="flex justify-between text-sm-areum">
              <span className="text-areum-text-secondary">Bankruptcy</span>
              <span className="font-mono text-areum-text-primary">
                {formatPct(results.probabilityOfBankruptcy)}
              </span>
            </div>
            <div className="flex justify-between text-sm-areum">
              <span className="text-areum-text-secondary">Success (positive end)</span>
              <span className="font-mono text-areum-text-primary">
                {formatPct(results.probabilityOfSuccess)}
              </span>
            </div>
          </div>
        </div>

        {/* Runway (conditional on breach) */}
        {results.breachedPathCount != null && results.breachedPathCount > 0 && (
          <div className="mb-4">
            <h4 className="text-xs-areum font-semibold text-areum-text-secondary uppercase tracking-wide mb-2">
              Runway Until Constraint ({results.breachedPathCount} paths)
            </h4>
            <div className="flex gap-4 text-sm-areum font-mono">
              <span className="text-areum-text-tertiary">
                P5: {results.runwayP5 ?? '—'} mo
              </span>
              <span className="text-areum-text-primary font-medium">
                P50: {results.runwayP50 ?? '—'} mo
              </span>
              <span className="text-areum-text-tertiary">
                P95: {results.runwayP95 ?? '—'} mo
              </span>
            </div>
          </div>
        )}

        {/* Exemplar Path Reference */}
        {results.exemplarPath && (
          <div className="pt-3 border-t border-areum-border-light">
            <p className="text-xs-areum text-areum-text-tertiary">
              Exemplar path (median): #{results.exemplarPath.pathIndex} ·
              Seed {results.exemplarPath.pathSeed} ·
              Terminal {formatCurrencyShort(results.exemplarPath.terminalWealth)}
            </p>
          </div>
        )}
      </div>
    </Section>
  );
};
