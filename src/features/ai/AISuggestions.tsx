/**
 * G Studio v2.3.0 - AI Suggestions Component
 * 
 * Provides context-aware AI suggestions based on:
 * - Current code context
 * - Conversation history
 * - User patterns
 */

import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Sparkles, Lightbulb, Zap, Code, Bug, Wand2, ChevronRight, X } from 'lucide-react';
import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export interface AISuggestion {
  id: string;
  type: 'code' | 'fix' | 'refactor' | 'explain' | 'generate' | 'optimize';
  title: string;
  description: string;
  confidence: number;  // 0-1
  preview?: string;
  action: string;
  context?: {
    file?: string;
    line?: number;
    selectedText?: string;
  };
}

export interface SuggestionContext {
  currentFile?: string;
  currentCode?: string;
  selectedText?: string;
  cursorPosition?: { line: number; column: number };
  recentMessages?: string[];
  userIntent?: string;
}

interface SuggestionsState {
  suggestions: AISuggestion[];
  isLoading: boolean;
  isVisible: boolean;
  context: SuggestionContext | null;
  
  setSuggestions: (suggestions: AISuggestion[]) => void;
  clearSuggestions: () => void;
  setLoading: (loading: boolean) => void;
  setVisible: (visible: boolean) => void;
  setContext: (context: SuggestionContext) => void;
  generateSuggestions: (context: SuggestionContext) => Promise<void>;
}

// ============================================================================
// SUGGESTIONS STORE
// ============================================================================

export const useSuggestionsStore = create<SuggestionsState>((set, get) => ({
  suggestions: [],
  isLoading: false,
  isVisible: false,
  context: null,

  setSuggestions: (suggestions) => set({ suggestions }),
  clearSuggestions: () => set({ suggestions: [] }),
  setLoading: (isLoading) => set({ isLoading }),
  setVisible: (isVisible) => set({ isVisible }),
  setContext: (context) => set({ context }),

  generateSuggestions: async (context) => {
    set({ isLoading: true, context });
    
    // Simulate AI suggestion generation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const suggestions = generateContextualSuggestions(context);
    set({ suggestions, isLoading: false });
  },
}));

// ============================================================================
// SUGGESTION GENERATION
// ============================================================================

function generateContextualSuggestions(context: SuggestionContext): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  
  // Code-based suggestions
  if (context.currentCode) {
    // Check for common patterns
    if (context.currentCode.includes('console.log')) {
      suggestions.push({
        id: 'remove-console',
        type: 'refactor',
        title: 'Remove console.log statements',
        description: 'Clean up debugging statements before production',
        confidence: 0.9,
        action: 'Remove all console.log statements from this file',
      });
    }
    
    if (context.currentCode.includes('// TODO') || context.currentCode.includes('// FIXME')) {
      suggestions.push({
        id: 'resolve-todos',
        type: 'fix',
        title: 'Resolve TODO comments',
        description: 'Address pending tasks in the code',
        confidence: 0.85,
        action: 'Help me resolve the TODO comments',
      });
    }
    
    // Function length check
    const functionMatches = context.currentCode.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g);
    if (functionMatches && functionMatches.length > 10) {
      suggestions.push({
        id: 'split-file',
        type: 'refactor',
        title: 'Split into smaller modules',
        description: 'This file has many functions. Consider modularizing.',
        confidence: 0.75,
        action: 'Help me split this file into smaller modules',
      });
    }

    // TypeScript-specific
    if (context.currentFile?.endsWith('.ts') || context.currentFile?.endsWith('.tsx')) {
      if (context.currentCode.includes(': any')) {
        suggestions.push({
          id: 'fix-any-types',
          type: 'fix',
          title: 'Replace `any` types',
          description: 'Improve type safety by replacing any with proper types',
          confidence: 0.88,
          action: 'Replace any types with proper TypeScript types',
        });
      }
    }
  }

  // Selection-based suggestions
  if (context.selectedText) {
    suggestions.push({
      id: 'explain-selection',
      type: 'explain',
      title: 'Explain this code',
      description: 'Get a detailed explanation of the selected code',
      confidence: 0.95,
      action: 'Explain this code',
      preview: context.selectedText.substring(0, 100),
    });
    
    suggestions.push({
      id: 'refactor-selection',
      type: 'refactor',
      title: 'Refactor selection',
      description: 'Improve the selected code',
      confidence: 0.8,
      action: 'Refactor this code for better readability',
    });
    
    suggestions.push({
      id: 'generate-tests',
      type: 'generate',
      title: 'Generate tests',
      description: 'Create unit tests for the selected code',
      confidence: 0.85,
      action: 'Generate unit tests for this code',
    });
  }

  // File-type specific suggestions
  if (context.currentFile) {
    const ext = context.currentFile.split('.').pop()?.toLowerCase();
    
    if (ext === 'tsx' || ext === 'jsx') {
      suggestions.push({
        id: 'add-proptypes',
        type: 'generate',
        title: 'Add TypeScript types',
        description: 'Generate proper type definitions for component props',
        confidence: 0.8,
        action: 'Add TypeScript types to this component',
      });
    }
    
    if (ext === 'css' || ext === 'scss') {
      suggestions.push({
        id: 'convert-tailwind',
        type: 'refactor',
        title: 'Convert to Tailwind',
        description: 'Convert CSS to Tailwind utility classes',
        confidence: 0.7,
        action: 'Convert this CSS to Tailwind classes',
      });
    }
  }

  // Always available suggestions
  suggestions.push({
    id: 'optimize-performance',
    type: 'optimize',
    title: 'Optimize performance',
    description: 'Analyze and suggest performance improvements',
    confidence: 0.75,
    action: 'Analyze this code for performance improvements',
  });

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
}

