import { EventType, AssetClass, InitialAccountHoldings, LiabilityTypeDetailed } from '../types';

export const EVENT_TYPE_OPTIONS: Array<{ value: EventType | ""; label: string; tooltip?: string }> = [
  { value: "", label: "-- Select Event Type --" },
  { value: EventType.INITIAL_STATE, label: "Initial State (Define Start)" },
  { value: EventType.LIABILITY_ADD, label: "Define New Liability", tooltip: "Add a new loan or debt to your plan."},
  { value: EventType.REAL_ESTATE_PURCHASE, label: "Buy Real Estate", tooltip: "Purchase property with mortgage financing and proper asset modeling."},
  { value: EventType.INCOME, label: "Income (Recurring Monthly)" },
  { value: EventType.SOCIAL_SECURITY_INCOME, label: "Social Security Income (Monthly)" },
  { value: EventType.SCHEDULED_CONTRIBUTION, label: "Scheduled Contribution (Annual, Pro-rated Monthly)", tooltip: "Annual contributions to retirement/investment accounts (401k, IRA, Brokerage). Will be invested monthly." },
  { value: EventType.RECURRING_EXPENSE, label: "Expense (Recurring Monthly)" },
  { value: EventType.ONE_TIME_EVENT, label: "One-Time Event (Income/Expense)" },
  { value: EventType.ROTH_CONVERSION, label: "Roth Conversion", tooltip: "Model converting pre-tax retirement funds to Roth. Tax implications are calculated." },
  { value: EventType.GOAL_DEFINE, label: "Goal Definition" },
  { value: EventType.STRATEGY_ASSET_ALLOCATION_SET, label: "Set Asset Allocation Strategy", tooltip: "Define target percentages for asset classes." },
  { value: EventType.STRATEGY_REBALANCING_RULE_SET, label: "Set Rebalancing Rule", tooltip: "Define how and when portfolio rebalancing occurs." },
];

export const ACCOUNT_TYPE_OPTIONS: Array<{value: keyof InitialAccountHoldings | 'cash_direct', label: string}> = [
  { value: 'cash_direct', label: 'Cash (Direct Balance)' },
  { value: 'taxable', label: 'Taxable Brokerage Holdings' },
  { value: 'tax_deferred', label: 'Tax-Deferred Holdings (401k, IRA)' },
  { value: 'roth', label: 'Roth Holdings (IRA, 401k)' },
];

export const ASSET_CLASS_OPTIONS: Array<{value: AssetClass, label: string}> = [
  { value: AssetClass.US_STOCKS_TOTAL_MARKET, label: 'Stocks' },
  { value: AssetClass.US_BONDS_TOTAL_MARKET, label: 'Bonds' },
  { value: AssetClass.OTHER_ASSETS, label: 'Other Assets' },
  { value: AssetClass.INDIVIDUAL_STOCK, label: 'Individual Stock (High Volatility)' },
  { value: AssetClass.CASH, label: 'Cash (as a holding type)'},
];

export const ASSET_CLASSES_FOR_ALLOCATION = ASSET_CLASS_OPTIONS.filter(opt => opt.value !== 'cash') as Array<{value: Exclude<AssetClass, 'cash'>, label: string}>;


export const LIABILITY_TYPE_OPTIONS: Array<{value: LiabilityTypeDetailed, label: string}> = [
    {value: LiabilityTypeDetailed.PRIMARY_RESIDENCE_MORTGAGE, label: 'Primary Residence Mortgage'},
    {value: LiabilityTypeDetailed.INVESTMENT_PROPERTY_MORTGAGE, label: 'Investment Property Mortgage'},
    {value: LiabilityTypeDetailed.STUDENT_LOAN_FEDERAL, label: 'Student Loan (Federal)'},
    {value: LiabilityTypeDetailed.STUDENT_LOAN_PRIVATE, label: 'Student Loan (Private)'},
    {value: LiabilityTypeDetailed.AUTO_LOAN, label: 'Auto Loan'},
    {value: LiabilityTypeDetailed.PERSONAL_LOAN, label: 'Personal Loan'},
    {value: LiabilityTypeDetailed.CREDIT_CARD_DEBT, label: 'Credit Card Debt'},
    {value: LiabilityTypeDetailed.BUSINESS_LOAN, label: 'Business Loan'},
    {value: LiabilityTypeDetailed.MARGIN_LOAN, label: 'Margin Loan'},
    {value: LiabilityTypeDetailed.OTHER_DEBT, label: 'Other Debt'},
];


export const currencyOptions: Array<{value: string, label: string, tooltip?: string}> = [
  { value: 'USD', label: 'USD - United States Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'GBP', label: 'GBP - British Pound Sterling' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  // Add other currencies as needed
];
