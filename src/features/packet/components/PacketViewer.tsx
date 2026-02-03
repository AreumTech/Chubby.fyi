/**
 * PacketViewer - Data-driven document renderer for SimulationPackets
 *
 * Renders packet sections based on the packet data.
 * PFOS-E compliant: Shows blocked outputs prominently, uses uncertainty language.
 */

import React from 'react';
import { useAppStore } from '@/store/appStore';
import { SimulationPacketV0 } from '@/features/packet/types/packetSchema';
import { Heading, Text, Meta } from '@/components/ui/Typography';
import { PacketSection } from './PacketSection';

// Import section renderers
import { PacketHeaderSection } from './sections/PacketHeaderSection';
import { PacketSummarySection } from './sections/PacketSummarySection';
import { ScenarioComparisonSection } from './sections/ScenarioComparisonSection';
import { IllustrativeTraceSection } from './sections/IllustrativeTraceSection';
import { AuditFooterSection } from './sections/AuditFooterSection';

// =============================================================================
// TYPES
// =============================================================================

interface PacketViewerProps {
  /** Packet ID to display (if not provided, uses active packet from store) */
  packetId?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PacketViewer: React.FC<PacketViewerProps> = ({ packetId }) => {
  const activePacketId = useAppStore((s) => s.activePacketId);
  const getPacketById = useAppStore((s) => s.getPacketById);

  const packet = getPacketById(packetId || activePacketId || '');

  if (!packet) {
    return (
      <div className="p-4 text-center">
        <Text color="secondary">No packet selected</Text>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header Section (always visible, sticky disclaimer) */}
      <PacketHeaderSection packet={packet} />

      {/* Summary Section */}
      <PacketSummarySection packet={packet} />

      {/* Scenario Results */}
      {packet.scenarios.map((scenario, index) => (
        <ScenarioSection key={scenario.id} scenario={scenario} index={index} />
      ))}

      {/* Scenario Comparison (when multiple scenarios) */}
      {packet.scenarios.length > 1 && (
        <ScenarioComparisonSection packet={packet} />
      )}

      {/* Illustrative Path Trace */}
      <IllustrativeTraceSection packet={packet} />

      {/* Blocked Outputs (ALWAYS visible per PFOS-E rules) */}
      <BlockedOutputsSection packet={packet} />

      {/* Sensitivity Analysis */}
      {packet.sensitivity && (
        <SensitivitySection packet={packet} />
      )}

      {/* Audit Footer */}
      <AuditFooterSection packet={packet} />
    </div>
  );
};

// =============================================================================
// SCENARIO SECTION
// =============================================================================

interface ScenarioSectionProps {
  scenario: SimulationPacketV0['scenarios'][number];
  index: number;
}

const ScenarioSection: React.FC<ScenarioSectionProps> = ({ scenario, index }) => {
  const isBaseline = index === 0;

  return (
    <PacketSection
      title={scenario.label}
      subtitle={scenario.description}
      accentColor={isBaseline ? 'info' : undefined}
      defaultCollapsed={!isBaseline}
    >
      {scenario.results ? (
        <div className="space-y-4">
          {/* Terminal Wealth */}
          {scenario.results.terminalWealth && (
            <MetricRow
              label="Terminal Wealth"
              p5={scenario.results.terminalWealth.p5}
              p50={scenario.results.terminalWealth.p50}
              p95={scenario.results.terminalWealth.p95}
              format="currency"
            />
          )}

          {/* Depletion Probability */}
          {scenario.results.depletionProbability && (
            <div className="flex items-center justify-between py-2 border-t border-areum-border">
              <Text size="sm" color="secondary">
                Depletion probability by age {scenario.results.depletionProbability.byAge}
              </Text>
              <Text
                size="sm"
                weight="medium"
                className={
                  scenario.results.depletionProbability.probability > 0.2
                    ? 'text-areum-danger'
                    : scenario.results.depletionProbability.probability > 0.1
                      ? 'text-areum-warning'
                      : 'text-areum-success'
                }
              >
                {formatPercent(scenario.results.depletionProbability.probability)}
              </Text>
            </div>
          )}

          {/* Applied Changes */}
          {scenario.appliedChanges.length > 0 && (
            <div className="pt-2 border-t border-areum-border">
              <Meta className="mb-2">Changes applied:</Meta>
              <ul className="space-y-1">
                {scenario.appliedChanges.map((change, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-areum-accent" />
                    <Text size="xs" color="secondary">
                      {change.fieldPath.join(' > ')}
                    </Text>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <Text size="sm" color="tertiary" className="italic">
          No results available for this scenario
        </Text>
      )}
    </PacketSection>
  );
};

// =============================================================================
// BLOCKED OUTPUTS SECTION
// =============================================================================

interface BlockedOutputsSectionProps {
  packet: SimulationPacketV0;
}

const BlockedOutputsSection: React.FC<BlockedOutputsSectionProps> = ({ packet }) => {
  const hasBlockedOutputs = packet.blockedOutputs.length > 0;
  const hasBlockedScenarios = packet.blockedScenarios.length > 0;
  const hasAnyBlocked = hasBlockedOutputs || hasBlockedScenarios;

  return (
    <PacketSection
      title="BLOCKED OUTPUTS"
      subtitle={hasAnyBlocked ? "These outputs could not be computed" : "All outputs available"}
      accentColor={hasAnyBlocked ? "warning" : "success"}
      collapsible={false}
    >
      {hasAnyBlocked ? (
        <div className="space-y-3">
          {/* Blocked Outputs */}
          {packet.blockedOutputs.map((blocked, index) => (
            <div key={index} className="p-3 bg-areum-warning-bg rounded-md-areum border border-areum-warning-border">
              <Text size="sm" weight="medium" className="text-areum-warning-text">
                {blocked.outputName}
              </Text>
              <Text size="xs" color="secondary" className="mt-1">
                {blocked.reason}
              </Text>
              {blocked.unlockPath.length > 0 && (
                <div className="mt-2">
                  <Meta>To unlock:</Meta>
                  <ul className="mt-1 space-y-0.5">
                    {blocked.unlockPath.map((step, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-xs-areum text-areum-warning">•</span>
                        <Text size="xs" color="secondary">{step}</Text>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {/* Blocked Scenarios */}
          {packet.blockedScenarios.map((blocked, index) => (
            <div key={`scenario-${index}`} className="p-3 bg-areum-canvas rounded-md-areum border border-areum-border">
              <Text size="sm" weight="medium">
                Scenario blocked: {blocked.name}
              </Text>
              <Text size="xs" color="secondary" className="mt-1">
                {blocked.reason}
              </Text>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-areum-success-bg rounded-md-areum border border-areum-success-border">
          <svg className="w-4 h-4 text-areum-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <Text size="sm" className="text-areum-success-text">
            No blocked outputs. All calculations completed successfully.
          </Text>
        </div>
      )}
    </PacketSection>
  );
};

// =============================================================================
// SENSITIVITY SECTION
// =============================================================================

interface SensitivitySectionProps {
  packet: SimulationPacketV0;
}

const SensitivitySection: React.FC<SensitivitySectionProps> = ({ packet }) => {
  if (!packet.sensitivity) return null;

  return (
    <PacketSection
      title="SENSITIVITY ANALYSIS"
      subtitle="Top drivers affecting your outcomes"
      defaultCollapsed
    >
      <div className="space-y-3">
        {packet.sensitivity.topDrivers.map((driver, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <Text size="sm" weight="medium">
                  {formatDriverKey(driver.driverKey)}
                </Text>
                <Meta>{Math.round(driver.impact * 100)}% impact</Meta>
              </div>
              <div className="h-2 bg-areum-canvas rounded-full overflow-hidden">
                <div
                  className="h-full bg-areum-accent"
                  style={{ width: `${driver.impact * 100}%` }}
                />
              </div>
              <Text size="xs" color="tertiary" className="mt-1">
                {driver.interpretation}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </PacketSection>
  );
};

// =============================================================================
// METRIC ROW COMPONENT
// =============================================================================

interface MetricRowProps {
  label: string;
  p5: number;
  p50: number;
  p95: number;
  format: 'currency' | 'percent' | 'years';
}

const MetricRow: React.FC<MetricRowProps> = ({ label, p5, p50, p95, format }) => {
  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      case 'years':
        return `${value.toFixed(1)} years`;
      default:
        return value.toString();
    }
  };

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <Text size="sm" color="secondary">{label}</Text>
        <Text size="sm" weight="semibold">{formatValue(p50)}</Text>
      </div>
      <div className="flex items-center gap-2">
        <Text size="xs" color="tertiary" className="w-20 text-right">
          {formatValue(p5)}
        </Text>
        <div className="flex-1 h-2 bg-areum-canvas rounded-full overflow-hidden relative">
          {/* Range bar */}
          <div
            className="absolute h-full bg-areum-accent/20"
            style={{
              left: '5%',
              width: '90%',
            }}
          />
          {/* P50 marker */}
          <div
            className="absolute w-1 h-full bg-areum-accent"
            style={{ left: '50%' }}
          />
        </div>
        <Text size="xs" color="tertiary" className="w-20">
          {formatValue(p95)}
        </Text>
      </div>
      <div className="flex justify-between text-xs-areum text-areum-text-tertiary mt-1">
        <span>Pessimistic (P5)</span>
        <span>Optimistic (P95)</span>
      </div>
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

function formatDriverKey(key: string): string {
  // Convert "income:employment" to "Income: Employment"
  return key
    .split(':')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(': ');
}

export default PacketViewer;
