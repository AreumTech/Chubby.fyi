/**
 * DraftChangeCard - Displays a proposed change for review
 *
 * Shows the entity, field, old/new values, and status.
 * Clicking opens the ReviewChangeModal for confirmation.
 */

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Text, Meta } from '@/components/ui/Typography';
import { Button } from '@/components/ui/button';
import {
  DraftChangeV0,
  formatFieldPath,
  formatChangeValue,
  canConfirmDraftChange,
} from '@/features/chat/types/draftChangeSchema';

// =============================================================================
// TYPES
// =============================================================================

interface DraftChangeCardProps {
  change: DraftChangeV0;
  onReview: (changeId: string) => void;
  onDiscard: (changeId: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const DraftChangeCard: React.FC<DraftChangeCardProps> = ({
  change,
  onReview,
  onDiscard,
}) => {
  const canConfirm = canConfirmDraftChange(change);
  const isConfirmed = change.status === 'confirmed';
  const isDiscarded = change.status === 'discarded';
  const hasErrors = change.validationErrors.length > 0;

  // Determine card accent based on status
  const accent: 'left' | 'none' = 'left';
  const accentColor = isConfirmed
    ? 'success'
    : isDiscarded
      ? undefined
      : hasErrors
        ? 'danger'
        : 'info';

  return (
    <Card
      accent={accent}
      accentColor={accentColor}
      compact
      className={`${isDiscarded ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Change Info */}
        <div className="flex-1 min-w-0">
          {/* Entity and Field */}
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={change.status} />
            <Text size="sm" weight="medium" className="truncate">
              {formatFieldPath(change.fieldPath)}
            </Text>
          </div>

          {/* Values */}
          <div className="flex items-baseline gap-2">
            {change.oldValue !== undefined && (
              <>
                <Text size="sm" color="tertiary" className="line-through">
                  {formatChangeValue(change.oldValue, change.unit)}
                </Text>
                <span className="text-areum-text-tertiary">→</span>
              </>
            )}
            <Text size="sm" weight="medium" className="text-areum-accent">
              {formatChangeValue(change.newValue, change.unit)}
            </Text>
          </div>

          {/* Validation Errors */}
          {hasErrors && (
            <div className="mt-2">
              {change.validationErrors.map((error, index) => (
                <Text key={index} size="xs" className="text-areum-danger">
                  {error}
                </Text>
              ))}
            </div>
          )}

          {/* Notes */}
          {change.notes && (
            <Meta className="mt-1 italic">{change.notes}</Meta>
          )}
        </div>

        {/* Actions */}
        {change.status === 'pending' && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDiscard(change.id)}
              className="text-areum-text-tertiary hover:text-areum-danger"
            >
              <DiscardIcon />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReview(change.id)}
              disabled={!canConfirm}
              className="text-areum-accent"
            >
              Review
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface StatusBadgeProps {
  status: DraftChangeV0['status'];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    pending: {
      label: 'Pending',
      className: 'bg-areum-canvas text-areum-text-secondary',
    },
    confirmed: {
      label: 'Confirmed',
      className: 'bg-areum-success-bg text-areum-success-text border border-areum-success-border',
    },
    discarded: {
      label: 'Discarded',
      className: 'bg-areum-canvas text-areum-text-tertiary',
    },
  };

  const { label, className } = config[status];

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm-areum text-xs-areum font-medium ${className}`}
    >
      {label}
    </span>
  );
};

const DiscardIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// =============================================================================
// LIST COMPONENT
// =============================================================================

interface DraftChangeListProps {
  changes: DraftChangeV0[];
  onReview: (changeId: string) => void;
  onDiscard: (changeId: string) => void;
  showConfirmed?: boolean;
}

export const DraftChangeList: React.FC<DraftChangeListProps> = ({
  changes,
  onReview,
  onDiscard,
  showConfirmed = true,
}) => {
  // Filter and sort: pending first, then confirmed, hide discarded unless showConfirmed
  const visibleChanges = changes
    .filter((c) => {
      if (c.status === 'discarded') return false;
      if (c.status === 'confirmed' && !showConfirmed) return false;
      return true;
    })
    .sort((a, b) => {
      // Pending first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0;
    });

  if (visibleChanges.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleChanges.map((change) => (
        <DraftChangeCard
          key={change.id}
          change={change}
          onReview={onReview}
          onDiscard={onDiscard}
        />
      ))}
    </div>
  );
};

export default DraftChangeCard;
