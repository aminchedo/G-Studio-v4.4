/**
 * ErrorBoundary Component
 * 
 * Catches errors in child components and prevents the entire app from crashing.
 * Displays a user-friendly error message and provides recovery options.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Optional: Send error to logging service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    // Reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 p-6">
          <div className="max-w-2xl w-full bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-red-900/30 border-b border-red-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <div>
                  <h2 className="text-lg font-semibold text-red-200">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-red-300 mt-1">
                    {this.props.componentName 
                      ? `An error occurred in the ${this.props.componentName} component`
                      : 'An unexpected error occurred'}
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Error Message:</h3>
                <div className="bg-slate-900 rounded p-3 border border-slate-700">
                  <code className="text-xs text-red-400 font-mono">
                    {this.state.error?.message || 'Unknown error'}
                  </code>
                </div>
              </div>

              {/* Stack Trace (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Stack Trace:</h3>
                  <div className="bg-slate-900 rounded p-3 border border-slate-700 max-h-48 overflow-auto">
                    <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              <div className="bg-blue-900/20 border border-blue-800 rounded p-4 mb-4">
                <h3 className="text-sm font-medium text-blue-200 mb-2">What you can do:</h3>
                <ul className="text-xs text-blue-300 space-y-1 list-disc list-inside">
                  <li>Try refreshing the page</li>
                  <li>Check your internet connection</li>
                  <li>Clear your browser cache</li>
                  <li>If the problem persists, contact support</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-slate-900 border-t border-slate-700 flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Home className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper
 * Use this for functional components
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary componentName={componentName}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `WithErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
};

export default ErrorBoundary;
