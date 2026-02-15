import React from 'react';
import { X, TrendingUp } from 'lucide-react';

interface CodeMetrics {
  complexity: string;
  maintainability: string;
  testCoverage: string;
  securityScore: string;
}

interface CodeMetricsModalProps {
  isOpen: boolean;
  codeMetrics?: CodeMetrics | null;
  metrics?: CodeMetrics | null;
  activeFile?: string | null;
  files?: Record<string, any>;
  onClose: () => void;
}

export const CodeMetricsModal: React.FC<CodeMetricsModalProps> = ({
  isOpen,
  codeMetrics,
  metrics,
  activeFile,
  files,
  onClose
}) => {
  const current = metrics ?? codeMetrics ?? null;
  if (!isOpen || !current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Real-time Code Metrics
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <span className="text-xs text-slate-300">Complexity</span>
            <span className="text-xs font-semibold text-slate-200">{current.complexity}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <span className="text-xs text-slate-300">Maintainability</span>
            <span className="text-xs font-semibold text-slate-200">{current.maintainability}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <span className="text-xs text-slate-300">Test Coverage</span>
            <span className="text-xs font-semibold text-slate-200">{current.testCoverage}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <span className="text-xs text-slate-300">Security Score</span>
            <span className="text-xs font-semibold text-slate-200">{current.securityScore}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
