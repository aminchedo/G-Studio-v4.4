/**
 * EnhancedErrorDisplay Component - User-Friendly Error Messages
 * Provides actionable error messages with recovery suggestions
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Wifi,
  Key,
  DollarSign,
  Info,
} from 'lucide-react';

export interface ErrorCategory {
  type: 'api' | 'network' | 'code' | 'validation' | 'unknown';
  severity: 'error' | 'warning' | 'info';
}

export interface ErrorAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

export interface EnhancedError {
  id: string;
  title: string;
  message: string;
  category: ErrorCategory;
  timestamp: Date;
  details?: string;
  stackTrace?: string;
  actions?: ErrorAction[];
  helpLink?: string;
  retryable?: boolean;
  autoRetry?: {
    enabled: boolean;
    delay: number;
    maxAttempts: number;
    currentAttempt: number;
  };
}

export interface EnhancedErrorDisplayProps {
  error: EnhancedError;
  onDismiss?: () => void;
  onRetry?: () => void;
  onCopyDetails?: () => void;
  compact?: boolean;
}

export const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  onCopyDetails,
  compact = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showStackTrace, setShowStackTrace] = useState(false);

  const getCategoryIcon = () => {
    switch (error.category.type) {
      case 'api':
        return <Key className="w-5 h-5" />;
      case 'network':
        return <Wifi className="w-5 h-5" />;
      case 'code':
        return <AlertTriangle className="w-5 h-5" />;
      case 'validation':
        return <Info className="w-5 h-5" />;
      default:
        return <XCircle className="w-5 h-5" />;
    }
  };

  const getSeverityColor = () => {
    switch (error.category.severity) {
      case 'error':
        return 'bg-red-900/30 border-red-800 text-red-200';
      case 'warning':
        return 'bg-yellow-900/30 border-yellow-800 text-yellow-200';
      case 'info':
        return 'bg-blue-900/30 border-blue-800 text-blue-200';
    }
  };

  const getIconColor = () => {
    switch (error.category.severity) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
    }
  };

  const handleCopyDetails = () => {
    const details = `
Error: ${error.title}
Message: ${error.message}
Category: ${error.category.type}
Severity: ${error.category.severity}
Timestamp: ${error.timestamp.toISOString()}
${error.details ? `\nDetails: ${error.details}` : ''}
${error.stackTrace ? `\nStack Trace:\n${error.stackTrace}` : ''}
    `.trim();

    navigator.clipboard.writeText(details);
    onCopyDetails?.();
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 border rounded-lg ${getSeverityColor()}`}>
        <div className={`flex-shrink-0 ${getIconColor()}`}>
          {getCategoryIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{error.title}</p>
          <p className="text-xs opacity-75 truncate">{error.message}</p>
        </div>
        {error.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 p-2 hover:bg-black/20 rounded transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-2 hover:bg-black/20 rounded transition-colors"
            title="Dismiss"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${getSeverityColor()}`}>
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`flex-shrink-0 mt-0.5 ${getIconColor()}`}>
          {getCategoryIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold">{error.title}</h3>
            <span className="text-xs opacity-60 flex-shrink-0">
              {error.timestamp.toLocaleTimeString()}
            </span>
          </div>
          
          <p className="text-sm opacity-90 mb-3">{error.message}</p>

          {/* Auto Retry Info */}
          {error.autoRetry?.enabled && (
            <div className="flex items-center gap-2 text-xs opacity-75 mb-3">
              <Clock className="w-3 h-3" />
              <span>
                Auto-retry {error.autoRetry.currentAttempt}/{error.autoRetry.maxAttempts} in{' '}
                {error.autoRetry.delay / 1000}s
              </span>
            </div>
          )}

          {/* Actions */}
          {error.actions && error.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {error.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    action.primary
                      ? 'bg-white/20 hover:bg-white/30 font-medium'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Help Link */}
          {error.helpLink && (
            <a
              href={error.helpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs hover:underline opacity-75 hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="w-3 h-3" />
              Learn more
            </a>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-black/20 rounded transition-colors"
            title="Dismiss"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Details Section */}
      {error.details && (
        <div className="border-t border-current/20">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-black/10 transition-colors text-sm"
          >
            <span>Details</span>
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showDetails && (
            <div className="px-4 py-3 bg-black/20">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {error.details}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Stack Trace Section */}
      {error.stackTrace && (
        <div className="border-t border-current/20">
          <button
            onClick={() => setShowStackTrace(!showStackTrace)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-black/10 transition-colors text-sm"
          >
            <span>Stack Trace</span>
            {showStackTrace ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showStackTrace && (
            <div className="px-4 py-3 bg-black/20">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {error.stackTrace}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/10 border-t border-current/20">
        <button
          onClick={handleCopyDetails}
          className="flex items-center gap-1 text-xs hover:underline opacity-75 hover:opacity-100 transition-opacity"
        >
          <Copy className="w-3 h-3" />
          Copy error details
        </button>
        
        {error.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

// Error History Panel
export interface ErrorHistoryPanelProps {
  errors: EnhancedError[];
  onClearAll?: () => void;
  onDismiss?: (errorId: string) => void;
  maxErrors?: number;
}

export const ErrorHistoryPanel: React.FC<ErrorHistoryPanelProps> = ({
  errors,
  onClearAll,
  onDismiss,
  maxErrors = 50,
}) => {
  const displayErrors = errors.slice(0, maxErrors);

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white">Error History</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{errors.length} errors</span>
          {errors.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Error List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayErrors.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No errors recorded</p>
          </div>
        ) : (
          displayErrors.map((error) => (
            <EnhancedErrorDisplay
              key={error.id}
              error={error}
              onDismiss={() => onDismiss?.(error.id)}
              compact
            />
          ))
        )}
      </div>
    </div>
  );
};

// Utility function to create user-friendly errors
export const createUserFriendlyError = (
  rawError: Error,
  context?: string
): EnhancedError => {
  const errorMessage = rawError.message.toLowerCase();
  
  // API Rate Limit
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return {
      id: crypto.randomUUID(),
      title: 'Too Many Requests',
      message: 'You\'ve sent too many requests. Please wait a moment before trying again.',
      category: { type: 'api', severity: 'warning' },
      timestamp: new Date(),
      details: rawError.message,
      stackTrace: rawError.stack,
      retryable: true,
      autoRetry: {
        enabled: true,
        delay: 60000,
        maxAttempts: 3,
        currentAttempt: 1,
      },
      actions: [
        {
          label: 'Wait 60 seconds',
          action: () => {},
          primary: true,
        },
      ],
      helpLink: 'https://docs.example.com/rate-limits',
    };
  }

  // API Unauthorized
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return {
      id: crypto.randomUUID(),
      title: 'Invalid API Key',
      message: 'Your API key is invalid or expired. Please check your settings.',
      category: { type: 'api', severity: 'error' },
      timestamp: new Date(),
      details: rawError.message,
      actions: [
        {
          label: 'Update API Key',
          action: () => {
            // Open settings
          },
          primary: true,
        },
      ],
      helpLink: 'https://docs.example.com/api-keys',
    };
  }

  // Network Error
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      id: crypto.randomUUID(),
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      category: { type: 'network', severity: 'error' },
      timestamp: new Date(),
      details: rawError.message,
      retryable: true,
      actions: [
        {
          label: 'Retry',
          action: () => {},
          primary: true,
        },
      ],
    };
  }

  // Generic Error
  return {
    id: crypto.randomUUID(),
    title: 'An Error Occurred',
    message: rawError.message || 'Something went wrong. Please try again.',
    category: { type: 'unknown', severity: 'error' },
    timestamp: new Date(),
    details: context,
    stackTrace: rawError.stack,
    retryable: true,
  };
};
