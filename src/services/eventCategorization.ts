/**
 * Shared Event Categorization Service
 * 
 * Provides unified categorization system for both event creation and editing flows.
 * Uses the business-focused 4-category system for consistency across the application.
 */

import { EventType } from '@/types/events';

// Unified category system
// Note: STRATEGY category removed - strategy events now merged into ASSET_LIABILITY (Tax Optimization, Investment)
export enum EventCategory {
  INCOME_CONSUMPTION = 'INCOME_CONSUMPTION',
  ASSET_LIABILITY = 'ASSET_LIABILITY',
  STRUCTURAL_LIFE = 'STRUCTURAL_LIFE',
  ADVANCED_CUSTOM = 'ADVANCED_CUSTOM'
}

// Category metadata for UI display
export interface CategoryInfo {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
}

export const CATEGORY_INFO: Record<EventCategory, CategoryInfo> = {
  [EventCategory.INCOME_CONSUMPTION]: {
    title: 'Income & Consumption Events',
    subtitle: 'The P&L - Money flowing in and out',
    description: 'Events that affect your cash flow. Money coming in as earnings or going out for goods and services that are consumed.',
    icon: '💰',
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  [EventCategory.ASSET_LIABILITY]: {
    title: 'Asset & Liability Transformation',
    subtitle: 'The Balance Sheet - Changing wealth composition',
    description: 'Events that transform wealth from one form to another or reduce debt. Your net worth often stays the same at the moment of transaction.',
    icon: '🔄',
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  [EventCategory.STRUCTURAL_LIFE]: {
    title: 'Structural & Life Transitions',
    subtitle: 'The Rulebook - Major life changes',
    description: 'Major milestones that fundamentally alter the rules, parameters, and assumptions of your financial plan.',
    icon: '🎯',
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  },
  [EventCategory.ADVANCED_CUSTOM]: {
    title: 'Advanced & Custom Features',
    subtitle: 'The Building Blocks - Sophisticated strategies',
    description: 'Advanced financial strategies and custom events for sophisticated users.',
    icon: '⚙️',
    color: 'bg-gray-50 border-gray-200 text-gray-800'
  }
};

// Event type to category mapping (Partial because not all event types are explicitly mapped)
export const EVENT_TYPE_CATEGORY_MAP: Partial<Record<EventType, EventCategory>> = {
  // Income & Consumption Events
  [EventType.INCOME]: EventCategory.INCOME_CONSUMPTION,
  [EventType.SOCIAL_SECURITY_INCOME]: EventCategory.INCOME_CONSUMPTION,
  [EventType.PENSION_INCOME]: EventCategory.INCOME_CONSUMPTION,
  [EventType.ANNUITY_PAYMENT]: EventCategory.INCOME_CONSUMPTION,
  [EventType.RENTAL_INCOME]: EventCategory.INCOME_CONSUMPTION,
  [EventType.BUSINESS_INCOME]: EventCategory.INCOME_CONSUMPTION,
  [EventType.RECURRING_EXPENSE]: EventCategory.INCOME_CONSUMPTION,
  [EventType.HEALTHCARE_COST]: EventCategory.INCOME_CONSUMPTION,
  [EventType.ONE_TIME_EVENT]: EventCategory.INCOME_CONSUMPTION,

  // Asset & Liability Transformation Events
  [EventType.SCHEDULED_CONTRIBUTION]: EventCategory.ASSET_LIABILITY,
  [EventType.FIVE_TWO_NINE_CONTRIBUTION]: EventCategory.ASSET_LIABILITY,
  [EventType.STRATEGY_ASSET_ALLOCATION_SET]: EventCategory.ASSET_LIABILITY,
  [EventType.STRATEGY_REBALANCING_RULE_SET]: EventCategory.ASSET_LIABILITY,
  [EventType.REBALANCE_PORTFOLIO]: EventCategory.ASSET_LIABILITY,
  [EventType.STRATEGIC_TRADE]: EventCategory.ASSET_LIABILITY,
  [EventType.ADJUST_CASH_RESERVE_SELL_ASSETS]: EventCategory.ASSET_LIABILITY,
  [EventType.ADJUST_CASH_RESERVE_BUY_ASSETS]: EventCategory.ASSET_LIABILITY,
  [EventType.ROTH_CONVERSION]: EventCategory.ASSET_LIABILITY,
  [EventType.QUALIFIED_CHARITABLE_DISTRIBUTION]: EventCategory.ASSET_LIABILITY,
  [EventType.REQUIRED_MINIMUM_DISTRIBUTION]: EventCategory.ASSET_LIABILITY,
  [EventType.TAX_LOSS_HARVESTING_SALE]: EventCategory.ASSET_LIABILITY,
  [EventType.TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE]: EventCategory.ASSET_LIABILITY,
  [EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION]: EventCategory.ASSET_LIABILITY,
  [EventType.QUARTERLY_ESTIMATED_TAX_PAYMENT]: EventCategory.ASSET_LIABILITY,
  [EventType.LIABILITY_ADD]: EventCategory.ASSET_LIABILITY,
  [EventType.LIABILITY_PAYMENT]: EventCategory.ASSET_LIABILITY,
  [EventType.DEBT_PAYMENT]: EventCategory.ASSET_LIABILITY,
  [EventType.DEBT_CONSOLIDATION]: EventCategory.ASSET_LIABILITY,
  [EventType.REFINANCE]: EventCategory.ASSET_LIABILITY,
  [EventType.RSU_VESTING]: EventCategory.ASSET_LIABILITY,
  [EventType.RSU_SALE]: EventCategory.ASSET_LIABILITY,
  [EventType.FIVE_TWO_NINE_WITHDRAWAL]: EventCategory.ASSET_LIABILITY,
  [EventType.TUITION_PAYMENT]: EventCategory.ASSET_LIABILITY,
  [EventType.ANNUAL_GIFT]: EventCategory.ASSET_LIABILITY,
  [EventType.LARGE_GIFT]: EventCategory.ASSET_LIABILITY,
  [EventType.INHERITANCE]: EventCategory.ASSET_LIABILITY,
  [EventType.WITHDRAWAL]: EventCategory.ASSET_LIABILITY,
  [EventType.ACCOUNT_TRANSFER]: EventCategory.ASSET_LIABILITY,

  // Structural & Life Transition Events
  [EventType.INITIAL_STATE]: EventCategory.STRUCTURAL_LIFE,
  [EventType.GOAL_DEFINE]: EventCategory.STRUCTURAL_LIFE,
  [EventType.FINANCIAL_MILESTONE]: EventCategory.STRUCTURAL_LIFE,

  // Advanced & Custom Features
  [EventType.CONCENTRATION_RISK_ALERT]: EventCategory.ADVANCED_CUSTOM,
  [EventType.CAREER_CHANGE]: EventCategory.ADVANCED_CUSTOM,
  [EventType.FAMILY_EVENT]: EventCategory.ADVANCED_CUSTOM,
  [EventType.LIFE_INSURANCE_PREMIUM]: EventCategory.ADVANCED_CUSTOM,
  [EventType.LIFE_INSURANCE_PAYOUT]: EventCategory.ADVANCED_CUSTOM,
  [EventType.DISABILITY_INSURANCE_PREMIUM]: EventCategory.ADVANCED_CUSTOM,
  [EventType.DISABILITY_INSURANCE_PAYOUT]: EventCategory.ADVANCED_CUSTOM,
  [EventType.LONG_TERM_CARE_INSURANCE_PREMIUM]: EventCategory.ADVANCED_CUSTOM,
  [EventType.LONG_TERM_CARE_PAYOUT]: EventCategory.ADVANCED_CUSTOM,

  // Real Estate Events
  [EventType.REAL_ESTATE_PURCHASE]: EventCategory.ASSET_LIABILITY,
  [EventType.REAL_ESTATE_SALE]: EventCategory.ASSET_LIABILITY,

  // Strategy Events (deprecated - now under ASSET_LIABILITY for backward compat)
  [EventType.STRATEGY_POLICY]: EventCategory.ASSET_LIABILITY,
  [EventType.STRATEGY_EXECUTION]: EventCategory.ASSET_LIABILITY,
};

// Legacy color mapping for backward compatibility with edit modal
const LEGACY_COLOR_MAP: Record<EventCategory, string> = {
  [EventCategory.INCOME_CONSUMPTION]: 'info',
  [EventCategory.ASSET_LIABILITY]: 'purple',
  [EventCategory.STRUCTURAL_LIFE]: 'blue',
  [EventCategory.ADVANCED_CUSTOM]: 'gray'
};

// Legacy emoji mapping for backward compatibility with edit modal
const LEGACY_EMOJI_MAP: Record<EventCategory, string> = {
  [EventCategory.INCOME_CONSUMPTION]: '💰',
  [EventCategory.ASSET_LIABILITY]: '🔄',
  [EventCategory.STRUCTURAL_LIFE]: '🎯',
  [EventCategory.ADVANCED_CUSTOM]: '⚙️'
};

/**
 * Get the category for a given event type
 */
export const getEventCategory = (eventType: EventType): EventCategory => {
  return EVENT_TYPE_CATEGORY_MAP[eventType] || EventCategory.ADVANCED_CUSTOM;
};

/**
 * Get category information for display
 */
export const getCategoryInfo = (category: EventCategory): CategoryInfo => {
  return CATEGORY_INFO[category];
};

/**
 * Get legacy color for backward compatibility with edit modal
 */
export const getLegacyColor = (eventType: EventType): string => {
  const category = getEventCategory(eventType);
  return LEGACY_COLOR_MAP[category];
};

/**
 * Get legacy emoji for backward compatibility with edit modal
 */
export const getLegacyEmoji = (eventType: EventType): string => {
  const category = getEventCategory(eventType);
  return LEGACY_EMOJI_MAP[category];
};

/**
 * Get category-based display information for edit modal (legacy compatibility)
 */
export const getCategoryDisplayInfo = (eventType: EventType) => {
  const category = getEventCategory(eventType);
  const info = getCategoryInfo(category);
  
  return {
    name: info.title,
    emoji: info.icon,
    color: getLegacyColor(eventType),
    description: info.description,
  };
};

/**
 * Event type categorization for creation modal
 * Organized by category and subcategory for the creation flow
 */
export const EVENT_CATEGORIES = {
  [EventCategory.INCOME_CONSUMPTION]: {
    'Income Sources': [
      { type: EventType.INCOME, label: 'Regular Income', description: 'Salary, business income, rental income' },
      { type: EventType.BUSINESS_INCOME, label: 'Business Income', description: 'Self-employment and business revenue' },
      { type: EventType.RENTAL_INCOME, label: 'Rental Income', description: 'Property rental income' },
      { type: EventType.SOCIAL_SECURITY_INCOME, label: 'Social Security', description: 'Government retirement benefits' },
      { type: EventType.PENSION_INCOME, label: 'Pension Income', description: 'Employer-sponsored retirement income' },
      { type: EventType.ANNUITY_PAYMENT, label: 'Annuity Payments', description: 'Insurance product payments' },
      { type: EventType.RSU_VESTING, label: 'RSU Vesting', description: 'Equity compensation vesting' },
    ],
    'Living Expenses': [
      { type: EventType.RECURRING_EXPENSE, label: 'Recurring Expenses', description: 'Housing, food, utilities, transportation' },
      { type: EventType.HEALTHCARE_COST, label: 'Healthcare Costs', description: 'Medical expenses and insurance' },
      { type: EventType.ONE_TIME_EVENT, label: 'One-Time Expenses', description: 'Vacations, weddings, major purchases' },
    ]
  },
  [EventCategory.ASSET_LIABILITY]: {
    'Investment & Savings': [
      { type: EventType.SCHEDULED_CONTRIBUTION, label: 'Scheduled Contributions', description: '401k, IRA, HSA contributions' },
      { type: EventType.STRATEGY_ASSET_ALLOCATION_SET, label: 'Asset Allocation Strategy', description: 'Set target portfolio allocation' },
      { type: EventType.STRATEGIC_TRADE, label: 'Strategic Trades', description: 'Taxable investment purchases/sales' },
      { type: EventType.REBALANCE_PORTFOLIO, label: 'Portfolio Rebalancing', description: 'Rebalance asset allocation' },
    ],
    'Tax Optimization': [
      { type: EventType.ROTH_CONVERSION, label: 'Roth Conversions', description: 'Pre-tax to post-tax conversions' },
      { type: EventType.QUALIFIED_CHARITABLE_DISTRIBUTION, label: 'Charitable Distributions', description: 'Tax-free charitable giving' },
      { type: EventType.REQUIRED_MINIMUM_DISTRIBUTION, label: 'Required Distributions', description: 'Required withdrawals' },
      { type: EventType.TAX_LOSS_HARVESTING_SALE, label: 'Tax-Loss Harvesting', description: 'Strategic loss realization' },
      { type: EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION, label: 'Strategic Gains', description: 'Strategic gains realization' },
    ],
    'Retirement & Withdrawals': [
      { type: EventType.WITHDRAWAL, label: 'Account Withdrawals', description: 'Retirement and emergency withdrawals' },
      { type: EventType.ACCOUNT_TRANSFER, label: 'Account Transfers', description: 'Rollovers and account moves' },
    ],
    'Debt Management': [
      { type: EventType.LIABILITY_ADD, label: 'Add Debt', description: 'Taking on new debt' },
      { type: EventType.LIABILITY_PAYMENT, label: 'Debt Payments', description: 'Paying down debt' },
      { type: EventType.DEBT_PAYMENT, label: 'Advanced Debt Payment', description: 'Strategic debt payoff plans' },
      { type: EventType.HOME_EQUITY_LOAN, label: 'Home Equity Loan', description: 'Borrowing against home equity' },
      { type: EventType.MORTGAGE_PAYOFF, label: 'Mortgage Payoff', description: 'Early mortgage payoff strategies' },
    ],
    'Advanced Tax Strategies': [
      { type: EventType.MEGA_BACKDOOR_ROTH, label: 'Mega Backdoor Roth', description: 'After-tax 401k to Roth conversions' },
    ],
    'Property Management': [
      { type: EventType.REAL_ESTATE_APPRECIATION, label: 'Real Estate Appreciation', description: 'Property value appreciation modeling' },
      { type: EventType.PROPERTY_MAINTENANCE, label: 'Property Maintenance', description: 'Ongoing property maintenance costs' },
    ],
    'Healthcare & Life Events': [
      { type: EventType.HEALTHCARE_TRANSITION, label: 'Healthcare Transition', description: 'Changes in healthcare coverage' },
    ],
    'Advanced Investment Strategies': [
      { type: EventType.LEVERAGED_INVESTMENT, label: 'Leveraged Investment', description: 'Margin and leveraged investing strategies' },
      { type: EventType.BRIDGE_STRATEGY, label: 'Bridge Strategy', description: 'Financial bridge strategies between life phases' },
    ],
    'Equity Compensation': [
      { type: EventType.RSU_SALE, label: 'RSU Sales', description: 'Selling vested equity' },
    ],
    'Education': [
      { type: EventType.FIVE_TWO_NINE_CONTRIBUTION, label: '529 Plan Contributions', description: 'Contributions to 529 education savings plans' },
      { type: EventType.FIVE_TWO_NINE_WITHDRAWAL, label: '529 Plan Withdrawals', description: 'Withdrawals from 529 education savings plans' },
      { type: EventType.TUITION_PAYMENT, label: 'Tuition Payments', description: 'Direct education expenses and tuition payments' },
    ],
    'Estate & Gifting': [
      { type: EventType.ANNUAL_GIFT, label: 'Annual Gifts', description: 'Regular gifts to family and charitable organizations' },
      { type: EventType.LARGE_GIFT, label: 'Large Gifts', description: 'Significant gifts requiring advanced tax planning' },
      { type: EventType.INHERITANCE, label: 'Inheritance', description: 'Receiving inherited assets from deceased family members' },
    ],
    'Real Estate': [
      { type: EventType.REAL_ESTATE_PURCHASE, label: 'Real Estate Purchase', description: 'Buying residential or investment property' },
      { type: EventType.REAL_ESTATE_SALE, label: 'Real Estate Sale', description: 'Selling property with capital gains implications' },
      { type: EventType.RENTAL_INCOME, label: 'Rental Income', description: 'Income from rental properties' },
    ]
  },
  [EventCategory.STRUCTURAL_LIFE]: {
    'Financial Position': [
      { type: EventType.INITIAL_STATE, label: 'Initial State', description: 'Starting financial position' },
    ],
    'Life Planning': [
      { type: EventType.GOAL_DEFINE, label: 'Define Goals', description: 'Set financial goals and targets' },
      { type: EventType.CONCENTRATION_RISK_ALERT, label: 'Risk Monitoring', description: 'Portfolio risk alerts' },
      { type: EventType.FINANCIAL_MILESTONE, label: 'Financial Milestones', description: 'Track progress checkpoints' },
    ]
  },
  [EventCategory.ADVANCED_CUSTOM]: {
    'Life Transitions': [
      { type: EventType.CAREER_CHANGE, label: 'Career Changes', description: 'Retirement, promotions, career switches' },
      { type: EventType.FAMILY_EVENT, label: 'Family Events', description: 'Marriage, children, divorce' },
      { type: EventType.RELOCATION, label: 'Relocation', description: 'State changes, cost of living adjustments' },
    ]
  }
};

/**
 * Get event type display name for UI
 */
export const getEventTypeDisplayName = (type: EventType): string => {
  const eventTypeNames: Partial<Record<EventType, string>> = {
    [EventType.INCOME]: 'Job/Income Event',
    [EventType.BUSINESS_INCOME]: 'Business Income',
    [EventType.RENTAL_INCOME]: 'Rental Income',
    [EventType.RECURRING_EXPENSE]: 'Recurring Expense',
    [EventType.ONE_TIME_EVENT]: 'Life Event',
    [EventType.HEALTHCARE_COST]: 'Healthcare Cost',
    [EventType.SOCIAL_SECURITY_INCOME]: 'Social Security Income',
    [EventType.PENSION_INCOME]: 'Pension Income',
    [EventType.ANNUITY_PAYMENT]: 'Annuity Payment',
    [EventType.SCHEDULED_CONTRIBUTION]: 'Scheduled Contribution',
    [EventType.ROTH_CONVERSION]: 'Roth Conversion',
    [EventType.STRATEGY_ASSET_ALLOCATION_SET]: 'Asset Allocation Strategy',
    [EventType.LIABILITY_ADD]: 'Add Liability/Debt',
    [EventType.LIABILITY_PAYMENT]: 'Debt Payment',
    [EventType.DEBT_PAYMENT]: 'Advanced Debt Payment',
    [EventType.QUALIFIED_CHARITABLE_DISTRIBUTION]: 'Charitable Distribution',
    [EventType.REQUIRED_MINIMUM_DISTRIBUTION]: 'Required Distribution',
    [EventType.WITHDRAWAL]: 'Account Withdrawal',
    [EventType.ACCOUNT_TRANSFER]: 'Account Transfer',
    [EventType.GOAL_DEFINE]: 'Financial Goal',
    [EventType.INITIAL_STATE]: 'Initial State',
    [EventType.CAREER_CHANGE]: 'Career Change',
    [EventType.FAMILY_EVENT]: 'Family Event',
    [EventType.RELOCATION]: 'Relocation',
    [EventType.MEGA_BACKDOOR_ROTH]: 'Mega Backdoor Roth',
    [EventType.HOME_EQUITY_LOAN]: 'Home Equity Loan',
    [EventType.LEVERAGED_INVESTMENT]: 'Leveraged Investment',
    [EventType.BRIDGE_STRATEGY]: 'Bridge Strategy',
    [EventType.MORTGAGE_PAYOFF]: 'Mortgage Payoff',
    [EventType.REAL_ESTATE_APPRECIATION]: 'Real Estate Appreciation',
    [EventType.PROPERTY_MAINTENANCE]: 'Property Maintenance',
    [EventType.HEALTHCARE_TRANSITION]: 'Healthcare Transition',
    [EventType.STRATEGY_POLICY]: 'Strategy Policy',
    [EventType.STRATEGY_EXECUTION]: 'Strategy Execution',
  };

  if (!type) return 'Unknown Event';
  return eventTypeNames[type] || type.replace(/_/g, ' ');
};

/**
 * Get event type description for UI
 */
export const getEventTypeDescription = (type: EventType): string => {
  const descriptions: Partial<Record<EventType, string>> = {
    [EventType.INCOME]: 'Edit your position or career details',
    [EventType.BUSINESS_INCOME]: 'Edit your business or self-employment income',
    [EventType.RENTAL_INCOME]: 'Edit your rental property income',
    [EventType.RECURRING_EXPENSE]: 'Edit your recurring expense',
    [EventType.ONE_TIME_EVENT]: 'Edit your life event',
    [EventType.HEALTHCARE_COST]: 'Edit your healthcare cost',
    [EventType.SOCIAL_SECURITY_INCOME]: 'Edit your Social Security income',
    [EventType.PENSION_INCOME]: 'Edit your pension income',
    [EventType.ANNUITY_PAYMENT]: 'Edit your annuity payment schedule',
    [EventType.SCHEDULED_CONTRIBUTION]: 'Edit your investment contributions',
    [EventType.ROTH_CONVERSION]: 'Edit your Roth conversion strategy',
    [EventType.STRATEGY_ASSET_ALLOCATION_SET]: 'Edit your asset allocation strategy',
    [EventType.LIABILITY_ADD]: 'Edit your loan or liability details',
    [EventType.LIABILITY_PAYMENT]: 'Edit your debt payment plan',
    [EventType.DEBT_PAYMENT]: 'Edit your strategic debt payoff plan',
    [EventType.QUALIFIED_CHARITABLE_DISTRIBUTION]: 'Edit your charitable distribution',
    [EventType.REQUIRED_MINIMUM_DISTRIBUTION]: 'Edit your required minimum distribution',
    [EventType.WITHDRAWAL]: 'Edit your account withdrawal strategy',
    [EventType.ACCOUNT_TRANSFER]: 'Edit your account transfer details',
    [EventType.GOAL_DEFINE]: 'Edit your financial goal',
    [EventType.INITIAL_STATE]: 'Edit your initial financial state',
    [EventType.STRATEGY_POLICY]: 'Configure your automated financial strategy',
    [EventType.STRATEGY_EXECUTION]: 'View strategy execution details',
  };

  return descriptions[type] || 'Edit your financial event';
};