import { logger } from '@/utils/logger';

/**
 * Dynamic Event Preprocessor
 * 
 * Integrates dynamic events into the WASM preprocessing pipeline.
 * Evaluates dynamic events during simulation preprocessing and converts
 * their generated actions into standard FinancialEvents for WASM processing.
 */

import { 
  FinancialEvent, 
  InitialStateEvent, 
  SimulationEvent,
  EventType as StandardEventType,
  ScheduledContributionEvent
} from '@/types';

import { 
  AnyDynamicEvent, 
  EventAction, 
  SimulationContext,
  getDynamicEventRegistry,
  DynamicEventUtils 
} from './dynamicEvents';

import { normalizeEventToMonthly, NormalizedEvent } from './eventNormalization';
import { StandardAccountType } from '@/types/accountTypes';

/**
 * Dynamic event preprocessing result
 */
interface DynamicEventPreprocessingResult {
  dynamicEvents: AnyDynamicEvent[];
  generatedEvents: FinancialEvent[];
  evaluationLog: DynamicEventEvaluationLog[];
}

/**
 * Evaluation log entry for debugging and transparency
 */
interface DynamicEventEvaluationLog {
  eventId: string;
  eventName: string;
  eventType: string;
  month: number;
  evaluated: boolean;
  actionsGenerated: number;
  reason: string;
  error?: string;
  actions?: EventAction[];
}

/**
 * Preprocessing context for dynamic events
 */
interface DynamicEventPreprocessingContext {
  initialState: InitialStateEvent;
  allEvents: FinancialEvent[];
  simulationStartYear: number;
  maxMonthOffset: number;
  debugMode: boolean;
}

/**
 * Main dynamic event preprocessor
 */
export class DynamicEventPreprocessor {
  private registry = getDynamicEventRegistry();
  private evaluationLog: DynamicEventEvaluationLog[] = [];

  /**
   * Preprocess dynamic events and convert generated actions to FinancialEvents
   */
  async preprocessDynamicEvents(
    context: DynamicEventPreprocessingContext
  ): Promise<DynamicEventPreprocessingResult> {
    this.evaluationLog = [];

    // Extract dynamic events from the event list
    const dynamicEvents = this.extractDynamicEvents(context.allEvents);
    const generatedEvents: FinancialEvent[] = [];

    if (dynamicEvents.length === 0) {
      return {
        dynamicEvents: [],
        generatedEvents: [],
        evaluationLog: []
      };
    }

    if (context.debugMode) {
      logger.dataLog(`🔧 [DynamicPreprocessor] Found ${dynamicEvents.length} dynamic events to preprocess`);
    }

    // Process dynamic events for each month of the simulation
    for (let monthOffset = 0; monthOffset <= context.maxMonthOffset; monthOffset++) {
      const simulationContext = this.buildSimulationContext(
        context,
        monthOffset,
        generatedEvents
      );

      // Get events that should be evaluated this month
      const activeEvents = this.registry.getActiveEvents(dynamicEvents, simulationContext);
      
      if (activeEvents.length === 0) continue;

      // Evaluate each active dynamic event
      for (const dynamicEvent of activeEvents) {
        try {
          const actions = await this.registry.evaluateEvent(dynamicEvent, simulationContext);
          
          this.logEvaluation(dynamicEvent, monthOffset, true, actions.length, 
            `Generated ${actions.length} actions`, actions);

          // Convert actions to FinancialEvents
          const newEvents = this.convertActionsToEvents(
            actions, 
            dynamicEvent, 
            monthOffset, 
            context.simulationStartYear
          );

          generatedEvents.push(...newEvents);

        } catch (error) {
          this.logEvaluation(dynamicEvent, monthOffset, false, 0, 
            `Evaluation failed: ${error}`, undefined, error?.toString());
          
          if (context.debugMode) {
            logger.error(`❌ [DynamicPreprocessor] Failed to evaluate ${dynamicEvent.name}:`, error);
          }
        }
      }
    }

    if (context.debugMode) {
      logger.dataLog(`✅ [DynamicPreprocessor] Generated ${generatedEvents.length} events from dynamic evaluation`);
    }

    return {
      dynamicEvents,
      generatedEvents,
      evaluationLog: this.evaluationLog
    };
  }

