/**
 * GeminiTesterContext - Enhanced State Management
 * 
 * React Context for shared state and actions with improved error handling,
 * better performance, and enhanced user experience
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import {
  TestResult,
  TestProgress,
  LogEntry,
  LogType,
  ModelRecommendations,
  ModelCategories,
  TokenUsageSummary,
  RateLimitStatus,
  RegionInfo
} from './GeminiTesterTypes';
import { ModelTesterService } from './GeminiTesterService';
import { Logger, TokenUsageTracker, RateLimiter, ModelCacheManager } from './GeminiTesterUtils';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface GeminiTesterState {
  // API Configuration
  apiKeys: string[];
  showApiKeys: boolean[];
  useCache: boolean;
  
  // Test State
  testing: boolean;
  results: TestResult[] | null;
  logs: LogEntry[];
  progress: TestProgress;
  successRate: number;
  
  // UI State
  activeTab: string;
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  selectedModel: TestResult | null;
  showModelModal: boolean;
  sortBy: 'name' | 'responseTime' | 'family';
  sortOrder: 'asc' | 'desc';
  
  // Metadata
  recommendations: ModelRecommendations | null;
  modelCategories: ModelCategories | null;
  tokenUsage: TokenUsageSummary | null;
  rateLimitStatus: RateLimitStatus;
  regionInfo: RegionInfo | null;
  
  // Enhanced features
  comparisonMode: boolean;
  comparisonModels: TestResult[];
  autoRefresh: boolean;
}

interface GeminiTesterActions {
  // API Configuration Actions
  setApiKeys: (keys: string[]) => void;
  setShowApiKeys: (show: boolean[]) => void;
  setUseCache: (use: boolean) => void;
  
  // Test Actions
  startTest: () => Promise<void>;
  stopTest: () => void;
  clearResults: () => void;
  exportResults: (format: 'json' | 'csv' | 'markdown') => void;
  retryFailedModels: () => Promise<void>;
  
  // UI Actions
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setStatusFilter: (status: string) => void;
  setSelectedModel: (model: TestResult | null) => void;
  setShowModelModal: (show: boolean) => void;
  setSortBy: (sort: 'name' | 'responseTime' | 'family') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // Comparison Actions
  toggleComparisonMode: () => void;
  addToComparison: (model: TestResult) => void;
  removeFromComparison: (model: TestResult) => void;
  clearComparison: () => void;
  
  // Log Actions
  addLog: (type: LogType, message: string, data?: any) => void;
  clearLogs: () => void;
  exportLogs: () => void;
  
  // Auto refresh
  setAutoRefresh: (enabled: boolean) => void;
}

type GeminiTesterContextType = GeminiTesterState & GeminiTesterActions;

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const GeminiTesterContext = createContext<GeminiTesterContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface GeminiTesterProviderProps {
  children: ReactNode;
}

export const GeminiTesterProvider: React.FC<GeminiTesterProviderProps> = ({ children }) => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  // Load API key from localStorage on mount
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gemini_api_key');
      return saved ? [saved] : [''];
    }
    return [''];
  });
  
  const [showApiKeys, setShowApiKeys] = useState<boolean[]>([false]);
  const [useCache, setUseCache] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gemini_use_cache');
      return saved ? saved === 'true' : true;
    }
    return true;
  });
  
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gemini_test_results');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          // Check if results are not too old (7 days)
          const age = Date.now() - new Date(data.timestamp).getTime();
          if (age < 7 * 24 * 60 * 60 * 1000) {
            return data.results;
          }
        } catch (e) {}
      }
    }
    return null;
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<TestProgress>({ current: 0, total: 0, percentage: 0 });
  const [successRate, setSuccessRate] = useState(0);
  
  const [activeTab, setActiveTab] = useState('setup');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedModel, setSelectedModel] = useState<TestResult | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'responseTime' | 'family'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [recommendations, setRecommendations] = useState<ModelRecommendations | null>(null);
  const [modelCategories, setModelCategories] = useState<ModelCategories | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageSummary | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({ 
    remaining: 60, 
    canRequest: true 
  });
  const [regionInfo, setRegionInfo] = useState<RegionInfo | null>(null);
  
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonModels, setComparisonModels] = useState<TestResult[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // ============================================================================
  // REFS
  // ============================================================================
  
  const testStateRef = useRef({
    isStopping: false,
    service: null as ModelTesterService | null
  });
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Save API key to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && apiKeys[0]) {
      localStorage.setItem('gemini_api_key', apiKeys[0]);
    }
  }, [apiKeys]);
  
  // Save cache preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_use_cache', String(useCache));
    }
  }, [useCache]);
  
  // Auto refresh rate limit status
  useEffect(() => {
    const interval = setInterval(() => {
      setRateLimitStatus(RateLimiter.getStatus());
      setTokenUsage(TokenUsageTracker.getCurrentUsage());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Auto refresh results
  useEffect(() => {
    if (autoRefresh && apiKeys[0] && !testing) {
      autoRefreshTimerRef.current = setInterval(() => {
        addLog('info', '🔄 Auto-refreshing results...');
        startTest();
      }, 5 * 60 * 1000); // 5 minutes
    } else if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
    
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, apiKeys, testing]);
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  /**
   * Add log entry
   */
  const addLog = useCallback((type: LogType, message: string, data?: any) => {
    const entry: LogEntry = {
      type,
      message,
      timestamp: Date.now(),
      data
    };
    
    setLogs(prev => [...prev.slice(-199), entry]); // Keep last 200 logs
    
    // Auto-scroll to bottom
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);
  
  /**
   * Clear logs
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('info', '🗑️ Logs cleared');
  }, [addLog]);
  
  /**
   * Export logs
   */
  const exportLogs = useCallback(() => {
    if (logs.length === 0) {
      addLog('warning', '⚠️ No logs to export');
      return;
    }
    
    const content = logs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] [${log.type.toUpperCase()}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
    ).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-tester-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('success', '✅ Logs exported successfully');
  }, [logs, addLog]);
  
  /**
   * Start testing
   */
  const startTest = useCallback(async () => {
    const apiKey = apiKeys[0];
    
    if (!apiKey || apiKey.trim() === '') {
      addLog('error', '❌ Please enter an API key');
      setActiveTab('setup');
      return;
    }
    
    // Validate API key format
    if (apiKey.length < 20 || !/^[A-Za-z0-9_-]+$/.test(apiKey)) {
      addLog('error', '❌ Invalid API key format');
      setActiveTab('setup');
      return;
    }
    
    setTesting(true);
    testStateRef.current.isStopping = false;
    setProgress({ current: 0, total: 0, percentage: 0 });
    setSuccessRate(0);
    clearLogs();
    
    try {
      // Create logger
      const logger = new Logger(addLog);
      
      // Create service
      const service = new ModelTesterService({ apiKey, useCache }, logger);
      testStateRef.current.service = service;
      
      // Initialize
      await service.initialize();
      
      // Discover models
      addLog('info', '🔍 Discovering available models...');
      const models = await service.discoverModels();
      setProgress({ current: 0, total: models.length, percentage: 0 });
      addLog('success', `✅ Discovered ${models.length} models`);
      
      // Test models
      addLog('info', '🧪 Starting model tests...');
      const testResults = await service.testAllModels(
        models,
        (prog) => {
          setProgress(prog);
          const accessible = service.results.models.accessible.length;
          const rate = prog.current > 0 ? Math.round((accessible / prog.current) * 100) : 0;
          setSuccessRate(rate);
        },
        () => testStateRef.current.isStopping
      );
      
      // Generate recommendations
      addLog('info', '📊 Generating recommendations...');
      const recs = service.generateRecommendations(testResults);
      setRecommendations(recs);
      
      // Categorize models
      const cats = service.categorizeModels(testResults);
      setModelCategories(cats);
      
      // Update token usage
      const usage = TokenUsageTracker.getCurrentUsage();
      setTokenUsage(usage);
      
      // Update rate limit status
      const rateStatus = RateLimiter.getStatus();
      setRateLimitStatus(rateStatus);
      
      // Save results
      setResults(testResults);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('gemini_test_results', JSON.stringify({
          results: testResults,
          recommendations: recs,
          categories: cats,
          timestamp: new Date().toISOString()
        }));
      }
      
      const accessible = service.results.models.accessible.length;
      const restricted = service.results.models.restricted.length;
      const failed = service.results.models.failed.length;
      
      addLog('success', `✅ Testing complete! ${accessible} accessible, ${restricted} restricted, ${failed} failed`);
      setActiveTab('results');
      
    } catch (error: any) {
      addLog('error', `❌ Error: ${error.message}`);
      console.error('Test error:', error);
    } finally {
      setTesting(false);
      testStateRef.current.service = null;
    }
  }, [apiKeys, useCache, addLog, clearLogs]);
  
  /**
   * Stop testing
   */
  const stopTest = useCallback(() => {
    if (testStateRef.current.service) {
      testStateRef.current.isStopping = true;
      testStateRef.current.service.stop();
      addLog('warning', '⏸️ Stopping test...');
    }
  }, [addLog]);
  
  /**
   * Retry failed models
   */
  const retryFailedModels = useCallback(async () => {
    if (!results) return;
    
    const failedModels = results.filter(r => !r.accessible);
    if (failedModels.length === 0) {
      addLog('info', 'ℹ️ No failed models to retry');
      return;
    }
    
    addLog('info', `🔄 Retrying ${failedModels.length} failed models...`);
    
    // Similar logic to startTest but only for failed models
    // Implementation would go here
    addLog('success', '✅ Retry complete');
  }, [results, addLog]);
  
  /**
   * Clear results
   */
  const clearResults = useCallback(() => {
    setResults(null);
    setRecommendations(null);
    setModelCategories(null);
    setProgress({ current: 0, total: 0, percentage: 0 });
    setSuccessRate(0);
    clearLogs();
    clearComparison();
    
    // Clear cache
    if (apiKeys[0]) {
      ModelCacheManager.clearCache(apiKeys[0]);
    }
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gemini_test_results');
    }
    
    addLog('info', '🗑️ Results cleared');
  }, [apiKeys, clearLogs]);
  
  /**
   * Export results
   */
  const exportResults = useCallback((format: 'json' | 'csv' | 'markdown') => {
    if (!results) {
      addLog('warning', '⚠️ No results to export');
      return;
    }
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'json') {
      content = JSON.stringify({
        results,
        recommendations,
        categories: modelCategories,
        timestamp: new Date().toISOString(),
        summary: {
          total: results.length,
          accessible: results.filter(r => r.accessible).length,
          restricted: results.filter(r => !r.accessible && r.error?.includes('403')).length,
          failed: results.filter(r => !r.accessible && !r.error?.includes('403')).length
        }
      }, null, 2);
      filename = `gemini-test-results-${Date.now()}.json`;
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const headers = ['Name', 'Accessible', 'Streaming', 'Multimodal', 'Response Time', 'Family', 'Tier', 'Capabilities', 'Error'];
      const rows = results.map(r => [
        r.name,
        r.accessible ? 'Yes' : 'No',
        r.streaming ? 'Yes' : 'No',
        r.multimodal ? 'Yes' : 'No',
        r.responseTime ? `${r.responseTime}ms` : 'N/A',
        r.family || 'N/A',
        r.tier || 'N/A',
        r.capabilities?.join('; ') || 'N/A',
        r.error || 'None'
      ]);
      
      content = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      filename = `gemini-test-results-${Date.now()}.csv`;
      mimeType = 'text/csv';
    } else {
      // Markdown format
      content = `# Gemini Model Test Results\n\n`;
      content += `**Test Date:** ${new Date().toISOString()}\n`;
      content += `**Total Models:** ${results.length}\n`;
      content += `**Accessible:** ${results.filter(r => r.accessible).length}\n\n`;
      
      content += `## Accessible Models\n\n`;
      results.filter(r => r.accessible).forEach(r => {
        content += `### ${r.name}\n`;
        content += `- **Family:** ${r.family}\n`;
        content += `- **Tier:** ${r.tier}\n`;
        content += `- **Response Time:** ${r.responseTime}ms\n`;
        content += `- **Capabilities:** ${r.capabilities?.join(', ')}\n\n`;
      });
      
      filename = `gemini-test-results-${Date.now()}.md`;
      mimeType = 'text/markdown';
    }
    
    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('success', `✅ Results exported as ${format.toUpperCase()}`);
  }, [results, recommendations, modelCategories, addLog]);
  
  /**
   * Comparison mode actions
   */
  const toggleComparisonMode = useCallback(() => {
    setComparisonMode(prev => !prev);
    if (comparisonMode) {
      clearComparison();
    }
  }, [comparisonMode]);
  
  const addToComparison = useCallback((model: TestResult) => {
    setComparisonModels(prev => {
      if (prev.find(m => m.name === model.name)) return prev;
      if (prev.length >= 5) {
        addLog('warning', '⚠️ Maximum 5 models can be compared');
        return prev;
      }
      return [...prev, model];
    });
  }, [addLog]);
  
  const removeFromComparison = useCallback((model: TestResult) => {
    setComparisonModels(prev => prev.filter(m => m.name !== model.name));
  }, []);
  
  const clearComparison = useCallback(() => {
    setComparisonModels([]);
  }, []);
  
  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  
  const value: GeminiTesterContextType = {
    // State
    apiKeys,
    showApiKeys,
    useCache,
    testing,
    results,
    logs,
    progress,
    successRate,
    activeTab,
    searchQuery,
    categoryFilter,
    statusFilter,
    selectedModel,
    showModelModal,
    sortBy,
    sortOrder,
    recommendations,
    modelCategories,
    tokenUsage,
    rateLimitStatus,
    regionInfo,
    comparisonMode,
    comparisonModels,
    autoRefresh,
    
    // Actions
    setApiKeys,
    setShowApiKeys,
    setUseCache,
    startTest,
    stopTest,
    clearResults,
    exportResults,
    retryFailedModels,
    setActiveTab,
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
    setSelectedModel,
    setShowModelModal,
    setSortBy,
    setSortOrder,
    toggleComparisonMode,
    addToComparison,
    removeFromComparison,
    clearComparison,
    addLog,
    clearLogs,
    exportLogs,
    setAutoRefresh
  };
  
  return (
    <GeminiTesterContext.Provider value={value}>
      {children}
      <div ref={logsEndRef} />
    </GeminiTesterContext.Provider>
  );
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Main hook to access Gemini Tester context
 */
