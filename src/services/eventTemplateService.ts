/**
 * Event Template Service
 *
 * Provides centralized logic for creating financial event templates.
 * This decouples the business logic of event creation from the UI components.
 */

import {
  FinancialEvent,
  EventType,
  AppConfig,
  EventPriority,
  InitialStateEvent,
  FilingStatus,
} from "../types";
import { generateId } from "../utils/formatting";
import { getMonthOffsetFromCalendarYear } from "../utils/financialCalculations";

/**
 * Creates a template for a new financial event based on its type.
 * @param eventType - The type of event to create a template for.
 * @param config - The current application configuration.
 * @returns A partial FinancialEvent object serving as a template.
 */
export const createEventTemplate = (
  eventType: EventType,
  config: AppConfig,
  getEventLedger: () => FinancialEvent[]
): Partial<FinancialEvent> => {
  const baseData = {
    id: generateId(),
    type: eventType,
    name: `New ${eventType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
    priority: EventPriority.USER_ACTION,
  };

  const getBaseSimParams = () => {
    const eventLedger = getEventLedger();
    const initialEventFromLedger = eventLedger.find(
      (e) => e.type === EventType.INITIAL_STATE
    ) as InitialStateEvent | undefined;
    return {
      year: initialEventFromLedger?.startYear || config.simulationStartYear,
      month: initialEventFromLedger?.initialMonth || config.currentMonth,
      age: initialEventFromLedger?.currentAge || config.currentAge,
    };
  };

  const baseParams = getBaseSimParams();

  switch (eventType) {
    case EventType.INCOME:
      return {
        ...baseData,
        startDateOffset: 0,
        endDateOffset:
          getMonthOffsetFromCalendarYear(
            baseParams.year + 20,
            baseParams.month,
            baseParams.year,
            baseParams.month
          ) - 1,
        amount: 60000,
        frequency: "annually",
        annualGrowthRate: config.inflationRate,
        enableYearlyRaises: true, // Default to enabling yearly raises for new income events
        priority: EventPriority.INCOME,
      };
    case EventType.RECURRING_EXPENSE:
      return {
        ...baseData,
        startDateOffset: 0,
        endDateOffset:
          getMonthOffsetFromCalendarYear(
            baseParams.year + 20,
            baseParams.month,
            baseParams.year,
            baseParams.month
          ) - 1,
        amount: 2500,
        frequency: "monthly",
        annualGrowthRate: config.inflationRate,
        priority: EventPriority.RECURRING_EXPENSE,
      };
    case EventType.ONE_TIME_EVENT:
      return {
        ...baseData,
        monthOffset: getMonthOffsetFromCalendarYear(
          baseParams.year + 5,
          baseParams.month,
          baseParams.year,
          baseParams.month
        ),
        amount: 10000,
        priority: EventPriority.ONE_TIME_EVENT,
      };
    case EventType.SCHEDULED_CONTRIBUTION:
      return {
        ...baseData,
        startDateOffset: 0,
        endDateOffset:
          getMonthOffsetFromCalendarYear(
            baseParams.year + 20,
            baseParams.month,
            baseParams.year,
            baseParams.month
          ) - 1,
        amount: 500,
        frequency: "monthly",
        accountType: "401k",
        assetClass: "stocks",
        priority: EventPriority.SCHEDULED_CONTRIBUTION,
      };
    case EventType.ROTH_CONVERSION:
      return {
        ...baseData,
        monthOffset: getMonthOffsetFromCalendarYear(
          baseParams.year + 5,
          baseParams.month,
          baseParams.year,
          baseParams.month
        ),
        amount: 25000,
        sourceAccountType: "401k",
        targetAccountType: "rothIra",
        priority: EventPriority.ROTH_CONVERSION,
      };
    default:
      return baseData;
  }
};
