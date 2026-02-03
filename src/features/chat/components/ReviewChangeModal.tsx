/**
 * ReviewChangeModal - Confirmation dialog for draft changes
 *
 * Shows full change details and allows user to:
 * - Confirm with scope selection (scenario_only vs baseline_candidate)
 * - Discard the change
 *
 * PFOS-E compliant: Shows confidence score in advanced mode,
 * explicit about what the change affects.
 */

import React, { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Heading, Text, Meta } from '@/components/ui/Typography';
import {
  DraftChangeV0,
  ChangeScope,
  formatFieldPath,
  formatChangeValue,
  canConfirmDraftChange,
} from '@/features/chat/types/draftChangeSchema';

// =============================================================================
// TYPES
// =============================================================================

interface ReviewChangeModalProps {
  isOpen: boolean;
  change: DraftChangeV0 | null;
  onConfirm: (changeId: string, scope: ChangeScope) => void;
  onDiscard: (changeId: string) => void;
  onClose: () => void;
  showAdvanced?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ReviewChangeModal: React.FC<ReviewChangeModalProps> = ({
  isOpen,
  change,
  onConfirm,
  onDiscard,
  onClose,
  showAdvanced = false,
}) => {
  const [selectedScope, setSelectedScope] = useState<ChangeScope>('baseline_candidate');

  const handleConfirm = useCallback(() => {
    if (!change) return;
    onConfirm(change.id, selectedScope);
    onClose();
  }, [change, selectedScope, onConfirm, onClose]);

  const handleDiscard = useCallback(() => {
    if (!change) return;
    onDiscard(change.id);
    onClose();
  }, [change, onDiscard, onClose]);

  if (!change) return null;

  const canConfirm = canConfirmDraftChange(change);
  const hasErrors = change.validationErrors.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Change"
      size="md"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="ghost" onClick={handleDiscard} className="text-areum-danger">
            Discard
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Change Summary */}
        <Card accent="left" accentColor="info">
          <div className="space-y-3">
            {/* Entity and Field */}
            <div>
              <Meta>Field</Meta>
              <Text size="base" weight="medium" className="mt-0.5">
                {formatFieldPath(change.fieldPath)}
              </Text>
            </div>

            {/* Values */}
            <div className="flex gap-6">
              {change.oldValue !== undefined && (
                <div>
                  <Meta>Previous Value</Meta>
                  <Text size="base" color="secondary" className="mt-0.5 line-through">
                    {formatChangeValue(change.oldValue, change.unit)}
                  </Text>
                </div>
              )}
              <div>
                <Meta>New Value</Meta>
                <Text size="base" weight="medium" className="mt-0.5 text-areum-accent">
                  {formatChangeValue(change.newValue, change.unit)}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* Validation Errors */}
        {hasErrors && (
          <div className="p-3 bg-areum-danger-bg border border-areum-danger-border rounded-md-areum">
            <Text size="sm" weight="medium" className="text-areum-danger-text mb-1">
              Validation Errors
            </Text>
            <ul className="list-disc list-inside space-y-1">
              {change.validationErrors.map((error, index) => (
                <li key={index}>
                  <Text size="sm" className="text-areum-danger-text">
                    {error}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scope Selection */}
        <div>
          <Heading size="sm" className="mb-2">
            HOW TO APPLY
          </Heading>
          <div className="space-y-2">
            <ScopeOption
              scope="baseline_candidate"
              selected={selectedScope === 'baseline_candidate'}
              onSelect={setSelectedScope}
              title="Update Profile"
              description="Apply to your baseline profile for all future simulations"
            />
            <ScopeOption
              scope="scenario_only"
              selected={selectedScope === 'scenario_only'}
              onSelect={setSelectedScope}
              title="This Scenario Only"
              description="Use only for this exploration, don't save to profile"
            />
          </div>
        </div>

        {/* Advanced: Confidence Score */}
        {showAdvanced && (
          <div className="pt-3 border-t border-areum-border">
            <Meta>Confidence Score</Meta>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-areum-canvas rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getConfidenceColor(change.confidence)}`}
                  style={{ width: `${change.confidence * 100}%` }}
                />
              </div>
              <Text size="sm" weight="medium">
                {Math.round(change.confidence * 100)}%
              </Text>
            </div>
            {change.notes && (
              <Meta className="mt-2 italic">{change.notes}</Meta>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface ScopeOptionProps {
  scope: ChangeScope;
  selected: boolean;
  onSelect: (scope: ChangeScope) => void;
  title: string;
  description: string;
}

const ScopeOption: React.FC<ScopeOptionProps> = ({
  scope,
  selected,
  onSelect,
  title,
  description,
}) => {
  return (
    <button
      onClick={() => onSelect(scope)}
      className={`w-full text-left p-3 rounded-md-areum border transition-colors ${
        selected
          ? 'border-areum-accent bg-areum-accent/5'
          : 'border-areum-border hover:border-areum-border-hover'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            selected ? 'border-areum-accent' : 'border-areum-border'
          }`}
        >
          {selected && (
            <div className="w-2 h-2 rounded-full bg-areum-accent" />
          )}
        </div>
        <div>
          <Text size="sm" weight="medium">
            {title}
          </Text>
          <Text size="xs" color="secondary" className="mt-0.5">
            {description}
          </Text>
        </div>
      </div>
    </button>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-areum-success';
  if (confidence >= 0.5) return 'bg-areum-warning';
  return 'bg-areum-danger';
}

export default ReviewChangeModal;
