/**
 * Context Builder
 * Builds minimal relevant context from conversation history
 * Implements token-aware context trimming
 */

import { estimateTokens } from './optimizer';

export interface ContextOptions {
  maxChars?: number;
  maxTokens?: number;
  maxMessages?: number;
  preserveRecent?: number; // Always keep last N messages
}

const DEFAULT_OPTIONS: Required<ContextOptions> = {
  maxChars: 3000,
  maxTokens: 2000,
  maxMessages: 10,
  preserveRecent: 2,
};

/**
 * Build context from history with token budgeting
 */
export function buildContext(
  history: string[],
  options: ContextOptions = {}
): string {
  if (!history || history.length === 0) {
    return '';
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let buffer = '';
  let tokenCount = 0;
  let messageCount = 0;

  // Always preserve recent messages
  const recentMessages = history.slice(-opts.preserveRecent);
  const olderMessages = history.slice(0, -opts.preserveRecent);

  // Add recent messages first (high priority)
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    const msgTokens = estimateTokens(msg);
    
    if (tokenCount + msgTokens > opts.maxTokens) break;
    if (buffer.length + msg.length > opts.maxChars) break;
    if (messageCount >= opts.maxMessages) break;

    buffer = msg + '\n' + buffer;
    tokenCount += msgTokens;
    messageCount++;
  }

  // Add older messages if space allows
  for (let i = olderMessages.length - 1; i >= 0; i--) {
    const msg = olderMessages[i];
    const msgTokens = estimateTokens(msg);
    
    if (tokenCount + msgTokens > opts.maxTokens) break;
    if (buffer.length + msg.length > opts.maxChars) break;
    if (messageCount >= opts.maxMessages) break;

    buffer = msg + '\n' + buffer;
    tokenCount += msgTokens;
    messageCount++;
  }

  return buffer.trim();
}

/**
 * Extract relevant context chunks (RAG-style)
 * Scores messages by relevance to current query
 */
export function extractRelevantContext(
  history: string[],
  currentQuery: string,
  options: ContextOptions = {}
): string[] {
  if (!history || history.length === 0) {
    return [];
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Score messages by relevance
  const scored = history.map(msg => ({
    message: msg,
    score: calculateRelevance(msg, currentQuery),
    tokens: estimateTokens(msg),
  }));

  // Sort by relevance
  scored.sort((a, b) => b.score - a.score);

  // Select top relevant messages within budget
  const selected: string[] = [];
  let tokenCount = 0;
  let messageCount = 0;

  // Always include most recent messages
  const recent = history.slice(-opts.preserveRecent);
  recent.forEach(msg => {
    const tokens = estimateTokens(msg);
    if (tokenCount + tokens <= opts.maxTokens && messageCount < opts.maxMessages) {
      selected.push(msg);
      tokenCount += tokens;
      messageCount++;
    }
  });

  // Add most relevant older messages
  for (const item of scored) {
    if (selected.includes(item.message)) continue; // Skip if already included
    
    if (tokenCount + item.tokens <= opts.maxTokens && messageCount < opts.maxMessages) {
      selected.push(item.message);
      tokenCount += item.tokens;
      messageCount++;
    }
  }

  // Return in chronological order
  return selected.filter(msg => history.includes(msg))
    .sort((a, b) => history.indexOf(a) - history.indexOf(b));
}

/**
 * Simple relevance scoring (keyword-based)
 * TODO: Replace with semantic similarity for better results
 */
function calculateRelevance(message: string, query: string): number {
  const messageWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const commonWords = queryWords.filter(word => messageWords.includes(word));
  
  return commonWords.length / Math.max(queryWords.length, 1);
}
