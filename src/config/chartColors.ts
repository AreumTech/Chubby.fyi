// config/chartColors.ts
const getCssVariable = (name: string) => `var(--color-${name})`;

export const CHART_COLORS = {
  // Blueprint-aligned base colors:
  accentPrimary: getCssVariable("accent-primary"),
  textSecondary: getCssVariable("text-secondary"),
  textPrimary: getCssVariable("text-primary"),
  borderColor: getCssVariable("border-primary"),
  bgSecondary: getCssVariable("bg-secondary"),

  // Canvas chart core colors (needed by useChartRenderer)
  primary: getCssVariable("accent-primary"),
  primaryFill: "rgba(59, 130, 246, 0.1)", // Blue with transparency
  event: getCssVariable("purple"),

  // Enhanced interaction colors for polished UX
  hover: getCssVariable("accent-primary-hover"),
  selected: getCssVariable("accent-primary"),
  grid: getCssVariable("chart-grid"),

  // Event-specific / Semantic colors using new palette:
  eventIncome: getCssVariable("success"),
  eventExpense: getCssVariable("danger"),
  eventGoal: getCssVariable("info"),
  eventStrategy: getCssVariable("purple"),

  // Net Worth Chart Stack Colors
  cash: getCssVariable("text-tertiary"),

  // Taxable Account Colors
  taxableStocks: getCssVariable("accent-primary"),
  taxableBonds: getCssVariable("info"),
  taxableOtherAssets: getCssVariable("accent-primary-light"),

  // Tax-Deferred Account Colors
  taxDeferredStocks: getCssVariable("text-secondary"),
  taxDeferredBonds: "#8892A3", // Slightly different gray
  taxDeferredOtherAssets: "#5A6474",

  // Roth Account Colors
  rothStocks: getCssVariable("success"),
  rothBonds: "#22C55E", // Lighter green
  rothOtherAssets: "#15803D", // Darker green
};

// EVENT_TYPE_COLORS provides a mapping from EventType to color for event display
export const EVENT_TYPE_COLORS = {
  INITIAL_STATE: CHART_COLORS.textPrimary,
  ASSET_INITIAL: CHART_COLORS.textPrimary,
  LIABILITY_ADD: CHART_COLORS.eventExpense,
  INCOME: CHART_COLORS.eventIncome,
  SOCIAL_SECURITY_INCOME: CHART_COLORS.eventIncome,
  SCHEDULED_CONTRIBUTION: CHART_COLORS.eventIncome,
  EXPENSE: CHART_COLORS.eventExpense,
  HEALTHCARE_PREMIUMS: CHART_COLORS.eventExpense,
  SCHEDULED_DEBT_PAYMENT: CHART_COLORS.eventExpense,
  ONE_TIME_EVENT: CHART_COLORS.eventIncome, // or eventExpense, handled in logic
  ROTH_CONVERSION: CHART_COLORS.rothOtherAssets,
  GOAL_DEFINE: CHART_COLORS.eventGoal,
  STRATEGY_ASSET_ALLOCATION_SET: CHART_COLORS.taxableOtherAssets,
  STRATEGY_REBALANCING_RULE_SET: CHART_COLORS.taxDeferredOtherAssets,
};
