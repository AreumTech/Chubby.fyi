import React, { useState, useCallback } from 'react';
import { AreumFireDashboard } from '@/features/dashboard/components/AreumFireDashboard';
import { useSimulationOrchestratorCommands } from '@/hooks/useSimulationOrchestratorCommands';
import { useAppStore } from '@/store/appStore';
import { useEmojiAnimation } from '@/hooks/useEmojiAnimation';
import { AppLayout } from '@/components/layout/AppLayout';
import { runDeterministicSimulation } from '@/services/simulationService';
import { logger } from '@/utils/logger';

export const DashboardView: React.FC = () => {
  const { runNewSimulation } = useSimulationOrchestratorCommands();
  const { isOrchestrating: isSimulating, simulationMode } = useAppStore();
  const animatedEmoji = useEmojiAnimation(isSimulating);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDeterministicRunning, setIsDeterministicRunning] = useState(false);

  // Mode-aware simulation runner - runs the appropriate simulation based on current mode
  const handleRunSimulation = useCallback(async () => {
    if (simulationMode === 'deterministic') {
      logger.info('[DashboardView] Running deterministic simulation (mode-aware)');
      setIsDeterministicRunning(true);
      try {
        await runDeterministicSimulation();
      } finally {
        setIsDeterministicRunning(false);
      }
    } else {
      logger.info('[DashboardView] Running Monte Carlo simulation (mode-aware)');
      await runNewSimulation();
    }
  }, [simulationMode, runNewSimulation]);

  const isAnySimulationRunning = isSimulating || isDeterministicRunning;

  return (
    <AppLayout
      onMobileSidebarToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onRunSimulation={handleRunSimulation}
      isSimulating={isAnySimulationRunning}
      animatedEmoji={animatedEmoji}
    >
      <AreumFireDashboard
        onRunSimulation={handleRunSimulation}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
      />
    </AppLayout>
  );
};