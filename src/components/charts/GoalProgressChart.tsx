/**
 * Goal Progress Chart Component
 *
 * Provides comprehensive visualization of goal progress over time with trends,
 * projections, and achievement probability analysis.
 *
 * ARCHITECTURAL PRINCIPLE: This component is a "dumb display" that consumes
 * pre-computed goal progress data from the backend via SimulationPayload.
 * All goal analysis, trend calculations, and progress tracking are performed
 * by the WASM simulation engine.
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  AreaChart
} from 'recharts';
import type { EnhancedGoal } from '../../types/enhanced-goal';
import type { GoalProgressTimeline } from '../../types/api/payload';
import { useDataService } from '../../hooks/useDataService';
import { logger } from '../../utils/logger';
import { H3, H4, H5, Body, BodyBase, Caption, Label, Mono } from '@/components/ui/Typography';

interface GoalProgressChartProps {
  goal: EnhancedGoal;
  timeline?: GoalProgressTimeline; // Deprecated prop - data now comes from backend
  height?: number;
  showProjections?: boolean;
  showMilestones?: boolean;
  className?: string;
}

interface ChartDataPoint {
  year: number;
  currentAmount: number;
  targetAmount: number;
  progressPercentage: number;
  projectedAmount?: number;
  requiredAmount?: number;
  onTrack: boolean;
}

export const GoalProgressChart: React.FC<GoalProgressChartProps> = ({
  goal,
  timeline, // Deprecated prop - ignored in favor of dataService
  height = 400,
  showProjections = true,
  showMilestones = true,
  className = ''
}) => {
  const { getGoalProgressChartData } = useDataService();

  // Responsive margin handling
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const chartData = useMemo(() => {
    try {
      // Get pre-computed chart data from backend via dataService
      const progressData = getGoalProgressChartData(goal);

      if (!progressData) {
        logger.warn(`No goal progress data available for goal ${goal.id}`);
        return [];
      }
      
      // Combine current progress with projections
      const combinedData: ChartDataPoint[] = progressData.timeSeries.map((point: any) => ({
        year: point.year,
        currentAmount: point.currentAmount,
        targetAmount: point.targetAmount,
        progressPercentage: point.progressPercentage,
        onTrack: point.onTrack
      }));

      // Add projection data if enabled
      if (showProjections) {
        const currentYear = new Date().getFullYear();
        
        // Merge projection lines
        progressData.projectionLines.currentTrend.forEach((proj: any) => {
          const existingPoint = combinedData.find(p => p.year === proj.year);
          if (existingPoint) {
            existingPoint.projectedAmount = proj.projectedAmount;
          } else if (proj.year > currentYear) {
            combinedData.push({
              year: proj.year,
              currentAmount: 0,
              targetAmount: goal.targetAmount,
              progressPercentage: 0,
              projectedAmount: proj.projectedAmount,
              onTrack: false
            });
          }
        });

        progressData.projectionLines.requiredTrend.forEach((req: any) => {
          const existingPoint = combinedData.find(p => p.year === req.year);
          if (existingPoint) {
            existingPoint.requiredAmount = req.requiredAmount;
          }
        });
      }

      return combinedData.sort((a, b) => a.year - b.year);
    } catch (error) {
      logger.warn('Failed to load goal progress chart data:', error);
      return [];
    }
  }, [goal, showProjections]);

  const milestones = useMemo(() => {
    if (!showMilestones || !timeline) return [];
    
    try {
      const progressData = getGoalProgressChartData(goal);
      return progressData.milestones;
    } catch (error) {
      logger.warn('Failed to load goal milestones:', error);
      return [];
    }
  }, [goal, showMilestones, timeline]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  const getStatusColor = (onTrack: boolean) => {
    return onTrack ? '#10B981' : '#EF4444'; // Green for on-track, red for behind
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <BodyBase weight="medium" className="mb-2">{`Year: ${label}`}</BodyBase>

          {data.currentAmount > 0 && (
            <Mono color="info" className="block">
              {`Current: ${formatCurrency(data.currentAmount)}`}
            </Mono>
          )}

          {data.projectedAmount > 0 && (
            <Mono className="block text-purple-600">
              {`Projected: ${formatCurrency(data.projectedAmount)}`}
            </Mono>
          )}

          {data.requiredAmount > 0 && (
            <Mono color="warning" className="block">
              {`Required: ${formatCurrency(data.requiredAmount)}`}
            </Mono>
          )}

          <Mono color="secondary" className="block">
            {`Target: ${formatCurrency(data.targetAmount)}`}
          </Mono>

          {data.progressPercentage > 0 && (
            <Mono weight="medium" color={data.onTrack ? 'success' : 'danger'} className="block">
              {`Progress: ${formatPercentage(data.progressPercentage)} ${data.onTrack ? '✓' : '⚠️'}`}
            </Mono>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 rounded-lg ${className}`}>
        <div className="text-center">
          <Body color="tertiary">No goal progress data available</Body>
          <BodyBase color="tertiary" className="mt-1">
            Run a simulation to see goal progress trends
          </BodyBase>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Chart Header */}
      <div className="mb-4">
        <H4 weight="semibold">
          {goal.name} Progress
        </H4>
        <BodyBase color="secondary">
          Target: <Mono as="span">{formatCurrency(goal.targetAmount)}</Mono> in {goal.targetAccount.name || goal.targetAccount.type}
          {goal.targetDate && ` by ${goal.targetDate.getFullYear()}`}
        </BodyBase>

        {timeline && (
          <div className="flex items-center gap-4 mt-2">
            <Caption weight="medium" className={`px-2 py-1 rounded-full ${
              timeline.achievementAnalysis.status === 'on_track' ? 'bg-green-100 text-green-800' :
              timeline.achievementAnalysis.status === 'at_risk' ? 'bg-yellow-100 text-yellow-800' :
              timeline.achievementAnalysis.status === 'achieved' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {timeline.achievementAnalysis.status.replace('-', ' ').toUpperCase()}
            </Caption>

            <BodyBase color="secondary">
              Success Probability: <Mono as="span">{Math.round(timeline.achievementAnalysis.probabilityOfSuccess)}%</Mono>
            </BodyBase>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart 
          data={chartData} 
          margin={{ 
            top: 20, 
            right: isMobile ? 10 : 30, 
            left: isMobile ? 10 : 20, 
            bottom: 20 
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis
            dataKey="year"
            stroke="#666"
            style={{ fontSize: '12px' }}
          />

          <YAxis
            stroke="#666"
            style={{ fontSize: '12px' }}
            tickFormatter={formatCurrency}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend />

          {/* Target amount reference line */}
          <ReferenceLine 
            y={goal.targetAmount} 
            stroke="#666" 
            strokeDasharray="5 5"
            label={{ value: "Target", position: "top" }}
          />

          {/* Current progress line */}
          <Line
            type="monotone"
            dataKey="currentAmount"
            stroke="#3B82F6"
            strokeWidth={3}
            name="Current Amount"
            dot={{ fill: '#3B82F6', r: 4 }}
            connectNulls={false}
          />

          {/* Projected trend line */}
          {showProjections && (
            <Line
              type="monotone"
              dataKey="projectedAmount"
              stroke="#8B5CF6"
              strokeWidth={2}
              strokeDasharray="8 8"
              name="Projected Trend"
              dot={false}
              connectNulls={false}
            />
          )}

          {/* Required progress line */}
          {showProjections && (
            <Line
              type="monotone"
              dataKey="requiredAmount"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="4 4"
              name="Required Progress"
              dot={false}
              connectNulls={false}
            />
          )}

          {/* Milestone markers */}
          {milestones.map((milestone: any, index: number) => (
            <ReferenceLine
              key={index}
              x={milestone.year}
              stroke={
                milestone.type === 'target' ? '#10B981' :
                milestone.type === 'accelerating' ? '#3B82F6' :
                '#EF4444'
              }
              strokeWidth={2}
              label={{
                value: milestone.label,
                position: 'top',
                offset: 10,
                style: { fontSize: '12px' }
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Progress Summary */}
      {timeline && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <BodyBase color="secondary">Monthly Progress</BodyBase>
            <Mono weight="semibold">
              {timeline.trendAnalysis.averageMonthlyProgress > 0 ? '+' : ''}
              {timeline.trendAnalysis.averageMonthlyProgress.toFixed(2)}%
            </Mono>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <BodyBase color="secondary">Consistency</BodyBase>
            <BodyBase weight="semibold" className="capitalize">
              {timeline.trendAnalysis.consistency.replace('-', ' ')}
            </BodyBase>
          </div>

          {timeline.achievementAnalysis.medianAchievementYear && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <BodyBase color="secondary">Expected Achievement</BodyBase>
              <Mono weight="semibold">
                {timeline.achievementAnalysis.medianAchievementYear}
              </Mono>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg">
            <BodyBase color="secondary">Acceleration</BodyBase>
            <BodyBase
              weight="semibold"
              color={
                timeline.trendAnalysis.progressAcceleration > 0 ? 'success' :
                timeline.trendAnalysis.progressAcceleration < 0 ? 'danger' :
                'primary'
              }
            >
              {timeline.trendAnalysis.progressAcceleration > 0 ? '↗️' :
               timeline.trendAnalysis.progressAcceleration < 0 ? '↘️' : '→'}
              {timeline.trendAnalysis.progressAcceleration > 0 ? ' Accelerating' :
               timeline.trendAnalysis.progressAcceleration < 0 ? ' Decelerating' :
               ' Steady'}
            </BodyBase>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {timeline && timeline.recommendations.length > 0 && (
        <div className="mt-4">
          <H5 weight="medium" className="mb-2">Recommendations</H5>
          <div className="space-y-2">
            {timeline.recommendations.slice(0, 2).map((rec, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  rec.priority === 'high' ? 'bg-red-50 border-red-400' :
                  rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }`}
              >
                <BodyBase weight="medium">{rec.title}</BodyBase>
                <Caption color="secondary" className="mt-1">{rec.description}</Caption>
                <Caption className={`px-2 py-1 rounded inline-block mt-1 ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                </Caption>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalProgressChart;