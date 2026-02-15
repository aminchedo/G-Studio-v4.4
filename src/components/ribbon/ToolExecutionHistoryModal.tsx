import React from 'react';
import { X } from 'lucide-react';

interface ToolExecution {
  tool: string;
  timestamp: Date;
  success: boolean;
}

interface ToolExecutionHistoryModalProps {
  isOpen: boolean;
  toolExecutionHistory?: ToolExecution[];
  history?: ToolExecution[];
  onClose: () => void;
}

export const ToolExecutionHistoryModal: React.FC<ToolExecutionHistoryModalProps> = ({
  isOpen,
  toolExecutionHistory,
  history,
  onClose
}) => {
  if (!isOpen) return null;

  const executions = history ?? toolExecutionHistory ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">Tool Execution History</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {executions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No tool executions yet</p>
          ) : (
            <ul className="space-y-2">
              {executions.map((execution, index) => (
                <li key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                  <span className="text-xs text-slate-300 font-mono">{execution.tool}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${execution.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {execution.success ? 'Success' : 'Failure'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {execution.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
