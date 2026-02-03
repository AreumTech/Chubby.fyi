/**
 * College Planning Strategy
 * 
 * 529 plan optimization, education tax credit maximization, and UTMA/UGMA analysis.
 */

import { generateId } from '../../utils/formatting';
import type {
  StrategyEngine,
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent,
  StrategyRecommendation
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';

export class CollegePlanningStrategy implements StrategyEngine {
  id = 'college-planning';
  name = 'College Savings Optimizer';
  category = 'COLLEGE_PLANNING' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: '529 plan optimization, education tax credits, and college savings strategy',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'MEDIUM' as const,
    estimatedTimeframe: 216, // 18 years (birth to college)
    difficultyLevel: 'INTERMEDIATE' as const,
    tags: ['529-plan', 'education', 'college-savings', 'tax-credits', 'education-planning']
  };

  getParameters(): StrategyParameters {
    return {
      childAge: {
        type: 'number',
        label: 'Child Age',
        description: 'Current age of child',
        defaultValue: 5,
        min: 0,
        max: 17,
        step: 1,
        required: true
      },
      numberOfChildren: {
        type: 'number',
        label: 'Number of Children',
        description: 'Number of children planning for college',
        defaultValue: 1,
        min: 1,
        max: 5,
        step: 1,
        required: true
      },
      collegeGoal: {
        type: 'selection',
        label: 'College Goal',
        description: 'Target college cost level',
        defaultValue: 'state_public',
        options: [
          { value: 'community_college', label: 'Community College (~$3,500/year)' },
          { value: 'state_public', label: 'In-State Public (~$25,000/year)' },
          { value: 'out_state_public', label: 'Out-of-State Public (~$45,000/year)' },
          { value: 'private', label: 'Private College (~$55,000/year)' },
          { value: 'elite_private', label: 'Elite Private (~$75,000/year)' }
        ],
        required: true
      },
      monthlyContribution: {
        type: 'number',
        label: 'Monthly Contribution',
        description: 'Monthly contribution to college savings',
        defaultValue: 500,
        min: 50,
        max: 5000,
        step: 25,
        required: true
      },
      stateResidence: {
        type: 'text',
        label: 'State of Residence',
        description: 'State for 529 plan tax benefits (e.g., "CA", "NY")',
        defaultValue: 'CA',
        required: true
      },
      coverdellESA: {
        type: 'boolean',
        label: 'Consider Coverdell ESA',
        description: 'Also use Coverdell ESA for K-12 expenses',
        defaultValue: false,
        required: false
      },
      prepaidTuition: {
        type: 'boolean',
        label: 'Consider Prepaid Tuition Plan',
        description: 'Evaluate prepaid tuition plans vs investment plans',
        defaultValue: false,
        required: false
      },
      familyIncome: {
        type: 'number',
        label: 'Family AGI',
        description: 'Family adjusted gross income for aid calculations',
        defaultValue: 150000,
        min: 30000,
        max: 500000,
        step: 5000,
        required: true
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // Check if user has income
    const hasIncome = context.currentEvents.some(event => 
      event.type === 'INCOME' || event.type === 'SALARY'
    );
    
    if (!hasIncome) {
      reasons.push('No income events found - college planning requires regular income');
    }

    // Check age appropriateness - default to young child if no data
    const childAge = 5; // Default assumption for strategy testing
    if (childAge > 15) {
      reasons.push('Limited time horizon - consider accelerated savings or education loans');
    }

    return {
      applicable: reasons.length === 0,
      reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const generatedEvents: StrategyGeneratedEvent[] = [];
    const recommendations: StrategyRecommendation[] = [];
    const warnings: string[] = [];
    const nextSteps: string[] = [];

    // Default college planning parameters
    const childAge = 5;
    const numberOfChildren = 1;
    const collegeGoal = 'state_university'; // public, state_university, private
    const monthlyContribution = 500;
    const stateResidence = 'CA';
    const coverdellESA = false;
    const familyIncome = 100000;
    const currentYear = new Date().getFullYear();
    
    // Calculate college costs and timeframe
    const yearsToCollege = 18 - childAge;
    const annualCollegeCost = this.getCollegeCosts(collegeGoal);
    const totalCollegeGoal = annualCollegeCost * 4 * numberOfChildren;
    
    // 1. 529 Plan Contribution
    const plan529Event = this.generate529PlanContribution(
      currentYear,
      monthlyContribution,
      stateResidence,
      totalCollegeGoal,
      yearsToCollege
    );
    
    generatedEvents.push({
      event: plan529Event,
      reason: `Save for college with tax-advantaged 529 plan. Target: $${totalCollegeGoal.toLocaleString()} in ${yearsToCollege} years`,
      isEditable: true,
      linkedToStrategy: true,
      importance: 'HIGH'
    });

    // 2. Coverdell ESA (if applicable)
    if (coverdellESA && familyIncome < 220000) {
      const coverdellEvent = this.generateCoverdellESAEvent(currentYear);
      
      generatedEvents.push({
        event: coverdellEvent,
        reason: 'Supplement 529 with Coverdell ESA for K-12 and college expenses',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    // 3. Education Tax Credit Optimization
    const taxCreditEvent = this.generateEducationTaxCreditEvent(
      currentYear + yearsToCollege,
      inputs.familyIncome
    );
    
    generatedEvents.push({
      event: taxCreditEvent,
      reason: 'Optimize education tax credits during college years',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'MEDIUM'
    });

    // 4. Age-based Investment Strategy
    const investmentStrategyEvent = this.generateAgeBasedInvestmentEvent(
      currentYear,
      yearsToCollege,
      inputs.monthlyContribution
    );
    
    generatedEvents.push({
      event: investmentStrategyEvent,
      reason: 'Age-based investment allocation becomes more conservative as college approaches',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'HIGH'
    });

    // 5. Financial Aid Planning
    const financialAidEvent = this.generateFinancialAidPlanningEvent(
      currentYear + yearsToCollege - 2, // Start 2 years before college
      inputs.familyIncome
    );
    
    generatedEvents.push({
      event: financialAidEvent,
      reason: 'Optimize financial aid eligibility through strategic planning',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'MEDIUM'
    });

    // Generate recommendations
    recommendations.push(
      {
        id: generateId(),
        title: 'Research State 529 Benefits',
        description: `Research ${inputs.stateResidence} state 529 plan tax benefits and investment options`,
        type: 'ACTION',
        priority: 'HIGH',
        timeToImplement: '2-3 hours',
        difficulty: 'EASY'
      },
      {
        id: generateId(),
        title: 'Start FAFSA Planning Early',
        description: 'Understand FAFSA requirements and begin tax/income optimization 2 years before college',
        type: 'ACTION',
        priority: 'MEDIUM',
        timeToImplement: '1 hour annually',
        difficulty: 'MODERATE'
      }
    );

    // Warnings based on income and timeframe
    if (inputs.familyIncome > 200000) {
      warnings.push('High income may reduce financial aid eligibility - focus on savings over aid strategies');
    }

    if (yearsToCollege < 5) {
      warnings.push('Short time horizon - consider more conservative investments and education loans');
    }

    if (inputs.monthlyContribution * 12 * yearsToCollege < totalCollegeGoal * 0.5) {
      warnings.push('Current savings rate may not meet college cost goals - consider increasing contributions');
    }

    // Next steps
    nextSteps.push(
      'Open 529 plan account in your state',
      'Set up automatic monthly contributions',
      'Research college costs and update goals annually',
      'Review investment allocation as college approaches',
      'Begin financial aid planning 2 years before college'
    );

    const estimatedImpact = await this.estimateImpact(context);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `College Plan - ${inputs.numberOfChildren} Child(ren)`,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps
    };
  }

  async estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact> {
    const inputs = context.userInputs;
    const yearsToCollege = 18 - inputs.childAge;
    const annualContribution = inputs.monthlyContribution * 12;
    
    // Estimate 529 growth with age-based allocation
    const averageReturn = yearsToCollege > 10 ? 0.07 : 0.05; // Higher returns with longer timeframe
    const futureValue = this.calculateFutureValue(annualContribution, averageReturn, yearsToCollege);
    
    // State tax benefits (varies by state, estimate 5-6% deduction benefit)
    const stateTaxBenefit = annualContribution * 0.05; // Estimate 5% state tax rate
    
    return {
      cashFlowImpact: {
        monthlyChange: -inputs.monthlyContribution,
        annualChange: -annualContribution + stateTaxBenefit,
        firstYearTotal: -annualContribution + stateTaxBenefit
      },
      netWorthImpact: {
        fiveYearProjection: this.calculateFutureValue(annualContribution, averageReturn, 5),
        tenYearProjection: this.calculateFutureValue(annualContribution, averageReturn, 10),
        retirementImpact: 0 // College savings used before retirement
      },
      taxImpact: {
        annualTaxSavings: stateTaxBenefit,
        lifetimeTaxSavings: stateTaxBenefit * yearsToCollege
      },
      riskFactors: [
        {
          factor: 'College cost inflation',
          severity: 'HIGH',
          mitigation: 'Review and adjust savings goals annually based on current college costs'
        },
        {
          factor: 'Investment losses near college date',
          severity: 'MEDIUM',
          mitigation: 'Use age-based investment allocation that becomes conservative over time'
        }
      ]
    };
  }

  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (inputs.childAge < 0 || inputs.childAge > 17) {
      errors.childAge = 'Child age must be between 0 and 17';
    }

    if (inputs.numberOfChildren < 1 || inputs.numberOfChildren > 10) {
      errors.numberOfChildren = 'Number of children must be between 1 and 10';
    }

    if (inputs.monthlyContribution <= 0) {
      errors.monthlyContribution = 'Monthly contribution must be greater than 0';
    }

    if (inputs.familyIncome <= 0) {
      errors.familyIncome = 'Family income must be greater than 0';
    }

    const validGoals = ['community_college', 'state_public', 'out_state_public', 'private', 'elite_private'];
    if (!validGoals.includes(inputs.collegeGoal)) {
      errors.collegeGoal = 'Invalid college goal selection';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Helper methods

  private getCollegeCosts(collegeGoal: string): number {
    const costs: Record<string, number> = {
      community_college: 3500,
      state_public: 25000,
      out_state_public: 45000,
      private: 55000,
      elite_private: 75000
    };
    
    return costs[collegeGoal] || 25000;
  }

  private calculateFutureValue(annualPayment: number, rate: number, years: number): number {
    if (rate === 0) return annualPayment * years;
    return annualPayment * (Math.pow(1 + rate, years) - 1) / rate;
  }

  private generate529PlanContribution(
    year: number,
    monthlyAmount: number,
    state: string,
    totalGoal: number,
    yearsToCollege: number
  ): FinancialEvent {
    return {
      id: generateId(),
      name: '529 College Savings Plan',
      description: `Monthly 529 plan contribution for college savings`,
      type: 'SCHEDULED_CONTRIBUTION',
      startDate: new Date(year, 0, 1),
      endDate: new Date(year + yearsToCollege, 7, 31), // End before college starts
      amount: monthlyAmount,
      frequency: 'monthly',
      targetAccountType: '529',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        statePlan: state,
        totalGoal,
        yearsToCollege,
        beneficiaryAge: 18 - yearsToCollege,
        taxBenefits: [
          'State tax deduction (varies by state)',
          'Tax-free growth',
          'Tax-free withdrawals for qualified education expenses'
        ],
        investmentOptions: 'age_based_portfolio',
        notes: '529 plan provides tax-advantaged college savings'
      }
    } as FinancialEvent;
  }

  private generateCoverdellESAEvent(year: number): FinancialEvent {
    return {
      id: generateId(),
      name: 'Coverdell ESA Contribution',
      description: 'Annual Coverdell ESA contribution for K-12 and college expenses',
      type: 'COVERDELL_ESA_CONTRIBUTION',
      startDate: new Date(year, 0, 1),
      amount: 2000, // Annual limit
      frequency: 'annually',
      targetAccountType: 'coverdell_esa',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        annualLimit: 2000,
        qualifiedExpenses: [
          'K-12 tuition and fees',
          'College tuition and fees',
          'Books and supplies',
          'Room and board',
          'Computer and internet access'
        ],
        incomePhaseout: {
          single: { start: 95000, end: 110000 },
          married: { start: 190000, end: 220000 }
        },
        notes: 'Coverdell ESA allows tax-free withdrawals for K-12 and college expenses'
      }
    } as FinancialEvent;
  }

  private generateEducationTaxCreditEvent(
    collegeStartYear: number,
    familyIncome: number
  ): FinancialEvent {
    const creditType = familyIncome < 90000 ? 'american_opportunity' : 'lifetime_learning';
    
    return {
      id: generateId(),
      name: 'Education Tax Credit Optimization',
      description: 'Optimize education tax credits during college years',
      type: 'EDUCATION_TAX_CREDIT',
      startDate: new Date(collegeStartYear, 0, 1),
      endDate: new Date(collegeStartYear + 4, 11, 31),
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        creditType,
        maxCredit: creditType === 'american_opportunity' ? 2500 : 2000,
        qualifiedExpenses: [
          'Tuition and fees',
          'Required books and supplies',
          'Equipment required for courses'
        ],
        incomePhaseouts: {
          american_opportunity: {
            single: { start: 80000, end: 90000 },
            married: { start: 160000, end: 180000 }
          },
          lifetime_learning: {
            single: { start: 59000, end: 69000 },
            married: { start: 118000, end: 138000 }
          }
        },
        optimizationStrategies: [
          'Time 529 withdrawals to maximize credits',
          'Pay qualified expenses from non-529 accounts when beneficial',
          'Consider income timing for credit eligibility'
        ],
        notes: 'Coordinate 529 withdrawals with tax credits for maximum benefit'
      }
    } as FinancialEvent;
  }

  private generateAgeBasedInvestmentEvent(
    year: number,
    yearsToCollege: number,
    monthlyAmount: number
  ): FinancialEvent {
    let stockAllocation: number;
    if (yearsToCollege > 15) stockAllocation = 0.80;
    else if (yearsToCollege > 10) stockAllocation = 0.70;
    else if (yearsToCollege > 5) stockAllocation = 0.50;
    else stockAllocation = 0.30;

    return {
      id: generateId(),
      name: 'Age-Based Investment Allocation',
      description: `${(stockAllocation * 100).toFixed(0)}% stocks allocation with ${yearsToCollege} years to college`,
      type: 'COLLEGE_INVESTMENT_ALLOCATION',
      startDate: new Date(year, 0, 1),
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        yearsToCollege,
        targetAllocation: {
          stocks: stockAllocation,
          bonds: 1 - stockAllocation,
          alternatives: 0
        },
        allocationSchedule: [
          { years: 18, stocks: 0.80, bonds: 0.20 },
          { years: 15, stocks: 0.80, bonds: 0.20 },
          { years: 10, stocks: 0.70, bonds: 0.30 },
          { years: 5, stocks: 0.50, bonds: 0.50 },
          { years: 2, stocks: 0.30, bonds: 0.70 },
          { years: 0, stocks: 0.10, bonds: 0.90 }
        ],
        rebalancingFrequency: 'annually',
        capitalPreservation: yearsToCollege < 5,
        notes: 'Allocation becomes more conservative as college approaches to preserve capital'
      }
    } as FinancialEvent;
  }

  private generateFinancialAidPlanningEvent(
    planningStartYear: number,
    familyIncome: number
  ): FinancialEvent {
    return {
      id: generateId(),
      name: 'Financial Aid Planning',
      description: 'Optimize financial aid eligibility through strategic planning',
      type: 'FINANCIAL_AID_PLANNING',
      startDate: new Date(planningStartYear, 0, 1),
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        planningStrategies: [
          'Minimize parent income in base years',
          'Maximize contributions to retirement accounts',
          'Pay down consumer debt',
          'Time capital gains/losses strategically',
          'Consider asset placement between parent/student names'
        ],
        fafsa: {
          baseYears: 'Prior-prior year tax information',
          parentAssetAssessment: 0.056, // 5.6% of parent assets
          studentAssetAssessment: 0.20, // 20% of student assets
          incomeProtectionAllowance: familyIncome < 50000 ? 'Automatic zero EFC possible' : 'Standard calculation'
        },
        assetOptimization: [
          '529 plans count as parent assets (lower assessment)',
          'Home equity not counted for federal aid',
          'Retirement accounts not counted',
          'Life insurance cash value not counted'
        ],
        timeline: [
          'October 1: FAFSA opens',
          'January-March: File FAFSA',
          'April-May: Receive aid offers',
          'May 1: National decision deadline'
        ],
        notes: 'Strategic planning can significantly improve financial aid eligibility'
      }
    } as FinancialEvent;
  }
}