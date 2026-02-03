/**
 * Data Loader Service
 *
 * Centralized service for parsing and transforming different data sources into
 * standardized scenario data format. Eliminates duplication between scenario
 * loading handlers.
 */

import { FinancialEvent, EventType, EventPriority, FilingStatus, AssetClass } from '@/types';
import { InitialStateEvent } from '@/types/events/initial-state';
import { EnhancedGoal } from '@/types/enhanced-goal';
import { PersonaProfile } from '@/data/personas';
import { logger } from '@/utils/logger';

/**
 * Standardized output interface for all data loading operations
 */
export interface LoadedScenarioData {
  initialState: InitialStateEvent;
  events: FinancialEvent[];
  goals: EnhancedGoal[];
  metadata: {
    name: string;
    description: string;
    source: string;
  };
}

/**
 * Test case format from testCases.json
 */
interface TestCaseData {
  name: string;
  description: string;
  input: {
    initialAccounts: any;
    events?: FinancialEvent[];
    goals?: any[];
  };
}

/**
 * Legacy goal format used in some data sources
 */
interface LegacyGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  targetMonthOffset: number;
  category: string;
  priority: number;
}

export class DataLoaderService {
  private static instance: DataLoaderService;

  static getInstance(): DataLoaderService {
    if (!DataLoaderService.instance) {
      DataLoaderService.instance = new DataLoaderService();
    }
    return DataLoaderService.instance;
  }

  /**
   * Parse test case data from testCases.json into standardized format
   */
  parseTestCase(testCase: TestCaseData): LoadedScenarioData {
    logger.dataLog(`Parsing test case: ${testCase.name}`);

    // Create initial state from test case
    const initialState: InitialStateEvent = {
      id: 'initial-state',
      type: EventType.INITIAL_STATE,
      priority: EventPriority.USER_ACTION,
      monthOffset: 0,
      name: testCase.name,
      description: testCase.description,
      filingStatus: 'single' as FilingStatus,
      currentAge: 35,
      initialAccounts: testCase.input.initialAccounts
    };

    // Process events (use existing events or empty array)
    const testEvents = testCase.input.events || [];

    // Add INITIAL_STATE as first event in the ledger for UI visibility
    const events = [initialState as any, ...testEvents];

    // Convert legacy goals to enhanced goals
    const goals = this.convertLegacyGoalsToEnhanced(testCase.input.goals || []);

    return {
      initialState,
      events,  // Now includes INITIAL_STATE as first event
      goals,
      metadata: {
        name: testCase.name,
        description: testCase.description,
        source: 'testCase'
      }
    };
  }

  /**
   * Parse persona event manifest into standardized format
   */
  parsePersonaManifest(persona: PersonaProfile): LoadedScenarioData {
    logger.dataLog(`Parsing persona manifest: ${persona.title}`);

    const eventManifest = persona.eventManifest;

    // Convert simple number accounts to proper structure
    const rawAccounts = eventManifest.initialAccounts || eventManifest.config?.initialAccounts || {};
    const initialAccounts = this.convertSimpleAccountsToHoldings(rawAccounts);

    // Create initial state from persona data
    const initialState: InitialStateEvent = {
      id: 'initial-state',
      type: EventType.INITIAL_STATE,
      name: 'Initial State',
      description: `Starting financial position for ${persona.title}`,
      priority: EventPriority.USER_ACTION,
      monthOffset: 0,
      filingStatus: eventManifest.config?.filingStatus || FilingStatus.SINGLE,
      currentAge: eventManifest.config?.currentAge || persona.demographics.age || 30,
      initialCash: eventManifest.initialAccounts?.cash || eventManifest.config?.initialCash || 0,
      initialAccounts,
      startYear: eventManifest.config?.simulationStartYear || new Date().getFullYear(),
      initialMonth: eventManifest.config?.currentMonth || 0,
      numberOfDependents: eventManifest.config?.numberOfDependents || 0
    };

    // Extract events from manifest
    const manifestEvents = eventManifest.events || [];

    // Add INITIAL_STATE as first event in the ledger for UI visibility
    // Note: Simulation still receives it separately, but this ensures it shows in timeline
    const events = [initialState as any, ...manifestEvents];

    // Convert goals to enhanced goals
    const legacyGoals = eventManifest.goals || [];
    const goals = this.convertLegacyGoalsToEnhanced(legacyGoals);

    return {
      initialState,
      events,  // Now includes INITIAL_STATE as first event
      goals,
      metadata: {
        name: persona.title,
        description: `Financial plan based on ${persona.title} persona`,
        source: 'persona'
      }
    };
  }

