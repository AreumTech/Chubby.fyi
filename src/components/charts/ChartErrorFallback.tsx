import React from 'react';
import { H4, BodyBase, Label, Caption } from '@/components/ui/Typography';

interface ChartErrorFallbackProps {
  error: Error;
  retry: () => void;
}

export const ChartErrorFallback: React.FC<ChartErrorFallbackProps> = ({ error, retry }) => {
  return (
    <div className="min-h-[350px] flex items-center justify-center bg-gray-900 rounded-lg">
      <div className="max-w-md w-full p-6 text-center">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-500/20 rounded-full mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        
        <H4 color="inverse" weight="semibold" className="mb-2">Chart Error</H4>
        <BodyBase className="text-gray-300 mb-4">
          The chart failed to render. This might be due to invalid data or a rendering issue.
        </BodyBase>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer">
              <BodyBase as="span" className="text-gray-400">Error details</BodyBase>
            </summary>
            <Caption as="pre" className="mt-2 text-red-400 bg-red-900/20 p-2 rounded overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </Caption>
          </details>
        )}
        
        <div className="flex space-x-3">
          <button
            onClick={retry}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Label weight="medium">Retry Chart</Label>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <Label weight="medium">Reload Page</Label>
          </button>
        </div>
        
        <Caption color="tertiary" className="mt-3">
          If this error persists, try refreshing the page or running a new simulation.
        </Caption>
      </div>
    </div>
  );
};