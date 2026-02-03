import React from 'react';
import { EventMetadata } from '@/services/eventDiscoveryService';
import { EventCard } from './EventCard';
import { CATEGORY_METADATA, CategoryKey } from './categoryDefinitions';
import { H2, H3, Body, Label } from '@/components/ui/Typography';

export interface SearchViewProps {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    searchResults: EventMetadata[];
    recommendedEvents: EventMetadata[];
    popularEvents: EventMetadata[];
    onEventSelect: (event: EventMetadata) => void;
    onCategorySelect: (category: string) => void;
}

/**
 * Search and discovery interface for event creation
 * Handles search, categories, recommendations, and popular events
 */
export const SearchView: React.FC<SearchViewProps> = ({
    searchQuery,
    onSearchQueryChange,
    searchResults,
    recommendedEvents,
    popularEvents,
    onEventSelect,
    onCategorySelect
}) => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <H2 className="mb-2">Add Financial Event</H2>
                <Body color="secondary">Search for an event or choose from recommendations</Body>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder="Search events... (e.g., '401k', 'mortgage', 'salary')"
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                />
                <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">Search Results</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {searchResults.map((event, idx) => (
                            <EventCard key={idx} event={event} onClick={() => onEventSelect(event)} />
                        ))}
                    </div>
                </div>
            )}

            {/* Categories */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Browse by Category</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(CATEGORY_METADATA).map(([key, meta]) => (
                        <button
                            key={key}
                            onClick={() => onCategorySelect(key)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-center"
                        >
                            <div className="text-2xl mb-1">{meta.icon}</div>
                            <div className="text-sm font-medium text-gray-700">{meta.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recommended Events */}
            {!searchQuery && recommendedEvents.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">Recommended for You</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {recommendedEvents.map((event, idx) => (
                            <EventCard key={idx} event={event} onClick={() => onEventSelect(event)} />
                        ))}
                    </div>
                </div>
            )}

            {/* Popular Events */}
            {!searchQuery && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">Popular Events</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {popularEvents.map((event, idx) => (
                            <EventCard key={idx} event={event} onClick={() => onEventSelect(event)} compact />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};