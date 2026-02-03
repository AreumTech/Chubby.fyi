import React from 'react';
import { useDataService } from '@/hooks/useDataService';
import type { Alert } from '@/types/api/payload';

interface AlertsSectionProps {
    // No props needed - component will use data service directly
}

export const AlertsSection: React.FC<AlertsSectionProps> = () => {
    const { hasData, getPlanSummary } = useDataService();

    if (!hasData) {
        return <div className="text-xs-areum text-areum-text-secondary">Loading alerts...</div>;
    }

    const summary = getPlanSummary();
    const alerts = summary?.alerts || [];

    if (alerts.length === 0) {
        return null; // Don't render the section if there are no alerts
    }

    return (
        <section className="mb-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 bg-areum-danger-bg text-areum-danger rounded-full flex items-center justify-center text-xs font-bold">!</span>
                <span className="text-sm-areum font-semibold text-areum-text-secondary uppercase tracking-wide">Alerts</span>
            </div>

            <div className="space-y-1.5">
                {alerts.map(alert => (
                    <div key={alert.id} className={`px-3 py-2 rounded-md-areum border ${getAlertStyles(alert.type)}`}>
                        <div className="flex items-start gap-2">
                            <span className="text-sm shrink-0">{getAlertIcon(alert.type)}</span>
                            <div className="flex-1 min-w-0">
                                <span className={`text-sm-areum font-medium ${getAlertTextColor(alert.type)}`}>
                                    {alert.title}
                                </span>
                                <p className={`text-xs-areum mt-0.5 ${getAlertMessageColor(alert.type)}`}>
                                    {alert.message}
                                </p>
                                {alert.year && (
                                    <button className="text-xs-areum font-medium text-areum-accent hover:text-areum-accent/80 mt-1">
                                        View {alert.year} →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

function getAlertStyles(type: Alert['type']): string {
    switch (type) {
        case 'warning':
            return 'bg-areum-warning-bg border-areum-warning/30';
        case 'error':
            return 'bg-areum-danger-bg border-areum-danger/30';
        case 'success':
            return 'bg-areum-success-bg border-areum-success/30';
        case 'info':
            return 'bg-areum-accent/10 border-areum-accent/30';
        default:
            return 'bg-areum-canvas border-areum-border';
    }
}

function getAlertIcon(type: Alert['type']): string {
    switch (type) {
        case 'warning':
            return '⚠️';
        case 'error':
            return '❌';
        case 'success':
            return '✅';
        case 'info':
            return 'ℹ️';
        default:
            return '📋';
    }
}

function getAlertTextColor(type: Alert['type']): string {
    switch (type) {
        case 'warning':
            return 'text-areum-warning';
        case 'error':
            return 'text-areum-danger';
        case 'success':
            return 'text-areum-success';
        case 'info':
            return 'text-areum-accent';
        default:
            return 'text-areum-text-primary';
    }
}

function getAlertMessageColor(type: Alert['type']): string {
    switch (type) {
        case 'warning':
            return 'text-areum-warning/80';
        case 'error':
            return 'text-areum-danger/80';
        case 'success':
            return 'text-areum-success/80';
        case 'info':
            return 'text-areum-accent/80';
        default:
            return 'text-areum-text-secondary';
    }
}

