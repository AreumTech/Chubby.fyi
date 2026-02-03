/**
 * ChatLayout - Split view container for chat and packet viewer
 *
 * Desktop: Side-by-side split view (chat left, packet right)
 * Mobile: Toggle between chat and packet views
 */

import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { Heading, Text } from '@/components/ui/Typography';

// =============================================================================
// TYPES
// =============================================================================

interface ChatLayoutProps {
  /** Chat panel content */
  chatContent: React.ReactNode;
  /** Packet viewer content */
  packetContent: React.ReactNode;
  /** Whether packet is available for viewing */
  hasPacket?: boolean;
}

type MobileView = 'chat' | 'packet';

// =============================================================================
// COMPONENT
// =============================================================================

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  chatContent,
  packetContent,
  hasPacket = false,
}) => {
  const [mobileView, setMobileView] = useState<MobileView>('chat');

  const handleToggleView = useCallback(() => {
    setMobileView((prev) => (prev === 'chat' ? 'packet' : 'chat'));
  }, []);

  return (
    <div className="flex flex-col h-full bg-areum-canvas">
      {/* Mobile Toggle Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-areum-surface border-b border-areum-border">
        <div className="flex gap-1">
          <button
            onClick={() => setMobileView('chat')}
            className={`px-3 py-1.5 text-sm-areum font-medium rounded-sm-areum transition-colors ${
              mobileView === 'chat'
                ? 'bg-areum-accent text-white'
                : 'text-areum-text-secondary hover:bg-areum-canvas'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setMobileView('packet')}
            disabled={!hasPacket}
            className={`px-3 py-1.5 text-sm-areum font-medium rounded-sm-areum transition-colors ${
              mobileView === 'packet'
                ? 'bg-areum-accent text-white'
                : hasPacket
                  ? 'text-areum-text-secondary hover:bg-areum-canvas'
                  : 'text-areum-text-tertiary cursor-not-allowed'
            }`}
          >
            Packet
            {!hasPacket && (
              <span className="ml-1 text-xs-areum">(none)</span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop: Split View */}
      <div className="hidden md:flex flex-1 min-h-0">
        {/* Chat Panel */}
        <div className="w-1/2 flex flex-col border-r border-areum-border overflow-hidden">
          <ChatPanelHeader />
          <div className="flex-1 overflow-y-auto">
            {chatContent}
          </div>
        </div>

        {/* Packet Panel */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <PacketPanelHeader hasPacket={hasPacket} />
          <div className="flex-1 overflow-y-auto bg-areum-canvas">
            {hasPacket ? (
              packetContent
            ) : (
              <EmptyPacketState />
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Single View */}
      <div className="md:hidden flex-1 overflow-y-auto">
        {mobileView === 'chat' ? (
          <div className="h-full flex flex-col">
            {chatContent}
          </div>
        ) : (
          <div className="h-full">
            {hasPacket ? (
              packetContent
            ) : (
              <EmptyPacketState />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const ChatPanelHeader: React.FC = () => {
  return (
    <div className="px-4 py-3 bg-areum-surface border-b border-areum-border">
      <Heading size="sm" className="text-areum-text-secondary">
        SETUP
      </Heading>
      <Text size="xs" color="tertiary" className="mt-0.5">
        Enter your financial information
      </Text>
    </div>
  );
};

const PacketPanelHeader: React.FC<{ hasPacket: boolean }> = ({ hasPacket }) => {
  const activePacketId = useAppStore((s) => s.activePacketId);

  return (
    <div className="px-4 py-3 bg-areum-surface border-b border-areum-border">
      <div className="flex items-center justify-between">
        <div>
          <Heading size="sm" className="text-areum-text-secondary">
            SIMULATION PACKET
          </Heading>
          {hasPacket && activePacketId && (
            <Text size="xs" color="tertiary" className="mt-0.5 font-mono">
              {activePacketId}
            </Text>
          )}
        </div>
        {hasPacket && (
          <div className="flex gap-1">
            <PacketActionButton icon="bookmark" label="Bookmark" />
            <PacketActionButton icon="export" label="Export" />
          </div>
        )}
      </div>
    </div>
  );
};

const PacketActionButton: React.FC<{ icon: 'bookmark' | 'export'; label: string }> = ({
  icon,
  label,
}) => {
  const icons = {
    bookmark: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    export: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  };

  return (
    <button
      className="p-1.5 text-areum-text-tertiary hover:text-areum-text-secondary hover:bg-areum-canvas rounded-sm-areum transition-colors"
      title={label}
    >
      {icons[icon]}
    </button>
  );
};

const EmptyPacketState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 mb-4 text-areum-text-tertiary">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <Heading size="md" className="text-areum-text-secondary mb-2">
        No Simulation Packet
      </Heading>
      <Text size="sm" color="tertiary" className="max-w-xs">
        Complete the setup form and run a simulation to generate a packet.
      </Text>
    </div>
  );
};

export default ChatLayout;
