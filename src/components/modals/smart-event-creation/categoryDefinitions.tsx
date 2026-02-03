/**
 * Category metadata definitions for event creation modal
 * Defines icons, labels, and colors for each event category
 */

// Note: 'strategy' category removed - strategy events now merged into 'tax' and 'investment' categories
export const CATEGORY_METADATA = {
    income: { icon: '💰', label: 'Income', color: 'green' },
    expense: { icon: '💸', label: 'Expenses', color: 'red' },
    investment: { icon: '📈', label: 'Investments', color: 'blue' },
    tax: { icon: '📋', label: 'Tax Strategies', color: 'purple' },
    debt: { icon: '💳', label: 'Debt & Loans', color: 'orange' },
    lifecycle: { icon: '🎯', label: 'Life Events', color: 'gray' },
    goal: { icon: '🏆', label: 'Goals', color: 'gold' }
} as const;

export type CategoryKey = keyof typeof CATEGORY_METADATA;