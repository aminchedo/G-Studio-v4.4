/**
 * LLM Monitor Service
 * Provides monitoring and metrics for LLM operations
 * Integrates with the new LLM gateway modules
 */

import { exportMetrics, exportPrometheusFormat, getAllMetricSummaries } from '@/llm/telemetry';
import { getRemainingQuota, getAllUserUsage } from '@/llm/quota';
import { getAgentStats } from '@/llm/agent';

export interface MonitorStats {
  metrics: ReturnType<typeof getAllMetricSummaries>;
  quota: {
    totalUsers: number;
    usersNearLimit: number;
    totalDailyCost: number;
  };
  performance: {
    avgLatency: number;
    cacheHitRate: number;
    errorRate: number;
  };
}

/**
 * Get comprehensive monitoring statistics
 */
export function getMonitorStats(): MonitorStats {
  const metrics = getAllMetricSummaries();
  const allUsage = getAllUserUsage();
  
  // Calculate quota statistics
  const users = Object.values(allUsage);
  const totalDailyCost = users.reduce((sum, u) => sum + u.dailyCost, 0);
  const usersNearLimit = users.filter(u => u.dailyCost > 1.5).length; // > 75% of $2 limit
  
  // Calculate performance metrics
  const latencySummary = metrics['latency_ms'];
  const cacheHitSummary = metrics['cache_hit'];
  const cacheMissSummary = metrics['cache_miss'];
  const errorSummary = metrics['error_count'];
  const requestSummary = metrics['request_count'];
  
  const totalCacheOps = (cacheHitSummary?.count || 0) + (cacheMissSummary?.count || 0);
  const cacheHitRate = totalCacheOps > 0 
    ? ((cacheHitSummary?.count || 0) / totalCacheOps) * 100 
    : 0;
  
  const totalRequests = requestSummary?.count || 1;
  const errorRate = errorSummary 
    ? (errorSummary.count / totalRequests) * 100 
    : 0;
  
  return {
    metrics,
    quota: {
      totalUsers: users.length,
      usersNearLimit,
      totalDailyCost: Number(totalDailyCost.toFixed(4)),
    },
    performance: {
      avgLatency: latencySummary?.avg || 0,
      cacheHitRate: Number(cacheHitRate.toFixed(2)),
      errorRate: Number(errorRate.toFixed(2)),
    },
  };
}

/**
 * Get metrics for a specific user
 */
export function getUserMonitorStats(userId: string) {
  return getAgentStats(userId);
}

/**
 * Export metrics in OpenTelemetry format
 */
export function exportTelemetryMetrics() {
  return exportMetrics();
}

/**
 * Export metrics in Prometheus format
 */
export function exportPrometheusMetrics(): string {
  return exportPrometheusFormat();
}

/**
 * Get quota statistics for all users
 */
export function getAllQuotaStats() {
  const allUsage = getAllUserUsage();
  const stats = Object.entries(allUsage).map(([userId, usage]) => ({
    userId,
    dailyCost: usage.dailyCost,
    dailyTokens: usage.dailyTokens,
    requests: usage.requests,
    lastReset: new Date(usage.lastReset).toISOString(),
  }));
  
  return {
    totalUsers: stats.length,
    totalDailyCost: stats.reduce((sum, s) => sum + s.dailyCost, 0),
    totalDailyTokens: stats.reduce((sum, s) => sum + s.dailyTokens, 0),
    totalRequests: stats.reduce((sum, s) => sum + s.requests, 0),
    users: stats,
  };
}

/**
 * Get performance dashboard data
 */
export function getPerformanceDashboard() {
  const stats = getMonitorStats();
  const metrics = getAllMetricSummaries();
  
  return {
    overview: {
      totalRequests: metrics['request_count']?.count || 0,
      avgLatency: stats.performance.avgLatency,
      cacheHitRate: stats.performance.cacheHitRate,
      errorRate: stats.performance.errorRate,
    },
    tokenUsage: {
      total: metrics['tokens_used']?.sum || 0,
      avg: metrics['tokens_used']?.avg || 0,
      prompt: metrics['tokens_prompt']?.sum || 0,
      completion: metrics['tokens_completion']?.sum || 0,
    },
    cost: {
      total: metrics['cost_usd']?.sum || 0,
      avg: metrics['cost_usd']?.avg || 0,
    },
    cache: {
      hits: metrics['cache_hit']?.count || 0,
      misses: metrics['cache_miss']?.count || 0,
      hitRate: stats.performance.cacheHitRate,
    },
    quota: stats.quota,
  };
}
