/**
 * Strategy Batch Processor
 * 
 * Executes multiple strategies simultaneously with conflict detection,
 * dependency management, and optimization.
 */

import { logger } from '@/utils/logger';
import { generateId } from '../../utils/formatting';
import { strategyEngineService } from '../strategyEngine';
import type {
  StrategyExecutionContext,
  StrategyResult,
  StrategyImpact,
  StrategyGeneratedEvent
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';

export interface BatchExecutionRequest {
  strategyIds: string[];
  context: StrategyExecutionContext;
  userInputs: Record<string, Record<string, any>>; // strategyId -> inputs
  options?: BatchExecutionOptions;
}

export interface BatchExecutionOptions {
  resolveConflicts?: boolean;
  optimizeOrder?: boolean;
  maxConcurrency?: number;
  skipValidation?: boolean;
  createSeparatePlans?: boolean;
}

export interface BatchExecutionResult {
  success: boolean;
  executedStrategies: string[];
  results: StrategyResult[];
  conflicts: StrategyConflict[];
  combinedImpact: StrategyImpact;
  executionOrder: string[];
  warnings: string[];
  recommendations: string[];
  newPlanId?: string;
  newPlanName?: string;
  combinedEvents: FinancialEvent[];
}

export interface StrategyConflict {
  strategyIds: string[];
  type: 'resource_allocation' | 'timing' | 'account_type' | 'goal_priority' | 'logic';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: 'prioritize' | 'modify' | 'merge' | 'skip';
  primaryStrategy?: string;
  modifications?: Array<{
    strategyId: string;
    parameter: string;
    originalValue: any;
    newValue: any;
    reason: string;
  }>;
}

export interface StrategyDependency {
  strategyId: string;
  dependsOn: string[];
  reason: string;
  isRequired: boolean;
}

export class StrategyBatchProcessor {
  private dependencies: Map<string, StrategyDependency> = new Map();

  constructor() {
    this.initializeDependencies();
  }

  /**
   * Execute multiple strategies in optimal order with conflict resolution
   */
  async executeBatch(request: BatchExecutionRequest): Promise<BatchExecutionResult> {
    const options = {
      resolveConflicts: true,
      optimizeOrder: true,
      maxConcurrency: 3,
      skipValidation: false,
      createSeparatePlans: false,
      ...request.options
    };

    try {
      // 1. Validate strategies exist
      const validStrategies = this.validateStrategies(request.strategyIds);
      if (validStrategies.length === 0) {
        return this.createFailureResult('No valid strategies found', []);
      }

      // 2. Detect conflicts
      const conflicts = await this.detectConflicts(
        validStrategies,
        request.context,
        request.userInputs
      );

      // 3. Resolve conflicts if requested
      const resolvedStrategies = options.resolveConflicts
        ? await this.resolveConflicts(validStrategies, conflicts, request.userInputs)
        : validStrategies;

      // 4. Determine execution order
      const executionOrder = options.optimizeOrder
        ? this.optimizeExecutionOrder(resolvedStrategies)
        : resolvedStrategies;

      // 5. Execute strategies
      const results = await this.executeStrategies(
        executionOrder,
        request.context,
        request.userInputs,
        options.maxConcurrency
      );

      // 6. Combine results
      const combinedResult = this.combineResults(
        results,
        conflicts,
        executionOrder
      );

      return combinedResult;

    } catch (error) {
      logger.error('Batch execution failed:', error);
      return this.createFailureResult(`Batch execution failed: ${error}`, []);
    }
  }

  /**
   * Analyze potential conflicts between strategies without executing
   */
  async analyzeConflicts(
    strategyIds: string[],
    context: StrategyExecutionContext,
    userInputs: Record<string, Record<string, any>>
  ): Promise<StrategyConflict[]> {
    return this.detectConflicts(strategyIds, context, userInputs);
  }

  /**
   * Get recommended execution order for strategies
   */
  getOptimalExecutionOrder(strategyIds: string[]): string[] {
    return this.optimizeExecutionOrder(strategyIds);
  }

  /**
   * Check if strategies are compatible
   */
  areStrategiesCompatible(strategyIds: string[]): { compatible: boolean; conflicts: StrategyConflict[] } {
    const conflicts: StrategyConflict[] = [];

    // Check for fundamental incompatibilities
    const hasEmergencyFund = strategyIds.includes('emergency-fund');
    const hasInvestment = strategyIds.includes('investment-optimization');
    const hasDebtPayoff = strategyIds.includes('debt-payoff');

    // Emergency fund should come before investment
    if (hasEmergencyFund && hasInvestment) {
      // This is actually compatible - emergency fund has higher priority
    }

    // Aggressive debt payoff might conflict with investment
    if (hasDebtPayoff && hasInvestment) {
      conflicts.push({
        strategyIds: ['debt-payoff', 'investment-optimization'],
        type: 'resource_allocation',
        description: 'Debt payoff and investment strategies compete for available cash flow',
        severity: 'medium',
        resolution: {
          strategy: 'prioritize',
          primaryStrategy: 'debt-payoff' // Generally prioritize high-interest debt
        }
      });
    }

    return {
      compatible: conflicts.filter(c => c.severity === 'critical').length === 0,
      conflicts
    };
  }

  // Private helper methods

  private initializeDependencies(): void {
    // Emergency fund should be established before investment
    this.dependencies.set('investment-optimization', {
      strategyId: 'investment-optimization',
      dependsOn: ['emergency-fund'],
      reason: 'Emergency fund provides financial security before investing',
      isRequired: false // Can proceed with warnings
    });

    // College planning can run with other strategies
    this.dependencies.set('college-planning', {
      strategyId: 'college-planning',
      dependsOn: ['emergency-fund'],
      reason: 'Emergency fund provides stability for long-term education planning',
      isRequired: false
    });

    // Tax optimization can enhance other strategies
    this.dependencies.set('tax-optimization', {
      strategyId: 'tax-optimization',
      dependsOn: [],
      reason: 'Tax optimization can be applied to any income situation',
      isRequired: false
    });
  }

  private validateStrategies(strategyIds: string[]): string[] {
    return strategyIds.filter(id => {
      const strategy = strategyEngineService.getStrategy(id);
      return strategy !== undefined;
    });
  }

  private async detectConflicts(
    strategyIds: string[],
    context: StrategyExecutionContext,
    userInputs: Record<string, Record<string, any>>
  ): Promise<StrategyConflict[]> {
    const conflicts: StrategyConflict[] = [];

    // Check resource allocation conflicts
    const totalMonthlyCommitment = this.calculateTotalMonthlyCommitment(strategyIds, userInputs);
    const estimatedMonthlyIncome = this.estimateMonthlyIncome(context.currentEvents);
    
    if (totalMonthlyCommitment > estimatedMonthlyIncome * 0.8) {
      conflicts.push({
        strategyIds,
        type: 'resource_allocation',
        description: `Total monthly commitments ($${totalMonthlyCommitment.toLocaleString()}) exceed 80% of estimated income`,
        severity: 'high',
        resolution: {
          strategy: 'modify',
          modifications: [
            {
              strategyId: 'investment-optimization',
              parameter: 'monthlyInvestment',
              originalValue: userInputs['investment-optimization']?.monthlyInvestment,
              newValue: Math.max(500, totalMonthlyCommitment * 0.3),
              reason: 'Reduce investment to accommodate other priorities'
            }
          ]
        }
      });
    }

    // Check account type conflicts
    const accountTypeUsage = this.analyzeAccountTypeUsage(strategyIds, userInputs);
    for (const [accountType, strategies] of accountTypeUsage.entries()) {
      if (strategies.length > 1) {
        conflicts.push({
          strategyIds: strategies,
          type: 'account_type',
          description: `Multiple strategies targeting ${accountType} account type`,
          severity: 'medium',
          resolution: {
            strategy: 'merge',
            modifications: []
          }
        });
      }
    }

    // Check timing conflicts (e.g., both strategies want to optimize year-end)
    const timingConflicts = this.analyzeTimingConflicts(strategyIds);
    conflicts.push(...timingConflicts);

    return conflicts;
  }

  private async resolveConflicts(
    strategyIds: string[],
    conflicts: StrategyConflict[],
    userInputs: Record<string, Record<string, any>>
  ): Promise<string[]> {
    let resolvedStrategies = [...strategyIds];

    for (const conflict of conflicts) {
      if (conflict.severity === 'critical') {
        // Remove conflicting strategies or modify significantly
        if (conflict.resolution?.strategy === 'skip') {
          resolvedStrategies = resolvedStrategies.filter(id => !conflict.strategyIds.includes(id));
        }
      }

      if (conflict.resolution?.modifications) {
        // Apply modifications to user inputs
        for (const mod of conflict.resolution.modifications) {
          if (userInputs[mod.strategyId]) {
            userInputs[mod.strategyId][mod.parameter] = mod.newValue;
          }
        }
      }
    }

    return resolvedStrategies;
  }

  private optimizeExecutionOrder(strategyIds: string[]): string[] {
    const ordered: string[] = [];
    const remaining = new Set(strategyIds);

    // Priority order based on financial planning best practices
    const priorityOrder = [
      'emergency-fund',      // Highest priority - financial foundation
      'debt-payoff',         // Pay off high-interest debt
      'tax-optimization',    // Optimize tax efficiency
      'retirement-optimization', // Retirement planning
      'investment-optimization', // General investing
      'college-planning'     // Education planning
    ];

    // Add strategies in priority order
    for (const strategyId of priorityOrder) {
      if (remaining.has(strategyId)) {
        ordered.push(strategyId);
        remaining.delete(strategyId);
      }
    }

    // Add any remaining strategies
    ordered.push(...Array.from(remaining));

    return ordered;
  }

  private async executeStrategies(
    strategyIds: string[],
    context: StrategyExecutionContext,
    userInputs: Record<string, Record<string, any>>,
    maxConcurrency: number
  ): Promise<StrategyResult[]> {
    const results: StrategyResult[] = [];

    // Execute in order with dependency management
    for (const strategyId of strategyIds) {
      try {
        const strategyInputs = userInputs[strategyId] || {};
        const contextWithInputs = {
          ...context,
          userInputs: strategyInputs
        };

        const result = await strategyEngineService.executeStrategy(strategyId, contextWithInputs);
        results.push(result);

        // Update context with new events for subsequent strategies
        if (result.success && result.generatedEvents.length > 0) {
          const newEvents = result.generatedEvents.map(ge => ge.event);
          context.currentEvents.push(...newEvents);
        }

      } catch (error) {
        logger.error(`Strategy execution failed for ${strategyId}:`, error);
        results.push({
          success: false,
          strategyId,
          strategyName: strategyId,
          newPlanName: '',
          generatedEvents: [],
          modifiedEvents: [],
          recommendations: [],
          estimatedImpact: this.getEmptyImpact(),
          warnings: [`Execution failed: ${error}`],
          nextSteps: []
        });
      }
    }

    return results;
  }

  private combineResults(
    results: StrategyResult[],
    conflicts: StrategyConflict[],
    executionOrder: string[]
  ): BatchExecutionResult {
    const successfulResults = results.filter(r => r.success);
    const combinedEvents: FinancialEvent[] = [];
    const combinedWarnings: string[] = [];
    const combinedRecommendations: string[] = [];

    // Combine all generated events
    for (const result of successfulResults) {
      combinedEvents.push(...result.generatedEvents.map(ge => ge.event));
      combinedWarnings.push(...result.warnings);
      combinedRecommendations.push(
        ...result.recommendations.map(r => `${result.strategyName}: ${r.description}`)
      );
    }

    // Calculate combined impact
    const combinedImpact = this.calculateCombinedImpact(successfulResults);

    return {
      success: successfulResults.length > 0,
      executedStrategies: successfulResults.map(r => r.strategyId),
      results: successfulResults,
      conflicts,
      combinedImpact,
      executionOrder,
      warnings: combinedWarnings,
      recommendations: combinedRecommendations,
      newPlanId: generateId(),
      newPlanName: `Comprehensive Strategy Plan - ${successfulResults.length} Strategies`,
      combinedEvents
    };
  }

  private calculateCombinedImpact(results: StrategyResult[]): StrategyImpact {
    const impacts = results.map(r => r.estimatedImpact);
    
    return {
      cashFlowImpact: {
        monthlyChange: impacts.reduce((sum, impact) => sum + impact.cashFlowImpact.monthlyChange, 0),
        annualChange: impacts.reduce((sum, impact) => sum + impact.cashFlowImpact.annualChange, 0),
        firstYearTotal: impacts.reduce((sum, impact) => sum + impact.cashFlowImpact.firstYearTotal, 0)
      },
      netWorthImpact: {
        fiveYearProjection: impacts.reduce((sum, impact) => sum + impact.netWorthImpact.fiveYearProjection, 0),
        tenYearProjection: impacts.reduce((sum, impact) => sum + impact.netWorthImpact.tenYearProjection, 0),
        retirementImpact: impacts.reduce((sum, impact) => sum + impact.netWorthImpact.retirementImpact, 0)
      },
      taxImpact: {
        annualTaxSavings: impacts.reduce((sum, impact) => sum + impact.taxImpact.annualTaxSavings, 0),
        lifetimeTaxSavings: impacts.reduce((sum, impact) => sum + impact.taxImpact.lifetimeTaxSavings, 0)
      },
      riskFactors: impacts.flatMap(impact => impact.riskFactors)
    };
  }

  private calculateTotalMonthlyCommitment(
    strategyIds: string[],
    userInputs: Record<string, Record<string, any>>
  ): number {
    let total = 0;

    for (const strategyId of strategyIds) {
      const inputs = userInputs[strategyId] || {};
      
      switch (strategyId) {
        case 'emergency-fund':
          const monthlyIncome = 7000; // Fallback estimate
          total += (monthlyIncome * (inputs.contributionRate || 0.10));
          break;
        case 'investment-optimization':
          total += inputs.monthlyInvestment || 0;
          break;
        case 'college-planning':
          total += inputs.monthlyContribution || 0;
          break;
        case 'debt-payoff':
          total += inputs.extraPayment || 0;
          break;
      }
    }

    return total;
  }

  private estimateMonthlyIncome(events: FinancialEvent[]): number {
    const incomeEvents = events.filter(event => 
      event.type === 'INCOME' || event.type === 'SALARY'
    );
    
    let totalMonthlyIncome = 0;
    for (const event of incomeEvents) {
      const amount = (event as any).amount || 0;
      if (event.frequency === 'monthly') {
        totalMonthlyIncome += amount;
      } else if (event.frequency === 'annually') {
        totalMonthlyIncome += amount / 12;
      }
    }
    
    return totalMonthlyIncome || 8000; // Default fallback
  }

  private analyzeAccountTypeUsage(
    strategyIds: string[],
    userInputs: Record<string, Record<string, any>>
  ): Map<string, string[]> {
    const usage = new Map<string, string[]>();

    // This would analyze which account types each strategy targets
    // Implementation would check strategy configurations and user inputs
    
    return usage;
  }

  private analyzeTimingConflicts(strategyIds: string[]): StrategyConflict[] {
    const conflicts: StrategyConflict[] = [];

    // Check for year-end timing conflicts
    const yearEndStrategies = strategyIds.filter(id => 
      ['tax-optimization', 'retirement-optimization'].includes(id)
    );

    if (yearEndStrategies.length > 1) {
      conflicts.push({
        strategyIds: yearEndStrategies,
        type: 'timing',
        description: 'Multiple strategies require year-end optimization attention',
        severity: 'low',
        resolution: {
          strategy: 'merge',
          modifications: []
        }
      });
    }

    return conflicts;
  }

  private createFailureResult(message: string, conflicts: StrategyConflict[]): BatchExecutionResult {
    return {
      success: false,
      executedStrategies: [],
      results: [],
      conflicts,
      combinedImpact: this.getEmptyImpact(),
      executionOrder: [],
      warnings: [message],
      recommendations: [],
      combinedEvents: []
    };
  }

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
}

// Export singleton instance
export const strategyBatchProcessor = new StrategyBatchProcessor();