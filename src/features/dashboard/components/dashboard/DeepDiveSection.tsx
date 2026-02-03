import React, { Suspense } from 'react';
import { useDataService } from '@/hooks/useDataService';
import { formatCurrencyShort } from '@/utils/formatting';
import { Section } from '@/components/ui/Section';

// Lazy load heavy deep dive component
const NetWorthDeepDive = React.lazy(() => import('@/features/deep-dive/components/NetWorthDeepDive'));

interface DeepDiveSectionProps {
    activeYear: number;
    onYearChange: (year: number) => void;
}

export const DeepDiveSection: React.FC<DeepDiveSectionProps> = ({ activeYear, onYearChange }) => {
    const { hasData, getAvailableYears, getDeepDiveForYear } = useDataService();

    if (!hasData) {
        return <div className="text-center py-8 text-areum-text-tertiary">Loading...</div>;
    }

    const availableYears = getAvailableYears().filter(year => year >= new Date().getFullYear());
    const yearData = getDeepDiveForYear(activeYear);

    return (
        <Section number={3} title="DEEP DIVE" className="mb-4" dense>
            {/* Controls row */}
            <div className="flex items-center justify-end gap-3 mb-2">
                {/* Year selector with context */}
                <div className="flex items-center gap-3">
                    {yearData && (
                        <div className="hidden sm:flex items-baseline gap-1.5">
                            <span className="text-sm-areum font-semibold text-areum-text-primary">
                                {formatCurrencyShort(yearData.netWorth)}
                            </span>
                            <span className={`text-xs-areum font-medium ${yearData.netWorthChangeYoY.percent >= 0 ? 'text-areum-success' : 'text-areum-danger'}`}>
                                {yearData.netWorthChangeYoY.percent > 0 ? '+' : ''}{(yearData.netWorthChangeYoY.percent * 100).toFixed(1)}%
                            </span>
                        </div>
                    )}
                    <select
                        value={activeYear}
                        onChange={(e) => onYearChange(Number(e.target.value))}
                        className="border border-areum-border rounded-sm-areum px-2 py-1 text-sm-areum font-medium bg-areum-surface text-areum-text-primary cursor-pointer hover:border-areum-accent focus:outline-none focus:ring-1 focus:ring-areum-accent"
                    >
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
            </div>

            {/* Content area */}
            <div className="border border-areum-border rounded-md-areum overflow-hidden bg-areum-surface">
                <div className="p-4">
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-areum-accent" />
                        </div>
                    }>
                        <NetWorthDeepDive year={activeYear} />
                    </Suspense>
                </div>
            </div>
        </Section>
    );
};