  /**
   * Extract dynamic events from mixed event list
   */
  private extractDynamicEvents(events: FinancialEvent[]): AnyDynamicEvent[] {
    return events.filter(event => 
      DynamicEventUtils.isDynamicEvent(event)
    ) as AnyDynamicEvent[];
  }

  /**
   * Build simulation context for dynamic event evaluation
   */
  private buildSimulationContext(
    context: DynamicEventPreprocessingContext,
    monthOffset: number,
    generatedEvents: FinancialEvent[]
  ): SimulationContext {
    // Calculate current simulation state
    const currentYear = context.simulationStartYear + Math.floor(monthOffset / 12);
    const currentAge = ((context.initialState as any).startingAge || 30) + Math.floor(monthOffset / 12);
    
    // Estimate account balances (simplified for preprocessing)
    const accountBalances = this.estimateAccountBalances(
      context.initialState,
      monthOffset,
      generatedEvents
    );

    // Estimate income (simplified)
    const monthlyIncome = this.estimateMonthlyIncome(context.allEvents, monthOffset);

    return {
      currentMonth: monthOffset,
      currentAge,
      currentYear,
      monthlyIncome,
      cashBalance: accountBalances.cash || 0,
      accountBalances,
      
      // Individual account balances (required by interface)
      taxableBalance: accountBalances.taxable || 0,
      taxDeferredBalance: accountBalances.tax_deferred || 0,
      rothBalance: accountBalances.roth || 0,
      hsaBalance: accountBalances.hsa || 0,
      the529Balance: accountBalances['529'] || 0,
      
      // Optional fields for enhanced dynamic events
      averageIncomeLast6Months: monthlyIncome,
      lastMonthIncome: monthlyIncome,
      totalNetWorth: Object.values(accountBalances).reduce((sum, balance) => sum + balance, 0)
    };
  }

  /**
   * Estimate account balances for simulation context (simplified)
   */
  private estimateAccountBalances(
    initialState: InitialStateEvent,
    monthOffset: number,
    generatedEvents: FinancialEvent[]
  ): Record<StandardAccountType | 'cash', number> {
    // Start with initial balances
    const balances: Record<StandardAccountType | 'cash', number> = {
      cash: (initialState as any).cashBalance || 0,
      taxable: (initialState as any).taxableBalance || 0,
      tax_deferred: (initialState as any).taxDeferredBalance || 0,
      roth: (initialState as any).rothBalance || 0,
      '529': 0,
      hsa: 0 // Not in initial state typically
    };

    // Apply simple growth and contributions (very simplified)
    const yearsElapsed = monthOffset / 12;
    const annualGrowthRate = 0.07; // Assume 7% annual growth
    
    for (const accountType of ['taxable', 'tax_deferred', 'roth'] as StandardAccountType[]) {
      if (balances[accountType] > 0) {
        balances[accountType] *= Math.pow(1 + annualGrowthRate, yearsElapsed);
      }
    }

    // Add contributions from generated events (simplified)
    for (const event of generatedEvents) {
      if ('targetAccountType' in event && 'amount' in event && event.amount > 0) {
        const targetAccount = event.targetAccountType as StandardAccountType;
        if (targetAccount in balances) {
          balances[targetAccount] += event.amount;
        }
      }
    }

    return balances;
  }

  /**
   * Estimate monthly income (simplified)
   */
  private estimateMonthlyIncome(events: FinancialEvent[], monthOffset: number): number {
    // Find income events and estimate monthly income
    const incomeEvents = events.filter(event => 
      event.type === StandardEventType.INCOME
    );

    let totalMonthlyIncome = 0;
    
    for (const event of incomeEvents) {
      if ('amount' in event && event.amount) {
        // Convert to monthly amount (simplified)
        let monthlyAmount = event.amount;
        
        if ('frequency' in event) {
          switch ((event as any).frequency) {
            case 'annually':
              monthlyAmount = (event as any).amount / 12;
              break;
            case 'monthly':
              monthlyAmount = (event as any).amount;
              break;
            default:
              monthlyAmount = ((event as any).amount || 0) / 12;
              break;
          }
        }
        
        totalMonthlyIncome += monthlyAmount;
      }
    }

    return totalMonthlyIncome;
  }

