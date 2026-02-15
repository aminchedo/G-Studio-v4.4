/**
 * FileTree Type Definitions
 */

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  language?: string;
  depth: number;
}

export interface FileTreeProps {
  files: Record<string, { name: string; content: string; language: string }>;
  activeFile: string | null;
  onFileSelect: (path: string) => void;
  onFileCreate?: (path: string, name: string) => void;
  onFolderCreate?: (path: string, name: string) => void;
  onFileDelete?: (path: string) => void;
  onFileRename?: (oldPath: string, newPath: string) => void;
  onFileMove?: (fromPath: string, toPath: string) => void;
  height?: number;
}

export interface FlatNode extends FileNode {
  isExpanded: boolean;
}
