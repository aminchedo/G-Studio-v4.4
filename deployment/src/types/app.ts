/**
 * Type Definitions for App.tsx
 * 
 * This file contains all the type definitions needed to fix the TypeScript errors
 * identified in the analysis.
 */

// ============================================
// FILE DATA TYPE (Fix for lines 187, 219, 743, 761, 812)
// ============================================
export interface FileData {
  name: string;
  language: string;
  content: string;
  path: string;           // REQUIRED - was missing
  lastModified: number;   // REQUIRED - was missing
}

// Helper type for creating FileData
export type CreateFileDataParams = {
  name: string;
  content?: string;
  language?: string;
};

// ============================================
// MODEL ID TYPE (Fix for line 623)
// ============================================
export type ModelId = 
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'gemini-pro'
  | 'gemini-ultra'
  | string; // Allow custom models

// ============================================
// AGENT CONFIG TYPE
// ============================================
export interface AgentConfig {
  model: ModelId;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// ============================================
// AI CONFIG TYPE
// ============================================
export interface AIConfig {
  provider?: 'openai' | 'anthropic' | 'google' | 'local';
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: ModelId;
  timeout?: number;
  retries?: number;
  [key: string]: any; // Allow additional properties
}

// ============================================
// CONVERSATION TYPE (Fix for line 675 - missing 'id')
// ============================================
export interface ConversationType {
  id?: string;            // ADD THIS - was missing
  messages: Message[];
  projectState?: ProjectState;
  actions?: Action[];
  timestamp?: number;
  projectId?: string;
  title?: string;
  model?: string;
}

// ============================================
// MESSAGE TYPE
// ============================================
export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  metadata?: {
    tokenCount?: number;
    model?: string;
    [key: string]: any;
  };
}

// ============================================
// PROJECT STATE TYPE
// ============================================
export interface ProjectState {
  files: Record<string, FileData>;
  activeFile: string | null;
  openFiles: string[];
  settings?: Record<string, any>;
}

// ============================================
// ACTION TYPE
// ============================================
export interface Action {
  id: string;
  type: string;
  timestamp: number;
  data?: any;
}

// ============================================
// MODAL STATE TYPE
// ============================================
export interface ModalState {
  settings: boolean;
  agent: boolean;
  aiSettingsHub: boolean;
  codeIntelligence: boolean;
  geminiTester: boolean;
  speechTest: boolean;
  conversationList: boolean;
  mcpTool: {
    isOpen: boolean;
    toolData?: any;
  };
}

// ============================================
// RIBBON MODAL STATE TYPE
// ============================================
export interface RibbonModalState {
  fileTree: boolean;
  toolHistory: boolean;
  toolChains: boolean;
  customTools: boolean;
  codeMetrics: boolean;
  toolUsage: boolean;
}

// ============================================
// TOKEN USAGE TYPE
// ============================================
export interface TokenUsage {
  input: number;
  output: number;
  total?: number;
}

// ============================================
// CODE METRICS TYPE
// ============================================
export interface CodeMetrics {
  lines: number;
  complexity: number;
  maintainability: number;
  duplicates?: number;
  coverage?: number;
}

// ============================================
// TOOL TYPE
// ============================================
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  handler: (params: any) => Promise<any>;
  schema?: any;
}

// ============================================
// TOOL CHAIN TYPE
// ============================================
export interface ToolChain {
  id: string;
  name: string;
  tools: string[]; // Array of tool IDs
  description?: string;
}

// ============================================
// TOOL EXECUTION HISTORY TYPE
// ============================================
export interface ToolExecutionHistory {
  id: string;
  toolId: string;
  toolName: string;
  timestamp: number;
  params: any;
  result: any;
  duration: number;
  success: boolean;
  error?: string;
}

// ============================================
// PREVIEW ERROR TYPE
// ============================================
export interface PreviewError {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
}

// ============================================
// UI STATE TYPE
// ============================================
export interface UIState {
  sidebarVisible: boolean;
  editorVisible: boolean;
  previewVisible: boolean;
  chatVisible: boolean;
  chatCollapsed: boolean;
  inspectorVisible: boolean;
  monitorVisible: boolean;
}

// ============================================
// EDITOR CONFIG TYPE
// ============================================
export interface EditorConfig {
  theme: 'light' | 'dark';
  fontSize: number;
  tabSize: number;
  minimap: boolean;
  lineNumbers: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  splitOrientation: 'horizontal' | 'vertical';
  splitRatio: number;
}

// ============================================
// HELPER TYPE GUARDS
// ============================================
export const isFileData = (obj: any): obj is FileData => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.name === 'string' &&
    typeof obj.language === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.path === 'string' &&
    typeof obj.lastModified === 'number'
  );
};

export const isModelId = (value: string): value is ModelId => {
  return typeof value === 'string' && value.length > 0;
};

// ============================================
// TYPE EXPORTS
// ============================================
export type {
  // Re-export for convenience
  FileData as File,
};

// ============================================
// CONSTANTS
// ============================================
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
};

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  minimap: true,
  lineNumbers: true,
  wordWrap: 'on',
  splitOrientation: 'horizontal',
  splitRatio: 50,
};

export const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'json',
  'html',
  'css',
  'python',
  'java',
  'cpp',
  'rust',
  'go',
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
