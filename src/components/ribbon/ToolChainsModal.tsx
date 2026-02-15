import React from 'react';
import { X } from 'lucide-react';

interface ToolChainsModalProps {
  isOpen: boolean;
  toolChains?: string[][];
  chains?: string[][];
  onClose: () => void;
}

export const ToolChainsModal: React.FC<ToolChainsModalProps> = ({
  isOpen,
  toolChains,
  chains,
  onClose
}) => {
  if (!isOpen) return null;

  const list = chains ?? toolChains ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">Tool Chains</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {list.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No tool chains created yet</p>
          ) : (
            <ul className="space-y-2">
              {list.map((chain, index) => (
                <li key={index} className="p-2 bg-slate-700/50 rounded-lg">
                  <span className="text-xs text-slate-300 font-mono">{chain.join(' -> ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
