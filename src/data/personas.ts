/**
 * Persona System for Example Scenarios - SIMPLIFIED VERSION
 *
 * These are pre-built financial profiles with just 6 events max each.
 */

import { EventManifest, EventType } from '../types/events/base';

export interface PersonaProfile {
  id: string;
  title: string;
  emoji: string;
  description: string;
  tags: string[];
  demographics: {
    age: number;
    income: number;
    expenses: number;
    currentSavings: number;
    netWorth: number;
    retirementAge: number;
  };
  highlights: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  eventManifest: EventManifest;
}

export const PERSONAS: PersonaProfile[] = [
  {
    id: 'accelerator',
    title: 'The Accelerator',
    emoji: '🎯',
    description: 'High-earning tech executive retiring at 50 with aggressive saving',
    tags: ['High Income', 'Early Retirement', 'Aggressive Savings'],
    demographics: {
      age: 35,
      income: 700000,
      expenses: 120000,
      currentSavings: 900000,
      netWorth: 2000000,
      retirementAge: 50,
    },
    highlights: [
      '$700k total compensation (salary + RSU + bonus)',
      '401k max contributions + employer match',
      'Aggressive taxable investing with 60% savings rate',
      'Retire at 50 with $3M target'
    ],
    complexity: 'advanced',
    eventManifest: {
      initialAccounts: {
        cash: 30000,
        tax_deferred: 400000,
        taxable: 500000
      },
      events: [
        {
          id: 'total-compensation',
          type: 'INCOME',
          name: 'Total Tech Compensation',
          source: 'Tech Company',
          amount: 700000, // Annual total comp
          annualGrowthRate: 0.08,
          startDateOffset: 0,
          endDateOffset: 84, // 7 years (2025-2031 inclusive = 84 months)
          frequency: 'annually',
          monthOffset: 0,
          description: 'Combined salary, RSU, and bonus',
          priority: 1
        },
        {
          id: 'living-expenses',
          type: 'RECURRING_EXPENSE',
          name: 'Living Expenses',
          amount: 10000, // $120k annually
          annualGrowthRate: 0.03,
          startDateOffset: 0,
          endDateOffset: 180, // 15 years to age 50 (reduced for faster debugging)
          frequency: 'monthly',
          monthOffset: 0,
          description: 'All living expenses',
          priority: 2
        },
        {
          id: '401k-max',
          type: 'SCHEDULED_CONTRIBUTION',
          name: '401k Max + Match',
          amount: 43000, // $23k + $20k match
          annualGrowthRate: 0.02,
          startDateOffset: 0, 
          endDateOffset: 180,
          frequency: 'annually',
          accountType: 'tax_deferred',
          monthOffset: 0,
          description: 'Maximum 401k plus employer match',
          priority: 3
        },
        {
          id: 'taxable-investing',
          type: 'SCHEDULED_CONTRIBUTION',
          name: 'Aggressive Taxable Investing',
          amount: 250000, // Realistic amount after taxes and expenses
          annualGrowthRate: 0.08,
          startDateOffset: 0,
          endDateOffset: 84, // Match income period
          frequency: 'annually',
          accountType: 'taxable',
          monthOffset: 0,
          description: 'Aggressive stock investing with high tech income',
          priority: 4
        },
        {
          id: 'fire-goal',
          type: 'GOAL_DEFINE',
          name: 'FIRE by 50',
          targetAmount: 3000000,
          targetMonthOffset: 180,
          priority: 1,
          goalType: 'RETIREMENT',
          monthOffset: 0,
          description: 'Financial independence by age 50'
        }
      ],
      goals: [
        {
          id: 'fire-goal',
          name: 'FIRE by 50', 
          targetAmount: 3000000,
          targetDate: new Date(2039, 0, 1),
          priority: 'high',
          type: 'net_worth'
        }
      ]
    }
  },
  
  {
    id: 'starter',
    title: 'The Graduate Starter',
    emoji: '🌱',
    description: 'Recent graduate with student loans building toward financial independence',
    tags: ['Student Loans', 'Entry Level', 'Simple Plan'],
    demographics: {
      age: 25,
      income: 55000,
      expenses: 42000,
      currentSavings: 8000,
      netWorth: -22000,
      retirementAge: 65,
    },
    highlights: [
      '$30k in student loans to pay off',
      'Emergency fund building to 3 months expenses',
      '401k with employer match',
      'Traditional retirement at 65'
    ],
    complexity: 'beginner',
    eventManifest: {
      initialAccounts: {
        cash: 8000
      },
      events: [
        {
          id: 'entry-salary',
          type: 'INCOME',
          name: 'Entry Level Salary',
          source: 'First Job',
          amount: 55000, // Annual salary
          annualGrowthRate: 0.06,
          startDateOffset: 0,
          endDateOffset: 480, // 40-year career
          frequency: 'annually',
          monthOffset: 0,
          description: 'Entry level salary with good growth potential',
          priority: 1
        },
        {
          id: 'living-expenses',
          type: 'RECURRING_EXPENSE',
          name: 'Living Expenses',
          amount: 3500, // $42k annually
          annualGrowthRate: 0.03,
          startDateOffset: 0,
          endDateOffset: 480,
          frequency: 'monthly',
          monthOffset: 0,
          description: 'Basic living expenses',
          priority: 2
        },
        {
          id: 'student-loan',
          type: 'DEBT_PAYMENT',
          name: 'Student Loan Payments',
          amount: 300,
          startDateOffset: 0,
          endDateOffset: 120, // 10 years
          frequency: 'monthly',
          monthOffset: 0,
          description: '$30k student loan at 5.5% interest',
          priority: 3
        },
        {
          id: '401k-basic',
          type: 'SCHEDULED_CONTRIBUTION',
          name: '401k with Match',
          amount: 3300, // 6% total (3% + 3% match)
          annualGrowthRate: 0.06,
          startDateOffset: 0,
          endDateOffset: 480,
          frequency: 'annually',
          accountType: 'tax_deferred',
          monthOffset: 0,
          description: '401k contribution with employer match',
          priority: 4
        },
        {
          id: 'retirement-goal',
          type: 'GOAL_DEFINE',
          name: 'Comfortable Retirement',
          targetAmount: 1200000,
          targetMonthOffset: 480,
          priority: 1,
          goalType: 'RETIREMENT',
          monthOffset: 0,
          description: 'Traditional retirement at 65'
        }
      ],
      goals: [
        {
          id: 'retirement-goal',
          name: 'Comfortable Retirement',
          targetAmount: 1200000,
          targetDate: new Date(2064, 0, 1),
          priority: 'medium',
          type: 'net_worth'
        }
      ]
    }
  },

  {
    id: 'balanced',
    title: 'The Balanced Planner',
    emoji: '⚖️',
    description: 'Balanced approach with family, moderate income, and steady progress',
    tags: ['Family Planning', 'Moderate Income', 'Balanced'],
    demographics: {
      age: 32,
      income: 85000,
      expenses: 55000,
      currentSavings: 45000,
      netWorth: 65000,
      retirementAge: 60,
    },
    highlights: [
      'Family with education savings',
      'Moderate 15% savings rate',
      'Balanced stock/bond portfolio',
      'Flexible retirement at 60'
    ],
    complexity: 'intermediate',
    eventManifest: {
      initialAccounts: {
        cash: 15000,
        tax_deferred: 30000
      },
      events: [
        {
          id: 'family-income',
          type: 'INCOME',
          name: 'Professional Salary',
          source: 'Corporate Job',
          amount: 85000, // Annual salary
          annualGrowthRate: 0.04,
          startDateOffset: 0,
          endDateOffset: 336, // 28 years until 60
          frequency: 'annually',
          monthOffset: 0,
          description: 'Steady professional income',
          priority: 1
        },
        {
          id: 'family-expenses',
          type: 'RECURRING_EXPENSE',
          name: 'Family Living Expenses',
          amount: 4600, // $55k annually
          annualGrowthRate: 0.03,
          startDateOffset: 0,
          endDateOffset: 600,
          frequency: 'monthly',
          monthOffset: 0,
          description: 'Family living expenses including kids',
          priority: 2
        },
        {
          id: 'retirement-savings',
          type: 'SCHEDULED_CONTRIBUTION',
          name: '401k + IRA Savings',
          amount: 12750, // 15% of income
          annualGrowthRate: 0.04,
          startDateOffset: 0,
          endDateOffset: 336,
          frequency: 'annually',
          accountType: 'tax_deferred',
          monthOffset: 0,
          description: 'Balanced retirement savings',
          priority: 3
        },
        {
          id: 'education-fund',
          type: 'SCHEDULED_CONTRIBUTION',
          name: 'Education Savings',
          amount: 3000,
          annualGrowthRate: 0.03,
          startDateOffset: 0,
          endDateOffset: 216, // 18 years
          frequency: 'annually',
          accountType: '529',
          monthOffset: 0,
          description: '529 education savings for kids',
          priority: 4
        },
        {
          id: 'retirement-goal',
          type: 'GOAL_DEFINE',
          name: 'Retirement at 60',
          targetAmount: 1500000,
          targetMonthOffset: 336,
          priority: 1,
          goalType: 'RETIREMENT',
          monthOffset: 0,
          description: 'Flexible retirement at 60'
        }
      ],
      goals: [
        {
          id: 'retirement-goal',
          name: 'Retirement at 60',
          targetAmount: 1500000,
          targetDate: new Date(2052, 0, 1),
          priority: 'high',
          type: 'net_worth'
        }
      ]
    }
  },

  {
    id: 'homebuyer',
    title: 'The First-Time Home Buyer',
    emoji: '🏠',
    description: 'Professional couple buying their first home while building wealth',
    tags: ['Home Purchase', 'Mortgage', 'Dual Income', 'Property Investment'],
    demographics: {
      age: 28,
      income: 110000,
      expenses: 65000,
      currentSavings: 75000,
      netWorth: 95000,
      retirementAge: 65,
    },
    highlights: [
      '$425k home purchase with 15% down payment',
      'Dual professional income of $110k combined',
      'Mortgage, insurance, and property taxes included',
      'Balanced retirement savings while building equity'
    ],
    complexity: 'intermediate',
    eventManifest: {
      initialAccounts: {
        cash: 75000,
        tax_deferred: 20000
      },
      events: [
        {
          id: 'dual-income',
          type: 'INCOME',
          name: 'Combined Household Income',
          source: 'Dual Professional Income',
          amount: 110000, // Annual combined income
          annualGrowthRate: 0.05,
          startDateOffset: 0,
          endDateOffset: 444, // 37 years until 65
          frequency: 'annually',
          monthOffset: 0,
          description: 'Combined income from both partners',
          priority: 1
        },
        {
          id: 'home-down-payment',
          type: 'ONE_TIME_EVENT',
          name: 'Home Down Payment & Closing',
          amount: 72000, // $425k * 15% + $8k closing costs
          startDateOffset: 6, // Buy house in 6 months
          frequency: 'one-time',
          monthOffset: 0,
          description: '15% down payment plus closing costs on $425k home',
          priority: 2
        },
        {
          id: 'mortgage-payment',
          type: 'RECURRING_EXPENSE',
          name: 'Mortgage Payment (P&I)',
          amount: 1785, // Principal & interest on $361k loan at 6.5%
          startDateOffset: 6,
          endDateOffset: 366, // 30-year mortgage
          frequency: 'monthly',
          monthOffset: 0,
          description: '30-year fixed mortgage at 6.5% on $361k loan',
          priority: 3
        },
        {
          id: 'property-taxes-insurance',
          type: 'RECURRING_EXPENSE',
          name: 'Property Tax & Insurance',
          amount: 650, // $425k * 1.2% property tax + $3k insurance
          annualGrowthRate: 0.025,
          startDateOffset: 6,
          endDateOffset: 600, // Ongoing homeownership
          frequency: 'monthly',
          monthOffset: 0,
          description: 'Property taxes and homeowner insurance',
          priority: 4
        },
        {
          id: 'home-maintenance',
          type: 'RECURRING_EXPENSE',
          name: 'Home Maintenance & Utilities',
          amount: 750, // 1% of home value annually for maintenance + utilities
          annualGrowthRate: 0.03,
          startDateOffset: 6,
          endDateOffset: 600,
          frequency: 'monthly',
          monthOffset: 0,
          description: 'Regular maintenance, repairs, and utilities',
          priority: 5
        },
        {
          id: 'other-expenses',
          type: 'RECURRING_EXPENSE',
          name: 'Other Living Expenses',
          amount: 2815, // Remaining living expenses (food, transport, etc.)
          annualGrowthRate: 0.03,
          startDateOffset: 0,
          endDateOffset: 600,
          frequency: 'monthly',
          monthOffset: 0,
          description: 'Food, transportation, entertainment, and other expenses',
          priority: 6
        },
        {
          id: 'retirement-savings',
          type: 'SCHEDULED_CONTRIBUTION',
          name: '401k Contributions',
          amount: 11000, // 10% of income
          annualGrowthRate: 0.05,
          startDateOffset: 0,
          endDateOffset: 444,
          frequency: 'annually',
          accountType: 'tax_deferred',
          monthOffset: 0,
          description: 'Combined 401k contributions with employer match',
          priority: 7
        },
        {
          id: 'home-equity-goal',
          type: 'GOAL_DEFINE',
          name: 'Build Home Equity',
          targetAmount: 200000, // Significant equity after 15 years
          targetMonthOffset: 186, // 15.5 years
          priority: 2,
          goalType: 'SAVINGS',
          monthOffset: 0,
          description: 'Build substantial home equity through payments'
        },
        {
          id: 'retirement-goal',
          type: 'GOAL_DEFINE',
          name: 'Retirement Savings',
          targetAmount: 1000000,
          targetMonthOffset: 444,
          priority: 1,
          goalType: 'RETIREMENT',
          monthOffset: 0,
          description: 'Comfortable retirement at 65 with paid-off home'
        }
      ],
      goals: [
        {
          id: 'retirement-goal',
          name: 'Retirement Savings',
          targetAmount: 1000000,
          targetDate: new Date(2059, 0, 1),
          priority: 'high',
          type: 'net_worth'
        },
        {
          id: 'home-equity-goal',
          name: 'Build Home Equity',
          targetAmount: 200000,
          targetDate: new Date(2040, 6, 1),
          priority: 'medium',
          type: 'net_worth'
        }
      ]
    }
  },

  {
    id: 'upgrader',
    title: 'The Home Upgrader',
    emoji: '🏘️',
    description: 'Established family selling their starter home to upgrade to their forever home',
    tags: ['Home Upgrade', 'Growing Family', 'Real Estate', 'Forever Home'],
    demographics: {
      age: 38,
      income: 165000,
      expenses: 85000,
      currentSavings: 125000,
      netWorth: 485000,
      retirementAge: 62,
    },
    highlights: [
      'Selling $425k starter home to buy $650k forever home',
      '$165k household income with 15-year career growth',
      'Using home sale proceeds for down payment',
      'Shorter mortgage term for faster equity building'
    ],
    complexity: 'advanced',
    eventManifest: {
      initialAccounts: {
        cash: 125000,
        tax_deferred: 180000,
        taxable: 95000,
        // Primary home equity represented as asset
        real_estate: 85000 // Current equity in starter home ($425k value - $340k remaining mortgage)
      },
      events: [
        {
          id: 'mature-income',
          type: 'INCOME',
          name: 'Established Household Income',
          source: 'Senior Professional Roles',
          amount: 165000, // Annual household income
          annualGrowthRate: 0.04,
          startDateOffset: 0,
          endDateOffset: 288, // 24 years until 62
          frequency: 'annually',
          monthOffset: 0,
          description: 'Combined senior-level professional income',
          priority: 1
        },
        {
          id: 'current-mortgage',
          type: 'RECURRING_EXPENSE',
          name: 'Current Home Mortgage',
          amount: 2650, // Current mortgage payment on starter home
          startDateOffset: 0,
          endDateOffset: 9, // Until home sale in 9 months
          frequency: 'monthly',
          monthOffset: 0,
          description: 'Remaining payments on starter home mortgage',
          priority: 2
        },
        {
          id: 'home-sale-proceeds',
          type: 'ONE_TIME_EVENT',
          name: 'Home Sale Proceeds',
          amount: 85000, // Net proceeds after paying off mortgage and fees
          startDateOffset: 9, // Sell current home in 9 months
          frequency: 'one-time',
          monthOffset: 0,
          description: 'Net proceeds from selling starter home',
          priority: 3
        },
        {
          id: 'new-home-down-payment',
          type: 'ONE_TIME_EVENT',
          name: 'Forever Home Down Payment',
          amount: 140000, // $650k * 20% + $10k closing costs
          startDateOffset: 9, // Same time as sale
          frequency: 'one-time',
          monthOffset: 0,
          description: '20% down payment plus closing costs on $650k forever home',
          priority: 4
        },
        {
          id: 'new-mortgage-payment',
          type: 'RECURRING_EXPENSE',
          name: 'Forever Home Mortgage (15yr)',
          amount: 4185, // P&I on $510k loan at 6% for 15 years
          startDateOffset: 9,
          endDateOffset: 189, // 15-year mortgage
          frequency: 'monthly',
          monthOffset: 0,
          description: '15-year fixed mortgage at 6% on $510k loan',
          priority: 5
        },
        {
          id: 'forever-home-expenses',
          type: 'RECURRING_EXPENSE',
          name: 'Forever Home Property Costs',
          amount: 1420, // Property tax, insurance, maintenance on larger home
          annualGrowthRate: 0.025,
          startDateOffset: 9,
          endDateOffset: 600,
          frequency: 'monthly',
          monthOffset: 0,
          description: 'Property tax, insurance, and maintenance on forever home',
          priority: 6
        },
        {
          id: 'family-expenses',
          type: 'RECURRING_EXPENSE',
          name: 'Family Living Expenses',
          amount: 4250, // All other family expenses
          annualGrowthRate: 0.03,
          startDateOffset: 0,
          endDateOffset: 600,
          frequency: 'monthly',
          monthOffset: 0,
          description: 'Food, transportation, activities, and other family expenses',
          priority: 7
        },
        {
          id: 'max-retirement-savings',
          type: 'SCHEDULED_CONTRIBUTION',
          name: 'Accelerated Retirement Savings',
          amount: 35000, // Higher savings rate now that careers are established
          annualGrowthRate: 0.04,
          startDateOffset: 0,
          endDateOffset: 288,
          frequency: 'annually',
          accountType: 'tax_deferred',
          monthOffset: 0,
          description: 'Maximized 401k and IRA contributions',
          priority: 8
        },
        {
          id: 'taxable-investing',
          type: 'SCHEDULED_CONTRIBUTION',
          name: 'Taxable Investment Account',
          amount: 25000, // Additional investing beyond retirement accounts
          annualGrowthRate: 0.04,
          startDateOffset: 12, // Start after home upgrade is complete
          endDateOffset: 288,
          frequency: 'annually',
          accountType: 'taxable',
          monthOffset: 0,
          description: 'Additional investment beyond retirement accounts',
          priority: 9
        },
        {
          id: 'mortgage-free-goal',
          type: 'GOAL_DEFINE',
          name: 'Mortgage-Free Forever Home',
          targetAmount: 650000, // Full home value
          targetMonthOffset: 189, // When mortgage is paid off
          priority: 2,
          goalType: 'REAL_ESTATE',
          monthOffset: 0,
          description: 'Own forever home free and clear'
        },
        {
          id: 'early-retirement-goal',
          type: 'GOAL_DEFINE',
          name: 'Early Retirement at 62',
          targetAmount: 2000000, // Higher target for early retirement
          targetMonthOffset: 288,
          priority: 1,
          goalType: 'RETIREMENT',
          monthOffset: 0,
          description: 'Early retirement with paid-off home and substantial portfolio'
        }
      ],
      goals: [
        {
          id: 'early-retirement-goal',
          name: 'Early Retirement at 62',
          targetAmount: 2000000,
          targetDate: new Date(2049, 0, 1),
          priority: 'high',
          type: 'net_worth'
        },
        {
          id: 'mortgage-free-goal',
          name: 'Mortgage-Free Forever Home',
          targetAmount: 650000,
          targetDate: new Date(2040, 9, 1),
          priority: 'medium',
          type: 'net_worth'
        }
      ]
    }
  },

  {
    id: 'retiree',
    title: 'The Early Retiree',
    emoji: '🏖️',
    description: 'Recently retired at 62 living off portfolio withdrawals, Social Security, and managing RMDs',
    tags: ['Retirement', 'Withdrawals', 'Social Security', 'Tax Planning'],
    demographics: {
      age: 62,
      income: 80000, // SS + withdrawals
      expenses: 70000,
      currentSavings: 0, // All in investment accounts
      netWorth: 1500000,
      retirementAge: 95, // Simulate until end of life
    },
    highlights: [
      'Recently retired with $1.5M portfolio',
      'Living expenses from portfolio withdrawals',
      'Social Security income starting at 62',
      'Managing RMDs starting at age 73',
      'Healthcare costs until Medicare'
    ],
    complexity: 'advanced',
    eventManifest: {
      initialAccounts: {
        cash: 50000,
        tax_deferred: 900000, // Traditional IRA + 401k
        taxable: 400000,
        roth: 150000
      },
      events: [
        {
          id: 'social-security',
          type: 'SOCIAL_SECURITY_INCOME',
          name: 'Social Security Benefits',
          amount: 24000, // $2k/month at age 62 (reduced benefit)
          annualGrowthRate: 0.02, // COLA adjustments
          startDateOffset: 0,
          endDateOffset: 360, // 30 years
          frequency: 'annually',
          monthOffset: 0,
          description: 'Social Security retirement benefits starting at age 62',
          priority: 1
        },
        {
          id: 'living-expenses',
          type: 'RECURRING_EXPENSE',
          name: 'Living Expenses',
          amount: 5000, // $60k annually
          annualGrowthRate: 0.03,
          startDateOffset: 0,
          endDateOffset: 360,
          frequency: 'monthly',
          monthOffset: 0,
          description: 'Monthly living expenses in retirement',
          priority: 2
        },
        {
          id: 'healthcare-costs',
          type: 'HEALTHCARE_COST',
          name: 'Healthcare Premiums (Pre-Medicare)',
          amount: 12000, // $1k/month for health insurance
          annualGrowthRate: 0.06, // Healthcare inflation
          startDateOffset: 0,
          endDateOffset: 36, // Until Medicare at 65
          frequency: 'annually',
          monthOffset: 0,
          description: 'Health insurance premiums until Medicare eligibility',
          priority: 3
        },
        {
          id: 'medicare-costs',
          type: 'HEALTHCARE_COST',
          name: 'Medicare Premiums & Supplements',
          amount: 4800, // $400/month for Medicare + supplement
          annualGrowthRate: 0.05,
          startDateOffset: 36, // Starting at age 65
          endDateOffset: 360,
          frequency: 'annually',
          monthOffset: 0,
          description: 'Medicare Part B, D, and Medigap supplement',
          priority: 4
        },
        {
          id: 'portfolio-withdrawals',
          type: 'WITHDRAWAL',
          name: 'Annual Portfolio Withdrawals',
          amount: 48000, // $60k expenses + $12k healthcare - $24k SS = $48k needed
          annualGrowthRate: 0.03, // Inflation adjusted
          startDateOffset: 0,
          endDateOffset: 360,
          frequency: 'annually',
          accountType: 'tax_deferred', // Withdraw from tax-deferred first for tax efficiency
          monthOffset: 0,
          description: 'Annual withdrawals to cover expenses not met by Social Security',
          priority: 5
        },
        {
          id: 'required-minimum-distributions',
          type: 'REQUIRED_MINIMUM_DISTRIBUTION',
          name: 'Required Minimum Distributions',
          amount: 0, // WASM will calculate based on IRS tables
          startDateOffset: 132, // Age 73 (11 years from 62)
          endDateOffset: 360,
          frequency: 'annually',
          accountType: 'tax_deferred',
          monthOffset: 0,
          description: 'IRS-required distributions from tax-deferred accounts',
          priority: 6
        },
        {
          id: 'roth-conversion',
          type: 'ROTH_CONVERSION',
          name: 'Strategic Roth Conversions',
          amount: 30000, // Convert $30k/year while in low tax bracket
          startDateOffset: 0,
          endDateOffset: 132, // Stop before RMDs start
          frequency: 'annually',
          monthOffset: 0,
          description: 'Convert traditional IRA to Roth while in 12-22% tax brackets',
          priority: 7
        },
        {
          id: 'tax-payments',
          type: 'RECURRING_EXPENSE',
          name: 'Estimated Tax Payments',
          amount: 8000, // Estimated annual tax on SS + conversions + withdrawals
          annualGrowthRate: 0.02,
          startDateOffset: 0,
          endDateOffset: 360,
          frequency: 'annually',
          monthOffset: 0,
          description: 'Federal and state income taxes on retirement income',
          priority: 8
        },
        {
          id: 'retirement-goal',
          type: 'GOAL_DEFINE',
          name: 'Maintain Lifestyle Until 95',
          targetAmount: 500000, // Want to maintain at least $500k cushion
          targetMonthOffset: 360,
          priority: 1,
          goalType: 'RETIREMENT',
          monthOffset: 0,
          description: 'Ensure portfolio lasts through age 95 with cushion'
        }
      ],
      goals: [
        {
          id: 'retirement-goal',
          name: 'Maintain Lifestyle Until 95',
          targetAmount: 500000,
          targetDate: new Date(2057, 0, 1), // Age 95
          priority: 'high',
          type: 'net_worth'
        }
      ]
    }
  },

  // =============================================================================
  // TEST PERSONAS - Lightweight test cases for specific event type coverage
  // =============================================================================

  {
    id: 'test-rsu',
    title: 'Test: RSU Tech Worker',
    emoji: '🧪',
    description: 'Test persona for RSU vesting and sale events with equity compensation',
    tags: ['Test', 'RSU', 'Equity Compensation', 'Tech'],
    demographics: {
      age: 32,
      income: 150000, // Base salary only
      expenses: 60000,
      currentSavings: 50000,
      netWorth: 150000,
      retirementAge: 65,
    },
    highlights: [
      'Tests RSU_VESTING event type',
      'Tests RSU_SALE event type',
      'Quarterly RSU vesting schedule',
      'Validates tax treatment of equity compensation'
    ],
    complexity: 'beginner',
    eventManifest: {
      initialAccounts: {
        cash: 50000,
        tax_deferred: 100000, // 401k
      },
      events: [
        {
          id: 'base-salary',
          type: 'INCOME',
          name: 'Base Salary',
          amount: 12500, // $150k/year = $12.5k/month
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          annualGrowthRate: 0.03,
          description: 'Base tech salary excluding equity',
          priority: 1
        },
        {
          id: 'rsu-vesting-q1',
          type: 'RSU_VESTING',
          name: 'Q1 RSU Vesting',
          symbol: 'TECH',
          totalValue: 37500, // $150/share * 250 shares
          targetAccountType: 'taxable',
          frequency: 'one-time',
          startDateOffset: 0,
          taxWithholdingRate: 0.22,
          description: 'Q1 RSU vesting',
          priority: 1
        },
        {
          id: 'rsu-sale-q1',
          type: 'RSU_SALE',
          name: 'Q1 RSU Sale',
          symbol: 'TECH',
          shares: 200,
          salePrice: 160,
          costBasis: 150,
          sourceAccountType: 'taxable',
          targetAccountType: 'taxable',
          frequency: 'one-time',
          startDateOffset: 3,
          description: 'Q1 RSU sale for diversification',
          priority: 2
        },
        {
          id: 'living-expenses',
          type: 'RECURRING_EXPENSE',
          name: 'Living Expenses',
          amount: 5000, // $60k/year
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          annualGrowthRate: 0.03,
          description: 'Monthly living expenses',
          priority: 3
        }
      ],
      goals: [
        {
          id: 'rsu-test-goal',
          name: 'Test RSU Event Processing',
          type: 'net_worth',
          targetAmount: 200000,
          targetDate: new Date(2027, 0, 1),
          priority: 'high'
        }
      ]
    }
  },

  {
    id: 'test-business-owner',
    title: 'Test: Business Owner',
    emoji: '🧪',
    description: 'Test persona for business income and quarterly tax payments',
    tags: ['Test', 'Business', 'Self-Employed', 'Taxes'],
    demographics: {
      age: 40,
      income: 120000,
      expenses: 60000,
      currentSavings: 25000,
      netWorth: 25000,
      retirementAge: 65,
    },
    highlights: [
      'Tests BUSINESS_INCOME event type',
      'Tests QUARTERLY_ESTIMATED_TAX_PAYMENT event type',
      'Validates self-employment tax handling'
    ],
    complexity: 'beginner',
    eventManifest: {
      initialAccounts: {
        cash: 25000,
      },
      events: [
        {
          id: 'business-income',
          type: 'BUSINESS_INCOME',
          monthOffset: 0,
          name: 'Consulting Business Income',
          amount: 10000,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Monthly business revenue',
          priority: 1
        },
        {
          id: 'quarterly-tax',
          type: 'QUARTERLY_ESTIMATED_TAX_PAYMENT',
          monthOffset: 0,
          name: 'Quarterly Estimated Taxes',
          amount: 6000,
          startDateOffset: 3,
          endDateOffset: 24,
          frequency: 'quarterly',
          description: 'Q1-Q4 estimated tax payments',
          priority: 2
        },
        {
          id: 'business-expenses',
          type: 'RECURRING_EXPENSE',
          monthOffset: 0,
          name: 'Business & Living Expenses',
          amount: 5000,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Combined expenses',
          priority: 3
        }
      ],
      goals: [
        {
          id: 'business-test-goal',
          name: 'Test Business Income Processing',
          type: 'net_worth',
          targetAmount: 50000,
          targetDate: new Date(2027, 0, 1),
          priority: 'high'
        }
      ]
    }
  },

  {
    id: 'test-dividend-investor',
    title: 'Test: Dividend Investor',
    emoji: '🧪',
    description: 'Test persona for dividend income and portfolio rebalancing',
    tags: ['Test', 'Dividends', 'Investing', 'Rebalancing'],
    demographics: {
      age: 45,
      income: 80000,
      expenses: 50000,
      currentSavings: 50000,
      netWorth: 250000,
      retirementAge: 65,
    },
    highlights: [
      'Tests DIVIDEND_INCOME event type',
      'Tests REBALANCE_PORTFOLIO event type',
      'Validates dividend tax treatment'
    ],
    complexity: 'beginner',
    eventManifest: {
      initialAccounts: {
        cash: 10000,
        taxable: 200000,
        tax_deferred: 40000,
      },
      events: [
        {
          id: 'dividend-income',
          type: 'DIVIDEND_INCOME',
          monthOffset: 0,
          name: 'Quarterly Dividends',
          amount: 2000,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'quarterly',
          description: 'Taxable account dividends',
          priority: 1
        },
        {
          id: 'portfolio-rebalance',
          type: 'REBALANCE_PORTFOLIO',
          monthOffset: 0,
          name: 'Annual Rebalancing',
          amount: 0,
          startDateOffset: 12,
          frequency: 'annually',
          description: 'Annual portfolio rebalance',
          priority: 2
        },
        {
          id: 'living-expenses',
          type: 'RECURRING_EXPENSE',
          monthOffset: 0,
          name: 'Living Expenses',
          amount: 4200,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Monthly expenses',
          priority: 3
        }
      ],
      goals: [
        {
          id: 'dividend-test-goal',
          name: 'Test Dividend Processing',
          type: 'net_worth',
          targetAmount: 275000,
          targetDate: new Date(2027, 0, 1),
          priority: 'high'
        }
      ]
    }
  },

  {
    id: 'test-home-maintainer',
    title: 'Test: Home Maintainer',
    emoji: '🧪',
    description: 'Test persona for home improvement and vehicle purchase events',
    tags: ['Test', 'Home', 'Vehicle', 'Large Purchases'],
    demographics: {
      age: 38,
      income: 100000,
      expenses: 60000,
      currentSavings: 50000,
      netWorth: 350000,
      retirementAge: 65,
    },
    highlights: [
      'Tests HOME_IMPROVEMENT event type',
      'Tests VEHICLE_PURCHASE event type',
      'Validates large one-time expenses'
    ],
    complexity: 'beginner',
    eventManifest: {
      initialAccounts: {
        cash: 50000,
        taxable: 100000,
      },
      events: [
        {
          id: 'salary',
          type: 'INCOME',
          monthOffset: 0,
          name: 'Salary',
          amount: 8333,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Monthly salary',
          priority: 1
        },
        {
          id: 'kitchen-remodel',
          type: 'HOME_IMPROVEMENT',
          monthOffset: 0,
          name: 'Kitchen Remodel',
          amount: 35000,
          startDateOffset: 6,
          frequency: 'one-time',
          description: 'Kitchen renovation',
          priority: 2
        },
        {
          id: 'new-car',
          type: 'VEHICLE_PURCHASE',
          monthOffset: 0,
          name: 'New Vehicle',
          amount: 28000,
          startDateOffset: 18,
          frequency: 'one-time',
          description: 'Replace old car',
          priority: 3
        },
        {
          id: 'expenses',
          type: 'RECURRING_EXPENSE',
          monthOffset: 0,
          name: 'Living Expenses',
          amount: 5000,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Monthly expenses',
          priority: 4
        }
      ],
      goals: [
        {
          id: 'home-test-goal',
          name: 'Test Large Purchase Events',
          type: 'net_worth',
          targetAmount: 100000,
          targetDate: new Date(2027, 0, 1),
          priority: 'high'
        }
      ]
    }
  },

  {
    id: 'test-landlord',
    title: 'Test: Landlord',
    emoji: '🧪',
    description: 'Test persona for rental income and property maintenance',
    tags: ['Test', 'Real Estate', 'Rental', 'Property Management'],
    demographics: {
      age: 42,
      income: 90000,
      expenses: 55000,
      currentSavings: 30000,
      netWorth: 180000,
      retirementAge: 65,
    },
    highlights: [
      'Tests RENTAL_INCOME event type',
      'Tests PROPERTY_MAINTENANCE event type',
      'Validates rental property cash flows'
    ],
    complexity: 'beginner',
    eventManifest: {
      initialAccounts: {
        cash: 30000,
        tax_deferred: 50000,
      },
      events: [
        {
          id: 'job-income',
          type: 'INCOME',
          name: 'W2 Salary',
          monthOffset: 0,
          amount: 7500,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Primary job income',
          priority: 1
        },
        {
          id: 'rental-income',
          type: 'RENTAL_INCOME',
          name: 'Rental Property Income',
          monthOffset: 0,
          amount: 2200,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Single family rental',
          priority: 2
        },
        {
          id: 'property-maintenance',
          type: 'PROPERTY_MAINTENANCE',
          monthOffset: 0,
          name: 'Property Repairs & Maintenance',
          amount: 3500,
          startDateOffset: 6,
          endDateOffset: 24,
          frequency: 'quarterly',
          description: 'Rental property upkeep',
          priority: 3
        },
        {
          id: 'expenses',
          type: 'RECURRING_EXPENSE',
          monthOffset: 0,
          name: 'Living Expenses',
          amount: 4500,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Personal expenses',
          priority: 4
        }
      ],
      goals: [
        {
          id: 'landlord-test-goal',
          name: 'Test Rental Income Processing',
          type: 'net_worth',
          targetAmount: 100000,
          targetDate: new Date(2027, 0, 1),
          priority: 'high'
        }
      ]
    }
  },

  {
    id: 'test-real-estate-seller',
    title: 'Test: Real Estate Seller',
    emoji: '🧪',
    description: 'Test persona for real estate sale events',
    tags: ['Test', 'Real Estate', 'Home Sale', 'Capital Gains'],
    demographics: {
      age: 55,
      income: 85000,
      expenses: 50000,
      currentSavings: 40000,
      netWorth: 450000,
      retirementAge: 65,
    },
    highlights: [
      'Tests REAL_ESTATE_SALE event type',
      'Validates capital gains tax treatment',
      'Primary residence sale exclusion'
    ],
    complexity: 'beginner',
    eventManifest: {
      initialAccounts: {
        cash: 40000,
        taxable: 60000,
        tax_deferred: 150000,
      },
      events: [
        {
          id: 'salary',
          type: 'INCOME',
          monthOffset: 0,
          name: 'Salary',
          amount: 7083,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Monthly income',
          priority: 1
        },
        {
          id: 'home-sale',
          type: 'REAL_ESTATE_SALE',
          monthOffset: 0,
          name: 'Primary Residence Sale',
          amount: 450000,
          startDateOffset: 12,
          frequency: 'one-time',
          description: 'Sell primary home',
          priority: 2
        },
        {
          id: 'expenses',
          type: 'RECURRING_EXPENSE',
          monthOffset: 0,
          name: 'Living Expenses',
          amount: 4167,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Monthly expenses',
          priority: 3
        }
      ],
      goals: [
        {
          id: 'realestate-test-goal',
          name: 'Test Real Estate Sale',
          type: 'net_worth',
          targetAmount: 650000,
          targetDate: new Date(2027, 0, 1),
          priority: 'high'
        }
      ]
    }
  },

  {
    id: 'test-insurance-beneficiary',
    title: 'Test: Insurance Beneficiary',
    emoji: '🧪',
    description: 'Test persona for life insurance and inheritance events',
    tags: ['Test', 'Insurance', 'Inheritance', 'Windfalls'],
    demographics: {
      age: 48,
      income: 75000,
      expenses: 55000,
      currentSavings: 35000,
      netWorth: 135000,
      retirementAge: 65,
    },
    highlights: [
      'Tests LIFE_INSURANCE_PAYOUT event type',
      'Tests INHERITANCE event type',
      'Validates windfall handling'
    ],
    complexity: 'beginner',
    eventManifest: {
      initialAccounts: {
        cash: 15000,
        tax_deferred: 120000,
      },
      events: [
        {
          id: 'salary',
          type: 'INCOME',
          monthOffset: 0,
          name: 'Salary',
          amount: 6250,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Monthly salary',
          priority: 1
        },
        {
          id: 'life-insurance',
          type: 'LIFE_INSURANCE_PAYOUT',
          monthOffset: 0,
          name: 'Life Insurance Payout',
          amount: 250000,
          startDateOffset: 6,
          frequency: 'one-time',
          description: 'Spouse life insurance',
          priority: 2
        },
        {
          id: 'inheritance',
          type: 'INHERITANCE',
          monthOffset: 0,
          name: 'Family Inheritance',
          amount: 75000,
          startDateOffset: 18,
          frequency: 'one-time',
          description: 'Parent estate distribution',
          priority: 3
        },
        {
          id: 'expenses',
          type: 'RECURRING_EXPENSE',
          monthOffset: 0,
          name: 'Living Expenses',
          amount: 4583,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Monthly expenses',
          priority: 4
        }
      ],
      goals: [
        {
          id: 'insurance-test-goal',
          name: 'Test Windfall Events',
          type: 'net_worth',
          targetAmount: 500000,
          targetDate: new Date(2027, 0, 1),
          priority: 'high'
        }
      ]
    }
  },

  {
    id: 'test-mega-backdoor',
    title: 'Test: Mega Backdoor Optimizer',
    emoji: '🧪',
    description: 'Test persona for mega backdoor Roth contribution strategy',
    tags: ['Test', 'Mega Backdoor', 'Roth', 'Tax Optimization'],
    demographics: {
      age: 35,
      income: 180000,
      expenses: 70000,
      currentSavings: 60000,
      netWorth: 260000,
      retirementAge: 65,
    },
    highlights: [
      'Tests MEGA_BACKDOOR_ROTH event type',
      'Validates after-tax 401k conversion',
      'Advanced tax optimization strategy'
    ],
    complexity: 'beginner',
    eventManifest: {
      initialAccounts: {
        cash: 60000,
        tax_deferred: 150000,
        roth: 50000,
      },
      events: [
        {
          id: 'high-income',
          type: 'INCOME',
          monthOffset: 0,
          name: 'Tech Salary',
          amount: 15000,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'High W2 salary',
          priority: 1
        },
        {
          id: 'mega-backdoor',
          type: 'MEGA_BACKDOOR_ROTH',
          monthOffset: 0,
          name: 'After-Tax 401k → Roth Conversion',
          amount: 3000,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Max mega backdoor contributions',
          priority: 2
        },
        {
          id: 'expenses',
          type: 'RECURRING_EXPENSE',
          monthOffset: 0,
          name: 'Living Expenses',
          amount: 5833,
          startDateOffset: 0,
          endDateOffset: 24,
          frequency: 'monthly',
          description: 'Monthly expenses',
          priority: 3
        }
      ],
      goals: [
        {
          id: 'megabackdoor-test-goal',
          name: 'Test Mega Backdoor Roth',
          type: 'net_worth',
          targetAmount: 400000,
          targetDate: new Date(2027, 0, 1),
          priority: 'high'
        }
      ]
    }
  }
];

