import React from 'react';

interface ChartPlaceholderProps {
  message: string;
  className?: string;
}

export const ChartPlaceholder: React.FC<ChartPlaceholderProps> = ({ message, className = '' }) => {
  return (
    <div
      className={`flex justify-center items-center h-full min-h-[160px] text-text-placeholder italic border border-dashed border-border-color rounded bg-bg-primary ${className}`}
    >
      {message}
    </div>
  );
};