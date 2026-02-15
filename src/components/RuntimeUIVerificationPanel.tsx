/**
 * Runtime UI Verification Panel
 * 
 * Displays live UI binding status and self-healing activity.
 * Only visible in development mode or when explicitly enabled.
 */

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

interface RuntimeUIVerificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuntimeUIVerificationPanel: React.FC<RuntimeUIVerificationPanelProps> = ({ isOpen, onClose }) => {
  const [bindingMap, setBindingMap] = useState<any>(null);
  const [fixLog, setFixLog] = useState<any>(null);
  const [verdict, setVerdict] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updateData = () => {
      const { runtimeUIVerification } = require('../services/runtimeUIVerification');
      setBindingMap(runtimeUIVerification.getLiveBindingMap());
      setFixLog(runtimeUIVerification.getDeadControlFixLog());
      setVerdict(runtimeUIVerification.getRuntimeVerdict());
    };

    updateData();
    const interval = setInterval(updateData, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Runtime UI Verification</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Verdict */}
          {verdict && (
            <div className={`p-4 rounded-lg border-2 ${
              verdict.operational 
                ? 'bg-emerald-900/20 border-emerald-500/40' 
                : 'bg-amber-900/20 border-amber-500/40'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                {verdict.operational ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                )}
                <h3 className="font-bold text-white">
                  UI Status: {verdict.operational ? 'FULLY OPERATIONAL' : 'ISSUES DETECTED'}
                </h3>
              </div>
              <div className="text-sm text-slate-300 space-y-1">
                <p>Total Elements: {verdict.details.total}</p>
                <p>Working: {verdict.details.working}</p>
                <p>Broken: {verdict.details.broken}</p>
                <p>Success Rate: {verdict.details.percentage}%</p>
              </div>
            </div>
          )}

          {/* Binding Map */}
          {bindingMap && (
            <div className="space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Live Binding Map
              </h3>
              <div className="bg-slate-800 rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                {bindingMap.elements.slice(0, 20).map((element: any) => (
                  <div
                    key={element.id}
                    className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-700"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{element.label}</div>
                      <div className="text-xs text-slate-400">{element.component}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {element.hasHandler ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                  </div>
                ))}
                {bindingMap.elements.length > 20 && (
                  <div className="text-xs text-slate-400 text-center">
                    ... and {bindingMap.elements.length - 20} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fix Log */}
          {fixLog && fixLog.fixes.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-white">Self-Healing Activity</h3>
              <div className="bg-slate-800 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {fixLog.fixes.map((fix: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-900 rounded border border-purple-500/40"
                  >
                    <div className="text-sm text-white">
                      <span className="font-mono text-xs text-purple-400">{fix.requestId}</span>
                      {' - '}
                      {fix.elementId}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Fixed: {fix.fix} at {new Date(fix.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
