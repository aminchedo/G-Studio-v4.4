/**
 * Context Manager - RAG-style context retrieval and token budgeting
 * Only sends minimal relevant context instead of full conversation history
 */

import { Message } from "@/types/types";
import { TokenOptimizer } from "../tokenOptimizer";
import { Content } from "@/services/geminiService/types";
import { LocalAIModelService } from "../ai/localAIModelService";
import { ImportanceCache } from "./importanceCache";

interface ContextChunk {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  relevanceScore?: number;
  importance?: number;
  semanticScore?: number;
  structuralScore?: number;
  tokens?: number;
}

interface TokenBudget {
  maxPromptTokens: number;
  reservedForSystem: number;
  reservedForTools: number;
  availableForContext: number;
}

export class ContextManager {
  private static readonly DEFAULT_MAX_CONTEXT_TOKENS = 8000; // Conservative limit
  private static readonly SYSTEM_INSTRUCTION_TOKENS = 2000; // Estimate
  private static readonly TOOLS_RESERVED_TOKENS = 1000; // Estimate for tool definitions
  private static readonly MIN_CONTEXT_MESSAGES = 2; // Always keep last 2 messages

  /**
   * Calculate token budget based on model
   */
  private static getTokenBudget(modelId: string): TokenBudget {
    // Conservative estimates - adjust based on actual model limits
    const maxPromptTokens = modelId.includes("pro") ? 32000 : 8000;

    return {
      maxPromptTokens,
      reservedForSystem: this.SYSTEM_INSTRUCTION_TOKENS,
      reservedForTools: this.TOOLS_RESERVED_TOKENS,
      availableForContext:
        maxPromptTokens -
        this.SYSTEM_INSTRUCTION_TOKENS -
        this.TOOLS_RESERVED_TOKENS,
    };
  }

  /**
   * Extract minimal relevant context from conversation history
   * Uses RAG-style retrieval: only most relevant chunks
   * Enhanced with hybrid ranking
   */
  static async extractRelevantContext(
    messages: Message[],
    currentMessage: string,
    modelId: string,
    maxTokens?: number,
  ): Promise<Content[]> {
    const budget = this.getTokenBudget(modelId);
    const contextLimit = maxTokens || budget.availableForContext;

    // Always include the latest user message
    const latestUserMessage = messages.filter((m) => m.role === "user").pop();
    const latestAssistantMessage = messages
      .filter((m) => m.role === "model" || m.role === "assistant")
      .pop();

    // Convert to chunks and score relevance
    const chunks: ContextChunk[] = messages
      .filter((msg) => {
        // Only include user and assistant messages
        // NEVER include function/tool messages with toolCalls - those are internal
        if (msg.role === "function") {
          return false; // Function messages are internal, don't send
        }
        if (msg.role === "model" || msg.role === "assistant") {
          // Only include text content, never toolCalls
          // Ensure content is a string before calling trim
          return (
            !!msg.content &&
            typeof msg.content === "string" &&
            msg.content.trim().length > 0
          );
        }
        return (
          msg.role === "user" &&
          !!msg.content &&
          typeof msg.content === "string" &&
          msg.content.trim().length > 0
        );
      })
      .map((msg) => {
        const role: "user" | "assistant" =
          msg.role === "model" || msg.role === "assistant"
            ? "assistant"
            : "user";
        const ts = msg.timestamp;
        const timestampMs =
          typeof ts === "number"
            ? ts
            : ts instanceof Date
              ? ts.getTime()
              : Date.now();
        return {
          id: msg.id || Math.random().toString(36).substring(7),
          role,
          content:
            typeof msg.content === "string"
              ? msg.content
              : String(msg.content || ""),
          timestamp: timestampMs,
          tokens: TokenOptimizer.estimateTokens(
            typeof msg.content === "string"
              ? msg.content
              : String(msg.content || ""),
          ),
        };
      })
      .filter((chunk) => chunk.content.trim().length > 0);

    // Score chunks using hybrid ranking
    // Use async scoring if local AI is available, otherwise use simple scoring
    const useHybridRanking = LocalAIModelService.getStatus() === "READY";

    if (useHybridRanking) {
      // Parallel scoring for performance
      await Promise.all(
        chunks.map((chunk) => this.calculateHybridScore(chunk, currentMessage)),
      );
      console.log("[CONTEXT_RANK]: APPLIED");
    } else {
      // Fallback to simple scoring
      chunks.forEach((chunk) => {
        chunk.relevanceScore = this.calculateRelevance(
          chunk.content,
          currentMessage,
        );
        chunk.importance = 0.5; // Default
      });
      console.log("[CONTEXT_RANK]: APPLIED (fallback)");
    }

    // Sort by relevance (most relevant first)
    chunks.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Always include last 2 messages for continuity
    const lastMessages = messages
      .filter(
        (msg) =>
          msg.role === "user" ||
          msg.role === "model" ||
          msg.role === "assistant",
      )
      .filter((msg) => msg.content && msg.content.trim())
      .slice(-this.MIN_CONTEXT_MESSAGES)
      .map((msg) => {
        const role: "user" | "assistant" =
          msg.role === "model" || msg.role === "assistant"
            ? "assistant"
            : "user";
        const ts = msg.timestamp;
        const timestampMs =
          typeof ts === "number"
            ? ts
            : ts instanceof Date
              ? ts.getTime()
              : Date.now();
        return {
          id: msg.id || Math.random().toString(36).substring(7),
          role,
          content: msg.content || "",
          timestamp: timestampMs,
          tokens: TokenOptimizer.estimateTokens(msg.content || ""),
          relevanceScore: 1.0, // High priority for recent messages
        };
      });

    // Merge: last messages + most relevant chunks
    const selectedChunks: ContextChunk[] = [];
    const usedIds = new Set<string>();
    let totalTokens = 0;

    // First, add last messages
    for (const msg of lastMessages) {
      if (
        !usedIds.has(msg.id) &&
        totalTokens + (msg.tokens || 0) <= contextLimit
      ) {
        selectedChunks.push(msg);
        usedIds.add(msg.id);
        totalTokens += msg.tokens || 0;
      }
    }

    // Then, add most relevant chunks
    for (const chunk of chunks) {
      if (
        !usedIds.has(chunk.id) &&
        totalTokens + (chunk.tokens || 0) <= contextLimit
      ) {
        selectedChunks.push(chunk);
        usedIds.add(chunk.id);
        totalTokens += chunk.tokens || 0;
      }
    }

    // Sort by timestamp to maintain chronological order
    selectedChunks.sort((a, b) => a.timestamp - b.timestamp);

    // Convert to API format - ONLY send role and text content
    // NEVER send toolCalls, thoughtSignature, or any internal fields
    return selectedChunks.map((chunk) => ({
      role: chunk.role,
      parts: [{ text: chunk.content }],
    }));
  }

