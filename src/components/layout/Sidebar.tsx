import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Settings,
  Box,
  Trash2,
  FileCode,
  Folder,
  ChevronRight,
  Plus,
  UploadCloud,
  FileJson,
  Palette,
  Globe,
  FileText,
  Code2,
  Bug,
  BookOpen,
  RefreshCw,
  LayoutTemplate,
  Cpu,
  Sparkles,
  FolderOpen,
  Menu,
  Edit2,
  MoreHorizontal,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Image,
  Database,
  FileCog,
  File,
  PanelLeftClose,
  PanelLeft,
  Terminal,
  Home,
  Pin,
  PinOff,
  Clock,
} from "lucide-react";
import { ModelId, FileData } from "@/types";
import { sendAgentTelemetry } from "@/utils/agentTelemetry";

interface SidebarProps {
  selectedModel: ModelId;
  onSelectModel: (id: ModelId) => void;
  onClearChat: () => void;
  files: Record<string, FileData>;
  onFileSelect: (filename: string) => void;
  selectedFile: string | null;
  onCreateFile: () => void;
  onDeleteFile: (filename: string) => void;
  onRenameItem: (oldPath: string, newName: string) => void;
  onOpenSettings: () => void;
  onOpenAISettingsHub?: () => void; // NEW: Open AI Settings Hub instead
  onLoadProject: () => void;
  onTriggerTool: (action: string) => void;
  onToggleSidebar?: () => void;
  sidebarVisible?: boolean;
}

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children: Record<string, TreeNode>;
};

const iconBase = {
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "w-4 h-4 flex-shrink-0",
};

const getFileIcon = (filename: string): React.ReactElement => {
  const name = filename.toLowerCase();
  const ext = name.split(".").pop();
  const iconProps = iconBase;

  if (name === "package.json")
    return (
      <Box {...iconProps} className={`${iconProps.className} text-amber-500`} />
    );
  if (name.startsWith("tsconfig"))
    return (
      <FileJson
        {...iconProps}
        className={`${iconProps.className} text-blue-400`}
      />
    );
  if (name.startsWith(".env"))
    return (
      <FileCog
        {...iconProps}
        className={`${iconProps.className} text-emerald-500`}
      />
    );
  if (name === "readme.md" || name === "readme")
    return (
      <BookOpen
        {...iconProps}
        className={`${iconProps.className} text-sky-400`}
      />
    );

  switch (ext) {
    case "tsx":
      return (
        <Code2
          {...iconProps}
          className={`${iconProps.className} text-blue-400`}
        />
      );
    case "ts":
      return (
        <Code2
          {...iconProps}
          className={`${iconProps.className} text-blue-500`}
        />
      );
    case "jsx":
      return (
        <FileCode
          {...iconProps}
          className={`${iconProps.className} text-amber-400`}
        />
      );
    case "js":
      return (
        <FileCode
          {...iconProps}
          className={`${iconProps.className} text-amber-500`}
        />
      );
    case "json":
      return (
        <FileJson
          {...iconProps}
          className={`${iconProps.className} text-amber-600`}
        />
      );
    case "css":
      return (
        <Palette
          {...iconProps}
          className={`${iconProps.className} text-pink-500`}
        />
      );
    case "scss":
    case "sass":
      return (
        <Palette
          {...iconProps}
          className={`${iconProps.className} text-pink-400`}
        />
      );
    case "less":
      return (
        <Palette
          {...iconProps}
          className={`${iconProps.className} text-blue-400`}
        />
      );
    case "html":
    case "htm":
      return (
        <Globe
          {...iconProps}
          className={`${iconProps.className} text-emerald-500`}
        />
      );
    case "md":
    case "markdown":
      return (
        <FileText
          {...iconProps}
          className={`${iconProps.className} text-slate-300`}
        />
      );
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return (
        <Image
          {...iconProps}
          className={`${iconProps.className} text-violet-400`}
        />
      );
    case "svg":
      return (
        <Image
          {...iconProps}
          className={`${iconProps.className} text-orange-400`}
        />
      );
    case "sql":
      return (
        <Database
          {...iconProps}
          className={`${iconProps.className} text-cyan-400`}
        />
      );
    case "py":
      return (
        <FileCode
          {...iconProps}
          className={`${iconProps.className} text-yellow-500`}
        />
      );
    case "rs":
      return (
        <FileCode
          {...iconProps}
          className={`${iconProps.className} text-orange-600`}
        />
      );
    case "go":
      return (
        <FileCode
          {...iconProps}
          className={`${iconProps.className} text-cyan-400`}
        />
      );
    case "vue":
      return (
        <Code2
          {...iconProps}
          className={`${iconProps.className} text-emerald-400`}
        />
      );
    case "sh":
    case "bash":
    case "zsh":
      return (
        <Terminal
          {...iconProps}
          className={`${iconProps.className} text-slate-500`}
        />
      );
    case "yml":
    case "yaml":
      return (
        <FileCog
          {...iconProps}
          className={`${iconProps.className} text-cyan-500`}
        />
      );
    case "xml":
      return (
        <FileCog
          {...iconProps}
          className={`${iconProps.className} text-amber-600`}
        />
      );
    default:
      return (
        <File
          {...iconProps}
          className={`${iconProps.className} text-slate-400`}
        />
      );
  }
};

