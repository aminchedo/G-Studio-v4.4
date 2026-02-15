import React from 'react';
import { X, BarChart3 } from 'lucide-react';

interface ToolUsageAnalyticsModalProps {
  isOpen: boolean;
  toolUsage?: Record<string, number>;
  usage?: Record<string, number>;
  onClose: () => void;
}

export const ToolUsageAnalyticsModal: React.FC<ToolUsageAnalyticsModalProps> = ({
  isOpen,
  toolUsage,
  usage,
  onClose
}) => {
  if (!isOpen) return null;

  const data = usage ?? toolUsage ?? {};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Tool Usage Analytics
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {Object.keys(data).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No tool usage data yet</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(data)
                .sort(([, a], [, b]) => b - a)
                .map(([tool, count]) => (
                  <li key={tool} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                    <span className="text-xs text-slate-300">{tool}</span>
                    <span className="text-xs font-semibold text-slate-200">{count} times used</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
