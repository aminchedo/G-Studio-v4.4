/**
 * FileTreeVirtualized Component
 * High-performance virtualized file tree using react-window
 * Only renders visible nodes for optimal performance with large projects
 /**
 * FileTreeVirtualized.tsx – React Virtualized File Tree
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window/dist/es/index.js';
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  FolderPlus,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  language?: string;
  depth: number;
}

export interface FileTreeVirtualizedProps {
  files: Record<string, { name: string; content: string; language: string }>;
  activeFile: string | null;
  onFileSelect: (path: string) => void;
  onFileCreate?: (path: string, name: string) => void;
  onFolderCreate?: (path: string, name: string) => void;
  height?: number;
}

interface FlatNode extends FileNode {
  isExpanded: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ITEM_HEIGHT = 32;

export const FileTreeVirtualized: React.FC<FileTreeVirtualizedProps> = React.memo(({
  files,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFolderCreate,
  height = 600,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef<any>(null);

  // Build tree structure from flat files
  const fileTree = useMemo(() => {
    const root: FileNode = {
      id: '/',
      name: 'root',
      type: 'folder',
      path: '/',
      children: [],
      depth: 0,
    };

    const pathMap = new Map<string, FileNode>();
    pathMap.set('/', root);

    const sortedPaths = Object.keys(files).sort();

    sortedPaths.forEach((path) => {
      const parts = path.split('/').filter(Boolean);
      let currentPath = '';
      let parent = root;

      parts.forEach((part, index) => {
        currentPath += (currentPath ? '/' : '') + part;
        const isFile = index === parts.length - 1;

        if (!pathMap.has(currentPath)) {
          const node: FileNode = {
            id: currentPath,
            name: part,
            type: isFile ? 'file' : 'folder',
            path: currentPath,
            children: isFile ? undefined : [],
            language: isFile ? files[path].language : undefined,
            depth: index + 1,
          };

          parent.children?.push(node);
          pathMap.set(currentPath, node);
        }

        if (!isFile) {
          parent = pathMap.get(currentPath)!;
        }
      });
    });

    return root;
  }, [files]);

  // Flatten tree for virtualization
  const flattenedNodes = useMemo(() => {
    const result: FlatNode[] = [];

    const flatten = (node: FileNode) => {
      if (node.path === '/') {
        node.children?.forEach(flatten);
        return;
      }

      const isExpanded = expandedFolders.has(node.path);
      result.push({ ...node, isExpanded });

      if (node.type === 'folder' && isExpanded && node.children) {
        node.children.forEach(flatten);
      }
    };

    flatten(fileTree);
    return result;
  }, [fileTree, expandedFolders]);

  // Filter nodes by search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return flattenedNodes;

    return flattenedNodes.filter((node) =>
      node.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [flattenedNodes, searchQuery]);

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Get file icon
  const getFileIcon = useCallback((_language?: string) => {
    return <File className="w-4 h-4" />;
  }, []);

  // Row renderer for virtualized list
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const node = filteredNodes[index];
      const isActive = activeFile === node.path;

      return (
        <div
          style={style}
          className={`flex items-center gap-2 px-2 cursor-pointer hover:bg-slate-800 transition-colors ${
            isActive ? 'bg-blue-600 text-white' : 'text-slate-300'
          }`}
          onClick={() => {
            if (node.type === 'file') {
              onFileSelect(node.path);
            } else {
              toggleFolder(node.path);
            }
          }}
        >
          <div style={{ width: `${node.depth * 16}px` }} className="flex-shrink-0" />

          {/* Expand/Collapse Icon */}
          {node.type === 'folder' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
              className="flex-shrink-0 p-0.5 hover:bg-slate-700 rounded"
            >
              {node.isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}

          {/* Icon */}
          <div className="flex-shrink-0">
            {node.type === 'folder' ? (
              node.isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-400" />
              ) : (
                <Folder className="w-4 h-4 text-blue-400" />
              )
            ) : (
              getFileIcon(node.language)
            )}
          </div>

          {/* Name */}
          <span className="flex-1 text-sm truncate">{node.name}</span>
        </div>
      );
    },
    [filteredNodes, activeFile, onFileSelect, toggleFolder, getFileIcon]
  );

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-white flex-1">Files</h3>
          <button
            onClick={() => onFileCreate?.('/', 'newfile.txt')}
            className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
            title="New File"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onFolderCreate?.('/', 'newfolder')}
            className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-7 pr-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Virtualized Tree */}
      <div className="flex-1">
        <List
          ref={listRef}
          height={height}
          itemCount={filteredNodes.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
          className="custom-scrollbar"
          overscanCount={5}
        >
          {Row}
        </List>
      </div>
    </div>
  );
});

FileTreeVirtualized.displayName = 'FileTreeVirtualized';
