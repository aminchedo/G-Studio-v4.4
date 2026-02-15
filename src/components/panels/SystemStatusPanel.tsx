/**
 * System Status Panel
 * 
 * User-facing transparency - makes system intelligence visible
 * without exposing internals. Read-only status display.
 */

import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Cpu, Database, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { LocalAIModelService } from '@/services/localAIModelService';
import { HybridDecisionEngine } from '@/services/hybridDecisionEngine';
import { ContextDatabaseBridge } from '@/services/contextDatabaseBridge';
import { MemoryPressureMonitor } from '@/services/memoryPressureMonitor';

interface SystemStatus {
  activeModel: 'API' | 'Local' | 'Hybrid' | 'Offline' | 'Unknown';
  contextSize: { tokens: number; entries: number };
  networkStatus: 'online' | 'offline';
  lastDiagnostic: 'passed' | 'failed' | 'not_run';
  memoryPressure: 'SAFE' | 'PRESSURE' | 'CRITICAL';
}

export const SystemStatusPanel: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    activeModel: 'Unknown',
    contextSize: { tokens: 0, entries: 0 },
    networkStatus: 'online',
    lastDiagnostic: 'not_run',
    memoryPressure: 'SAFE',
  });

  useEffect(() => {
    const updateStatus = async () => {
      try {
        // Get active model
        const modelStatus = LocalAIModelService.getStatus();
        const userPreference = HybridDecisionEngine.getUserPreference();
        const networkState = HybridDecisionEngine.checkNetworkState();
        
        let activeModel: SystemStatus['activeModel'] = 'Unknown';
        if (userPreference) {
          activeModel = userPreference as any;
        } else if (modelStatus === 'READY' && networkState === 'offline') {
          activeModel = 'Offline';
        } else if (modelStatus === 'READY') {
          activeModel = 'Hybrid';
        } else {
          activeModel = 'API';
        }

        // Get context size
        await ContextDatabaseBridge.init();
        const sessionId = await ContextDatabaseBridge.getCurrentSession();
        let contextSize = { tokens: 0, entries: 0 };
        if (sessionId) {
          const size = await ContextDatabaseBridge.getContextSize(sessionId);
          contextSize = { tokens: size.totalTokens, entries: size.entryCount };
        }

        // Get memory pressure
        const metrics = await MemoryPressureMonitor.getMetrics(sessionId);

        // Get last diagnostic (from localStorage)
        const lastDiagnostic = localStorage.getItem('gstudio_last_diagnostic') || 'not_run';

        setStatus({
          activeModel,
          contextSize,
          networkStatus: networkState,
          lastDiagnostic: lastDiagnostic as any,
          memoryPressure: metrics.pressureLevel,
        });

        console.log('[STATUS_PANEL]: UPDATED');
      } catch (error) {
        console.error('[SystemStatusPanel] Failed to update status:', error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'SAFE':
      case 'passed':
      case 'online':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'PRESSURE':
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'CRITICAL':
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-3">
      <h4 className="text-xs text-purple-300 mb-3 flex items-center gap-2 uppercase tracking-widest">
        <Activity strokeWidth={1.5} className="w-4 h-4" /> System Status
      </h4>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Active Model:</span>
          <span className="text-slate-200 font-medium">{status.activeModel}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Network:</span>
          <div className="flex items-center gap-1">
            {status.networkStatus === 'online' ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-400" />
            )}
            <span className="text-slate-200 font-medium capitalize">{status.networkStatus}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Context Size:</span>
          <span className="text-slate-200 font-medium">
            {status.contextSize.tokens.toLocaleString()} tokens ({status.contextSize.entries} entries)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Memory Pressure:</span>
          <div className="flex items-center gap-1">
            {getStatusIcon(status.memoryPressure)}
            <span className="text-slate-200 font-medium capitalize">{status.memoryPressure}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Last Diagnostic:</span>
          <div className="flex items-center gap-1">
            {getStatusIcon(status.lastDiagnostic)}
            <span className="text-slate-200 font-medium capitalize">{status.lastDiagnostic.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
