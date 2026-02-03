import React from 'react';
import { EventMetadata } from '@/services/eventDiscoveryService';
import { H4, Label, BodyBase, Caption } from '@/components/ui/Typography';

export interface EventCardProps {
    event: EventMetadata;
    onClick: () => void;
    compact?: boolean;
}

/**
 * Reusable event card component for displaying event options
 * Shows event icon, label, description, and status badges
 */
export const EventCard: React.FC<EventCardProps> = ({ event, onClick, compact = false }) => {
    const isComingSoon = event.comingSoon;

    return (
        <button
            onClick={onClick}
            disabled={isComingSoon}
            className={`
                w-full text-left p-4 border rounded-lg transition-all
                ${isComingSoon
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer'
                }
                ${compact ? 'p-3' : 'p-4'}
            `}
        >
            <div className="flex items-start space-x-3">
                <div className={`text-2xl ${compact ? 'text-xl' : ''}`}>
                    {event.icon || '📊'}
                </div>
                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        {compact ? (
                            <Label color="primary">
                                {event.label}
                            </Label>
                        ) : (
                            <H4>
                                {event.label}
                            </H4>
                        )}
                        {isComingSoon && (
                            <span className="bg-gray-200 px-2 py-0.5 rounded-full">
                                <Caption color="secondary">Coming Soon</Caption>
                            </span>
                        )}
                        {event.isDynamic && (
                            <span className="bg-teal-100 px-2 py-0.5 rounded-full">
                                <Caption className="text-teal-700">Smart</Caption>
                            </span>
                        )}
                    </div>
                    {compact ? (
                        <Caption color="secondary" className="mt-1">
                            {event.description}
                        </Caption>
                    ) : (
                        <BodyBase color="secondary" className="mt-1">
                            {event.description}
                        </BodyBase>
                    )}
                    {!compact && event.examples && event.examples.length > 0 && (
                        <Caption color="tertiary" className="mt-2">
                            e.g., {event.examples[0]}
                        </Caption>
                    )}
                </div>
            </div>
        </button>
    );
};