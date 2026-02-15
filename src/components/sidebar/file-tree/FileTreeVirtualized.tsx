
import React, { 
  memo, 
  useState, 
  useCallback, 
  useMemo,
  useRef,
  useEffect 
} from 'react';

// Import react-window properly (ESModule friendly)
import { FixedSizeList as List } from 'react-window';

import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  Image,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Clipboard,
  Search,
  MoreVertical,
  FolderPlus,
  FilePlus,
  RefreshCw
} from 'lucide-react';

import { FileData } from "@/types/types";
import { useTheme } from '@/theme/themeSystem';

// ============================================================================
// TYPES
// ============================================================================

export interface EnhancedFileTreeProps {
  files: Record<string, FileData>;
  activeFile: string | null;
  openFiles: string[];
  onFileSelect: (path: string) => void;
  onFileCreate: (path: string, content?: string) => void;
  onFileDelete: (path: string) => void;
  onFileRename: (oldPath: string, newPath: string) => void;
  onFileCopy: (path: string) => void;
  onFileMove: (oldPath: string, newPath: string) => void;
  onFolderCreate: (path: string) => void;
  onRefresh?: () => void;
}

export interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeNode[];
  file?: FileData;
}

export interface DragState {
  isDragging: boolean;
  draggedPath: string | null;
  dropTarget: string | null;
}

// ============================================================================
// FILE ICONS
// ============================================================================

const FILE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  json: FileJson,
  md: FileText,
  txt: FileText,
  html: FileCode,
  css: FileCode,
  py: FileCode,
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  svg: Image,
};

function getFileIcon(filename: string): React.FC<{ className?: string }> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || File;
}

// ============================================================================
// CONTEXT MENU
// ============================================================================

