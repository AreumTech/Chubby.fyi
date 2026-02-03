/**
 * Contextual Help Content for Enhanced Goal System
 * 
 * This file contains help content that can be dynamically loaded
 * into UI components for contextual assistance.
 */

import { StandardAccountType } from '@/types/enhanced-goal';

export interface HelpContent {
  title: string;
  content: string;
  tips?: string[];
  examples?: string[];
  warnings?: string[];
}

// Account Type Help Content
export const ACCOUNT_TYPE_HELP: Record<StandardAccountType, HelpContent> = {
  cash: {
    title: "Cash Accounts (Savings)",
    content: "Best for emergency funds and short-term goals where you need guaranteed access to your money. Cash accounts provide FDIC protection and immediate liquidity, but offer lower returns.",
    tips: [
      "Use high-yield savings accounts for better returns",
      "Perfect for goals under 2 years",
      "Keep 3-6 months of expenses here for emergencies",
      "Consider online banks for higher interest rates"
    ],
    examples: [
      "Emergency fund: $25,000 in high-yield savings",
      "Vacation fund: $8,000 for trip next year",
      "New car fund: $15,000 within 18 months"
    ],
    warnings: [
      "Inflation can erode purchasing power over time",
      "Not suitable for long-term wealth building"
    ]
  },

  taxable: {
    title: "Investment Accounts (Taxable)",
    content: "Ideal for medium to long-term goals where you want growth potential but need flexibility. These accounts offer unlimited contributions and no withdrawal restrictions, making them perfect for major purchases.",
    tips: [
      "Use tax-efficient index funds to minimize taxes",
      "Great for goals 3+ years away",
      "Consider tax-loss harvesting opportunities",
      "No contribution limits or withdrawal penalties"
    ],
    examples: [
      "House down payment: $80,000 in 5 years",
      "Home renovation: $50,000 in 3 years",
      "Business investment: $100,000 flexible timeline"
    ],
    warnings: [
      "Market risk means value can go down",
      "Capital gains taxes apply when you sell",
      "Not FDIC insured"
    ]
  },

  tax_deferred: {
    title: "401(k)/Traditional IRA",
    content: "Designed for retirement savings with immediate tax benefits. Contributions reduce your current taxable income, and investments grow tax-deferred until retirement.",
    tips: [
      "Always maximize employer matching first",
      "Best when in high tax bracket now",
      "Use for long-term retirement goals",
      "Consider catch-up contributions if 50+"
    ],
    examples: [
      "Retirement boost: $100,000 additional savings",
      "Early retirement fund: Extra contributions for FIRE",
      "Catch-up savings: Age 50+ additional retirement"
    ],
    warnings: [
      "10% penalty for early withdrawals before 59.5",
      "Required minimum distributions after age 73",
      "All withdrawals taxed as ordinary income"
    ]
  },

  roth: {
    title: "Roth IRA",
    content: "After-tax retirement savings that grows completely tax-free. Perfect for tax diversification and flexible retirement planning. Contributions can be withdrawn penalty-free anytime.",
    tips: [
      "Best when you expect higher taxes in retirement",
      "Ideal for younger savers in lower tax brackets",
      "No required minimum distributions",
      "Great for estate planning"
    ],
    examples: [
      "Young professional retirement: $50,000 by age 30",
      "Tax-free retirement income: Long-term growth",
      "Flexible retirement savings: Access to contributions"
    ],
    warnings: [
      "Income limits may restrict eligibility",
      "5-year rule for earnings withdrawals",
      "No immediate tax deduction"
    ]
  },

  '529': {
    title: "529 Education Accounts",
    content: "Tax-advantaged savings specifically for education expenses. Contributions grow tax-free and withdrawals are tax-free when used for qualified education expenses.",
    tips: [
      "Start early for maximum compound growth",
      "Many states offer tax deductions",
      "Can be used for K-12 and college",
      "Consider age-based investment options"
    ],
    examples: [
      "College fund: $150,000 for child's education",
      "Graduate school: $75,000 for advanced degree",
      "K-12 tuition: $50,000 for private school"
    ],
    warnings: [
      "10% penalty on non-education withdrawals",
      "Limited investment options",
      "May impact financial aid eligibility"
    ]
  },

  hsa: {
    title: "Health Savings Account",
    content: "Triple tax-advantaged account for healthcare expenses. Deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses. Becomes a retirement account after age 65.",
    tips: [
      "Must have high-deductible health plan",
      "Save receipts for future reimbursement",
      "Can be used as retirement account after 65",
      "Invest for long-term growth if possible"
    ],
    examples: [
      "Healthcare emergency fund: $15,000 for medical costs",
      "Retirement healthcare: $100,000 for future medical",
      "Current medical expenses: Ongoing healthcare costs"
    ],
    warnings: [
      "20% penalty for non-medical withdrawals before 65",
      "Must maintain qualifying health plan",
      "Use-it-or-lose-it doesn't apply (unlike FSA)"
    ]
  }
};

