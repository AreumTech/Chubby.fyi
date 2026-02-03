/**
 * Expense presets configuration data
 *
 * Provides intelligent expense presets based on location and family size,
 * with detailed monthly breakdowns for transparency.
 */

export interface ExpenseBreakdown {
  housing: number;
  food: number;
  transport: number;
  utilities: number;
  insurance: number;
  personal: number;
  entertainment: number;
  childcare?: number;
  other: number;
  total: number;
}

export interface LocationPreset {
  name: string;
  examples: string;
  single: ExpenseBreakdown;
  couple: ExpenseBreakdown;
  family: ExpenseBreakdown;
}

export const EXPENSE_PRESETS: Record<string, LocationPreset> = {
  'HCOL': {
    name: 'High Cost',
    examples: 'SF, NYC, Seattle',
    single: {
      housing: 3500,
      food: 600,
      transport: 400,
      utilities: 150,
      insurance: 300,
      personal: 500,
      entertainment: 400,
      other: 300,
      total: 6150
    },
    couple: {
      housing: 4500,
      food: 1000,
      transport: 600,
      utilities: 200,
      insurance: 500,
      personal: 800,
      entertainment: 600,
      other: 400,
      total: 8600
    },
    family: {
      housing: 5500,
      food: 1500,
      transport: 800,
      utilities: 250,
      insurance: 800,
      personal: 1200,
      entertainment: 700,
      childcare: 2000,
      other: 500,
      total: 13250
    }
  },
  'MCOL': {
    name: 'Medium Cost',
    examples: 'Austin, Denver, Portland',
    single: {
      housing: 2000,
      food: 500,
      transport: 350,
      utilities: 120,
      insurance: 250,
      personal: 400,
      entertainment: 300,
      other: 250,
      total: 4170
    },
    couple: {
      housing: 2800,
      food: 800,
      transport: 500,
      utilities: 160,
      insurance: 400,
      personal: 600,
      entertainment: 450,
      other: 350,
      total: 6060
    },
    family: {
      housing: 3500,
      food: 1200,
      transport: 650,
      utilities: 200,
      insurance: 600,
      personal: 900,
      entertainment: 500,
      childcare: 1500,
      other: 400,
      total: 9450
    }
  },
  'LCOL': {
    name: 'Low Cost',
    examples: 'Phoenix, Atlanta, Tampa',
    single: {
      housing: 1200,
      food: 400,
      transport: 300,
      utilities: 100,
      insurance: 200,
      personal: 300,
      entertainment: 250,
      other: 200,
      total: 2950
    },
    couple: {
      housing: 1800,
      food: 700,
      transport: 450,
      utilities: 140,
      insurance: 350,
      personal: 500,
      entertainment: 350,
      other: 300,
      total: 4590
    },
    family: {
      housing: 2500,
      food: 1000,
      transport: 550,
      utilities: 180,
      insurance: 500,
      personal: 700,
      entertainment: 400,
      childcare: 1000,
      other: 350,
      total: 7180
    }
  }
};

export type LocationType = keyof typeof EXPENSE_PRESETS;
export type FamilySize = 'single' | 'couple' | 'family';