interface ContextMenuProps {
  x: number;
  y: number;
  isFolder: boolean;
  path: string;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  isDark: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = memo(({
  x, y, isFolder, path, onClose, onNewFile, onNewFolder,
  onRename, onDelete, onCopy, onPaste, canPaste, isDark
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const MenuItem: React.FC<{
    icon: React.FC<{ className?: string }>;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
  }> = ({ icon: Icon, label, onClick, disabled, danger }) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : danger
            ? 'hover:bg-red-500/20 text-red-400'
            : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 min-w-[180px] py-1 rounded-lg shadow-xl border ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}
      style={{ left: x, top: y }}
    >
      {isFolder && (
        <>
          <MenuItem icon={FilePlus} label="New File" onClick={onNewFile} />
          <MenuItem icon={FolderPlus} label="New Folder" onClick={onNewFolder} />
          <div className={`my-1 h-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </>
      )}
      <MenuItem icon={Edit2} label="Rename" onClick={onRename} />
      <MenuItem icon={Copy} label="Copy" onClick={onCopy} />
      <MenuItem icon={Clipboard} label="Paste" onClick={onPaste} disabled={!canPaste} />
      <div className={`my-1 h-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
      <MenuItem icon={Trash2} label="Delete" onClick={onDelete} danger />
    </div>
  );
});

ContextMenu.displayName = 'ContextMenu';

// ============================================================================
// TREE NODE COMPONENT
// ============================================================================

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  isActive: boolean;
  isOpen: boolean;
  expandedFolders: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  dragState: DragState;
  onDragStart: (path: string) => void;
  onDragOver: (path: string) => void;
  onDragEnd: () => void;
  onDrop: (targetPath: string) => void;
  isDark: boolean;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = memo(({
  node,
  level,
  isActive,
  isOpen,
  expandedFolders,
  onToggle,
  onSelect,
  onContextMenu,
  dragState,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDark,
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isDropTarget = dragState.dropTarget === node.path;
  const isDragged = dragState.draggedPath === node.path;
  const FileIcon = node.isFolder ? (isExpanded ? FolderOpen : Folder) : getFileIcon(node.name);

  const handleClick = useCallback(() => {
    if (node.isFolder) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  }, [node, onToggle, onSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, node.path, node.isFolder);
  }, [node, onContextMenu]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(node.path);
  }, [node.path, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (node.isFolder) {
      onDragOver(node.path);
    }
  }, [node, onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (node.isFolder) {
      onDrop(node.path);
    }
  }, [node, onDrop]);

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded transition-all ${
          isActive
            ? isDark ? 'bg-blue-600/30 text-blue-300' : 'bg-blue-100 text-blue-700'
            : isOpen
              ? isDark ? 'bg-slate-700/50' : 'bg-gray-100'
              : ''
        } ${
          isDropTarget
            ? isDark ? 'ring-2 ring-blue-500 bg-blue-500/20' : 'ring-2 ring-blue-400 bg-blue-50'
            : ''
        } ${
          isDragged ? 'opacity-50' : ''
        } ${
          isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => onDragOver('')}
        onDrop={handleDrop}
        onDragEnd={onDragEnd}
      >
        {node.isFolder && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        )}
        <FileIcon className={`w-4 h-4 flex-shrink-0 ${
          node.isFolder 
            ? 'text-yellow-500' 
            : isDark ? 'text-slate-400' : 'text-gray-500'
        }`} />
        <span className={`text-sm truncate ${
          isDark ? 'text-slate-300' : 'text-gray-700'
        }`}>
          {node.name}
        </span>
      </div>

      {/* Children */}
      {node.isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              level={level + 1}
              isActive={isActive && child.path === node.path}
              isOpen={false}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              dragState={dragState}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNodeItem.displayName = 'TreeNodeItem';

// ============================================================================
// ENHANCED FILE TREE COMPONENT
// ============================================================================

export const EnhancedFileTree: React.FC<EnhancedFileTreeProps> = memo(({
  files,
  activeFile,
  openFiles,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  onFileCopy,
  onFileMove,
  onFolderCreate,
  onRefresh,
}) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark' || effectiveTheme === 'high-contrast';

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    isFolder: boolean;
  } | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedPath: null,
    dropTarget: null,
  });
  const [clipboard, setClipboard] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Build tree structure from flat files
  const treeData = useMemo(() => {
    const root: TreeNode[] = [];
    const folderMap = new Map<string, TreeNode>();

    // Sort paths to ensure folders come first
    const sortedPaths = Object.keys(files).sort((a, b) => {
      const aDepth = a.split('/').length;
      const bDepth = b.split('/').length;
      if (aDepth !== bDepth) return aDepth - bDepth;
      return a.localeCompare(b);
    });

    for (const path of sortedPaths) {
      const parts = path.split('/');
      const fileName = parts.pop()!;
      const file = files[path];

      // Filter by search query
      if (searchQuery && !path.toLowerCase().includes(searchQuery.toLowerCase())) {
        continue;
      }

      // Create folder nodes
      let currentPath = '';
      let parent: TreeNode[] = root;

      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!folderMap.has(currentPath)) {
          const folderNode: TreeNode = {
            name: part,
            path: currentPath,
            isFolder: true,
            children: [],
          };
          folderMap.set(currentPath, folderNode);
          parent.push(folderNode);
        }
        
        parent = folderMap.get(currentPath)!.children!;
      }

      // Add file node
      parent.push({
        name: fileName,
        path: path,
        isFolder: false,
        file: file,
      });
    }

    // Sort children: folders first, then alphabetically
    const sortChildren = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => {
        if (node.children) sortChildren(node.children);
      });
    };

    sortChildren(root);
    return root;
  }, [files, searchQuery]);

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

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, path: string, isFolder: boolean) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path,
      isFolder,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((path: string) => {
    setDragState({
      isDragging: true,
      draggedPath: path,
      dropTarget: null,
    });
  }, []);

  const handleDragOver = useCallback((path: string) => {
    setDragState((prev) => ({
      ...prev,
      dropTarget: path,
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedPath: null,
      dropTarget: null,
    });
  }, []);

  const handleDrop = useCallback((targetPath: string) => {
    if (dragState.draggedPath && targetPath !== dragState.draggedPath) {
      const fileName = dragState.draggedPath.split('/').pop()!;
      const newPath = `${targetPath}/${fileName}`;
      onFileMove(dragState.draggedPath, newPath);
    }
    handleDragEnd();
  }, [dragState.draggedPath, onFileMove, handleDragEnd]);

  // File operations
  const handleNewFile = useCallback(() => {
    const folder = contextMenu?.path || '';
    const name = prompt('Enter file name:');
    if (name) {
      const path = folder ? `${folder}/${name}` : name;
      onFileCreate(path);
    }
  }, [contextMenu, onFileCreate]);

  const handleNewFolder = useCallback(() => {
    const folder = contextMenu?.path || '';
    const name = prompt('Enter folder name:');
    if (name) {
      const path = folder ? `${folder}/${name}` : name;
      onFolderCreate(path);
    }
  }, [contextMenu, onFolderCreate]);

  const handleRename = useCallback(() => {
    if (contextMenu?.path) {
      const name = contextMenu.path.split('/').pop()!;
      setIsRenaming(contextMenu.path);
      setRenameValue(name);
    }
  }, [contextMenu]);

  const handleDelete = useCallback(() => {
    if (contextMenu?.path && confirm(`Delete "${contextMenu.path}"?`)) {
      onFileDelete(contextMenu.path);
    }
  }, [contextMenu, onFileDelete]);

  const handleCopy = useCallback(() => {
    if (contextMenu?.path) {
      setClipboard(contextMenu.path);
      onFileCopy(contextMenu.path);
    }
  }, [contextMenu, onFileCopy]);

  const handlePaste = useCallback(() => {
    if (clipboard && contextMenu?.path) {
      const fileName = clipboard.split('/').pop()!;
      const newPath = contextMenu.isFolder 
        ? `${contextMenu.path}/${fileName}`
        : `${contextMenu.path.split('/').slice(0, -1).join('/')}/${fileName}`;
      onFileMove(clipboard, newPath);
      setClipboard(null);
    }
  }, [clipboard, contextMenu, onFileMove]);

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${
        isDark ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <span className={`text-xs font-semibold uppercase ${
          isDark ? 'text-slate-400' : 'text-gray-500'
        }`}>
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewFile}
            className={`p-1 rounded ${
              isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="New File"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={handleNewFolder}
            className={`p-1 rounded ${
              isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`p-1 rounded ${
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className={`px-2 py-1 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-2 px-2 py-1 rounded ${
          isDark ? 'bg-slate-700' : 'bg-gray-100'
        }`}>
          <Search className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className={`flex-1 text-xs bg-transparent outline-none ${
              isDark ? 'text-white placeholder:text-slate-500' : 'text-gray-900 placeholder:text-gray-400'
            }`}
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto py-1">
        {treeData.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full p-4 text-center ${
            isDark ? 'text-slate-500' : 'text-gray-400'
          }`}>
            <Folder className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No files yet</p>
            <p className="text-xs">Create a file to get started</p>
          </div>
        ) : (
          treeData.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              level={0}
              isActive={activeFile === node.path}
              isOpen={openFiles.includes(node.path)}
              expandedFolders={expandedFolders}
              onToggle={toggleFolder}
              onSelect={onFileSelect}
              onContextMenu={handleContextMenu}
              dragState={dragState}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              isDark={isDark}
            />
          ))
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isFolder={contextMenu.isFolder}
          path={contextMenu.path}
          onClose={closeContextMenu}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onPaste={handlePaste}
          canPaste={!!clipboard}
          isDark={isDark}
        />
      )}
    </div>
  );
});

EnhancedFileTree.displayName = 'EnhancedFileTree';

export default EnhancedFileTree;