// Goal Template Help Content
export const GOAL_TEMPLATE_HELP = {
  'emergency-fund': {
    title: "Emergency Fund Strategy",
    content: "An emergency fund protects you from unexpected expenses like job loss, medical bills, or major repairs. It should be easily accessible and separate from other savings.",
    tips: [
      "Start with $1,000 if you're new to saving",
      "Build to 1 month of expenses, then 3, then 6",
      "Keep in a separate high-yield savings account",
      "Use automatic transfers to build consistently"
    ],
    examples: [
      "Basic starter: $1,000 for small emergencies",
      "Standard fund: $25,000 (6 months at $4,000/month)",
      "Extended fund: $40,000 (for variable income)"
    ],
    bestAccount: "cash",
    reasoning: "Emergency funds need to be immediately accessible without market risk. Cash accounts provide FDIC protection and guaranteed liquidity when you need it most."
  },

  'house-down-payment': {
    title: "House Down Payment Strategy",
    content: "Saving for a home requires balancing growth potential with capital preservation. The timeline and amount needed make investment accounts often the best choice.",
    tips: [
      "Include closing costs (2-5% of home price)",
      "Consider PMI if putting down less than 20%",
      "Research first-time buyer programs",
      "Use conservative investments as purchase approaches"
    ],
    examples: [
      "Starter home: $40,000 (20% of $200,000 home)",
      "Family home: $80,000 (20% of $400,000 home)",
      "Luxury home: $150,000 (20% of $750,000 home)"
    ],
    bestAccount: "taxable",
    reasoning: "Investment accounts provide growth potential over the typical 3-7 year saving period while maintaining full liquidity when you find the right home."
  },

  'retirement-boost': {
    title: "Retirement Boost Strategy",
    content: "Additional retirement savings beyond regular contributions help ensure financial security. Choose between traditional and Roth based on your tax situation.",
    tips: [
      "Max employer matching first",
      "Consider current vs. future tax rates",
      "Use catch-up contributions if 50+",
      "Automate contributions for consistency"
    ],
    examples: [
      "Young professional: $50,000 additional in Roth IRA",
      "Mid-career boost: $100,000 extra in 401(k)",
      "Pre-retirement: $200,000 final push"
    ],
    bestAccount: "tax_deferred",
    reasoning: "Retirement accounts provide the best tax advantages for long-term retirement savings, with immediate deductions for traditional accounts or tax-free growth for Roth."
  },

  'vacation-fund': {
    title: "Vacation Fund Strategy",
    content: "Vacation savings should be kept safe and accessible since you have a specific timeline and amount needed. Avoid market risk for short-term travel goals.",
    tips: [
      "Book major expenses early for better deals",
      "Add 20% buffer for unexpected costs",
      "Consider travel rewards credit cards",
      "Set aside money monthly to avoid debt"
    ],
    examples: [
      "Weekend getaway: $3,000 for short trip",
      "European vacation: $12,000 for two weeks",
      "Dream safari: $25,000 for luxury experience"
    ],
    bestAccount: "cash",
    reasoning: "Vacation funds have specific timelines and amounts needed. Cash accounts ensure your money is there when you're ready to book and travel."
  },

  'education-fund': {
    title: "Education Fund Strategy",
    content: "Education savings benefit greatly from tax-advantaged 529 accounts. Start early to maximize compound growth and take advantage of state tax benefits.",
    tips: [
      "Research your state's 529 plan benefits",
      "Use age-based investment portfolios",
      "Start with small amounts if money is tight",
      "Can be used for K-12 and college expenses"
    ],
    examples: [
      "In-state college: $100,000 for state university",
      "Private college: $250,000 for private university",
      "Graduate school: $150,000 for advanced degree"
    ],
    bestAccount: "529",
    reasoning: "529 accounts offer triple tax benefits for education: many states provide tax deductions, growth is tax-free, and withdrawals are tax-free for qualified education expenses."
  }
};

