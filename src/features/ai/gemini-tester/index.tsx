/**
 * Gemini Tester - Main Export (Upgraded v2.0)
 * 
 * Public API for the Gemini Model Tester module
 * 
 * This module provides a comprehensive testing suite for Google Gemini AI models.
 * It includes model discovery, testing, result analysis, and recommendations.
 * 
 * @module gemini-tester
 * @version 2.0
 */

import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

/**
 * Lazy load the main component for better performance
 * This ensures the component is only loaded when actually used
 */
const GeminiTesterCoreLazy = lazy(() => 
  import('./GeminiTesterCore').then(module => ({ 
    default: module.GeminiTesterCore 
  }))
);

const GeminiTesterStandaloneLazy = lazy(() => 
  import('./GeminiTesterCore').then(module => ({ 
    default: module.GeminiTesterStandalone 
  }))
);

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingFallback: React.FC = () => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 shadow-2xl">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
        <p className="text-white font-medium">Loading Gemini Tester...</p>
        <p className="text-sm text-slate-400">Please wait a moment</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// WRAPPED COMPONENTS WITH SUSPENSE
// ============================================================================

export interface GeminiTesterProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Main Gemini Tester Component (Modal Version)
 * 
 * This is the primary export for the Gemini Model Tester.
 * It renders as a modal overlay with full testing capabilities.
 * 
 * Features:
 * - Model discovery across all API endpoints
 * - Comprehensive model testing with retry logic
 * - Performance metrics and statistics
 * - Token usage tracking with cost estimation
 * - Recommendations for best models
 * - Result export (JSON/CSV/Markdown)
 * - Advanced caching with version control
 * - Rate limiting with smart waiting
 * - Model comparison mode
 * - Auto-refresh capability
 * 
 * @example
 * ```tsx
 * import GeminiTester from './components/gemini-tester';
 * 
 * function App() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   
 *   return (
 *     <>
 *       <button onClick={() => setIsOpen(true)}>
 *         Test Gemini Models
 *       </button>
 *       
 *       <GeminiTester 
 *         isOpen={isOpen} 
 *         onClose={() => setIsOpen(false)} 
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export const GeminiTester: React.FC<GeminiTesterProps> = (props) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GeminiTesterCoreLazy {...props} />
    </Suspense>
  );
};

/**
 * Standalone Gemini Tester Component (No Modal)
 * 
 * Use this version when you want to embed the tester directly
 * in your page without the modal overlay.
 * 
 * @example
 * ```tsx
 * import { GeminiTesterStandalone } from './components/gemini-tester';
 * 
 * function TestPage() {
 *   return (
 *     <div className="h-screen">
 *       <GeminiTesterStandalone />
 *     </div>
 *   );
 * }
 * ```
 */
export const GeminiTesterStandalone: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GeminiTesterStandaloneLazy />
    </Suspense>
  );
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Model Types
  ModelInfo,
  CachedModelInfo,
  ModelCache,
  
  // Test Types
  TestResult,
  TestProgress,
  TestState,
  
  // Recommendation Types
  ModelRecommendations,
  ModelCategories,
  
  // Log Types
  LogEntry,
  LogType,
  
  // Token Usage Types
  TokenUsage,
  TokenUsageSummary,
  TokenLimitCheck,
  
  // Rate Limit Types
  RateLimitStatus,
  
  // Error Types
  ErrorInfo,
  APIError,
  
  // API Types
  APIResponse,
  APIStats,
  
  // Configuration Types
  GeminiAPIConfig,
  ModelConfig,
  CacheConfig,
  GeographicalConfig,
  Config,
  
  // Component Props Types
  GeminiTesterProps,
  GeminiTesterConfigProps,
  GeminiTesterResultsProps,
  GeminiTesterControlsProps,
  
  // Region Types
  RegionInfo
} from './GeminiTesterTypes';

// ============================================================================
// SERVICE EXPORTS (for advanced usage)
// ============================================================================

/**
 * ModelTesterService
 * 
 * Core service class for testing Gemini models.
 * Use this directly if you want to build a custom UI.
 * 
 * @example
 * ```tsx
 * import { ModelTesterService, Logger } from './gemini-tester';
 * 
 * const logger = new Logger(console.log);
 * const service = new ModelTesterService({ apiKey: 'your-key' }, logger);
 * 
 * await service.initialize();
 * const models = await service.discoverModels();
 * const results = await service.testAllModels(models);
 * ```
 */
export { ModelTesterService } from './GeminiTesterService';

// ============================================================================
// UTILITY EXPORTS (for advanced usage)
// ============================================================================

/**
 * Logger
 * 
 * Enhanced logging utility with history and export capabilities.
 * 
 * @example
 * ```tsx
 * import { Logger } from './gemini-tester';
 * 
 * const logger = new Logger((type, message, data) => {
 *   console.log(`[${type}] ${message}`, data);
 * });
 * 
 * logger.info('Starting test');
 * logger.success('Test complete');
 * logger.error('Test failed', { error: 'details' });
 * ```
 */
export { Logger } from './GeminiTesterUtils';

/**
 * ModelCacheManager
 * 
 * Advanced caching system with version control and TTL management.
 * 
 * @example
 * ```tsx
 * import { ModelCacheManager } from './gemini-tester';
 * 
 * // Get cached models
 * const cache = ModelCacheManager.getCache(apiKey);
 * 
 * // Save to cache
 * ModelCacheManager.setCache(apiKey, cache);
 * 
 * // Clear cache
 * ModelCacheManager.clearCache(apiKey);
 * ```
 */
export { ModelCacheManager } from './GeminiTesterUtils';

/**
 * TokenUsageTracker
 * 
 * Track token usage across all API calls with cost estimation.
 * 
 * @example
 * ```tsx
 * import { TokenUsageTracker } from './gemini-tester';
 * 
 * // Track usage
 * TokenUsageTracker.trackUsage({
 *   inputTokens: 100,
 *   outputTokens: 50,
 *   totalTokens: 150,
 *   timestamp: Date.now(),
 *   modelName: 'gemini-pro'
 * });
 * 
 * // Get current usage
 * const usage = TokenUsageTracker.getCurrentUsage();
 * 
 * // Estimate cost
 * const cost = TokenUsageTracker.estimateCost('gemini-pro');
 * ```
 */
export { TokenUsageTracker } from './GeminiTesterUtils';

/**
 * RateLimiter
 * 
 * Intelligent rate limiting to prevent API quota issues.
 * 
 * @example
 * ```tsx
 * import { RateLimiter } from './gemini-tester';
 * 
 * // Check if can make request
 * if (RateLimiter.canMakeRequest()) {
 *   // Make request
 *   RateLimiter.recordRequest();
 * }
 * 
 * // Wait if needed
 * await RateLimiter.waitIfNeeded();
 * 
 * // Get status
 * const status = RateLimiter.getStatus();
 * ```
 */
export { RateLimiter } from './GeminiTesterUtils';

/**
 * ErrorHandler
 * 
 * Comprehensive error parsing and categorization.
 * 
 * @example
 * ```tsx
 * import { ErrorHandler } from './gemini-tester';
 * 
 * try {
 *   // API call
 * } catch (error) {
 *   const errorInfo = ErrorHandler.parseError(error);
 *   console.log(errorInfo.category); // 'authentication', 'rate_limit', etc.
 *   console.log(errorInfo.message); // User-friendly message
 *   console.log(errorInfo.suggestion); // What to do next
 * }
 * ```
 */
export { ErrorHandler } from './GeminiTesterUtils';

/**
 * ModelUtils
 * 
 * Utility functions for model name parsing and formatting.
 * 
 * @example
 * ```tsx
 * import { ModelUtils } from './gemini-tester';
 * 
 * const family = ModelUtils.extractFamily('gemini-2.5-pro'); // '2.5'
 * const tier = ModelUtils.extractTier('gemini-2.5-pro'); // 'pro'
 * const generation = ModelUtils.getGeneration('gemini-2.5-pro'); // 2
 * const displayName = ModelUtils.formatDisplayName('gemini-2.5-pro'); // 'Gemini 2.5 Pro'
 * ```
 */
export { ModelUtils } from './GeminiTesterUtils';

/**
 * PerformanceMonitor
 * 
 * Performance measurement and statistics tracking.
 * 
 * @example
 * ```tsx
 * import { PerformanceMonitor } from './gemini-tester';
 * 
 * const stopTimer = PerformanceMonitor.start('operation');
 * // ... do work
 * const duration = stopTimer();
 * 
 * // Get statistics
 * const stats = PerformanceMonitor.getStats('operation');
 * ```
 */
export { PerformanceMonitor } from './GeminiTesterUtils';

/**
 * RetryHandler
 * 
 * Configurable retry logic with exponential backoff.
 * 
 * @example
 * ```tsx
 * import { RetryHandler } from './gemini-tester';
 * 
 * const result = await RetryHandler.retry(
 *   async () => {
 *     // Your async operation
 *   },
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     exponentialBackoff: true
 *   }
 * );
 * ```
 */
export { RetryHandler } from './GeminiTesterUtils';

/**
 * ExportUtils
 * 
 * Multi-format export utilities (JSON, CSV, Markdown).
 * 
 * @example
 * ```tsx
 * import { ExportUtils } from './gemini-tester';
 * 
 * ExportUtils.exportJSON(data, 'results.json');
 * ExportUtils.exportCSV(data, 'results.csv');
 * ```
 */
export { ExportUtils } from './GeminiTesterUtils';

// ============================================================================
// CONFIGURATION EXPORTS
// ============================================================================

/**
 * CONFIG
 * 
 * Global configuration object with API settings, model definitions,
 * cache settings, and recommendations.
 * 
 * @example
 * ```tsx
 * import { CONFIG } from './gemini-tester';
 * 
 * console.log(CONFIG.GEMINI_API.baseUrl);
 * console.log(CONFIG.MODELS['gemini-2.5-pro']);
 * console.log(CONFIG.RECOMMENDATIONS.bestForSpeed);
 * ```
 */
export { CONFIG } from './GeminiTesterConfig';

// ============================================================================
// CONTEXT EXPORTS (for custom implementations)
// ============================================================================

/**
 * GeminiTesterProvider
 * 
 * Context provider for state management.
 * Wrap your custom components with this if building a custom UI.
 * 
 * @example
 * ```tsx
 * import { GeminiTesterProvider, useGeminiTester } from './gemini-tester';
 * 
 * function CustomUI() {
 *   const { startTest, results } = useGeminiTester();
 *   return <button onClick={startTest}>Test</button>;
 * }
 * 
 * function App() {
 *   return (
 *     <GeminiTesterProvider>
 *       <CustomUI />
 *     </GeminiTesterProvider>
 *   );
 * }
 * ```
 */
export { GeminiTesterProvider } from './GeminiTesterContext';

/**
 * useGeminiTester
 * 
 * Main hook to access all Gemini Tester state and actions.
 * 
 * @example
 * ```tsx
 * import { useGeminiTester } from './gemini-tester';
 * 
 * function MyComponent() {
 *   const {
 *     results,
 *     testing,
 *     progress,
 *     startTest,
 *     stopTest,
 *     exportResults
 *   } = useGeminiTester();
 *   
 *   return (
 *     <button onClick={startTest} disabled={testing}>
 *       {testing ? `Testing... ${progress.percentage}%` : 'Start Test'}
 *     </button>
 *   );
 * }
 * ```
 */
export { useGeminiTester } from './GeminiTesterContext';

/**
 * useTestResults
 * 
 * Hook to access only test results and recommendations.
 * 
 * @example
 * ```tsx
 * import { useTestResults } from './gemini-tester';
 * 
 * function ResultsDisplay() {
 *   const { results, recommendations, modelCategories } = useTestResults();
 *   
 *   return (
 *     <div>
 *       <h2>Results: {results?.length} models</h2>
 *       <p>Best for speed: {recommendations?.bestForSpeed}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export { useTestResults } from './GeminiTesterContext';

/**
 * useTestControls
 * 
 * Hook to access only test control functions.
 * 
 * @example
 * ```tsx
 * import { useTestControls } from './gemini-tester';
 * 
 * function TestControls() {
 *   const {
 *     testing,
 *     progress,
 *     successRate,
 *     startTest,
 *     stopTest,
 *     clearResults,
 *     retryFailedModels
 *   } = useTestControls();
 *   
 *   return (
 *     <div>
 *       <button onClick={startTest}>Start</button>
 *       <button onClick={stopTest}>Stop</button>
 *       <button onClick={retryFailedModels}>Retry Failed</button>
 *     </div>
 *   );
 * }
 * ```
 */
export { useTestControls } from './GeminiTesterContext';

/**
 * useLogs
 * 
 * Hook to access logging functionality.
 * 
 * @example
 * ```tsx
 * import { useLogs } from './gemini-tester';
 * 
 * function LogsPanel() {
 *   const { logs, addLog, clearLogs, exportLogs } = useLogs();
 *   
 *   return (
 *     <div>
 *       {logs.map((log, i) => (
 *         <div key={i}>{log.message}</div>
 *       ))}
 *       <button onClick={clearLogs}>Clear</button>
 *       <button onClick={exportLogs}>Export</button>
 *     </div>
 *   );
 * }
 * ```
 */
export { useLogs } from './GeminiTesterContext';

/**
 * useConfig
 * 
 * Hook to access configuration state.
 * 
 * @example
 * ```tsx
 * import { useConfig } from './gemini-tester';
 * 
 * function ConfigPanel() {
 *   const {
 *     apiKeys,
 *     showApiKeys,
 *     useCache,
 *     setApiKeys,
 *     setShowApiKeys,
 *     setUseCache
 *   } = useConfig();
 *   
 *   return (
 *     <div>
 *       <input
 *         value={apiKeys[0]}
 *         onChange={(e) => setApiKeys([e.target.value])}
 *       />
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={useCache}
 *           onChange={(e) => setUseCache(e.target.checked)}
 *         />
 *         Use Cache
 *       </label>
 *     </div>
 *   );
 * }
 * ```
 */
export { useConfig } from './GeminiTesterContext';

/**
 * useComparison
 * 
 * Hook to access model comparison features.
 * 
 * @example
 * ```tsx
 * import { useComparison } from './gemini-tester';
 * 
 * function ComparisonPanel() {
 *   const {
 *     comparisonMode,
 *     comparisonModels,
 *     toggleComparisonMode,
 *     addToComparison,
 *     removeFromComparison,
 *     clearComparison
 *   } = useComparison();
 *   
 *   return (
 *     <div>
 *       <button onClick={toggleComparisonMode}>
 *         {comparisonMode ? 'Exit' : 'Enter'} Comparison Mode
 *       </button>
 *       <div>Comparing {comparisonModels.length} models</div>
 *     </div>
 *   );
 * }
 * ```
 */
export { useComparison } from './GeminiTesterContext';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

/**
 * Default export - Main modal version
 * 
 * This is the recommended way to import the Gemini Tester.
 * It provides the complete testing interface as a modal overlay.
 * 
 * @example
 * ```tsx
 * import GeminiTester from './components/gemini-tester';
 * // or
 * import { GeminiTester } from './components/gemini-tester';
 * ```
 */
export default GeminiTester;

// ============================================================================
// VERSION INFORMATION
// ============================================================================

/**
 * Version information
 */
export const VERSION = '2.0.0';
export const VERSION_INFO = {
  version: '2.0.0',
  releaseDate: '2026-02-14',
  changes: [
    'Enhanced model discovery with better caching',
    'Improved error handling with categorization',
    'Advanced token usage tracking with cost estimation',
    'Smart rate limiting with automatic waiting',
    'Model comparison mode',
    'Auto-refresh capability',
    'Multiple export formats (JSON, CSV, Markdown)',
    'Performance monitoring and analytics',
    'Better retry logic with exponential backoff',
    'Comprehensive utility classes',
    'Enhanced UI with better filtering and sorting',
    'Real-time progress tracking',
    'Improved type safety'
  ]
};
