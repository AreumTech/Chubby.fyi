/**
 * AuditFooterSection - Engine version, seed, hash, and export buttons
 *
 * PFOS-E compliant: Shows all audit information for deterministic replay.
 */

import React, { useCallback, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Text, Meta } from '@/components/ui/Typography';
import { Button } from '@/components/ui/button';
import { PacketSection } from '../PacketSection';
import { SimulationPacketV0 } from '@/features/packet/types/packetSchema';

// =============================================================================
// TYPES
// =============================================================================

interface AuditFooterSectionProps {
  packet: SimulationPacketV0;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AuditFooterSection: React.FC<AuditFooterSectionProps> = ({ packet }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleExportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(packet, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packet.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [packet]);

  return (
    <PacketSection
      title="AUDIT TRAIL"
      subtitle="For reproducibility and verification"
      defaultCollapsed
    >
      <div className="space-y-4">
        {/* Audit Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <AuditField
            label="Engine Version"
            value={packet.engineVersion}
            onCopy={() => handleCopy(packet.engineVersion, 'version')}
            copied={copied === 'version'}
          />
          <AuditField
            label="Schema Version"
            value={packet.schemaVersion}
          />
          <AuditField
            label="Seed"
            value={packet.seed.toString(16).toUpperCase()}
            mono
            onCopy={() => handleCopy(packet.seed.toString(), 'seed')}
            copied={copied === 'seed'}
          />
          {packet.baseSeed && (
            <AuditField
              label="Base Seed"
              value={packet.baseSeed.toString(16).toUpperCase()}
              mono
            />
          )}
          <AuditField
            label="Inputs Hash"
            value={truncateHash(packet.engineInputsHash)}
            mono
            onCopy={() => handleCopy(packet.engineInputsHash, 'hash')}
            copied={copied === 'hash'}
            fullValue={packet.engineInputsHash}
          />
          <AuditField
            label="Packet ID"
            value={packet.id}
            mono
          />
        </div>

        {/* MC Results Audit */}
        {packet.mcResults && (
          <div className="pt-3 border-t border-areum-border">
            <Meta className="mb-2">Monte Carlo Details</Meta>
            <div className="grid grid-cols-3 gap-3">
              <AuditField
                label="Paths"
                value={packet.mcResults.numberOfRuns.toLocaleString()}
              />
              {packet.mcResults.successfulPaths !== undefined && (
                <AuditField
                  label="Successful"
                  value={packet.mcResults.successfulPaths.toLocaleString()}
                />
              )}
              {packet.mcResults.failedPaths !== undefined && packet.mcResults.failedPaths > 0 && (
                <AuditField
                  label="Failed"
                  value={packet.mcResults.failedPaths.toLocaleString()}
                />
              )}
            </div>
          </div>
        )}

        {/* Trace Reference */}
        {packet.traceRef && (
          <div className="pt-3 border-t border-areum-border">
            <Meta className="mb-2">Exemplar Path</Meta>
            <div className="grid grid-cols-2 gap-3">
              <AuditField
                label="Path Seed"
                value={packet.traceRef.pathSeed.toString(16).toUpperCase()}
                mono
              />
              <AuditField
                label="Selection"
                value={formatSelectionCriterion(packet.traceRef.selectionCriterion)}
              />
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="flex gap-2 pt-3 border-t border-areum-border">
          <Button variant="ghost" size="sm" onClick={handleExportJSON}>
            <DownloadIcon />
            <span className="ml-1.5">Export JSON</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(JSON.stringify(packet, null, 2), 'json')}
          >
            <CopyIcon />
            <span className="ml-1.5">{copied === 'json' ? 'Copied!' : 'Copy JSON'}</span>
          </Button>
        </div>
      </div>
    </PacketSection>
  );
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface AuditFieldProps {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  fullValue?: string;
}

const AuditField: React.FC<AuditFieldProps> = ({
  label,
  value,
  mono = false,
  onCopy,
  copied = false,
  fullValue,
}) => {
  return (
    <div className="group">
      <Meta>{label}</Meta>
      <div className="flex items-center gap-1 mt-0.5">
        <Text
          size="sm"
          weight="medium"
          className={mono ? 'font-mono' : ''}
          title={fullValue}
        >
          {value}
        </Text>
        {onCopy && (
          <button
            onClick={onCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-areum-text-tertiary hover:text-areum-accent"
            title="Copy"
          >
            {copied ? <CheckIcon /> : <CopySmallIcon />}
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// ICONS
// =============================================================================

const DownloadIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CopyIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CopySmallIcon: React.FC = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg className="w-3 h-3 text-areum-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// =============================================================================
// HELPERS
// =============================================================================

function truncateHash(hash: string): string {
  if (!hash || hash.length < 16) return hash || '—';
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

function formatSelectionCriterion(criterion: string): string {
  // Convert "median_terminal_wealth" to "Median Terminal Wealth"
  return criterion
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default AuditFooterSection;
