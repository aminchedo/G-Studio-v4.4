/**
 * GeminiTesterTypes - Type Definitions
 * 
 * Centralized type definitions for the Gemini Tester module
 */

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface GeminiAPIConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  rateLimit: number;
  rateLimitWindow: number;
  tokenLimit: {
    input: number;
    output: number;
  };
}

export interface ModelConfig {
  family: string;
  tier: string;
  capabilities: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

export interface CacheConfig {
  modelInfoTTL: number;
  testResultsTTL: number;
  storageKey: string;
}

export interface GeographicalConfig {
  allowedRegions: string[];
  restrictedRegions: string[];
  checkRegionOnInit: boolean;
}

export interface Config {
  GEMINI_API: GeminiAPIConfig;
  MODELS: Record<string, ModelConfig>;
  RECOMMENDATIONS: Record<string, string>;
  CACHE: CacheConfig;
  GEOGRAPHICAL: GeographicalConfig;
}

// ============================================================================
// MODEL TYPES
// ============================================================================

export interface ModelInfo {
  name: string;
  displayName?: string;
  family?: string;
  tier?: string;
  accessible?: boolean;
  streaming?: boolean;
  multimodal?: boolean;
  methods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  capabilities?: string[];
}

export interface CachedModelInfo extends ModelInfo {
  responseTime: number | null;
  error: string | null;
  workingVersion: string | null;
  testedAt: string;
}

export interface ModelCache {
  models: Map<string, CachedModelInfo>;
  timestamp: number;
  apiKeyHash: string;
}

// ============================================================================
// TEST TYPES
// ============================================================================

export interface TestResult {
  name: string;
  accessible: boolean;
  streaming: boolean;
  multimodal: boolean;
  responseTime: number | null;
  error: string | null;
  workingVersion: string | null;
  family?: string;
  tier?: string;
  methods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  capabilities?: string[];
  timestamp?: string;
}

export interface TestProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface TestState {
  current: number;
  total: number;
  successCount: number;
  isStopping: boolean;
}

// ============================================================================
// TOKEN USAGE TYPES
// ============================================================================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  timestamp: number;
  modelName: string;
}

export interface TokenUsageSummary {
  input: number;
  output: number;
  total: number;
}

export interface TokenLimitCheck {
  withinLimit: boolean;
  warning: string | null;
  inputLimit: number;
  outputLimit: number;
}

// ============================================================================
// RATE LIMIT TYPES
// ============================================================================

export interface RateLimitStatus {
  remaining: number;
  canRequest: boolean;
  resetTime?: number;
}

// ============================================================================
// LOG TYPES
// ============================================================================

export type LogType = 'info' | 'success' | 'error' | 'warning' | 'debug';

export interface LogEntry {
  type: LogType;
  message: string;
  timestamp: number;
  data?: any;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ErrorInfo {
  category: 'authentication' | 'rate_limit' | 'network' | 'server' | 'validation' | 'unknown';
  type: string;
  message: string;
  retryable: boolean;
  suggestion?: string;
}

export interface APIError extends Error {
  status?: number;
  retryable?: boolean;
  errorInfo?: ErrorInfo;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  responseTime?: number;
  attempt?: number;
  retryable?: boolean;
  errorInfo?: ErrorInfo;
}

export interface APIStats {
  total: number;
  success: number;
  failed: number;
  retries: number;
  successRate: number;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface GeminiTesterProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export interface GeminiTesterConfigProps {
  apiKeys: string[];
  showApiKeys: boolean[];
  onApiKeysChange: (keys: string[]) => void;
  onShowApiKeysChange: (show: boolean[]) => void;
  useCache: boolean;
  onUseCacheChange: (use: boolean) => void;
  onStartTest: () => void;
  testing: boolean;
}

export interface GeminiTesterResultsProps {
  results: TestResult[] | null;
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  onSearchChange: (query: string) => void;
  onCategoryFilterChange: (category: string) => void;
  onStatusFilterChange: (status: string) => void;
  onModelSelect: (model: TestResult) => void;
  onExport: () => void;
}

export interface GeminiTesterControlsProps {
  testing: boolean;
  progress: TestProgress;
  successRate: number;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
}

// ============================================================================
// RECOMMENDATION TYPES
// ============================================================================

export interface ModelRecommendations {
  bestForSpeed: string;
  bestForQuality: string;
  bestForBalance: string;
  bestForLatest: string;
  bestForRobotics?: string;
  bestForSmall?: string;
  bestForLarge?: string;
}

export interface ModelCategories {
  [category: string]: TestResult[];
}

// ============================================================================
// REGION TYPES
// ============================================================================

export interface RegionInfo {
  region: string;
  allowed: boolean;
  restricted: boolean;
  message?: string;
}