  /**
   * Convert dynamic event actions to FinancialEvents
   */
  private convertActionsToEvents(
    actions: EventAction[],
    sourceEvent: AnyDynamicEvent,
    monthOffset: number,
    simulationStartYear: number
  ): FinancialEvent[] {
    const events: FinancialEvent[] = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      try {
        const financialEvent = this.convertActionToEvent(
          action, 
          sourceEvent, 
          monthOffset, 
          simulationStartYear,
          i
        );
        
        if (financialEvent) {
          events.push(financialEvent);
        }
      } catch (error) {
        logger.error(`❌ [DynamicPreprocessor] Failed to convert action to event:`, error);
      }
    }

    return events;
  }

  /**
   * Convert a single action to a FinancialEvent
   */
  private convertActionToEvent(
    action: EventAction,
    sourceEvent: AnyDynamicEvent,
    monthOffset: number,
    simulationStartYear: number,
    actionIndex: number
  ): FinancialEvent | null {
    const baseId: string = `${sourceEvent.id}-generated-${monthOffset}-${actionIndex}`;
    const eventMonth = Math.floor(monthOffset);
    const eventYear = simulationStartYear + Math.floor(monthOffset / 12);

    switch (action.type) {
      case 'CONTRIBUTION':
        return {
          id: baseId,
          name: action.description || `Dynamic contribution from ${sourceEvent.name}`,
          type: StandardEventType.SCHEDULED_CONTRIBUTION,
          amount: action.amount,
          targetAccountType: action.targetAccount,
          monthOffset: eventMonth,
          priority: action.priority || sourceEvent.priority,
          frequency: 'one-time' as any, // FIXED: Use lowercase 'one-time' for frequency normalizer compatibility
          metadata: {
            generatedBy: sourceEvent.id,
            generatedByType: sourceEvent.type,
            dynamicAction: true,
            originalAction: action,
            ...action.metadata
          }
        } as any; // Cast to any for now due to dynamic property differences

      case 'WITHDRAWAL':
        return {
          id: baseId,
          name: action.description || `Dynamic withdrawal from ${sourceEvent.name}`,
          type: StandardEventType.WITHDRAWAL,
          amount: action.amount,
          sourceAccount: action.sourceAccount || action.targetAccount,
          monthOffset: eventMonth,
          priority: action.priority || sourceEvent.priority,
          metadata: {
            generatedBy: sourceEvent.id,
            generatedByType: sourceEvent.type,
            dynamicAction: true,
            originalAction: action,
            ...action.metadata
          }
        } as any; // Temporarily cast as any for withdrawal events

      case 'REBALANCE':
        return {
          id: baseId,
          name: action.description || `Dynamic rebalancing from ${sourceEvent.name}`,
          type: StandardEventType.REBALANCE_PORTFOLIO,
          amount: action.amount,
          sourceAccount: action.sourceAccount,
          targetAccount: action.targetAccount,
          monthOffset: eventMonth,
          priority: action.priority || sourceEvent.priority,
          metadata: {
            generatedBy: sourceEvent.id,
            generatedByType: sourceEvent.type,
            dynamicAction: true,
            originalAction: action,
            ...action.metadata
          }
        } as any; // Temporarily cast as any for rebalance events

      case 'TRANSFER':
        // FIXED: Use sourceAccountType/targetAccountType as required by AccountTransferEvent contract
        return {
          id: baseId,
          name: action.description || `Dynamic transfer from ${sourceEvent.name}`,
          type: StandardEventType.ACCOUNT_TRANSFER,
          amount: action.amount,
          sourceAccountType: action.sourceAccount, // Field name matches AccountTransferEvent contract
          targetAccountType: action.targetAccount, // Field name matches AccountTransferEvent contract
          transferType: action.metadata?.transferType || 'trustee_to_trustee', // Default to safest transfer type
          monthOffset: eventMonth,
          priority: action.priority || sourceEvent.priority,
          metadata: {
            generatedBy: sourceEvent.id,
            generatedByType: sourceEvent.type,
            dynamicAction: true,
            originalAction: action,
            ...action.metadata
          }
        } as any;

      case 'DEBT_PAYMENT':
        // FIXED: Populate targetLiabilityId and paymentType as required by DebtPaymentEvent contract
        return {
          id: baseId,
          name: action.description || `Dynamic debt payment from ${sourceEvent.name}`,
          type: StandardEventType.DEBT_PAYMENT,
          amount: action.amount,
          sourceAccountType: action.sourceAccount || 'cash', // Field name matches DebtPaymentEvent contract
          targetLiabilityId: action.metadata?.targetLiabilityId || action.metadata?.liabilityId || 'unknown', // REQUIRED by contract
          paymentType: action.metadata?.paymentType || 'extra', // REQUIRED by contract (minimum | extra | payoff)
          monthOffset: eventMonth,
          priority: action.priority || sourceEvent.priority,
          frequency: 'one-time' as any,
          metadata: {
            generatedBy: sourceEvent.id,
            generatedByType: sourceEvent.type,
            dynamicAction: true,
            originalAction: action,
            ...action.metadata
          }
        } as any;

      default:
        logger.warn(`⚠️ [DynamicPreprocessor] Unknown action type: ${action.type}`);
        return null;
    }
  }

  /**
   * Log dynamic event evaluation for debugging
   */
  private logEvaluation(
    event: AnyDynamicEvent,
    month: number,
    evaluated: boolean,
    actionsGenerated: number,
    reason: string,
    actions?: EventAction[],
    error?: string
  ) {
    this.evaluationLog.push({
      eventId: event.id,
      eventName: event.name || 'Unknown Event',
      eventType: event.type,
      month,
      evaluated,
      actionsGenerated,
      reason,
      error,
      actions
    });
  }

  /**
   * Get evaluation log for debugging
   */
  getEvaluationLog(): DynamicEventEvaluationLog[] {
    return [...this.evaluationLog];
  }

  /**
   * Clear evaluation log
   */
  clearEvaluationLog(): void {
    this.evaluationLog = [];
  }
}

