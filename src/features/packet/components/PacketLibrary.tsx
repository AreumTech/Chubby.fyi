/**
 * PacketLibrary - Minimal packet list for developer testing
 *
 * PFOS-E Phase 4: Developer-facing workbench for inspecting/reopening packets.
 * NOT a user-facing product feature.
 *
 * Features:
 * - List packets from packetSlice
 * - Show: ID, Question, Timestamp, Seed
 * - Click to open in PacketViewer
 * - Optional: Bookmark, Delete
 */

import React from 'react';
import { useAppStore } from '@/store/appStore';
import { Card } from '@/components/ui/Card';
import { Text, Meta, Heading } from '@/components/ui/Typography';
import { Button } from '@/components/ui/button';
import { SimulationPacketV0 } from '@/features/packet/types/packetSchema';

// =============================================================================
// TYPES
// =============================================================================

interface PacketLibraryProps {
  /** Called when a packet is selected to view */
  onSelectPacket?: (packetId: string) => void;
  /** Compact mode for sidebar display */
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PacketLibrary: React.FC<PacketLibraryProps> = ({
  onSelectPacket,
  compact = false,
}) => {
  const packets = useAppStore((s) => s.packets);
  const activePacketId = useAppStore((s) => s.activePacketId);
  const setActivePacket = useAppStore((s) => s.setActivePacket);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const deletePacket = useAppStore((s) => s.deletePacket);

  // Convert Map to array and sort by createdAt (newest first)
  const packetList = Array.from(packets.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleSelectPacket = (packetId: string) => {
    setActivePacket(packetId);
    onSelectPacket?.(packetId);
  };

  if (packetList.length === 0) {
    return (
      <div className={compact ? 'p-2' : 'p-4'}>
        <Text size="sm" color="secondary" className="text-center">
          No packets yet. Run a simulation to create one.
        </Text>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <Heading size="sm">PACKET LIBRARY</Heading>
          <Meta>{packetList.length} packet{packetList.length !== 1 ? 's' : ''}</Meta>
        </div>
      )}

      {packetList.map((packet) => (
        <PacketRow
          key={packet.id}
          packet={packet}
          isActive={packet.id === activePacketId}
          compact={compact}
          onSelect={() => handleSelectPacket(packet.id)}
          onToggleBookmark={() => toggleBookmark(packet.id)}
          onDelete={() => deletePacket(packet.id)}
        />
      ))}
    </div>
  );
};

// =============================================================================
// PACKET ROW
// =============================================================================

interface PacketRowProps {
  packet: SimulationPacketV0;
  isActive: boolean;
  compact: boolean;
  onSelect: () => void;
  onToggleBookmark: () => void;
  onDelete: () => void;
}

const PacketRow: React.FC<PacketRowProps> = ({
  packet,
  isActive,
  compact,
  onSelect,
  onToggleBookmark,
  onDelete,
}) => {
  const formattedDate = formatDate(packet.createdAt);
  const formattedTime = formatTime(packet.createdAt);

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`w-full p-2 text-left rounded-sm-areum transition-colors ${
          isActive
            ? 'bg-areum-accent-bg border-l-2 border-l-areum-accent'
            : 'hover:bg-areum-surface-hover'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {packet.isBookmarked && <span className="text-areum-warning">★</span>}
            <Text size="sm" weight={isActive ? 'medium' : 'normal'} className="truncate">
              {packet.id}
            </Text>
          </div>
          <Meta className="flex-shrink-0">{formattedDate}</Meta>
        </div>
      </button>
    );
  }

  return (
    <Card
      accent={isActive ? 'left' : undefined}
      accentColor={isActive ? 'info' : undefined}
      compact
      className="cursor-pointer hover:bg-areum-surface-hover transition-colors"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {packet.isBookmarked && <span className="text-areum-warning">★</span>}
            <Text size="sm" weight="medium">
              {packet.id}
            </Text>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-sm-areum ${
                packet.dataTier === 'bronze'
                  ? 'bg-amber-100 text-amber-800'
                  : packet.dataTier === 'silver'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {packet.dataTier.toUpperCase()}
            </span>
          </div>

          <Text size="xs" color="secondary" className="mt-1 line-clamp-1">
            {packet.question || 'No question specified'}
          </Text>

          <div className="flex items-center gap-3 mt-1">
            <Meta>{formattedDate} {formattedTime}</Meta>
            <Meta className="font-mono">Seed: {packet.seed}</Meta>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
            className="h-7 w-7 p-0"
            title={packet.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            {packet.isBookmarked ? '★' : '☆'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 p-0 text-areum-text-tertiary hover:text-areum-danger"
            title="Delete packet"
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {packet.mcResults && (
        <div className="mt-2 pt-2 border-t border-areum-border flex items-center gap-4">
          <div>
            <Meta>P50 WEALTH</Meta>
            <Text size="xs" weight="medium">
              {formatCurrency(packet.mcResults.finalNetWorthP50)}
            </Text>
          </div>
          <div>
            <Meta>SUCCESS</Meta>
            <Text size="xs" weight="medium">
              {formatPercent(packet.mcResults.probabilityOfSuccess)}
            </Text>
          </div>
          {packet.blockedOutputs.length > 0 && (
            <div>
              <Meta>BLOCKED</Meta>
              <Text size="xs" weight="medium" className="text-areum-warning">
                {packet.blockedOutputs.length}
              </Text>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export default PacketLibrary;
