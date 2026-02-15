/**
 * Error Display Component
 * Beautiful, user-friendly error presentation with recovery options
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  X,
  Copy,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PresentableError } from '@/services/errorHandling/ErrorPresentation';

interface ErrorDisplayProps {
  error: PresentableError;
  onDismiss?: () => void;
  onAction?: () => void;
  onRetry?: () => void;
  compact?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onAction,
  onRetry,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const severityConfig = {
    info: {
      icon: Info,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
    },
    critical: {
      icon: XCircle,
      color: 'text-red-700 dark:text-red-300',
      bg: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-300 dark:border-red-700',
      iconBg: 'bg-red-200 dark:bg-red-900/50',
    },
  };

  const config = severityConfig[error.severity];
  const Icon = config.icon;

  const handleCopy = () => {
    const text = error.reporting.copyToClipboard();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${config.border} ${config.bg}`}>
        <Icon className={`w-5 h-5 ${config.color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {error.title}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
            {error.message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden shadow-lg`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.iconBg} flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {error.title}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  {error.message}
                </p>
              </div>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              )}
            </div>

            {/* Suggestion */}
            {error.suggestion && (
              <div className="mt-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  💡 <span className="font-medium">Suggestion:</span> {error.suggestion}
                </p>
              </div>
            )}

            {/* Location (for code errors) */}
            {error.location && (
              <div className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">File:</span>
                  <span>{error.location.file}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-400">Line:</span>
                  <span>{error.location.line}:{error.location.column}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {error.action && (onAction || error.actionCallback) && (
                <button
                  onClick={onAction || error.actionCallback}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    error.severity === 'critical' || error.severity === 'error'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {error.action}
                </button>
              )}

              {error.recovery.autoRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              )}

              {error.helpLink && (
                <a
                  href={error.helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Help
                </a>
              )}

              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Details'}
              </button>

              {error.stack && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isExpanded ? 'Hide' : 'Show'} Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stack Trace (expandable) */}
      {isExpanded && error.stack && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-900">
          <div className="text-xs font-medium text-slate-400 mb-2">Stack Trace:</div>
          <pre className="text-xs text-slate-300 overflow-x-auto">
            {error.stack.join('\n')}
          </pre>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {error.category.toUpperCase()} • {error.timestamp.toLocaleTimeString()}
          </span>
          {error.recovery.autoRetry && (
            <span>
              Auto-retry: {error.recovery.maxRetries} attempts
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Error Toast Component (for notifications)
export const ErrorToast: React.FC<ErrorDisplayProps> = (props) => {
  return (
    <div className="animate-slide-in-right">
      <ErrorDisplay {...props} compact />
    </div>
  );
};