  /**
   * Hybrid ranking: combines multiple signals
   * - Recency (timestamp-based)
   * - Importance (from local AI)
   * - Semantic similarity (lightweight)
   * - Structural relevance (file/intent matching)
   */
  private static async calculateHybridScore(
    chunk: ContextChunk,
    currentMessage: string,
    maxAge: number = 7 * 24 * 60 * 60 * 1000, // 7 days
  ): Promise<number> {
    const now = Date.now();
    const age = now - chunk.timestamp;

    // 1. Recency score (0-1, newer = higher)
    const recencyScore = Math.max(0, 1 - age / maxAge);

    // 2. Importance score (from local AI if available, else default)
    // Uses cache for performance
    const importanceScore = await this.calculateImportance(
      chunk.content,
      currentMessage,
    );

    // 3. Semantic similarity (lightweight keyword-based)
    const semanticScore = this.calculateSemanticSimilarity(
      chunk.content,
      currentMessage,
    );

    // 4. Structural relevance (file/intent matching)
    const structuralScore = this.calculateStructuralRelevance(
      chunk.content,
      currentMessage,
    );

    // Hybrid score: weighted combination
    const hybridScore =
      recencyScore * 0.2 +
      importanceScore * 0.4 +
      semanticScore * 0.3 +
      structuralScore * 0.1;

    chunk.importance = importanceScore;
    chunk.semanticScore = semanticScore;
    chunk.structuralScore = structuralScore;
    chunk.relevanceScore = hybridScore;

    return hybridScore;
  }

