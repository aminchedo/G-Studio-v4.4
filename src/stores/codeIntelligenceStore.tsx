/**
 * Code Intelligence Store
 * Manages state for code intelligence features including settings, cache, and UI state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface CodeMetrics {
  linesOfCode: number;
  numberOfFiles: number;
  numberOfFunctions: number;
  numberOfClasses: number;
  averageComplexity: number;
  maxComplexity: number;
  maintainabilityIndex: number;
  technicalDebtRatio: number;
  duplicationPercentage: number;
  testCoverage: number;
}

export interface AnalysisResults {
  timestamp: Date;
  metrics: CodeMetrics;
  breakingChanges: number;
  impactedFiles: number;
  suggestions: number;
  qualityScore: number;
}

export interface CodeIntelligenceSettings {
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  enableRealTime: boolean;
  filePatterns: string[];
  excludePatterns: string[];
  showMetrics: boolean;
  showSuggestions: boolean;
  showTimeline: boolean;
  exportFormat: 'json' | 'csv' | 'markdown' | 'html';
}

export interface CodeIntelligenceUI {
  activeTab: 'overview' | 'metrics' | 'dependencies' | 'timeline' | 'suggestions' | 'settings';
  expandedSections: string[];
  selectedFile: string | null;
  isAnalyzing: boolean;
  lastError: string | null;
}

interface CodeIntelligenceState {
  // Settings
  settings: CodeIntelligenceSettings;
  
  // Results Cache
  lastAnalysis: AnalysisResults | null;
  
  // UI State
  ui: CodeIntelligenceUI;
  
  // Actions - Settings
  updateSettings: (settings: Partial<CodeIntelligenceSettings>) => void;
  resetSettings: () => void;
  
  // Actions - Results
  cacheResults: (results: AnalysisResults) => void;
  clearCache: () => void;
  
  // Actions - UI
  setActiveTab: (tab: CodeIntelligenceUI['activeTab']) => void;
  toggleSection: (section: string) => void;
  setSelectedFile: (file: string | null) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
}

// Default settings
const defaultSettings: CodeIntelligenceSettings = {
  autoRefresh: false,
  refreshInterval: 30,
  enableRealTime: false,
  filePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
  showMetrics: true,
  showSuggestions: true,
  showTimeline: true,
  exportFormat: 'json',
};

// Default UI state
const defaultUI: CodeIntelligenceUI = {
  activeTab: 'overview',
  expandedSections: ['metrics', 'dependencies'],
  selectedFile: null,
  isAnalyzing: false,
  lastError: null,
};

// Create store with persistence
export const useCodeIntelligenceStore = create<CodeIntelligenceState>()(
  persist(
    (set) => ({
      // Initial state
      settings: defaultSettings,
      lastAnalysis: null,
      ui: defaultUI,
      
      // Settings actions
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      
      resetSettings: () =>
        set({ settings: defaultSettings }),
      
      // Results actions
      cacheResults: (results) =>
        set({ lastAnalysis: results }),
      
      clearCache: () =>
        set({ lastAnalysis: null }),
      
      // UI actions
      setActiveTab: (tab) =>
        set((state) => ({
          ui: { ...state.ui, activeTab: tab },
        })),
      
      toggleSection: (section) =>
        set((state) => ({
          ui: {
            ...state.ui,
            expandedSections: state.ui.expandedSections.includes(section)
              ? state.ui.expandedSections.filter((s) => s !== section)
              : [...state.ui.expandedSections, section],
          },
        })),
      
      setSelectedFile: (file) =>
        set((state) => ({
          ui: { ...state.ui, selectedFile: file },
        })),
      
      setAnalyzing: (isAnalyzing) =>
        set((state) => ({
          ui: { ...state.ui, isAnalyzing },
        })),
      
      setError: (error) =>
        set((state) => ({
          ui: { ...state.ui, lastError: error },
        })),
    }),
    {
      name: 'code-intelligence-storage',
      partialize: (state) => ({
        settings: state.settings,
        lastAnalysis: state.lastAnalysis,
      }),
    }
  )
);

// Selectors for easy access
export const useCodeIntelligenceSettings = () =>
  useCodeIntelligenceStore((state) => state.settings);

export const useCodeIntelligenceResults = () =>
  useCodeIntelligenceStore((state) => state.lastAnalysis);

export const useCodeIntelligenceUI = () =>
  useCodeIntelligenceStore((state) => state.ui);

export const useCodeIntelligenceActions = () =>
  useCodeIntelligenceStore((state) => ({
    updateSettings: state.updateSettings,
    resetSettings: state.resetSettings,
    cacheResults: state.cacheResults,
    clearCache: state.clearCache,
    setActiveTab: state.setActiveTab,
    toggleSection: state.toggleSection,
    setSelectedFile: state.setSelectedFile,
    setAnalyzing: state.setAnalyzing,
    setError: state.setError,
  }));