export const getPersonaById = (id: string): PersonaProfile | undefined => {
  return PERSONAS.find(persona => persona.id === id);
};

export const getPersonasByComplexity = (complexity: PersonaProfile['complexity']): PersonaProfile[] => {
  return PERSONAS.filter(persona => persona.complexity === complexity);
};

export const getPersonaEventSummary = (persona: PersonaProfile): string[] => {
  const manifest = persona.eventManifest;
  const summaries: string[] = [];

  const eventCount = (manifest.events?.length || 0);
  summaries.push(`${eventCount} total events`);

  if (manifest.initialAccounts) {
    const totalBalance = Object.values(manifest.initialAccounts).reduce((sum: number, balance) => {
      const balanceValue = typeof balance === 'number' ? balance : (balance as any)?.balance || 0;
      return sum + balanceValue;
    }, 0);
    summaries.push(`$${totalBalance.toLocaleString()} starting balance`);
  }

  return summaries;
};

/**
 * Validates that all event types in a persona are valid EventType enum values
 * @throws Error if any invalid event types are found
 */
export function validatePersona(persona: PersonaProfile): void {
  const validTypes = Object.values(EventType) as string[];
  const invalidEvents: Array<{ id: string; type: string }> = [];

  persona.eventManifest.events?.forEach(event => {
    if (!validTypes.includes(event.type)) {
      invalidEvents.push({ id: event.id, type: event.type });
    }
  });

  if (invalidEvents.length > 0) {
    const errorDetails = invalidEvents
      .map(e => `  - Event "${e.id}" uses invalid type "${e.type}"`)
      .join('\n');

    throw new Error(
      `Persona "${persona.id}" (${persona.title}) contains invalid event types:\n${errorDetails}\n\n` +
      `Valid event types are defined in EventType enum. Common fixes:\n` +
      `  - DEBT_PAYOFF → DEBT_PAYMENT or LIABILITY_PAYMENT\n` +
      `  - ONE_TIME_INCOME → ONE_TIME_EVENT\n` +
      `  - ONE_TIME_EXPENSE → ONE_TIME_EVENT`
    );
  }
}

// Validate all personas at module load time to catch issues immediately
PERSONAS.forEach(persona => {
  try {
    validatePersona(persona);
  } catch (error) {
    console.error('❌ Persona validation failed:', error);
    throw error; // Re-throw to prevent app from loading with invalid data
  }
});