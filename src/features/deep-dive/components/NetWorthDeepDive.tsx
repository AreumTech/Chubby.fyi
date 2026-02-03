import React, { useEffect, useRef, useState } from 'react';
import { AssetClass } from '@/types';
import { formatCurrencyShort } from '@/utils/formatting';
import { useDataService } from '@/hooks/useDataService';

interface NetWorthDeepDiveProps {
    year: number;
}

// Hook to detect year changes and trigger animation
function useYearChangeAnimation(year: number) {
    const prevYearRef = useRef(year);
    const [animationKey, setAnimationKey] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (prevYearRef.current !== year) {
            prevYearRef.current = year;
            setAnimationKey(k => k + 1);
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 800);
            return () => clearTimeout(timer);
        }
    }, [year]);

    return { animationKey, isAnimating };
}

// Animated value wrapper
const AnimatedValue: React.FC<{
    children: React.ReactNode;
    animationKey: number;
    variant?: 'neutral' | 'up' | 'down';
    className?: string;
}> = ({ children, animationKey, variant = 'neutral', className = '' }) => {
    const animClass = variant === 'up' ? 'animate-highlight-up' :
                      variant === 'down' ? 'animate-highlight-down' :
                      'animate-highlight';

    return (
        <span key={animationKey} className={`rounded-sm-areum px-1 -mx-1 ${animClass} ${className}`}>
            {children}
        </span>
    );
};

// Clean row item
const Row: React.FC<{
    label: string;
    value: number;
    indent?: boolean;
    animationKey?: number;
}> = ({ label, value, indent = false, animationKey }) => (
    <div className={`flex justify-between items-center py-1.5 ${indent ? 'pl-4' : ''}`}>
        <span className="text-sm-areum text-areum-text-secondary">{label}</span>
        <span className="text-sm-areum font-mono text-areum-text-secondary">
            {animationKey !== undefined ? (
                <AnimatedValue animationKey={animationKey}>{formatCurrencyShort(value)}</AnimatedValue>
            ) : (
                formatCurrencyShort(value)
            )}
        </span>
    </div>
);

// Section with label and items
const Section: React.FC<{
    label: string;
    total: number;
    children?: React.ReactNode;
    animationKey?: number;
}> = ({ label, total, children, animationKey }) => (
    <div className="py-2 border-b border-areum-border last:border-b-0">
        <div className="flex justify-between items-center">
            <span className="text-sm-areum font-medium text-areum-text-primary">{label}</span>
            <span className="text-sm-areum font-semibold font-mono text-areum-text-primary">
                {animationKey !== undefined ? (
                    <AnimatedValue animationKey={animationKey}>{formatCurrencyShort(total)}</AnimatedValue>
                ) : (
                    formatCurrencyShort(total)
                )}
            </span>
        </div>
        {children && <div className="mt-1">{children}</div>}
    </div>
);

