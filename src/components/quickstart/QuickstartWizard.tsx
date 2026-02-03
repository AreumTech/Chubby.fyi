/**
 * QuickstartWizard - FIRE Plan Setup Wizard (Dumb Display Architecture)
 *
 * A progressive multi-step wizard that guides new users through creating
 * a basic FIRE (Financial Independence, Retire Early) plan in 5-10 minutes.
 *
 * ARCHITECTURE PRINCIPLE: Pure UI component that collects inputs and delegates
 * ALL financial plan generation to the backend via generateQuickstartPlan().
 *
 * Features:
 * - Progressive disclosure with clear step progression
 * - Backend-generated plans with complete SimulationPayload
 * - Pure input collection with no client-side calculations
 * - Seamless transition to full application
 * - Mobile-responsive design
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useEventLedgerCommands } from '@/hooks/useEventLedgerCommands';
import { useSimulationOrchestratorCommands } from '@/hooks/useSimulationOrchestratorCommands';
import { useCommandBus } from '@/hooks/useCommandBus';
import { createCommand } from '@/commands/types';
import { AccountCategory } from '@/types';
import { QuickstartInputs, QuickstartResults, generateQuickstartPlan } from '@/services/quickstartService';

// Re-export QuickstartResults for use in other components
export type { QuickstartResults };
import { markQuickstartCompleted, markQuickstartDismissed } from '@/utils/newUserDetection';
import { logger } from '@/utils/logger';
import { WelcomeStep } from './steps/WelcomeStep';
import { IncomeStep } from './steps/IncomeStep';
import { ExpensesStep } from './steps/ExpensesStep';
import { AssetsStepSimplified as AssetsStep } from './steps/AssetsStepSimplified';
import { GoalStep } from './steps/GoalStep';
import { ReviewStep } from './steps/ReviewStep';
import { QuickstartErrorBoundary } from './components/ErrorBoundary';
import { H4, Caption, BodyBase } from '@/components/ui/Typography';

// =============================================================================
// TYPES
// =============================================================================

type WizardStep = 'welcome' | 'expenses' | 'income' | 'assets' | 'goal' | 'review';

interface QuickstartWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (simulationPayload: any) => void; // Receives complete SimulationPayload from backend
  baseYear: number;
  baseMonth: number;
  currentAge: number;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const QuickstartWizard: React.FC<QuickstartWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  baseYear,
  baseMonth,
  currentAge
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [isProcessing, setIsProcessing] = useState(false);
  const [wizardData, setWizardData] = useState<QuickstartInputs>({
    currentAge,
    retirementAge: 65,
    annualSalary: 0,
    annualExpenses: 0,
    safetyMultiplier: 25, // 25x rule default
    inflationRate: 0.03,
    targetAccountTypes: ['investment' as AccountCategory]
  });
  const [results, setResults] = useState<any | null>(null); // Backend SimulationPayload

  // Command hooks
  const { saveEvent } = useEventLedgerCommands();
  const { runNewSimulation } = useSimulationOrchestratorCommands();
  const { dispatch } = useCommandBus();

  // Step definitions with validation - expenses first to establish baseline
  const steps: { key: WizardStep; title: string; isValid: boolean }[] = [
    { key: 'welcome', title: 'Welcome', isValid: true },
    { key: 'expenses', title: 'Expenses', isValid: wizardData.annualExpenses > 0 },
    { key: 'income', title: 'Income', isValid: wizardData.annualSalary > 0 },
    { key: 'assets', title: 'Assets', isValid: true }, // Optional step, always valid
    { key: 'goal', title: 'Goal', isValid: wizardData.retirementAge > wizardData.currentAge },
    { key: 'review', title: 'Review', isValid: true }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const canGoNext = steps[currentStepIndex]?.isValid ?? false;
  const canGoBack = currentStepIndex > 0;

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const updateWizardData = useCallback((updates: Partial<QuickstartInputs>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);


  const handleNext = useCallback(async () => {
    const nextStepIndex = currentStepIndex + 1;
    
    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex].key;
      setCurrentStep(nextStep);
      
      // Scroll to top of modal content
      const modal = document.querySelector('.modal.quickstart-wizard-enhanced');
      const modalBody = document.querySelector('.modal.quickstart-wizard-enhanced .modal-body');
      const backdrop = document.querySelector('.quickstart-wizard-backdrop');
      
      // Try multiple scroll targets to ensure we get the right one
      if (modalBody) modalBody.scrollTop = 0;
      if (modal) modal.scrollTop = 0;
      if (backdrop) backdrop.scrollTop = 0;
      
      // Generate results when reaching review step - use backend plan generation
      if (nextStep === 'review') {
        try {
          setIsProcessing(true);

          // Use pure backend plan generation instead of client-side business logic
          const backendResponse = await generateQuickstartPlan(wizardData);

          if (backendResponse.success && backendResponse.simulationPayload) {
            setResults(backendResponse.simulationPayload);
          } else {
            logger.error('Backend quickstart plan generation failed:', 'QUICKSTART', backendResponse.error);
            // For now, show error state - in production would show fallback UI
            setResults(null);
          }
        } catch (error) {
          logger.error('Error generating quickstart plan from backend', 'QUICKSTART', error);
          setResults(null);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  }, [currentStepIndex, steps, wizardData, baseYear, baseMonth]);

  const handleBack = useCallback(() => {
    if (canGoBack) {
      const prevStepIndex = currentStepIndex - 1;
      setCurrentStep(steps[prevStepIndex].key);
      
      // Scroll to top of modal content
      const modal = document.querySelector('.modal.quickstart-wizard-enhanced');
      const modalBody = document.querySelector('.modal.quickstart-wizard-enhanced .modal-body');
      const backdrop = document.querySelector('.quickstart-wizard-backdrop');
      
      // Try multiple scroll targets to ensure we get the right one
      if (modalBody) modalBody.scrollTop = 0;
      if (modal) modal.scrollTop = 0;
      if (backdrop) backdrop.scrollTop = 0;
    }
  }, [canGoBack, currentStepIndex, steps]);

  const handleComplete = useCallback(async () => {
    if (!results) return;

    try {
      setIsProcessing(true);

      // With backend plan generation, the SimulationPayload contains:
      // - Complete planInputs with events and goals
      // - Pre-computed planProjection with all analysis
      // No need for client-side event or goal creation

      logger.commandLog('Quickstart plan completion - delegating to backend SimulationPayload');

      // Extract events from backend-generated plan (if available)
      const planEvents = results.planInputs?.events || [];

      if (planEvents.length > 0) {
        // Save events from backend plan
        for (const event of planEvents) {
          await saveEvent(event, () => {}); // Don't run simulation for each event
        }
      }

      // Extract and create goals from backend-generated plan
      const planGoals = results.planInputs?.goals || [];

      if (planGoals.length > 0) {
        // Create enhanced goals from backend plan data
        for (const planGoal of planGoals) {
          const enhancedGoal = {
            id: planGoal.id || `goal-${Date.now()}-${Math.random()}`,
            name: planGoal.name || 'Financial Goal',
            description: planGoal.description || 'Generated from quickstart plan',
            targetAmount: planGoal.targetAmount || 0,
            targetDate: planGoal.targetDate ? new Date(planGoal.targetDate) :
              new Date(Date.now() + (5 * 365 * 24 * 60 * 60 * 1000)), // 5 years default
            targetAccount: {
              type: planGoal.category === 'retirement' ? 'tax_deferred' as const : 'cash' as const,
              name: planGoal.category === 'retirement' ? 'Retirement Accounts' : 'Savings'
            },
            category: planGoal.category?.toUpperCase() || 'CUSTOM' as const,
            priority: planGoal.priority || 'MEDIUM' as const,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await dispatch(createCommand.createEnhancedGoal(enhancedGoal));
        }
      }

      // The SimulationPayload from backend already contains all computed data
      // No need to re-run simulation - just use the pre-computed results
      logger.simulationLog('Using pre-computed SimulationPayload from backend - no re-simulation needed');

      // Mark quickstart as completed
      markQuickstartCompleted();

      // Call completion callback with backend results
      onComplete(results);

      // Close wizard
      onClose();
    } catch (error) {
      logger.error('Error completing quickstart setup', 'ERROR', error);
    } finally {
      setIsProcessing(false);
    }
  }, [results, saveEvent, runNewSimulation, dispatch, wizardData, onComplete, onClose]);

  const handleSkipToAdvanced = useCallback(() => {
    // Mark as dismissed when user skips to advanced
    markQuickstartDismissed();
    onClose();
    // Could trigger opening the full event creation modal here
  }, [onClose]);

  const handleCancel = useCallback(() => {
    // Mark as dismissed when user cancels
    markQuickstartDismissed();
    onClose();
  }, [onClose]);

  // Reset wizard when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('welcome');
      setResults(null);
      setWizardData({
        currentAge,
        retirementAge: 65,
        annualSalary: 0,
        annualExpenses: 0,
        safetyMultiplier: 25,
        inflationRate: 0.03,
        targetAccountTypes: ['investment' as AccountCategory]
      });
    }
  }, [isOpen, currentAge]);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderStepIndicator = () => (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl">
      {/* Progress Bar */}
      <div className="mb-3 bg-white/20 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-white transition-all duration-500 ease-out rounded-full"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
      
      {/* Step Labels - Text Only */}
      <div className="flex justify-center items-center mb-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <Caption
                weight="medium"
                className={`whitespace-nowrap ${
                  index === currentStepIndex ? 'text-white' : 'text-white/60'
                }`}
              >
                {step.title}
              </Caption>
              {index < steps.length - 1 && (
                <Caption className="text-white/40">•</Caption>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Current Step Title */}
      <div className="text-center">
        <H4 className="text-white">
          {steps[currentStepIndex].title}
        </H4>
        <Caption className="text-blue-100">
          Step {currentStepIndex + 1} of {steps.length}
        </Caption>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            onSkipToAdvanced={handleSkipToAdvanced}
          />
        );
      
      case 'expenses':
        return (
          <ExpensesStep
            data={wizardData}
            onUpdate={updateWizardData}
          />
        );
      
      case 'income':
        return (
          <IncomeStep
            data={wizardData}
            onUpdate={updateWizardData}
          />
        );
      
      case 'assets':
        return (
          <AssetsStep
            data={wizardData}
            onUpdate={updateWizardData}
          />
        );
      
      case 'goal':
        return (
          <GoalStep
            data={wizardData}
            onUpdate={updateWizardData}
          />
        );
      
      case 'review':
        return (
          <ReviewStep
            data={wizardData}
            results={results}
            isProcessing={isProcessing}
            onComplete={handleComplete}
          />
        );
      
      default:
        return null;
    }
  };

  const renderFooter = () => (
    <>
      <div className="flex gap-3">
        {canGoBack && (
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3"
          >
            Back
          </Button>
        )}
        {currentStep !== 'welcome' && (
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-6 py-3"
          >
            Save & Exit
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {!canGoNext && currentStep !== 'welcome' && currentStep !== 'review' && (
          <div className="flex items-center gap-2">
            <BodyBase className="text-amber-600">Complete this step to continue</BodyBase>
          </div>
        )}
        
        {currentStep !== 'review' ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canGoNext || isProcessing}
            className="flex items-center gap-2 px-8 py-3 min-w-[120px]"
          >
            {currentStep === 'goal' ? 'Review Plan' : 'Continue'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleComplete}
            disabled={isProcessing}
            className="flex items-center gap-2 px-8 py-3 min-w-[120px]"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Processing...
              </>
            ) : (
              'Create Plan'
            )}
          </Button>
        )}
      </div>
    </>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xlarge"
      hideCloseButton={true}
      className="quickstart-wizard-enhanced"
      customClassName="quickstart-wizard-backdrop"
    >
      <QuickstartErrorBoundary>
        <div className="flex flex-col h-[95vh] overflow-hidden relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white hover:text-white/80 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Enhanced Header with Progress - Full Width */}
          {renderStepIndicator()}

          {/* Content Area - No nested containers */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-2xl mx-auto p-6">
              {renderCurrentStep()}
            </div>
          </div>

          {/* Enhanced Footer */}
          <div className="p-6 bg-white border-t border-gray-200">
            <div className="flex justify-between items-center max-w-2xl mx-auto">
              {renderFooter()}
            </div>
          </div>

          {/* Loading Overlay */}
          {isProcessing && (
            <LoadingOverlay isVisible={true} message="Creating your personalized FIRE plan..." />
          )}
        </div>
      </QuickstartErrorBoundary>
    </Modal>
  );
};

// =============================================================================
// ADDITIONAL TYPES FOR EXPORT
// =============================================================================

export type { QuickstartInputs };