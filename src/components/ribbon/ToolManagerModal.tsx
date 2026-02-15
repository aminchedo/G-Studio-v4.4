import React, { useState, useEffect } from 'react';
import { X, FilePen, Trash2 } from 'lucide-react';

interface CustomTool {
  id: string;
  name: string;
  description: string;
}

interface ToolManagerModalProps {
  isOpen: boolean;
  tools?: CustomTool[];
  onClose: () => void;
  onToolAdd?: (tool: CustomTool) => void;
  onToolEdit?: (tool: CustomTool) => void;
  onToolDelete?: (id: string) => void;
}

export const ToolManagerModal: React.FC<ToolManagerModalProps> = ({
  isOpen,
  tools,
  onClose,
  onToolAdd,
  onToolEdit,
  onToolDelete
}) => {
  const [localTools, setLocalTools] = useState<CustomTool[]>(tools ?? []);
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [newToolName, setNewToolName] = useState('');
  const [newToolDescription, setNewToolDescription] = useState('');

  useEffect(() => {
    if (tools) setLocalTools(tools);
  }, [tools]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">Manage Custom Tools</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto space-y-4">
          {/* Add/Edit Tool Form */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Tool Name"
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <textarea
              placeholder="Tool Description"
              value={newToolDescription}
              onChange={(e) => setNewToolDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <button
              onClick={() => {
                if (editingTool) {
                  const updated: CustomTool = { ...editingTool, name: newToolName, description: newToolDescription };
                  if (onToolEdit) onToolEdit(updated);
                  else setLocalTools(prev => prev.map(t => t.id === updated.id ? updated : t));
                  setEditingTool(null);
                } else {
                  const id = Math.random().toString(36).slice(2, 9);
                  const created: CustomTool = { id, name: newToolName, description: newToolDescription };
                  if (onToolAdd) onToolAdd(created);
                  else setLocalTools(prev => [...prev, created]);
                }
                setNewToolName('');
                setNewToolDescription('');
              }}
              className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {editingTool ? 'Update Tool' : 'Add Tool'}
            </button>
            {editingTool && (
              <button
                onClick={() => {
                  setEditingTool(null);
                  setNewToolName('');
                  setNewToolDescription('');
                }}
                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Custom Tools List */}
          {(localTools.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Custom Tools</h4>
              {localTools.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-200">{tool.name}</div>
                    <div className="text-[10px] text-slate-400">{tool.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTool(tool);
                        setNewToolName(tool.name);
                        setNewToolDescription(tool.description);
                      }}
                      className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                      title="Edit"
                    >
                      <FilePen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (onToolDelete) onToolDelete(tool.id);
                        else setLocalTools(prev => prev.filter(t => t.id !== tool.id));
                      }}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