  /**
   * Parse test case from testCases.json for specific scenario types
   */
  async parseTestCaseFromJson(scenarioType: string): Promise<LoadedScenarioData | null> {
    if (scenarioType === 'debt_bankruptcy') {
      try {
        const testCasesModule = await import('@/data/testCases.json');
        const testCase = testCasesModule.default.testCases.debtBankruptcy;

        if (testCase) {
          logger.dataLog('Loading debt bankruptcy scenario from testCases.json');
          return this.parseTestCase(testCase);
        }
      } catch (error) {
        logger.error('Failed to load debt bankruptcy scenario', error);
      }
    }
    return null;
  }

  /**
   * Generate example scenario data for predefined scenario types
   */
  generateExampleScenario(scenarioType: string, personaName?: string): LoadedScenarioData {
    logger.dataLog(`Generating example scenario: ${scenarioType}`);

    // Base initial state
    let initialState: InitialStateEvent = {
      id: 'initial-state',
      type: EventType.INITIAL_STATE,
      monthOffset: 0,
      name: 'Initial State',
      description: 'Starting financial position',
      priority: EventPriority.USER_ACTION,
      initialCash: 0,
      initialAccounts: {},
      startYear: new Date().getFullYear(),
      initialMonth: 0,
      currentAge: 30,
      filingStatus: FilingStatus.SINGLE,
      numberOfDependents: 0
    };

    let events: FinancialEvent[] = [];
    let goals: EnhancedGoal[] = [];

    switch (scenarioType) {
      case 'tech_professional':
        initialState = {
          ...initialState,
          name: 'Initial State - Tech Professional',
          description: 'Starting financial position for tech professional scenario',
          currentAge: 35,
          initialCash: 50000,
          initialAccounts: {
            cash: 50000,
            taxable: [{
              id: 'tech-taxable-stocks',
              assetClass: AssetClass.US_STOCKS_TOTAL_MARKET,
              assetSymbolOrIdentifier: 'VTSAX',
              quantity: 1000,
              purchasePricePerUnit: 85,
              costBasisTotal: 85000,
              currentMarketPricePerUnit: 100,
              currentMarketValueTotal: 100000,
              unrealizedGainLossTotal: 15000,
              openTransactionDate: new Date(new Date().getFullYear() - 2, 0, 1).toISOString()
            }],
            tax_deferred: [{
              id: 'tech-401k-stocks',
              assetClass: AssetClass.US_STOCKS_TOTAL_MARKET,
              assetSymbolOrIdentifier: 'VTIAX',
              quantity: 750,
              purchasePricePerUnit: 93.33,
              costBasisTotal: 70000,
              currentMarketPricePerUnit: 100,
              currentMarketValueTotal: 75000,
              unrealizedGainLossTotal: 5000,
              openTransactionDate: new Date(new Date().getFullYear() - 3, 0, 1).toISOString()
            }],
            roth: [{
              id: 'tech-roth-stocks',
              assetClass: AssetClass.US_STOCKS_TOTAL_MARKET,
              assetSymbolOrIdentifier: 'VTIAX',
              quantity: 250,
              purchasePricePerUnit: 80,
              costBasisTotal: 20000,
              currentMarketPricePerUnit: 100,
              currentMarketValueTotal: 25000,
              unrealizedGainLossTotal: 5000,
              openTransactionDate: new Date(new Date().getFullYear() - 2, 0, 1).toISOString()
            }]
          }
        };
        break;

      // Add other scenario types as needed
      default:
        logger.warn(`Unknown scenario type: ${scenarioType}, using defaults`);
    }

    // Add INITIAL_STATE as first event in the ledger for UI visibility
    const eventsWithInit = [initialState as any, ...events];

    return {
      initialState,
      events: eventsWithInit,  // Now includes INITIAL_STATE as first event
      goals,
      metadata: {
        name: personaName || `${scenarioType} Scenario`,
        description: `Example scenario for ${scenarioType}`,
        source: 'generated'
      }
    };
  }

