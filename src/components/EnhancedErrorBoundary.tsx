import React, { Component, ReactNode } from 'react';
import { handleError } from '@/utils/notifications';
import { productionErrorMonitoring } from '../services/productionErrorMonitoring';
import { logger } from '@/utils/logger';
import { H4, BodyBase, Caption, MonoSmall } from '@/components/ui/Typography';

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    errorInfo: ErrorInfo | null;
    errorId: string | null;
  }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string; // Context description for better error reporting
}

interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  context?: string;
}

export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const enhancedErrorInfo: ErrorInfo = {
      componentStack: errorInfo.componentStack || '',
      errorBoundary: this.props.context || 'EnhancedErrorBoundary'
    };

    this.setState({
      error,
      errorInfo: enhancedErrorInfo
    });

    // Call custom error handler
    this.props.onError?.(error, enhancedErrorInfo);

    // Report to production error monitoring
    productionErrorMonitoring.captureError({
      error: error.message,
      stack: error.stack,
      context: `React Error Boundary: ${enhancedErrorInfo.componentStack}`,
      severity: 'critical'
    });

    // Report to error service with context
    const context = this.props.context
      ? `React Error Boundary (${this.props.context})`
      : 'React Error Boundary';

    handleError(error, context, 'A React component crashed unexpectedly');

    // Log detailed error information for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.error('React Error Boundary Caught Error', 'ERROR');
      logger.error('Error details', 'ERROR', error);
      logger.error('Component Stack', 'ERROR', enhancedErrorInfo.componentStack);
    }
  }

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback: FallbackComponent } = this.props;

    if (hasError && error) {
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            errorId={errorId}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          context={this.props.context}
        />
      );
    }

    return children;
  }
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  context
}) => {
  const handleReportIssue = () => {
    const issueBody = encodeURIComponent(`
**Error Report:**
- Error ID: ${errorId || 'N/A'}
- Context: ${context || 'Unknown'}
- Message: ${error.message}
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}
- Timestamp: ${new Date().toISOString()}

**Component Stack:**
\`\`\`
${errorInfo?.componentStack || 'N/A'}
\`\`\`

**Error Stack:**
\`\`\`
${error.stack || 'N/A'}
\`\`\`

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Additional Context:**

    `.trim());
    
    const issueUrl = `https://github.com/your-org/pathfinder-pro/issues/new?title=${encodeURIComponent(`Bug Report: Component Error - ${error.message}`)}&body=${issueBody}`;
    window.open(issueUrl, '_blank');
  };


  return (
    <div className="min-h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <div className="text-center">
          <H4 className="mb-2">
            Component Error
          </H4>
          <BodyBase color="secondary" className="mb-4">
            {context
              ? `An error occurred in the ${context} component.`
              : 'A component encountered an unexpected error.'
            }
          </BodyBase>

          {errorId && (
            <Caption color="tertiary" className="mb-4">
              Error ID: {errorId}
            </Caption>
          )}
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-4 text-left">
              <summary className="cursor-pointer hover:text-gray-700">
                <BodyBase color="tertiary" as="span">Technical Details</BodyBase>
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded border">
                <Caption weight="medium" className="mb-1">Error Message:</Caption>
                <MonoSmall color="danger" className="mb-3 break-words">{error.message}</MonoSmall>

                {error.stack && (
                  <>
                    <Caption weight="medium" className="mb-1">Stack Trace:</Caption>
                    <pre className="bg-white p-2 rounded border overflow-auto max-h-32">
                      <MonoSmall color="secondary">{error.stack}</MonoSmall>
                    </pre>
                  </>
                )}
              </div>
            </details>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <BodyBase color="inverse" weight="medium" as="span">Reload Page</BodyBase>
            </button>

            <button
              onClick={handleReportIssue}
              className="w-full hover:text-gray-700 underline transition-colors"
            >
              <BodyBase color="tertiary" as="span">Report this issue</BodyBase>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default EnhancedErrorBoundary;