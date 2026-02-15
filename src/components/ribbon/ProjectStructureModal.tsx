import React from 'react';
import { X, FolderTree, FolderPlus, Code2, FileCode, FileJson, Palette, Globe, FileText } from 'lucide-react';
import { FileData } from '../../types';

interface ProjectStructureModalProps {
  isOpen: boolean;
  files: Record<string, FileData>;
  onClose: () => void;
}

export const ProjectStructureModal: React.FC<ProjectStructureModalProps> = ({
  isOpen,
  files,
  onClose
}) => {
  if (!isOpen) return null;

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconProps = {
      strokeWidth: 2,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      className: "w-4 h-4"
    };
    switch (ext) {
      case 'tsx':
      case 'ts': return <Code2 {...iconProps} className={`${iconProps.className} text-ocean-600`} />;
      case 'jsx':
      case 'js': return <FileCode {...iconProps} className={`${iconProps.className} text-amber-500`} />;
      case 'json': return <FileJson {...iconProps} className={`${iconProps.className} text-orange-400`} />;
      case 'css':
      case 'scss': return <Palette {...iconProps} className={`${iconProps.className} text-pink-500`} />;
      case 'html': return <Globe {...iconProps} className={`${iconProps.className} text-emerald-500`} />;
      default: return <FileText {...iconProps} className={`${iconProps.className} text-slate-400`} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 shadow-md rounded-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-950">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <FolderTree strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-ocean-600" /> Project Overview
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
              {Object.keys(files).length} Files Detected
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all duration-200 border border-transparent hover:border-slate-700"
          >
            <X strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" />
          </button>
        </div>
        
        {/* List */}
        <div className="overflow-y-auto p-4 flex-1 bg-slate-900">
          {Object.keys(files).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
              <FolderPlus strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 opacity-50" />
              <p className="text-xs font-medium">No files in workspace</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([path, data]) => (
                <div key={path} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-ocean-200 hover:bg-ocean-50/30 transition-all group">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all border border-slate-100">
                    {getFileIcon(path)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-slate-700 font-mono truncate">{path}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider bg-slate-100 px-1.5 rounded-md">
                        {data.language}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {data.content.length.toLocaleString()} chars
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800/60 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all duration-200 shadow-sm"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
