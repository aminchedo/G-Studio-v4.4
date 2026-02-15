/**
 * Error History Panel
 * Display and manage error history with filtering and export
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useErrorManager } from '@/services/errorHandling/ErrorManager';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

interface ErrorHistoryPanelProps {
  onClose?: () => void;
}

export const ErrorHistoryPanel: React.FC<ErrorHistoryPanelProps> = ({ onClose }) => {
  const {
    errors,
    unresolvedErrors,
    resolveError,
    clearErrors,
    clearResolvedErrors,
    statistics,
    exportToJSON,
  } = useErrorManager();

  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredErrors = errors.filter((entry) => {
    if (filter === 'unresolved' && entry.resolved) return false;
    if (filter === 'resolved' && !entry.resolved) return false;
    if (categoryFilter !== 'all' && entry.error.category !== categoryFilter) return false;
    return true;
  });

  const handleExport = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-history-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = Array.from(new Set(errors.map((e) => e.error.category)));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Error History</h2>
              <p className="text-sm text-red-100">
                {statistics.total} total errors, {statistics.unresolved} unresolved
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Errors</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {statistics.total}
          </div>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-xs text-red-600 dark:text-red-400 mb-1">Unresolved</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {statistics.unresolved}
          </div>
        </div>
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Resolved</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {statistics.resolved}
          </div>
        </div>
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Avg Retries</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {statistics.averageRetries.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
        <Filter className="w-5 h-5 text-slate-500" />
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            All ({statistics.total})
          </button>
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unresolved'
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Unresolved ({statistics.unresolved})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'resolved'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Resolved ({statistics.resolved})
          </button>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-none"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.toUpperCase()}
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={clearResolvedErrors}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Resolved
          </button>
          <button
            onClick={clearErrors}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Error List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <CheckCircle className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No errors to display</p>
            <p className="text-sm">
              {filter === 'all'
                ? 'Your application is running smoothly!'
                : filter === 'unresolved'
                ? 'All errors have been resolved!'
                : 'No resolved errors in history'}
            </p>
          </div>
        ) : (
          filteredErrors.map((entry) => (
            <div key={entry.error.id} className="relative">
              {entry.resolved && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Resolved
                  </div>
                </div>
              )}
              <ErrorDisplay
                error={entry.error}
                onDismiss={() => resolveError(entry.error.id)}
              />
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 px-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {entry.error.timestamp.toLocaleString()}
                </div>
                {entry.retryCount > 0 && (
                  <div className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {entry.retryCount} retries
                  </div>
                )}
                {entry.resolvedAt && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Resolved at {entry.resolvedAt.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category Breakdown */}
      {statistics.total > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-white">
              Error Breakdown
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(statistics.byCategory).map(([category, count]) => (
              <div
                key={category}
                className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
              >
                <div className="text-xs text-slate-600 dark:text-slate-400 uppercase">
                  {category}
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