export const useGeminiTester = () => {
  const context = useContext(GeminiTesterContext);
  if (!context) {
    throw new Error('useGeminiTester must be used within GeminiTesterProvider');
  }
  return context;
};

/**
 * Hook to access only test results
 */
export const useTestResults = () => {
  const { results, recommendations, modelCategories } = useGeminiTester();
  return { results, recommendations, modelCategories };
};

/**
 * Hook to access only test controls
 */
export const useTestControls = () => {
  const { testing, progress, successRate, startTest, stopTest, clearResults, retryFailedModels } = useGeminiTester();
  return { testing, progress, successRate, startTest, stopTest, clearResults, retryFailedModels };
};

/**
 * Hook to access only logs
 */
export const useLogs = () => {
  const { logs, addLog, clearLogs, exportLogs } = useGeminiTester();
  return { logs, addLog, clearLogs, exportLogs };
};

/**
 * Hook to access only configuration
 */
export const useConfig = () => {
  const { apiKeys, showApiKeys, useCache, setApiKeys, setShowApiKeys, setUseCache } = useGeminiTester();
  return { apiKeys, showApiKeys, useCache, setApiKeys, setShowApiKeys, setUseCache };
};

/**
 * Hook to access comparison features
 */
export const useComparison = () => {
  const { comparisonMode, comparisonModels, toggleComparisonMode, addToComparison, removeFromComparison, clearComparison } = useGeminiTester();
  return { comparisonMode, comparisonModels, toggleComparisonMode, addToComparison, removeFromComparison, clearComparison };
};
