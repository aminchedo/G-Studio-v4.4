/**
 * Per-User Quota Tracking and Enforcement
 * Tracks token usage and cost per user with daily limits
 */

import { estimateCost, TokenUsage } from './cost';

export interface QuotaConfig {
  maxDailyCost: number;      // Maximum daily cost in USD
  maxDailyTokens?: number;   // Maximum daily tokens (optional)
  resetHour?: number;        // Hour of day to reset (0-23, default: 0)
}

export interface UserUsage {
  userId: string;
  dailyCost: number;
  dailyTokens: number;
  lastReset: number;
  requests: number;
}

// Default quota configuration
const DEFAULT_QUOTA: QuotaConfig = {
  maxDailyCost: 2.0, // $2 USD per day
  maxDailyTokens: 1000000, // 1M tokens per day (optional)
  resetHour: 0, // Reset at midnight
};

// In-memory storage (in production, use Redis or database)
const userUsage = new Map<string, UserUsage>();

// Global quota configuration
let quotaConfig: QuotaConfig = { ...DEFAULT_QUOTA };

/**
 * Set quota configuration
 */
export function setQuotaConfig(config: Partial<QuotaConfig>): void {
  quotaConfig = { ...DEFAULT_QUOTA, ...config };
}

/**
 * Get quota configuration
 */
export function getQuotaConfig(): QuotaConfig {
  return { ...quotaConfig };
}

/**
 * Check if user has quota remaining
 * Throws error if quota exceeded
 */
export function checkQuota(userId: string): void {
  const usage = getUserUsage(userId);
  
  // Check daily cost limit
  if (usage.dailyCost >= quotaConfig.maxDailyCost) {
    throw new Error(
      `Daily quota exceeded. Limit: $${quotaConfig.maxDailyCost.toFixed(2)}, ` +
      `Used: $${usage.dailyCost.toFixed(2)}`
    );
  }
  
  // Check daily token limit (if configured)
  if (quotaConfig.maxDailyTokens && usage.dailyTokens >= quotaConfig.maxDailyTokens) {
    throw new Error(
      `Daily token quota exceeded. Limit: ${quotaConfig.maxDailyTokens.toLocaleString()}, ` +
      `Used: ${usage.dailyTokens.toLocaleString()}`
    );
  }
}

/**
 * Record usage for a user
 */
export function recordUsage(
  userId: string,
  cost: number,
  tokens?: number
): void {
  const usage = getUserUsage(userId);
  
  usage.dailyCost += cost;
  if (tokens) {
    usage.dailyTokens += tokens;
  }
  usage.requests += 1;
  
  userUsage.set(userId, usage);
}

/**
 * Get current usage for a user
 */
export function getUserUsage(userId: string): UserUsage {
  const now = Date.now();
  const today = getTodayTimestamp();
  
  let usage = userUsage.get(userId);
  
  // Create new usage record if doesn't exist
  if (!usage) {
    usage = {
      userId,
      dailyCost: 0,
      dailyTokens: 0,
      lastReset: today,
      requests: 0,
    };
    userUsage.set(userId, usage);
  }
  
  // Reset if it's a new day
  if (usage.lastReset < today) {
    usage.dailyCost = 0;
    usage.dailyTokens = 0;
    usage.requests = 0;
    usage.lastReset = today;
    userUsage.set(userId, usage);
  }
  
  return usage;
}

/**
 * Get remaining quota for a user
 */
export function getRemainingQuota(userId: string): {
  remainingCost: number;
  remainingTokens?: number;
  usedCost: number;
  usedTokens: number;
  percentageUsed: number;
} {
  const usage = getUserUsage(userId);
  const remainingCost = Math.max(0, quotaConfig.maxDailyCost - usage.dailyCost);
  const remainingTokens = quotaConfig.maxDailyTokens
    ? Math.max(0, quotaConfig.maxDailyTokens - usage.dailyTokens)
    : undefined;
  
  const percentageUsed = (usage.dailyCost / quotaConfig.maxDailyCost) * 100;
  
  return {
    remainingCost,
    remainingTokens,
    usedCost: usage.dailyCost,
    usedTokens: usage.dailyTokens,
    percentageUsed: Math.min(100, percentageUsed),
  };
}

/**
 * Reset quota for a user (admin function)
 */
export function resetUserQuota(userId: string): void {
  const usage = getUserUsage(userId);
  usage.dailyCost = 0;
  usage.dailyTokens = 0;
  usage.requests = 0;
  usage.lastReset = getTodayTimestamp();
  userUsage.set(userId, usage);
}

/**
 * Get today's timestamp (start of day)
 */
function getTodayTimestamp(): number {
  const now = new Date();
  const resetHour = quotaConfig.resetHour || 0;
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    resetHour,
    0,
    0,
    0
  );
  return today.getTime();
}

/**
 * Get all user usage statistics (admin function)
 */
export function getAllUserUsage(): Record<string, UserUsage> {
  const result: Record<string, UserUsage> = {};
  for (const [userId, usage] of userUsage.entries()) {
    result[userId] = { ...usage };
  }
  return result;
}

/**
 * Clear all usage data (admin function - use with caution)
 */
export function clearAllUsage(): void {
  userUsage.clear();
}
