/**
 * SystemStatusDashboard Component - Comprehensive System Monitoring
 * Displays API status, quota usage, rate limits, and health metrics
 */

import React, { useState, useEffect } from 'react';
import { Activity, Zap, TrendingUp, AlertCircle, CheckCircle, Clock, Database, Cpu } from 'lucide-react';

export interface SystemStatus {
  apiConnection: 'connected' | 'connecting' | 'disconnected' | 'error';
  modelName: string;
  tokenUsage: {
    used: number;
    limit: number;
    percentage: number;
  };
  rateLimit: {
    remaining: number;
    limit: number;
    resetTime: Date;
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
    errorRate: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    lastCheck: Date;
  };
}

export interface StatusHistoryEntry {
  timestamp: Date;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export interface SystemStatusDashboardProps {
  status: SystemStatus;
  history?: StatusHistoryEntry[];
  onRefresh?: () => void;
  compact?: boolean;
}

export const SystemStatusDashboard: React.FC<SystemStatusDashboardProps> = ({
  status,
  history = [],
  onRefresh,
  compact = false,
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'history'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      onRefresh?.();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  // Get status color
  const getStatusColor = (connectionStatus: SystemStatus['apiConnection']) => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'disconnected': return 'text-gray-400';
      case 'error': return 'text-red-400';
    }
  };

  // Get status icon
  const getStatusIcon = (connectionStatus: SystemStatus['apiConnection']) => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-5 h-5" />;
      case 'connecting': return <Clock className="w-5 h-5 animate-spin" />;
      case 'disconnected': return <AlertCircle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
    }
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-800 border-t border-slate-700 text-sm">
        <div className={`flex items-center gap-2 ${getStatusColor(status.apiConnection)}`}>
          {getStatusIcon(status.apiConnection)}
          <span className="capitalize">{status.apiConnection}</span>
        </div>
        <div className="text-slate-400">
          Model: <span className="text-white">{status.modelName}</span>
        </div>
        <div className="text-slate-400">
          Tokens: <span className="text-white">{status.tokenUsage.used.toLocaleString()} / {status.tokenUsage.limit.toLocaleString()}</span>
        </div>
        <div className="text-slate-400">
          Rate: <span className="text-white">{status.rateLimit.remaining} / {status.rateLimit.limit}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">System Status</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {(['overview', 'performance', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              selectedTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedTab === 'overview' && (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">API Connection</h4>
                <div className={`flex items-center gap-2 ${getStatusColor(status.apiConnection)}`}>
                  {getStatusIcon(status.apiConnection)}
                  <span className="capitalize">{status.apiConnection}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Model:</span>
                  <span className="ml-2 text-white">{status.modelName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Health:</span>
                  <span className={`ml-2 capitalize ${
                    status.health.status === 'healthy' ? 'text-green-400' :
                    status.health.status === 'degraded' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {status.health.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Token Usage */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Token Usage
                </h4>
                <span className="text-sm text-slate-400">
                  {status.tokenUsage.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="mb-2">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      status.tokenUsage.percentage > 80 ? 'bg-red-500' :
                      status.tokenUsage.percentage > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${status.tokenUsage.percentage}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>{status.tokenUsage.used.toLocaleString()} used</span>
                <span>{status.tokenUsage.limit.toLocaleString()} limit</span>
              </div>
            </div>

            {/* Rate Limits */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Rate Limits
                </h4>
                <span className="text-sm text-slate-400">
                  Resets in {Math.ceil((status.rateLimit.resetTime.getTime() - Date.now()) / 60000)}m
                </span>
              </div>
              <div className="mb-2">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${(status.rateLimit.remaining / status.rateLimit.limit) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>{status.rateLimit.remaining} remaining</span>
                <span>{status.rateLimit.limit} limit</span>
              </div>
            </div>

            {/* System Health */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                System Health
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Uptime:</span>
                  <span className="ml-2 text-white">{formatUptime(status.health.uptime)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Last Check:</span>
                  <span className="ml-2 text-white">
                    {status.health.lastCheck.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'performance' && (
          <div className="space-y-4">
            {/* Response Time */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Average Response Time
              </h4>
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {status.performance.avgResponseTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-slate-400">
                {status.performance.avgResponseTime < 1000 ? 'Excellent' :
                 status.performance.avgResponseTime < 3000 ? 'Good' :
                 'Needs Improvement'}
              </div>
            </div>

            {/* Success Rate */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Success Rate
              </h4>
              <div className="text-3xl font-bold text-green-400 mb-2">
                {status.performance.successRate.toFixed(1)}%
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${status.performance.successRate}%` }}
                />
              </div>
            </div>

            {/* Error Rate */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Error Rate
              </h4>
              <div className="text-3xl font-bold text-red-400 mb-2">
                {status.performance.errorRate.toFixed(1)}%
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${status.performance.errorRate}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'history' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No status history available
              </div>
            ) : (
              history.map((entry, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-800 rounded-lg flex items-start gap-3"
                >
                  <div className={`mt-1 ${
                    entry.status === 'success' ? 'text-green-400' :
                    entry.status === 'warning' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {entry.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                     <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{entry.message}</span>
                      <span className="text-xs text-slate-400">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {entry.details && (
                      <p className="text-xs text-slate-400">{entry.details}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStatusDashboard;
