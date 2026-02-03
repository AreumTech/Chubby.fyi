/**
 * Error Boundary for Quickstart Wizard
 * 
 * Gracefully handles errors during the onboarding process
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui';
import { H2, Body, Caption } from '@/components/ui/Typography';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class QuickstartErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Quickstart Error', 'ERROR', error, errorInfo);
    this.setState({ errorInfo });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleRestart = () => {
    // Clear any stored quickstart data and refresh
    localStorage.removeItem('quickstart-data');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto p-6 text-center">
          <div className="text-6xl mb-4">😕</div>
          <H2 className="mb-2">
            {this.props.fallbackTitle || 'Oops! Something went wrong'}
          </H2>
          <Body color="secondary" className="mb-6">
            {this.props.fallbackMessage ||
             'We encountered an issue while setting up your FIRE plan. Don\'t worry, your data is safe.'}
          </Body>

          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={this.handleRetry}
              className="w-full"
            >
              Try Again
            </Button>

            <Button
              variant="secondary"
              onClick={this.handleRestart}
              className="w-full"
            >
              Start Over
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left">
              <Caption
                as="summary"
                color="tertiary"
                className="cursor-pointer hover:text-gray-700"
              >
                Debug Info
              </Caption>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-red-600 overflow-auto">
                <Caption as="span" className="text-red-600">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Caption>
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}