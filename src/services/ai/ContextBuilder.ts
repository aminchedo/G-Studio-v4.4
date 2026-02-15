/**
 * ContextBuilder Service
 *
 * Builds optimized context for AI conversations
 * Selects relevant messages and manages token budget
 */

import {
  Message,
  ContextBuildOptions,
  ContextSummary,
  MessageRelevance,
} from "@/mcp/runtime/types";

export class ContextBuilder {
  private maxTokens: number;
  private tokenBuffer: number;

  constructor(maxTokens: number = 8000, tokenBuffer: number = 500) {
    this.maxTokens = maxTokens;
    this.tokenBuffer = tokenBuffer;
  }

  /**
   * Build optimized context from messages
   */
  buildContext(options: ContextBuildOptions): string {
    const {
      messages,
      files,
      currentTask,
      includeFiles = false,
      prioritizeRecent = true,
    } = options;

    const parts: string[] = [];
    let tokenCount = 0;

    // Add current task
    if (currentTask) {
      const taskSection = `Current Task: ${currentTask}\n`;
      parts.push(taskSection);
      tokenCount += this.estimateTokens(taskSection);
    }

    // Add file context if requested
    if (includeFiles && files) {
      const fileSection = this.buildFileContext(files);
      if (
        tokenCount + this.estimateTokens(fileSection) <
        this.maxTokens - this.tokenBuffer
      ) {
        parts.push(fileSection);
        tokenCount += this.estimateTokens(fileSection);
      }
    }

    // Select and add relevant messages
    const selectedMessages = this.selectRelevantMessages(
      messages,
      this.maxTokens - tokenCount - this.tokenBuffer,
      prioritizeRecent,
    );

    for (const msg of selectedMessages) {
      const msgText = `${msg.role}: ${msg.content}\n`;
      parts.push(msgText);
    }

    return parts.join("\n");
  }

  /**
   * Select most relevant messages within token budget
   */
  private selectRelevantMessages(
    messages: Message[],
    availableTokens: number,
    prioritizeRecent: boolean,
  ): Message[] {
    if (messages.length === 0) return [];

    const selected: Message[] = [];
    let tokenCount = 0;

    // Start from most recent if prioritizing recent
    const orderedMessages = prioritizeRecent
      ? [...messages].reverse()
      : messages;

    for (const msg of orderedMessages) {
      const msgTokens = this.estimateTokens(msg.content);

      if (tokenCount + msgTokens > availableTokens) {
        break;
      }

      selected.push(msg);
      tokenCount += msgTokens;
    }

    // Restore original order if we reversed
    return prioritizeRecent ? selected.reverse() : selected;
  }

  /**
   * Build file context section
   */
  private buildFileContext(files: Record<string, unknown>): string {
    const parts: string[] = ["Project Files:"];

    for (const [path, file] of Object.entries(files)) {
      const content =
        file && typeof file === "object" && "content" in file
          ? (file as { content?: string }).content
          : undefined;
      parts.push(`- ${path} (${content?.length ?? 0} chars)`);
    }

    return parts.join("\n") + "\n";
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Summarize old messages
   */
  summarizeMessages(messages: Message[]): string {
    if (messages.length === 0) return "";

    const summary: string[] = ["Previous conversation summary:"];

    // Count messages by role
    const userMessages = messages.filter((m) => m.role === "user").length;
    const assistantMessages = messages.filter(
      (m) => m.role === "assistant",
    ).length;

    summary.push(`- ${userMessages} user messages`);
    summary.push(`- ${assistantMessages} assistant messages`);

    // Extract key topics
    const topics = this.extractTopics(messages);
    if (topics.length > 0) {
      summary.push(`- Key topics: ${topics.join(", ")}`);
    }

    return summary.join("\n");
  }

  /**
   * Extract topics from messages
   */
  private extractTopics(messages: Message[]): string[] {
    const topics = new Set<string>();
    const keywords = [
      "html",
      "css",
      "javascript",
      "typescript",
      "react",
      "vue",
      "angular",
      "component",
      "function",
      "class",
      "api",
      "database",
      "server",
      "style",
      "layout",
      "design",
      "bug",
      "error",
      "fix",
      "feature",
    ];

    for (const msg of messages) {
      const content = msg.content.toLowerCase();
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          topics.add(keyword);
        }
      }
    }

    return Array.from(topics).slice(0, 5);
  }

  /**
   * Get context summary
   */
  getContextSummary(options: ContextBuildOptions): ContextSummary {
    const { messages } = options;
    const context = this.buildContext(options);
    const selectedMessages = this.selectRelevantMessages(
      messages,
      this.maxTokens - this.tokenBuffer,
      true,
    );

    return {
      totalMessages: messages.length,
      selectedMessages: selectedMessages.map((m) => m.id ?? ""),
      estimatedTokens: this.estimateTokens(context),
      topics: this.extractTopics(messages),
      timeRange: {
        start: messages[0]?.timestamp
          ? new Date(messages[0].timestamp)
          : new Date(),
        end: messages[messages.length - 1]?.timestamp
          ? new Date(messages[messages.length - 1].timestamp)
          : new Date(),
      },
    };
  }

  /**
   * Rank messages by relevance
   */
  rankMessagesByRelevance(
    messages: Message[],
    query: string,
  ): MessageRelevance[] {
    const ranked: MessageRelevance[] = [];
    const queryLower = query.toLowerCase();

    for (const msg of messages) {
      const contentLower = msg.content.toLowerCase();
      let score = 0;
      let reason = "";

      // Exact match
      if (contentLower.includes(queryLower)) {
        score += 10;
        reason = "Contains exact query";
      }

      // Word matches
      const queryWords = queryLower.split(/\s+/);
      const matchedWords = queryWords.filter((word) =>
        contentLower.includes(word),
      );
      score += matchedWords.length * 2;

      if (matchedWords.length > 0) {
        reason = reason
          ? `${reason}, matches ${matchedWords.length} words`
          : `Matches ${matchedWords.length} words`;
      }

      // Recent messages get bonus
      if (msg.timestamp) {
        const timestampMs =
          typeof msg.timestamp === "number"
            ? msg.timestamp
            : msg.timestamp.getTime();
        const age = Date.now() - timestampMs;
        const daysSinceMessage = age / (1000 * 60 * 60 * 24);
        if (daysSinceMessage < 1) {
          score += 5;
          reason = reason ? `${reason}, recent` : "Recent message";
        }
      }

      if (score > 0) {
        ranked.push({ messageId: msg.id, score, reason });
      }
    }

    return ranked.sort((a, b) => b.score - a.score);
  }
}

// Singleton instance
export const contextBuilder = new ContextBuilder();
