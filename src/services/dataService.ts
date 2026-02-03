/**
 * Data Service - Pure Caching Layer
 *
 * ARCHITECTURAL PRINCIPLE: This service is now a "dumb" caching layer that stores
 * and retrieves pre-computed data from the backend SimulationPayload transformer.
 *
 * ALL business logic, calculations, and data transformations have been moved to
 * the WASM backend. This service provides simple, direct access to cached data.
 */

import { logger } from '@/utils/logger';
import { wasmBridge } from './wasmBridge';
import type {
  SimulationPayload,
  ProjectionCharts,
  PlanSummary,
  AnnualDeepDiveSnapshot,
  NetWorthChart,
  CashFlowChart,
  AssetAllocationChart,
  SpreadsheetData,
  DeterministicPayload,
  DeterministicYearData,
  EventTraceEntry
} from '../types/api/payload';
import type { YearlyData, MonthlyData } from '../types/index';
import type { SimulationResults } from '../types/generated/simulation-results';
import type { EnhancedGoal } from '../types/enhanced-goal';
import { calculateLifetimeExpenseModeling, type LifetimeExpenseModelingResult } from '../components/quickstart/steps/expenses-step/lifetimeExpenseModeling';
import { TypedEventEmitter } from '@/utils/eventEmitter';

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by the DataService for reactive UI updates.
 * Use these to subscribe to data changes without monkey-patching.
 */
export interface DataServiceEvents {
  'payload:updated': SimulationPayload;
  'deterministic:updated': DeterministicPayload;
  'cache:cleared': undefined;
}

// Simple cache service for storing pre-computed data
class CacheService {
  private _cache = new Map<string, any>();
  private _cacheStats = { hits: 0, misses: 0 };

  has(key: string): boolean {
    return this._cache.has(key);
  }

  get(key: string): any {
    if (this._cache.has(key)) {
      this._cacheStats.hits++;
      return this._cache.get(key);
    }
    this._cacheStats.misses++;
    return null;
  }

  set(key: string, value: any): void {
    this._cache.set(key, value);
  }

  clear(): void {
    this._cache.clear();
    this._cacheStats = { hits: 0, misses: 0 };
  }

  getStats() {
    return {
      size: this._cache.size,
      hitRate: this._cacheStats.hits / (this._cacheStats.hits + this._cacheStats.misses) || 0,
      ...this._cacheStats
    };
  }
}

/**
 * Pure Data Caching Service
 *
 * This service receives complete, pre-computed SimulationPayload objects from the backend
 * and provides simple getter methods for UI components. No calculations are performed here.
 */
class DataService {
  private _simulationResults: SimulationResults | null = null;
  private _simulationPayload: SimulationPayload | null = null;
  private _deterministicPayload: DeterministicPayload | null = null;
  private _cacheService: CacheService;

  /**
   * Event emitter for reactive updates.
   * Subscribe to events instead of monkey-patching methods.
   */
  public readonly events = new TypedEventEmitter<DataServiceEvents>();

  constructor() {
    this._cacheService = new CacheService();
    logger.dataLog('DataService initialized as pure caching layer');
  }

  // ========================================================================================
  // DATA SETTERS - Receive pre-computed data from backend
  // ========================================================================================

  /**
   * Stores raw simulation results (legacy support)
   */
  setSimulationResults(results: SimulationResults): void {
    this._simulationResults = results;
    this._cacheService.clear();
    logger.dataLog('Raw simulation results cached');
  }

  /**
   * Stores complete SimulationPayload with all pre-computed UI data
   * This is the primary method - payload should contain everything the UI needs
   */
  setSimulationPayload(payload: SimulationPayload): void {
    logger.dataLog('Receiving complete SimulationPayload from backend transformer');

    const previousPayload = this._simulationPayload;
    this._simulationPayload = payload;

    // Clear cache when payload changes
    if (previousPayload !== payload) {
      this._cacheService.clear();
    }

    // Log payload structure for debugging
    const hasAnalysis = !!payload?.planProjection?.analysis?.annualSnapshots;
    const snapshotCount = hasAnalysis ? Object.keys(payload.planProjection.analysis.annualSnapshots).length : 0;

    logger.dataLog(`SimulationPayload cached: ${hasAnalysis ? 'Has' : 'Missing'} analysis data, ${snapshotCount} annual snapshots`);

    // Emit event for reactive UI updates
    this.events.emit('payload:updated', payload);
  }

