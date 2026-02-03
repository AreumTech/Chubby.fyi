/**
 * Lifetime Expense Modeling Utilities
 *
 * Sophisticated expense modeling over lifetime with lifecycle adjustments
 * for childcare, retirement phases, and inflation.
 */

export interface LifetimeExpenseModelingResult {
  averageIndexedExpenses: number;
  fireTargetAmortized: number;
  lifetimeProjection: Array<{
    year: number;
    age: number;
    nominalExpenses: number;
    realExpenses: number; // inflation-adjusted
    hasChildcare: boolean;
  }>;
  phaseBreakdown: {
    earlyCareer: { years: number; avgExpenses: number };
    midCareer: { years: number; avgExpenses: number };
    preRetirement: { years: number; avgExpenses: number };
    retirement: { years: number; avgExpenses: number };
  };
}

/**
 * Calculate sophisticated expense modeling over lifetime
 *
 * @param currentExpenses Current annual expenses
 * @param currentAge Current age
 * @param hasChildren Whether the person has children
 * @param inflationRate Annual inflation rate (default 3%)
 * @returns Comprehensive lifetime expense modeling
 */
export const calculateLifetimeExpenseModeling = (
  currentExpenses: number,
  currentAge: number,
  hasChildren: boolean,
  inflationRate: number = 0.03
): LifetimeExpenseModelingResult => {
  const projectionYears = 50; // Model 50 years ahead
  const lifetimeProjection = [];
  let totalRealExpenses = 0;

  for (let year = 0; year < projectionYears; year++) {
    const age = currentAge + year;
    let yearlyExpenses = currentExpenses;

    // Childcare lifecycle: disappears after 20 years or when kids are ~22
    const hasChildcare = hasChildren && year < 20;
    if (hasChildren && !hasChildcare && year >= 20) {
      // Remove childcare costs (estimate 15-20% of family expenses)
      yearlyExpenses = currentExpenses * 0.83; // Remove ~17% for childcare
    }

    // Age-related expense adjustments
    if (age >= 65) {
      // Retirement phase: typically 70-80% of working years expenses
      yearlyExpenses *= 0.75;
    } else if (age >= 50) {
      // Pre-retirement: often higher expenses (healthcare, peak lifestyle)
      yearlyExpenses *= 1.1;
    }

    // Apply inflation
    const nominalExpenses = yearlyExpenses * Math.pow(1 + inflationRate, year);
    const realExpenses = yearlyExpenses; // Real expenses in today's dollars

    lifetimeProjection.push({
      year,
      age,
      nominalExpenses,
      realExpenses,
      hasChildcare
    });

    totalRealExpenses += realExpenses;
  }

  const averageIndexedExpenses = totalRealExpenses / projectionYears;
  const fireTargetAmortized = averageIndexedExpenses * 25; // 25x of average indexed expenses

  // Phase breakdown
  const phases = {
    earlyCareer: lifetimeProjection.filter(p => p.age < 40),
    midCareer: lifetimeProjection.filter(p => p.age >= 40 && p.age < 50),
    preRetirement: lifetimeProjection.filter(p => p.age >= 50 && p.age < 65),
    retirement: lifetimeProjection.filter(p => p.age >= 65)
  };

  const phaseBreakdown = {
    earlyCareer: {
      years: phases.earlyCareer.length,
      avgExpenses: phases.earlyCareer.reduce((sum, p) => sum + p.realExpenses, 0) / (phases.earlyCareer.length || 1)
    },
    midCareer: {
      years: phases.midCareer.length,
      avgExpenses: phases.midCareer.reduce((sum, p) => sum + p.realExpenses, 0) / (phases.midCareer.length || 1)
    },
    preRetirement: {
      years: phases.preRetirement.length,
      avgExpenses: phases.preRetirement.reduce((sum, p) => sum + p.realExpenses, 0) / (phases.preRetirement.length || 1)
    },
    retirement: {
      years: phases.retirement.length,
      avgExpenses: phases.retirement.reduce((sum, p) => sum + p.realExpenses, 0) / (phases.retirement.length || 1)
    }
  };

  return {
    averageIndexedExpenses,
    fireTargetAmortized,
    lifetimeProjection,
    phaseBreakdown
  };
};

/**
 * Get color classes for savings rate display
 */
export const getSavingsRateColor = (rate: number): string => {
  if (rate >= 30) return 'text-green-600';
  if (rate >= 20) return 'text-blue-600';
  if (rate >= 10) return 'text-yellow-600';
  return 'text-red-600';
};