import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui';
import { Button } from '../ui';
import { FinancialEvent, EventType, AppConfig } from '../../types';
import { useStartDate } from '../../hooks/useDateSettings';
import {
    searchEvents,
    getRecommendedEvents,
    getEventsByCategory,
    getPopularEvents,
    EventMetadata
} from '@/services/eventDiscoveryService';
import { showInfo } from '@/utils/notifications';

// Extracted components
import { SearchView } from './smart-event-creation/SearchView';
import { CategoryView } from './smart-event-creation/CategoryView';
import { FormView } from './smart-event-creation/FormView';
import { validateEventForm, EventFormData } from './smart-event-creation/eventValidationUtils';
import { initializeFormData } from './smart-event-creation/formInitializationUtils';

interface SmartEventCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: FinancialEvent) => void;
    appConfig: AppConfig;
    eventLedger: FinancialEvent[];
    getMonthOffsetFromCalendarYear: (year: number, month: number, baseYear: number, baseMonth: number) => number;
}

type ViewMode = 'search' | 'category' | 'form';

export const SmartEventCreationModal: React.FC<SmartEventCreationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    appConfig,
    eventLedger,
    getMonthOffsetFromCalendarYear
}) => {
    // Date settings
    const { startYear, startMonth } = useStartDate();

    const [viewMode, setViewMode] = useState<ViewMode>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<EventMetadata | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [formData, setFormData] = useState<EventFormData>({});
    const [errors, setErrors] = useState<string[]>([]);

    // User context
    const userContext = useMemo(() => {
        const hasIncome = eventLedger.some(e => e.type === EventType.INCOME);
        const hasExpenses = eventLedger.some(e =>
            e.type === EventType.RECURRING_EXPENSE ||
            e.type === EventType.ONE_TIME_EVENT
        );
        const hasInvestments = eventLedger.some(e =>
            e.type === EventType.SCHEDULED_CONTRIBUTION
        );
        const hasDebt = eventLedger.some(e =>
            e.type === EventType.LIABILITY_ADD ||
            e.type === EventType.LIABILITY_PAYMENT
        );

        return {
            hasIncome,
            hasExpenses,
            hasInvestments,
            hasDebt,
            age: appConfig.currentAge
        };
    }, [eventLedger, appConfig.currentAge]);

    // Search
    const searchResults = useMemo(() => {
        if (searchQuery.length > 0) {
            return searchEvents(searchQuery);
        }
        return [];
    }, [searchQuery]);

    // Recommended
    const recommendedEvents = useMemo(() => {
        return getRecommendedEvents(userContext);
    }, [userContext]);

    // Popular
    const popularEvents = useMemo(() => {
        return getPopularEvents();
    }, []);

    // Category
    const categoryEvents = useMemo(() => {
        if (selectedCategory) {
            return getEventsByCategory(selectedCategory as any);
        }
        return [];
    }, [selectedCategory]);

    // Reset state
    useEffect(() => {
        if (isOpen) {
            setViewMode('search');
            setSearchQuery('');
            setSelectedEvent(null);
            setSelectedCategory(null);
            setFormData({});
            setErrors([]);
        }
    }, [isOpen]);

    const handleEventSelect = (event: EventMetadata) => {
        if (event.comingSoon) {
            showInfo(
                'Coming Soon',
                `${event.label} is under development and will be available in a future update.`
            );
            return;
        }

        if (!event.formAvailable) {
            showInfo(
                'Form Not Available',
                `The form for ${event.label} is not yet available.`
            );
            return;
        }

        setSelectedEvent(event);
        const initialData = initializeFormData(event);
        setFormData(initialData);
        setViewMode('form');
    };

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setViewMode('category');
    };

    const handleFormChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (errors.length > 0) {
            setErrors([]);
        }
    };

    const handleDateChange = (field: string, year: string, month: string) => {
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);

        if (!isNaN(yearNum) && !isNaN(monthNum)) {
            const offset = getMonthOffsetFromCalendarYear(
                yearNum,
                monthNum,
                appConfig.simulationStartYear,
                appConfig.currentMonth
            );
            handleFormChange(field, offset);
        }
    };

    const validateForm = (): boolean => {
        const newErrors = validateEventForm(formData, selectedEvent);
        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) {
            return;
        }

        const event = formData as FinancialEvent;
        onSave(event);
        onClose();
    };

    const handleBack = () => {
        if (viewMode === 'form') {
            setViewMode('search');
            setSelectedEvent(null);
        } else if (viewMode === 'category') {
            setViewMode('search');
            setSelectedCategory(null);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            bodyClassName="px-6 py-6"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                        {viewMode !== 'search' && (
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                ← Back
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        {viewMode === 'form' && selectedEvent?.formAvailable && (
                            <Button variant="primary" onClick={handleSave}>
                                Create Event
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            {viewMode === 'search' && (
                <SearchView
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    searchResults={searchResults}
                    recommendedEvents={recommendedEvents}
                    popularEvents={popularEvents}
                    onEventSelect={handleEventSelect}
                    onCategorySelect={handleCategorySelect}
                />
            )}
            {viewMode === 'category' && (
                <CategoryView
                    selectedCategory={selectedCategory}
                    categoryEvents={categoryEvents}
                    onEventSelect={handleEventSelect}
                />
            )}
            {viewMode === 'form' && (
                <FormView
                    selectedEvent={selectedEvent}
                    formData={formData}
                    errors={errors}
                    appConfig={appConfig}
                    startYear={startYear}
                    startMonth={startMonth}
                    onFormChange={handleFormChange}
                    onDateChange={handleDateChange}
                />
            )}
        </Modal>
    );
};