/**
 * Global preprocessor instance
 */
let globalPreprocessor: DynamicEventPreprocessor | null = null;

/**
 * Get global dynamic event preprocessor
 */
export function getDynamicEventPreprocessor(): DynamicEventPreprocessor {
  if (!globalPreprocessor) {
    globalPreprocessor = new DynamicEventPreprocessor();
  }
  return globalPreprocessor;
}

/**
 * Integration function to be called from simulationOrchestrator
 */
export async function preprocessDynamicEventsForSimulation(
  initialState: InitialStateEvent,
  events: FinancialEvent[],
  simulationStartYear: number,
  maxMonthOffset: number,
  debugMode: boolean = false
): Promise<{
  allEvents: FinancialEvent[];
  dynamicEventLog: DynamicEventEvaluationLog[];
}> {
  const preprocessor = getDynamicEventPreprocessor();
  
  const result = await preprocessor.preprocessDynamicEvents({
    initialState,
    allEvents: events,
    simulationStartYear,
    maxMonthOffset,
    debugMode
  });

  // Combine original events (excluding dynamic events) with generated events
  const staticEvents = events.filter(event => !DynamicEventUtils.isDynamicEvent(event));
  const allEvents = [...staticEvents, ...result.generatedEvents];

  if (debugMode) {
    logger.dataLog(`🔧 [DynamicPreprocessor] Preprocessing summary:`);
    logger.dataLog(`   📊 Original events: ${events.length}`);
    logger.dataLog(`   🧠 Dynamic events: ${result.dynamicEvents.length}`);
    logger.dataLog(`   ⚡ Generated events: ${result.generatedEvents.length}`);
    logger.dataLog(`   📋 Final events: ${allEvents.length}`);
  }

  return {
    allEvents,
    dynamicEventLog: result.evaluationLog
  };
}