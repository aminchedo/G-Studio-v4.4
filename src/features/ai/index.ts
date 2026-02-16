/**
 * AI Features - Main Export Index
 * 
 * This file exports all AI-related features including:
 * - AI Settings Hub (Enhanced)
 * - Conversation Module
 * - Agent features
 * - Gemini Tester
 * - MCP features
 */

// AI Settings Hub (Enhanced Version)
export { AISettingsHub } from './AISettingsHub';
export type { AIConfig } from './AISettingsHub/types';

// Conversation Module
export { ConversationWindow } from '../../components/conversation/ConversationWindow';
export { EnhancedConversationWindow } from '../../components/conversation/EnhancedConversationWindow';
export { ConversationDemo } from '../../components/conversation/ConversationDemo';

// Agent Features
export { AgentCollaboration } from './AgentCollaboration';
export { AgentReasoning } from './AgentReasoning';
export { AgentSelector } from './AgentSelector';
export { AISuggestions } from './AISuggestions';
export { AutonomousModeControl } from './AutonomousModeControl';
export { MultiAgentStatus } from './MultiAgentStatus';

// Settings & Panels
export { EnhancedSettingsPanel } from './EnhancedSettingsPanel';
export { LocalAISettings } from './LocalAISettings';

// MCP & Connection
export { McpConnectionStatus } from './McpConnectionStatus';

// Testing
export { SpeechTest } from './SpeechTest';

// Gemini Tester (entire module)
export * from './gemini-tester';

// Main AI Module Integration
export { AIModule } from './AIModule';
