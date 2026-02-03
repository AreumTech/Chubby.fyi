import { EventType, EventPriority } from '../../../types';
import { EventMetadata } from '@/services/eventDiscoveryService';
import { generateId } from '../../../utils/formatting';
import { EventFormData } from './eventValidationUtils';

/**
 * Initializes form data based on the selected event type
 * Sets up default values and structure for different event categories
 */
export const initializeFormData = (event: EventMetadata): EventFormData => {
    const baseData = {
        id: generateId(),
        type: event.type as EventType,
        priority: EventPriority.USER_ACTION,
        monthOffset: 0,
        name: ''
    };

    // Initialize based on event type
    switch (event.type) {
        case EventType.INCOME:
            return {
                ...baseData,
                priority: EventPriority.INCOME,
                company: '',
                source: 'Employment',
                amount: 0,
                frequency: 'annually' as const,
                startDateOffset: 0,
                endDateOffset: undefined,
                annualGrowthRate: 0.03,
            };

        case EventType.RECURRING_EXPENSE:
            return {
                ...baseData,
                priority: EventPriority.RECURRING_EXPENSE,
                amount: 0,
                frequency: 'monthly' as const,
                startDateOffset: 0,
                endDateOffset: undefined,
                annualGrowthRate: 0.03,
            };

        case EventType.SCHEDULED_CONTRIBUTION:
            return {
                ...baseData,
                priority: EventPriority.SCHEDULED_CONTRIBUTION,
                amount: 0,
                frequency: 'monthly' as const,
                targetAccountType: 'tax_deferred',
                startDateOffset: 0,
                endDateOffset: undefined,
            };

        case EventType.STRATEGY_POLICY:
            return {
                ...baseData,
                priority: EventPriority.STRATEGY_POLICY,
                strategyId: 'tax-loss-harvesting',
                strategyType: 'TAX_OPTIMIZATION',
                phase: 'maintenance',
                startDateOffset: 0,
                endDateOffset: undefined,
                configuration: {},
                policySummary: '',
                visualizationColor: '#64748b', // slate-500 for maintenance phase
            };

        default:
            return baseData;
    }
};