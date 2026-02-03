import React, { useState, useEffect, useRef } from 'react';
import { EventType, SimulationMode } from '@/types';
// Removed getYearlyData import - now using data service
import { useAppStore } from '@/store/appStore';
import { useCommandBus } from '@/hooks/useCommandBus';
import { createCommand } from '@/commands/types';
import { dataService } from '@/services/dataService';
import { runDeterministicSimulation } from '@/services/simulationService';
import { useEnhancedGoalCommands } from '@/hooks/useEnhancedGoalCommands';
import { logger } from '@/utils/logger';
import { Heading, H2, H3, Body } from '@/components/ui/Typography';

// Import all the new components
import { DashboardSidebar } from './dashboard/DashboardSidebar';
import { GoalAnalysisSection } from './dashboard/GoalAnalysisSection';
import { ProjectionChartSection } from './dashboard/ProjectionChartSection';
import { DeepDiveSection } from './dashboard/DeepDiveSection';
import { SpreadsheetSection } from './dashboard/SpreadsheetSection';
import { BankruptcyRiskWidget } from '@/components/dashboard/BankruptcyRiskWidget';
import { DeterministicView } from '@/features/deterministic';

interface AreumFireDashboardProps {
  onRunSimulation?: () => void;
  className?: string;
  isMobileSidebarOpen?: boolean;
  setIsMobileSidebarOpen?: (isOpen: boolean) => void;
}