  /**
   * Stores complete DeterministicPayload with monthly snapshots and event trace
   */
  setDeterministicPayload(payload: DeterministicPayload): void {
    logger.dataLog('Receiving DeterministicPayload from backend');

    this._deterministicPayload = payload;
    this._cacheService.clear();

    const yearCount = payload?.yearlyData?.length || 0;
    const monthCount = payload?.monthlySnapshots?.length || 0;
    const eventCount = payload?.eventTrace?.length || 0;

    logger.dataLog(`DeterministicPayload cached: ${yearCount} years, ${monthCount} months, ${eventCount} events traced`);

    // Emit event for reactive UI updates
    this.events.emit('deterministic:updated', payload);
  }

  /**
   * Check if we have simulation data available
   */
  hasData(): boolean {
    return this._simulationPayload !== null;
  }

  /**
   * Check if we have deterministic data available
   */
  hasDeterministicData(): boolean {
    return this._deterministicPayload !== null;
  }

  /**
   * Clear deterministic payload (call when events change to force re-simulation)
   */
  clearDeterministicPayload(): void {
    if (this._deterministicPayload) {
      this._deterministicPayload = null;
      logger.dataLog('Deterministic payload cleared');
      this.events.emit('deterministic:cleared', undefined);
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this._cacheService.clear();
    logger.dataLog('Cache cleared');

    // Emit event for reactive UI updates
    this.events.emit('cache:cleared', undefined);
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return this._cacheService.getStats();
  }

  // ========================================================================================
  // CHART DATA ACCESS - Direct payload lookups
  // ========================================================================================

  /**
   * Get net worth chart data (pre-computed with percentiles and sample paths)
   */
  getNetWorthChartData(): NetWorthChart | null {
    if (!this._simulationPayload?.planProjection?.charts?.netWorth) {
      logger.dataLog('Net worth chart data not available in payload');
      return null;
    }
    return this._simulationPayload.planProjection.charts.netWorth;
  }

  /**
   * Get cash flow chart data (pre-computed annual projections)
   */
  getCashFlowChartData(): CashFlowChart | null {
    if (!this._simulationPayload?.planProjection?.charts?.cashFlow) {
      logger.dataLog('Cash flow chart data not available in payload');
      return null;
    }
    return this._simulationPayload.planProjection.charts.cashFlow;
  }

  /**
   * Get asset allocation chart data (pre-computed allocation over time)
   */
  getAssetAllocationChartData(): AssetAllocationChart | null {
    if (!this._simulationPayload?.planProjection?.charts?.assetAllocation) {
      logger.dataLog('Asset allocation chart data not available in payload');
      return null;
    }
    return this._simulationPayload.planProjection.charts.assetAllocation;
  }

  // ========================================================================================
  // DETERMINISTIC DATA ACCESS - Single path with detailed tracing
  // ========================================================================================

  /**
   * Get complete deterministic payload
   */
  getDeterministicPayload(): DeterministicPayload | null {
    return this._deterministicPayload;
  }

  /**
   * Get deterministic yearly data (for spreadsheet view)
   */
  getDeterministicYearlyData(): DeterministicYearData[] | null {
    if (!this._deterministicPayload?.yearlyData) {
      return null;
    }
    return this._deterministicPayload.yearlyData;
  }

  /**
   * Get deterministic data for a specific year
   */
  getDeterministicYearData(year: number): DeterministicYearData | null {
    if (!this._deterministicPayload?.yearlyData) {
      return null;
    }
    return this._deterministicPayload.yearlyData.find(y => y.year === year) || null;
  }

  /**
   * Get complete event trace for deterministic simulation
   */
  getEventTrace(): EventTraceEntry[] | null {
    if (!this._deterministicPayload?.eventTrace) {
      return null;
    }
    return this._deterministicPayload.eventTrace;
  }

  /**
   * Get event trace for a specific month
   */
  getEventTraceForMonth(monthOffset: number): EventTraceEntry[] {
    if (!this._deterministicPayload?.eventTrace) {
      return [];
    }
    return this._deterministicPayload.eventTrace.filter(e => e.monthOffset === monthOffset);
  }

  /**
   * Get deterministic assumptions (constant growth rates used)
   */
  getDeterministicAssumptions(): DeterministicPayload['assumptions'] | null {
    if (!this._deterministicPayload?.assumptions) {
      return null;
    }
    return this._deterministicPayload.assumptions;
  }

  // ========================================================================================
  // ANNUAL ANALYSIS ACCESS - Direct snapshot lookups
  // ========================================================================================

  /**
   * Get detailed financial data for a specific year
   * Returns pre-computed annual snapshot with balance sheet and cash flow analysis
   */
  getDeepDiveForYear(year: number): AnnualDeepDiveSnapshot | null {
    if (!this._simulationPayload?.planProjection?.analysis?.annualSnapshots) {
      logger.dataLog(`Deep dive data not available for year ${year}`);
      return null;
    }

    const snapshot = this._simulationPayload.planProjection.analysis.annualSnapshots[year];
    if (!snapshot) {
      logger.dataLog(`No snapshot available for year ${year}`);
      return null;
    }

    return snapshot;
  }

  /**
   * Get basic yearly data (legacy support)
   */
  getBasicYearData(year: number): any | null {
    const snapshot = this.getDeepDiveForYear(year);
    if (!snapshot) return null;

    // ✅ FIX: Updated to match new cash flow structure with detailed breakdowns
    return {
      year,
      netWorth: snapshot.netWorth,
      netWorthChangeYoY: snapshot.netWorthChangeYoY,
      income: snapshot.cashFlow.grossIncome,
      expenses: snapshot.cashFlow.totalExpenses,
      taxes: snapshot.cashFlow.expenseSources?.taxes?.total || 0,  // ✅ Use new nested structure
      divestment: snapshot.cashFlow.incomeSources?.divestmentProceeds || snapshot.divestmentProceeds || 0,  // ✅ Check both locations
      cashFlow: snapshot.cashFlow.netCashFlow
    };
  }

  /**
   * Get available years for analysis
   */
  getAvailableYears(): number[] {
    if (!this._simulationPayload?.planProjection?.analysis?.annualSnapshots) {
      return [];
    }

    return Object.keys(this._simulationPayload.planProjection.analysis.annualSnapshots)
      .map(year => parseInt(year))
      .sort((a, b) => a - b);
  }

  // ========================================================================================
  // SUMMARY DATA ACCESS - Direct payload lookups
  // ========================================================================================

  /**
   * Get plan summary with key metrics (pre-computed)
   */
  getPlanSummary(): PlanSummary | null {
    if (!this._simulationPayload?.planProjection?.summary) {
      logger.dataLog('Plan summary not available in payload');
      return null;
    }
    return this._simulationPayload.planProjection.summary;
  }

  /**
   * Get portfolio statistics (pre-computed)
   */
  getPortfolioStats(): PlanSummary['portfolioStats'] | null {
    const summary = this.getPlanSummary();
    return summary?.portfolioStats || null;
  }

  /**
   * Get plan health score and recommendations (pre-computed)
   */
  getPlanHealth(): PlanSummary['planHealth'] | null {
    const summary = this.getPlanSummary();
    return summary?.planHealth || null;
  }

  /**
   * Get bankruptcy risk data (pre-computed)
   */
  getBankruptcyData(): { probability: number; pathsAffected: number } | null {
    const summary = this.getPlanSummary();
    if (!summary || typeof summary.probabilityOfBankruptcy !== 'number') return null;

    return {
      probability: summary.probabilityOfBankruptcy,
      pathsAffected: Math.round(summary.probabilityOfBankruptcy * 100) // Estimate
    };
  }

  /**
   * Get spreadsheet data with yearly percentiles for export
   */
  getSpreadsheetData(): SpreadsheetData | null {
    if (!this._simulationPayload?.planProjection?.spreadsheet) {
      logger.dataLog('Spreadsheet data not available in payload');
      return null;
    }
    return this._simulationPayload.planProjection.spreadsheet;
  }

  // ========================================================================================
  // GOAL DATA ACCESS - Pre-computed goal outcomes
  // ========================================================================================

  /**
   * Get goal outcomes with achievement analysis (all pre-computed by backend)
   */
  getGoalOutcomes(): any[] {
    const summary = this.getPlanSummary();
    return summary?.goalOutcomes || [];
  }

  /**
   * Get goal progress chart data (pre-computed by backend)
   */
  getGoalProgressChartData(goal: EnhancedGoal): any {
    logger.dataLog('Returning pre-computed goal progress chart data from backend');

    if (!this._simulationPayload?.planProjection?.charts?.goalProgress) {
      logger.warn('No goal progress chart data available in simulation payload');
      return {
        timeSeries: [],
        projectionLines: {
          currentTrend: [],
          requiredTrend: []
        },
        milestones: []
      };
    }

    // Find chart data for this specific goal
    const goalChartData = this._simulationPayload.planProjection.charts.goalProgress.find(
      (chart: any) => chart.goalId === goal.id
    );

    if (!goalChartData) {
      logger.warn(`No chart data found for goal ${goal.id}`);
      return {
        timeSeries: [],
        projectionLines: {
          currentTrend: [],
          requiredTrend: []
        },
        milestones: []
      };
    }

    return goalChartData;
  }

  /**
   * Get goal recommendations (pre-computed strategic actions)
   */
  getGoalRecommendations(): any[] {
    const summary = this.getPlanSummary();
    return summary?.quickActions || [];
  }

  /**
   * Calculate goal form suggestions using wasmBridge
   */
  async calculateGoalFormSuggestions(
    targetAmount: number,
    targetDate: string,
    accountType: string,
    currentAccounts: Array<{ type: string; balance: number; name?: string }>,
    annualExpenses?: number
  ): Promise<{
    monthlyContributionNeeded: number;
    emergencyFundSuggestion?: number;
    isAchievable: boolean;
    timelineWarning?: string;
  }> {
    logger.dataLog('Calculating goal form suggestions using wasmBridge');

    try {
      // Prepare input for WASM function
      const input = {
        targetAmount,
        targetDate,
        accountType,
        currentAccounts,
        annualExpenses: annualExpenses || 0
      };

      // Call via bridge - it handles WASM loading and errors
      const result = await wasmBridge.calculateGoalFormSuggestions(input);

      if (result.success) {
        return {
          monthlyContributionNeeded: result.monthlyContributionNeeded || 0,
          emergencyFundSuggestion: result.emergencyFundSuggestion,
          isAchievable: result.isAchievable || false,
          timelineWarning: result.timelineWarning
        };
      } else {
        logger.error('WASM goal form suggestions calculation failed:', 'WASM', result.error);
        return {
          monthlyContributionNeeded: 0,
          emergencyFundSuggestion: undefined,
          isAchievable: false,
          timelineWarning: `Calculation error: ${result.error}`
        };
      }

    } catch (error) {
      logger.error('Failed to call WASM goal form suggestions:', 'WASM', error);
      return {
        monthlyContributionNeeded: 0,
        emergencyFundSuggestion: undefined,
        isAchievable: false,
        timelineWarning: 'Calculation unavailable'
      };
    }
  }

  // ========================================================================================
  // LEGACY COMPATIBILITY - Event markers and account data
  // ========================================================================================

  /**
   * Legacy method for backward compatibility
   */
  analyzeEnhancedGoalAchievements(goals?: EnhancedGoal[]): any[] {
    logger.dataLog('Returning pre-computed goal achievement analysis from backend (legacy method)');
    return this.getGoalOutcomes();
  }

  /**
   * Get event markers for charts
   */
  getEventMarkers(): any[] {
    if (!this._simulationPayload?.planProjection?.charts?.eventMarkers) {
      return [];
    }
    return this._simulationPayload.planProjection.charts.eventMarkers;
  }

  /**
   * Get enhanced goals from plan inputs
   */
  getEnhancedGoals(): EnhancedGoal[] {
    if (!this._simulationPayload?.planInputs?.goals) {
      return [];
    }
    return this._simulationPayload.planInputs.goals as EnhancedGoal[];
  }

  /**
   * Get financial events from plan inputs
   */
  getEvents(): any[] {
    if (!this._simulationPayload?.planInputs?.events) {
      return [];
    }
    return this._simulationPayload.planInputs.events;
  }

  /**
   * Get account balances from snapshot for specified year
   */
  getAccounts(year?: number): any[] {
    const targetYear = year ?? new Date().getFullYear();
    const snapshot = this.getDeepDiveForYear(targetYear);

    if (!snapshot) return [];

    // Convert balance sheet to account format
    const accounts = [];
    const bs = snapshot.balanceSheet;

    // Cash accounts
    if (bs.cash > 0) {  // ✅ FIX: Use correct field from WASM output
      accounts.push({
        type: 'cash',
        name: 'Cash & Equivalents',
        balance: bs.cash
      });
    }

    // Investment accounts
    if (bs.investmentAccounts.taxableBrokerage > 0) {
      accounts.push({
        type: 'taxable',
        name: 'Taxable Brokerage',
        balance: bs.investmentAccounts.taxableBrokerage
      });
    }

    if (bs.investmentAccounts.account401k > 0) {
      accounts.push({
        type: 'tax_deferred',
        name: '401(k)',
        balance: bs.investmentAccounts.account401k
      });
    }

    if (bs.investmentAccounts.rothIRA > 0) {
      accounts.push({
        type: 'roth',
        name: 'Roth IRA',
        balance: bs.investmentAccounts.rothIRA
      });
    }

    return accounts;
  }

  /**
   * Get account balances as key-value pairs for modal provider
   */
  getAccountBalances(): Record<string, number> {
    const currentYear = new Date().getFullYear();
    const snapshot = this.getDeepDiveForYear(currentYear);

    if (!snapshot) {
      logger.dataLog('No snapshot available for current year account balances');
      return {};
    }

    const bs = snapshot.balanceSheet;
    const balances: Record<string, number> = {};

    // Cash accounts
    if (bs.cash > 0) {  // ✅ FIX: Use correct field from WASM output
      balances.cash = bs.cash;
    }

    // Investment accounts
    if (bs.investmentAccounts.taxableBrokerage > 0) {
      balances.taxable = bs.investmentAccounts.taxableBrokerage;
    }

    if (bs.investmentAccounts.account401k > 0) {
      balances.tax_deferred = bs.investmentAccounts.account401k;
    }

    if (bs.investmentAccounts.rothIRA > 0) {
      balances.roth = bs.investmentAccounts.rothIRA;
    }

    if (bs.investmentAccounts.traditionalIRA > 0) {
      balances.ira = bs.investmentAccounts.traditionalIRA;
    }

    if (bs.investmentAccounts.account529 > 0) {
      balances['529'] = bs.investmentAccounts.account529;
    }

    logger.dataLog(`Retrieved account balances for ${Object.keys(balances).length} account types`);
    return balances;
  }

  // ========================================================================================
  // STRATEGY DATA ACCESS - TODO: Move to backend
  // ========================================================================================

  /**
   * Get strategies from plan data
   * TODO: Backend should provide strategy recommendations
   */
  getStrategies(): any[] {
    if (!this._simulationPayload?.planInputs?.strategies) {
      return [];
    }
    return this._simulationPayload.planInputs.strategies;
  }

  /**
   * Get strategy catalog from simulation payload
   */
  getStrategyCatalog(): any[] {
    // Return real strategies from the simulation payload
    const strategies = this.getStrategies();

    // Group strategies by category for catalog display
    const catalog = new Map<string, any>();

    strategies.forEach((strategy: any) => {
      const category = strategy.category || 'other';

      if (!catalog.has(category)) {
        catalog.set(category, {
          id: category,
          name: this.getCategoryName(category),
          description: this.getCategoryDescription(category),
          icon: this.getCategoryIcon(category),
          difficulty: 'Intermediate',
          strategies: []
        });
      }

      catalog.get(category).strategies.push(strategy);
    });

    return Array.from(catalog.values());
  }

  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'investment': 'Investment Management',
      'tax-optimization': 'Tax Optimization',
      'cash-flow': 'Cash Flow Management',
      'retirement': 'Retirement Planning',
      'other': 'Other Strategies'
    };
    return names[category] || category;
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'investment': 'Strategies for managing your investment portfolio',
      'tax-optimization': 'Strategies to minimize your tax liability',
      'cash-flow': 'Strategies for managing cash and emergency funds',
      'retirement': 'Strategies for retirement income and withdrawals',
      'other': 'Additional financial strategies'
    };
    return descriptions[category] || '';
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'investment': '📈',
      'tax-optimization': '💰',
      'cash-flow': '💵',
      'retirement': '🏖️',
      'other': '📋'
    };
    return icons[category] || '📋';
  }

  /**
   * Get account analysis for specific year
   */
  getAccountAnalysisForYear(year: number): any {
    const snapshot = this.getDeepDiveForYear(year);
    if (!snapshot) return null;

    return {
      year,
      balanceSheet: snapshot.balanceSheet,
      accounts: this.getAccounts() // Use current accounts for now
    };
  }

  /**
   * Get accounts for deep dive analysis for specified year
   */
  getAccountsForDeepDive(year: number): { accounts: any[], enhancedGoals: any[] } {
    return {
      accounts: this.getAccounts(year),
      enhancedGoals: this.getEnhancedGoals()
    };
  }

  // ========================================================================================
  // DATA VALIDATION - Ensure payload completeness
  // ========================================================================================

  /**
   * Validate that the SimulationPayload contains all required data
   */
  validatePayload(): { isValid: boolean; missingData: string[] } {
    const missing: string[] = [];

    if (!this._simulationPayload) {
      return { isValid: false, missingData: ['entire_payload'] };
    }

    const payload = this._simulationPayload;

    // Check summary data
    if (!payload.planProjection?.summary) {
      missing.push('plan_summary');
    }

    // Check chart data
    if (!payload.planProjection?.charts?.netWorth) {
      missing.push('net_worth_chart');
    }

    // Check analysis data
    if (!payload.planProjection?.analysis?.annualSnapshots) {
      missing.push('annual_snapshots');
    }

    // Check input data
    if (!payload.planInputs) {
      missing.push('plan_inputs');
    }

    return {
      isValid: missing.length === 0,
      missingData: missing
    };
  }

  /**
   * Calculate lifetime expense modeling for quickstart wizard
   */
  calculateLifetimeExpenseModeling(
    currentExpenses: number,
    currentAge: number,
    hasChildren: boolean,
    inflationRate?: number
  ): LifetimeExpenseModelingResult {
    logger.dataLog('Calculating lifetime expense modeling for quickstart');
    return calculateLifetimeExpenseModeling(currentExpenses, currentAge, hasChildren, inflationRate);
  }

  /**
   * Calculate quickstart goal analysis for FIRE planning
   */
  calculateQuickstartGoalAnalysis(
    annualExpenses: number,
    retirementExpenses?: number,
    safetyMultiplier?: number,
    currentSavings?: number,
    totalIncome?: number,
    yearsToRetirement?: number
  ): {
    fireTarget: number;
    requiredSavingsRate: number;
    feasibilityLevel: 'achievable' | 'challenging' | 'difficult' | 'unrealistic';
  } {
    logger.dataLog('Calculating quickstart goal analysis for FIRE planning');

    // Use retirement expenses if provided, otherwise use current expenses
    const targetExpenses = retirementExpenses || annualExpenses || 0;
    const multiplier = safetyMultiplier || 25;
    const fireTarget = targetExpenses * multiplier;

    // Calculate required savings rate
    let requiredSavingsRate = 0;
    if (totalIncome && totalIncome > 0 && yearsToRetirement && yearsToRetirement > 0) {
      const currentNet = currentSavings || 0;
      const netNeeded = fireTarget - currentNet;
      const annualSavingsNeeded = netNeeded / yearsToRetirement;
      requiredSavingsRate = (annualSavingsNeeded / totalIncome) * 100;
    }

    // Determine feasibility level
    let feasibilityLevel: 'achievable' | 'challenging' | 'difficult' | 'unrealistic';
    if (requiredSavingsRate <= 20) {
      feasibilityLevel = 'achievable';
    } else if (requiredSavingsRate <= 35) {
      feasibilityLevel = 'challenging';
    } else if (requiredSavingsRate <= 50) {
      feasibilityLevel = 'difficult';
    } else {
      feasibilityLevel = 'unrealistic';
    }

    return {
      fireTarget,
      requiredSavingsRate: Math.max(0, requiredSavingsRate),
      feasibilityLevel
    };
  }
}

// Export singleton instance
export const dataService = new DataService();