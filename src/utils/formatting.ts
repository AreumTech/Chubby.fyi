import { FinancialEvent, EventType } from '../types';

export const formatCurrency = (value?: number | null, currency: string = 'USD'): string => {
  if (value === undefined || value === null || isNaN(value)) return currency === 'USD' ? '$0' : `0 ${currency}`;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const formatCurrencyShort = (value?: number | null, currency: string = 'USD'): string => {
  if (value === undefined || value === null || isNaN(value)) return currency === 'USD' ? '$0' : `0 ${currency}`;
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const currencySymbol = currency === 'USD' ? '$' : ''; // Only show $ for USD for brevity, other currencies will show code
  const currencySuffix = currency === 'USD' ? '' : ` ${currency}`;

  if (absVal >= 1e9) return `${sign}${currencySymbol}${(absVal / 1e9).toFixed(1)}B${currencySuffix}`;
  if (absVal >= 1e6) return `${sign}${currencySymbol}${(absVal / 1e6).toFixed(1)}M${currencySuffix}`;
  if (absVal >= 1e3) return `${sign}${currencySymbol}${(absVal / 1e3).toFixed(0)}K${currencySuffix}`;
  return `${sign}${currencySymbol}${Math.round(value).toLocaleString()}${currencySuffix}`;
};

export const formatPercentage = (value?: number | null, decimals: number = 1): string => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
};

// Utility functions for input field currency formatting
// [TODO] check if it is still needed or can replace with parseFormattedNumber
export const formatNumberWithCommas = (value: string | number): string => {
  if (value === '' || value === null || value === undefined) return '';
  const numStr = String(value);
  const num = parseFloat(numStr.replace(/,/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const parseFormattedNumber = (value: string): number => {
  if (!value) return 0;
  const parsed = parseFloat(value.replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

export const escapeHTML = (str?: string | number | null): string => {
  if (str === undefined || str === null) return '';
  const text = String(str);
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    const p = window.document.createElement('p');
    p.appendChild(window.document.createTextNode(text));
    return p.innerHTML;
  } else {
    // Fallback: simple replace for <, >, &, ", '
    return text.replace(/[&<>"]/g, function (c) {
      switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
};

export const generateId = (): string => {
  return 'evt_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

/**
 * Gets a user-friendly display name for an event.
 * Falls back to formatted type name if event.name is not provided.
 */
export const getEventDisplayName = (event: FinancialEvent): string => {
  if (event.name) {
    return event.name;
  }

  // Generate user-friendly name from event type
  switch (event.type) {
    case EventType.PENSION_INCOME:
      return 'Pension Income';
    case EventType.ANNUITY_PAYMENT:
      return 'Annuity Payment';
    case EventType.REQUIRED_MINIMUM_DISTRIBUTION:
      return 'Required Minimum Distribution';
    case EventType.SOCIAL_SECURITY_INCOME:
      return 'Social Security Income';
    case EventType.INCOME:
      return 'Income';
    case EventType.RECURRING_EXPENSE:
      return 'Recurring Expense';
    case EventType.ONE_TIME_EVENT:
      return event.amount && event.amount > 0 ? 'One-Time Income' : 'One-Time Expense';
    case EventType.SCHEDULED_CONTRIBUTION:
      return 'Investment Contribution';
    case EventType.LIABILITY_ADD:
      return 'New Debt/Loan';
    case EventType.ROTH_CONVERSION:
      return 'Roth Conversion';
    case EventType.HEALTHCARE_COST:
      return 'Healthcare Expenses';
    case EventType.GOAL_DEFINE:
      return event.name || 'Financial Goal'; // Goals should always have names
    case EventType.STRATEGY_ASSET_ALLOCATION_SET:
      return 'Asset Allocation Strategy';
    case EventType.STRATEGY_REBALANCING_RULE_SET:
      return 'Rebalancing Strategy';
    case EventType.INITIAL_STATE:
      return 'Starting Point';
    default:
      // Fallback: convert enum to readable format
      return event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};
