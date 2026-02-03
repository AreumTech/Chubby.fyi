/**
 * useDateSettings Hook - Centralized date settings management
 * 
 * This hook provides access to the centralized date settings from the app configuration
 * and provides defaults if the settings haven't been configured yet.
 */

import { useAppStore } from '@/store/appStore';
import { DateSettings } from '@/types';

export const useDateSettings = (): DateSettings => {
  const config = useAppStore(state => state.config);
  
  // If dateSettings is configured in the config, use it
  if (config.dateSettings) {
    return config.dateSettings;
  }
  
  // Otherwise, provide sensible defaults based on current date and existing config
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-indexed for display
  
  return {
    simulationStartYear: config.simulationStartYear || currentYear,
    simulationStartMonth: config.currentMonth || currentMonth,
    simulationHorizonYears: 40, // Default 40-year horizon
    simulationEndYear: (config.simulationStartYear || currentYear) + 40,
  };
};

/**
 * Hook to get just the start date values for forms
 */
export const useStartDate = () => {
  const dateSettings = useDateSettings();
  
  return {
    startYear: dateSettings.simulationStartYear,
    startMonth: dateSettings.simulationStartMonth,
  };
};