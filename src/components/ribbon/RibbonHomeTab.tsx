import React, { useRef, useState, useEffect } from "react";
import {
  FilePlus,
  FolderPlus,
  FolderOpen,
  Upload,
  Download,
  Save,
  FileX,
  CopyPlus,
  Clipboard,
  RotateCcw,
  RotateCw,
  Search,
  Hash,
  WrapText,
  UploadCloud,
  RefreshCcw,
  Trash2,
  Play,
  Code2,
  Eye,
  BarChart3,
  X,
  MessageSquare,
  Sparkles,
  Mic,
} from "lucide-react";
import { FileData } from "@/types";
import { sendAgentTelemetry } from "@/utils/agentTelemetry";
import {
  StructureIcon,
  ShareIcon,
  FormatIcon,
  FileSearch,
} from "@/components/icons";
import { RibbonGroup, RibbonDivider, RibbonButton } from "./RibbonComponents";

interface RibbonHomeTabProps {
  isExpanded: boolean;
  onNewFile: () => void;
  onNewFolder?: () => void;
  onLoadDemo: () => void;
  onImportProject: (files: Record<string, FileData>) => void;
  onShare?: () => void;
  onSaveFile?: () => void;
  onCloseFile?: () => void;
  onDuplicateFile?: () => void;
  onCopyFilePath?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onGoToLine?: () => void;
  onFormatFile?: () => void;
  onToggleWordWrap?: () => void;
  onSearchFiles?: () => void;
  onClearEditor?: () => void;
  onRefresh?: () => void;
  activeFile?: string | null;
  files?: Record<string, FileData>;
  onShowStructureModal: () => void;
  onRunCode?: () => void;
  onTogglePreview?: () => void;
  onToggleEditor?: () => void;
  onShowRibbonModal?: (modalName: string, data?: any) => void;
  onOpenAISettingsHub?: () => void;
  onShowSpeechTest?: () => void;
  onOpenVoiceChat?: () => void;
  onToggleVcode?: () => void;
  vcodeVisible?: boolean;
  /** When false, voice buttons (VCode, VChat) are disabled. MIGRATION NOTE: API lifecycle stabilization */
  isApiReady?: boolean;
  onTriggerTool?: (action: string) => void;
  isListening?: boolean;
  onToggleListening?: () => void;
  agentConfig?: { apiKey: string; voice: string; persona: string };
  onOpenCodeIntelligence?: () => void;
}

