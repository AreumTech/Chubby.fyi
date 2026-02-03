/**
 * ScenarioComparisonSection - Side-by-side scenario comparison
 *
 * Displays baseline and variant scenarios in a comparison view.
 * PFOS-E compliant: No rankings, symmetric language, uncertainty-first.
 */

import React from 'react';
import { SimulationPacketV0, ScenarioDefinition } from '@/features/packet/types/packetSchema';
import { PacketSection } from '../PacketSection';
import { Text, Meta } from '@/components/ui/Typography';

// =============================================================================
// TYPES
// =============================================================================

interface ScenarioComparisonSectionProps {
  packet: SimulationPacketV0;
  /** Whether to show detailed metrics (default: true) */
  showDetailedMetrics?: boolean;
}

interface ScenarioMetric {
  label: string;
  getValue: (scenario: ScenarioDefinition) => string | null;
  formatDiff?: (baseline: number, variant: number) => string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ScenarioComparisonSection: React.FC<ScenarioComparisonSectionProps> = ({
  packet,
  showDetailedMetrics = true,
}) => {
  const { scenarios } = packet;

  // Need at least 2 scenarios for comparison
  if (scenarios.length < 2) {
    return null;
  }

  const baseline = scenarios[0];
  const variants = scenarios.slice(1);

  return (
    <PacketSection
      title="SCENARIO COMPARISON"
      subtitle="Side-by-side analysis of outcomes"
      defaultCollapsed={false}
    >
      <div className="space-y-4">
        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-areum-border">
                <th className="py-2 px-3 text-left">
                  <Meta>METRIC</Meta>
                </th>
                <th className="py-2 px-3 text-center bg-areum-accent/5">
                  <div className="flex flex-col items-center">
                    <Text size="sm" weight="medium">
                      {baseline.label}
                    </Text>
                    <Meta>{baseline.description}</Meta>
                  </div>
                </th>
                {variants.map((variant) => (
                  <th key={variant.id} className="py-2 px-3 text-center">
                    <div className="flex flex-col items-center">
                      <Text size="sm" weight="medium">
                        {variant.label}
                      </Text>
                      <Meta>{variant.description}</Meta>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Terminal Wealth P50 */}
              <MetricRow
                label="Terminal Wealth (P50)"
                baseline={baseline}
                variants={variants}
                getValue={(s) =>
                  s.results?.terminalWealth?.p50
                    ? formatCurrency(s.results.terminalWealth.p50)
                    : '—'
                }
              />

              {/* Terminal Wealth Range */}
              {showDetailedMetrics && (
                <MetricRow
                  label="Terminal Wealth Range"
                  baseline={baseline}
                  variants={variants}
                  getValue={(s) =>
                    s.results?.terminalWealth
                      ? `${formatCurrency(s.results.terminalWealth.p5)} – ${formatCurrency(s.results.terminalWealth.p95)}`
                      : '—'
                  }
                />
              )}

              {/* Depletion Probability */}
              <MetricRow
                label="Depletion Probability"
                baseline={baseline}
                variants={variants}
                getValue={(s) =>
                  s.results?.depletionProbability
                    ? formatPercent(s.results.depletionProbability.probability)
                    : '< 1%'
                }
                highlightDanger={(s) =>
                  (s.results?.depletionProbability?.probability ?? 0) > 0.2
                }
                highlightWarning={(s) =>
                  (s.results?.depletionProbability?.probability ?? 0) > 0.1
                }
              />

              {/* Changes Applied */}
              <MetricRow
                label="Changes Applied"
                baseline={baseline}
                variants={variants}
                getValue={(s) => `${s.appliedChanges.length} change${s.appliedChanges.length !== 1 ? 's' : ''}`}
              />
            </tbody>
          </table>
        </div>

        {/* Overlap Analysis */}
        {variants.length > 0 && baseline.results && variants[0].results && (
          <OverlapAnalysis baseline={baseline} variant={variants[0]} />
        )}
      </div>
    </PacketSection>
  );
};

// =============================================================================
// METRIC ROW
// =============================================================================

interface MetricRowProps {
  label: string;
  baseline: ScenarioDefinition;
  variants: ScenarioDefinition[];
  getValue: (scenario: ScenarioDefinition) => string;
  highlightDanger?: (scenario: ScenarioDefinition) => boolean;
  highlightWarning?: (scenario: ScenarioDefinition) => boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({
  label,
  baseline,
  variants,
  getValue,
  highlightDanger,
  highlightWarning,
}) => {
  const getTextColor = (scenario: ScenarioDefinition) => {
    if (highlightDanger?.(scenario)) return 'text-areum-danger';
    if (highlightWarning?.(scenario)) return 'text-areum-warning';
    return '';
  };

  return (
    <tr className="border-b border-areum-border">
      <td className="py-2 px-3">
        <Text size="sm" color="secondary">
          {label}
        </Text>
      </td>
      <td className={`py-2 px-3 text-center bg-areum-accent/5 ${getTextColor(baseline)}`}>
        <Text size="sm" weight="medium">
          {getValue(baseline)}
        </Text>
      </td>
      {variants.map((variant) => (
        <td key={variant.id} className={`py-2 px-3 text-center ${getTextColor(variant)}`}>
          <Text size="sm" weight="medium">
            {getValue(variant)}
          </Text>
        </td>
      ))}
    </tr>
  );
};

// =============================================================================
// OVERLAP ANALYSIS
// =============================================================================

interface OverlapAnalysisProps {
  baseline: ScenarioDefinition;
  variant: ScenarioDefinition;
}

const OverlapAnalysis: React.FC<OverlapAnalysisProps> = ({ baseline, variant }) => {
  const baselineP50 = baseline.results?.terminalWealth?.p50 ?? 0;
  const variantP50 = variant.results?.terminalWealth?.p50 ?? 0;

  // Calculate symmetric overlap description
  // PFOS-E: Must describe both directions equally
  const diff = variantP50 - baselineP50;
  const percentDiff = baselineP50 > 0 ? (diff / baselineP50) * 100 : 0;

  return (
    <div className="p-3 bg-areum-canvas rounded-md-areum border border-areum-border">
      <Meta className="mb-2">OUTCOME OVERLAP</Meta>
      <Text size="sm" color="secondary">
        {Math.abs(percentDiff) < 5 ? (
          // Similar outcomes
          <>
            The median outcomes are similar (within 5%). Both scenarios show
            substantial uncertainty in the P5-P95 range.
          </>
        ) : diff > 0 ? (
          // Variant higher
          <>
            {variant.label} shows a higher median terminal wealth by{' '}
            {formatCurrency(Math.abs(diff))} ({Math.abs(percentDiff).toFixed(0)}%).
            However, {baseline.label} may outperform in some paths due to uncertainty.
          </>
        ) : (
          // Baseline higher
          <>
            {baseline.label} shows a higher median terminal wealth by{' '}
            {formatCurrency(Math.abs(diff))} ({Math.abs(percentDiff).toFixed(0)}%).
            However, {variant.label} may outperform in some paths due to uncertainty.
          </>
        )}
      </Text>
    </div>
  );
};

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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default ScenarioComparisonSection;
