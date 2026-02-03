import { AssetClass } from '@/types';

/**
 * Get appropriate icon for an event type
 */
export function getEventIcon(eventType: string): string {
  const iconMap: { [key: string]: string } = {
    'INCOME': '💰',
    'RECURRING_EXPENSE': '💸',
    'SCHEDULED_CONTRIBUTION': '📈',
    'ONE_TIME_EVENT': '🛒',
    'ROTH_CONVERSION': '🔄',
    'SOCIAL_SECURITY_INCOME': '🏛️',
    'HEALTHCARE_COST': '🏥',
    'GOAL_DEFINE': '🎯'
  };

  return iconMap[eventType] || '📅';
}

/**
 * Get display name for asset class
 */
export function getAssetClassDisplayName(assetClass: AssetClass): string {
  const displayNames: { [key in AssetClass]: string } = {
    [AssetClass.US_STOCKS_TOTAL_MARKET]: 'US Stocks',
    [AssetClass.US_BONDS_TOTAL_MARKET]: 'US Bonds',
    [AssetClass.INTERNATIONAL_STOCKS]: 'International Stocks',
    [AssetClass.REAL_ESTATE_PRIMARY_HOME]: 'Real Estate',
    [AssetClass.CASH]: 'Cash',
    [AssetClass.OTHER_ASSETS]: 'Other Assets',
    [AssetClass.LEVERAGED_SPY]: 'Leveraged Equity',
    [AssetClass.INDIVIDUAL_STOCK]: 'Individual Stocks'
  };

  return displayNames[assetClass] || assetClass;
}

/**
 * Format currency in short form (e.g., $1.2M, $500K)
 */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  } else {
    return `$${amount.toFixed(0)}`;
  }
}