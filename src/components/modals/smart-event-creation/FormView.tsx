import React, { Suspense } from 'react';
import { EventMetadata } from '@/services/eventDiscoveryService';
import { EventType, AppConfig } from '../../../types';
import { getCalendarYearAndMonthFromMonthOffset } from '../../../utils/financialCalculations';
import { EventFormRenderer } from './EventFormRenderer';
import { EventFormData } from './eventValidationUtils';
import { H2, Body, Caption } from '@/components/ui/Typography';

const EventPreview = React.lazy(() => import('@/features/event-timeline/components/previews/EventPreview').then(m => ({ default: m.EventPreview })));

/**
 * Maps event colors to Tailwind background classes.
 * Using a map instead of dynamic class construction ensures
 * Tailwind includes these classes in the production build.
 */
const colorToBgClass: Record<string, string> = {
    green: 'bg-green-600',
    red: 'bg-red-600',
    blue: 'bg-blue-600',
    orange: 'bg-orange-600',
    purple: 'bg-purple-600',
    violet: 'bg-violet-600',
    teal: 'bg-teal-600',
    gray: 'bg-gray-600',
    gold: 'bg-yellow-600',
};

export interface FormViewProps {
    selectedEvent: EventMetadata | null;
    formData: EventFormData;
    errors: string[];
    appConfig: AppConfig;
    startYear: number;
    startMonth: number;
    onFormChange: (field: string, value: any) => void;
    onDateChange: (field: string, year: string, month: string) => void;
}

/**
 * Form view for creating financial events
 * Contains form and preview side by side
 */
export const FormView: React.FC<FormViewProps> = ({
    selectedEvent,
    formData,
    errors,
    appConfig,
    startYear,
    startMonth,
    onFormChange,
    onDateChange
}) => {
    if (!selectedEvent) return null;

    const headerBgClass = colorToBgClass[selectedEvent.color || 'blue'] || 'bg-blue-600';

    return (
        <div className="space-y-6">
            <div className={`${headerBgClass} text-white px-8 py-6 -mx-6 -mt-6 mb-6`}>
                <div className="flex items-center justify-between">
                    <div>
                        <H2 color="inverse" className="mb-1">
                            {selectedEvent.icon} {selectedEvent.label}
                        </H2>
                        <Body color="inverse" className="opacity-90">
                            {selectedEvent.description}
                        </Body>
                    </div>
                </div>
            </div>

            {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <ul className="list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                            <Caption as="li" key={index} color="danger">{error}</Caption>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <EventFormRenderer
                        selectedEvent={selectedEvent}
                        formData={formData}
                        appConfig={appConfig}
                        onFormChange={onFormChange}
                        onDateChange={onDateChange}
                    />
                </div>
                <div className="space-y-6">
                    <Suspense fallback={<Caption color="secondary">Loading preview...</Caption>}>
                        <EventPreview
                            eventType={selectedEvent.type as EventType}
                            formData={formData}
                            categoryEmoji={selectedEvent.icon || '📊'}
                            categoryColor={selectedEvent.color || 'blue'}
                            formatDateFromOffset={(offset?: number) => {
                                if (offset === undefined) return '';

                                // Use the utility function to get proper calendar year and month
                                const result = getCalendarYearAndMonthFromMonthOffset(
                                    startYear,
                                    startMonth,
                                    offset,
                                    appConfig.currentAge
                                );

                                // Create date with proper zero-indexed month for JavaScript Date
                                const date = new Date(result.year, result.monthInYear - 1);
                                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                            }}
                        />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};