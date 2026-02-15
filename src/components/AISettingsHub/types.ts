/**
 * AI Settings Hub - Shared Types
 */

export interface AIConfig {
  // Connection
  apiKey: string;
  
  // Models
  selectedModel: string | null;
  selectionMode: 'auto' | 'manual';
  temperature: number;
  maxTokens: number;
  topP: number;
  enableStreaming: boolean;
  
  // Behavior
  persona: string;
  responseStyle: string;
  codeStyle: string;
  autoFormat: boolean;
  
  // Voice & Language
  voiceEnabled: boolean;
  language: string;
  voiceModel: string;
  autoSend: boolean;
  confidenceThreshold: number;
  
  // Local AI
  localAIEnabled: boolean;
  localModel: string;
  offlineMode: 'auto' | 'cloud' | 'local' | 'hybrid';
  fallbackToCloud: boolean;
  promptImprovement: boolean;
  promptMode: 'deterministic' | 'creative';
  
  // General
  notifications: boolean;
}
