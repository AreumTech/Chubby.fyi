import React from 'react';

interface GoalFeasibilityGaugeProps {
  percentage: number;
  colorClass: string; // tailwind text color class, e.g. "text-success"
  size?: number;
  strokeWidth?: number;
}

export const GoalFeasibilityGauge: React.FC<GoalFeasibilityGaugeProps> = ({
  percentage,
  colorClass,
  size = 80,
  strokeWidth = 8,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(percentage, 0), 100) / 100);

  return (
    <svg width={size} height={size} className="block">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        stroke="var(--tw-colors-border-color)"
        fill="none"
        className="opacity-20"
      />
      {/* Foreground arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        stroke="currentColor"
        className={`${colorClass} transform rotate-[-90deg] origin-center`}
        fill="none"
        strokeDasharray={circumference.toFixed(2)}
        strokeDashoffset={offset.toFixed(2)}
      />
      {/* Percentage label */}
      <text
        x="50%"
        y="50%"
        dy="0.35em"
        textAnchor="middle"
        className={`font-semibold ${colorClass}`}
        style={{ fontSize: `${Math.min(Math.max(size * 0.3, 14), 20)}px` }}
      >
        {`${Math.round(percentage)}%`}
      </text>
    </svg>
  );
};