// Context-Specific Help Messages
export const CONTEXTUAL_HELP = {
  goalNaming: {
    title: "Goal Naming Best Practices",
    content: "Give your goal a specific, motivating name that reminds you why you're saving. Good names are specific and emotional.",
    examples: [
      "Instead of 'Emergency Fund' → 'Peace of Mind Fund'",
      "Instead of 'House Fund' → 'First Home Down Payment'",
      "Instead of 'Vacation' → 'Italy Anniversary Trip'"
    ]
  },

  targetAmount: {
    title: "Setting Target Amounts",
    content: "Be realistic but specific with your target amounts. Research actual costs and add buffers for unexpected expenses.",
    tips: [
      "For emergencies: 3-6 months of actual expenses",
      "For homes: 20% down payment + 3-5% closing costs",
      "For vacations: Research actual costs + 20% buffer",
      "For retirement: Use retirement calculators"
    ]
  },

  targetDate: {
    title: "Choosing Target Dates",
    content: "Set realistic target dates that motivate you without being overwhelming. You can always adjust as circumstances change.",
    tips: [
      "Emergency funds: 6-12 months",
      "Vacation funds: 12-24 months", 
      "House down payment: 3-7 years",
      "Retirement goals: Multiple decades"
    ]
  },

  monthlyContributions: {
    title: "Understanding Monthly Contributions",
    content: "The calculated monthly contribution shows what you need to save to reach your goal on time. This assumes modest investment returns where applicable.",
    tips: [
      "Start with what you can afford",
      "Increase contributions with raises",
      "Consider bi-weekly contributions",
      "Automate to ensure consistency"
    ]
  },

  progressTracking: {
    title: "Tracking Goal Progress",
    content: "Regular monitoring helps you stay on track and make adjustments as needed. The system automatically calculates your progress and achievement probability.",
    tips: [
      "Check progress monthly",
      "Celebrate milestones (25%, 50%, 75%)",
      "Adjust contributions as income changes",
      "Review goals annually"
    ]
  }
};

// Account Selection Wizard Content
export const ACCOUNT_SELECTION_WIZARD = {
  questions: [
    {
      id: 'timeline',
      question: "When do you need this money?",
      options: [
        { value: 'immediate', label: 'Within 1 year', recommendation: 'cash' },
        { value: 'short', label: '1-3 years', recommendation: 'cash' },
        { value: 'medium', label: '3-10 years', recommendation: 'taxable' },
        { value: 'long', label: '10+ years', recommendation: 'tax_deferred' },
        { value: 'retirement', label: 'Retirement only', recommendation: 'tax_deferred' }
      ]
    },
    {
      id: 'purpose',
      question: "What is this money for?",
      options: [
        { value: 'emergency', label: 'Emergency fund', recommendation: 'cash' },
        { value: 'house', label: 'House purchase', recommendation: 'taxable' },
        { value: 'vacation', label: 'Vacation/travel', recommendation: 'cash' },
        { value: 'education', label: 'Education expenses', recommendation: '529' },
        { value: 'retirement', label: 'Retirement', recommendation: 'tax_deferred' },
        { value: 'healthcare', label: 'Healthcare costs', recommendation: 'hsa' }
      ]
    },
    {
      id: 'risk_tolerance',
      question: "How do you feel about market risk?",
      options: [
        { value: 'none', label: 'I want guaranteed safety', recommendation: 'cash' },
        { value: 'low', label: 'Some risk is okay for higher returns', recommendation: 'taxable' },
        { value: 'moderate', label: 'I can handle moderate volatility', recommendation: 'taxable' },
        { value: 'high', label: 'I want maximum long-term growth', recommendation: 'tax_deferred' }
      ]
    }
  ],
  
  getRecommendation: (answers: Record<string, string>) => {
    // Simple recommendation logic based on answers
    if (answers.purpose === 'emergency') return 'cash';
    if (answers.purpose === 'education') return '529';
    if (answers.purpose === 'healthcare') return 'hsa';
    if (answers.timeline === 'immediate' || answers.timeline === 'short') return 'cash';
    if (answers.timeline === 'retirement') return 'tax_deferred';
    if (answers.risk_tolerance === 'none') return 'cash';
    
    return 'taxable'; // Default for medium-term, moderate risk goals
  }
};