// ============================================================================
// SUGGESTION ICONS
// ============================================================================

const suggestionIcons: Record<AISuggestion['type'], React.FC<{ className?: string }>> = {
  code: Code,
  fix: Bug,
  refactor: Wand2,
  explain: Lightbulb,
  generate: Sparkles,
  optimize: Zap,
};

const suggestionColors: Record<AISuggestion['type'], string> = {
  code: 'text-blue-400 bg-blue-500/10',
  fix: 'text-red-400 bg-red-500/10',
  refactor: 'text-purple-400 bg-purple-500/10',
  explain: 'text-yellow-400 bg-yellow-500/10',
  generate: 'text-green-400 bg-green-500/10',
  optimize: 'text-orange-400 bg-orange-500/10',
};

// ============================================================================
// SUGGESTION ITEM
// ============================================================================

const SuggestionItem: React.FC<{
  suggestion: AISuggestion;
  onApply: (suggestion: AISuggestion) => void;
  isDark: boolean;
}> = memo(({ suggestion, onApply, isDark }) => {
  const Icon = suggestionIcons[suggestion.type];
  const colorClass = suggestionColors[suggestion.type];

  return (
    <button
      onClick={() => onApply(suggestion)}
      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all hover:scale-[1.01] ${
        isDark 
          ? 'hover:bg-slate-700/50' 
          : 'hover:bg-gray-50'
      }`}
    >
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {suggestion.title}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            suggestion.confidence > 0.85 
              ? 'bg-green-500/20 text-green-400' 
              : suggestion.confidence > 0.7
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-500/20 text-gray-400'
          }`}>
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
        <p className={`text-xs mt-0.5 ${
          isDark ? 'text-slate-400' : 'text-gray-500'
        }`}>
          {suggestion.description}
        </p>
        {suggestion.preview && (
          <div className={`mt-2 p-2 rounded text-xs font-mono truncate ${
            isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
          }`}>
            {suggestion.preview}
          </div>
        )}
      </div>
      <ChevronRight className={`w-4 h-4 mt-1 ${
        isDark ? 'text-slate-500' : 'text-gray-400'
      }`} />
    </button>
  );
});

SuggestionItem.displayName = 'SuggestionItem';

// ============================================================================
// AI SUGGESTIONS PANEL
// ============================================================================

export const AISuggestionsPanel: React.FC<{
  isDark?: boolean;
  onApplySuggestion: (action: string) => void;
  onClose?: () => void;
}> = memo(({ isDark = true, onApplySuggestion, onClose }) => {
  const { suggestions, isLoading, isVisible, context, generateSuggestions, setVisible } = useSuggestionsStore();

  const handleApply = useCallback((suggestion: AISuggestion) => {
    onApplySuggestion(suggestion.action);
  }, [onApplySuggestion]);

  const handleRefresh = useCallback(() => {
    if (context) {
      generateSuggestions(context);
    }
  }, [context, generateSuggestions]);

  if (!isVisible) return null;

  return (
    <div className={`rounded-xl shadow-xl border overflow-hidden ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            AI Suggestions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
            } disabled:opacity-50`}
            title="Refresh suggestions"
          >
            <Zap className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Analyzing code...
            </p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-8 ${
            isDark ? 'text-slate-400' : 'text-gray-500'
          }`}>
            <Lightbulb className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-medium">No suggestions yet</p>
            <p className="text-xs mt-1">Select some code or start typing</p>
          </div>
        ) : (
          <div className="py-2">
            {suggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApply}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`px-4 py-2 border-t text-xs ${
        isDark ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'
      }`}>
        Press <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>Ctrl+Space</kbd> for suggestions
      </div>
    </div>
  );
});

AISuggestionsPanel.displayName = 'AISuggestionsPanel';

// ============================================================================
// INLINE SUGGESTION
// ============================================================================

export const InlineSuggestion: React.FC<{
  suggestion: string;
  onAccept: () => void;
  onReject: () => void;
  isDark?: boolean;
}> = memo(({ suggestion, onAccept, onReject, isDark = true }) => {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
      isDark ? 'bg-purple-500/10 text-purple-300' : 'bg-purple-100 text-purple-700'
    }`}>
      <Sparkles className="w-3 h-3" />
      <span className="opacity-60 italic">{suggestion}</span>
      <button
        onClick={onAccept}
        className="ml-1 px-1.5 py-0.5 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30"
      >
        Tab
      </button>
      <button
        onClick={onReject}
        className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
      >
        Esc
      </button>
    </div>
  );
});

InlineSuggestion.displayName = 'InlineSuggestion';

// ============================================================================
// EXPORTS
// ============================================================================

export default AISuggestionsPanel;