  /**
   * Calculate semantic similarity (lightweight)
   */
  private static calculateSemanticSimilarity(
    chunkContent: string,
    currentMessage: string,
  ): number {
    const chunkWords = new Set(
      chunkContent
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3),
    );
    const messageWords = new Set(
      currentMessage
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3),
    );

    let common = 0;
    for (const word of messageWords) {
      if (chunkWords.has(word)) common++;
    }

    const union = new Set([...chunkWords, ...messageWords]).size;
    return union > 0 ? common / union : 0;
  }

  /**
   * Calculate structural relevance (file paths, intents, etc.)
   */
  private static calculateStructuralRelevance(
    chunkContent: string,
    currentMessage: string,
  ): number {
    // Extract file paths
    const filePattern =
      /[\w\-\.\/]+\.(tsx?|jsx?|css|html|json|md|py|java|cpp|rs)/gi;
    const chunkFiles = new Set(chunkContent.match(filePattern) || []);
    const messageFiles = new Set(currentMessage.match(filePattern) || []);

    if (messageFiles.size === 0) return 0.5; // No files mentioned

    let commonFiles = 0;
    for (const file of messageFiles) {
      if (chunkFiles.has(file)) commonFiles++;
    }

    return messageFiles.size > 0 ? commonFiles / messageFiles.size : 0;
  }

  /**
   * Simple relevance scoring (keyword-based) - kept for backward compatibility
   */
  private static calculateRelevance(
    chunkContent: string,
    currentMessage: string,
  ): number {
    return this.calculateSemanticSimilarity(chunkContent, currentMessage);
  }

  /**
   * Calculate importance score for content (using local AI if available)
   * Uses cache to avoid repeated calculations
   */
  static async calculateImportance(
    content: string,
    query: string = "",
  ): Promise<number> {
    // Check cache first
    const cached = ImportanceCache.get(content, query);
    if (cached !== null) {
      return cached;
    }

    let importance = 0.5; // Default

    if (LocalAIModelService.getStatus() === "READY") {
      try {
        importance = await LocalAIModelService.calculateImportance(content);
      } catch (error) {
        console.warn("[ContextManager] Importance calculation failed:", error);
        // Fallback: simple heuristic
        importance = content.length > 100 ? 0.7 : 0.3;
      }
    } else {
      // Fallback: simple heuristic
      importance = content.length > 100 ? 0.7 : 0.3;
    }

    // Cache the result
    ImportanceCache.set(content, query, importance);
    return importance;
  }

  /**
   * Rank context chunks using hybrid strategy
   */
  static async rankContextChunks(
    chunks: ContextChunk[],
    query: string,
  ): Promise<ContextChunk[]> {
    const useHybridRanking = LocalAIModelService.getStatus() === "READY";

    if (useHybridRanking) {
      await Promise.all(
        chunks.map((chunk) => this.calculateHybridScore(chunk, query)),
      );
    } else {
      chunks.forEach((chunk) => {
        chunk.relevanceScore = this.calculateRelevance(chunk.content, query);
        chunk.importance = 0.5;
      });
    }

    return chunks.sort(
      (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0),
    );
  }

  /**
   * Create summary using local AI
   */
  static async createSummary(
    entries: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (LocalAIModelService.getStatus() === "READY") {
      try {
        return await LocalAIModelService.createSummary(entries);
      } catch (error) {
        console.error("[ContextManager] Summary creation failed:", error);
      }
    }

    // Fallback: simple concatenation
    return entries
      .map((e) => `[${e.role}]: ${e.content}`)
      .join("\n\n")
      .substring(0, 1000); // Limit length
  }

  /**
   * Summarize old context when it exceeds token budget
   */
  static async summarizeContext(
    chunks: ContextChunk[],
    maxTokens: number,
  ): Promise<string> {
    // Try AI summarization if available
    if (LocalAIModelService.getStatus() === "READY" && chunks.length > 5) {
      try {
        const entries = chunks.map((c) => ({
          role: c.role,
          content: c.content,
        }));
        return await this.createSummary(entries);
      } catch (error) {
        console.warn(
          "[ContextManager] AI summarization failed, using fallback",
        );
      }
    }

    // Fallback: simple summarization
    let summary = "";
    let totalTokens = 0;

    for (const chunk of chunks) {
      const chunkTokens =
        chunk.tokens || TokenOptimizer.estimateTokens(chunk.content);
      if (totalTokens + chunkTokens <= maxTokens) {
        summary += `[${chunk.role}]: ${chunk.content}\n\n`;
        totalTokens += chunkTokens;
      } else {
        break;
      }
    }

    return summary.trim();
  }

  /**
   * Get only the latest message (for minimal context mode)
   */
  static getLatestMessageOnly(messages: Message[]): Content[] {
    const latest = messages
      .filter((msg) => {
        // Only user and assistant messages with text content
        if (msg.role === "function") return false;

        // CRITICAL FIX: Content normalization - handle non-string content
        const contentText = this.normalizeContent(msg.content);
        return (
          (msg.role === "user" ||
            msg.role === "model" ||
            msg.role === "assistant") &&
          contentText &&
          contentText.trim().length > 0
        );
      })
      .slice(-1);

    return latest.map((msg) => {
      const contentText = this.normalizeContent(msg.content);
      return {
        role:
          msg.role === "model" || msg.role === "assistant"
            ? "assistant"
            : "user",
        parts: [{ text: contentText || "" }],
      };
    });
  }

  /**
   * CRITICAL FIX: Normalize content to string
   * Handles streaming payloads where content may be object, array, or partial delta
   */
  private static normalizeContent(content: any): string {
    // If content is already a string, return it
    if (typeof content === "string") {
      return content;
    }

    // If content is an array (streaming parts), extract and join text parts
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part?.text) return part.text;
          if (part?.content) return this.normalizeContent(part.content);
          return "";
        })
        .filter(Boolean)
        .join(" ");
    }

    // If content is an object, safely extract text fields
    if (content && typeof content === "object") {
      if (content.text) return String(content.text);
      if (content.content) return this.normalizeContent(content.content);
      if (content.delta) return this.normalizeContent(content.delta);
      // Try to extract any string-like fields
      const textFields = Object.values(content).filter(
        (v) => typeof v === "string",
      );
      if (textFields.length > 0) {
        return textFields.join(" ");
      }
    }

    // Fallback: convert to string or return empty
    return content ? String(content) : "";
  }
}