// Error Messages and Troubleshooting
export const GOAL_ERROR_HELP = {
  unrealisticTimeline: {
    title: "Timeline May Be Too Aggressive",
    content: "The monthly contribution needed seems very high for your timeline. Consider extending your target date or reducing the amount.",
    suggestions: [
      "Extend the target date by 6-12 months",
      "Start with a smaller initial goal amount",
      "Look for ways to increase income",
      "Consider a higher-return account type if timeline allows"
    ]
  },
  
  inappropriateAccount: {
    title: "Account Type Mismatch",
    content: "The account type you selected may not be optimal for this goal's timeline and purpose.",
    suggestions: [
      "Review the account type guide above",
      "Consider your goal's timeline and liquidity needs",
      "Think about tax implications",
      "Use the account selection wizard if unsure"
    ]
  },
  
  insufficientAmount: {
    title: "Target Amount Seems Low",
    content: "Your target amount may not be sufficient for this type of goal based on typical costs.",
    suggestions: [
      "Research actual costs in your area",
      "Add a 20% buffer for unexpected expenses",
      "Consider inflation over your timeline",
      "Review similar goals for comparison"
    ]
  }
};

// Success Messages and Encouragement
export const GOAL_SUCCESS_MESSAGES = {
  goalCreated: {
    title: "Goal Created Successfully!",
    content: "Your goal has been created and is ready to track. Remember that consistency is key to achieving your financial goals.",
    nextSteps: [
      "Set up automatic transfers if possible",
      "Add calendar reminders to check progress",
      "Consider linking this goal to your main budget",
      "Celebrate small milestones along the way"
    ]
  },
  
  onTrack: {
    title: "You're On Track!",
    content: "Your consistent contributions are paying off. Keep up the great work!",
    encouragement: [
      "Small, consistent actions lead to big results",
      "You're building important financial habits",
      "Each contribution brings you closer to your goal",
      "Your future self will thank you"
    ]
  },
  
  milestone25: {
    title: "25% Complete!",
    content: "You've reached your first major milestone. This is often the hardest part - building the initial habit.",
    celebration: "🎉 Great job building momentum!"
  },
  
  milestone50: {
    title: "Halfway There!",
    content: "You're at the halfway point! The habit is established and your goal is becoming a reality.",
    celebration: "🎯 You're crushing this goal!"
  },
  
  milestone75: {
    title: "75% Complete!",
    content: "You're in the home stretch! Your goal is almost within reach.",
    celebration: "🚀 The finish line is in sight!"
  },
  
  goalAchieved: {
    title: "Goal Achieved!",
    content: "Congratulations! You've successfully reached your financial goal. This is a significant accomplishment that required discipline and consistency.",
    celebration: "🏆 You did it! Time to celebrate this achievement!",
    nextSteps: [
      "Take a moment to celebrate your success",
      "Consider setting a new, bigger goal",
      "Share your success to inspire others",
      "Apply these habits to your next financial goal"
    ]
  }
};

export default {
  ACCOUNT_TYPE_HELP,
  GOAL_TEMPLATE_HELP,
  CONTEXTUAL_HELP,
  ACCOUNT_SELECTION_WIZARD,
  GOAL_ERROR_HELP,
  GOAL_SUCCESS_MESSAGES
};