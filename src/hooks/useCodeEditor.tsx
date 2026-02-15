/**
 * useCodeEditor Hook
 * 
 * NEW: Code editor management hook
 * Manages editor state, actions, and configuration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { EditorConfig, EditorPosition, EditorSelection } from '@/types/editor';

interface UseCodeEditorOptions {
  initialContent?: string;
  language?: string;
  config?: Partial<EditorConfig>;
  onChange?: (content: string) => void;
  onSave?: (content: string) => void;
}

export function useCodeEditor(options: UseCodeEditorOptions = {}) {
  const {
    initialContent = '',
    language = 'javascript',
    config = {},
    onChange,
    onSave,
  } = options;
  
  // Editor state
  const [content, setContent] = useState(initialContent);
  const [cursorPosition, setCursorPosition] = useState<EditorPosition>({ line: 1, column: 1 });
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [isModified, setIsModified] = useState(false);
  
  // Editor configuration
  const [editorConfig, setEditorConfig] = useState<EditorConfig>({
    theme: 'vs-dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: false,
    lineNumbers: true,
    autoComplete: true,
    formatOnSave: true,
    formatOnPaste: false,
    ...config,
  });
  
  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<string[]>([initialContent]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const undoIndexRef = useRef(0);
  
  // Update content
  const updateContent = useCallback((newContent: string, addToHistory = true) => {
    setContent(newContent);
    setIsModified(true);
    onChange?.(newContent);
    
    if (addToHistory) {
      setUndoStack(prev => {
        const newStack = [...prev.slice(0, undoIndexRef.current + 1), newContent];
        undoIndexRef.current = newStack.length - 1;
        return newStack;
      });
      setRedoStack([]);
    }
  }, [onChange]);
  
  // Undo
  const undo = useCallback(() => {
    if (undoIndexRef.current > 0) {
      undoIndexRef.current--;
      const previousContent = undoStack[undoIndexRef.current];
      setContent(previousContent);
      setRedoStack(prev => [content, ...prev]);
      onChange?.(previousContent);
    }
  }, [undoStack, content, onChange]);
  
  // Redo
  const redo = useCallback(() => {
    if (redoStack.length > 0) {
      const [nextContent, ...rest] = redoStack;
      undoIndexRef.current++;
      setContent(nextContent);
      setRedoStack(rest);
      setUndoStack(prev => [...prev, nextContent]);
      onChange?.(nextContent);
    }
  }, [redoStack, onChange]);
  
  // Save
  const save = useCallback(() => {
    onSave?.(content);
    setIsModified(false);
  }, [content, onSave]);
  
  // Update cursor position
  const updateCursorPosition = useCallback((position: EditorPosition) => {
    setCursorPosition(position);
  }, []);
  
  // Update selection
  const updateSelection = useCallback((sel: EditorSelection | null) => {
    setSelection(sel);
  }, []);
  
  // Update config
  const updateConfig = useCallback((updates: Partial<EditorConfig>) => {
    setEditorConfig(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Insert text at cursor
  const insertText = useCallback((text: string) => {
    const lines = content.split('\n');
    const line = lines[cursorPosition.line - 1] || '';
    const before = line.substring(0, cursorPosition.column - 1);
    const after = line.substring(cursorPosition.column - 1);
    
    lines[cursorPosition.line - 1] = before + text + after;
    const newContent = lines.join('\n');
    
    updateContent(newContent);
    
    // Update cursor position
    setCursorPosition({
      line: cursorPosition.line,
      column: cursorPosition.column + text.length,
    });
  }, [content, cursorPosition, updateContent]);
  
  // Replace selection
  const replaceSelection = useCallback((text: string) => {
    if (!selection) return;
    
    const lines = content.split('\n');
    const startLine = lines[selection.start.line - 1] || '';
    const endLine = lines[selection.end.line - 1] || '';
    
    const before = startLine.substring(0, selection.start.column - 1);
    const after = endLine.substring(selection.end.column - 1);
    
    // Remove lines in between
    lines.splice(
      selection.start.line - 1,
      selection.end.line - selection.start.line + 1,
      before + text + after
    );
    
    const newContent = lines.join('\n');
    updateContent(newContent);
    
    // Clear selection
    setSelection(null);
  }, [content, selection, updateContent]);
  
  // Get selected text
  const getSelectedText = useCallback(() => {
    if (!selection) return '';
    
    const lines = content.split('\n');
    
    if (selection.start.line === selection.end.line) {
      const line = lines[selection.start.line - 1] || '';
      return line.substring(selection.start.column - 1, selection.end.column - 1);
    }
    
    const result: string[] = [];
    for (let i = selection.start.line - 1; i <= selection.end.line - 1; i++) {
      const line = lines[i] || '';
      if (i === selection.start.line - 1) {
        result.push(line.substring(selection.start.column - 1));
      } else if (i === selection.end.line - 1) {
        result.push(line.substring(0, selection.end.column - 1));
      } else {
        result.push(line);
      }
    }
    
    return result.join('\n');
  }, [content, selection]);
  
  // Save config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gstudio-editor-config', JSON.stringify(editorConfig));
    } catch (error) {
      console.warn('Failed to save editor config:', error);
    }
  }, [editorConfig]);
  
  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gstudio-editor-config');
      if (saved) {
        const savedConfig = JSON.parse(saved);
        setEditorConfig(prev => ({ ...prev, ...savedConfig }));
      }
    } catch (error) {
      console.warn('Failed to load editor config:', error);
    }
  }, []);
  
  return {
    // State
    content,
    language,
    cursorPosition,
    selection,
    isModified,
    config: editorConfig,
    canUndo: undoIndexRef.current > 0,
    canRedo: redoStack.length > 0,
    
    // Actions
    updateContent,
    updateCursorPosition,
    updateSelection,
    updateConfig,
    insertText,
    replaceSelection,
    getSelectedText,
    undo,
    redo,
    save,
  };
}

// Hook for editor commands
export function useEditorCommands(editor: ReturnType<typeof useCodeEditor>) {
  const selectAll = useCallback(() => {
    const lines = editor.content.split('\n');
    const lastLine = lines[lines.length - 1] || '';
    
    editor.updateSelection({
      start: { line: 1, column: 1 },
      end: { line: lines.length, column: lastLine.length + 1 },
    });
  }, [editor]);
  
  const deleteSelection = useCallback(() => {
    if (editor.selection) {
      editor.replaceSelection('');
    }
  }, [editor]);
  
  const duplicateLine = useCallback(() => {
    const lines = editor.content.split('\n');
    const currentLine = lines[editor.cursorPosition.line - 1] || '';
    
    lines.splice(editor.cursorPosition.line, 0, currentLine);
    editor.updateContent(lines.join('\n'));
    
    editor.updateCursorPosition({
      line: editor.cursorPosition.line + 1,
      column: editor.cursorPosition.column,
    });
  }, [editor]);
  
  return {
    selectAll,
    deleteSelection,
    duplicateLine,
  };
}
