import { SimulationPayload, AssetClass, EventType } from '@/types';

// getYearlyData function removed - components now use dataService.getDeepDiveForYear() instead

/**
 * Generates structured cash flow data for charting from simulation results.
 */
export const generateCashFlowData = (simulationPayload: SimulationPayload | null) => {
    if (!simulationPayload?.planProjection.charts.cashFlow?.timeSeries) return [];

    return simulationPayload.planProjection.charts.cashFlow.timeSeries.map(point => ({
        year: point.year,
        income: point.income || 0,
        expenses: Math.abs(point.expenses || 0),
        taxes: point.taxBreakdown?.total || 0,
        netCashFlow: (point.netSavings !== undefined) ? point.netSavings : ((point.income || 0) - Math.abs(point.expenses || 0) - (point.taxBreakdown?.total || 0)),
        federalTaxes: point.taxBreakdown?.federal || (point.taxBreakdown?.total || 0) * 0.75, // Use actual or estimate federal portion
        stateTaxes: point.taxBreakdown?.state || (point.taxBreakdown?.total || 0) * 0.25     // Use actual or estimate state portion
    }));
};

/**
 * Generates structured asset allocation data for charting from simulation results.
 */
export const generateAssetAllocationData = (simulationPayload: SimulationPayload | null) => {
    if (!simulationPayload?.planProjection.charts.assetAllocation?.timeSeries) return [];

    return simulationPayload.planProjection.charts.assetAllocation.timeSeries.map(point => {
        // Use the new breakdown structure
        const breakdown = point.breakdown || {};
        return {
            year: point.year,
            allocation: {
                stocks: (breakdown[AssetClass.US_STOCKS_TOTAL_MARKET]?.percentage || 0) * 100,
                bonds: (breakdown[AssetClass.US_BONDS_TOTAL_MARKET]?.percentage || 0) * 100,
                international: (breakdown[AssetClass.INTERNATIONAL_STOCKS]?.percentage || 0) * 100,
                realEstate: (breakdown[AssetClass.REAL_ESTATE_PRIMARY_HOME]?.percentage || 0) * 100,
                cash: (breakdown[AssetClass.CASH]?.percentage || 0) * 100
            }
        };
    });
};

/**
 * Converts financial events from plan inputs into markers for the chart,
 * handling start/end points and collision-free positioning.
 */
export const getEventMarkers = (simulationPayload: SimulationPayload | null, zoomLevel: number) => {
    if (!simulationPayload?.planInputs.events) return [];

    const startYear = new Date().getFullYear();

    const getEventColor = (eventName: string) => {
        const nameLower = eventName.toLowerCase();
        if (nameLower.includes('income') || nameLower.includes('salary')) return '#10b981';
        if (nameLower.includes('expense') || nameLower.includes('cost')) return '#ef4444';
        if (nameLower.includes('contribution') || nameLower.includes('401k') || nameLower.includes('ira')) return '#3b82f6';
        if (nameLower.includes('rsu') || nameLower.includes('stock') || nameLower.includes('vest')) return '#84cc16';
        if (nameLower.includes('goal') || nameLower.includes('target')) return '#06b6d4';
        if (nameLower.includes('home') || nameLower.includes('house') || nameLower.includes('property')) return '#f59e0b';
        if (nameLower.includes('education') || nameLower.includes('school') || nameLower.includes('college')) return '#8b5cf6';
        return '#6b7280';
    };

    const allMarkers: any[] = [];
    simulationPayload.planInputs.events.forEach(event => {
        const startYearIndex = event.startYear - startYear;
        const endYear = event.endYear !== undefined ? event.endYear : event.startYear;
        const endYearIndex = endYear - startYear;


        if (startYearIndex >= 0 && startYearIndex < zoomLevel) {
            allMarkers.push({
                id: event.id + '_start', eventId: event.id, year: event.startYear, yearIndex: startYearIndex,
                name: event.name, description: event.description, icon: event.icon, color: getEventColor(event.name),
                type: 'start', value: 0, originalEvent: event
            });
        }

        if (event.endYear !== event.startYear && endYearIndex >= 0 && endYearIndex < zoomLevel) {
            allMarkers.push({
                id: event.id + '_end', eventId: event.id, year: event.endYear, yearIndex: endYearIndex,
                name: event.name + ' (End)', description: 'End of ' + event.description, icon: '⏹', color: getEventColor(event.name),
                type: 'end', value: 0, originalEvent: event
            });
        }
    });

    allMarkers.sort((a, b) => a.yearIndex - b.yearIndex);

    const markersByYear = new Map<number, any[]>();
    allMarkers.forEach(marker => {
        if (!markersByYear.has(marker.yearIndex)) markersByYear.set(marker.yearIndex, []);
        markersByYear.get(marker.yearIndex)!.push(marker);
    });

    markersByYear.forEach((markers) => {
        markers.forEach((marker, index) => {
            const totalMarkers = markers.length;
            if (totalMarkers === 1) {
                marker.offsetY = marker.type === 'start' ? -25 : -35;
            } else {
                const baseOffset = -20;
                const stackSpacing = -15;
                marker.offsetY = baseOffset + (index * stackSpacing);
                if (marker.type === 'end') marker.offsetY -= 10;
            }
            marker.offsetX = (index % 2 === 0 ? -1 : 1) * Math.min(index * 3, 15);
        });
    });

    return allMarkers;
};