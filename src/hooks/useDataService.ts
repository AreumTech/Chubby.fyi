import { useState, useEffect, useCallback } from 'react';
import { dataService } from '@/services/dataService';

/**
 * React hook to provide reactive access to the pure data caching service
 * This hook will force re-renders when simulation data changes
 *
 * ARCHITECTURAL PRINCIPLE: This hook provides access to pre-computed backend data only.
 * No business logic or calculations are performed here.
 *
 * Uses proper event subscription instead of monkey-patching for reactivity.
 */
export const useDataService = () => {
  const [hasData, setHasData] = useState(dataService.hasData());
  const [cacheVersion, setCacheVersion] = useState(0);

  useEffect(() => {
    // Subscribe to payload updates via event emitter (replaces monkey-patching)
    const unsubscribePayload = dataService.events.on('payload:updated', () => {
      setHasData(true);
      setCacheVersion(prev => prev + 1);
    });

    // Subscribe to cache clear events
    const unsubscribeCacheClear = dataService.events.on('cache:cleared', () => {
      setCacheVersion(prev => prev + 1);
    });

    // Initial sync with current state
    setHasData(dataService.hasData());

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribePayload();
      unsubscribeCacheClear();
    };
  }, []);

  // Memoize data access functions to prevent unnecessary re-renders
  const getNetWorthChartData = useCallback(
    () => hasData ? dataService.getNetWorthChartData() : null,
    [hasData, cacheVersion]
  );

  const getCashFlowChartData = useCallback(
    () => hasData ? dataService.getCashFlowChartData() : null,
    [hasData, cacheVersion]
  );

  const getAssetAllocationChartData = useCallback(
    () => hasData ? dataService.getAssetAllocationChartData() : null,
    [hasData, cacheVersion]
  );

  const getEventMarkers = useCallback(
    () => hasData ? dataService.getEventMarkers() : [],
    [hasData, cacheVersion]
  );

  const getBasicYearData = useCallback(
    (year: number) => hasData ? dataService.getBasicYearData(year) : null,
    [hasData, cacheVersion]
  );

  const getDeepDiveForYear = useCallback(
    (year: number) => hasData ? dataService.getDeepDiveForYear(year) : null,
    [hasData, cacheVersion]
  );

  const getGoalOutcomes = useCallback(
    () => hasData ? dataService.getGoalOutcomes() : [],
    [hasData, cacheVersion]
  );

  const getPortfolioStats = useCallback(
    () => hasData ? dataService.getPortfolioStats() : null,
    [hasData, cacheVersion]
  );

  const getPlanHealth = useCallback(
    () => hasData ? dataService.getPlanHealth() : null,
    [hasData, cacheVersion]
  );

  const getPlanSummary = useCallback(
    () => hasData ? dataService.getPlanSummary() : null,
    [hasData, cacheVersion]
  );

  const getEnhancedGoals = useCallback(
    () => hasData ? dataService.getEnhancedGoals() : [],
    [hasData, cacheVersion]
  );

  const getEvents = useCallback(
    () => hasData ? dataService.getEvents() : [],
    [hasData, cacheVersion]
  );

  const getStrategies = useCallback(
    () => hasData ? dataService.getStrategies() : [],
    [hasData, cacheVersion]
  );

  const getAccounts = useCallback(
    (year?: number) => hasData ? dataService.getAccounts(year) : [],
    [hasData, cacheVersion]
  );

  const getAvailableYears = useCallback(
    () => hasData ? dataService.getAvailableYears() : [],
    [hasData, cacheVersion]
  );

  const getGoalRecommendations = useCallback(
    () => hasData ? dataService.getGoalRecommendations() : [],
    [hasData, cacheVersion]
  );

  const analyzeEnhancedGoalAchievements = useCallback(
    (goals?: any[]) => hasData ? dataService.analyzeEnhancedGoalAchievements(goals) : [],
    [hasData, cacheVersion]
  );

  const getGoalProgressChartData = useCallback(
    (goal: any) => hasData ? dataService.getGoalProgressChartData(goal) : null,
    [hasData, cacheVersion]
  );

  const getBankruptcyData = useCallback(
    () => hasData ? dataService.getBankruptcyData() : null,
    [hasData, cacheVersion]
  );

  const getSpreadsheetData = useCallback(
    () => hasData ? dataService.getSpreadsheetData() : null,
    [hasData, cacheVersion]
  );

  return {
    hasData,
    cacheVersion,

    // Pure data access methods - all return pre-computed backend data
    getNetWorthChartData,
    getCashFlowChartData,
    getAssetAllocationChartData,
    getEventMarkers,
    getBasicYearData,
    getDeepDiveForYear,
    getGoalOutcomes,
    getPortfolioStats,
    getPlanHealth,
    getPlanSummary,
    getEnhancedGoals,
    getEvents,
    getStrategies,
    getAccounts,
    getAvailableYears,
    getGoalRecommendations,

    // Legacy method name kept for compatibility - now returns pre-computed data
    analyzeEnhancedGoalAchievements,

    // New methods for form calculations (moved from client-side business logic)
    getGoalProgressChartData,
    calculateQuickstartGoalAnalysis: (
      annualExpenses: number,
      retirementExpenses?: number,
      safetyMultiplier?: number,
      currentSavings?: number,
      totalIncome?: number,
      yearsToRetirement?: number
    ) => dataService.calculateQuickstartGoalAnalysis(
      annualExpenses,
      retirementExpenses,
      safetyMultiplier,
      currentSavings,
      totalIncome,
      yearsToRetirement
    ),
    calculateLifetimeExpenseModeling: (
      currentExpenses: number,
      currentAge: number,
      hasChildren: boolean,
      inflationRate?: number
    ) => dataService.calculateLifetimeExpenseModeling(currentExpenses, currentAge, hasChildren, inflationRate),
    calculateGoalFormSuggestions: (
      targetAmount: number,
      targetDate: string,
      accountType: string,
      currentAccounts: any[],
      annualExpenses?: number
    ) => dataService.calculateGoalFormSuggestions(targetAmount, targetDate, accountType, currentAccounts, annualExpenses),

    getBankruptcyData,
    getSpreadsheetData,
    getCacheStats: () => dataService.getCacheStats(),

    // Centralized data access
    getStrategyCatalog: () => dataService.getStrategyCatalog(),
    getAccountAnalysisForYear: (year: number) => dataService.getAccountAnalysisForYear(year),
    getAccountsForDeepDive: (year: number) => dataService.getAccountsForDeepDive(year),

    // Data validation
    validatePayload: () => dataService.validatePayload()
  };
};
