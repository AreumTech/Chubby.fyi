// Strategy footer utilities for StrategyDeepDiveModal

export const getStrategyButtonText = (strategyId: string): string => {
  const buttonTextMap: Record<string, string> = {
    'investment-strategy': 'Save Investment Strategy',
    'retirement-withdrawal': 'Enable Withdrawal Strategy',
    'contribution-optimization': 'Enable Optimization Strategy',
    'tax-optimization': 'Enable Tax Strategy'
  };

  return buttonTextMap[strategyId] || 'Save Strategy';
};