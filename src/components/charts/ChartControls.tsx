/**
 * Chart Controls Component
 * 
 * Provides interactive controls for managing chart overlays, data toggles,
 * and visualization options for the new projection charts.
 */

import React from 'react';
import { AssetClass } from '@/types';
import { HelpTooltip } from '../HelpTooltip';
import { H4, Label, BodyBase, Caption, Mono, MonoSmall } from '@/components/ui/Typography';

interface PerformanceMetrics {
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  successRate: number;
}

interface AssetAllocation {
  assetClass: AssetClass;
  percentage: number;
  value: number;
}

interface ChartControlsProps {
  // Display options
  showPercentiles: boolean;
  onShowPercentilesChange: (show: boolean) => void;
  
  showSamplePaths: boolean;
  onShowSamplePathsChange: (show: boolean) => void;
  
  showEventMarkers: boolean;
  onShowEventMarkersChange: (show: boolean) => void;
  
  // Performance metrics overlay
  showPerformanceMetrics: boolean;
  onShowPerformanceMetricsChange: (show: boolean) => void;
  
  // Asset allocation overlay
  showAssetAllocation: boolean;
  onShowAssetAllocationChange: (show: boolean) => void;
  
  // Asset allocation filter
  selectedAssetClasses: AssetClass[];
  onSelectedAssetClassesChange: (assetClasses: AssetClass[]) => void;
  
  // Chart type selection
  chartType: 'netWorth' | 'cashFlow' | 'assetAllocation';
  onChartTypeChange: (type: 'netWorth' | 'cashFlow' | 'assetAllocation') => void;
  
  // Time range selection
  timeRange: 'all' | '10y' | '20y' | '30y';
  onTimeRangeChange: (range: 'all' | '10y' | '20y' | '30y') => void;

  // Real data from simulation results
  performanceMetrics?: PerformanceMetrics;
  currentAllocation?: AssetAllocation[];

  className?: string;
}

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  [AssetClass.CASH]: 'Cash',
  [AssetClass.US_STOCKS_TOTAL_MARKET]: 'US Stocks',
  [AssetClass.US_BONDS_TOTAL_MARKET]: 'US Bonds',
  [AssetClass.INTERNATIONAL_STOCKS]: 'International',
  [AssetClass.REAL_ESTATE_PRIMARY_HOME]: 'Real Estate',
  [AssetClass.LEVERAGED_SPY]: 'Leveraged SPY',
  [AssetClass.OTHER_ASSETS]: 'Other Assets',
  [AssetClass.INDIVIDUAL_STOCK]: 'Individual Stock'
};

const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  [AssetClass.CASH]: '#6B7280',
  [AssetClass.US_STOCKS_TOTAL_MARKET]: '#4338CA',
  [AssetClass.US_BONDS_TOTAL_MARKET]: '#16A34A',
  [AssetClass.INTERNATIONAL_STOCKS]: '#D97706',
  [AssetClass.REAL_ESTATE_PRIMARY_HOME]: '#DC2626',
  [AssetClass.LEVERAGED_SPY]: '#7C3AED',
  [AssetClass.OTHER_ASSETS]: '#EC4899',
  [AssetClass.INDIVIDUAL_STOCK]: '#F59E0B'
};

