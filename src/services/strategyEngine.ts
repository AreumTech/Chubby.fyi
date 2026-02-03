/**
 * Strategy Engine Service
 * 
 * Core service for executing financial strategies that automatically generate
 * events and create new plans. Provides the foundation for strategy automation.
 */

import { generateId } from '../utils/formatting';
import type { 
  StrategyEngine,
  StrategyExecutionContext,
  StrategyResult,
  StrategyGeneratedEvent,
  StrategyImpact,
  StrategyLibrary,
  StrategyCategory,
  StrategyPlanGenerator
} from '../types/strategy';
import type { FinancialEvent } from '../types/events';
import type { Scenario } from '../types';
import { logger } from '@/utils/logger';

class StrategyEngineService implements StrategyLibrary, StrategyPlanGenerator {
  private strategies = new Map<string, StrategyEngine>();
  private categories = new Map<StrategyCategory, string>();

  constructor() {
    this.initializeCategories();
  }

  private initializeCategories(): void {
    this.categories.set('DEBT_PAYOFF', 'Debt Elimination');
    this.categories.set('RETIREMENT_OPTIMIZATION', 'Retirement Planning');
    this.categories.set('TAX_OPTIMIZATION', 'Tax Strategies');
    this.categories.set('EMERGENCY_FUND', 'Emergency Preparedness');
    this.categories.set('INVESTMENT_STRATEGY', 'Investment Optimization');
    this.categories.set('REAL_ESTATE', 'Real Estate');
    this.categories.set('COLLEGE_PLANNING', 'Education Planning');
    this.categories.set('BUSINESS_STRATEGY', 'Business & Entrepreneurship');
    this.categories.set('ESTATE_PLANNING', 'Estate Planning');
    this.categories.set('INSURANCE_OPTIMIZATION', 'Insurance Optimization');
  }

  // StrategyLibrary implementation
  getAllStrategies(): StrategyEngine[] {
    return Array.from(this.strategies.values());
  }

  getStrategiesByCategory(category: StrategyCategory): StrategyEngine[] {
    return this.getAllStrategies().filter(s => s.category === category);
  }

  getApplicableStrategies(context: StrategyExecutionContext): StrategyEngine[] {
    return this.getAllStrategies().filter(strategy => {
      const result = strategy.canApply(context);
      return result.applicable;
    });
  }

  registerStrategy(strategy: StrategyEngine): void {
    this.strategies.set(strategy.id, strategy);
  }

  getStrategy(id: string): StrategyEngine | undefined {
    return this.strategies.get(id);
  }

  // Strategy execution
  async executeStrategy(
    strategyId: string,
    context: StrategyExecutionContext
  ): Promise<StrategyResult> {
    const strategy = this.getStrategy(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const canApplyResult = strategy.canApply(context);
    if (!canApplyResult.applicable) {
      return {
        success: false,
        strategyId,
        strategyName: strategy.name,
        newPlanName: '',
        generatedEvents: [],
        modifiedEvents: [],
        recommendations: [],
        estimatedImpact: this.getEmptyImpact(),
        warnings: canApplyResult.reasons,
        nextSteps: []
      };
    }

    try {
      const result = await strategy.evaluate(context, context.userInputs || {});
      return result;
    } catch (error) {
      logger.error(`Strategy execution failed for ${strategyId}:`, 'COMMAND', error);
      return {
        success: false,
        strategyId,
        strategyName: strategy.name,
        newPlanName: '',
        generatedEvents: [],
        modifiedEvents: [],
        recommendations: [],
        estimatedImpact: this.getEmptyImpact(),
        warnings: [`Strategy execution failed: ${error}`],
        nextSteps: []
      };
    }
  }

  // StrategyPlanGenerator implementation
  async createStrategyPlan(
    basePlanId: string,
    strategy: StrategyEngine,
    context: StrategyExecutionContext,
    result: StrategyResult
  ): Promise<{ newPlanId: string; planName: string; events: FinancialEvent[] }> {
    const newPlanId = generateId();
    const planName = result.newPlanName || `${strategy.name} Strategy`;
    
    // Combine existing events with generated events
    const existingEvents = context.currentEvents.map(event => ({
      ...event,
      id: generateId() // Create new IDs for the copied plan
    }));
    
    const generatedEvents = result.generatedEvents.map(ge => ({
      ...ge.event,
      id: generateId() // Ensure unique IDs
    }));
    
    // Apply any event modifications
    let finalEvents = [...existingEvents, ...generatedEvents];
    
    for (const modification of result.modifiedEvents) {
      const eventIndex = finalEvents.findIndex(e => 
        e.name === modification.modifiedEvent.name && e.type === modification.modifiedEvent.type
      );
      
      if (eventIndex >= 0) {
        finalEvents[eventIndex] = {
          ...modification.modifiedEvent,
          id: generateId()
        };
      }
    }
    
    return {
      newPlanId,
      planName,
      events: finalEvents
    };
  }

  // Utility methods
  private getEmptyImpact(): StrategyImpact {
    return {
      cashFlowImpact: {
        monthlyChange: 0,
        annualChange: 0,
        firstYearTotal: 0
      },
      netWorthImpact: {
        fiveYearProjection: 0,
        tenYearProjection: 0,
        retirementImpact: 0
      },
      taxImpact: {
        annualTaxSavings: 0,
        lifetimeTaxSavings: 0
      },
      riskFactors: []
    };
  }

  /**
   * Creates a strategy execution context from current app state
   */
  createExecutionContext(
    currentEvents: FinancialEvent[],
    config: any,
    userInputs: Record<string, any> = {}
  ): StrategyExecutionContext {
    const currentDate = new Date();
    
    return {
      config,
      currentEvents,
      userInputs,
      startDate: currentDate,
      currentAge: config.currentAge || 30,
      currentYear: config.simulationStartYear || currentDate.getFullYear()
    };
  }

  /**
   * Validates strategy inputs across all registered strategies
   */
  validateStrategyInputs(
    strategyId: string, 
    inputs: Record<string, any>
  ): { valid: boolean; errors: Record<string, string> } {
    const strategy = this.getStrategy(strategyId);
    if (!strategy) {
      return {
        valid: false,
        errors: { strategy: 'Strategy not found' }
      };
    }

    return strategy.validateInputs(inputs);
  }

  /**
   * Gets category display name
   */
  getCategoryName(category: StrategyCategory): string {
    return this.categories.get(category) || category;
  }

  /**
   * Calculates potential impact for multiple strategies
   */
  async compareStrategies(
    strategyIds: string[],
    context: StrategyExecutionContext
  ): Promise<Array<{ 
    strategyId: string; 
    strategyName: string; 
    impact: StrategyImpact;
    applicable: boolean;
  }>> {
    const results = [];
    
    for (const strategyId of strategyIds) {
      const strategy = this.getStrategy(strategyId);
      if (!strategy) continue;
      
      const canApply = strategy.canApply(context);
      let impact = this.getEmptyImpact();
      
      if (canApply.applicable) {
        try {
          impact = await strategy.estimateImpact(context);
        } catch (error) {
          logger.warn(`Failed to estimate impact for strategy ${strategyId}:`, 'COMMAND', error);
        }
      }
      
      results.push({
        strategyId,
        strategyName: strategy.name,
        impact,
        applicable: canApply.applicable
      });
    }
    
    return results;
  }
}

// Export singleton instance
export const strategyEngineService = new StrategyEngineService();