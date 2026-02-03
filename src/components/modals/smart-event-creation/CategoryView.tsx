import React from 'react';
import { EventMetadata } from '@/services/eventDiscoveryService';
import { EventCard } from './EventCard';
import { CATEGORY_METADATA, CategoryKey } from './categoryDefinitions';
import { H2, Body } from '@/components/ui/Typography';

export interface CategoryViewProps {
    selectedCategory: string | null;
    categoryEvents: EventMetadata[];
    onEventSelect: (event: EventMetadata) => void;
}

/**
 * Category browsing view for event creation
 * Shows events filtered by the selected category
 */
export const CategoryView: React.FC<CategoryViewProps> = ({
    selectedCategory,
    categoryEvents,
    onEventSelect
}) => {
    if (!selectedCategory) return null;

    const meta = CATEGORY_METADATA[selectedCategory as CategoryKey];
    if (!meta) return null;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="text-4xl mb-2">{meta.icon}</div>
                <H2 className="mb-2">{meta.label}</H2>
                <Body color="secondary">Choose an event type from this category</Body>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {categoryEvents.map((event, idx) => (
                    <EventCard key={idx} event={event} onClick={() => onEventSelect(event)} />
                ))}
            </div>
        </div>
    );
};