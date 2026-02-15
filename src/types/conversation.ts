import {
  Message as CoreMessage,
  MessageMetadata as CoreMessageMetadata,
  ToolCall as CoreToolCall,
  ToolResult as CoreToolResult,
  MessageRole,
  MessageStatus,
  MessageRelevance as MessageRelevanceFromRuntime,
} from "../mcp/runtime/types";

export type MessageRelevance = MessageRelevanceFromRuntime;

export interface Message extends CoreMessage {}
export interface MessageMetadata extends CoreMessageMetadata {}
export interface ToolCall extends CoreToolCall {}
export interface ToolResult extends CoreToolResult {}

export interface Conversation {
  id: string;
  title: string;
  created: Date;
  updated: Date;
  messages: Message[];
  context: ConversationContext;
  tags: string[];
  archived: boolean;
  pinned?: boolean;
  /** Last message preview (computed or cached) */
  lastMessage?: string;
  /** Message count (computed or cached) */
  messageCount?: number;
}

export interface RecentChange {
  path: string;
  type: "created" | "modified" | "deleted";
  description?: string;
  timestamp?: Date | number;
}

export interface OpenQuestion {
  question: string;
  answer?: string;
  reasoning?: string;
  priority?: "low" | "medium" | "high";
}

export interface ConversationContext {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
  metadata?: Record<string, unknown>;
  /** Extended context for ContextViewer / code intelligence */
  currentTask?: string;
  projectGoals?: string[];
  recentChanges?: RecentChange[] | string[];
  openQuestions?: OpenQuestion[] | string[];
  decisions?: string[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  updated: Date;
  pinned: boolean;
}

export interface ConversationFilter {
  archived?: boolean;
  tags?: string[];
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// ==================== CONTEXT BUILDING ====================

export interface ContextBuildOptions {
  maxTokens?: number;
  includeSystemPrompt?: boolean;
  includePreviousMessages?: number;
  includeToolCalls?: boolean;
  includeMetadata?: boolean;
  prioritizeRecent?: boolean;
  messages?: Message[];
  files?: Record<string, unknown>;
  currentTask?: string;
  includeFiles?: boolean;
}

export interface ContextSummary {
  totalMessages: number;
  totalTokens?: number;
  includedMessages?: number;
  truncated?: boolean;
  summary?: string;
  /** IDs or indices of selected messages */
  selectedMessages?: string[] | number[];
  estimatedTokens?: number;
  topics?: string[];
  timeRange?: { start: Date; end: Date };
}