export const ChartControls: React.FC<ChartControlsProps> = ({
  showPercentiles,
  onShowPercentilesChange,
  showSamplePaths,
  onShowSamplePathsChange,
  showEventMarkers,
  onShowEventMarkersChange,
  showPerformanceMetrics,
  onShowPerformanceMetricsChange,
  showAssetAllocation,
  onShowAssetAllocationChange,
  selectedAssetClasses,
  onSelectedAssetClassesChange,
  chartType,
  onChartTypeChange,
  timeRange,
  onTimeRangeChange,
  performanceMetrics,
  currentAllocation,
  className = ""
}) => {
  
  const handleAssetClassToggle = (assetClass: AssetClass) => {
    const isSelected = selectedAssetClasses.includes(assetClass);
    if (isSelected) {
      onSelectedAssetClassesChange(selectedAssetClasses.filter(ac => ac !== assetClass));
    } else {
      onSelectedAssetClassesChange([...selectedAssetClasses, assetClass]);
    }
  };

  const handleSelectAllAssetClasses = () => {
    const allAssetClasses: AssetClass[] = Object.values(AssetClass);
    onSelectedAssetClassesChange(allAssetClasses);
  };

  const handleDeselectAllAssetClasses = () => {
    onSelectedAssetClassesChange([]);
  };

  return (
    <div className={`chart-controls bg-white border border-gray-200 rounded-lg p-4 space-y-4 ${className}`}>
      
      {/* Chart Type Selection */}
      <div className="chart-controls-section">
        <H4 className="mb-2">Chart Type</H4>
        <div className="flex space-x-2">
          <button
            onClick={() => onChartTypeChange('netWorth')}
            className={`px-3 py-2 rounded-md transition-colors ${
              chartType === 'netWorth'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <BodyBase as="span">📈 Net Worth</BodyBase>
          </button>
          <button
            onClick={() => onChartTypeChange('cashFlow')}
            className={`px-3 py-2 rounded-md transition-colors ${
              chartType === 'cashFlow'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <BodyBase as="span">💰 Cash Flow</BodyBase>
          </button>
          <button
            onClick={() => onChartTypeChange('assetAllocation')}
            className={`px-3 py-2 rounded-md transition-colors ${
              chartType === 'assetAllocation'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <BodyBase as="span">📊 Asset Allocation</BodyBase>
          </button>
        </div>
      </div>

      {/* Time Range Selection */}
      <div className="chart-controls-section">
        <H4 className="mb-2">Time Range</H4>
        <div className="flex space-x-2">
          {['all', '10y', '20y', '30y'].map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range as any)}
              className={`px-3 py-1 rounded transition-colors ${
                timeRange === range
                  ? 'bg-gray-200 text-gray-900'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Caption as="span" className={timeRange === range ? "text-gray-900" : "text-gray-600"}>
                {range === 'all' ? 'All Years' : range.toUpperCase()}
              </Caption>
            </button>
          ))}
        </div>
      </div>

      {/* Display Options */}
      <div className="chart-controls-section">
        <H4 className="mb-2">Display Options</H4>
        <div className="space-y-2">

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPercentiles}
              onChange={(e) => onShowPercentilesChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <BodyBase as="span" className="text-gray-700 flex items-center">
              Show Confidence Bands
              <HelpTooltip
                concept="monteCarlo"
                position="top"
                className="ml-1"
              >
                <span className="text-gray-400 hover:text-blue-500 cursor-help">ℹ️</span>
              </HelpTooltip>
            </BodyBase>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSamplePaths}
              onChange={(e) => onShowSamplePathsChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <BodyBase as="span" className="text-gray-700">Show Sample Paths</BodyBase>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showEventMarkers}
              onChange={(e) => onShowEventMarkersChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <BodyBase as="span" className="text-gray-700">Show Event Markers</BodyBase>
          </label>

        </div>
      </div>

      {/* Performance Metrics Overlay */}
      <div className="chart-controls-section">
        <H4 className="mb-2">Overlays</H4>
        <div className="space-y-2">

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPerformanceMetrics}
              onChange={(e) => onShowPerformanceMetricsChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <BodyBase as="span" className="text-gray-700">Performance Metrics</BodyBase>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAssetAllocation}
              onChange={(e) => onShowAssetAllocationChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <BodyBase as="span" className="text-gray-700 flex items-center">
              Asset Allocation
              <HelpTooltip
                concept="assetAllocation"
                position="top"
                className="ml-1"
              >
                <span className="text-gray-400 hover:text-blue-500 cursor-help">ℹ️</span>
              </HelpTooltip>
            </BodyBase>
          </label>

        </div>
      </div>

      {/* Asset Class Filter */}
      {chartType === 'assetAllocation' && (
        <div className="chart-controls-section">
          <div className="flex items-center justify-between mb-2">
            <H4>Asset Classes</H4>
            <div className="flex space-x-1">
              <button
                onClick={handleSelectAllAssetClasses}
                className="text-blue-600 hover:text-blue-800"
              >
                <Caption as="span">All</Caption>
              </button>
              <Caption as="span" color="tertiary">|</Caption>
              <button
                onClick={handleDeselectAllAssetClasses}
                className="text-gray-600 hover:text-gray-800"
              >
                <Caption as="span">None</Caption>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {(Object.entries(ASSET_CLASS_LABELS) as [AssetClass, string][]).map(([assetClass, label]) => (
              <label key={assetClass} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAssetClasses.includes(assetClass)}
                  onChange={() => handleAssetClassToggle(assetClass)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: ASSET_CLASS_COLORS[assetClass] }}
                />
                <BodyBase as="span" className="text-gray-700">{label}</BodyBase>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics Panel */}
      {showPerformanceMetrics && (
        <div className="chart-controls-section border-t border-gray-200 pt-4">
          <H4 className="mb-3">Performance Metrics</H4>
          {performanceMetrics ? (
            <div className="space-y-3">

              <div className="flex justify-between items-center">
                <Caption color="secondary">Return</Caption>
                <MonoSmall weight="medium">
                  {(performanceMetrics.annualizedReturn * 100).toFixed(1)}%/yr
                </MonoSmall>
              </div>

              <div className="flex justify-between items-center">
                <Caption color="secondary">Volatility</Caption>
                <MonoSmall weight="medium">
                  {(performanceMetrics.volatility * 100).toFixed(1)}%
                </MonoSmall>
              </div>

              <div className="flex justify-between items-center">
                <Caption color="secondary">Sharpe Ratio</Caption>
                <MonoSmall weight="medium">
                  {performanceMetrics.sharpeRatio.toFixed(2)}
                </MonoSmall>
              </div>

              <div className="flex justify-between items-center">
                <Caption color="secondary">Max Drawdown</Caption>
                <MonoSmall weight="medium" className="text-red-600">
                  {(performanceMetrics.maxDrawdown * 100).toFixed(1)}%
                </MonoSmall>
              </div>

              <div className="flex justify-between items-center">
                <Caption color="secondary">Success Rate</Caption>
                <MonoSmall weight="medium" className="text-green-600">
                  {(performanceMetrics.successRate * 100).toFixed(0)}%
                </MonoSmall>
              </div>

            </div>
          ) : (
            <BodyBase color="tertiary">
              No performance data available. Run simulation to see metrics.
            </BodyBase>
          )}
        </div>
      )}

      {/* Asset Allocation Panel */}
      {showAssetAllocation && (
        <div className="chart-controls-section border-t border-gray-200 pt-4">
          <H4 className="mb-3">Current Allocation</H4>
          {currentAllocation && currentAllocation.length > 0 ? (
            <div className="space-y-2">
              {currentAllocation
                .filter(allocation => allocation.percentage > 0) // Only show non-zero allocations
                .map(allocation => {
                  const label = ASSET_CLASS_LABELS[allocation.assetClass] || allocation.assetClass;
                  const color = ASSET_CLASS_COLORS[allocation.assetClass] || '#6B7280';

                  return (
                    <div key={allocation.assetClass} className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: color }}
                      />
                      <Caption color="secondary" className="flex-1">{label}</Caption>
                      <MonoSmall weight="medium">
                        {(allocation.percentage * 100).toFixed(1)}%
                      </MonoSmall>
                    </div>
                  );
                })
              }
            </div>
          ) : (
            <BodyBase color="tertiary">
              No allocation data available. Run simulation to see current portfolio allocation.
            </BodyBase>
          )}
        </div>
      )}

    </div>
  );
};

export default ChartControls;