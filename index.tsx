
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeCommandBusForApp } from './src/commands/initialize';
import { EnhancedErrorBoundary as ErrorBoundary } from './src/components/EnhancedErrorBoundary';
import './src/services/productionErrorMonitoring'; // Initialize error monitoring
import { initializeGoalMigration } from './src/utils/initializeGoalMigration';
import './src/services/strategies'; // Initialize strategy services
import { logger } from './src/utils/logger';


// Initialize Command Bus and Goal Migration before rendering
async function initializeApp() {
  await initializeCommandBusForApp();
  
  // Run goal migration silently during app startup
  try {
    const migrationResult = await initializeGoalMigration({
      silent: true,
      requireUserConsent: false,
      showProgress: false,
      autoCleanup: false
    });
    
    if (migrationResult.migrationNeeded && migrationResult.success) {
      logger.info(`Goal migration completed: ${migrationResult.migratedGoalsCount} goals upgraded`);
    }
  } catch (error) {
    logger.error('Goal migration failed during app initialization:', error);
    // Continue app startup even if migration fails
  }

  // Run event migration to fix priority validation issues
  try {
    const { useAppStore } = await import('./src/store/appStore');
    const { migrateEvents, eventNeedsMigration } = await import('./src/services/eventMigrationService');

    const store = useAppStore.getState();
    const scenario = store.getActiveScenario();

    if (scenario && scenario.eventLedger.some(eventNeedsMigration)) {
      logger.info('Event migration needed - fixing priority validation issues');
      const migratedEvents = migrateEvents(scenario.eventLedger as any[]);
      store.setEventLedger(migratedEvents);
      logger.info(`Event migration completed: ${scenario.eventLedger.length} events updated`);
    }
  } catch (error) {
    logger.error('Event migration failed during app initialization:', error);
    // Continue app startup even if migration fails
  }

  // Fix corrupted account holdings (repair costBasisPerUnit from costBasisTotal/quantity)
  try {
    const { useAppStore } = await import('./src/store/appStore');

    const store = useAppStore.getState();
    const scenario = store.getActiveScenario();

    if (scenario && scenario.initialState && scenario.initialState.initialAccounts) {
      logger.dataLog('Checking for corrupted account holdings in initialAccounts...');
      const accounts = scenario.initialState.initialAccounts;
      let repairCount = 0;
      let totalHoldings = 0;

      // Check all account types (taxable, tax_deferred, roth, etc.)
      for (const [accountType, accountData] of Object.entries(accounts)) {
        if (Array.isArray(accountData)) {
          accountData.forEach((holding: any, index: number) => {
            totalHoldings++;
            if (holding.quantity > 0 && holding.costBasisTotal > 0) {
              // Calculate the correct cost basis per unit
              const expectedCostBasisPerUnit = holding.costBasisTotal / holding.quantity;

              // WASM expects "costBasisPerUnit" but TypeScript uses "purchasePricePerUnit"
              // We need to ensure both are consistent and correct
              const needsRepair = !holding.costBasisPerUnit ||
                                holding.costBasisPerUnit === 0 ||
                                Math.abs(holding.costBasisPerUnit - expectedCostBasisPerUnit) > 0.01;

              if (needsRepair) {
                const oldValue = holding.costBasisPerUnit || 0;
                logger.dataLog(`Repairing ${accountType}[${index}]: costBasisPerUnit $${oldValue.toFixed(4)} → $${expectedCostBasisPerUnit.toFixed(4)}`);

                // Set BOTH fields to ensure compatibility with WASM and TypeScript
                holding.costBasisPerUnit = expectedCostBasisPerUnit;
                holding.purchasePricePerUnit = expectedCostBasisPerUnit;
                repairCount++;
              }
            }
          });
        }
      }

      if (repairCount > 0) {
        store.setInitialState(scenario.initialState);
        logger.info(`Account holdings repaired: ${repairCount} holdings fixed out of ${totalHoldings} total`);
      } else {
        logger.debug(`No corrupted account holdings found (checked ${totalHoldings} holdings)`);
      }
    } else {
      logger.debug('No account holdings found to check (scenario or initialAccounts missing)');
    }
  } catch (error) {
    logger.error('Account holdings repair failed during app initialization:', error);
    // Continue app startup even if repair fails
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

initializeApp().catch((error) => {
  logger.error('App initialization failed:', error);
});
