import React from 'react';
import { FinancialEvent, EventType } from '@/types';
import { getEventColor, getEventIcon } from '@/utils/eventIcons';
import { formatCurrencyShort } from '@/utils/formatting';

interface EventCardProps {
  event: FinancialEvent;
  startYear: number;
  endYear: number;
  baseYear: number;
  onClick: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  startYear,
  endYear,
  baseYear,
  onClick
}) => {
  const getExpenseIcon = (category?: string) => {
    switch (category) {
      case 'housing': return '🏠';
      case 'childcare': return '🎓';
      case 'healthcare': return '🏥';
      case 'transportation': return '🚗';
      case 'travel': return '✈️';
      case 'food': return '🍽️';
      case 'utilities': return '⚡';
      case 'insurance': return '🛡️';
      case 'entertainment': return '🎬';
      default: return '🛒';
    }
  };

  const getCardIcon = (event: FinancialEvent): string => {
    // For recurring expenses, use category-specific icon
    if (event.type === EventType.RECURRING_EXPENSE && 'category' in event) {
      return getExpenseIcon((event as any).category);
    }
    // For all other events, use the standard event icon
    return getEventIcon(event.type);
  };

  const getEventDescription = (event: FinancialEvent): string => {
    switch (event.type) {
      case EventType.INITIAL_STATE:
        if ('initialAccounts' in event) {
          const accounts = (event as any).initialAccounts || {};
          const cash = (event as any).initialCash || 0;

          // Calculate totals from different formats
          const getTotalValue = (account: any): number => {
            if (typeof account === 'number') return account;
            if (account?.totalValue) return account.totalValue;
            if (Array.isArray(account)) {
              return account.reduce((sum, holding) => sum + (holding.currentMarketValueTotal || 0), 0);
            }
            return 0;
          };

          const taxable = getTotalValue(accounts.taxable);
          const taxDeferred = getTotalValue(accounts.tax_deferred);
          const roth = getTotalValue(accounts.roth);
          const totalNetWorth = cash + taxable + taxDeferred + roth;

          if (totalNetWorth > 0) {
            const parts = [];
            if (cash > 0) parts.push(`💵 ${formatCurrencyShort(cash)}`);
            if (taxable > 0) parts.push(`📈 ${formatCurrencyShort(taxable)}`);
            if (taxDeferred > 0) parts.push(`🏦 ${formatCurrencyShort(taxDeferred)}`);
            if (roth > 0) parts.push(`🎯 ${formatCurrencyShort(roth)}`);

            return `Total: ${formatCurrencyShort(totalNetWorth)} (${parts.join(', ')})`;
          }
          return 'Starting from $0';
        }
        return 'Initial financial state';

      case EventType.INCOME:
        if ('amount' in event) {
          const amount = event.amount || 0;
          const frequency = event.frequency || 'annually'; // W2 Income defaults to annually
          
          let displayAmount = amount;
          let displayFreq = 'year';
          
          // Convert based on actual frequency
          if (frequency === 'monthly') {
            displayAmount = amount * 12; // Convert monthly to annual for display
            displayFreq = 'year';
          } else if (frequency === 'annually') {
            displayAmount = amount; // Already annual
            displayFreq = 'year';
          }
          
          return `${formatCurrencyShort(displayAmount)}/${displayFreq}`;
        }
        return 'Income event';
      
      case EventType.RECURRING_EXPENSE:
        if ('amount' in event && 'frequency' in event) {
          const frequency = event.frequency || 'monthly';
          const amount = event.amount || 0;
          let displayAmount = amount;
          
          // Convert to monthly for consistent display
          if (frequency === 'annually') {
            displayAmount = amount / 12;
          }
          
          return `${formatCurrencyShort(displayAmount)}/month`;
        }
        return 'Recurring expense';
      
      case EventType.ONE_TIME_EVENT:
        if ('amount' in event) {
          return `${formatCurrencyShort(event.amount || 0)} one-time`;
        }
        return 'One-time event';
      
      case EventType.REAL_ESTATE_SALE:
        if ('salePrice' in event) {
          return `${formatCurrencyShort((event as any).salePrice || 0)} sale`;
        }
        return 'Real estate sale';
      
      case EventType.LIABILITY_PAYMENT:
        if ('amount' in event) {
          return `${formatCurrencyShort(event.amount || 0)} payment`;
        }
        return 'Liability payment';
      
      case EventType.SCHEDULED_CONTRIBUTION:
        if ('amount' in event) {
          return `${formatCurrencyShort(event.amount || 0)} contribution`;
        }
        return 'Scheduled contribution';
      
      case EventType.STRATEGIC_TRADE:
        if ('amount' in event) {
          return `${formatCurrencyShort(event.amount || 0)} trade`;
        }
        return 'Strategic trade';
      
      default:
        // Fallback to static description if no dynamic calculation is available
        return event.description || `${event.type.replace(/_/g, ' ').toLowerCase()} event`;
    }
  };

  const getEventTitle = (event: FinancialEvent): string => {
    // Use the event name if available, otherwise generate from type
    if (event.name && event.name.trim()) {
      return event.name;
    }
    
    // Generate title from event type
    if (event.type) {
      return event.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return 'Unknown Event';
  };

  // For ongoing events (where start == end), we should show "Ongoing"
  // This happens when endDateOffset is not set
  const isOngoing = startYear === endYear && event.type !== EventType.INITIAL_STATE && event.type !== EventType.ONE_TIME_EVENT;
  const yearDisplay = isOngoing ? `${startYear} →` : (startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`);

  const icon = getCardIcon(event);
  const title = getEventTitle(event);
  const description = getEventDescription(event);

  // Get accent color based on event type
  const getAccentColor = (type: EventType): string => {
    switch (type) {
      case EventType.INCOME:
        return 'bg-areum-success';
      case EventType.RECURRING_EXPENSE:
      case EventType.ONE_TIME_EVENT:
        return 'bg-areum-warning';
      case EventType.INITIAL_STATE:
        return 'bg-areum-accent';
      default:
        return 'bg-areum-text-tertiary';
    }
  };

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
      {/* Left accent bar based on event type */}
      <div className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 ${getAccentColor(event.type)} rounded-full`} />

      {/* Content */}
      <div className="flex items-start gap-2">
        {/* Icon */}
        <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Event title + year */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm-areum font-medium text-areum-text-primary truncate">
              {title}
            </span>
            <span className="text-xs-areum text-areum-text-tertiary flex-shrink-0">
              {yearDisplay}
            </span>
          </div>

          {/* Description */}
          <div className="text-xs-areum text-areum-text-secondary mt-0.5 truncate">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
};