const NetWorthDeepDive: React.FC<NetWorthDeepDiveProps> = ({ year }) => {
    const { getDeepDiveForYear } = useDataService();
    const yearlyData = getDeepDiveForYear(year);
    const { animationKey } = useYearChangeAnimation(year);

    if (!yearlyData || !yearlyData.balanceSheet) {
        return (
            <div className="text-center py-8">
                <p className="text-sm-areum text-areum-text-tertiary">No data available for {year}</p>
            </div>
        );
    }

    const { balanceSheet, netWorth, netWorthChangeYoY } = yearlyData;
    const {
        totalAssets = 0,
        totalLiabilities = 0,
        investmentAccounts,
        cash = 0,
        investmentAllocation = []
    } = balanceSheet;

    // Investment account values with defaults
    const totalInvestmentAccounts = investmentAccounts?.total || 0;
    const taxableBrokerage = investmentAccounts?.taxableBrokerage || 0;
    const account401k = investmentAccounts?.account401k || 0;
    const rothIRA = investmentAccounts?.rothIRA || 0;

    // Calculated metrics
    const totalLiquid = cash + taxableBrokerage;
    const totalRetirement = account401k + rothIRA;

    // Determine highlight variant based on YoY change
    const yoyVariant = netWorthChangeYoY?.percent >= 0 ? 'up' : 'down';

    return (
        <div className="space-y-4">
            {/* Hero: Net Worth */}
            <div className="flex flex-wrap items-end justify-between gap-4 pb-3 border-b border-areum-border">
                <div>
                    <div className="text-xs-areum text-areum-text-tertiary uppercase tracking-wide mb-1">
                        Net Worth
                    </div>
                    <div className="flex items-baseline gap-2">
                        <AnimatedValue animationKey={animationKey} variant={yoyVariant} className="text-2xl font-semibold font-mono text-areum-text-primary">
                            {formatCurrencyShort(netWorth || 0)}
                        </AnimatedValue>
                        {netWorthChangeYoY?.percent !== undefined && (
                            <AnimatedValue animationKey={animationKey} variant={yoyVariant}>
                                <span className={`text-sm-areum font-medium ${netWorthChangeYoY.percent >= 0 ? 'text-areum-success' : 'text-areum-danger'}`}>
                                    {netWorthChangeYoY.percent >= 0 ? '+' : ''}{(netWorthChangeYoY.percent * 100).toFixed(1)}%
                                </span>
                            </AnimatedValue>
                        )}
                    </div>
                </div>
                <div className="flex gap-6 text-right">
                    <div>
                        <div className="text-xs-areum text-areum-text-tertiary">Liquid</div>
                        <div className="text-sm-areum font-semibold font-mono text-areum-text-primary">
                            <AnimatedValue animationKey={animationKey}>{formatCurrencyShort(totalLiquid)}</AnimatedValue>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs-areum text-areum-text-tertiary">Retirement</div>
                        <div className="text-sm-areum font-semibold font-mono text-areum-text-primary">
                            <AnimatedValue animationKey={animationKey}>{formatCurrencyShort(totalRetirement)}</AnimatedValue>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance Sheet */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Assets */}
                <div>
                    <div className="text-xs-areum font-semibold text-areum-success uppercase tracking-wide mb-2">
                        Assets
                    </div>
                    <div className="bg-areum-surface rounded-md-areum border border-areum-border px-4">
                        {totalInvestmentAccounts > 0 && (
                            <Section label="Investment Accounts" total={totalInvestmentAccounts} animationKey={animationKey}>
                                {taxableBrokerage > 0 && <Row label="Taxable Brokerage" value={taxableBrokerage} indent animationKey={animationKey} />}
                                {account401k > 0 && <Row label="401(k)" value={account401k} indent animationKey={animationKey} />}
                                {rothIRA > 0 && <Row label="Roth IRA" value={rothIRA} indent animationKey={animationKey} />}
                            </Section>
                        )}
                        <Section label="Cash & Equivalents" total={cash} animationKey={animationKey} />
                    </div>
                    <div className="flex justify-between items-center mt-3 px-4">
                        <span className="text-sm-areum font-semibold text-areum-text-primary">Total Assets</span>
                        <span className="text-md-areum font-bold font-mono text-areum-text-primary">
                            <AnimatedValue animationKey={animationKey}>{formatCurrencyShort(totalAssets)}</AnimatedValue>
                        </span>
                    </div>
                </div>

                {/* Liabilities */}
                <div>
                    <div className="text-xs-areum font-semibold text-areum-danger uppercase tracking-wide mb-2">
                        Liabilities
                    </div>
                    <div className="bg-areum-surface rounded-md-areum border border-areum-border px-4">
                        <Section label="Total Debt" total={totalLiabilities} animationKey={animationKey} />
                        {totalLiabilities === 0 && (
                            <div className="pb-2 text-xs-areum text-areum-text-tertiary">No outstanding debt</div>
                        )}
                    </div>
                    <div className="flex justify-between items-center mt-3 px-4">
                        <span className="text-sm-areum font-semibold text-areum-text-primary">Total Liabilities</span>
                        <span className="text-md-areum font-bold font-mono text-areum-text-secondary">
                            <AnimatedValue animationKey={animationKey}>{formatCurrencyShort(totalLiabilities)}</AnimatedValue>
                        </span>
                    </div>

                    {/* Net Worth Summary */}
                    <div className="mt-4 p-4 bg-areum-canvas border border-areum-border rounded-md-areum">
                        <div className="flex justify-between items-center">
                            <span className="text-sm-areum font-semibold text-areum-text-primary">Net Worth</span>
                            <span className="text-md-areum font-bold font-mono text-areum-accent">
                                <AnimatedValue animationKey={animationKey} variant={yoyVariant}>{formatCurrencyShort(netWorth)}</AnimatedValue>
                            </span>
                        </div>
                        <div className="text-xs-areum text-areum-text-tertiary mt-1">
                            Assets − Liabilities = Net Worth
                        </div>
                    </div>
                </div>
            </div>

            {/* Portfolio Allocation */}
            {investmentAllocation && investmentAllocation.length > 0 && (
                <div className="pt-3 border-t border-areum-border">
                    <div className="text-xs-areum font-semibold text-areum-text-secondary uppercase tracking-wide mb-3">
                        Portfolio Allocation
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {investmentAllocation.slice(0, 5).map((alloc) => {
                            const assetNames: Record<string, string> = {
                                [AssetClass.US_STOCKS_TOTAL_MARKET]: 'US Stocks',
                                [AssetClass.US_BONDS_TOTAL_MARKET]: 'US Bonds',
                                [AssetClass.INTERNATIONAL_STOCKS]: 'Intl Stocks',
                                [AssetClass.CASH]: 'Cash'
                            };
                            const color = alloc.assetClass.includes('STOCK') ? '#3b82f6' :
                                         alloc.assetClass.includes('BOND') ? '#10b981' : '#9ca3af';

                            return (
                                <div key={alloc.assetClass} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                                    <span className="text-sm-areum font-semibold text-areum-text-primary">
                                        <AnimatedValue animationKey={animationKey}>
                                            {(alloc.percentage || 0).toFixed(0)}%
                                        </AnimatedValue>
                                    </span>
                                    <span className="text-xs-areum text-areum-text-tertiary">
                                        {assetNames[alloc.assetClass] || alloc.assetClass.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetWorthDeepDive;