const FileTreeItem: React.FC<{
  node: TreeNode;
  level: number;
  selectedFile: string | null;
  onFileSelect: (filename: string) => void;
  onDeleteFile: (filename: string) => void;
  onRenameItem: (oldPath: string, newName: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}> = ({
  node,
  level,
  selectedFile,
  onFileSelect,
  onDeleteFile,
  onRenameItem,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRenameSubmit = () => {
    if (editName.trim() && editName !== node.name) {
      onRenameItem(node.path, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") {
      setEditName(node.name);
      setIsEditing(false);
    }
  };

  const indentStyle = { paddingLeft: `${level * 12 + 12}px` };

  if (node.type === "folder") {
    return (
      <div className="relative select-none">
        {/* Indentation Guide */}
        {level > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-slate-700/50"
            style={{ left: `${level * 12 + 19}px` }}
          />
        )}

        <div
          className="group flex items-center justify-between py-1.5 pr-2 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 cursor-pointer transition-all duration-200 rounded-md"
          style={indentStyle}
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex items-center gap-1.5 flex-1 overflow-hidden min-w-0">
            <span
              className={`transition-transform duration-200 shrink-0 ${isOpen ? "rotate-90 text-slate-400" : "text-slate-500"}`}
            >
              <ChevronRight strokeWidth={2} className="w-3.5 h-3.5" />
            </span>
            <FolderOpen
              strokeWidth={1.8}
              className={`w-4 h-4 flex-shrink-0 transition-colors ${isOpen ? "text-amber-500" : "text-slate-500"}`}
            />
            <span className="truncate font-medium tracking-tight">
              {node.name}
            </span>
          </div>
        </div>

        {isOpen && (
          <div>
            {(Object.values(node.children) as TreeNode[])
              .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === "folder" ? -1 : 1;
              })
              .map((child) => (
                <FileTreeItem
                  key={child.path}
                  node={child}
                  level={level + 1}
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                  onDeleteFile={onDeleteFile}
                  onRenameItem={onRenameItem}
                />
              ))}
          </div>
        )}
      </div>
    );
  }

  // File Item
  return (
    <div className="relative group select-none">
      {level > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-slate-700/50"
          style={{ left: `${level * 12 + 19}px` }}
        />
      )}
      <div
        onClick={() => !isEditing && onFileSelect(node.path)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center justify-between py-1.5 pr-2 pl-2 text-xs cursor-pointer transition-all rounded-md border-l-2 ${
          selectedFile === node.path
            ? "bg-purple-500/15 border-purple-500 text-slate-100"
            : isBookmarked
              ? "border-purple-500/40 text-slate-300 bg-purple-900/20"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 hover:border-slate-600"
        }`}
        style={indentStyle}
      >
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden min-w-0">
          {isBookmarked && <Pin className="w-3 h-3 text-purple-400 shrink-0" />}
          <span className="shrink-0">{getFileIcon(node.name)}</span>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 min-w-0"
            />
          ) : (
            <span
              className={`truncate ${selectedFile === node.path ? "font-bold" : "font-medium"}`}
            >
              {node.name}
            </span>
          )}
        </div>

        {!isEditing && isHovered && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/80 backdrop-blur-sm rounded-md shadow-sm border border-slate-700 ml-2">
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark();
                }}
                className={`p-1 rounded transition-colors ${
                  isBookmarked
                    ? "text-purple-400 hover:text-purple-300"
                    : "text-slate-400 hover:text-purple-400"
                }`}
                title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
              >
                {isBookmarked ? (
                  <Pin strokeWidth={1.5} className="w-3 h-3" />
                ) : (
                  <PinOff strokeWidth={1.5} className="w-3 h-3" />
                )}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-purple-600 rounded transition-all duration-200"
              title="Rename"
            >
              <Edit2 strokeWidth={1.5} className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(node.path);
              }}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-colors"
              title="Delete"
            >
              <Trash2 strokeWidth={1.5} className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  onFileSelect,
  selectedFile,
  onCreateFile,
  onDeleteFile,
  onRenameItem,
  onOpenSettings,
  onOpenAISettingsHub,
  onLoadProject,
  onTriggerTool,
  onClearChat,
  onToggleSidebar,
  sidebarVisible = true,
}) => {
  const [activeTab, setActiveTab] = useState<"explorer" | "tools" | null>(
    "explorer"
  );
  const [bookmarkedFiles, setBookmarkedFiles] = useState<Set<string>>(
    new Set()
  );
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("gstudio_bookmarked_files");
      if (stored) {
        setBookmarkedFiles(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.warn("Failed to load bookmarks:", e);
    }
  }, []);

  // Track recent files
  useEffect(() => {
    if (selectedFile) {
      setRecentFiles((prev) => {
        const filtered = prev.filter((f) => f !== selectedFile);
        return [selectedFile, ...filtered].slice(0, 10);
      });
    }
  }, [selectedFile]);

  const toggleBookmark = (filePath: string) => {
    setBookmarkedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      try {
        localStorage.setItem(
          "gstudio_bookmarked_files",
          JSON.stringify(Array.from(newSet))
        );
      } catch (e) {
        console.warn("Failed to save bookmarks:", e);
      }
      return newSet;
    });
  };

  const filteredFiles = useMemo(() => files, [files]);

  const tree = useMemo(() => {
    const root: Record<string, TreeNode> = {};
    Object.keys(filteredFiles).forEach((path) => {
      const parts = path.split("/");
      let current = root;
      parts.forEach((part, i) => {
        const isFile = i === parts.length - 1;
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, i + 1).join("/"),
            type: isFile ? "file" : "folder",
            children: {},
          };
        }
        if (!isFile) current = current[part].children;
      });
    });
    return root;
  }, [files]);

  const ActivityButton = ({ icon: Icon, active, onClick, tooltip }: any) => (
    <div className="relative group/activity">
      <button
        onClick={() => {
          sendAgentTelemetry({
            location: "Sidebar.tsx:250",
            message: "Sidebar ActivityButton clicked",
            data: { tooltip, active },
            hypothesisId: "M",
          });
          onClick();
        }}
        title={tooltip}
        className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-lg transition-all relative overflow-hidden duration-200 min-w-[36px] min-h-[36px] group-hover/activity:scale-[1.02] ${
          active
            ? "bg-gradient-to-br from-purple-600/50 via-purple-500/40 to-purple-600/50 border border-purple-500/50 shadow-md shadow-purple-900/30"
            : "bg-slate-800/50 border border-slate-700/50 shadow-sm hover:border-purple-500/40 hover:bg-slate-700/50 hover:shadow-purple-900/20"
        }`}
      >
        {active && (
          <>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-400/20 via-purple-300/10 to-transparent opacity-100" />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-400/25 via-purple-300/15 to-transparent opacity-0 group-hover/activity:opacity-100 transition-opacity duration-300" />
          </>
        )}
        {!active && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-400/5 via-transparent to-transparent opacity-0 group-hover/activity:opacity-100 transition-opacity duration-300" />
        )}

        <div className="relative z-10 flex items-center justify-center transition-transform duration-200 group-hover/activity:scale-[1.02]">
          <Icon
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-4 h-4 transition-all duration-200 drop-shadow-sm ${
              active
                ? "text-white drop-shadow-[0_2px_4px_rgba(168,85,247,0.5)]"
                : "text-slate-300 group-hover/activity:text-white"
            }`}
          />
        </div>
        {!active && (
          <>
            <span
              className="absolute inset-0 rounded-lg bg-purple-400/15 animate-ping opacity-0 group-active/activity:opacity-100 transition-opacity"
              style={{ animationDuration: "0.6s" }}
            />
          </>
        )}
      </button>

      <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-800 border border-slate-700 text-white text-[10px] rounded-md opacity-0 group-hover/activity:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 font-medium translate-x-[-8px] group-hover/activity:translate-x-0 shadow-xl">
        {tooltip}
        <div className="absolute top-1/2 -left-1 -mt-1 border-4 border-transparent border-r-slate-800" />
      </div>
    </div>
  );

  return (
    <aside className="flex h-full min-h-full self-stretch z-40 relative select-none shrink-0">
      {/* Activity Bar – match right sidebar: backdrop-blur, shadow, subtle border so it stands out from code area */}
      <div className="w-[52px] bg-slate-900/95 backdrop-blur-md border-r border-white/[0.06] shadow-xl flex flex-col items-center py-3 gap-2 z-30 shrink-0">
        <button
          onClick={() => setActiveTab(null)}
          title="Home"
          className="p-2 rounded-lg transition-all duration-200 relative group flex justify-center items-center border border-purple-500/50 bg-gradient-to-br from-purple-600/40 to-purple-700/40 shadow-md shadow-purple-900/30 hover:scale-[1.02] hover:border-purple-400/60"
        >
          <Home
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-white drop-shadow-sm"
          />
        </button>

        <div className="flex flex-col w-full px-1.5 gap-2">
          <ActivityButton
            icon={FolderOpen}
            active={activeTab === "explorer"}
            onClick={() => {
              const newTab = activeTab === "explorer" ? null : "explorer";
              setActiveTab(newTab);
              // Auto-open sidebar if a tab is selected and sidebar is closed
              if (newTab && !sidebarVisible && onToggleSidebar) {
                onToggleSidebar();
              }
              // If clicking the same tab again, keep sidebar open (don't close it)
            }}
            tooltip="Explorer"
          />
          <ActivityButton
            icon={Sparkles}
            active={activeTab === "tools"}
            onClick={() => {
              const newTab = activeTab === "tools" ? null : "tools";
              setActiveTab(newTab);
              // Auto-open sidebar if a tab is selected and sidebar is closed
              if (newTab && !sidebarVisible && onToggleSidebar) {
                onToggleSidebar();
              }
              // If clicking the same tab again, keep sidebar open (don't close it)
            }}
            tooltip="AI Tools"
          />
        </div>

        <div className="flex-1" />

        <div className="flex flex-col w-full px-1.5 pb-2 gap-2">
          <ActivityButton
            icon={Settings}
            onClick={onOpenAISettingsHub || onOpenSettings}
            tooltip="AI Settings"
          />
        </div>
      </div>

      {/* Side Panel Drawer – match right: bg, border, shadow so it stands out from code area */}
      <div
        className={`flex-1 min-h-0 h-full ${sidebarVisible && activeTab ? "w-[312px] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-4 overflow-hidden"} bg-[#0f172a] backdrop-blur-md border-r border-white/5 shadow-xl flex flex-col transition-all duration-200 relative z-20`}
      >
        <div className="min-w-[312px] h-full flex-1 min-h-0 flex flex-col">
          {/* Header – compact, title and actions closer */}
          <div className="border-b border-slate-800/50 bg-slate-950/95 relative z-10 shrink-0">
            <div className="h-14 px-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-100 tracking-tight truncate">
                {activeTab === "explorer" ? "Explorer" : "Accelerators"}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                {activeTab === "explorer" && (
                  <>
                    <button
                      onClick={() => {
                        sendAgentTelemetry({
                          location: "Sidebar.tsx:361",
                          message: "Load Demo Project clicked",
                          hypothesisId: "O",
                        });
                        onLoadProject();
                      }}
                      className="p-1.5 rounded-md hover:bg-slate-800/50 hover:text-purple-400 text-slate-400 transition-all duration-200 border border-transparent"
                      title="Load Demo Project"
                    >
                      <UploadCloud
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      />
                    </button>
                    <button
                      onClick={() => {
                        sendAgentTelemetry({
                          location: "Sidebar.tsx:365",
                          message: "New File from Sidebar clicked",
                          hypothesisId: "P",
                        });
                        onCreateFile();
                      }}
                      className="p-1.5 rounded-md hover:bg-slate-800/50 hover:text-purple-400 text-slate-400 transition-all duration-200 border border-transparent"
                      title="New File"
                    >
                      <FilePlus
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      />
                    </button>
                  </>
                )}
                {onToggleSidebar && (
                  <button
                    onClick={onToggleSidebar}
                    className="p-1.5 rounded-md hover:bg-slate-800 hover:text-slate-200 text-slate-400 transition-all duration-200 border border-transparent"
                    title={sidebarVisible ? "Hide Panel" : "Show Panel"}
                  >
                    {sidebarVisible ? (
                      <PanelLeftClose
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      />
                    ) : (
                      <PanelLeft
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2 no-scrollbar relative z-10 custom-scrollbar bg-slate-900/80 backdrop-blur-md">
            {activeTab === "explorer" && (
              <div
                className={`pb-4 ${Object.keys(filteredFiles).length === 0 ? "flex-1 min-h-0 flex flex-col" : ""}`}
              >
                {/* Bookmarked Files Section */}
                {bookmarkedFiles.size > 0 && (
                  <div className="px-3 mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Bookmarked
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {Array.from(bookmarkedFiles).map((filePath) => {
                        const file = files[filePath];
                        if (!file) return null;
                        return (
                          <div
                            key={filePath}
                            onClick={() => onFileSelect(filePath)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                              selectedFile === filePath
                                ? "bg-purple-900/50 border border-purple-600"
                                : "hover:bg-slate-800/50 border border-transparent"
                            }`}
                          >
                            <Pin className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="text-xs text-slate-300 truncate flex-1 min-w-0">
                              {filePath.split("/").pop()}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(filePath);
                              }}
                              className="text-slate-400 hover:text-slate-200"
                            >
                              <PinOff className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Files Section */}
                {recentFiles.length > 0 && (
                  <div className="px-3 mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Recent
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {recentFiles.slice(0, 5).map((filePath) => {
                        const file = files[filePath];
                        if (!file) return null;
                        return (
                          <div
                            key={filePath}
                            onClick={() => onFileSelect(filePath)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                              selectedFile === filePath
                                ? "bg-purple-900/50 border border-purple-600"
                                : "hover:bg-slate-800/50 border border-transparent"
                            }`}
                          >
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-300 truncate flex-1 min-w-0">
                              {filePath.split("/").pop()}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(filePath);
                              }}
                              className="text-slate-400 hover:text-purple-400"
                              title={
                                bookmarkedFiles.has(filePath)
                                  ? "Remove bookmark"
                                  : "Add bookmark"
                              }
                            >
                              {bookmarkedFiles.has(filePath) ? (
                                <Pin className="w-3 h-3 text-purple-400" />
                              ) : (
                                <PinOff className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {Object.keys(filteredFiles).length === 0 ? (
                  <div className="flex-1 min-h-0 flex flex-col justify-center items-center px-3">
                    <div className="w-full max-w-[260px] px-5 py-14 text-center bg-gradient-to-br from-slate-800/90 via-slate-800/80 to-slate-900/90 rounded-xl border border-dashed border-slate-700/50 flex flex-col items-center gap-4 shadow-xl backdrop-blur-sm relative overflow-hidden">
                      {/* Subtle background glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />

                      {/* Icon container */}
                      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 border border-slate-600/40 flex items-center justify-center shadow-lg backdrop-blur-sm group hover:scale-105 transition-all duration-300">
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <Box
                          strokeWidth={2}
                          className="w-5 h-5 text-slate-300 relative z-10 group-hover:text-purple-400 transition-colors duration-300"
                        />
                      </div>

                      {/* Text content */}
                      <div className="relative z-10 space-y-1.5">
                        <p className="text-xs font-bold text-slate-200 tracking-tight">
                          No Files Found
                        </p>
                        <p className="text-[10px] text-slate-400/90 max-w-[180px] mx-auto leading-snug">
                          Create a file or load a demo project.
                        </p>
                      </div>

                      {/* CTA button */}
                      <button
                        onClick={onLoadProject}
                        className="relative z-10 mt-0.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white rounded-lg text-[11px] font-semibold hover:from-purple-500 hover:via-purple-400 hover:to-purple-500 transition-all duration-300 shadow-md hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-100 border border-purple-400/20 backdrop-blur-sm"
                      >
                        <span className="relative z-10">Load Demo</span>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    {(Object.values(tree) as TreeNode[])
                      .sort((a, b) => {
                        // Prioritize bookmarked files
                        const aBookmarked = bookmarkedFiles.has(a.path);
                        const bBookmarked = bookmarkedFiles.has(b.path);
                        if (aBookmarked !== bBookmarked) {
                          return aBookmarked ? -1 : 1;
                        }
                        if (a.type === b.type)
                          return a.name.localeCompare(b.name);
                        return a.type === "folder" ? -1 : 1;
                      })
                      .map((node) => (
                        <FileTreeItem
                          key={node.path}
                          node={node}
                          level={0}
                          selectedFile={selectedFile}
                          onFileSelect={onFileSelect}
                          onDeleteFile={onDeleteFile}
                          onRenameItem={onRenameItem}
                          isBookmarked={bookmarkedFiles.has(node.path)}
                          onToggleBookmark={() => toggleBookmark(node.path)}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "tools" && (
              <div className="px-3 pt-3 space-y-3">
                <div className="p-3 bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-lg">
                  <h3 className="text-xs font-semibold text-slate-100 mb-0.5">
                    AI Accelerators
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Specialized agents for your codebase.
                  </p>
                </div>

                <div className="space-y-1.5">
                  {[
                    {
                      icon: LayoutTemplate,
                      label: "Project Scan",
                      desc: "Analyze structure & dependencies",
                      action: "overview",
                      color: "text-purple-600",
                      bg: "hover:border-purple-200 hover:shadow-purple-100/50",
                    },
                    {
                      icon: BookOpen,
                      label: "Code Audit",
                      desc: "Review architecture & patterns",
                      action: "analyze",
                      color: "text-emerald-600",
                      bg: "hover:border-emerald-200 hover:shadow-emerald-100/50",
                    },
                    {
                      icon: Bug,
                      label: "Security Check",
                      desc: "Find bugs & vulnerabilities",
                      action: "bugs",
                      color: "text-orange-600",
                      bg: "hover:border-orange-200 hover:shadow-orange-100/50",
                    },
                    {
                      icon: RefreshCw,
                      label: "Refactor Assistant",
                      desc: "Modernize & clean up code",
                      action: "refactor",
                      color: "text-amber-600",
                      bg: "hover:border-amber-200 hover:shadow-amber-100/50",
                    },
                  ].map((t, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        sendAgentTelemetry({
                          location: "Sidebar.tsx:443",
                          message: "AI Tool button clicked",
                          data: { action: t.action, label: t.label },
                          hypothesisId: "N",
                        });
                        onTriggerTool(t.action);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-700/60 bg-slate-800/80 transition-all group hover:shadow-sm hover:border-slate-600 active:scale-[0.99] duration-200 text-left ${t.bg}`}
                    >
                      <div
                        className={`p-1.5 bg-slate-700/80 rounded-md group-hover:bg-slate-700 transition-colors shrink-0 border border-slate-600/50`}
                      >
                        <t.icon
                          strokeWidth={2}
                          className={`w-3.5 h-3.5 ${t.color}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold text-slate-200 group-hover:text-slate-100 truncate">
                          {t.label}
                        </span>
                        <span className="block text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">
                          {t.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer - shrink-0 so it stays at bottom with minimal padding from bottom */}
          <div className="shrink-0 px-3 pt-2.5 pb-1 border-t border-slate-800/50 bg-slate-950/95 relative z-10">
            <button
              onClick={() => {
                sendAgentTelemetry({
                  location: "Sidebar.tsx:477",
                  message: "Clear Chat History clicked",
                  hypothesisId: "Q",
                });
                onClearChat();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-all duration-200 group border border-dashed border-slate-700 hover:border-slate-600"
            >
              <Trash2 strokeWidth={1.5} className="w-3 h-3 shrink-0" />
              <span>Clear Chat History</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
