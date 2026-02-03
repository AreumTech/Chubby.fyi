/**
 * Event Discovery Service
 * 
 * Smart search and recommendation system for financial events.
 * Helps users quickly find the right event type for their needs.
 */

import { EventType } from '@/types/events';

// Event metadata for discovery
export interface EventMetadata {
  type: EventType | string; // Allow string for dynamic event types
  label: string;
  description: string;
  category: 'income' | 'expense' | 'investment' | 'tax' | 'debt' | 'goal' | 'strategy' | 'lifecycle';
  tags: string[];
  searchTerms: string[];
  complexity: 'basic' | 'intermediate' | 'advanced';
  frequency: 'one-time' | 'recurring' | 'conditional';
  isDynamic?: boolean;
  examples?: string[];
  relatedEvents?: string[];
  icon?: string;
  color?: string;
  formAvailable: boolean;
  comingSoon?: boolean;
}

// Complete event registry with all event types
export const EVENT_REGISTRY: EventMetadata[] = [
  // ========== INCOME EVENTS ==========
  {
    type: EventType.INCOME,
    label: 'Salary & Wages',
    description: 'Regular employment income from job or career',
    category: 'income',
    tags: ['salary', 'wages', 'job', 'career', 'employment', 'w2'],
    searchTerms: ['paycheck', 'biweekly', 'monthly salary', 'annual salary', 'hourly wage', 'promotion', 'raise'],
    complexity: 'basic',
    frequency: 'recurring',
    examples: ['$120,000 annual salary', '$5,000 biweekly paycheck'],
    icon: '💼',
    color: 'green',
    formAvailable: true
  },
  {
    type: EventType.BUSINESS_INCOME,
    label: 'Business & Self-Employment',
    description: 'Income from business ownership or freelancing',
    category: 'income',
    tags: ['business', 'self-employed', '1099', 'freelance', 'consulting'],
    searchTerms: ['business revenue', 'consulting income', 'freelance income', 'side hustle', 'gig economy'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['$10,000/month consulting', '$50,000 annual business profit'],
    icon: '🏢',
    color: 'green',
    formAvailable: true
  },
  {
    type: EventType.RENTAL_INCOME,
    label: 'Rental Property Income',
    description: 'Income from real estate rentals',
    category: 'income',
    tags: ['rental', 'real estate', 'property', 'landlord', 'airbnb'],
    searchTerms: ['rental income', 'property income', 'real estate income', 'passive income'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['$2,500/month rental income', '$30,000 annual rental profit'],
    icon: '🏠',
    color: 'green',
    formAvailable: true
  },
  {
    type: EventType.SOCIAL_SECURITY_INCOME,
    label: 'Social Security Benefits',
    description: 'Government retirement benefits',
    category: 'income',
    tags: ['social security', 'retirement', 'government', 'benefits'],
    searchTerms: ['ss benefits', 'social security check', 'retirement benefits', 'ssa'],
    complexity: 'basic',
    frequency: 'recurring',
    examples: ['$2,000/month at age 67', '$3,500/month delayed to 70'],
    icon: '🏛️',
    color: 'green',
    formAvailable: true
  },
  {
    type: EventType.PENSION_INCOME,
    label: 'Pension Benefits',
    description: 'Employer-sponsored defined benefit pension',
    category: 'income',
    tags: ['pension', 'retirement', 'defined benefit', 'employer'],
    searchTerms: ['pension check', 'retirement pension', 'db plan', 'monthly pension'],
    complexity: 'basic',
    frequency: 'recurring',
    examples: ['$4,000/month pension', '60% of final salary'],
    icon: '📜',
    color: 'green',
    formAvailable: true
  },
  {
    type: EventType.ANNUITY_PAYMENT,
    label: 'Annuity Income',
    description: 'Payments from annuity contracts',
    category: 'income',
    tags: ['annuity', 'insurance', 'guaranteed income', 'retirement'],
    searchTerms: ['annuity payment', 'lifetime income', 'immediate annuity', 'deferred annuity'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['$1,500/month lifetime', '$2,000/month for 20 years'],
    icon: '🔄',
    color: 'green',
    formAvailable: true
  },
  {
    type: EventType.DIVIDEND_INCOME,
    label: 'Dividend & Interest Income',
    description: 'Investment income from dividends and interest',
    category: 'income',
    tags: ['dividends', 'interest', 'investment income', 'passive'],
    searchTerms: ['dividend payment', 'bond interest', 'cd interest', 'investment income'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['2% dividend yield', '$500/quarter dividends'],
    icon: '📈',
    color: 'green',
    formAvailable: true
  },

  // ========== EXPENSE EVENTS ==========
  {
    type: EventType.RECURRING_EXPENSE,
    label: 'Living Expenses',
    description: 'Regular household and lifestyle expenses',
    category: 'expense',
    tags: ['expenses', 'bills', 'housing', 'utilities', 'food'],
    searchTerms: ['rent', 'mortgage', 'utilities', 'groceries', 'insurance', 'phone', 'internet'],
    complexity: 'basic',
    frequency: 'recurring',
    examples: ['$2,000/month rent', '$500/month groceries'],
    icon: '🏡',
    color: 'red',
    formAvailable: true
  },
  {
    type: EventType.HEALTHCARE_COST,
    label: 'Healthcare Expenses',
    description: 'Medical costs and health insurance',
    category: 'expense',
    tags: ['healthcare', 'medical', 'insurance', 'health'],
    searchTerms: ['health insurance', 'medical bills', 'prescriptions', 'dental', 'vision'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['$500/month insurance', '$5,000 surgery'],
    icon: '🏥',
    color: 'red',
    formAvailable: true
  },
  {
    type: EventType.ONE_TIME_EVENT,
    label: 'Major Purchase',
    description: 'One-time large expenses or purchases',
    category: 'expense',
    tags: ['purchase', 'one-time', 'vacation', 'wedding', 'car'],
    searchTerms: ['vacation', 'wedding', 'car purchase', 'home renovation', 'furniture'],
    complexity: 'basic',
    frequency: 'one-time',
    examples: ['$30,000 wedding', '$10,000 vacation'],
    icon: '💳',
    color: 'red',
    formAvailable: true
  },
  {
    type: EventType.TUITION_PAYMENT,
    label: 'Education Expenses',
    description: 'College tuition and education costs',
    category: 'expense',
    tags: ['education', 'tuition', 'college', 'school'],
    searchTerms: ['college tuition', 'private school', 'education costs', 'student fees'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['$50,000/year tuition', '$2,000/month private school'],
    icon: '🎓',
    color: 'red',
    formAvailable: true
  },

  // ========== INVESTMENT EVENTS ==========
  {
    type: EventType.SCHEDULED_CONTRIBUTION,
    label: 'Investment Contributions',
    description: 'Regular contributions to investment accounts',
    category: 'investment',
    tags: ['401k', 'ira', 'hsa', 'investment', 'retirement'],
    searchTerms: ['401k contribution', 'ira contribution', 'roth ira', 'hsa contribution', 'brokerage'],
    complexity: 'basic',
    frequency: 'recurring',
    examples: ['$1,625/month 401k', '$500/month Roth IRA'],
    icon: '💰',
    color: 'blue',
    formAvailable: true
  },
  {
    type: EventType.WITHDRAWAL,
    label: 'Account Withdrawals',
    description: 'Withdrawals from investment accounts',
    category: 'investment',
    tags: ['withdrawal', 'retirement', 'distribution'],
    searchTerms: ['401k withdrawal', 'ira withdrawal', 'retirement income', 'account distribution'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['$5,000/month retirement', '4% annual withdrawal'],
    icon: '🏦',
    color: 'orange',
    formAvailable: true
  },
  {
    type: EventType.ACCOUNT_TRANSFER,
    label: 'Account Transfers',
    description: 'Move money between accounts',
    category: 'investment',
    tags: ['transfer', 'rollover', 'move money'],
    searchTerms: ['rollover', 'transfer funds', 'move money', 'account transfer'],
    complexity: 'basic',
    frequency: 'one-time',
    examples: ['401k rollover to IRA', 'Savings to brokerage'],
    icon: '↔️',
    color: 'blue',
    formAvailable: true
  },
  {
    type: EventType.STRATEGY_ASSET_ALLOCATION_SET,
    label: 'Asset Allocation Strategy',
    description: 'Set target portfolio allocation',
    category: 'investment',
    tags: ['allocation', 'portfolio', 'strategy', 'rebalance'],
    searchTerms: ['asset allocation', 'portfolio mix', 'stocks bonds', 'target allocation'],
    complexity: 'intermediate',
    frequency: 'one-time',
    examples: ['60/40 stocks/bonds', '80/20 portfolio'],
    icon: '📊',
    color: 'blue',
    formAvailable: true
  },
  {
    type: EventType.REBALANCE_PORTFOLIO,
    label: 'Portfolio Rebalancing',
    description: 'Rebalance investments to target allocation',
    category: 'investment',
    tags: ['rebalance', 'portfolio', 'allocation'],
    searchTerms: ['rebalance portfolio', 'adjust allocation', 'portfolio adjustment'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['Quarterly rebalancing', 'Annual rebalancing'],
    icon: '⚖️',
    color: 'blue',
    formAvailable: true
  },
  {
    type: EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION,
    label: 'Sell Investments',
    description: 'Realize capital gains or losses',
    category: 'investment',
    tags: ['sell', 'capital gains', 'stocks', 'investments'],
    searchTerms: ['sell stocks', 'realize gains', 'harvest losses', 'sell investments'],
    complexity: 'intermediate',
    frequency: 'one-time',
    examples: ['Sell $50,000 stocks', 'Harvest $3,000 losses'],
    icon: '📉',
    color: 'orange',
    formAvailable: true
  },

  // ========== TAX EVENTS ==========
  {
    type: EventType.ROTH_CONVERSION,
    label: 'Roth Conversion',
    description: 'Convert traditional IRA to Roth IRA',
    category: 'tax',
    tags: ['roth', 'conversion', 'tax', 'ira'],
    searchTerms: ['roth conversion', 'ira conversion', 'backdoor roth', 'tax strategy'],
    complexity: 'advanced',
    frequency: 'one-time',
    examples: ['$50,000 conversion', 'Annual conversions'],
    icon: '🔄',
    color: 'purple',
    formAvailable: true
  },
  {
    type: EventType.MEGA_BACKDOOR_ROTH,
    label: 'Mega Backdoor Roth',
    description: 'After-tax 401k to Roth conversion',
    category: 'tax',
    tags: ['mega backdoor', 'roth', '401k', 'after-tax'],
    searchTerms: ['mega backdoor roth', 'after-tax 401k', 'in-service rollover'],
    complexity: 'advanced',
    frequency: 'recurring',
    examples: ['$30,000/year after-tax'],
    icon: '🚀',
    color: 'purple',
    formAvailable: true
  },
  {
    type: EventType.REQUIRED_MINIMUM_DISTRIBUTION,
    label: 'Required Distributions (RMD)',
    description: 'Required withdrawals from retirement accounts',
    category: 'tax',
    tags: ['rmd', 'required', 'distribution', 'retirement'],
    searchTerms: ['rmd', 'required minimum distribution', 'ira rmd', '401k rmd'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['$25,000/year RMD at 73'],
    icon: '📋',
    color: 'purple',
    formAvailable: true
  },
  {
    type: EventType.QUALIFIED_CHARITABLE_DISTRIBUTION,
    label: 'Charitable Distributions (QCD)',
    description: 'Tax-free charitable giving from IRA',
    category: 'tax',
    tags: ['qcd', 'charity', 'donation', 'tax'],
    searchTerms: ['qcd', 'charitable distribution', 'ira donation', 'tax-free giving'],
    complexity: 'advanced',
    frequency: 'recurring',
    examples: ['$10,000/year to charity'],
    icon: '❤️',
    color: 'purple',
    formAvailable: true
  },
  {
    type: EventType.TAX_LOSS_HARVESTING_SALE,
    label: 'Tax Loss Harvesting',
    description: 'Strategically realize losses for tax benefits',
    category: 'tax',
    tags: ['tax loss', 'harvesting', 'capital loss', 'tax'],
    searchTerms: ['tax loss harvesting', 'harvest losses', 'capital loss', 'tax strategy'],
    complexity: 'advanced',
    frequency: 'recurring',
    examples: ['Harvest $3,000 losses annually'],
    icon: '🌾',
    color: 'purple',
    formAvailable: true
  },

  // ========== DEBT EVENTS ==========
  {
    type: EventType.LIABILITY_ADD,
    label: 'New Loan or Debt',
    description: 'Take on new debt or loans',
    category: 'debt',
    tags: ['loan', 'debt', 'mortgage', 'car loan'],
    searchTerms: ['mortgage', 'auto loan', 'personal loan', 'student loan', 'heloc'],
    complexity: 'intermediate',
    frequency: 'one-time',
    examples: ['$400,000 mortgage', '$30,000 car loan'],
    icon: '📄',
    color: 'orange',
    formAvailable: true
  },
  {
    type: EventType.LIABILITY_PAYMENT,
    label: 'Debt Payments',
    description: 'Regular payments on existing debt',
    category: 'debt',
    tags: ['payment', 'debt', 'mortgage', 'loan'],
    searchTerms: ['mortgage payment', 'loan payment', 'debt payment', 'principal payment'],
    complexity: 'basic',
    frequency: 'recurring',
    examples: ['$2,500/month mortgage', '$500/month car payment'],
    icon: '💵',
    color: 'orange',
    formAvailable: true
  },
  {
    type: EventType.DEBT_PAYMENT,
    label: 'Strategic Debt Payoff',
    description: 'Accelerated debt payoff strategies',
    category: 'debt',
    tags: ['payoff', 'debt', 'avalanche', 'snowball'],
    searchTerms: ['debt payoff', 'debt avalanche', 'debt snowball', 'extra payment'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['$1,000/month extra to mortgage'],
    icon: '🎯',
    color: 'orange',
    formAvailable: true
  },
  {
    type: EventType.HOME_EQUITY_LOAN,
    label: 'Home Equity Line (HELOC)',
    description: 'Borrow against home equity',
    category: 'debt',
    tags: ['heloc', 'home equity', 'loan', 'credit line'],
    searchTerms: ['heloc', 'home equity loan', 'home equity line', 'equity borrowing'],
    complexity: 'advanced',
    frequency: 'one-time',
    examples: ['$100,000 HELOC at 7%'],
    icon: '🏠',
    color: 'orange',
    formAvailable: true
  },

  // ========== STRATEGY POLICY EVENTS ==========
  // Duration-based strategies that appear on the timeline
  {
    type: EventType.STRATEGY_POLICY,
    label: 'Strategy Policy',
    description: 'Duration-based financial strategy with timeline visualization',
    category: 'strategy',
    tags: ['strategy', 'policy', 'timeline', 'automation', 'duration'],
    searchTerms: ['tax loss harvesting', 'asset allocation', 'rebalancing', 'roth conversion ladder', 'withdrawal strategy'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['Tax Loss Harvesting 2025-2035', 'Roth Conversion Ladder', 'Portfolio Rebalancing'],
    icon: '📊',
    color: 'violet',
    formAvailable: true
  },

  // ========== DYNAMIC STRATEGY EVENTS ==========
  // These require runtime context evaluation - coming soon
  {
    type: 'CONDITIONAL_CONTRIBUTION',
    label: 'Smart Savings',
    description: 'Automatically save when conditions are met',
    category: 'strategy',
    tags: ['smart', 'automatic', 'conditional', 'savings'],
    searchTerms: ['conditional savings', 'smart contribution', 'automatic saving', 'if-then savings'],
    complexity: 'advanced',
    frequency: 'conditional',
    isDynamic: true,
    examples: ['Save excess above $10k cash', 'Invest when income > $10k/month'],
    icon: '🤖',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },
  {
    type: 'WATERFALL_ALLOCATION',
    label: 'Priority Savings Cascade',
    description: 'Allocate savings in priority order',
    category: 'strategy',
    tags: ['waterfall', 'priority', 'cascade', 'allocation'],
    searchTerms: ['waterfall allocation', 'priority savings', 'savings cascade', 'tiered savings'],
    complexity: 'advanced',
    frequency: 'conditional',
    isDynamic: true,
    examples: ['401k → IRA → Taxable', 'Emergency → Debt → Invest'],
    icon: '💧',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },
  {
    type: 'PERCENTAGE_CONTRIBUTION',
    label: 'Percentage-Based Savings',
    description: 'Save a percentage of income automatically',
    category: 'strategy',
    tags: ['percentage', 'income', 'automatic', 'savings'],
    searchTerms: ['percentage savings', 'income percentage', 'automatic percentage', 'pay yourself first'],
    complexity: 'intermediate',
    frequency: 'recurring',
    isDynamic: true,
    examples: ['Save 20% of income', '15% to 401k'],
    icon: '%',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },
  {
    type: 'SMART_DEBT_PAYMENT',
    label: 'Smart Debt Payoff',
    description: 'Optimize debt payments based on strategy',
    category: 'strategy',
    tags: ['debt', 'smart', 'avalanche', 'snowball', 'optimization'],
    searchTerms: ['smart debt', 'debt optimization', 'avalanche method', 'snowball method'],
    complexity: 'advanced',
    frequency: 'conditional',
    isDynamic: true,
    examples: ['Pay highest rate first', 'Pay smallest balance first'],
    icon: '🎯',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },
  {
    type: 'GOAL_DRIVEN_CONTRIBUTION',
    label: 'Goal-Based Savings',
    description: 'Adjust savings to meet financial goals',
    category: 'strategy',
    tags: ['goal', 'target', 'adaptive', 'savings'],
    searchTerms: ['goal savings', 'target savings', 'goal-based', 'adaptive contribution'],
    complexity: 'advanced',
    frequency: 'conditional',
    isDynamic: true,
    examples: ['Save for $1M by 65', 'House down payment by 2025'],
    icon: '🎯',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },
  {
    type: 'EMERGENCY_FUND_MAINTENANCE',
    label: 'Emergency Fund Auto-Pilot',
    description: 'Automatically maintain emergency fund target',
    category: 'strategy',
    tags: ['emergency', 'fund', 'automatic', 'maintenance'],
    searchTerms: ['emergency fund', 'cash reserve', 'safety net', 'rainy day fund'],
    complexity: 'intermediate',
    frequency: 'conditional',
    isDynamic: true,
    examples: ['Maintain 6 months expenses', 'Keep $20k minimum'],
    icon: '🛡️',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },
  {
    type: 'AUTOMATIC_REBALANCING',
    label: 'Auto-Rebalancing',
    description: 'Automatically rebalance portfolio',
    category: 'strategy',
    tags: ['rebalance', 'automatic', 'portfolio', 'allocation'],
    searchTerms: ['auto rebalance', 'automatic rebalancing', 'portfolio maintenance'],
    complexity: 'advanced',
    frequency: 'conditional',
    isDynamic: true,
    examples: ['Rebalance when 5% off target', 'Quarterly rebalancing'],
    icon: '⚖️',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },
  {
    type: 'INCOME_RESPONSIVE_SAVINGS',
    label: 'Income-Adaptive Savings',
    description: 'Adjust savings rate with income changes',
    category: 'strategy',
    tags: ['income', 'adaptive', 'responsive', 'savings'],
    searchTerms: ['income responsive', 'adaptive savings', 'dynamic savings rate'],
    complexity: 'advanced',
    frequency: 'conditional',
    isDynamic: true,
    examples: ['Save 50% of raises', 'Increase savings with bonuses'],
    icon: '📈',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },
  {
    type: 'LIFECYCLE_ADJUSTMENT',
    label: 'Age-Based Allocation',
    description: 'Adjust portfolio allocation with age',
    category: 'strategy',
    tags: ['lifecycle', 'age', 'glide path', 'allocation'],
    searchTerms: ['lifecycle fund', 'age-based', 'glide path', 'target date'],
    complexity: 'advanced',
    frequency: 'conditional',
    isDynamic: true,
    examples: ['120 minus age in stocks', 'Glide path to retirement'],
    icon: '📅',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },
  {
    type: 'TAX_LOSS_HARVESTING',
    label: 'Automated Tax Harvesting',
    description: 'Automatically harvest tax losses',
    category: 'strategy',
    tags: ['tax', 'harvesting', 'automatic', 'optimization'],
    searchTerms: ['tax loss harvesting', 'automated harvesting', 'tax optimization'],
    complexity: 'advanced',
    frequency: 'conditional',
    isDynamic: true,
    examples: ['Harvest when loss > $1,000', 'Year-end tax optimization'],
    icon: '🌾',
    color: 'teal',
    formAvailable: false,
    comingSoon: true
  },

  // ========== LIFECYCLE EVENTS ==========
  {
    type: EventType.INITIAL_STATE,
    label: 'Starting Financial Position',
    description: 'Set your initial account balances and assets',
    category: 'lifecycle',
    tags: ['initial', 'starting', 'balance', 'assets'],
    searchTerms: ['starting balance', 'initial assets', 'current position', 'net worth'],
    complexity: 'basic',
    frequency: 'one-time',
    examples: ['$50k in 401k, $20k savings'],
    icon: '🏁',
    color: 'gray',
    formAvailable: true
  },
  {
    type: EventType.RELOCATION,
    label: 'Relocation & State Move',
    description: 'Moving to a new state with tax and cost changes',
    category: 'lifecycle',
    tags: ['relocation', 'move', 'state', 'taxes', 'cost of living'],
    searchTerms: ['moving states', 'relocating', 'state taxes', 'cost of living change', 'job relocation'],
    complexity: 'intermediate',
    frequency: 'one-time',
    examples: ['Move from CA to TX', 'Job relocation to FL'],
    icon: '🚚',
    color: 'gray',
    formAvailable: true
  },
  {
    type: EventType.REAL_ESTATE_APPRECIATION,
    label: 'Property Value Tracking',
    description: 'Track real estate appreciation over time',
    category: 'lifecycle',
    tags: ['real estate', 'property', 'appreciation', 'value', 'investment'],
    searchTerms: ['home value', 'property appreciation', 'real estate growth', 'house value'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['3% annual home appreciation', 'Track rental property value'],
    icon: '📈',
    color: 'gray',
    formAvailable: true
  },
  {
    type: EventType.PROPERTY_MAINTENANCE,
    label: 'Property Maintenance Costs',
    description: 'Ongoing property maintenance and repair expenses',
    category: 'expense',
    tags: ['property', 'maintenance', 'repairs', 'homeowner', 'landlord'],
    searchTerms: ['home maintenance', 'property repairs', 'homeowner costs', 'rental maintenance'],
    complexity: 'intermediate',
    frequency: 'recurring',
    examples: ['1% annual maintenance costs', '$5k roof repair every 20 years'],
    icon: '🔧',
    color: 'red',
    formAvailable: true
  },
  {
    type: EventType.HEALTHCARE_TRANSITION,
    label: 'Healthcare Coverage Transition',
    description: 'COBRA, ACA, or other healthcare coverage changes',
    category: 'expense',
    tags: ['healthcare', 'cobra', 'aca', 'insurance', 'transition'],
    searchTerms: ['cobra coverage', 'aca marketplace', 'health insurance gap', 'early retirement healthcare'],
    complexity: 'advanced',
    frequency: 'one-time',
    examples: ['18 months COBRA at $800/month', 'ACA plan until Medicare'],
    icon: '🏥',
    color: 'red',
    formAvailable: true
  },
  {
    type: EventType.GOAL_DEFINE,
    label: 'Financial Goals',
    description: 'Define financial targets and milestones',
    category: 'goal',
    tags: ['goal', 'target', 'milestone', 'objective'],
    searchTerms: ['retirement goal', 'savings goal', 'financial target', 'fire goal'],
    complexity: 'basic',
    frequency: 'one-time',
    examples: ['$1M by retirement', 'House down payment'],
    icon: '🎯',
    color: 'gold',
    formAvailable: false
  },
  {
    type: EventType.CAREER_CHANGE,
    label: 'Career Change',
    description: 'Job change, promotion, or retirement',
    category: 'lifecycle',
    tags: ['career', 'job', 'promotion', 'retirement'],
    searchTerms: ['job change', 'career switch', 'promotion', 'retirement', 'sabbatical'],
    complexity: 'intermediate',
    frequency: 'one-time',
    examples: ['New job at $150k', 'Retire at 65'],
    icon: '🚀',
    color: 'gray',
    formAvailable: true
  },
  {
    type: EventType.FAMILY_EVENT,
    label: 'Family Milestones',
    description: 'Marriage, children, divorce',
    category: 'lifecycle',
    tags: ['family', 'marriage', 'children', 'divorce'],
    searchTerms: ['getting married', 'having baby', 'divorce', 'adoption', 'family change'],
    complexity: 'intermediate',
    frequency: 'one-time',
    examples: ['Marriage in 2025', 'First child in 2026'],
    icon: '👨‍👩‍👧‍👦',
    color: 'gray',
    formAvailable: true
  },
  {
    type: EventType.REAL_ESTATE_PURCHASE,
    label: 'Buy Real Estate',
    description: 'Purchase home or investment property',
    category: 'lifecycle',
    tags: ['real estate', 'home', 'property', 'purchase'],
    searchTerms: ['buy house', 'home purchase', 'investment property', 'real estate'],
    complexity: 'advanced',
    frequency: 'one-time',
    examples: ['$500k home purchase', '$300k rental property'],
    icon: '🏡',
    color: 'gray',
    formAvailable: true
  },
  {
    type: EventType.REAL_ESTATE_SALE,
    label: 'Sell Real Estate',
    description: 'Sell home or investment property',
    category: 'lifecycle',
    tags: ['real estate', 'sell', 'property', 'sale'],
    searchTerms: ['sell house', 'home sale', 'property sale', 'downsize'],
    complexity: 'advanced',
    frequency: 'one-time',
    examples: ['Sell home for $600k', 'Downsize in retirement'],
    icon: '🏷️',
    color: 'gray',
    formAvailable: true
  },

  // ========== MAJOR PURCHASE EVENTS ==========
  {
    type: EventType.VEHICLE_PURCHASE,
    label: 'Vehicle Purchase',
    description: 'Buy a car, truck, motorcycle, or other vehicle',
    category: 'expense',
    tags: ['vehicle', 'car', 'purchase', 'transportation', 'auto'],
    searchTerms: ['car', 'vehicle', 'truck', 'motorcycle', 'auto', 'buy car'],
    complexity: 'basic',
    frequency: 'one-time',
    examples: ['Buy $25k used car', 'New truck $45k'],
    icon: '🚗',
    color: 'blue',
    formAvailable: true
  },
  {
    type: EventType.HOME_IMPROVEMENT,
    label: 'Home Improvement',
    description: 'Renovations, upgrades, repairs, or major home improvements',
    category: 'expense',
    tags: ['home', 'renovation', 'improvement', 'remodel', 'repair'],
    searchTerms: ['renovation', 'remodel', 'home improvement', 'kitchen', 'bathroom', 'roof'],
    complexity: 'intermediate',
    frequency: 'one-time',
    examples: ['$30k kitchen remodel', '$15k roof replacement'],
    icon: '🔨',
    color: 'orange',
    formAvailable: true
  },
  {
    type: EventType.EDUCATION_EXPENSE,
    label: 'Education & Training',
    description: 'Professional development, courses, certifications, or continuing education',
    category: 'expense',
    tags: ['education', 'training', 'certification', 'course', 'development'],
    searchTerms: ['course', 'training', 'certification', 'education', 'bootcamp', 'degree'],
    complexity: 'basic',
    frequency: 'one-time',
    examples: ['$5k coding bootcamp', '$2k certification'],
    icon: '📚',
    color: 'purple',
    formAvailable: true
  }
];

/**
 * Search for events based on query
 */
export function searchEvents(query: string): EventMetadata[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) {
    return getRecommendedEvents();
  }

  // Score each event based on relevance
  const scoredEvents = EVENT_REGISTRY.map(event => {
    let score = 0;

    // Exact match in label
    if (event.label.toLowerCase() === normalizedQuery) {
      score += 100;
    }

    // Partial match in label
    if (event.label.toLowerCase().includes(normalizedQuery)) {
      score += 50;
    }

    // Match in tags
    event.tags.forEach(tag => {
      if (tag.toLowerCase().includes(normalizedQuery)) {
        score += 30;
      }
    });

    // Match in search terms
    event.searchTerms.forEach(term => {
      if (term.toLowerCase().includes(normalizedQuery)) {
        score += 25;
      }
    });

    // Match in description
    if (event.description.toLowerCase().includes(normalizedQuery)) {
      score += 10;
    }

    // Match in examples
    event.examples?.forEach(example => {
      if (example.toLowerCase().includes(normalizedQuery)) {
        score += 15;
      }
    });

    return { event, score };
  });

  // Filter and sort by score
  return scoredEvents
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.event)
    .slice(0, 10); // Return top 10 results
}

/**
 * Get recommended events based on user context
 */
export function getRecommendedEvents(context?: {
  hasIncome?: boolean;
  hasExpenses?: boolean;
  hasInvestments?: boolean;
  hasDebt?: boolean;
  age?: number;
  isRetired?: boolean;
}): EventMetadata[] {
  const recommendations: EventMetadata[] = [];

  // Default recommendations if no context (exclude coming soon events)
  if (!context) {
    return [
      EVENT_REGISTRY.find(e => e.type === EventType.INCOME)!,
      EVENT_REGISTRY.find(e => e.type === EventType.RECURRING_EXPENSE)!,
      EVENT_REGISTRY.find(e => e.type === EventType.SCHEDULED_CONTRIBUTION)!,
      EVENT_REGISTRY.find(e => e.type === EventType.LIABILITY_ADD)!,
      EVENT_REGISTRY.find(e => e.type === EventType.ROTH_CONVERSION)!,
    ].filter(Boolean);
  }

  // Context-based recommendations
  if (!context.hasIncome && !context.isRetired) {
    recommendations.push(EVENT_REGISTRY.find(e => e.type === EventType.INCOME)!);
  }

  if (!context.hasExpenses) {
    recommendations.push(EVENT_REGISTRY.find(e => e.type === EventType.RECURRING_EXPENSE)!);
  }

  if (!context.hasInvestments && context.hasIncome) {
    recommendations.push(EVENT_REGISTRY.find(e => e.type === EventType.SCHEDULED_CONTRIBUTION)!);
  }

  if (context.hasDebt) {
    recommendations.push(EVENT_REGISTRY.find(e => e.type === EventType.DEBT_PAYMENT)!);
  }

  if (context.age && context.age >= 50) {
    recommendations.push(EVENT_REGISTRY.find(e => e.type === EventType.ROTH_CONVERSION)!);
  }

  if (context.age && context.age >= 59.5) {
    recommendations.push(EVENT_REGISTRY.find(e => e.type === EventType.WITHDRAWAL)!);
  }

  if (context.age && context.age >= 62) {
    recommendations.push(EVENT_REGISTRY.find(e => e.type === EventType.SOCIAL_SECURITY_INCOME)!);
  }

  if (context.age && context.age >= 73) {
    recommendations.push(EVENT_REGISTRY.find(e => e.type === EventType.REQUIRED_MINIMUM_DISTRIBUTION)!);
  }

  return recommendations.filter(Boolean).slice(0, 5);
}

/**
 * Get events by category
 */
export function getEventsByCategory(category: EventMetadata['category']): EventMetadata[] {
  return EVENT_REGISTRY.filter(event => event.category === category);
}

/**
 * Get related events
 */
export function getRelatedEvents(eventType: string): EventMetadata[] {
  const event = EVENT_REGISTRY.find(e => e.type === eventType);
  if (!event) return [];

  const related: EventMetadata[] = [];

  // Add explicitly related events
  if (event.relatedEvents) {
    event.relatedEvents.forEach(relatedType => {
      const relatedEvent = EVENT_REGISTRY.find(e => e.type === relatedType);
      if (relatedEvent) related.push(relatedEvent);
    });
  }

  // Add events from same category
  const sameCategory = EVENT_REGISTRY.filter(
    e => e.category === event.category && e.type !== eventType
  ).slice(0, 3);
  related.push(...sameCategory);

  // Remove duplicates
  const uniqueRelated = Array.from(new Set(related.map(e => e.type)))
    .map(type => related.find(e => e.type === type)!)
    .slice(0, 5);

  return uniqueRelated;
}

/**
 * Get popular events for quick access
 */
export function getPopularEvents(): EventMetadata[] {
  const popularTypes = [
    EventType.INCOME,
    EventType.RECURRING_EXPENSE,
    EventType.SCHEDULED_CONTRIBUTION,
    EventType.ROTH_CONVERSION,
    EventType.WITHDRAWAL,
    EventType.LIABILITY_ADD,
    EventType.SOCIAL_SECURITY_INCOME,
    EventType.ONE_TIME_EVENT
  ];

  return popularTypes
    .map(type => EVENT_REGISTRY.find(e => e.type === type && !e.comingSoon))
    .filter(Boolean) as EventMetadata[];
}