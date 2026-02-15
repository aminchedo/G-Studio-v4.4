/**
 * Project Tree - Enhanced project structure tree with AST/CPG linkage
 * Features: File type icons, animations, context menu, keyboard navigation, search highlighting
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  Folder, 
  FolderOpen,
  Search,
  X,
  FileText,
  File,
  Image,
  FileJson,
  FileType,
  Code,
  FileIcon,
  MoreVertical,
  Copy,
  ExternalLink,
  Hash,
  Layers,
  FileEdit,
  Info
} from 'lucide-react';
import { FileMetadata, CodePropertyGraph } from '@/types/codeIntelligence';

interface ProjectTreeProps {
  files: Record<string, FileMetadata>;
  cpg?: CodePropertyGraph | null;
  onFileSelect?: (filePath: string) => void;
  searchQuery?: string;
  className?: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  metadata?: FileMetadata;
  nodeIds?: string[];
}

// File type icon mapping
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, React.ReactNode> = {
    // Code files
    'ts': <Code className="w-4 h-4 text-blue-500" />,
    'tsx': <Code className="w-4 h-4 text-blue-400" />,
    'js': <Code className="w-4 h-4 text-yellow-500" />,
    'jsx': <Code className="w-4 h-4 text-yellow-400" />,
    'py': <Code className="w-4 h-4 text-green-500" />,
    'java': <Code className="w-4 h-4 text-orange-500" />,
    'cpp': <Code className="w-4 h-4 text-blue-600" />,
    'c': <Code className="w-4 h-4 text-blue-700" />,
    'go': <Code className="w-4 h-4 text-cyan-500" />,
    'rs': <Code className="w-4 h-4 text-orange-600" />,
    'php': <Code className="w-4 h-4 text-indigo-500" />,
    'rb': <Code className="w-4 h-4 text-red-500" />,
    'swift': <Code className="w-4 h-4 text-orange-400" />,
    'kt': <Code className="w-4 h-4 text-purple-500" />,
    
    // Web files
    'html': <FileCode className="w-4 h-4 text-orange-500" />,
    'css': <FileCode className="w-4 h-4 text-blue-500" />,
    'scss': <FileCode className="w-4 h-4 text-pink-500" />,
    'sass': <FileCode className="w-4 h-4 text-pink-600" />,
    'less': <FileCode className="w-4 h-4 text-blue-400" />,
    
    // Data files
    'json': <FileJson className="w-4 h-4 text-yellow-600" />,
    'xml': <FileType className="w-4 h-4 text-orange-400" />,
    'yaml': <FileType className="w-4 h-4 text-purple-400" />,
    'yml': <FileType className="w-4 h-4 text-purple-400" />,
    'toml': <FileType className="w-4 h-4 text-blue-500" />,
    
    // Text files
    'md': <FileText className="w-4 h-4 text-slate-500" />,
    'txt': <FileText className="w-4 h-4 text-slate-400" />,
    'readme': <FileText className="w-4 h-4 text-blue-400" />,
    
    // Images
    'png': <Image className="w-4 h-4 text-purple-500" />,
    'jpg': <Image className="w-4 h-4 text-purple-500" />,
    'jpeg': <Image className="w-4 h-4 text-purple-500" />,
    'gif': <Image className="w-4 h-4 text-purple-500" />,
    'svg': <Image className="w-4 h-4 text-pink-500" />,
    'webp': <Image className="w-4 h-4 text-purple-400" />,
  };
  
  return iconMap[ext] || <FileIcon className="w-4 h-4 text-slate-500" />;
};

// Format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export const ProjectTree: React.FC<ProjectTreeProps> = ({
  files,
  cpg,
  onFileSelect,
  searchQuery = '',
  className = ''
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ path: string; x: number; y: number } | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  // Auto-expand when searching
  useEffect(() => {
    if (searchQuery) {
      const newExpanded = new Set<string>();
      Object.keys(files).forEach(filePath => {
        const parts = filePath.split('/');
        for (let i = 1; i < parts.length; i++) {
          newExpanded.add(parts.slice(0, i).join('/'));
        }
      });
      setExpanded(newExpanded);
    }
  }, [searchQuery, files]);

  // Build tree structure from files
  const tree = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', type: 'directory', children: [] };

    Object.entries(files).forEach(([filePath, metadata]) => {
      const parts = filePath.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const path = parts.slice(0, index + 1).join('/');

        if (isLast) {
          // File node
          const fileNode: TreeNode = {
            name: part,
            path: filePath,
            type: 'file',
            metadata
          };

          // Link to CPG nodes if available
          if (cpg && cpg.fileNodes && cpg.fileNodes[filePath]) {
            fileNode.nodeIds = cpg.fileNodes[filePath];
          }

          if (!current.children) {
            current.children = [];
          }
          current.children.push(fileNode);
        } else {
          // Directory node
          let dirNode = current.children?.find(c => c.name === part && c.type === 'directory');
          if (!dirNode) {
            dirNode = {
              name: part,
              path: path,
              type: 'directory',
              children: []
            };
            if (!current.children) {
              current.children = [];
            }
            current.children.push(dirNode);
          }
          current = dirNode;
        }
      });
    });

    // Sort children
    const sortNode = (node: TreeNode): void => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortNode);
      }
    };
    sortNode(root);

    return root;
  }, [files, cpg]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery) {
      return tree;
    }

    const filterNode = (node: TreeNode): TreeNode | null => {
      const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           node.path.toLowerCase().includes(searchQuery.toLowerCase());

      if (node.type === 'file' && matchesSearch) {
        return node;
      }

      if (node.children) {
        const filteredChildren = node.children
          .map(filterNode)
          .filter((n): n is TreeNode => n !== null);

        if (filteredChildren.length > 0 || matchesSearch) {
          return {
            ...node,
            children: filteredChildren
          };
        }
      }

      return null;
    };

    const filtered = filterNode(tree);
    return filtered || tree;
  }, [tree, searchQuery]);

  // Highlight search matches
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const toggleExpand = useCallback((path: string): void => {
    setExpanded(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return newExpanded;
    });
  }, []);

  const expandAll = useCallback(() => {
    const newExpanded = new Set<string>();
    const collectPaths = (node: TreeNode) => {
      if (node.type === 'directory' && node.children) {
        newExpanded.add(node.path);
        node.children.forEach(collectPaths);
      }
    };
    filteredTree.children?.forEach(collectPaths);
    setExpanded(newExpanded);
  }, [filteredTree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const handleFileClick = useCallback((node: TreeNode) => {
    if (node.type === 'file') {
      setSelectedPath(node.path);
      onFileSelect?.(node.path);
    } else {
      toggleExpand(node.path);
    }
  }, [onFileSelect, toggleExpand]);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ path, x: e.clientX, y: e.clientY });
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedPath === node.path;
    const isHovered = hoveredPath === node.path;
    const isDirectory = node.type === 'directory';

    return (
      <div key={node.path} className="select-none">
        <div
          className={`
            group flex items-center gap-2 py-1.5 px-2 rounded-md transition-all duration-150
            ${isSelected 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' 
              : isHovered
              ? 'bg-slate-100 dark:bg-slate-800/50'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }
            ${isDirectory ? 'cursor-pointer' : 'cursor-pointer'}
          `}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => handleFileClick(node)}
          onMouseEnter={() => setHoveredPath(node.path)}
          onMouseLeave={() => setHoveredPath(null)}
          onContextMenu={(e) => handleContextMenu(e, node.path)}
        >
          {/* Expand/Collapse Icon */}
          {isDirectory ? (
            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 transition-transform" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 transition-transform" />
                )
              ) : (
                <div className="w-3.5 h-3.5" />
              )}
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}

          {/* Icon */}
          <div className="flex-shrink-0">
            {isDirectory ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 text-blue-500" />
              )
            ) : (
              getFileIcon(node.name)
            )}
          </div>

          {/* Name with search highlighting */}
          <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {highlightText(node.name, searchQuery)}
          </span>

          {/* Metadata badges */}
          <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {node.metadata && (
              <>
                {node.metadata.lines && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                    {node.metadata.lines} lines
                  </span>
                )}
                {node.metadata.size && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                    {formatFileSize(node.metadata.size)}
                  </span>
                )}
              </>
            )}
            {node.nodeIds && node.nodeIds.length > 0 && (
              <span 
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded"
                title={`${node.nodeIds.length} CPG nodes`}
              >
                <Hash className="w-3 h-3" />
                {node.nodeIds.length}
              </span>
            )}
            {isDirectory && hasChildren && (
              <span className="text-xs text-slate-400 dark:text-slate-500 px-1.5 py-0.5">
                {node.children?.length}
              </span>
            )}
          </div>

          {/* Context menu button */}
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, node.path);
            }}
          >
            <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Children */}
        {isDirectory && isExpanded && hasChildren && (
          <div className="ml-2 border-l border-slate-200 dark:border-slate-700">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full h-full flex flex-col bg-white dark:bg-slate-900 ${className}`} ref={treeRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Project Structure
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({Object.keys(files).length} files)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            title="Expand all"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            title="Collapse all"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTree.children && filteredTree.children.length > 0 ? (
          filteredTree.children.map(child => renderNode(child))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <File className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No files found</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.path);
              setContextMenu(null);
            }}
          >
            <Copy className="w-4 h-4" />
            Copy Path
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            onClick={() => {
              onFileSelect?.(contextMenu.path);
              setContextMenu(null);
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Open File
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            onClick={() => {
              // Edit file - in a real app, this would open an editor
              if (typeof window !== 'undefined' && (window as any).showInfo) {
                (window as any).showInfo(`Editing ${contextMenu.path}`);
              }
              setContextMenu(null);
            }}
          >
            <FileEdit className="w-4 h-4" />
            Edit
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            onClick={() => {
              // Show file properties - in a real app, this would show a modal
              const fileInfo = {
                path: contextMenu.path,
                name: contextMenu.path.split('/').pop(),
                type: contextMenu.path.includes('.') ? 'file' : 'folder',
                size: 'N/A', // Would be calculated from actual file
                modified: new Date().toLocaleString()
              };
              if (typeof window !== 'undefined' && (window as any).showInfo) {
                (window as any).showInfo(`Properties: ${fileInfo.name} (${fileInfo.type})`);
              }
              setContextMenu(null);
            }}
          >
            <Info className="w-4 h-4" />
            Properties
          </button>
        </div>
      )}
    </div>
  );
};