  /**
   * Convert legacy goal format to EnhancedGoal format
   * Centralizes the conversion logic used by multiple handlers
   */
  private convertLegacyGoalsToEnhanced(legacyGoals: LegacyGoal[]): EnhancedGoal[] {
    const now = new Date();

    return legacyGoals.map(goal => {
      // Calculate target date from month offset
      const targetDate = goal.targetMonthOffset > 0
        ? new Date(Date.now() + (goal.targetMonthOffset * 30.44 * 24 * 60 * 60 * 1000))
        : undefined;

      // Map legacy category to enhanced goal category
      const categoryMap: Record<string, 'RETIREMENT' | 'EDUCATION' | 'CUSTOM'> = {
        'RETIREMENT': 'RETIREMENT',
        'EDUCATION': 'EDUCATION',
        'MAJOR_PURCHASE': 'CUSTOM',
        'CUSTOM': 'CUSTOM'
      };

      // Map legacy priority (numbers) to enhanced priority (strings)
      const priorityMap: Record<number, 'HIGH' | 'MEDIUM' | 'LOW'> = {
        1: 'HIGH',
        2: 'MEDIUM',
        3: 'LOW'
      };

      const enhancedGoal: EnhancedGoal = {
        id: goal.id,
        name: goal.name,
        description: goal.description || '',
        targetAmount: goal.targetAmount,
        targetDate,
        targetAccount: {
          type: 'taxable' as const, // Default account type for scenario goals
          name: undefined
        },
        category: categoryMap[goal.category] || 'CUSTOM',
        priority: priorityMap[goal.priority] || 'MEDIUM',
        createdAt: now,
        updatedAt: now,
        isActive: true
      };

      return enhancedGoal;
    });
  }

  /**
   * Convert simple account format (numbers) to proper holdings structure
   * Handles persona data that stores accounts as simple totals
   *
   * Note: Returns objects with { totalValue, holdings } structure expected by orchestrator
   */
  private convertSimpleAccountsToHoldings(rawAccounts: any): any {
    const result: any = {};

    // If accounts are already in proper format (arrays or objects with holdings), return as-is
    if (rawAccounts.taxable && (Array.isArray(rawAccounts.taxable) || rawAccounts.taxable.holdings)) {
      return rawAccounts;
    }

    // Convert simple number format to { totalValue, holdings: [] } structure
    // IMPORTANT: Don't create holdings here - let Go's initializeAccountsForQueue
    // create them with the correct market price ($400/share from CreateDefaultMarketPrices)
    // This keeps share price logic in ONE place (Go) and avoids price mismatch bugs

    if (typeof rawAccounts.taxable === 'number' && rawAccounts.taxable > 0) {
      result.taxable = {
        totalValue: rawAccounts.taxable,
        holdings: []  // Let Go create holdings with correct share price
      };
    }

    if (typeof rawAccounts.tax_deferred === 'number' && rawAccounts.tax_deferred > 0) {
      result.tax_deferred = {
        totalValue: rawAccounts.tax_deferred,
        holdings: []  // Let Go create holdings with correct share price
      };
    }

    if (typeof rawAccounts.roth === 'number' && rawAccounts.roth > 0) {
      result.roth = {
        totalValue: rawAccounts.roth,
        holdings: []  // Let Go create holdings with correct share price
      };
    }

    return result;
  }
}

// Export singleton instance
export const dataLoaderService = DataLoaderService.getInstance();