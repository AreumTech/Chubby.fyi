/**
 * Strategy Execution Service
 * 
 * Core service for executing financial strategies and converting them into
 * scheduled events that can be simulated by the WASM engine.
 */

import type { 
  StrategyEngine, 
  StrategyExecutionContext, 
  StrategyResult,
  StrategyGeneratedEvent,
  StrategyScheduleConfig
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';
import { generateId } from '../../utils/formatting';

export interface StrategyEventTemplate {
  type: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  schedule: StrategyScheduleConfig;
}

export class StrategyExecutionService {
  /**
   * Executes a strategy and converts it into scheduled events
   */
  async executeStrategy(
    strategy: StrategyEngine,
    context: StrategyExecutionContext,
    userInputs: Record<string, any>
  ): Promise<StrategyResult> {
    try {
      // Validate strategy can be applied
      const applicability = strategy.canApply(context);
      if (!applicability.applicable) {
        throw new Error(`Strategy not applicable: ${applicability.reasons.join(', ')}`);
      }

      // Validate user inputs
      const validation = strategy.validateInputs(userInputs);
      if (!validation.valid) {
        throw new Error(`Invalid inputs: ${Object.values(validation.errors).join(', ')}`);
      }

      // Execute the strategy
      const result = await strategy.execute({
        ...context,
        userInputs
      });

      // Process and schedule the generated events
      const scheduledEvents = await this.processGeneratedEvents(result.generatedEvents);

      return {
        ...result,
        generatedEvents: scheduledEvents
      };
    } catch (error) {
      return {
        success: false,
        strategyId: strategy.id,
        strategyName: strategy.name,
        newPlanName: '',
        generatedEvents: [],
        modifiedEvents: [],
        recommendations: [],
        estimatedImpact: {
          cashFlowImpact: { monthlyChange: 0, annualChange: 0, firstYearTotal: 0 },
          netWorthImpact: { fiveYearProjection: 0, tenYearProjection: 0, retirementImpact: 0 },
          taxImpact: { annualTaxSavings: 0, lifetimeTaxSavings: 0 },
          riskFactors: []
        },
        warnings: [error instanceof Error ? error.message : 'Unknown error occurred'],
        nextSteps: []
      };
    }
  }

  /**
   * Processes generated events and creates proper scheduling
   */
  private async processGeneratedEvents(
    generatedEvents: StrategyGeneratedEvent[]
  ): Promise<StrategyGeneratedEvent[]> {
    const processedEvents: StrategyGeneratedEvent[] = [];

    for (const generatedEvent of generatedEvents) {
      // Extract schedule information from the event if it has it
      const scheduleInfo = this.extractScheduleInfo(generatedEvent.event);
      
      if (scheduleInfo) {
        // Create multiple events based on schedule
        const scheduledEvents = this.createScheduledEvents(generatedEvent, scheduleInfo);
        processedEvents.push(...scheduledEvents);
      } else {
        // Single event
        processedEvents.push(generatedEvent);
      }
    }

    return processedEvents;
  }

  /**
   * Extracts schedule information from an event if present
   */
  private extractScheduleInfo(event: FinancialEvent): StrategyScheduleConfig | null {
    // Check if event has strategy schedule metadata
    const metadata = (event as any).strategySchedule as StrategyScheduleConfig | undefined;
    return metadata || null;
  }

  /**
   * Creates multiple scheduled events based on schedule configuration
   */
  private createScheduledEvents(
    template: StrategyGeneratedEvent,
    schedule: StrategyScheduleConfig
  ): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const dates = this.generateScheduleDates(schedule);

    for (const date of dates) {
      const event = this.createEventInstance(template.event, date);
      events.push({
        ...template,
        event,
        reason: `${template.reason} (scheduled for ${date.toISOString().split('T')[0]})`
      });
    }

    return events;
  }

  /**
   * Generates all dates for a schedule configuration
   */
  private generateScheduleDates(schedule: StrategyScheduleConfig): Date[] {
    const dates: Date[] = [];
    const startDate = new Date(schedule.startDate);
    const endDate = schedule.endDate ? new Date(schedule.endDate) : new Date(startDate.getFullYear() + 30, 11, 31);

    switch (schedule.frequency) {
      case 'one_time':
        dates.push(startDate);
        break;
      
      case 'monthly':
        this.generateRecurringDates(dates, startDate, endDate, 1, 'months');
        break;
      
      case 'quarterly':
        this.generateRecurringDates(dates, startDate, endDate, 3, 'months');
        break;
      
      case 'annually':
        this.generateRecurringDates(dates, startDate, endDate, 1, 'years');
        break;
      
      case 'custom':
        if (schedule.customSchedule) {
          if (schedule.customSchedule.dates.length > 0) {
            dates.push(...schedule.customSchedule.dates);
          } else if (schedule.customSchedule.recurrence) {
            const recurrence = schedule.customSchedule.recurrence;
            this.generateRecurringDates(
              dates, 
              startDate, 
              recurrence.until || endDate, 
              recurrence.interval, 
              recurrence.unit
            );
          }
        }
        break;
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Generates recurring dates based on interval and unit
   */
  private generateRecurringDates(
    dates: Date[],
    startDate: Date,
    endDate: Date,
    interval: number,
    unit: 'days' | 'weeks' | 'months' | 'years'
  ): void {
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      
      switch (unit) {
        case 'days':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        case 'weeks':
          currentDate.setDate(currentDate.getDate() + (interval * 7));
          break;
        case 'months':
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
        case 'years':
          currentDate.setFullYear(currentDate.getFullYear() + interval);
          break;
      }
    }
  }

  /**
   * Creates a new event instance for a specific date
   */
  private createEventInstance(template: FinancialEvent, date: Date): FinancialEvent {
    // Calculate month offset from current date
    const currentDate = new Date();
    const monthOffset = this.calculateMonthOffset(currentDate, date);

    return {
      ...template,
      id: generateId(),
      monthOffset,
      // Remove strategy schedule metadata from the actual event
      strategySchedule: undefined
    } as FinancialEvent;
  }

  /**
   * Calculates month offset between two dates
   */
  private calculateMonthOffset(fromDate: Date, toDate: Date): number {
    const yearDiff = toDate.getFullYear() - fromDate.getFullYear();
    const monthDiff = toDate.getMonth() - fromDate.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  /**
   * Validates strategy event templates before execution
   */
  validateEventTemplates(templates: StrategyEventTemplate[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const template of templates) {
      // Validate schedule
      if (!template.schedule.startDate) {
        errors.push(`Template ${template.name}: startDate is required`);
      }

      if (template.schedule.frequency === 'custom' && !template.schedule.customSchedule) {
        errors.push(`Template ${template.name}: customSchedule required for custom frequency`);
      }

      // Validate parameters
      if (!template.type) {
        errors.push(`Template ${template.name}: event type is required`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const strategyExecutionService = new StrategyExecutionService();