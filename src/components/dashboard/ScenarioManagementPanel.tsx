import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { IconChevronDown, IconPlus, IconEdit, IconClear } from '@/components/icons';
import type { Scenario } from '@/store/slices/planSlice';

export const ScenarioManagementPanel: React.FC = () => {
    // Use individual selectors for stable references
    const scenarios = useAppStore(state => state.scenarios);
    const activeScenarioId = useAppStore(state => state.activeScenarioId);
    const activeScenario = useAppStore(state => state.scenarios[state.activeScenarioId]);

    // Actions are stable - select once
    const setActiveScenarioId = useAppStore(state => state.setActiveScenarioId);
    const duplicateScenario = useAppStore(state => state.duplicateScenario);
    const deleteScenario = useAppStore(state => state.deleteScenario);
    const renameScenario = useAppStore(state => state.renameScenario);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                setIsRenaming(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus rename input when entering rename mode
    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [isRenaming]);

    const handleDuplicateScenario = (scenarioId: string) => {
        duplicateScenario(scenarioId);
        setIsDropdownOpen(false);
    };

    const handleDeleteScenario = (scenarioId: string) => {
        if (Object.keys(scenarios).length > 1) {
            deleteScenario(scenarioId);
        }
        setIsDropdownOpen(false);
    };

    const handleStartRename = (scenarioId: string, currentName: string) => {
        setIsRenaming(scenarioId);
        setRenameValue(currentName);
    };

    const handleConfirmRename = () => {
        if (isRenaming && renameValue.trim()) {
            renameScenario(isRenaming, renameValue.trim());
        }
        setIsRenaming(null);
        setRenameValue('');
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirmRename();
        else if (e.key === 'Escape') {
            setIsRenaming(null);
            setRenameValue('');
        }
    };

    // Memoize to avoid creating new arrays on every render
    const scenariosList = useMemo(() =>
        Object.values(scenarios).sort((a: Scenario, b: Scenario) =>
            new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        ),
        [scenarios]
    );

    const currentScenarioName = activeScenario?.name || 'Scenario';

    const getScenarioMeta = (scenario: Scenario) => {
        const parts = [];
        if (scenario.eventLedger.length > 0) parts.push(`${scenario.eventLedger.length}e`);
        if (scenario.enhancedGoals?.length > 0) parts.push(`${scenario.enhancedGoals.length}g`);
        return parts.length > 0 ? parts.join('/') : '—';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Compact trigger button */}
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 border border-areum-border rounded-md-areum px-2 py-1 bg-areum-surface hover:bg-areum-canvas transition-colors"
            >
                <span className="text-sm">📋</span>
                <span className="text-sm-areum font-medium text-areum-text-primary max-w-[120px] truncate">
                    {currentScenarioName}
                </span>
                <IconChevronDown className={`w-3 h-3 text-areum-text-tertiary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-areum-surface border border-areum-border rounded-md-areum shadow-lg z-50">
                    <div className="p-2">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-1.5 px-1">
                            <span className="text-xs-areum text-areum-text-tertiary uppercase tracking-wide">
                                Scenarios
                            </span>
                            <button
                                onClick={() => handleDuplicateScenario(activeScenarioId)}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-areum-accent/10 rounded-sm-areum transition-colors"
                            >
                                <IconPlus className="w-3 h-3 text-areum-accent" />
                                <span className="text-xs-areum text-areum-accent font-medium">New</span>
                            </button>
                        </div>

                        {/* Scenario list */}
                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                            {scenariosList.map((scenario) => (
                                <div
                                    key={scenario.id}
                                    className={`group flex items-center justify-between px-2 py-1.5 rounded-sm-areum transition-colors ${
                                        scenario.id === activeScenarioId
                                            ? 'bg-areum-accent/10 border border-areum-accent/30'
                                            : 'hover:bg-areum-canvas'
                                    }`}
                                >
                                    {isRenaming === scenario.id ? (
                                        <input
                                            ref={renameInputRef}
                                            type="text"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onKeyDown={handleRenameKeyDown}
                                            onBlur={handleConfirmRename}
                                            className="flex-1 px-1.5 py-0.5 text-sm-areum border border-areum-accent rounded-sm-areum focus:outline-none"
                                        />
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    if (scenario.id !== activeScenarioId) {
                                                        setActiveScenarioId(scenario.id);
                                                        setIsDropdownOpen(false);
                                                    }
                                                }}
                                                className="flex-1 min-w-0 text-left flex items-center gap-2"
                                            >
                                                <span className="text-sm-areum font-medium text-areum-text-primary truncate">
                                                    {scenario.name}
                                                </span>
                                                <span className="text-xs-areum text-areum-text-tertiary shrink-0">
                                                    {getScenarioMeta(scenario)}
                                                </span>
                                                {scenario.sourcePersona && (
                                                    <span className="text-[10px] px-1 py-0.5 rounded-sm-areum bg-areum-accent/10 text-areum-accent shrink-0">
                                                        P
                                                    </span>
                                                )}
                                            </button>

                                            {/* Actions - always visible for active, hover for others */}
                                            <div className={`flex items-center gap-0.5 ml-1 transition-opacity ${
                                                scenario.id === activeScenarioId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                            }`}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartRename(scenario.id, scenario.name);
                                                    }}
                                                    className="p-1 text-areum-text-tertiary hover:text-areum-text-primary hover:bg-areum-canvas rounded-sm-areum transition-colors"
                                                    title="Rename"
                                                >
                                                    <IconEdit className="w-3 h-3" />
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDuplicateScenario(scenario.id);
                                                    }}
                                                    className="p-1 text-areum-text-tertiary hover:text-areum-accent hover:bg-areum-accent/10 rounded-sm-areum transition-colors"
                                                    title="Duplicate"
                                                >
                                                    <IconPlus className="w-3 h-3" />
                                                </button>

                                                {scenariosList.length > 1 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteScenario(scenario.id);
                                                        }}
                                                        className="p-1 text-areum-text-tertiary hover:text-areum-danger hover:bg-areum-danger-bg rounded-sm-areum transition-colors"
                                                        title="Delete"
                                                    >
                                                        <IconClear className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};