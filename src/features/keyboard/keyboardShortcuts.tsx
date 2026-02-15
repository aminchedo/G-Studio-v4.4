/**
 * G Studio v2.3.0 - Keyboard Shortcuts System
 * 
 * Global keyboard shortcut management with:
 * - Customizable shortcuts
 * - Context-aware actions
 * - Shortcut discovery modal
 * - Conflict detection
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Shortcut {
  id: string;
  keys: string[];           // e.g., ['Ctrl', 'S'] or ['Cmd', 'Shift', 'P']
  action: string;           // Action identifier
  description: string;      // Human-readable description
  category: ShortcutCategory;
  context?: ShortcutContext; // Where this shortcut is active
  enabled?: boolean;
}

export type ShortcutCategory = 
  | 'general'
  | 'editor'
  | 'chat'
  | 'file'
  | 'navigation'
  | 'ai'
  | 'view';

export type ShortcutContext = 
  | 'global'
  | 'editor'
  | 'chat'
  | 'sidebar'
  | 'modal';

export interface ShortcutAction {
  id: string;
  handler: () => void;
  enabled?: boolean;
}

// ============================================================================
// DEFAULT SHORTCUTS
// ============================================================================

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  // General
  { id: 'save', keys: ['Ctrl', 'S'], action: 'save', description: 'Save current file', category: 'general', context: 'global' },
  { id: 'save-all', keys: ['Ctrl', 'Shift', 'S'], action: 'saveAll', description: 'Save all files', category: 'general', context: 'global' },
  { id: 'command-palette', keys: ['Ctrl', 'Shift', 'P'], action: 'commandPalette', description: 'Open command palette', category: 'general', context: 'global' },
  { id: 'settings', keys: ['Ctrl', ','], action: 'openSettings', description: 'Open settings', category: 'general', context: 'global' },
  { id: 'close-modal', keys: ['Escape'], action: 'closeModal', description: 'Close modal', category: 'general', context: 'modal' },

  // File operations
  { id: 'new-file', keys: ['Ctrl', 'N'], action: 'newFile', description: 'Create new file', category: 'file', context: 'global' },
  { id: 'open-file', keys: ['Ctrl', 'O'], action: 'openFile', description: 'Open file', category: 'file', context: 'global' },
  { id: 'close-file', keys: ['Ctrl', 'W'], action: 'closeFile', description: 'Close current file', category: 'file', context: 'editor' },
  { id: 'close-all', keys: ['Ctrl', 'Shift', 'W'], action: 'closeAllFiles', description: 'Close all files', category: 'file', context: 'global' },

  // Editor
  { id: 'format', keys: ['Ctrl', 'Shift', 'F'], action: 'format', description: 'Format code', category: 'editor', context: 'editor' },
  { id: 'find', keys: ['Ctrl', 'F'], action: 'find', description: 'Find in file', category: 'editor', context: 'editor' },
  { id: 'replace', keys: ['Ctrl', 'H'], action: 'replace', description: 'Find and replace', category: 'editor', context: 'editor' },
  { id: 'goto-line', keys: ['Ctrl', 'G'], action: 'gotoLine', description: 'Go to line', category: 'editor', context: 'editor' },
  { id: 'undo', keys: ['Ctrl', 'Z'], action: 'undo', description: 'Undo', category: 'editor', context: 'editor' },
  { id: 'redo', keys: ['Ctrl', 'Y'], action: 'redo', description: 'Redo', category: 'editor', context: 'editor' },
  { id: 'comment', keys: ['Ctrl', '/'], action: 'toggleComment', description: 'Toggle comment', category: 'editor', context: 'editor' },
  { id: 'duplicate-line', keys: ['Ctrl', 'Shift', 'D'], action: 'duplicateLine', description: 'Duplicate line', category: 'editor', context: 'editor' },

  // Navigation
  { id: 'toggle-sidebar', keys: ['Ctrl', 'B'], action: 'toggleSidebar', description: 'Toggle sidebar', category: 'navigation', context: 'global' },
  { id: 'toggle-chat', keys: ['Ctrl', 'J'], action: 'toggleChat', description: 'Toggle chat panel', category: 'navigation', context: 'global' },
  { id: 'toggle-preview', keys: ['Ctrl', 'P'], action: 'togglePreview', description: 'Toggle preview', category: 'navigation', context: 'global' },
  { id: 'next-tab', keys: ['Ctrl', 'Tab'], action: 'nextTab', description: 'Next tab', category: 'navigation', context: 'global' },
  { id: 'prev-tab', keys: ['Ctrl', 'Shift', 'Tab'], action: 'prevTab', description: 'Previous tab', category: 'navigation', context: 'global' },
  { id: 'focus-editor', keys: ['Ctrl', '1'], action: 'focusEditor', description: 'Focus editor', category: 'navigation', context: 'global' },
  { id: 'focus-chat', keys: ['Ctrl', '2'], action: 'focusChat', description: 'Focus chat', category: 'navigation', context: 'global' },
  { id: 'focus-sidebar', keys: ['Ctrl', '3'], action: 'focusSidebar', description: 'Focus sidebar', category: 'navigation', context: 'global' },

  // Chat
  { id: 'send-message', keys: ['Enter'], action: 'sendMessage', description: 'Send message', category: 'chat', context: 'chat' },
  { id: 'clear-chat', keys: ['Ctrl', 'L'], action: 'clearChat', description: 'Clear chat', category: 'chat', context: 'chat' },
  { id: 'new-conversation', keys: ['Ctrl', 'Shift', 'N'], action: 'newConversation', description: 'New conversation', category: 'chat', context: 'global' },

  // AI
  { id: 'ai-suggest', keys: ['Ctrl', 'Space'], action: 'aiSuggest', description: 'Get AI suggestions', category: 'ai', context: 'editor' },
  { id: 'ai-explain', keys: ['Ctrl', 'E'], action: 'aiExplain', description: 'Explain selected code', category: 'ai', context: 'editor' },
  { id: 'ai-fix', keys: ['Ctrl', 'Shift', 'E'], action: 'aiFix', description: 'Fix with AI', category: 'ai', context: 'editor' },

  // View
  { id: 'zoom-in', keys: ['Ctrl', '='], action: 'zoomIn', description: 'Zoom in', category: 'view', context: 'global' },
  { id: 'zoom-out', keys: ['Ctrl', '-'], action: 'zoomOut', description: 'Zoom out', category: 'view', context: 'global' },
  { id: 'zoom-reset', keys: ['Ctrl', '0'], action: 'zoomReset', description: 'Reset zoom', category: 'view', context: 'global' },
  { id: 'toggle-fullscreen', keys: ['F11'], action: 'toggleFullscreen', description: 'Toggle fullscreen', category: 'view', context: 'global' },
  { id: 'toggle-theme', keys: ['Ctrl', 'Shift', 'T'], action: 'toggleTheme', description: 'Toggle theme', category: 'view', context: 'global' },
];

// ============================================================================
// KEYBOARD STORE
// ============================================================================

interface KeyboardState {
  shortcuts: Shortcut[];
  customShortcuts: Record<string, string[]>; // id -> custom keys
  actions: Map<string, ShortcutAction>;
  pressedKeys: Set<string>;
  currentContext: ShortcutContext;
  isEnabled: boolean;

  // Actions
  setShortcut: (id: string, keys: string[]) => void;
  resetShortcut: (id: string) => void;
  resetAllShortcuts: () => void;
  registerAction: (action: ShortcutAction) => void;
  unregisterAction: (id: string) => void;
  setContext: (context: ShortcutContext) => void;
  setEnabled: (enabled: boolean) => void;
  executeShortcut: (keys: string[]) => boolean;
}

export const useKeyboardStore = create<KeyboardState>()(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS,
      customShortcuts: {},
      actions: new Map(),
      pressedKeys: new Set(),
      currentContext: 'global',
      isEnabled: true,

      setShortcut: (id, keys) => {
        set((state) => ({
          customShortcuts: {
            ...state.customShortcuts,
            [id]: keys,
          }
        }));
      },

      resetShortcut: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.customShortcuts;
          return { customShortcuts: rest };
        });
      },

      resetAllShortcuts: () => {
        set({ customShortcuts: {} });
      },

      registerAction: (action) => {
        set((state) => {
          const newActions = new Map(state.actions);
          newActions.set(action.id, action);
          return { actions: newActions };
        });
      },

      unregisterAction: (id) => {
        set((state) => {
          const newActions = new Map(state.actions);
          newActions.delete(id);
          return { actions: newActions };
        });
      },

      setContext: (context) => {
        set({ currentContext: context });
      },

      setEnabled: (enabled) => {
        set({ isEnabled: enabled });
      },

      executeShortcut: (keys) => {
        const { shortcuts, customShortcuts, actions, currentContext, isEnabled } = get();
        
        if (!isEnabled) return false;

        // Find matching shortcut
        const normalizedKeys = normalizeKeys(keys);
        
        for (const shortcut of shortcuts) {
          const shortcutKeys = customShortcuts[shortcut.id] || shortcut.keys;
          const normalizedShortcutKeys = normalizeKeys(shortcutKeys);
          
          if (keysMatch(normalizedKeys, normalizedShortcutKeys)) {
            // Check context
            if (shortcut.context && shortcut.context !== 'global' && shortcut.context !== currentContext) {
              continue;
            }

            // Execute action
            const action = actions.get(shortcut.action);
            if (action && action.enabled !== false) {
              action.handler();
              return true;
            }
          }
        }

        return false;
      },
    }),
    {
      name: 'gstudio-keyboard',
      partialize: (state) => ({
        customShortcuts: state.customShortcuts,
      }),
    }
  )
);

// ============================================================================
// HELPERS
// ============================================================================

function normalizeKey(key: string): string {
  const map: Record<string, string> = {
    'control': 'ctrl',
    'command': 'cmd',
    'meta': 'cmd',
    'option': 'alt',
    ' ': 'space',
    'arrowup': 'up',
    'arrowdown': 'down',
    'arrowleft': 'left',
    'arrowright': 'right',
  };
  const lower = key.toLowerCase();
  return map[lower] || lower;
}

function normalizeKeys(keys: string[]): string[] {
  return keys.map(normalizeKey).sort();
}

function keysMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((key, i) => key === b[i]);
}

export function keysToString(keys: string[]): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  return keys.map(key => {
    const lower = key.toLowerCase();
    if (lower === 'ctrl') return isMac ? '⌃' : 'Ctrl';
    if (lower === 'cmd' || lower === 'meta') return isMac ? '⌘' : 'Win';
    if (lower === 'alt') return isMac ? '⌥' : 'Alt';
    if (lower === 'shift') return isMac ? '⇧' : 'Shift';
    if (lower === 'enter') return '↵';
    if (lower === 'escape' || lower === 'esc') return 'Esc';
    if (lower === 'backspace') return '⌫';
    if (lower === 'delete') return 'Del';
    if (lower === 'tab') return '⇥';
    if (lower === 'space') return '␣';
    if (lower === 'up') return '↑';
    if (lower === 'down') return '↓';
    if (lower === 'left') return '←';
    if (lower === 'right') return '→';
    return key.charAt(0).toUpperCase() + key.slice(1);
  }).join(isMac ? '' : '+');
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to handle global keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const { executeShortcut, isEnabled } = useKeyboardStore();

  useEffect(() => {
    if (!isEnabled) return;

    const pressedKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea (unless it's a global shortcut)
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;

      // Build current key combo
      const keys: string[] = [];
      if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      
      const key = normalizeKey(e.key);
      if (!['ctrl', 'shift', 'alt', 'meta', 'control'].includes(key)) {
        keys.push(key);
      }

      pressedKeys.add(key);

      // Try to execute shortcut
      if (keys.length > 0) {
        const executed = executeShortcut(keys);
        if (executed) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = normalizeKey(e.key);
      pressedKeys.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [executeShortcut, isEnabled]);
}

/**
 * Register a shortcut action
 */
