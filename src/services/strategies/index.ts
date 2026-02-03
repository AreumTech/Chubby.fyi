import { logger } from '@/utils/logger';

/**
 * Strategy Registry
 * 
 * Registers all available strategies and provides easy access to the strategy engine.
 */

import { strategyEngineService } from '../strategyEngine';
import { DebtPayoffStrategy } from './debtPayoffStrategy';
import { RetirementOptimizationStrategy } from './retirementOptimizationStrategy';
// import { TaxOptimizationStrategy } from './taxOptimizationStrategy'; // Deprecated - split into 3 strategies
// import { EmergencyFundStrategy } from './emergencyFundStrategy';
import { InvestmentStrategy } from './investmentStrategy';
import { CollegePlanningStrategy } from './collegePlanningStrategy';
// New v1 core strategies
import { RetirementWithdrawalStrategy } from './retirementWithdrawalStrategy';
import { AssetAllocationStrategy } from './assetAllocationStrategy';
import { GlidePathStrategy } from './glidePathStrategy';
import { PortfolioRebalancingStrategy } from './portfolioRebalancingStrategy';
import { ContributionOptimizationStrategy } from './contributionOptimizationStrategy';
import { TaxLossHarvestingStrategy } from './taxLossHarvestingStrategy';
import { RothConversionStrategy } from './rothConversionStrategy';
import { TaxWithholdingStrategy } from './taxWithholdingStrategy';
import { SocialSecurityStrategy } from './socialSecurityStrategy';
import { WealthTransferStrategy } from './wealthTransferStrategy';
import { InternationalExpatStrategy } from './internationalExpatStrategy';
import { HomePurchaseStrategy } from './homePurchaseStrategy';

// Initialize all strategies
const initializeStrategies = () => {
  // Register legacy strategies
  strategyEngineService.registerStrategy(new DebtPayoffStrategy());
  // strategyEngineService.registerStrategy(new RetirementOptimizationStrategy()); // Deprecated - use RetirementWithdrawalStrategy
  // strategyEngineService.registerStrategy(new TaxOptimizationStrategy()); // Deprecated - split into 3 strategies
  // strategyEngineService.registerStrategy(new EmergencyFundStrategy());
  strategyEngineService.registerStrategy(new InvestmentStrategy());
  strategyEngineService.registerStrategy(new CollegePlanningStrategy());

  // Register v1 core strategies
  strategyEngineService.registerStrategy(new RetirementWithdrawalStrategy());
  strategyEngineService.registerStrategy(new AssetAllocationStrategy());
  // strategyEngineService.registerStrategy(new GlidePathStrategy()); // Merged into AssetAllocationStrategy
  // strategyEngineService.registerStrategy(new PortfolioRebalancingStrategy()); // Merged into AssetAllocationStrategy
  // strategyEngineService.registerStrategy(new ContributionOptimizationStrategy()); // Coming soon

  // Tax optimization strategies
  strategyEngineService.registerStrategy(new TaxWithholdingStrategy());
  strategyEngineService.registerStrategy(new TaxLossHarvestingStrategy());
  strategyEngineService.registerStrategy(new RothConversionStrategy());

  strategyEngineService.registerStrategy(new SocialSecurityStrategy());
  strategyEngineService.registerStrategy(new WealthTransferStrategy());
  // strategyEngineService.registerStrategy(new InternationalExpatStrategy()); // Coming soon
  strategyEngineService.registerStrategy(new HomePurchaseStrategy());

  logger.debug(`Strategy Registry: Registered ${strategyEngineService.getAllStrategies().length} strategies`, 'COMMAND');
};

// Auto-initialize when module is imported
initializeStrategies();

// Export the configured service
export { strategyEngineService };
export * from '../strategyEngine';
export * from './debtPayoffStrategy';
export * from './retirementOptimizationStrategy';
// export * from './taxOptimizationStrategy'; // Deprecated - split into 3 strategies
// export * from './emergencyFundStrategy';
export * from './investmentStrategy';
export * from './collegePlanningStrategy';
// Export v1 core strategies
export * from './retirementWithdrawalStrategy';
export * from './assetAllocationStrategy';
export * from './glidePathStrategy';
export * from './portfolioRebalancingStrategy';
export * from './contributionOptimizationStrategy';
export * from './taxLossHarvestingStrategy';
export * from './rothConversionStrategy';
export * from './taxWithholdingStrategy';
export * from './socialSecurityStrategy';
export * from './wealthTransferStrategy';
export * from './internationalExpatStrategy';
export * from './homePurchaseStrategy';