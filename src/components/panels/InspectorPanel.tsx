import React from 'react';
import { Activity, FileCode, Database, Zap } from 'lucide-react';
import { FileData } from '@/types';

interface InspectorPanelProps {
  activeFile: string | null;
  files: Record<string, FileData>;
  openFiles?: string[];
  tokenUsage?: { prompt: number; response: number };
  onClose?: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = React.memo(({
  activeFile,
  files,
  openFiles = [],
  tokenUsage = { prompt: 0, response: 0 },
  onClose
}) => {
  const activeFileData = activeFile ? files[activeFile] : null;
  const totalTokens = tokenUsage.prompt + tokenUsage.response;

  return (
    <div className="w-full h-full border-l border-slate-800/60 bg-slate-900/80 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="h-[60px] border-b border-slate-800/60 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-200">
          <Activity strokeWidth={2} className="w-3.5 h-3.5 text-emerald-400" />
          <span>Inspector</span>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            aria-label="Close inspector panel" 
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-all text-slate-400 hover:text-slate-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content - Scalable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {activeFileData ? (
          <>
            {/* File Info */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  File Info
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-bold text-slate-200">Path:</span>
                  <div className="text-slate-400 font-mono text-xs mt-1 break-all">
                    {activeFile}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-200">Language:</span>
                  <span className="text-slate-400 ml-2">{activeFileData.language || 'unknown'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-200">Size:</span>
                  <span className="text-slate-400 ml-2">
                    {activeFileData.content.length.toLocaleString()} chars
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-200">Lines:</span>
                  <span className="text-slate-400 ml-2">
                    {activeFileData.content.split('\n').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Project Stats */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-emerald-400" />
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  Project Stats
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-bold text-slate-200">Total Files:</span>
                  <span className="text-slate-400 ml-2">{Object.keys(files).length}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-200">Open Files:</span>
                  <span className="text-slate-400 ml-2">{openFiles.length}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-200">Tokens Used:</span>
                  <span className="text-slate-400 ml-2">{totalTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Token Breakdown */}
            {totalTokens > 0 && (
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Token Usage
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-bold text-slate-200">Prompt:</span>
                    <span className="text-slate-400 ml-2">
                      {tokenUsage.prompt.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-200">Response:</span>
                    <span className="text-slate-400 ml-2">
                      {tokenUsage.response.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/50">
                    <span className="font-bold text-slate-200">Total:</span>
                    <span className="text-slate-400 ml-2">
                      {totalTokens.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-slate-400 text-sm py-8">
            No file selected
          </div>
        )}
      </div>
    </div>
  );
});
