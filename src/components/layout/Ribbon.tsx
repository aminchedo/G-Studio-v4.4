import React, { useState, useEffect } from "react";
import {
  FilePlus,
  UploadCloud,
  Bug,
  RefreshCw,
  Terminal,
  Trash2,
  Cpu,
  Check,
  FolderPlus,
  Download,
  Box,
  Layers,
  Zap,
  Command,
  PanelRight,
  Pin,
  PinOff,
  Key,
  Mic,
  UserCog,
  Hammer,
  Search,
  Move,
  FileEdit,
  FileText,
  History,
  Lock,
  Unlock,
  Eye,
  PenLine,
  Settings,
  Sparkles,
  BrainCircuit,
  Gauge,
  FolderTree,
  X,
  FileJson,
  FileCode,
  Palette,
  Globe,
  File,
  Copy,
  Upload,
  Home,
  FolderOpen,
  Save,
  RotateCcw,
  RotateCw,
  FileSearch,
  Code2,
  CopyPlus,
  FileX,
  Hash,
  WrapText,
  AlignLeft,
  Clipboard,
  RefreshCcw,
  FileCheck,
  FilePen,
  ArrowRightLeft,
  FileSearch as FileSearchIcon,
  Play,
  ScanSearch,
  Calculator,
  Clock,
  Fingerprint,
  Hash as HashIcon,
  Code,
  FileCode as FileCodeIcon,
  FileJson as FileJsonIcon,
  Type,
  Shuffle,
  Droplets,
  Ruler,
  Save as SaveIcon,
  Download as DownloadIcon,
  List,
  Trash2 as TrashIcon,
  Plus,
  Sun,
  Moon,
} from "lucide-react";
import { ModelId, FileData } from "@/types";
import { SUPPORTED_MODELS } from "@/constants";
import { RibbonIntelligenceTab } from "@/components/ribbon/RibbonIntelligenceTab";
import { RibbonViewTab } from "@/components/ribbon/RibbonViewTab";
import { sendAgentTelemetry } from "@/utils/agentTelemetry";
import { RibbonMcpTab } from "@/components/ribbon/RibbonMcpTab";
import { RibbonHomeTab } from "@/components/ribbon/RibbonHomeTab";

interface RibbonProps {
  onNewFile: () => void;
  onLoadDemo: () => void;
  onImportProject: (files: Record<string, FileData>) => void;
  onTriggerTool: (action: string) => void;
  onToggleChat: () => void;
  onOpenSettings: () => void;
  onOpenCodeIntelligence?: () => void;
  onClearChat: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  chatVisible: boolean;
  selectedModel: ModelId;
  onSelectModel: (id: ModelId) => void;
  onManageApiKey: () => void;
  onChangeVoice: () => void;
  onChangePersonality: () => void;
  onRunMcpTool: (tool: string) => void;
  agentConfig?: { apiKey: string; voice: string; persona: string };
  files?: Record<string, FileData>;
  isListening?: boolean;
  onToggleListening?: () => void;
  onShare?: () => void;
  onNewFolder?: () => void;
  onToggleSidebar?: () => void;
  onToggleInspector?: () => void;
  onTogglePreview?: () => void;
  onToggleMonitor?: () => void;
  onToggleMinimap?: () => void;
  onToggleEditor?: () => void;
  sidebarVisible?: boolean;
  inspectorVisible?: boolean;
  previewVisible?: boolean;
  monitorVisible?: boolean;
  minimapEnabled?: boolean;
  editorVisible?: boolean;
  onFormatFile?: () => void;
  activeFile?: string | null;
  onShowSpeechTest?: () => void;
  onSaveFile?: () => void;
  onSearchFiles?: () => void;
  onFind?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCloseFile?: () => void;
  onDuplicateFile?: () => void;
  onCopyFilePath?: () => void;
  onGoToLine?: () => void;
  onToggleWordWrap?: () => void;
  onClearEditor?: () => void;
  onRefresh?: () => void;
  openFiles?: string[];
  onRunCode?: () => void;
  onShowRibbonModal?: (modalName: string, data?: any) => void;
  onOpenGeminiTester?: () => void;
  onOpenAISettingsHub?: () => void;
  onOpenVoiceChat?: () => void;
  /** When false, ribbon voice buttons (VCode, VChat) are disabled. MIGRATION NOTE: API lifecycle stabilization */
  isApiReady?: boolean;
  // Missing props from App.tsx
  onFormat?: () => Promise<void>;
  onOpenAgentModal?: () => void;
  onOpenAISettings?: () => void;
  theme?: string;
  onToggleProjectStructure?: () => void;
  onToggleToolHistory?: () => void;
  onToggleToolChains?: () => void;
  onToggleToolManager?: () => void;
  onToggleCodeMetrics?: () => void;
  onToggleToolAnalytics?: () => void;
  vcodeVisible?: boolean;
  onToggleVcode?: () => void;
}