export function useShortcutAction(id: string, handler: () => void, enabled = true) {
  const { registerAction, unregisterAction } = useKeyboardStore();

  useEffect(() => {
    registerAction({ id, handler, enabled });
    return () => unregisterAction(id);
  }, [id, handler, enabled, registerAction, unregisterAction]);
}

/**
 * Get shortcut for an action
 */
export function useShortcut(actionId: string): string | null {
  const { shortcuts, customShortcuts } = useKeyboardStore();
  
  const shortcut = shortcuts.find(s => s.action === actionId);
  if (!shortcut) return null;
  
  const keys = customShortcuts[shortcut.id] || shortcut.keys;
  return keysToString(keys);
}

/**
 * Set keyboard context
 */
export function useKeyboardContext(context: ShortcutContext) {
  const { setContext } = useKeyboardStore();
  
  useEffect(() => {
    setContext(context);
    return () => setContext('global');
  }, [context, setContext]);
}

// ============================================================================
// SHORTCUT CATEGORIES
// ============================================================================

export function getShortcutsByCategory(): Record<ShortcutCategory, Shortcut[]> {
  const { shortcuts, customShortcuts } = useKeyboardStore.getState();
  
  const categories: Record<ShortcutCategory, Shortcut[]> = {
    general: [],
    editor: [],
    chat: [],
    file: [],
    navigation: [],
    ai: [],
    view: [],
  };

  for (const shortcut of shortcuts) {
    const keys = customShortcuts[shortcut.id] || shortcut.keys;
    categories[shortcut.category].push({
      ...shortcut,
      keys,
    });
  }

  return categories;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useKeyboardStore;
