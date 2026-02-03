import React from 'react';
import { formatCurrencyShort } from '@/utils/formatting';
import { getGoalIcon } from '@/utils/eventIcons';

interface MiniGoalCardProps {
  id: string;
  name: string;
  targetAmount?: number;
  targetYear?: number;
  accountType?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  onClick?: () => void;
}

/**
 * Formats account type for display
 */
function formatAccountType(accountType?: string): string {
  if (!accountType) return '';

  const mapping: Record<string, string> = {
    'tax_deferred': '401k/IRA',
    'taxDeferred': '401k/IRA',
    '401k': '401k',
    'ira': 'IRA',
    'roth': 'Roth',
    'rothIra': 'Roth',
    'taxable': 'Taxable',
    'cash': 'Cash',
    '529': '529',
    'total': 'All accounts',
  };

  return mapping[accountType] || accountType;
}

/**
 * MiniGoalCard - Compact card for sidebar goal display
 * Shows: icon + name, amount • account • year
 */
export const MiniGoalCard: React.FC<MiniGoalCardProps> = ({
  id,
  name,
  targetAmount,
  targetYear,
  accountType,
  priority,
  onClick,
}) => {
  const icon = getGoalIcon(name);
  const amount = targetAmount ? formatCurrencyShort(targetAmount) : null;
  const account = formatAccountType(accountType);
  const year = targetYear?.toString();

  // Build the detail line: "$2.5M • 401k • 2045"
  const details = [amount, account, year].filter(Boolean).join(' • ');

  return (
    <div
      onClick={onClick}
      className={`
        group relative px-2.5 py-2 rounded-md-areum cursor-pointer
        bg-areum-surface border border-areum-border
        hover:border-areum-accent/30 hover:bg-areum-canvas/50
        transition-colors
      `}
    >
      {/* Priority indicator - left accent bar */}
      {priority === 'HIGH' && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-areum-danger rounded-full" />
      )}

      {/* Content */}
      <div className="flex items-start gap-2">
        {/* Icon */}
        <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Goal name */}
          <div className="text-sm-areum font-medium text-areum-text-primary truncate">
            {name}
          </div>

          {/* Details: amount • account • year */}
          {details && (
            <div className="text-xs-areum text-areum-text-secondary mt-0.5">
              {details}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
