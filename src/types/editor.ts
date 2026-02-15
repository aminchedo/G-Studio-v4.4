/**
 * Editor-specific types for G-Studio v3.0.0
 * 
 * NEW types for enhanced editor features
 */

import { EditorConfig, EditorPosition, EditorSelection } from './core';

// Re-export editor types from core for convenience
export type { EditorConfig, EditorPosition, EditorSelection } from './core';

// ==================== FILE TREE TYPES ====================

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  isExpanded?: boolean;
  isSelected?: boolean;
  metadata?: FileTreeMetadata;
}

export interface FileTreeMetadata {
  size?: number;
  modified?: Date;
  created?: Date;
  language?: string;
  icon?: string;
}

export interface FileTreeAction {
  type: 'create' | 'rename' | 'delete' | 'move' | 'copy';
  path: string;
  newPath?: string;
  content?: string;
}

// ==================== DIFF VIEWER TYPES ====================

export interface DiffViewerConfig {
  splitView: boolean;
  showLineNumbers: boolean;
  highlightChanges: boolean;
  contextLines: number;
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  lineNumber: number;
  oldLineNumber?: number;
  content: string;
  oldContent?: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffResult {
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  modifications: number;
}

// ==================== CODE EDITOR TYPES ====================

export interface CodeEditorState {
  content: string;
  language: string;
  cursorPosition: EditorPosition;
  selection?: EditorSelection;
  scrollPosition: number;
  isModified: boolean;
  undoStack: string[];
  redoStack: string[];
}

export interface CodeEditorAction {
  type: 'insert' | 'delete' | 'replace' | 'format' | 'undo' | 'redo';
  position?: EditorPosition;
  content?: string;
  selection?: EditorSelection;
}

// ==================== INTELLISENSE TYPES ====================

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText: string;
  sortText?: string;
  filterText?: string;
}

export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  File = 16,
  Reference = 17,
  Folder = 18
}

export interface CompletionContext {
  triggerKind: 'invoke' | 'triggerCharacter' | 'contentChange';
  triggerCharacter?: string;
}

// ==================== EDITOR EVENTS ====================

export type EditorEvent =
  | { type: 'content_changed'; content: string }
  | { type: 'cursor_moved'; position: EditorPosition }
  | { type: 'selection_changed'; selection: EditorSelection }
  | { type: 'file_saved'; path: string }
  | { type: 'file_closed'; path: string }
  | { type: 'format_requested' }
  | { type: 'completion_requested'; position: EditorPosition };

export interface EditorEventListener {
  (event: EditorEvent): void;
}

// ==================== EDITOR COMMANDS ====================

export interface EditorCommand {
  id: string;
  label: string;
  keybinding?: string;
  when?: string;
  handler: () => void | Promise<void>;
}

export const EDITOR_COMMANDS = {
  SAVE: 'editor.save',
  SAVE_ALL: 'editor.saveAll',
  FORMAT: 'editor.format',
  FIND: 'editor.find',
  REPLACE: 'editor.replace',
  UNDO: 'editor.undo',
  REDO: 'editor.redo',
  COMMENT: 'editor.comment',
  UNCOMMENT: 'editor.uncomment',
  FOLD: 'editor.fold',
  UNFOLD: 'editor.unfold',
  GO_TO_LINE: 'editor.goToLine',
  SELECT_ALL: 'editor.selectAll'
} as const;
