import React, { useState, useEffect, useMemo } from 'react';
import { EventType } from '@/types';
import { usePlanData } from '@/store/storeManager';
import { transformEventLedgerForSidebar } from '@/utils/sidebarDataTransform';
import { getGoalIcon } from '@/utils/eventIcons';
import { formatCurrencyShort } from '@/utils/formatting';
import { shouldShowQuickstartOption, markQuickstartCompleted } from '@/utils/newUserDetection';
import { EventCard } from './EventCard';
import { logger } from '@/utils/logger';
import { useCommandBus } from '@/hooks/useCommandBus';
import { createCommand } from '@/commands/types';
import { H3, H4, Body, BodyBase, Caption } from '@/components/ui/Typography';
import { ListItem } from '@/components/ui/ListItem';
import { MiniGoalCard } from './MiniGoalCard';

interface DashboardSidebarProps {
    onOpenEventCreation?: () => void;
    onEditEvent?: (eventId: string | null, eventType?: EventType) => void;
    onOpenGoalCreation?: () => void;
    onOpenQuickstart?: () => void;
    onOpenSettings?: () => void;
    onOpenPolicyModal?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ onOpenEventCreation, onEditEvent, onOpenGoalCreation, onOpenQuickstart, onOpenSettings, onOpenPolicyModal }) => {
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const { eventLedger, config, activeScenario } = usePlanData();
    const { dispatch } = useCommandBus();

    // Memoize expensive calculations to prevent re-renders
    const { goals, events, enhancedGoals } = useMemo(() => {
        const enhancedGoals = activeScenario?.enhancedGoals || [];
        
        // Transform raw event ledger data into sidebar format
        // Use dateSettings if available, otherwise fall back to initialState/currentMonth
        const startYear = config?.dateSettings?.simulationStartYear || config?.initialState?.startYear || config?.simulationStartYear;
        const startMonth = config?.dateSettings?.simulationStartMonth || config?.currentMonth || 1;
        const { goals: legacyGoals, events } = transformEventLedgerForSidebar(
            eventLedger || [],
            startYear,
            startMonth
        );

        // Convert Enhanced Goals to sidebar format
        const enhancedGoalsForSidebar = enhancedGoals.map(goal => {
            // Handle both old and new goal structures
            const accountType = goal.targetAccount?.type || (goal as any).accountType || 'taxable';

            return {
                id: goal.id,
                name: goal.name,
                targetYear: goal.targetDate ? new Date(goal.targetDate).getFullYear() : new Date().getFullYear() + 10,
                targetAmount: goal.targetAmount,
                goalPriority: goal.priority as 'HIGH' | 'MEDIUM' | 'LOW',
                sourceAccountCategory: accountType,
                isFlexible: false // Enhanced goals don't have flexibility field
            };
        });

        // Combine legacy goals and enhanced goals (prioritize enhanced goals)
        const goals = enhancedGoalsForSidebar.length > 0 ? enhancedGoalsForSidebar : legacyGoals;
        
        return { goals, events, enhancedGoals };
    }, [eventLedger, config?.initialState?.startYear, activeScenario?.enhancedGoals]);

    // Check if we have any data to show
    const hasGoals = goals && goals.length > 0;
    const hasEvents = events && events.length > 0;
    
    // Also check raw eventLedger as backup
    const hasRawEvents = eventLedger && eventLedger.length > 0;
    
    // Never show empty state - always show full interface
    const isEmpty = false;
    const showQuickstartOption = shouldShowQuickstartOption();

    // Auto-mark as completed if user has events (they've bypassed quickstart)
    useEffect(() => {
        if (hasRawEvents && eventLedger && eventLedger.length >= 2) {
            // logger.debug('[DashboardSidebar] User has events, marking quickstart as completed');
            markQuickstartCompleted();
        }
    }, [hasRawEvents, eventLedger]);

    // Debug logging for goals (moved to useEffect to prevent infinite re-renders)
    useEffect(() => {
        // Debug logging disabled for cleaner console output
    }, [goals, hasGoals, enhancedGoals, activeScenario?.id]);

    const toggleSection = (sectionId: string) => {
        setCollapsedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };

    return (
        <aside className="w-64 md:w-64 w-full p-3 md:border-r border-areum-border bg-areum-surface overflow-y-auto mobile-scroll" style={{height: 'calc(100vh - 48px)'}}>
            {isEmpty ? (
                // Empty State
                <div className="text-center py-6">
                    <div className="text-3xl mb-3">🔥</div>
                    <span className="text-sm-areum font-semibold text-areum-text-primary block mb-2">Start your FIRE journey</span>
                    <span className="text-xs-areum text-areum-text-secondary block mb-4">Create a plan in minutes with quickstart.</span>
                    <div className="space-y-2">
                        <button
                            onClick={onOpenQuickstart}
                            className="w-full bg-areum-accent text-white px-3 py-2 rounded-md-areum text-sm-areum font-medium hover:bg-areum-accent/90 transition-colors"
                        >
                            🔥 Quick Setup
                        </button>
                        <div className="relative my-3">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-areum-border"></div>
                            </div>
                            <div className="relative flex justify-center text-xs-areum">
                                <span className="bg-areum-surface px-2 text-areum-text-tertiary">or manually</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                onClick={onOpenGoalCreation}
                                className="bg-areum-accent text-white px-2 py-1.5 rounded-sm-areum text-xs-areum font-medium hover:bg-areum-accent/90 transition-colors"
                            >
                                + Goal
                            </button>
                            <button
                                onClick={onOpenEventCreation}
                                className="bg-areum-surface border border-areum-border text-areum-text-primary px-2 py-1.5 rounded-sm-areum text-xs-areum font-medium hover:bg-areum-canvas transition-colors"
                            >
                                + Event
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                {/* Quickstart Option for Users Who Dismissed It */}
                {showQuickstartOption && (
                    <div className="bg-areum-accent/10 border border-areum-accent/30 rounded-md-areum p-3 mb-3">
                        <div className="text-center">
                            <div className="text-xl mb-1">💡</div>
                            <span className="text-sm-areum font-medium text-areum-accent block mb-1">Try Quick Setup?</span>
                            <span className="text-xs-areum text-areum-text-secondary block mb-2">Get a complete FIRE plan in minutes.</span>
                            <button
                                onClick={onOpenQuickstart}
                                className="w-full bg-areum-accent text-white px-2 py-1.5 rounded-sm-areum text-xs-areum font-medium hover:bg-areum-accent/90 transition-colors"
                            >
                                🔥 Quick Setup
                            </button>
                        </div>
                    </div>
                )}
                {/* Goals Section */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center cursor-pointer group" onClick={() => toggleSection('goals')}>
                            <span className="text-areum-text-tertiary group-hover:text-areum-text-secondary mr-1.5 text-[10px] w-3">{collapsedSections.has('goals') ? '▶' : '▼'}</span>
                            <span className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-secondary group-hover:text-areum-text-primary">Goals</span>
                        </div>
                        <button onClick={() => onOpenGoalCreation?.()} className="text-areum-accent hover:bg-areum-accent/10 px-1.5 py-0.5 rounded-sm-areum text-xs-areum font-medium transition-colors">+</button>
                    </div>
                    {/* Goals displayed as mini cards */}
                    <div className={`space-y-1.5 ${collapsedSections.has('goals') ? 'hidden' : ''}`}>
                        {goals.length > 0 ? goals.map((goal, index) => (
                            <MiniGoalCard
                                key={goal.id || `goal-${index}`}
                                id={goal.id}
                                name={goal.name}
                                targetAmount={goal.targetAmount}
                                targetYear={goal.targetYear}
                                accountType={goal.sourceAccountCategory}
                                priority={goal.goalPriority}
                                onClick={() => onEditEvent?.(goal.id)}
                            />
                        )) : (
                            <div className="text-center py-3">
                                <span className="text-xs-areum text-areum-text-tertiary">No goals yet</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Timeline Section */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center cursor-pointer group" onClick={() => toggleSection('timeline')}>
                            <span className="text-areum-text-tertiary group-hover:text-areum-text-secondary mr-1.5 text-[10px] w-3">{collapsedSections.has('timeline') ? '▶' : '▼'}</span>
                            <span className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-secondary group-hover:text-areum-text-primary">Events</span>
                        </div>
                        <button onClick={onOpenEventCreation} className="text-areum-accent hover:bg-areum-accent/10 px-1.5 py-0.5 rounded-sm-areum text-xs-areum font-medium transition-colors">+</button>
                    </div>
                    {/* Color Legend for event types */}
                    {!collapsedSections.has('timeline') && (
                        <div className="flex items-center gap-3 mb-1.5 px-1">
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-2.5 bg-areum-success rounded-full"></span>
                                <span className="text-[10px] text-areum-text-tertiary">Income</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-2.5 bg-areum-warning rounded-full"></span>
                                <span className="text-[10px] text-areum-text-tertiary">Expense</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-2.5 bg-areum-accent rounded-full"></span>
                                <span className="text-[10px] text-areum-text-tertiary">Assets</span>
                            </div>
                        </div>
                    )}
                    {/* Events displayed as mini cards */}
                    <div className={`space-y-1.5 ${collapsedSections.has('timeline') ? 'hidden' : ''}`}>
                        {events.length > 0 ? events.map((event) => {
                            // Find the original event from eventLedger to get full data
                            const originalEvent = eventLedger?.find(e => e.id === event.id);
                            if (!originalEvent) return null;
                            
                            return (
                                <EventCard
                                    key={event.id}
                                    event={originalEvent}
                                    startYear={event.startYear}
                                    endYear={event.endYear}
                                    baseYear={config?.initialState?.startYear || new Date().getFullYear()}
                                    onClick={() => onEditEvent?.(event.id)}
                                />
                            );
                        }) : hasRawEvents ? (
                            // Show raw events if transformation didn't work
                            eventLedger?.map((event) => (
                                <div key={event.id} className="flex items-center gap-1.5 px-2 hover:bg-areum-canvas rounded-sm-areum cursor-pointer border-b border-areum-border" onClick={() => onEditEvent?.(event.id)} style={{ height: '28px' }}>
                                    <span className="text-sm shrink-0">📅</span>
                                    <span className="text-sm-areum font-medium text-areum-text-primary truncate">{event.type || 'Event'}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-3">
                                <span className="text-xs-areum text-areum-text-tertiary">No events yet</span>
                            </div>
                        )}
                    </div>
                </div>
                {/* Policies Section - Always-active singleton settings */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center cursor-pointer group" onClick={() => toggleSection('policies')}>
                            <span className="text-areum-text-tertiary group-hover:text-areum-text-secondary mr-1.5 text-[10px] w-3">{collapsedSections.has('policies') ? '▶' : '▼'}</span>
                            <span className="text-xs-areum uppercase tracking-wide font-semibold text-areum-text-secondary group-hover:text-areum-text-primary">Policies</span>
                        </div>
                        <button onClick={() => onOpenPolicyModal?.()} className="text-areum-accent hover:bg-areum-accent/10 px-1.5 py-0.5 rounded-sm-areum text-xs-areum font-medium transition-colors">⚙</button>
                    </div>
                    {/* Policy Settings - Always visible, click to configure */}
                    <div className={`space-y-0.5 ${collapsedSections.has('policies') ? 'hidden' : ''}`}>
                        {/* Withdrawal Order Policy */}
                        <div
                            className="flex items-center gap-1.5 px-2 hover:bg-areum-canvas rounded-sm-areum cursor-pointer"
                            style={{ height: '28px' }}
                            onClick={() => onOpenPolicyModal?.()}
                        >
                            <span className="text-xs-areum text-areum-text-secondary w-24 shrink-0">Withdrawal</span>
                            <span className="text-xs-areum text-areum-text-primary truncate">
                                {activeScenario?.policySettings?.retirementWithdrawal?.withdrawalSequence === 'tax_efficient'
                                    ? 'Tax-efficient'
                                    : activeScenario?.policySettings?.retirementWithdrawal?.withdrawalSequence || 'Tax-efficient'}
                            </span>
                        </div>
                        {/* Cash Reserve Policy */}
                        <div
                            className="flex items-center gap-1.5 px-2 hover:bg-areum-canvas rounded-sm-areum cursor-pointer"
                            style={{ height: '28px' }}
                            onClick={() => onOpenPolicyModal?.()}
                        >
                            <span className="text-xs-areum text-areum-text-secondary w-24 shrink-0">Cash Reserve</span>
                            <span className="text-xs-areum text-areum-text-primary truncate">
                                {activeScenario?.policySettings?.cashManagement?.enabled
                                    ? `${activeScenario?.policySettings?.cashManagement?.targetReserveMonths || 6} months`
                                    : '6 months'}
                            </span>
                        </div>
                        {/* Rebalancing Policy */}
                        <div
                            className="flex items-center gap-1.5 px-2 hover:bg-areum-canvas rounded-sm-areum cursor-pointer"
                            style={{ height: '28px' }}
                            onClick={() => onOpenPolicyModal?.()}
                        >
                            <span className="text-xs-areum text-areum-text-secondary w-24 shrink-0">Rebalancing</span>
                            <span className="text-xs-areum text-areum-text-primary truncate">
                                {activeScenario?.policySettings?.rebalancing?.enabled
                                    ? `${activeScenario?.policySettings?.rebalancing?.frequency || 'annually'}`
                                    : 'Annually'}
                            </span>
                        </div>
                        {/* Asset Allocation Policy */}
                        {activeScenario?.policySettings?.assetAllocation?.enabled && (
                            <div
                                className="flex items-center gap-1.5 px-2 hover:bg-areum-canvas rounded-sm-areum cursor-pointer"
                                style={{ height: '28px' }}
                                onClick={() => onOpenPolicyModal?.()}
                            >
                                <span className="text-xs-areum text-areum-text-secondary w-24 shrink-0">Allocation</span>
                                <span className="text-xs-areum text-areum-text-primary truncate">
                                    {(() => {
                                        const alloc = activeScenario?.policySettings?.assetAllocation?.targetAllocation;
                                        if (!alloc) return 'Not set';
                                        const stocks = Math.round((alloc['stocks'] || alloc['equity'] || 0) * 100);
                                        const bonds = Math.round((alloc['bonds'] || alloc['fixed_income'] || 0) * 100);
                                        return `${stocks}/${bonds}`;
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings - Single button */}
                {onOpenSettings && (
                    <div className="border-t border-areum-border pt-3 mt-3">
                        <button
                            onClick={onOpenSettings}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-sm-areum font-medium text-areum-text-secondary hover:text-areum-text-primary hover:bg-areum-canvas border border-areum-border rounded-sm-areum transition-colors"
                        >
                            <span>⚙️</span>
                            <span>Settings</span>
                        </button>
                    </div>
                )}
            </div>
            )}
        </aside>
    );
};