export const RibbonHomeTab: React.FC<RibbonHomeTabProps> = ({
  isExpanded,
  onNewFile,
  onNewFolder,
  onLoadDemo,
  onImportProject,
  onShare,
  onSaveFile,
  onCloseFile,
  onDuplicateFile,
  onCopyFilePath,
  onUndo,
  onRedo,
  onFind,
  onGoToLine,
  onFormatFile,
  onToggleWordWrap,
  onSearchFiles,
  onClearEditor,
  onRefresh,
  activeFile,
  files = {},
  onShowStructureModal,
  onRunCode,
  onTogglePreview,
  onToggleEditor,
  onShowRibbonModal,
  onOpenAISettingsHub,
  onShowSpeechTest,
  onOpenVoiceChat,
  onToggleVcode,
  vcodeVisible = false,
  isApiReady = false,
  onTriggerTool,
  isListening,
  onToggleListening,
  agentConfig,
  onOpenCodeIntelligence,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [toolUsage, setToolUsage] = useState<Record<string, number>>({});
  const [showToolUsage, setShowToolUsage] = useState(false);

  // Track tool usage
  useEffect(() => {
    const tools = ["Format", "Save", "Close", "Find", "Undo", "Redo"];
    const usage: Record<string, number> = {};
    tools.forEach((tool) => {
      const stored = localStorage.getItem(`tool_usage_${tool}`);
      usage[tool] = stored ? parseInt(stored, 10) : 0;
    });
    setToolUsage(usage);
  }, []);

  const trackToolUsage = (tool: string) => {
    setToolUsage((prev) => {
      const newUsage = { ...prev, [tool]: (prev[tool] || 0) + 1 };
      localStorage.setItem(`tool_usage_${tool}`, newUsage[tool].toString());
      return newUsage;
    });
  };

  const handleImportClick = () => {
    sendAgentTelemetry({
      location: "RibbonHomeTab.tsx:67",
      message: "Import button clicked",
      hypothesisId: "Y",
    });
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const data = JSON.parse(content);
        onImportProject(data);
      } catch (err) {
        console.error("Import error:", err);
        // Show error to user via message - parent component will handle display
        // For now, we'll show a user-friendly error
        const errorMsg =
          "Failed to import project. Please ensure the file is valid JSON format.";
        // Note: This should be handled by parent component's error handling system
        // For immediate feedback, we could emit an event or use a callback
        console.error(errorMsg);
      }
    };
    reader.onerror = () => {
      console.error("Failed to read file");
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const handleOpenProjectClick = () => {
    sendAgentTelemetry({
      location: "RibbonHomeTab.tsx:89",
      message: "Open Folder button clicked",
      hypothesisId: "Z",
    });
    folderInputRef.current?.click();
  };

  const handleFolderImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const projectFiles: Record<string, FileData> = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = (file as any).webkitRelativePath || file.name;

      const reader = new FileReader();
      await new Promise<void>((resolve, reject) => {
        reader.onload = (ev) => {
          try {
            const content = ev.target?.result as string;
            const ext = path.split(".").pop()?.toLowerCase() || "";
            let language = "text";
            if (["ts", "tsx", "js", "jsx"].includes(ext))
              language = "typescript";
            else if (ext === "json") language = "json";
            else if (ext === "css") language = "css";
            else if (ext === "html") language = "html";
            else if (ext === "md") language = "markdown";

            projectFiles[path] = {
              name: path,
              language,
              content,
            };
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    if (Object.keys(projectFiles).length > 0) {
      onImportProject(projectFiles);
    }

    e.target.value = ""; // Reset input
  };

  const handleExportClick = () => {
    sendAgentTelemetry({
      location: "RibbonHomeTab.tsx:138",
      message: "Export button clicked",
      data: { fileCount: Object.keys(files).length },
      hypothesisId: "AA",
    });
    if (Object.keys(files).length === 0) {
      // Show user feedback instead of silent return
      if (typeof window !== "undefined" && (window as any).showWarning) {
        (window as any).showWarning(
          "No files to export. Please create or import files first.",
        );
      } else {
        console.warn("No files to export");
      }
      return;
    }
    const jsonString = JSON.stringify(files, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemini-project-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // Show success feedback
    if (typeof window !== "undefined" && (window as any).showSuccess) {
      (window as any).showSuccess(
        `Project exported successfully (${Object.keys(files).length} files)`,
      );
    }
  };

  return (
    <div className="flex items-center h-full animate-fade-in gap-4">
      <RibbonGroup label="FILE" isExpanded={isExpanded}>
        <RibbonButton
          icon={FilePlus}
          label="New File"
          onClick={onNewFile}
          color="text-ocean-600"
          isExpanded={isExpanded}
          active={true}
        />
        <RibbonButton
          icon={FolderOpen}
          label="Open Folder"
          onClick={handleOpenProjectClick}
          color="text-ocean-600"
          isExpanded={isExpanded}
        />
        <RibbonButton
          icon={Download}
          label="Load Demo"
          onClick={onLoadDemo}
          color="text-ocean-600"
          isExpanded={isExpanded}
        />
        <RibbonButton
          icon={Save}
          label="Save"
          onClick={
            onSaveFile
              ? () => {
                  if (activeFile) {
                    trackToolUsage("Save");
                    onSaveFile();
                  }
                }
              : undefined
          }
          color="text-emerald-600"
          isExpanded={isExpanded}
          inactive={!activeFile || !onSaveFile}
        />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="EDIT" isExpanded={isExpanded}>
        <RibbonButton
          icon={RotateCcw}
          label="Undo"
          onClick={() => {
            if ((window as any).__editorUndo) {
              (window as any).__editorUndo();
            } else if (onUndo) {
              onUndo();
            }
          }}
          color="text-slate-600"
          isExpanded={isExpanded}
        />
        <RibbonButton
          icon={RotateCw}
          label="Redo"
          onClick={() => {
            if ((window as any).__editorRedo) {
              (window as any).__editorRedo();
            } else if (onRedo) {
              onRedo();
            }
          }}
          color="text-slate-600"
          isExpanded={isExpanded}
        />
        <RibbonButton
          icon={Search}
          label="Find"
          onClick={() => {
            if ((window as any).__editorFind) {
              (window as any).__editorFind();
            } else if (onFind) {
              onFind();
            }
          }}
          color="text-ocean-600"
          isExpanded={isExpanded}
        />
        <RibbonButton
          icon={Hash}
          label="Go to Line"
          onClick={
            onGoToLine
              ? () => {
                  if (activeFile) onGoToLine();
                }
              : undefined
          }
          color="text-ocean-600"
          isExpanded={isExpanded}
          inactive={!activeFile || !onGoToLine}
        />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="Format" isExpanded={isExpanded}>
        <RibbonButton
          icon={FormatIcon}
          label="Format"
          onClick={
            onFormatFile
              ? () => {
                  if (activeFile) {
                    trackToolUsage("Format");
                    onFormatFile();
                  }
                }
              : undefined
          }
          color="text-indigo-600"
          isExpanded={isExpanded}
          inactive={!activeFile || !onFormatFile}
          dataAction="format-file"
        />
        <RibbonButton
          icon={WrapText}
          label="Word Wrap"
          onClick={onToggleWordWrap || undefined}
          color="text-slate-600"
          isExpanded={isExpanded}
          inactive={!onToggleWordWrap}
        />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="VIEW" isExpanded={isExpanded}>
        <RibbonButton
          icon={Code2}
          label="Code View"
          onClick={() => {
            sendAgentTelemetry({
              location: "RibbonHomeTab.tsx:215",
              message: "Code View button clicked",
              hypothesisId: "R",
            });
            if (onToggleEditor) {
              onToggleEditor();
            }
          }}
          color="text-ocean-600"
          isExpanded={isExpanded}
          active={true}
          inactive={!onToggleEditor}
        />
        <RibbonButton
          icon={Eye}
          label="Preview"
          onClick={() => {
            if (onTogglePreview) {
              onTogglePreview();
            }
          }}
          color="text-ocean-600"
          isExpanded={isExpanded}
        />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="RUN" isExpanded={isExpanded}>
        <button
          onClick={onRunCode || undefined}
          disabled={!onRunCode}
          className="px-4 py-2.5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Play strokeWidth={2.5} className="w-4 h-4" />
          <span>Run</span>
        </button>
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="AI" isExpanded={isExpanded}>
        <button
          onClick={onOpenVoiceChat || undefined}
          disabled={!isApiReady}
          className={`px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
            vcodeVisible
              ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-2 ring-emerald-400/50"
              : "bg-gradient-to-br from-emerald-600 to-teal-700 text-white"
          }`}
          title="Open Voice Conversation AI"
        >
          <Mic strokeWidth={2.5} className="w-4 h-4" />
          <Code2 strokeWidth={2.5} className="w-4 h-4" />
          <span>Vcode</span>
        </button>
        <button
          onClick={onOpenVoiceChat || undefined}
          disabled={!isApiReady}
          className="px-4 py-2.5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title="Open Voice Chat with AI Avatar"
        >
          <MessageSquare strokeWidth={2.5} className="w-4 h-4" />
          <Sparkles
            strokeWidth={2.5}
            className="w-3 h-3 absolute -top-0.5 -right-0.5 text-yellow-300"
          />
          <span>VChat</span>
        </button>
      </RibbonGroup>
      {isExpanded && <RibbonDivider />}
      {isExpanded && (
        <RibbonGroup label="Analytics" isExpanded={isExpanded}>
          <RibbonButton
            icon={BarChart3}
            label="Tool Usage"
            onClick={() => onShowRibbonModal?.("toolUsageAnalytics")}
            color="text-purple-600"
            isExpanded={isExpanded}
          />
        </RibbonGroup>
      )}
      <RibbonDivider />
      <RibbonGroup label="Project" isExpanded={isExpanded}>
        <RibbonButton
          icon={FolderOpen}
          label="Open Folder"
          onClick={handleOpenProjectClick}
          color="text-ocean-600"
          isExpanded={isExpanded}
        />
        <RibbonButton
          icon={Upload}
          label="Import"
          onClick={handleImportClick}
          color="text-ocean-600"
          isExpanded={isExpanded}
        />
        <RibbonButton
          icon={Download}
          label="Export"
          onClick={handleExportClick}
          color="text-ocean-600"
          isExpanded={isExpanded}
        />
      </RibbonGroup>
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderImport}
        className="hidden"
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".json"
      />
    </div>
  );
};