export const AreumFireDashboard: React.FC<AreumFireDashboardProps> = ({
  onRunSimulation,
  className = "",
  isMobileSidebarOpen: externalMobileSidebarOpen,
  setIsMobileSidebarOpen: externalSetMobileSidebarOpen
}) => {
  // Get state and actions from separated stores
  const { simulationPayload: _simulationPayload } = useAppStore();
  const {
    isOrchestrating: isSimulating,
    selectedDeepDiveCalendarYear: parentSelectedYear,
    simulationMode,
    setSimulationMode
  } = useAppStore();
  const { dispatch } = useCommandBus();
  const { openEnhancedGoalEditModal } = useEnhancedGoalCommands();

  // Scenario state removed - now handled by ScenarioManagementPanel

  // Mobile sidebar state - use external state if provided, otherwise internal
  const [internalMobileSidebarOpen, setInternalMobileSidebarOpen] = useState(false);
  const isMobileSidebarOpen = externalMobileSidebarOpen ?? internalMobileSidebarOpen;
  const setIsMobileSidebarOpen = externalSetMobileSidebarOpen ?? setInternalMobileSidebarOpen;
  const sidebarBackdropRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Command-based modal actions
  const onParentYearSelect = async (year: number) => {
    try {
      await dispatch(createCommand.setDeepDiveYear(year));
    } catch (error) {
      logger.error('Failed to set deep dive year:', error);
    }
  };
  
  const onOpenEventCreation = async () => {
    try {
      await dispatch(createCommand.openModal('event_creation'));
    } catch (error) {
      logger.error('Failed to open event creation modal:', error);
    }
  };
  
  const onOpenGoalCreation = async () => {
    try {
      await dispatch(createCommand.openModal('goal_creation'));
    } catch (error) {
      logger.error('Failed to open goal creation modal:', error);
    }
  };

  const onOpenQuickstart = async () => {
    try {
      await dispatch(createCommand.openModal('quickstart'));
    } catch (error) {
      logger.error('Failed to open quickstart modal:', error);
    }
  };
  
  const onOpenPolicyModal = async () => {
    try {
      await dispatch(createCommand.openModal('strategy'));
    } catch (error) {
      logger.error('Failed to open policy modal:', error);
    }
  };


  // Scenario dropdown effects removed - now handled by ScenarioManagementPanel

  // Handle mobile sidebar backdrop clicks, escape key, and swipe gestures
  useEffect(() => {
    const handleBackdropClick = (event: MouseEvent) => {
      if (sidebarBackdropRef.current && event.target === sidebarBackdropRef.current) {
        setIsMobileSidebarOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };

    // Touch gesture handling for swipe-to-close
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (!sidebarRef.current?.contains(e.target as Node)) return;
      startX = e.touches[0].clientX;
      isDragging = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const deltaX = currentX - startX;
      
      // Only allow leftward swipes (closing the sidebar)
      if (deltaX < 0 && sidebarRef.current) {
        const translateX = Math.max(deltaX, -320); // Limit to sidebar width
        sidebarRef.current.style.transform = `translateX(${translateX}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      const deltaX = currentX - startX;
      if (sidebarRef.current) {
        // If swiped more than 50px left, close the sidebar
        if (deltaX < -50) {
          setIsMobileSidebarOpen(false);
        } else {
          // Snap back to open position
          sidebarRef.current.style.transform = 'translateX(0)';
        }
      }
    };

    if (isMobileSidebarOpen) {
      document.addEventListener('mousedown', handleBackdropClick);
      document.addEventListener('keydown', handleEscapeKey);
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
      // Prevent background scrolling when sidebar is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleBackdropClick);
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  // Scenario handlers removed - now handled by ScenarioManagementPanel

  // Settings modal handler
  const handleOpenSettings = async () => {
    try {
      await dispatch(createCommand.openModal('applicationSettings'));
    } catch (error) {
      logger.error('Failed to open settings modal:', error);
    }
  };

  // Create new scenario handler removed - now handled by ScenarioManagementPanel
  
  const onEditEvent = async (eventId: string | null, eventType?: EventType) => {
    logger.debug('[onEditEvent] Called with eventId:', eventId, 'eventType:', eventType);
    try {
      if (eventId) {
        // First check if it's an Enhanced Goal
        const activeScenario = useAppStore.getState().getActiveScenario();
        logger.debug('[onEditEvent] Active scenario:', activeScenario);
        const enhancedGoal = activeScenario?.enhancedGoals?.find(g => g.id === eventId);
        logger.debug('[onEditEvent] Enhanced goal check:', enhancedGoal);
        if (enhancedGoal) {
          logger.debug('[onEditEvent] Opening enhanced goal modal');
          await openEnhancedGoalEditModal(enhancedGoal);
          return;
        }
        
        // Then check if it's a legacy goal or regular event
        const eventLedger = useAppStore.getState().getEventLedger();
        logger.debug('[onEditEvent] Event ledger:', eventLedger.length, 'events');
        const event = eventLedger.find(e => e.id === eventId);
        logger.debug('[onEditEvent] Found event:', event);
        
        if (event) {
          // Check if it's a goal event
          if (event.type === 'GOAL_DEFINE') {
            logger.debug('[onEditEvent] Opening goal edit modal');
            await dispatch(createCommand.openModal('goal_edit', event));
            return;
          }
          
          // Regular event
          logger.debug('[onEditEvent] Opening event edit modal');
          await dispatch(createCommand.openModal('event_edit', event));
        } else {
          logger.warn('[onEditEvent] Event not found with ID:', eventId);
        }
      } else {
        // Open modal for creating new event
        await dispatch(createCommand.openModal('event_edit'));
      }
    } catch (error) {
      logger.error('[onEditEvent] Failed to open edit modal:', error);
      logger.error('[onEditEvent] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    }
  };
  const getFirstAvailableYear = () => {
    if (!dataService.hasData()) return new Date().getFullYear();
    const availableYears = dataService.getAvailableYears().filter(year => year >= new Date().getFullYear());
    return availableYears.length > 0 ? availableYears[0] : new Date().getFullYear();
  };

  const [activeYear, setActiveYear] = useState(parentSelectedYear || getFirstAvailableYear());

  useEffect(() => {
    if (dataService.hasData()) {
      const firstYear = getFirstAvailableYear();
      if (!dataService.getDeepDiveForYear(activeYear)) {
        setActiveYear(firstYear);
      }
    }
  }, [dataService.hasData()]);

  useEffect(() => {
    if (parentSelectedYear && parentSelectedYear !== activeYear) {
      setActiveYear(parentSelectedYear);
    }
  }, [parentSelectedYear]);

  const handleYearChange = (year: number) => {
    setActiveYear(year);
    if (onParentYearSelect) {
      onParentYearSelect(year);
    }
  };

  const hasData = dataService.hasData();
  const [isRunningDeterministic, setIsRunningDeterministic] = useState(false);
  const [deterministicKey, setDeterministicKey] = useState(0);

  // Handle mode switch with auto-trigger for deterministic
  const handleModeChange = async (mode: 'monteCarlo' | 'deterministic') => {
    setSimulationMode(mode);

    if (mode === 'deterministic') {
      // Always run fresh deterministic simulation to ensure data is in sync with events
      // Clear any stale data first
      dataService.clearDeterministicPayload();
      setIsRunningDeterministic(true);
      try {
        await runDeterministicSimulation();
        logger.info('Deterministic simulation completed');
        setDeterministicKey(k => k + 1); // Force re-render of DeterministicView
      } catch (error) {
        logger.error('Failed to run deterministic simulation:', error);
      } finally {
        setIsRunningDeterministic(false);
      }
    }
  };

  // Scenario variables removed - now handled by ScenarioManagementPanel


  // No longer need to destructure simulationPayload since we're using data service

  return (
    <div className={`pathfinder-dashboard ${className} h-full`}>
      {/* Main Content - Full height now that header is in AppLayout */}
      <div className="flex h-full">          {/* Desktop Sidebar - always visible on md+ screens */}
          <div className="hidden md:block">
            <DashboardSidebar
              onOpenEventCreation={onOpenEventCreation}
              onEditEvent={onEditEvent}
              onOpenGoalCreation={onOpenGoalCreation}
              onOpenQuickstart={onOpenQuickstart}
              onOpenSettings={handleOpenSettings}
              onOpenPolicyModal={onOpenPolicyModal}
            />
          </div>

          {/* Mobile Sidebar - overlay with backdrop */}
          {isMobileSidebarOpen && (
            <div
              ref={sidebarBackdropRef}
              className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity duration-300"
            >
              <div
                ref={sidebarRef}
                className="fixed top-0 left-0 h-full w-80 max-w-[80vw] bg-white shadow-xl transform transition-transform duration-300 ease-out swipeable mobile-scroll"
                style={{ top: '73px' }} // Account for header height
              >
                <DashboardSidebar
                  onOpenEventCreation={() => {
                    onOpenEventCreation();
                    setIsMobileSidebarOpen(false);
                  }}
                  onEditEvent={(eventId, eventType) => {
                    onEditEvent(eventId, eventType);
                    setIsMobileSidebarOpen(false);
                  }}
                  onOpenGoalCreation={() => {
                    onOpenGoalCreation();
                    setIsMobileSidebarOpen(false);
                  }}
                  onOpenQuickstart={() => {
                    onOpenQuickstart();
                    setIsMobileSidebarOpen(false);
                  }}
                  onOpenSettings={() => {
                    handleOpenSettings();
                    setIsMobileSidebarOpen(false);
                  }}
                  onOpenPolicyModal={() => {
                    onOpenPolicyModal();
                    setIsMobileSidebarOpen(false);
                  }}
                />
              </div>
            </div>
          )}
          <main className="flex-1 p-3 md:p-5 overflow-y-auto bg-areum-canvas">

            {hasData ? (
              <>
                {/* Simulation Mode Toggle - Underline Tabs */}
                <div className="mb-6">
                  <div className="flex items-center gap-1 border-b border-areum-border">
                    <button
                      onClick={() => handleModeChange('monteCarlo')}
                      disabled={isRunningDeterministic}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm-areum font-medium transition-all border-b-2 -mb-px ${
                        simulationMode === 'monteCarlo'
                          ? 'border-areum-accent text-areum-accent'
                          : 'border-transparent text-areum-text-secondary hover:text-areum-text-primary hover:border-areum-border'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Probabilistic
                    </button>
                    <button
                      onClick={() => handleModeChange('deterministic')}
                      disabled={isRunningDeterministic}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm-areum font-medium transition-all border-b-2 -mb-px ${
                        simulationMode === 'deterministic'
                          ? 'border-areum-accent text-areum-accent'
                          : 'border-transparent text-areum-text-secondary hover:text-areum-text-primary hover:border-areum-border'
                      }`}
                    >
                      {isRunningDeterministic ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      )}
                      Deterministic
                    </button>
                  </div>
                  <p className="mt-2 text-xs-areum text-areum-text-tertiary">
                    {simulationMode === 'monteCarlo'
                      ? '1,000+ simulations showing the range of possible outcomes based on historical market volatility.'
                      : 'Single projection with fixed returns (~10% stocks, ~4% bonds) showing exact month-by-month cash flows.'}
                  </p>
                </div>

                {simulationMode === 'monteCarlo' ? (
                  <>
                    <GoalAnalysisSection />

                    <BankruptcyRiskWidget className="mb-4" />

                    <ProjectionChartSection
                      onYearSelect={handleYearChange}
                      clickedYear={activeYear}
                    />

                    <DeepDiveSection
                      activeYear={activeYear}
                      onYearChange={handleYearChange}
                    />

                    <SpreadsheetSection
                      activeYear={activeYear}
                      onYearChange={handleYearChange}
                    />
                  </>
                ) : isRunningDeterministic ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-areum-accent mx-auto mb-3"></div>
                      <p className="text-areum-text-secondary text-sm-areum">Running deterministic simulation...</p>
                    </div>
                  </div>
                ) : (
                  <DeterministicView key={deterministicKey} />
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">📊</div>
                <span className="text-md-areum font-semibold text-areum-text-primary block mb-1">Run simulation to see your projection</span>
                <span className="text-sm-areum text-areum-text-secondary block mb-4">Add goals and events, then run a simulation.</span>
                <button onClick={onRunSimulation} disabled={isSimulating} className={`px-4 py-2 rounded-md-areum text-sm-areum font-medium transition-colors flex items-center gap-2 mx-auto ${isSimulating ? 'bg-areum-border text-areum-text-tertiary cursor-not-allowed' : 'bg-areum-accent text-white hover:bg-areum-accent/90'}`}>
                  <span>🔮</span><span>Run Simulation</span>
                </button>
              </div>
            )}

          </main>
        </div>
    </div>
  );
};

export default AreumFireDashboard;