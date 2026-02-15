/**
 * Refactoring Suggestions Panel
 * Displays AI-powered refactoring suggestions and code improvements
 */

import React, { useState } from 'react';
import {
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export interface RefactoringSuggestion {
  id: string;
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'error';
  category: 'complexity' | 'duplication' | 'naming' | 'structure' | 'performance' | 'best-practice';
  title: string;
  description: string;
  codeSnippet?: string;
  suggestedFix?: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

interface RefactoringSuggestionsProps {
  suggestions: RefactoringSuggestion[];
  onApplySuggestion?: (suggestion: RefactoringSuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
  isLoading?: boolean;
}

const SuggestionCard: React.FC<{
  suggestion: RefactoringSuggestion;
  onApply?: () => void;
  onDismiss?: () => void;
}> = ({ suggestion, onApply, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const severityConfig = {
    info: {
      icon: CheckCircle2,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
    },
  };

  const categoryLabels = {
    complexity: 'Complexity',
    duplication: 'Duplication',
    naming: 'Naming',
    structure: 'Structure',
    performance: 'Performance',
    'best-practice': 'Best Practice',
  };

  const impactColors = {
    low: 'text-slate-600 dark:text-slate-400',
    medium: 'text-amber-600 dark:text-amber-400',
    high: 'text-red-600 dark:text-red-400',
  };

  const config = severityConfig[suggestion.severity];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
      <div
        className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`w-5 h-5 mt-0.5 ${config.color}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-slate-900 dark:text-white">
                  {suggestion.title}
                </h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {categoryLabels[suggestion.category]}
                </span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {suggestion.file}:{suggestion.line}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {suggestion.description}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className={impactColors[suggestion.impact]}>
                  Impact: {suggestion.impact}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Effort: {suggestion.effort}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          {suggestion.codeSnippet && (
            <div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Current Code:
              </div>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto">
                <code>{suggestion.codeSnippet}</code>
              </pre>
            </div>
          )}

          {suggestion.suggestedFix && (
            <div>
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Suggested Fix:
              </div>
              <pre className="bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 p-3 rounded text-xs overflow-x-auto border border-emerald-200 dark:border-emerald-800">
                <code>{suggestion.suggestedFix}</code>
              </pre>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {onApply && (
              <button
                onClick={onApply}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Apply Fix
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const RefactoringSuggestions: React.FC<RefactoringSuggestionsProps> = ({
  suggestions,
  onApplySuggestion,
  onDismiss,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
        <Lightbulb className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No suggestions available</p>
        <p className="text-sm">Your code looks great!</p>
      </div>
    );
  }

  const filteredSuggestions = suggestions.filter((s) => {
    if (filter !== 'all' && s.impact !== filter) return false;
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(suggestions.map((s) => s.category)));
  const highImpactCount = suggestions.filter((s) => s.impact === 'high').length;
  const mediumImpactCount = suggestions.filter((s) => s.impact === 'medium').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {suggestions.length} Suggestions Found
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {highImpactCount} high impact, {mediumImpactCount} medium impact
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'high'
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            High Impact
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'medium'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Medium Impact
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
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {filteredSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onApply={onApplySuggestion ? () => onApplySuggestion(suggestion) : undefined}
            onDismiss={onDismiss ? () => onDismiss(suggestion.id) : undefined}
          />
        ))}
      </div>

      {filteredSuggestions.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No suggestions match the current filters
        </div>
      )}
    </div>
  );
};