type TabId = "home" | "intelligence" | "view" | "mcp";

export const Ribbon: React.FC<RibbonProps> = React.memo(
  ({
    onNewFile,
    onLoadDemo,
    onImportProject,
    onTriggerTool,
    onToggleChat,
    onOpenSettings,
    onClearChat,
    chatVisible,
    selectedModel,
    onSelectModel,
    onManageApiKey,
    onChangeVoice,
    onChangePersonality,
    onRunMcpTool,
    agentConfig,
    files = {},
    isListening,
    onToggleListening,
    onShare,
    onNewFolder,
    onToggleSidebar,
    onToggleInspector,
    onTogglePreview,
    onToggleMonitor,
    onToggleMinimap,
    onToggleEditor,
    sidebarVisible = true,
    inspectorVisible = false,
    previewVisible = false,
    monitorVisible = false,
    minimapEnabled = true,
    editorVisible = true,
    onOpenCodeIntelligence,
    onFormatFile,
    activeFile,
    onShowSpeechTest,
    onSaveFile,
    onSearchFiles,
    onFind,
    onUndo,
    onRedo,
    onCloseFile,
    onDuplicateFile,
    onCopyFilePath,
    onGoToLine,
    onToggleWordWrap,
    onClearEditor,
    onRefresh,
    openFiles = [],
    onRunCode,
    onShowRibbonModal,
    isDarkMode = true,
    onToggleTheme,
    onOpenGeminiTester,
    onOpenAISettingsHub,
    onOpenVoiceChat,
    isApiReady = false,
    vcodeVisible = false,
    onToggleVcode,
  }) => {
    const [activeTab, setActiveTab] = useState<TabId>("home");
    const [isPinned, setIsPinned] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [safeMode, setSafeMode] = useState(true);
    const [toolHistory, setToolHistory] = useState<string[]>([]);
    const [toolStatuses, setToolStatuses] = useState<
      Record<string, "running" | "success" | "error">
    >({});

    // Memoize default tool access to prevent re-initialization
    const defaultToolAccess = React.useMemo(() => {
      const defaultAccess: Record<string, boolean> = {};
      const allTools = [
        "create_file",
        "read_file",
        "write_code",
        "move_file",
        "delete_file",
        "search_files",
        "run",
        "project_overview",
        "calculate",
        "get_current_time",
        "generate_uuid",
        "hash_text",
        "base64_encode",
        "base64_decode",
        "format_json",
        "text_transform",
        "generate_random",
        "color_converter",
        "unit_converter",
        "save_conversation",
        "load_conversation",
        "list_conversations",
        "delete_conversation",
      ];
      allTools.forEach((tool) => {
        defaultAccess[tool] = true;
      });
      return defaultAccess;
    }, []);

    const [toolAccess, setToolAccess] =
      useState<Record<string, boolean>>(defaultToolAccess);
    const isExpanded = isPinned || isHovered;

    const tabs: { id: TabId; label: string }[] = [
      { id: "home", label: "Home" },
      { id: "view", label: "View" },
      { id: "intelligence", label: "Intelligence" },
      { id: "mcp", label: "MCP Tools" },
    ];

    const handleToolClick = React.useCallback(
      (tool: string) => {
        // If tool is disabled, just toggle access
        if (!toolAccess[tool]) {
          setToolAccess((prev) => ({ ...prev, [tool]: true }));
          return;
        }

        // Set running state
        setToolStatuses((prev) => ({ ...prev, [tool]: "running" }));
        setToolHistory((prev) => [tool, ...prev].slice(0, 5));

        // Execute tool - this will open modal or execute directly
        onRunMcpTool(tool);

        // Clear running state after a short delay (actual execution happens in modal/background)
        setTimeout(() => {
          setToolStatuses((prev) => {
            const next = { ...prev };
            // Keep success state if tool executed, otherwise clear
            if (next[tool] === "running") {
              next[tool] = "success";
            }
            return next;
          });

          // Clear status after showing success state
          setTimeout(() => {
            setToolStatuses((prev) => {
              const next = { ...prev };
              delete next[tool];
              return next;
            });
          }, 2000);
        }, 500);
      },
      [toolAccess, onRunMcpTool]
    );

    const getFileIcon = React.useCallback((filename: string) => {
      const ext = filename.split(".").pop()?.toLowerCase();
      const iconProps = {
        strokeWidth: 2,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        className: "w-4 h-4",
      };
      switch (ext) {
        case "tsx":
        case "ts":
          return (
            <Code2
              {...iconProps}
              className={`${iconProps.className} text-ocean-600`}
            />
          );
        case "jsx":
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
              className={`${iconProps.className} text-orange-400`}
            />
          );
        case "css":
        case "scss":
          return (
            <Palette
              {...iconProps}
              className={`${iconProps.className} text-pink-500`}
            />
          );
        case "html":
          return (
            <Globe
              {...iconProps}
              className={`${iconProps.className} text-emerald-500`}
            />
          );
        default:
          return (
            <FileText
              {...iconProps}
              className={`${iconProps.className} text-slate-300`}
            />
          );
      }
    }, []);

    const renderContent = () => {
      switch (activeTab) {
        case "home":
          return (
            <RibbonHomeTab
              isExpanded={isExpanded}
              onNewFile={onNewFile}
              onNewFolder={onNewFolder}
              onLoadDemo={onLoadDemo}
              onImportProject={onImportProject}
              onShare={onShare}
              onSaveFile={onSaveFile}
              onCloseFile={onCloseFile}
              onDuplicateFile={onDuplicateFile}
              onCopyFilePath={onCopyFilePath}
              onUndo={onUndo}
              onRedo={onRedo}
              onFind={onFind}
              onGoToLine={onGoToLine}
              onFormatFile={onFormatFile}
              onToggleWordWrap={onToggleWordWrap}
              onSearchFiles={onSearchFiles}
              onClearEditor={onClearEditor}
              onRefresh={onRefresh}
              activeFile={activeFile}
              files={files}
              onShowStructureModal={() =>
                onShowRibbonModal?.("projectStructure")
              }
              onRunCode={onRunCode}
              onTogglePreview={onTogglePreview}
              onToggleEditor={onToggleEditor}
              onShowRibbonModal={onShowRibbonModal}
              onOpenAISettingsHub={onOpenAISettingsHub}
              onOpenVoiceChat={onOpenVoiceChat}
              onToggleVcode={onToggleVcode}
              vcodeVisible={vcodeVisible}
              isApiReady={isApiReady}
            />
          );
        case "intelligence":
          return (
            <RibbonIntelligenceTab
              isExpanded={isExpanded}
              onTriggerTool={onTriggerTool}
              isListening={isListening}
              onToggleListening={onToggleListening}
              onShowSpeechTest={onShowSpeechTest}
              onOpenVoiceChat={onOpenVoiceChat}
              agentConfig={agentConfig}
              onOpenCodeIntelligence={onOpenCodeIntelligence}
              onShowRibbonModal={onShowRibbonModal}
            />
          );
        case "mcp":
          return (
            <RibbonMcpTab
              isExpanded={isExpanded}
              onRunMcpTool={onRunMcpTool}
              safeMode={safeMode}
              setSafeMode={setSafeMode}
              toolStatuses={toolStatuses}
              toolHistory={toolHistory}
              toolAccess={toolAccess}
              setToolAccess={setToolAccess}
              handleToolClick={handleToolClick}
              onShowRibbonModal={onShowRibbonModal}
            />
          );
        case "view":
          return (
            <RibbonViewTab
              isExpanded={isExpanded}
              chatVisible={chatVisible}
              sidebarVisible={sidebarVisible}
              inspectorVisible={inspectorVisible}
              previewVisible={previewVisible}
              monitorVisible={monitorVisible}
              minimapEnabled={minimapEnabled}
              editorVisible={editorVisible}
              onToggleChat={onToggleChat}
              onToggleSidebar={onToggleSidebar}
              onToggleInspector={onToggleInspector}
              onTogglePreview={onTogglePreview}
              onToggleMonitor={onToggleMonitor}
              onToggleMinimap={onToggleMinimap}
              onToggleEditor={onToggleEditor}
              onFormatFile={onFormatFile}
              activeFile={activeFile}
            />
          );
        default:
          return null;
      }
    };

    /* One piece top to bottom: single background, no inner boundaries */
    /* Dark gradient: no light top; stays dark from top to bottom */
    const onePieceBg =
      "bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900";

    return (
      <>
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`${onePieceBg} border-b border-slate-600/40 z-50 select-none flex flex-col shrink-0 relative overflow-hidden transition-all duration-200 ${
            isExpanded ? "h-[200px]" : "h-[100px]"
          }`}
          style={{
            willChange: "height",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
          }}
        >
          {/* Single minimal line: logo + GStudio | nav tabs (ribbon font) | theme */}
          <div className="flex items-center justify-between px-4 py-1.5 relative z-10 shrink-0 min-h-0">
            <div className="flex items-center gap-2 w-[120px] shrink-0 group cursor-pointer select-none">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-md border border-purple-500/30 shrink-0">
                <Sparkles
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-white"
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                />
              </div>
              <span className="font-semibold text-sm tracking-tight text-white truncate">
                GStudio
              </span>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    sendAgentTelemetry({
                      location: "Ribbon.tsx:374",
                      message: "Tab clicked",
                      data: { tabId: tab.id, currentTab: activeTab },
                      hypothesisId: "F",
                    });
                    setActiveTab(tab.id as TabId);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-purple-600/90 text-white"
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-700/40"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end w-[120px] gap-1 shrink-0">
              {onToggleTheme && (
                <button
                  onClick={() => {
                    sendAgentTelemetry({
                      location: "Ribbon.tsx:397",
                      message: "Theme toggle clicked",
                      data: { currentTheme: isDarkMode ? "dark" : "light" },
                      hypothesisId: "U",
                    });
                    onToggleTheme();
                  }}
                  className="p-1.5 rounded-lg border border-transparent hover:border-slate-600/50 hover:bg-slate-700/50 transition-all duration-200 text-slate-300 hover:text-white"
                  title={
                    isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                  }
                  type="button"
                  data-action="toggle-theme"
                >
                  {isDarkMode ? (
                    <Sun
                      strokeWidth={2.25}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                      style={{
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                      }}
                    />
                  ) : (
                    <Moon
                      strokeWidth={2.25}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                      style={{
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                      }}
                    />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Content row – clear spacing between groups, extra padding below icons */}
          <div className="flex-1 px-5 pt-4 pb-6 flex items-start gap-6 overflow-x-auto no-scrollbar relative z-10">
            {renderContent()}
          </div>
        </div>
      </>
    );
  }
);
