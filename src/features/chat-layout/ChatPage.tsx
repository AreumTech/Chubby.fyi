/**
 * ChatPage - Main page integrating chat and packet viewer
 *
 * This is the primary entry point for the CHAT.md UI.
 * Demonstrates the end-to-end flow:
 * Manual Input → DraftChange → Confirm → Simulate → View Packet
 */

import React, { useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { ChatLayout } from './ChatLayout';
import { SetupFlowForm } from '@/features/chat/components/SetupFlowForm';
import { DraftChangeList } from '@/features/chat/components/DraftChangeCard';
import { ReviewChangeModal } from '@/features/chat/components/ReviewChangeModal';
import { SimulationTrigger } from '@/features/chat/components/SimulationTrigger';
import { PacketViewer } from '@/features/packet/components/PacketViewer';
import { Heading, Text } from '@/components/ui/Typography';

// =============================================================================
// COMPONENT
// =============================================================================

export const ChatPage: React.FC = () => {
  // Store state
  const draftChangeState = useAppStore((s) => s.draftChangeState);
  const draftChanges = useAppStore((s) => s.draftChanges);
  const confirmedChanges = useAppStore((s) => s.confirmedChanges);
  const activePacketId = useAppStore((s) => s.activePacketId);

  // Actions
  const openChangeReview = useAppStore((s) => s.openChangeReview);
  const closeChangeReview = useAppStore((s) => s.closeChangeReview);
  const confirmDraftChange = useAppStore((s) => s.confirmDraftChange);
  const discardDraftChange = useAppStore((s) => s.discardDraftChange);
  const getDraftChangeById = useAppStore((s) => s.getDraftChangeById);

  // Get the change being reviewed (if in CONFIRMING state)
  const reviewingChange =
    draftChangeState.type === 'CONFIRMING'
      ? getDraftChangeById(draftChangeState.changeId)
      : null;

  // Handlers
  const handleReviewChange = useCallback(
    (changeId: string) => {
      openChangeReview(changeId);
    },
    [openChangeReview]
  );

  const handleConfirmChange = useCallback(
    (changeId: string, scope: 'scenario_only' | 'baseline_candidate') => {
      confirmDraftChange(changeId, scope);
    },
    [confirmDraftChange]
  );

  const handleDiscardChange = useCallback(
    (changeId: string) => {
      discardDraftChange(changeId);
    },
    [discardDraftChange]
  );

  const handleSetupComplete = useCallback(() => {
    // Setup form completed - changes are now pending review
  }, []);

  // Derive state
  const hasPacket = !!activePacketId;
  const allChanges = Array.from(draftChanges.values());
  const hasDraftChanges = allChanges.length > 0;
  const hasConfirmedChanges = confirmedChanges.length > 0;

  // Render chat content
  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Setup Form (only show when no confirmed changes yet) */}
      {!hasConfirmedChanges && (
        <SetupFlowForm onComplete={handleSetupComplete} />
      )}

      {/* Draft Changes List */}
      {hasDraftChanges && (
        <div className="p-4 border-t border-areum-border">
          <Heading size="sm" className="mb-3 text-areum-text-secondary">
            PROPOSED CHANGES
          </Heading>
          <DraftChangeList
            changes={allChanges}
            onReview={handleReviewChange}
            onDiscard={handleDiscardChange}
          />
        </div>
      )}

      {/* Simulation Trigger */}
      {(hasDraftChanges || hasConfirmedChanges) && (
        <div className="mt-auto p-4 border-t border-areum-border bg-areum-surface">
          <SimulationTrigger />
        </div>
      )}
    </div>
  );

  // Render packet content
  const packetContent = <PacketViewer />;

  return (
    <>
      <ChatLayout
        chatContent={chatContent}
        packetContent={packetContent}
        hasPacket={hasPacket}
      />

      {/* Review Modal */}
      <ReviewChangeModal
        isOpen={draftChangeState.type === 'CONFIRMING'}
        change={reviewingChange || null}
        onConfirm={handleConfirmChange}
        onDiscard={handleDiscardChange}
        onClose={closeChangeReview}
      />
    </>
  );
};

export default ChatPage;
