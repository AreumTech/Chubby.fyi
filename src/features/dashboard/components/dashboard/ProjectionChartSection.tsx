import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AssetClass } from '@/types';
import { useDataService } from '@/hooks/useDataService';
import { formatCurrencyShort } from '@/utils/formatting';
import { getEventColor } from '@/utils/eventIcons';
import { Heading, Text } from '@/components/ui/Typography';
import { Section } from '@/components/ui/Section';
import { TabGroup, Tab } from '@/components/ui/TabGroup';

interface ProjectionChartSectionProps {
    onYearSelect: (year: number) => void;
    clickedYear: number | null;
}

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

export const ProjectionChartSection: React.FC<ProjectionChartSectionProps> = ({
    onYearSelect,
    clickedYear
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeChartType, setActiveChartType] = useState<'netWorth' | 'cashFlow' | 'assetMix'>('netWorth');
    const [zoomLevel, setZoomLevel] = useState(30);
    // Show/hide event markers on chart
    const [showEvents, setShowEvents] = useState(true);
    /**
     * [TODO] FUTURE ENHANCEMENT: Event marker density control
     * Currently using a simple on/off toggle showing essential events only.
     * Could add dropdown to let users choose density level:
     * - 'essential': Life events, goals, major financial milestones (current default)
     * - 'detailed': All events including recurring contributions, expenses, etc.
     * - 'none': Hide all event markers
     *
     * To enable: Replace showEvents checkbox with dropdown and use eventDensity state.
     * Example: const [eventDensity, setEventDensity] = useState<'essential' | 'detailed' | 'none'>('essential');
     */
    const [chartSettings, setChartSettings] = useState({
        netWorth: {
            showConfidenceBands: true,
            showSamplePaths: true,
            showEventMarkers: true,
            realTerms: false
        },
        cashFlow: {
            showTaxBreakdown: true,
            showIncome: true,
            showExpenses: true,
            realTerms: false
        },
        assetMix: {
            includeRealEstate: true,
            includeDebt: true,
            showInvestmentBreakdown: false
        }
    });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const eventMarkersRef = useRef<any[]>([]);
    const [hoverData, setHoverData] = useState<{x: number, y: number, year: number, values: any} | null>(null);
    // Tooltip state for following cursor display
    const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number, visible: boolean}>({ x: 0, y: 0, visible: false });
    // Track container size for responsive redraw
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Use reactive data service hook
    const {
        hasData,
        getNetWorthChartData,
        getCashFlowChartData,
        getAssetAllocationChartData,
        getEventMarkers,
        getDeepDiveForYear
    } = useDataService();

    // Get chart data (memoized to prevent re-render loops)
    const charts = useMemo(() => {
        return hasData ? {
            netWorth: getNetWorthChartData(),
            cashFlow: getCashFlowChartData(),
            assetAllocation: getAssetAllocationChartData()
        } : { netWorth: null, cashFlow: null, assetAllocation: null };
    }, [hasData, getNetWorthChartData, getCashFlowChartData, getAssetAllocationChartData]);

    const eventMarkers = useMemo(() => {
        return hasData ? getEventMarkers() : [];
    }, [hasData, getEventMarkers]);

    // Debug logging (controlled to prevent spam)
    useEffect(() => {
        if (charts.netWorth?.timeSeries?.length) {
            console.log('[Chart Debug] timeSeries length:', charts.netWorth.timeSeries.length, 'zoomLevel:', zoomLevel);
        }
    }, [charts.netWorth?.timeSeries?.length, zoomLevel]);

    // Responsive resize handling using ResizeObserver
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setContainerSize({ width, height });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    // Set first year as selected on component mount or when switching tabs
    React.useEffect(() => {
        if (charts) {
            // let firstYear = null;
            // let firstYearData = null;

            // if (activeChartType === 'netWorth' && charts.netWorth?.timeSeries && charts.netWorth.timeSeries.length > 0) {
            //     const firstPoint = charts.netWorth.timeSeries[0];
            //     firstYear = firstPoint.year;
            //     firstYearData = {
            //         p50: firstPoint.p50,
            //         p10: firstPoint.p10,
            //         p90: firstPoint.p90
            //     };
            //     console.log('📊 Net Worth first year data:', { firstYear, firstYearData });
            // } else if (activeChartType === 'cashFlow' && charts.cashFlow?.timeSeries && charts.cashFlow.timeSeries.length > 0) {
            //     const firstPoint = charts.cashFlow.timeSeries[0];
            //     firstYear = firstPoint.year;
            //     firstYearData = {
            //         netSavings: firstPoint.netSavings,
            //         taxBreakdown: firstPoint.taxBreakdown
            //     };
            //     console.log('💰 Cash Flow first year data:', { firstYear, firstYearData });
            // } else if (activeChartType === 'assetMix' && charts.assetAllocation?.timeSeries && charts.assetAllocation.timeSeries.length > 0) {
            //     const firstPoint = charts.assetAllocation.timeSeries[0];
            //     firstYear = firstPoint.year;
            //     firstYearData = {
            //         totalValue: firstPoint.totalValue,
            //         breakdown: firstPoint.breakdown
            //     };
            //     console.log('🏦 Asset Mix first year data:', { firstYear, firstYearData });
            // }

            // Don't set hoverData initially - let legend logic handle fallbacks
            // This allows clickedYear to take precedence when set
        }
    }, [activeChartType, charts]); // Removed hoverData dependency to always reset when switching tabs

    // Zoom controls: show more/fewer years on the chart
    const handleShowMoreYears = () => setZoomLevel(prev => Math.min(50, prev + 5));
    const handleShowFewerYears = () => setZoomLevel(prev => Math.max(10, prev - 5));

    // Compact inline checkbox component
    const ChartCheckbox = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
        <label className="flex items-center gap-1.5 cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="w-3.5 h-3.5 text-areum-accent border-areum-border rounded-sm focus:ring-1 focus:ring-areum-accent focus:ring-offset-0"
            />
            <span className="text-xs-areum text-areum-text-secondary">{label}</span>
        </label>
    );

    // Render chart-specific checkboxes
    const renderChartControls = () => {
        switch (activeChartType) {
            case 'netWorth':
                return (
                    <>
                        <ChartCheckbox checked={chartSettings.netWorth.showConfidenceBands} onChange={(v) => setChartSettings(prev => ({...prev, netWorth: {...prev.netWorth, showConfidenceBands: v}}))} label="Bands" />
                        <ChartCheckbox checked={chartSettings.netWorth.showSamplePaths} onChange={(v) => setChartSettings(prev => ({...prev, netWorth: {...prev.netWorth, showSamplePaths: v}}))} label="Paths" />
                        <ChartCheckbox checked={showEvents} onChange={setShowEvents} label="Events" />
                        {/*
                         * [TODO] FUTURE ENHANCEMENT: Event density dropdown
                         * Currently using simple on/off toggle showing essential events only.
                         * Could replace checkbox with dropdown for Essential/Detailed/None:
                         *
                         * <label className="flex items-center gap-1.5">
                         *     <span className="text-xs-areum text-areum-text-secondary">Events:</span>
                         *     <select
                         *         value={eventDensity}
                         *         onChange={(e) => setEventDensity(e.target.value as 'essential' | 'detailed' | 'none')}
                         *         className="text-xs-areum bg-areum-surface border border-areum-border rounded-sm px-1.5 py-0.5 text-areum-text-primary focus:outline-none focus:ring-1 focus:ring-areum-accent"
                         *     >
                         *         <option value="essential">Essential</option>
                         *         <option value="detailed">Detailed</option>
                         *         <option value="none">None</option>
                         *     </select>
                         * </label>
                         */}
                        <ChartCheckbox checked={chartSettings.netWorth.realTerms} onChange={(v) => setChartSettings(prev => ({...prev, netWorth: {...prev.netWorth, realTerms: v}}))} label="Real $" />
                    </>
                );
            case 'cashFlow':
                return (
                    <>
                        <ChartCheckbox checked={chartSettings.cashFlow.showIncome} onChange={(v) => setChartSettings(prev => ({...prev, cashFlow: {...prev.cashFlow, showIncome: v}}))} label="Income" />
                        <ChartCheckbox checked={chartSettings.cashFlow.showExpenses} onChange={(v) => setChartSettings(prev => ({...prev, cashFlow: {...prev.cashFlow, showExpenses: v}}))} label="Expenses" />
                        <ChartCheckbox checked={chartSettings.cashFlow.realTerms} onChange={(v) => setChartSettings(prev => ({...prev, cashFlow: {...prev.cashFlow, realTerms: v}}))} label="Real $" />
                    </>
                );
            case 'assetMix':
                return (
                    <>
                        <ChartCheckbox checked={chartSettings.assetMix.includeRealEstate} onChange={(v) => setChartSettings(prev => ({...prev, assetMix: {...prev.assetMix, includeRealEstate: v}}))} label="Real Estate" />
                        <ChartCheckbox checked={chartSettings.assetMix.includeDebt} onChange={(v) => setChartSettings(prev => ({...prev, assetMix: {...prev.assetMix, includeDebt: v}}))} label="Debt" />
                        <ChartCheckbox checked={chartSettings.assetMix.showInvestmentBreakdown} onChange={(v) => setChartSettings(prev => ({...prev, assetMix: {...prev.assetMix, showInvestmentBreakdown: v}}))} label="Breakdown" />
                    </>
                );
            default:
                return null;
        }
    };

    // --- CANVAS UTILITIES & DRAWING LOGIC ---

    const setupCanvas = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        return ctx;
    };

    // Draw Y-axis labels directly on canvas for pixel-perfect alignment
    const drawYAxisLabels = (
        ctx: CanvasRenderingContext2D,
        height: number,
        margin: { top: number; right: number; bottom: number; left: number },
        chartHeight: number,
        maxValue: number,
        isPercentage: boolean = false
    ) => {
        ctx.fillStyle = '#6b7280'; // text-areum-text-secondary equivalent
        ctx.font = '11px ui-sans-serif, system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const steps = 5;
        for (let i = 0; i <= steps; i++) {
            const value = (maxValue * i) / steps;
            const y = height - margin.bottom - (i / steps) * chartHeight;

            let label: string;
            if (isPercentage) {
                label = `${(value * 100).toFixed(0)}%`;
            } else {
                label = formatCurrencyShort(value);
            }

            ctx.fillText(label, margin.left - 8, y);
        }
    };

    // Draw X-axis labels directly on canvas for pixel-perfect alignment
    const drawXAxisLabels = (
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        margin: { top: number; right: number; bottom: number; left: number },
        chartWidth: number,
        data: { year: number }[]
    ) => {
        ctx.fillStyle = '#6b7280'; // text-areum-text-secondary equivalent
        ctx.font = '11px ui-sans-serif, system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const xSteps = Math.min(6, data.length - 1);
        for (let i = 0; i <= xSteps; i++) {
            const dataIndex = Math.floor((i / xSteps) * (data.length - 1));
            const x = margin.left + (dataIndex / (data.length - 1)) * chartWidth;
            const year = data[dataIndex]?.year;
            if (year) {
                ctx.fillText(year.toString(), x, height - margin.bottom + 8);
            }
        }
    };

    // Draw axis lines and subtle grid lines for professional appearance
    const drawGridLines = (
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        margin: { top: number; right: number; bottom: number; left: number },
        chartWidth: number,
        chartHeight: number
    ) => {
        // Draw Y-axis line (left edge)
        ctx.strokeStyle = 'rgba(107, 114, 128, 0.5)'; // gray-500 at 50%
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, height - margin.bottom);
        ctx.stroke();

        // Draw X-axis line (bottom edge)
        ctx.beginPath();
        ctx.moveTo(margin.left, height - margin.bottom);
        ctx.lineTo(width - margin.right, height - margin.bottom);
        ctx.stroke();

        // Draw horizontal grid lines (dashed, subtle)
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.15)';
        ctx.setLineDash([2, 4]);

        const steps = 5;
        for (let i = 1; i < steps; i++) {
            const y = height - margin.bottom - (i / steps) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(width - margin.right, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    };

    const drawNetWorthChart = () => {
        const canvas = canvasRef.current;
        if (!canvas || !charts.netWorth?.timeSeries) return;
        const ctx = setupCanvas(canvas);
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const { width, height } = rect;
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const data = charts.netWorth.timeSeries.slice(0, zoomLevel);

        // Helper to adjust for inflation (Real $) - defined first so maxValue can use it
        const baseYear = data[0]?.year || new Date().getFullYear();
        const inflationRate = 0.025; // 2.5% assumed inflation
        const adjustForInflation = (value: number, year: number): number => {
            if (!chartSettings.netWorth.realTerms) return value;
            const yearsFromBase = year - baseYear;
            return value / Math.pow(1 + inflationRate, yearsFromBase);
        };

        // Use max value from MEDIAN (P50), adjusted for inflation if Real $ is enabled
        const maxValueFromMedian = Math.max(...data.map(p => adjustForInflation(p.p50 || 0, p.year)));
        const maxValue = maxValueFromMedian * 1.1 || 1000000; // Add 10% buffer

        // Event markers are already retrieved from data service

        ctx.clearRect(0, 0, width, height);

        // Draw grid lines first (behind chart)
        drawGridLines(ctx, width, height, margin, chartWidth, chartHeight);

        // Draw axis labels on canvas
        drawYAxisLabels(ctx, height, margin, chartHeight, maxValue);
        drawXAxisLabels(ctx, width, height, margin, chartWidth, data);

        // P10-P90 confidence band (using blue-300 color)
        if (chartSettings.netWorth.showConfidenceBands) {
            ctx.fillStyle = 'rgba(147, 197, 253, 0.3)'; // blue-300 with proper opacity
            ctx.beginPath();
            data.forEach((p, i) => {
                const x = margin.left + (i / (data.length - 1)) * chartWidth;
                const adjustedP90 = adjustForInflation(p.p90 || 0, p.year);
                const y = height - margin.bottom - (adjustedP90 / maxValue) * chartHeight;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            for (let i = data.length - 1; i >= 0; i--) {
                const p = data[i];
                const x = margin.left + (i / (data.length - 1)) * chartWidth;
                const adjustedP10 = adjustForInflation(p.p10 || 0, p.year);
                const y = height - margin.bottom - (adjustedP10 / maxValue) * chartHeight;
                ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Sample paths (ALL paths visible with uniform color)
        if (charts.netWorth.samplePaths?.length && chartSettings.netWorth.showSamplePaths) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(147, 197, 253, 0.35)'; // Uniform blue-300 color for all paths

            // Show a subset of paths for better visibility
            const pathsToShow = Math.min(50, charts.netWorth.samplePaths.length);
            const pathStep = Math.floor(charts.netWorth.samplePaths.length / pathsToShow);

            for (let i = 0; i < pathsToShow; i++) {
                const pathIndex = i * pathStep;
                const path = charts.netWorth.samplePaths[pathIndex];

                if (Array.isArray(path) && path.length >= zoomLevel) {
                    const pathData = path.slice(0, zoomLevel);
                    ctx.beginPath();
                    pathData.forEach((netWorth, idx) => {
                        const x = margin.left + (idx / (pathData.length - 1)) * chartWidth;
                        const year = baseYear + idx;
                        const adjustedNetWorth = adjustForInflation(netWorth, year);
                        const y = height - margin.bottom - (adjustedNetWorth / maxValue) * chartHeight;
                        if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    });
                    ctx.stroke();
                }
            }
        }

        // Median path (uniform thickness with other paths)
        ctx.lineWidth = 2; // Consistent thickness, not too bold
        ctx.strokeStyle = '#2563eb'; // Using blue-600 color for median line
        ctx.beginPath();
        data.forEach((p, i) => {
            const x = margin.left + (i / (data.length - 1)) * chartWidth;
            const adjustedP50 = adjustForInflation(p.p50 || 0, p.year);
            const y = height - margin.bottom - (adjustedP50 / maxValue) * chartHeight;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();


        // Event markers - showing essential events only (life events + goals) when enabled
        // [TODO] FUTURE ENHANCEMENT: See eventDensity comment at top of component to add density options
        eventMarkersRef.current = []; // Clear previous markers
        if (showEvents) {
            // Filter to essential events only (life events + goals)
            const filteredMarkers = eventMarkers.filter((event: any) => event.category === 'essential');

            filteredMarkers.forEach((event: any, index: number) => {
                const yearIndex = event.year - (data[0]?.year || 0);
                if (yearIndex >= 0 && yearIndex < data.length) {
                    // Ensure event marker aligns exactly with chart grid points
                    const baseX = margin.left + (yearIndex / (data.length - 1)) * chartWidth;
                    const adjustedP50 = adjustForInflation(data[yearIndex]?.p50 || 0, data[yearIndex]?.year);
                    const baseY = height - margin.bottom - (adjustedP50 / maxValue) * chartHeight;

                    // Draw event marker to match timeline dots (outer circle + inner dot)
                    // Generate a unique ID from event properties if not provided
                    const eventId = event.id || `${event.label}-${event.year}-${event.type}`;
                    const eventColor = getEventColor(eventId);

                    // Outer circle (30% opacity, matches timeline)
                    ctx.fillStyle = eventColor;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.arc(baseX, baseY, 8, 0, 2 * Math.PI); // 16px diameter (8px radius)
                    ctx.fill();

                    // Inner dot (solid, matches timeline)
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = eventColor;
                    ctx.beginPath();
                    ctx.arc(baseX, baseY, 4, 0, 2 * Math.PI); // 8px diameter (4px radius)
                    ctx.fill();

                    eventMarkersRef.current[index] = {
                        x: baseX, y: baseY, radius: 8,
                        event: { ...event, year: event.year }, // Ensure year is preserved correctly
                        bounds: { left: baseX - 8, right: baseX + 8, top: baseY - 16, bottom: baseY + 8 }
                    };
                }
            });
        }

        // Draw hover line (tracks mouse)
        if (hoverData && hoverData.x !== undefined) {
            const margin = { top: 20, right: 20, bottom: 40, left: 60 };
            const chartWidth = width - margin.left - margin.right;
            const relativeX = (hoverData.x - margin.left) / chartWidth;

            if (relativeX >= 0 && relativeX <= 1) {
                const x = margin.left + relativeX * chartWidth;
                ctx.strokeStyle = '#6b7280';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.3;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(x, margin.top);
                ctx.lineTo(x, height - margin.bottom);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }
        }

        // Draw persistent vertical bar for clicked year
        if (clickedYear !== null) {
            const clickedYearIndex = clickedYear - (data[0]?.year || new Date().getFullYear());
            if (clickedYearIndex >= 0 && clickedYearIndex < data.length) {
                const x = margin.left + (clickedYearIndex / (data.length - 1)) * chartWidth;
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(x, margin.top);
                ctx.lineTo(x, height - margin.bottom);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        // Legend removed - replaced by following cursor tooltip
    };

    const drawCashFlowChart = () => {
        const canvas = canvasRef.current;
        if (!canvas || !charts.cashFlow?.timeSeries) return;
        const ctx = setupCanvas(canvas);
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const { width, height } = rect;
        const margin = { top: 30, right: 20, bottom: 40, left: 70 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const data = charts.cashFlow.timeSeries.slice(0, zoomLevel);
        if (data.length === 0) return;

        // Helper to adjust for inflation (Real $)
        const baseYear = data[0]?.year || new Date().getFullYear();
        const inflationRate = 0.025;
        const adjustForInflation = (value: number, year: number): number => {
            if (!chartSettings.cashFlow.realTerms) return value;
            const yearsFromBase = year - baseYear;
            return value / Math.pow(1 + inflationRate, yearsFromBase);
        };

        // Calculate ranges - include net savings which can be negative
        const incomeValues = data.map(d => adjustForInflation(d.income || 0, d.year));
        const expenseValues = data.map(d => adjustForInflation(d.expenses || 0, d.year));
        const netSavingsValues = data.map(d => adjustForInflation(d.netSavings || 0, d.year));

        const maxValue = Math.max(
            ...incomeValues.filter(v => Number.isFinite(v)),
            ...expenseValues.filter(v => Number.isFinite(v)),
            1
        ) * 1.15;
        const minValue = Math.min(0, ...netSavingsValues.filter(v => Number.isFinite(v))) * 1.15;
        const range = maxValue - minValue;

        // Scale functions
        const xScale = (i: number) => margin.left + (i / (data.length - 1)) * chartWidth;
        const yScale = (v: number) => {
            const normalized = (v - minValue) / range;
            return margin.top + chartHeight - normalized * chartHeight;
        };

        ctx.clearRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        const gridSteps = 5;
        for (let i = 0; i <= gridSteps; i++) {
            const y = margin.top + (i / gridSteps) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(width - margin.right, y);
            ctx.stroke();

            // Y-axis labels
            const value = maxValue - (i / gridSteps) * range;
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(formatCurrencyShort(value), margin.left - 8, y + 4);
        }

        // Zero line (emphasized if visible)
        const zeroY = yScale(0);
        if (zeroY > margin.top && zeroY < margin.top + chartHeight) {
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(margin.left, zeroY);
            ctx.lineTo(width - margin.right, zeroY);
            ctx.stroke();
        }

        // Helper for safe gradient creation
        const safeGradient = (y1: number, y2: number): CanvasGradient => {
            const safeY1 = Number.isFinite(y1) ? y1 : margin.top;
            const safeY2 = Number.isFinite(y2) ? y2 : margin.top + chartHeight;
            return ctx.createLinearGradient(0, safeY1, 0, safeY2);
        };

        // ============================================
        // GRADIENT FILL: Net Savings area (the hero)
        // ============================================
        // Fill between zero line and net savings line
        data.forEach((d, i) => {
            if (i === 0) return;
            const x1 = xScale(i - 1);
            const x2 = xScale(i);
            const y1 = yScale(adjustForInflation(data[i - 1].netSavings || 0, data[i - 1].year));
            const y2 = yScale(adjustForInflation(d.netSavings || 0, d.year));
            const netSavings = adjustForInflation(d.netSavings || 0, d.year);

            ctx.beginPath();
            ctx.moveTo(x1, zeroY);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2, zeroY);
            ctx.closePath();

            // Gradient fill - green above zero, red below
            if (netSavings >= 0) {
                const gradient = safeGradient(Math.min(y1, y2), zeroY);
                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
                gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
                ctx.fillStyle = gradient;
            } else {
                const gradient = safeGradient(zeroY, Math.max(y1, y2));
                gradient.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
                gradient.addColorStop(1, 'rgba(239, 68, 68, 0.35)');
                ctx.fillStyle = gradient;
            }
            ctx.fill();
        });

        // ============================================
        // INCOME LINE (dashed, secondary)
        // ============================================
        if (chartSettings.cashFlow.showIncome) {
            ctx.beginPath();
            ctx.strokeStyle = '#10b981'; // emerald-500
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 3]);
            data.forEach((d, i) => {
                const x = xScale(i);
                const y = yScale(adjustForInflation(d.income || 0, d.year));
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // ============================================
        // EXPENSES LINE (dashed, secondary)
        // ============================================
        if (chartSettings.cashFlow.showExpenses) {
            ctx.beginPath();
            ctx.strokeStyle = '#ef4444'; // red-500
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 3]);
            data.forEach((d, i) => {
                const x = xScale(i);
                const y = yScale(adjustForInflation(d.expenses || 0, d.year));
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // ============================================
        // NET SAVINGS LINE (solid, hero - the main focus)
        // ============================================
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6'; // blue-500
        ctx.lineWidth = 2.5;
        data.forEach((d, i) => {
            const x = xScale(i);
            const y = yScale(adjustForInflation(d.netSavings || 0, d.year));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // ============================================
        // X-AXIS LABELS
        // ============================================
        ctx.fillStyle = '#6b7280';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        data.forEach((d, i) => {
            // Show every 5 years or first/last
            if (i % 5 === 0 || i === data.length - 1) {
                ctx.fillText(d.year.toString(), xScale(i), height - margin.bottom + 20);
            }
        });

        // ============================================
        // LEGEND (top right, compact)
        // ============================================
        const legendX = width - margin.right - 10;
        let legendY = margin.top + 5;
        const legendItems = [
            { color: '#3b82f6', label: 'Net Savings', solid: true },
            ...(chartSettings.cashFlow.showIncome ? [{ color: '#10b981', label: 'Income', dashed: true }] : []),
            ...(chartSettings.cashFlow.showExpenses ? [{ color: '#ef4444', label: 'Expenses', dashed: true }] : [])
        ];

        legendItems.forEach(item => {
            // Line sample
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            if (item.dashed) ctx.setLineDash([4, 2]);
            else ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(legendX - 25, legendY);
            ctx.lineTo(legendX - 5, legendY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            ctx.fillStyle = '#374151';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(item.label, legendX - 30, legendY + 3);
            legendY += 14;
        });

        // ============================================
        // HOVER LINE
        // ============================================
        if (hoverData && hoverData.x !== undefined) {
            const relativeX = (hoverData.x - margin.left) / chartWidth;
            if (relativeX >= 0 && relativeX <= 1) {
                const x = margin.left + relativeX * chartWidth;
                ctx.strokeStyle = '#6b7280';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.4;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(x, margin.top);
                ctx.lineTo(x, height - margin.bottom);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;

                // Draw dot on net savings line at hover position
                const yearIndex = Math.round(relativeX * (data.length - 1));
                if (yearIndex >= 0 && yearIndex < data.length) {
                    const d = data[yearIndex];
                    const dotY = yScale(adjustForInflation(d.netSavings || 0, d.year));
                    ctx.beginPath();
                    ctx.arc(x, dotY, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#3b82f6';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        }

        // ============================================
        // CLICKED YEAR HIGHLIGHT
        // ============================================
        if (clickedYear) {
            const clickedYearIndex = clickedYear - (data[0]?.year || new Date().getFullYear());
            if (clickedYearIndex >= 0 && clickedYearIndex < data.length) {
                const x = xScale(clickedYearIndex);
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(x, margin.top);
                ctx.lineTo(x, height - margin.bottom);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    };

    const drawAssetMixChart = () => {
        const canvas = canvasRef.current;
        if (!canvas || !charts.assetAllocation?.timeSeries) return;
        const ctx = setupCanvas(canvas);
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const { width, height } = rect;
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const data = charts.assetAllocation.timeSeries.slice(0, zoomLevel);
        const barWidth = Math.max(1, chartWidth / data.length * 0.95);

        ctx.clearRect(0, 0, width, height);

        // Draw grid lines first (behind chart)
        drawGridLines(ctx, width, height, margin, chartWidth, chartHeight);

        // Draw axis labels on canvas (percentage for asset mix)
        drawYAxisLabels(ctx, height, margin, chartHeight, 1, true);
        drawXAxisLabels(ctx, width, height, margin, chartWidth, data);

        // Asset location colors
        const assetLocationColors = {
            investment: '#60a5fa',
            cash: '#9ca3af',
            debt: '#ef4444',
            realEstate: '#f59e0b'
        };

        // Investment asset class colors (for breakdown)
        const investmentAssetColors: { [key in AssetClass]?: string } = {
            [AssetClass.US_STOCKS_TOTAL_MARKET]: '#1e40af',
            [AssetClass.INTERNATIONAL_STOCKS]: '#b91c1c',
            [AssetClass.US_BONDS_TOTAL_MARKET]: '#059669',
        };

        data.forEach((d, i) => {
            const x = margin.left + (i / data.length) * chartWidth;
            let currentY = height - margin.bottom;

            // Group assets by location
            const assetLocationData = {
                investment: 0,
                cash: 0,
                debt: 0,
                realEstate: 0,
                investmentBreakdown: {} as { [key in AssetClass]?: number }
            };

            // Get debt data from deep dive when available and includeDebt is enabled
            if (chartSettings.assetMix.includeDebt) {
                const yearForDebt = d.year || new Date().getFullYear();
                const deepDiveForYear = getDeepDiveForYear(yearForDebt);
                if (deepDiveForYear?.balanceSheet?.totalLiabilities) {
                    assetLocationData.debt = deepDiveForYear.balanceSheet.totalLiabilities;
                }
            }

            // Safely iterate over breakdown object
            if (d.breakdown && typeof d.breakdown === 'object') {
                Object.entries(d.breakdown).forEach(([_assetClassKey, assetDetail]) => {
                    if (!assetDetail || typeof assetDetail !== 'object') return;

                    const totalValue = (assetDetail.taxBreakdown?.taxable || 0) + (assetDetail.taxBreakdown?.taxAdvantaged || 0);
                    const assetClass = assetDetail.assetClass as AssetClass;

                    // Categorize by asset location using actual AssetClass enum values
                    if (assetClass === AssetClass.CASH) {
                        assetLocationData.cash += totalValue;
                    } else if (assetClass === AssetClass.REAL_ESTATE_PRIMARY_HOME) {
                        if (chartSettings.assetMix.includeRealEstate) {
                            assetLocationData.realEstate += totalValue;
                        }
                    } else if ([
                        AssetClass.US_STOCKS_TOTAL_MARKET,
                        AssetClass.INTERNATIONAL_STOCKS,
                        AssetClass.US_BONDS_TOTAL_MARKET,
                        AssetClass.LEVERAGED_SPY,
                        AssetClass.OTHER_ASSETS,
                        AssetClass.INDIVIDUAL_STOCK
                    ].includes(assetClass)) {
                        assetLocationData.investment += totalValue;
                        if (chartSettings.assetMix.showInvestmentBreakdown) {
                            assetLocationData.investmentBreakdown[assetClass] = totalValue;
                        }
                    }
                });
            }

            // Note: Debt data is available through deepDiveService when includeDebt is enabled

            // Calculate total for percentage normalization (minimum 1 to avoid division by zero)
            let totalAssets = assetLocationData.investment + assetLocationData.cash;
            if (chartSettings.assetMix.includeRealEstate) {
                totalAssets += assetLocationData.realEstate;
            }
            if (chartSettings.assetMix.includeDebt) {
                totalAssets += assetLocationData.debt;
            }
            totalAssets = Math.max(totalAssets, 1); // Guard against division by zero

            // Draw asset location segments
            if (chartSettings.assetMix.showInvestmentBreakdown && Object.keys(assetLocationData.investmentBreakdown).length > 0) {
                // Draw investment breakdown
                Object.entries(assetLocationData.investmentBreakdown).forEach(([assetClass, value]) => {
                    if (value > 0) {
                        const segmentHeight = (value / totalAssets) * chartHeight;
                        const color = investmentAssetColors[assetClass as AssetClass] || assetLocationColors.investment;

                        const gradient = ctx.createLinearGradient(0, currentY - segmentHeight, 0, currentY);
                        const rgb = hexToRgb(color);
                        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
                        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);

                        ctx.fillStyle = gradient;
                        ctx.fillRect(x, currentY - segmentHeight, barWidth, segmentHeight);
                        currentY -= segmentHeight;
                    }
                });
            } else {
                // Draw investment as single segment
                if (assetLocationData.investment > 0) {
                    const segmentHeight = (assetLocationData.investment / totalAssets) * chartHeight;
                    const gradient = ctx.createLinearGradient(0, currentY - segmentHeight, 0, currentY);
                    const rgb = hexToRgb(assetLocationColors.investment);
                    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
                    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);

                    ctx.fillStyle = gradient;
                    ctx.fillRect(x, currentY - segmentHeight, barWidth, segmentHeight);
                    currentY -= segmentHeight;
                }
            }

            // Draw cash
            if (assetLocationData.cash > 0) {
                const segmentHeight = (assetLocationData.cash / totalAssets) * chartHeight;
                const gradient = ctx.createLinearGradient(0, currentY - segmentHeight, 0, currentY);
                const rgb = hexToRgb(assetLocationColors.cash);
                gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
                gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);

                ctx.fillStyle = gradient;
                ctx.fillRect(x, currentY - segmentHeight, barWidth, segmentHeight);
                currentY -= segmentHeight;
            }

            // Draw real estate (if included)
            if (chartSettings.assetMix.includeRealEstate && assetLocationData.realEstate > 0) {
                const segmentHeight = (assetLocationData.realEstate / totalAssets) * chartHeight;
                const gradient = ctx.createLinearGradient(0, currentY - segmentHeight, 0, currentY);
                const rgb = hexToRgb(assetLocationColors.realEstate);
                gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
                gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);

                ctx.fillStyle = gradient;
                ctx.fillRect(x, currentY - segmentHeight, barWidth, segmentHeight);
                currentY -= segmentHeight;
            }

            // Draw debt (if included and available)
            if (chartSettings.assetMix.includeDebt && assetLocationData.debt > 0) {
                // Draw debt as negative space from bottom
                const segmentHeight = (assetLocationData.debt / totalAssets) * chartHeight;
                const gradient = ctx.createLinearGradient(0, height - margin.bottom, 0, height - margin.bottom + segmentHeight);
                const rgb = hexToRgb(assetLocationColors.debt);
                gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`);
                gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);

                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - margin.bottom, barWidth, segmentHeight);
            }
        });

        // Legend removed - replaced by following cursor tooltip

        // Draw hover line (tracks mouse)
        if (hoverData && hoverData.x !== undefined) {
            const chartWidth = width - margin.left - margin.right;
            const relativeX = (hoverData.x - margin.left) / chartWidth;

            if (relativeX >= 0 && relativeX <= 1) {
                const x = margin.left + relativeX * chartWidth;
                ctx.strokeStyle = '#6b7280';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.3;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(x, margin.top);
                ctx.lineTo(x, height - margin.bottom);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }
        }
    };

    useEffect(() => {
        let chartDataExists = false;
        switch (activeChartType) {
            case 'netWorth':
                chartDataExists = !!(charts.netWorth?.timeSeries?.length);
                break;
            case 'cashFlow':
                chartDataExists = !!(charts.cashFlow?.timeSeries?.length);
                break;
            case 'assetMix':
                chartDataExists = !!(charts.assetAllocation?.timeSeries?.length);
                break;
        }

        if (!chartDataExists) return;

        switch (activeChartType) {
            case 'netWorth':
                drawNetWorthChart();
                break;
            case 'cashFlow':
                drawCashFlowChart();
                break;
            case 'assetMix':
                drawAssetMixChart();
                break;
        }

        // Interactivity
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleMouseMove = (e: MouseEvent) => {
            try {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                let hoveredEventMarker = null;
                if (eventMarkersRef.current && Array.isArray(eventMarkersRef.current)) {
                    for (const marker of eventMarkersRef.current) {
                        if (marker?.bounds && x >= marker.bounds.left && x <= marker.bounds.right && y >= marker.bounds.top && y <= marker.bounds.bottom) {
                            hoveredEventMarker = marker;
                            break;
                        }
                    }
                }

                canvas.style.cursor = hoveredEventMarker ? 'pointer' : 'crosshair';

                // Update hover data for legend based on chart type
                const margin = { top: 20, right: 20, bottom: 40, left: 60 };
                const chartWidth = rect.width - margin.left - margin.right;
                const relativeX = (x - margin.left) / chartWidth;

                if (relativeX >= 0 && relativeX <= 1) {
                    let dataPoint = null;
                    let yearIndex = 0;

                    if (activeChartType === 'netWorth' && charts?.netWorth?.timeSeries && Array.isArray(charts.netWorth.timeSeries)) {
                        // Use zoomLevel to get the correct slice of data
                        const data = charts.netWorth.timeSeries.slice(0, zoomLevel);
                        if (data.length > 0) {
                            yearIndex = Math.round(relativeX * (data.length - 1));
                            dataPoint = data[yearIndex];

                            if (dataPoint && typeof dataPoint.year === 'number') {
                                setHoverData({
                                    x, y,
                                    year: dataPoint.year,
                                    values: {
                                        p50: dataPoint.p50 || 0,
                                        p10: dataPoint.p10 || 0,
                                        p90: dataPoint.p90 || 0
                                    }
                                });
                                setTooltipPosition({ x, y, visible: true });
                            }
                        }
                    } else if (activeChartType === 'cashFlow' && charts?.cashFlow?.timeSeries && Array.isArray(charts.cashFlow.timeSeries)) {
                        const data = charts.cashFlow.timeSeries.slice(0, zoomLevel);
                        if (data.length > 0) {
                            yearIndex = Math.round(relativeX * (data.length - 1));
                            dataPoint = data[yearIndex];

                            if (dataPoint && typeof dataPoint.year === 'number') {
                                setHoverData({
                                    x, y,
                                    year: dataPoint.year,
                                    values: {
                                        income: dataPoint.income || 0,
                                        expenses: dataPoint.expenses || 0,
                                        netSavings: dataPoint.netSavings || 0,
                                        taxes: dataPoint.taxes || 0,
                                        taxBreakdown: dataPoint.taxBreakdown || { total: 0, federal: 0, state: 0, fica: 0 }
                                    }
                                });
                                setTooltipPosition({ x, y, visible: true });
                            }
                        }
                    } else if (activeChartType === 'assetMix' && charts?.assetAllocation?.timeSeries && Array.isArray(charts.assetAllocation.timeSeries)) {
                        const data = charts.assetAllocation.timeSeries.slice(0, zoomLevel);
                        if (data.length > 0) {
                            yearIndex = Math.round(relativeX * (data.length - 1));
                            dataPoint = data[yearIndex];

                            if (dataPoint && typeof dataPoint.year === 'number') {
                                setHoverData({
                                    x, y,
                                    year: dataPoint.year,
                                    values: {
                                        totalValue: dataPoint.totalValue || 0,
                                        breakdown: dataPoint.breakdown || {}
                                    }
                                });
                                setTooltipPosition({ x, y, visible: true });
                            }
                        }
                    }
                } else {
                    setHoverData(null);
                    setTooltipPosition(prev => ({ ...prev, visible: false }));
                }
            } catch (error) {
                // Silently handle chart hover errors to prevent console spam
                setHoverData(null);
                setTooltipPosition(prev => ({ ...prev, visible: false }));
            }
        };

        const handleClick = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            let eventClicked = false;
            for (const marker of eventMarkersRef.current) {
                if (marker.bounds && x >= marker.bounds.left && x <= marker.bounds.right && y >= marker.bounds.top && y <= marker.bounds.bottom) {
                    // Event clicked - trigger year selection
                    onYearSelect(marker.event.year);
                    eventClicked = true;
                    break;
                }
            }

            if (!eventClicked) {
                const margin = { top: 20, right: 20, bottom: 40, left: 60 };
                const chartWidth = rect.width - margin.left - margin.right;
                const relativeX = (x - margin.left) / chartWidth;

                if (relativeX >= 0 && relativeX <= 1) {
                    let year = null;

                    if (activeChartType === 'netWorth' && charts.netWorth?.timeSeries) {
                        const data = charts.netWorth.timeSeries.slice(0, zoomLevel);
                        const yearIndex = Math.round(relativeX * (data.length - 1));
                        year = data[yearIndex]?.year;
                    } else if (activeChartType === 'cashFlow' && charts.cashFlow?.timeSeries) {
                        const data = charts.cashFlow.timeSeries.slice(0, zoomLevel);
                        const yearIndex = Math.round(relativeX * (data.length - 1));
                        year = data[yearIndex]?.year;
                    } else if (activeChartType === 'assetMix' && charts.assetAllocation?.timeSeries) {
                        const data = charts.assetAllocation.timeSeries.slice(0, zoomLevel);
                        const yearIndex = Math.round(relativeX * (data.length - 1));
                        year = data[yearIndex]?.year;
                    }

                    if (year) onYearSelect(year);
                }
            }
        };

        const handleMouseLeave = () => {
            setHoverData(null);
            setTooltipPosition(prev => ({ ...prev, visible: false }));
            // Let useEffect handle redraw to avoid constant refreshing
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChartType, hasData, zoomLevel, clickedYear, onYearSelect, chartSettings, showEvents, containerSize]);

    // Separate useEffect for hover data updates that only redraws when needed
    useEffect(() => {
        if (!hasData || !canvasRef.current) return;

        // Use requestAnimationFrame to batch hover updates and avoid excessive re-renders
        const timeoutId = setTimeout(() => {
            switch (activeChartType) {
                case 'netWorth':
                    if (charts.netWorth?.timeSeries?.length) drawNetWorthChart();
                    break;
                case 'cashFlow':
                    if (charts.cashFlow?.timeSeries?.length) drawCashFlowChart();
                    break;
                case 'assetMix':
                    if (charts.assetAllocation?.timeSeries?.length) drawAssetMixChart();
                    break;
            }
        }, 16); // Throttle to ~60fps

        return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hoverData, clickedYear, activeChartType, charts, chartSettings, showEvents, containerSize]);

    const renderChartArea = () => {
        let chartDataExists = false;
        switch (activeChartType) {
            case 'netWorth':
                chartDataExists = !!(charts.netWorth?.timeSeries?.length);
                break;
            case 'cashFlow':
                chartDataExists = !!(charts.cashFlow?.timeSeries?.length);
                break;
            case 'assetMix':
                chartDataExists = !!(charts.assetAllocation?.timeSeries?.length);
                break;
        }

        if (!chartDataExists) {
            return (
                <div className="h-96 flex items-center justify-center text-areum-text-secondary">
                    <div className="text-center">
                        <div className="text-lg-areum mb-2">📊</div>
                        <Text size="base" weight="medium">No {activeChartType.replace(/([A-Z])/g, ' $1')} chart data available.</Text>
                        <Text size="base" color="secondary" className="mt-2">Run simulation to generate this projection.</Text>
                    </div>
                </div>
            );
        }

        // Helper to render tooltip content based on chart type
        const renderTooltipContent = () => {
            if (!hoverData) return null;

            // Get events for this year
            const yearEvents = eventMarkers.filter((e: any) => e.year === hoverData.year);

            // Common event display component - shows all events for accessibility
            const EventsSection = () => {
                if (yearEvents.length === 0) return null;
                return (
                    <div className="mt-1.5 pt-1.5 border-t border-areum-border">
                        <div className="text-xs-areum text-areum-text-tertiary mb-0.5">Events:</div>
                        <div className="space-y-0.5 max-h-24 overflow-y-auto">
                            {yearEvents.map((event: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                    <span
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: getEventColor(event.id || `${event.label}-${event.year}`) }}
                                    />
                                    <span className="text-xs-areum text-areum-text-secondary truncate max-w-[160px]" title={event.label}>
                                        {event.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            };

            if (activeChartType === 'netWorth') {
                return (
                    <>
                        <div className="text-sm-areum font-semibold text-areum-text-primary mb-1">{hoverData.year}</div>
                        <div className="space-y-0.5">
                            <div className="flex justify-between gap-3">
                                <span className="text-xs-areum text-areum-text-secondary">Median:</span>
                                <span className="text-xs-areum font-medium text-areum-accent">{formatCurrencyShort(hoverData.values.p50)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-xs-areum text-areum-text-tertiary">Range:</span>
                                <span className="text-xs-areum text-areum-text-secondary">{formatCurrencyShort(hoverData.values.p10)} – {formatCurrencyShort(hoverData.values.p90)}</span>
                            </div>
                        </div>
                        <EventsSection />
                    </>
                );
            } else if (activeChartType === 'cashFlow') {
                return (
                    <>
                        <div className="text-sm-areum font-semibold text-areum-text-primary mb-1">{hoverData.year}</div>
                        <div className="space-y-0.5">
                            <div className="flex justify-between gap-3">
                                <span className="text-xs-areum text-areum-text-secondary">Income:</span>
                                <span className="text-xs-areum font-medium text-areum-success">{formatCurrencyShort(hoverData.values.income)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-xs-areum text-areum-text-secondary">Expenses:</span>
                                <span className="text-xs-areum font-medium text-areum-danger">{formatCurrencyShort(hoverData.values.expenses)}</span>
                            </div>
                            <div className="flex justify-between gap-3 pt-0.5 border-t border-areum-border">
                                <span className="text-xs-areum text-areum-text-secondary">Net:</span>
                                <span className={`text-xs-areum font-medium ${hoverData.values.netSavings >= 0 ? 'text-areum-success' : 'text-areum-danger'}`}>
                                    {formatCurrencyShort(hoverData.values.netSavings)}
                                </span>
                            </div>
                        </div>
                        <EventsSection />
                    </>
                );
            } else {
                return (
                    <>
                        <div className="text-sm-areum font-semibold text-areum-text-primary mb-1">{hoverData.year}</div>
                        <div className="text-xs-areum text-areum-text-secondary">
                            Total: {formatCurrencyShort(hoverData.values.totalValue)}
                        </div>
                        <EventsSection />
                    </>
                );
            }
        };

        // Calculate tooltip position with edge detection
        const getTooltipStyle = () => {
            if (!tooltipPosition.visible || !hoverData) return { display: 'none' };

            // Dynamic height based on whether we have events
            const yearEvents = eventMarkers.filter((e: any) => e.year === hoverData.year);
            const baseHeight = activeChartType === 'cashFlow' ? 90 : 70;
            // Events section: header (16px) + events (18px each, max 5 visible before scroll) + padding
            const eventHeight = yearEvents.length > 0 ? Math.min(yearEvents.length * 18, 90) + 24 : 0;
            const tooltipHeight = baseHeight + eventHeight;
            const tooltipWidth = 200; // wider for event text

            // Flip below cursor if near top
            const flipBelow = tooltipPosition.y < tooltipHeight + 20;
            // Flip left if near right edge
            const flipLeft = tooltipPosition.x > (canvasRef.current?.getBoundingClientRect().width || 800) - tooltipWidth - 20;

            return {
                left: flipLeft ? tooltipPosition.x - tooltipWidth - 12 : tooltipPosition.x + 12,
                top: flipBelow ? tooltipPosition.y + 12 : tooltipPosition.y - tooltipHeight - 12,
                opacity: 1,
            };
        };

        return (
            <div className="relative h-96">
                <canvas
                    key={`chart-${containerSize.width}-${containerSize.height}`}
                    ref={canvasRef}
                    id="mainChart"
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                />

                {/* Following cursor tooltip */}
                {tooltipPosition.visible && hoverData && (
                    <div
                        className="absolute pointer-events-none bg-areum-surface border border-areum-border rounded-md-areum shadow-lg p-2 z-10 transition-opacity duration-75"
                        style={getTooltipStyle()}
                    >
                        {renderTooltipContent()}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Section number={2} title="PROJECTION" className="mb-4" dense>
            {/* Controls row - ultra-compact */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <TabGroup
                tabs={[
                  { id: 'netWorth', label: 'Net Worth' },
                  { id: 'cashFlow', label: 'Cash Flow' },
                  { id: 'assetMix', label: 'Asset Mix' },
                ]}
                activeTab={activeChartType}
                onChange={(tabId) => setActiveChartType(tabId as 'netWorth' | 'cashFlow' | 'assetMix')}
                size="sm"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={handleShowFewerYears}
                    className="w-6 h-6 flex items-center justify-center text-areum-text-tertiary hover:text-areum-text-primary hover:bg-areum-canvas rounded transition-colors"
                    title="Show fewer years"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <span className="text-xs-areum text-areum-text-secondary font-medium min-w-[32px] text-center">{zoomLevel}Y</span>
                <button
                    onClick={handleShowMoreYears}
                    className="w-6 h-6 flex items-center justify-center text-areum-text-tertiary hover:text-areum-text-primary hover:bg-areum-canvas rounded transition-colors"
                    title="Show more years"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
              </div>
            </div>

            {/* Chart-specific controls - inline compact */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-2 pb-2 border-b border-areum-border">
              {renderChartControls()}
            </div>

            <div ref={containerRef} className="relative bg-areum-surface border border-areum-border overflow-hidden rounded-md-areum">
                {renderChartArea()}
            </div>
        </Section>
    );
};