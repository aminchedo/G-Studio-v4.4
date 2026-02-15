/**
 * MCP Connection Status Component
 * Displays the status of all MCP connections for agent visibility
 */

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plug,
  PlugZap
} from 'lucide-react';

// Types - defined locally to avoid import issues
interface McpConnection {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'idle';
  lastHealthCheck?: Date;
  lastError?: string;
  tools: string[];
  metadata?: {
    version?: string;
    description?: string;
  };
}

interface McpConnectionStatus {
  total: number;
  connected: number;
  disconnected: number;
  connecting: number;
  error: number;
  idle: number;
}

interface McpConnectionStatusProps {
  compact?: boolean;
  showDetails?: boolean;
}

export const McpConnectionStatus: React.FC<McpConnectionStatusProps> = ({
  compact = false,
  showDetails = false
}) => {
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [status, setStatus] = useState<McpConnectionStatus | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      try {
        // Dynamically import to handle browser/server differences
        const { getMcpConnectionManager } = await import('@/services/mcpConnectionManager');
        const manager = getMcpConnectionManager();
        
        const updateStatus = () => {
          if (!mounted) return;
          try {
            setConnections(manager.getAllConnections());
            setStatus(manager.getStatusSummary());
            setError(null);
          } catch (err) {
            console.warn('[McpConnectionStatus] Error updating status:', err);
            if (mounted) {
              setError(err instanceof Error ? err.message : 'Unknown error');
            }
          }
        };

        // Initial load
        updateStatus();

        // Update every 5 seconds
        interval = setInterval(updateStatus, 5000);
      } catch (err) {
        console.warn('[McpConnectionStatus] MCP Connection Manager not available:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'MCP Manager unavailable');
          // Set empty status if manager is not available
          setConnections([]);
          setStatus({ total: 0, connected: 0, disconnected: 0, connecting: 0, error: 0, idle: 0 });
        }
      }
    };

    init();
    
    return () => {
      mounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const handleRefresh = async () => {
    if (typeof window === 'undefined') return;
    
    setIsRefreshing(true);
    try {
      const { getMcpConnectionManager } = await import('@/services/mcpConnectionManager');
      const manager = getMcpConnectionManager();
      await manager.connectAll();
      setConnections(manager.getAllConnections());
      setStatus(manager.getStatusSummary());
      setError(null);
    } catch (err) {
      console.warn('[McpConnectionStatus] Error refreshing connections:', err);
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const getStatusIcon = (status: McpConnection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'connecting':
        return <Loader2 size={14} className="text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle size={14} className="text-red-500" />;
      case 'disconnected':
        return <XCircle size={14} className="text-slate-400" />;
      default:
        return <AlertCircle size={14} className="text-slate-500" />;
    }
  };

  const getStatusColor = (status: McpConnection['status']) => {
    switch (status) {
      case 'connected':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'connecting':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'disconnected':
        return 'text-slate-400 bg-slate-50 border-slate-200';
      default:
        return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  // Don't render if we're in a non-browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  // Show error state if there's an error and no status
  if (error && !status) {
    if (compact) {
      return null; // Don't show errors in compact mode
    }
    return (
      <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-y border-red-200">
        MCP Status unavailable: {error}
      </div>
    );
  }

  // Don't render if status is null
  if (!status) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100 border-y border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Plug size={14} className={status.connected > 0 ? 'text-emerald-600' : 'text-slate-400'} />
          <span>MCP:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getStatusColor('connected')}`}>
            {status.connected}/{status.total}
          </span>
          {status.error > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded border text-red-600 bg-red-50 border-red-200">
              {status.error} errors
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border-y border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <PlugZap size={16} className="text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">MCP Connections</span>
          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center gap-1 text-xs">
              <CheckCircle2 size={12} className="text-emerald-600" />
              <span className="text-slate-600">{status.connected}</span>
            </div>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-slate-600">{status.total}</span>
            {status.error > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1 text-xs">
                  <XCircle size={12} className="text-red-600" />
                  <span className="text-red-600">{status.error}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
            title="Refresh connections"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Connection List */}
      {expanded && (
        <div className="max-h-64 overflow-y-auto">
          {connections.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No MCP connections registered
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="px-4 py-2.5 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getStatusIcon(connection.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700 truncate">
                            {connection.name}
                          </span>
                          {connection.metadata?.version && (
                            <span className="text-xs text-slate-400">
                              v{connection.metadata.version}
                            </span>
                          )}
                        </div>
                        {showDetails && connection.metadata?.description && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {connection.metadata.description}
                          </p>
                        )}
                        {connection.tools.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-slate-400">
                              {connection.tools.length} tool{connection.tools.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {connection.lastError && (
                        <div className="text-xs text-red-600 max-w-xs truncate" title={connection.lastError}>
                          {connection.lastError}
                        </div>
                      )}
                      {connection.lastHealthCheck && (
                        <span className="text-xs text-slate-400">
                          {new Date(connection.lastHealthCheck).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
