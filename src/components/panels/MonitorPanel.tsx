/**
 * Monitor Panel Component
 * Displays LLM metrics, quota usage, and performance statistics
 * This is a NEW component - doesn't modify existing UI
 */

import React, { useState, useEffect } from 'react';
import { getMonitorStats, getPerformanceDashboard, getAllQuotaStats } from '@/services/llmMonitor';
import { Activity, DollarSign, Zap, AlertTriangle, TrendingUp } from 'lucide-react';

interface MonitorPanelProps {
  userId?: string;
  onClose?: () => void;
  tokenUsage?: { prompt: number; response: number };
}

export default function MonitorPanel({ userId, onClose, tokenUsage }: MonitorPanelProps) {
  const [stats, setStats] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [quotaStats, setQuotaStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshStats = async () => {
    try {
      const monitorStats = getMonitorStats();
      const perfDashboard = getPerformanceDashboard();
      const quota = getAllQuotaStats();
      
      setStats(monitorStats);
      setDashboard(perfDashboard);
      setQuotaStats(quota);
    } catch (error) {
      console.error('Failed to fetch monitor stats:', error);
    }
  };

  useEffect(() => {
    refreshStats();
    
    if (autoRefresh) {
      const interval = setInterval(refreshStats, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (!stats || !dashboard) {
    return (
      <div className="p-4 text-sm text-slate-400">
        Loading monitor statistics...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/80 backdrop-blur-md border-l border-slate-800/60">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <h2 className="font-semibold text-slate-100">LLM Monitor</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-1">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3 h-3"
            />
            Auto-refresh
          </label>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800/50 rounded transition-colors text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-900">
        {/* Performance Overview */}
        <section>
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Performance
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Avg Latency</div>
              <div className="text-lg font-semibold text-slate-100">
                {dashboard.overview.avgLatency.toFixed(0)}ms
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Cache Hit Rate</div>
              <div className="text-lg font-semibold text-slate-100">
                {dashboard.overview.cacheHitRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Total Requests</div>
              <div className="text-lg font-semibold text-slate-100">
                {dashboard.overview.totalRequests.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Error Rate</div>
              <div className={`text-lg font-semibold ${
                dashboard.overview.errorRate > 5 ? 'text-red-400' : 'text-slate-100'
              }`}>
                {dashboard.overview.errorRate.toFixed(2)}%
              </div>
            </div>
          </div>
        </section>

        {/* Token Usage */}
        <section>
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Token Usage
          </h3>
          <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Tokens</span>
              <span className="font-semibold text-slate-100">
                {dashboard.tokenUsage.total.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Avg per Request</span>
              <span className="font-semibold text-slate-100">
                {dashboard.tokenUsage.avg.toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Prompt Tokens</span>
              <span className="font-semibold text-slate-100">
                {dashboard.tokenUsage.prompt.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Completion Tokens</span>
              <span className="font-semibold text-slate-100">
                {dashboard.tokenUsage.completion.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Cost */}
        <section>
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-400" />
            Cost
          </h3>
          <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Cost (Today)</span>
              <span className="font-semibold text-slate-100">
                ${dashboard.cost.total.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Avg per Request</span>
              <span className="font-semibold text-slate-100">
                ${dashboard.cost.avg.toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Cache Savings</span>
              <span className="font-semibold text-emerald-400">
                ${((dashboard.cache.hits * dashboard.cost.avg) || 0).toFixed(4)}
              </span>
            </div>
          </div>
        </section>

        {/* Quota */}
        <section>
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            Quota Status
          </h3>
          <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Users</span>
              <span className="font-semibold text-slate-100">
                {quotaStats?.totalUsers || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Daily Cost</span>
              <span className="font-semibold text-slate-100">
                ${quotaStats?.totalDailyCost?.toFixed(4) || '0.0000'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Users Near Limit</span>
              <span className={`font-semibold ${
                stats.quota.usersNearLimit > 0 ? 'text-orange-400' : 'text-slate-100'
              }`}>
                {stats.quota.usersNearLimit}
              </span>
            </div>
          </div>
        </section>

        {/* Cache Stats */}
        <section>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Cache Statistics</h3>
          <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Cache Hits</span>
              <span className="font-semibold text-emerald-400">
                {dashboard.cache.hits.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Cache Misses</span>
              <span className="font-semibold text-slate-100">
                {dashboard.cache.misses.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Hit Rate</span>
              <span className="font-semibold text-slate-100">
                {dashboard.cache.hitRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800/60 text-xs text-slate-400 text-center bg-slate-950">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
