/**
 * useKeyboardShortcuts Hook
 * 
 * NEW: Keyboard shortcut management
 * Provides easy keyboard shortcut registration
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
      const shiftMatches = shortcut.shift === undefined || event.shiftKey === shortcut.shift;
      const altMatches = shortcut.alt === undefined || event.altKey === shortcut.alt;
      const metaMatches = shortcut.meta === undefined || event.metaKey === shortcut.meta;
      
      if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.handler(event);
        break;
      }
    }
  }, [shortcuts, enabled]);
  
  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

// Common keyboard shortcuts
export const COMMON_SHORTCUTS = {
  SAVE: { key: 's', ctrl: true, description: 'Save file' },
  SAVE_ALL: { key: 's', ctrl: true, shift: true, description: 'Save all files' },
  NEW_FILE: { key: 'n', ctrl: true, description: 'New file' },
  CLOSE_FILE: { key: 'w', ctrl: true, description: 'Close file' },
  FIND: { key: 'f', ctrl: true, description: 'Find' },
  REPLACE: { key: 'h', ctrl: true, description: 'Replace' },
  UNDO: { key: 'z', ctrl: true, description: 'Undo' },
  REDO: { key: 'y', ctrl: true, description: 'Redo' },
  COMMENT: { key: '/', ctrl: true, description: 'Toggle comment' },
  FORMAT: { key: 'f', ctrl: true, shift: true, description: 'Format document' },
  COMMAND_PALETTE: { key: 'p', ctrl: true, shift: true, description: 'Command palette' },
  TOGGLE_SIDEBAR: { key: 'b', ctrl: true, description: 'Toggle sidebar' },
  TOGGLE_TERMINAL: { key: '`', ctrl: true, description: 'Toggle terminal' },
  GO_TO_LINE: { key: 'g', ctrl: true, description: 'Go to line' },
  SELECT_ALL: { key: 'a', ctrl: true, description: 'Select all' },
} as const;

// Hook for common editor shortcuts
export function useEditorShortcuts(handlers: {
  onSave?: () => void;
  onSaveAll?: () => void;
  onNewFile?: () => void;
  onCloseFile?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onComment?: () => void;
  onFormat?: () => void;
  onCommandPalette?: () => void;
  onToggleSidebar?: () => void;
  onToggleTerminal?: () => void;
  onGoToLine?: () => void;
  onSelectAll?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [];
  
  if (handlers.onSave) {
    shortcuts.push({ ...COMMON_SHORTCUTS.SAVE, handler: handlers.onSave });
  }
  if (handlers.onSaveAll) {
    shortcuts.push({ ...COMMON_SHORTCUTS.SAVE_ALL, handler: handlers.onSaveAll });
  }
  if (handlers.onNewFile) {
    shortcuts.push({ ...COMMON_SHORTCUTS.NEW_FILE, handler: handlers.onNewFile });
  }
  if (handlers.onCloseFile) {
    shortcuts.push({ ...COMMON_SHORTCUTS.CLOSE_FILE, handler: handlers.onCloseFile });
  }
  if (handlers.onFind) {
    shortcuts.push({ ...COMMON_SHORTCUTS.FIND, handler: handlers.onFind });
  }
  if (handlers.onReplace) {
    shortcuts.push({ ...COMMON_SHORTCUTS.REPLACE, handler: handlers.onReplace });
  }
  if (handlers.onUndo) {
    shortcuts.push({ ...COMMON_SHORTCUTS.UNDO, handler: handlers.onUndo });
  }
  if (handlers.onRedo) {
    shortcuts.push({ ...COMMON_SHORTCUTS.REDO, handler: handlers.onRedo });
  }
  if (handlers.onComment) {
    shortcuts.push({ ...COMMON_SHORTCUTS.COMMENT, handler: handlers.onComment });
  }
  if (handlers.onFormat) {
    shortcuts.push({ ...COMMON_SHORTCUTS.FORMAT, handler: handlers.onFormat });
  }
  if (handlers.onCommandPalette) {
    shortcuts.push({ ...COMMON_SHORTCUTS.COMMAND_PALETTE, handler: handlers.onCommandPalette });
  }
  if (handlers.onToggleSidebar) {
    shortcuts.push({ ...COMMON_SHORTCUTS.TOGGLE_SIDEBAR, handler: handlers.onToggleSidebar });
  }
  if (handlers.onToggleTerminal) {
    shortcuts.push({ ...COMMON_SHORTCUTS.TOGGLE_TERMINAL, handler: handlers.onToggleTerminal });
  }
  if (handlers.onGoToLine) {
    shortcuts.push({ ...COMMON_SHORTCUTS.GO_TO_LINE, handler: handlers.onGoToLine });
  }
  if (handlers.onSelectAll) {
    shortcuts.push({ ...COMMON_SHORTCUTS.SELECT_ALL, handler: handlers.onSelectAll });
  }
  
  useKeyboardShortcuts(shortcuts);
}
