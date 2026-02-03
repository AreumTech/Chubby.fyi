/**
 * PacketSummarySection - Question, top drivers, and key metrics
 *
 * PFOS-E compliant: Uses uncertainty language, shows percentile ranges.
 */

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Heading, Text, Meta } from '@/components/ui/Typography';
import { SimulationPacketV0 } from '@/features/packet/types/packetSchema';

// =============================================================================
// TYPES
// =============================================================================

interface PacketSummarySectionProps {
  packet: SimulationPacketV0;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PacketSummarySection: React.FC<PacketSummarySectionProps> = ({ packet }) => {
  const mcResults = packet.mcResults;
  const hasResults = mcResults && mcResults.success;

  return (
    <Card>
      {/* Question */}
      <div className="mb-4">
        <Meta>Question</Meta>
        <Heading size="md" className="mt-1">
          {packet.question}
        </Heading>
      </div>

      {/* Key Metrics */}
      {hasResults && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-areum-border">
          {/* Success Rate */}
          <KeyMetric
            label="Success Rate"
            value={formatPercent(mcResults.probabilityOfSuccess)}
            sublabel="of simulations"
            status={getSuccessStatus(mcResults.probabilityOfSuccess)}
          />

          {/* Final Wealth Range */}
          <KeyMetric
            label="Median Final Wealth"
            value={formatCurrency(mcResults.finalNetWorthP50)}
            sublabel={`Range: ${formatCurrency(mcResults.finalNetWorthP10)} - ${formatCurrency(mcResults.finalNetWorthP90)}`}
          />

          {/* Bankruptcy Risk */}
          {mcResults.probabilityOfBankruptcy > 0 && (
            <KeyMetric
              label="Depletion Risk"
              value={formatPercent(mcResults.probabilityOfBankruptcy)}
              sublabel="probability"
              status={getDepletionStatus(mcResults.probabilityOfBankruptcy)}
            />
          )}

          {/* Simulation Count */}
          <KeyMetric
            label="Simulations"
            value={mcResults.numberOfRuns.toLocaleString()}
            sublabel="Monte Carlo paths"
          />
        </div>
      )}

      {/* Top Drivers (if available) */}
      {packet.sensitivity && packet.sensitivity.topDrivers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-areum-border">
          <Meta className="mb-2">Top Sensitivity Drivers</Meta>
          <div className="flex flex-wrap gap-2">
            {packet.sensitivity.topDrivers.slice(0, 3).map((driver, index) => (
              <DriverPill
                key={index}
                driver={driver.driverKey}
                impact={driver.impact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Uncertainty Notice */}
      <div className="mt-4 pt-4 border-t border-areum-border">
        <div className="flex items-start gap-2">
          <UncertaintyIcon />
          <Text size="xs" color="tertiary">
            Ranges shown reflect uncertainty in market returns, not modeling error.
            Wider bands indicate more sensitivity to assumptions.
          </Text>
        </div>
      </div>
    </Card>
  );
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface KeyMetricProps {
  label: string;
  value: string;
  sublabel?: string;
  status?: 'success' | 'warning' | 'danger';
}

const KeyMetric: React.FC<KeyMetricProps> = ({ label, value, sublabel, status }) => {
  const statusColors = {
    success: 'text-areum-success',
    warning: 'text-areum-warning',
    danger: 'text-areum-danger',
  };

  return (
    <div>
      <Meta>{label}</Meta>
      <Text
        size="md"
        weight="semibold"
        className={`mt-0.5 ${status ? statusColors[status] : ''}`}
      >
        {value}
      </Text>
      {sublabel && (
        <Text size="xs" color="tertiary">
          {sublabel}
        </Text>
      )}
    </div>
  );
};

interface DriverPillProps {
  driver: string;
  impact: number;
}

const DriverPill: React.FC<DriverPillProps> = ({ driver, impact }) => {
  const impactPercent = Math.round(impact * 100);

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-areum-canvas border border-areum-border rounded-sm-areum">
      <div
        className="w-1.5 h-1.5 rounded-full bg-areum-accent"
        style={{ opacity: 0.3 + impact * 0.7 }}
      />
      <Text size="xs" weight="medium">
        {formatDriverKey(driver)}
      </Text>
      <Meta>{impactPercent}%</Meta>
    </div>
  );
};

const UncertaintyIcon: React.FC = () => (
  <svg
    className="w-4 h-4 text-areum-text-tertiary flex-shrink-0 mt-0.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// =============================================================================
// HELPERS
// =============================================================================

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDriverKey(key: string): string {
  // Convert "income:employment" to "Employment"
  const parts = key.split(':');
  return parts[parts.length - 1]
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSuccessStatus(rate: number): 'success' | 'warning' | 'danger' {
  if (rate >= 0.8) return 'success';
  if (rate >= 0.6) return 'warning';
  return 'danger';
}

function getDepletionStatus(rate: number): 'success' | 'warning' | 'danger' {
  if (rate <= 0.05) return 'success';
  if (rate <= 0.15) return 'warning';
  return 'danger';
}

export default PacketSummarySection;
