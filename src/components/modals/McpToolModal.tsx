import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, AlertCircle, Loader2, 
  FilePlus, FileCheck, FilePen, ArrowRightLeft, 
  Trash2, FileSearch, Play, ScanSearch, 
  Wand2, Save, Download, List
} from 'lucide-react';

interface McpToolModalProps {
  isOpen: boolean;
  tool: string;
  onClose: () => void;
  onExecute?: (args: Record<string, any>) => Promise<void>;
  files?: Record<string, any>;
}

const TOOL_CONFIGS: Record<string, {
  icon: any;
  title: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'file-select';
    required: boolean;
    placeholder?: string;
    help?: string;
  }>;
}> = {
  create_file: {
    icon: FilePlus,
    title: 'Create File',
    description: 'Create a new file in the workspace',
    fields: [
      { name: 'path', label: 'File Path', type: 'text', required: true, placeholder: 'src/components/NewComponent.tsx', help: 'Include directory structure' },
      { name: 'content', label: 'File Content', type: 'textarea', required: false, placeholder: '// File content here...' }
    ]
  },
  read_file: {
    icon: FileCheck,
    title: 'Read File',
    description: 'Read the contents of a file',
    fields: [
      { name: 'path', label: 'File Path', type: 'file-select', required: true, placeholder: 'Select or enter file path' }
    ]
  },
  write_code: {
    icon: FilePen,
    title: 'Write Code',
    description: 'Write or overwrite file content',
    fields: [
      { name: 'filename', label: 'File Path', type: 'text', required: true, placeholder: 'src/components/Component.tsx' },
      { name: 'content', label: 'Code Content', type: 'textarea', required: true, placeholder: '// Your code here...' }
    ]
  },
  move_file: {
    icon: ArrowRightLeft,
    title: 'Move File',
    description: 'Move or rename a file',
    fields: [
      { name: 'source', label: 'Source Path', type: 'file-select', required: true, placeholder: 'Current file path' },
      { name: 'destination', label: 'Destination Path', type: 'text', required: true, placeholder: 'New file path' }
    ]
  },
  delete_file: {
    icon: Trash2,
    title: 'Delete File',
    description: 'Permanently delete a file',
    fields: [
      { name: 'path', label: 'File Path', type: 'file-select', required: true, placeholder: 'File to delete' }
    ]
  },
  search_files: {
    icon: FileSearch,
    title: 'Search Files',
    description: 'Search for text across all files',
    fields: [
      { name: 'query', label: 'Search Query', type: 'text', required: true, placeholder: 'Text to search for...' }
    ]
  },
  run: {
    icon: Play,
    title: 'Run Command',
    description: 'Execute a shell command',
    fields: [
      { name: 'command', label: 'Command', type: 'text', required: true, placeholder: 'ls, cat file.txt, etc.' }
    ]
  },
  project_overview: {
    icon: ScanSearch,
    title: 'Project Overview',
    description: 'Get project structure and statistics',
    fields: []
  },
  format_file: {
    icon: Wand2,
    title: 'Format File',
    description: 'Format code using Prettier',
    fields: [
      { name: 'path', label: 'File Path', type: 'file-select', required: true, placeholder: 'File to format' }
    ]
  },
  save_conversation: {
    icon: Save,
    title: 'Save Conversation',
    description: 'Save current conversation to local storage',
    fields: [
      { name: 'name', label: 'Conversation Name', type: 'text', required: true, placeholder: 'e.g., Project Analysis Session', help: 'Give it a descriptive name' },
      { name: 'description', label: 'Description (Optional)', type: 'text', required: false, placeholder: 'Brief description of this conversation' }
    ]
  },
  load_conversation: {
    icon: Download,
    title: 'Load Conversation',
    description: 'Load a previously saved conversation',
    fields: [
      { name: 'name', label: 'Conversation Name', type: 'text', required: true, placeholder: 'Enter conversation name to load' }
    ]
  },
  list_conversations: {
    icon: List,
    title: 'List Conversations',
    description: 'View all saved conversations',
    fields: []
  },
  delete_conversation: {
    icon: Trash2,
    title: 'Delete Conversation',
    description: 'Delete a saved conversation',
    fields: [
      { name: 'name', label: 'Conversation Name', type: 'text', required: true, placeholder: 'Enter conversation name to delete' }
    ]
  }
};

export const McpToolModal: React.FC<McpToolModalProps> = ({ isOpen, tool, onClose, onExecute, files = {} }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const config = TOOL_CONFIGS[tool];

  useEffect(() => {
    if (isOpen && config) {
      setFormData({});
      setError(null);
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, tool, config]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExecuting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isExecuting]);

  if (!isOpen || !config) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsExecuting(true);

    try {
      if (!onExecute) {
        // No executor provided by parent; close modal gracefully.
        onClose();
        return;
      }

      await onExecute(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fileList = Object.keys(files);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-100 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-white">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-ocean-600 via-ocean-500 to-ocean-600 flex items-center justify-center shadow-xl shadow-ocean-500/30 ring-2 ring-ocean-400/20 group/icon overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-ocean-500/40 hover:ring-ocean-400/40">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/icon:opacity-100 group-hover/icon:animate-shimmer transition-opacity duration-500" />
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <config.icon 
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7 text-white relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 group-hover/icon:scale-110 group-hover/icon:rotate-3" 
              />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{config.title}</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{config.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all group/close hover:scale-110">
            <X 
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 transition-transform duration-200 group-hover/close:rotate-90" 
            />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-burgundy-50 border border-burgundy-100 rounded-xl text-sm text-burgundy-700 shadow-sm">
              <AlertCircle 
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 flex-shrink-0" 
              />
              <span>{error}</span>
            </div>
          )}

          {config.fields.map((field, idx) => (
            <div key={field.name} className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                {field.label}
                {field.required && <span className="text-burgundy-500">*</span>}
              </label>
              
              {field.type === 'textarea' ? (
                <textarea
                  ref={idx === 0 ? firstInputRef as any : undefined}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={8}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent font-mono text-sm resize-none"
                />
              ) : field.type === 'file-select' ? (
                <div className="space-y-2">
                  <select
                    ref={idx === 0 ? firstInputRef as any : undefined}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-sm"
                  >
                    <option value="">{field.placeholder || 'Select a file...'}</option>
                    {fileList.map(file => (
                      <option key={file} value={file}>{file}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder="Or type file path..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-sm font-mono"
                  />
                </div>
              ) : (
                <input
                  ref={idx === 0 ? firstInputRef as any : undefined}
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-sm font-mono"
                />
              )}
              
              {field.help && (
                <p className="text-xs text-slate-400">{field.help}</p>
              )}
            </div>
          ))}

          {config.fields.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No parameters required for this tool.</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all uppercase tracking-wide"
            disabled={isExecuting}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isExecuting || config.fields.some(f => f.required && !formData[f.name])}
            className="px-8 py-3 rounded-xl bg-ocean-600 text-white text-xs font-bold hover:bg-ocean-700 shadow-lg shadow-ocean-600/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <Loader2 
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 animate-spin" 
                />
                Executing...
              </>
            ) : (
              <>
                <Check 
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4" 
                />
                Execute
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
