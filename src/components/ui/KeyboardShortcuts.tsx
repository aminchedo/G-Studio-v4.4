/**
 * KeyboardShortcuts Component - Comprehensive Keyboard Navigation
 * Provides customizable keyboard shortcuts and cheat sheet
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Keyboard, X, Search, Edit2, Save, Download } from 'lucide-react';

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: 'file' | 'edit' | 'view' | 'navigation' | 'search' | 'debug' | 'general';
  action: () => void;
  enabled?: boolean;
  customizable?: boolean;
}

export interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  onShortcutChange?: (id: string, newKeys: string[]) => void;
  onShortcutExecute?: (id: string) => void;
}

export const KeyboardShortcutsManager: React.FC<KeyboardShortcutsProps> = ({
  shortcuts,
  onShortcutChange,
  onShortcutExecute,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Build key combination
      const keys: string[] = [];
      if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
        keys.push(e.key.toUpperCase());
      }

      const keyCombo = keys.join('+');

      // Find matching shortcut
      const shortcut = shortcuts.find(s => 
        s.enabled !== false && s.keys.join('+') === keyCombo
      );

      if (shortcut) {
        e.preventDefault();
        shortcut.action();
        onShortcutExecute?.(shortcut.id);
      }

      // Open shortcuts panel with Ctrl+/
      if (keyCombo === 'Ctrl+/') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, onShortcutExecute]);

  // Record new shortcut
  useEffect(() => {
    if (!editingShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      const keys: string[] = [];
      if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
        keys.push(e.key.toUpperCase());
      }

      if (keys.length > 0) {
        setRecordingKeys(keys);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (recordingKeys.length > 0) {
        onShortcutChange?.(editingShortcut, recordingKeys);
        setEditingShortcut(null);
        setRecordingKeys([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editingShortcut, recordingKeys, onShortcutChange]);

  // Filter shortcuts
  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesSearch = searchQuery === '' || 
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.keys.join('+').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || shortcut.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'file', label: 'File' },
    { id: 'edit', label: 'Edit' },
    { id: 'view', label: 'View' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'search', label: 'Search' },
    { id: 'debug', label: 'Debug' },
    { id: 'general', label: 'General' },
  ];

  const exportShortcuts = () => {
    const data = JSON.stringify(shortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keyboard-shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importShortcuts = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target?.result as string);
            // Apply imported shortcuts
            imported.forEach((shortcut: KeyboardShortcut) => {
              onShortcutChange?.(shortcut.id, shortcut.keys);
            });
          } catch (error) {
            console.error('Failed to import shortcuts:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const resetToDefaults = () => {
    if (confirm('Reset all shortcuts to defaults?')) {
      // Reset logic would go here
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg transition-colors z-50"
        title="Keyboard Shortcuts (Ctrl+/)"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportShortcuts}
              className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
              title="Export Shortcuts"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={importShortcuts}
              className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
              title="Import Shortcuts"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={resetToDefaults}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Search & Categories */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map(shortcut => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between p-3 bg-slate-800 rounded hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-white">{shortcut.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {editingShortcut === shortcut.id ? (
                        <div className="px-3 py-1 bg-blue-600 text-white text-sm rounded animate-pulse">
                          {recordingKeys.length > 0 ? recordingKeys.join('+') : 'Press keys...'}
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          {shortcut.keys.map((key, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && <span className="text-slate-500">+</span>}
                              <kbd className="px-2 py-1 bg-slate-700 text-slate-200 text-xs rounded border border-slate-600">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                      
                      {shortcut.customizable !== false && (
                        <button
                          onClick={() => {
                            setEditingShortcut(shortcut.id);
                            setRecordingKeys([]);
                          }}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                          title="Edit Shortcut"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Keyboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No shortcuts found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950">
          <p className="text-xs text-slate-400 text-center">
            Press <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">Ctrl+/</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
};

// Default shortcuts configuration
export const defaultShortcuts: KeyboardShortcut[] = [
  // File
  { id: 'new-file', keys: ['Ctrl', 'N'], description: 'New File', category: 'file', action: () => {}, customizable: true },
  { id: 'open-file', keys: ['Ctrl', 'O'], description: 'Open File', category: 'file', action: () => {}, customizable: true },
  { id: 'save-file', keys: ['Ctrl', 'S'], description: 'Save File', category: 'file', action: () => {}, customizable: true },
  { id: 'save-all', keys: ['Ctrl', 'Shift', 'S'], description: 'Save All', category: 'file', action: () => {}, customizable: true },
  { id: 'close-file', keys: ['Ctrl', 'W'], description: 'Close File', category: 'file', action: () => {}, customizable: true },
  
  // Edit
  { id: 'undo', keys: ['Ctrl', 'Z'], description: 'Undo', category: 'edit', action: () => {}, customizable: false },
  { id: 'redo', keys: ['Ctrl', 'Y'], description: 'Redo', category: 'edit', action: () => {}, customizable: false },
  { id: 'cut', keys: ['Ctrl', 'X'], description: 'Cut', category: 'edit', action: () => {}, customizable: false },
  { id: 'copy', keys: ['Ctrl', 'C'], description: 'Copy', category: 'edit', action: () => {}, customizable: false },
  { id: 'paste', keys: ['Ctrl', 'V'], description: 'Paste', category: 'edit', action: () => {}, customizable: false },
  { id: 'select-all', keys: ['Ctrl', 'A'], description: 'Select All', category: 'edit', action: () => {}, customizable: false },
  { id: 'format', keys: ['Shift', 'Alt', 'F'], description: 'Format Document', category: 'edit', action: () => {}, customizable: true },
  
  // View
  { id: 'toggle-sidebar', keys: ['Ctrl', 'B'], description: 'Toggle Sidebar', category: 'view', action: () => {}, customizable: true },
  { id: 'toggle-preview', keys: ['Ctrl', 'Shift', 'P'], description: 'Toggle Preview', category: 'view', action: () => {}, customizable: true },
  { id: 'toggle-terminal', keys: ['Ctrl', '`'], description: 'Toggle Terminal', category: 'view', action: () => {}, customizable: true },
  { id: 'zoom-in', keys: ['Ctrl', '+'], description: 'Zoom In', category: 'view', action: () => {}, customizable: true },
  { id: 'zoom-out', keys: ['Ctrl', '-'], description: 'Zoom Out', category: 'view', action: () => {}, customizable: true },
  
  // Navigation
  { id: 'quick-open', keys: ['Ctrl', 'P'], description: 'Quick Open File', category: 'navigation', action: () => {}, customizable: true },
  { id: 'go-to-line', keys: ['Ctrl', 'G'], description: 'Go to Line', category: 'navigation', action: () => {}, customizable: true },
  { id: 'go-to-symbol', keys: ['Ctrl', 'Shift', 'O'], description: 'Go to Symbol', category: 'navigation', action: () => {}, customizable: true },
  { id: 'go-to-definition', keys: ['F12'], description: 'Go to Definition', category: 'navigation', action: () => {}, customizable: true },
  { id: 'find-references', keys: ['Shift', 'F12'], description: 'Find References', category: 'navigation', action: () => {}, customizable: true },
  
  // Search
  { id: 'find', keys: ['Ctrl', 'F'], description: 'Find', category: 'search', action: () => {}, customizable: true },
  { id: 'replace', keys: ['Ctrl', 'H'], description: 'Replace', category: 'search', action: () => {}, customizable: true },
  { id: 'find-in-files', keys: ['Ctrl', 'Shift', 'F'], description: 'Find in Files', category: 'search', action: () => {}, customizable: true },
  
  // Debug
  { id: 'start-debug', keys: ['F5'], description: 'Start Debugging', category: 'debug', action: () => {}, customizable: true },
  { id: 'stop-debug', keys: ['Shift', 'F5'], description: 'Stop Debugging', category: 'debug', action: () => {}, customizable: true },
  { id: 'toggle-breakpoint', keys: ['F9'], description: 'Toggle Breakpoint', category: 'debug', action: () => {}, customizable: true },
  
  // General
  { id: 'command-palette', keys: ['Ctrl', 'K'], description: 'Command Palette', category: 'general', action: () => {}, customizable: false },
  { id: 'shortcuts', keys: ['Ctrl', '/'], description: 'Keyboard Shortcuts', category: 'general', action: () => {}, customizable: false },
  { id: 'settings', keys: ['Ctrl', ','], description: 'Settings', category: 'general', action: () => {}, customizable: true },
];

// Hook for managing keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(() => {
    try {
      const saved = localStorage.getItem('gstudio-keyboard-shortcuts');
      return saved ? JSON.parse(saved) : defaultShortcuts;
    } catch {
      return defaultShortcuts;
    }
  });

  const updateShortcut = useCallback((id: string, newKeys: string[]) => {
    setShortcuts(prev => {
      const updated = prev.map(s => 
        s.id === id ? { ...s, keys: newKeys } : s
      );
      
      try {
        localStorage.setItem('gstudio-keyboard-shortcuts', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save shortcuts:', error);
      }
      
      return updated;
    });
  }, []);

  const resetShortcuts = useCallback(() => {
    setShortcuts(defaultShortcuts);
    try {
      localStorage.removeItem('gstudio-keyboard-shortcuts');
    } catch (error) {
      console.error('Failed to reset shortcuts:', error);
    }
  }, []);

  return {
    shortcuts,
    updateShortcut,
    resetShortcuts,
  };
};
