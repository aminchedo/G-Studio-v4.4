/**
 * GeminiTesterUI - Main UI Layout
 * 
 * Component for tab navigation and layout structure
 */

import React from 'react';
import { X, Settings, BarChart3, Terminal, Activity } from 'lucide-react';
import { useGeminiTester } from './GeminiTesterContext';
import { GeminiTesterConfigPanel } from './GeminiTesterConfigPanel';
import { GeminiTesterControls } from './GeminiTesterControls';
import { GeminiTesterResults } from './GeminiTesterResults';

interface GeminiTesterUIProps {
  onClose?: () => void;
}

export const GeminiTesterUI: React.FC<GeminiTesterUIProps> = React.memo(({ onClose }) => {
  const { activeTab, setActiveTab, logs, testing } = useGeminiTester();

  const tabs = [
    { id: 'setup', label: 'Setup', icon: Settings },
    { id: 'controls', label: 'Controls', icon: Activity },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'logs', label: 'Logs', icon: Terminal, badge: logs.length > 0 ? logs.length : undefined }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
        <div>
          <h1 className="text-2xl font-bold text-white">Gemini Model Tester</h1>
          <p className="text-sm text-slate-400 mt-1">
            Comprehensive testing suite for Google Gemini AI models
          </p>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            disabled={testing}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Close"
          >
            <X className="w-6 h-6 text-slate-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-800 bg-slate-950">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all relative ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'setup' && <GeminiTesterConfigPanel />}
        {activeTab === 'controls' && <GeminiTesterControls />}
        {activeTab === 'results' && <GeminiTesterResults />}
        {activeTab === 'logs' && <LogsPanel />}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Gemini Model Tester v2.0 - Optimized & Modular</span>
          <span>
            {testing ? (
              <span className="flex items-center gap-2 text-blue-400">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Testing in progress...
              </span>
            ) : (
              'Ready'
            )}
          </span>
        </div>
      </div>
    </div>
  );
});

GeminiTesterUI.displayName = 'GeminiTesterUI';

/**
 * Logs Panel Component
 */
const LogsPanel: React.FC = React.memo(() => {
  const { logs, clearLogs } = useGeminiTester();

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'debug': return '🔍';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'debug': return 'text-slate-500';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-semibold text-white">Logs</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time testing logs and debug information
          </p>
        </div>
        
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-white transition-colors"
          >
            Clear Logs
          </button>
        )}
      </div>

      {/* Logs Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Terminal className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No logs yet</p>
              <p className="text-sm text-slate-500">
                Logs will appear here when you start testing
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 font-mono text-sm">
            {logs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
              >
                <span className="text-lg flex-shrink-0">
                  {getLogIcon(log.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`${getLogColor(log.type)} break-words`}>
                    {log.message}
                  </p>
                  {log.data && (
                    <pre className="mt-2 text-xs text-slate-500 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

LogsPanel.displayName = 'LogsPanel';
