/**
 * PacketHeaderSection - Sticky banner with disclaimer and metadata
 *
 * PFOS-E compliant: Always shows educational disclaimer prominently.
 */

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Text, Meta } from '@/components/ui/Typography';
import { SimulationPacketV0, DataTier } from '@/features/packet/types/packetSchema';

// =============================================================================
// TYPES
// =============================================================================

interface PacketHeaderSectionProps {
  packet: SimulationPacketV0;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PacketHeaderSection: React.FC<PacketHeaderSectionProps> = ({ packet }) => {
  return (
    <div className="space-y-3">
      {/* Educational Disclaimer - ALWAYS visible */}
      <DisclaimerBanner />

      {/* Metadata Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <MetadataPill label="Packet" value={packet.id} />
        <MetadataPill label="Tier" value={formatDataTier(packet.dataTier)} />
        <MetadataPill
          label="Created"
          value={formatDate(packet.createdAt)}
        />
        {packet.seed && (
          <MetadataPill
            label="Seed"
            value={packet.seed.toString(16).toUpperCase()}
            mono
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const DisclaimerBanner: React.FC = () => {
  return (
    <div className="p-3 bg-areum-canvas border border-areum-border rounded-md-areum">
      <div className="flex items-start gap-2">
        <InfoIcon />
        <div>
          <Text size="sm" weight="medium" color="secondary">
            Educational Simulation
          </Text>
          <Text size="xs" color="tertiary" className="mt-0.5">
            This packet shows what tends to happen under these assumptions.
            It is not financial advice or a recommendation.
            Past performance does not guarantee future results.
          </Text>
        </div>
      </div>
    </div>
  );
};

interface MetadataPillProps {
  label: string;
  value: string;
  mono?: boolean;
}

const MetadataPill: React.FC<MetadataPillProps> = ({ label, value, mono = false }) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-areum-surface border border-areum-border rounded-sm-areum">
      <Meta>{label}:</Meta>
      <Text size="xs" weight="medium" className={mono ? 'font-mono' : ''}>
        {value}
      </Text>
    </div>
  );
};

const InfoIcon: React.FC = () => (
  <svg
    className="w-5 h-5 text-areum-accent flex-shrink-0 mt-0.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// =============================================================================
// HELPERS
// =============================================================================

function formatDataTier(tier: DataTier): string {
  const labels: Record<DataTier, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
  };
  return labels[tier];
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default PacketHeaderSection;
