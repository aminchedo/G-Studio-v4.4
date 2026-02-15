import React, { useState, useEffect } from "react";
import {
  FilePlus,
  FileCheck,
  FilePen,
  ArrowRightLeft,
  Trash2,
  FileSearch as FileSearchIcon,
  Play,
  ScanSearch,
  Calculator,
  Clock,
  Fingerprint,
  Hash,
  Code2,
  FileJson,
  Type,
  Shuffle,
  Palette,
  Ruler,
  Save,
  Download,
  List,
  History,
  Lock,
  Unlock,
  X,
  Zap,
  Settings,
} from "lucide-react";
import { RibbonGroup, RibbonDivider, McpToolButton } from "./RibbonComponents";
import { API_BASE } from "@/config/api";
import { safeFetch } from "@/services/network";

interface RibbonMcpTabProps {
  isExpanded: boolean;
  onRunMcpTool: (tool: string) => void;
  safeMode: boolean;
  setSafeMode: (mode: boolean) => void;
  toolStatuses: Record<string, "running" | "success" | "error">;
  toolHistory: string[];
  toolAccess: Record<string, boolean>;
  setToolAccess: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleToolClick: (tool: string) => void;
  onShowRibbonModal?: (modalName: string, data?: any) => void;
}

export const RibbonMcpTab: React.FC<RibbonMcpTabProps> = ({
  isExpanded,
  onRunMcpTool,
  safeMode,
  setSafeMode,
  toolStatuses,
  toolHistory,
  toolAccess,
  setToolAccess,
  handleToolClick,
  onShowRibbonModal,
}) => {
  const [toolExecutionHistory, setToolExecutionHistory] = useState<
    Array<{
      tool: string;
      timestamp: Date;
      success: boolean;
    }>
  >([]);
  const [toolChains, setToolChains] = useState<string[][]>([]);
  const [customTools, setCustomTools] = useState<
    Array<{ id: string; name: string; description: string }>
  >([]);

  // Load custom tools from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gstudio_custom_tools");
      if (saved) {
        setCustomTools(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load custom tools:", e);
    }
  }, []);

  // Track tool executions
  useEffect(() => {
    if (toolHistory.length > 0) {
      const lastTool = toolHistory[0];
      const success = toolStatuses[lastTool] === "success";
      setToolExecutionHistory((prev) =>
        [
          {
            tool: lastTool,
            timestamp: new Date(),
            success,
          },
          ...prev,
        ].slice(0, 20),
      ); // Keep last 20 executions
    }
  }, [toolHistory, toolStatuses]);

  const getToolAccessProps = (tool: string) => ({
    enabled: toolAccess[tool] ?? true,
    onToggleAccess: () =>
      setToolAccess((prev) => ({ ...prev, [tool]: !prev[tool] })),
  });

  const handleCreateToolChain = () => {
    if (toolExecutionHistory.length >= 2) {
      const chain = toolExecutionHistory.slice(0, 3).map((exec) => exec.tool);
      setToolChains((prev) => [chain, ...prev].slice(0, 10));
      if (typeof window !== "undefined" && (window as any).showInfo) {
        (window as any).showInfo(`Tool chain created: ${chain.join(" -> ")}`);
      }
    }
  };

  return (
    <div className="flex items-center h-full animate-fade-in gap-10">
      <RibbonGroup label="File System" isExpanded={isExpanded}>
        <div className="flex gap-1.5">
          <McpToolButton
            tool="create_file"
            icon={FilePlus}
            label="Create"
            permission="write"
            onClick={() => handleToolClick("create_file")}
            status={toolStatuses["create_file"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("create_file")}
          />
          <McpToolButton
            tool="read_file"
            icon={FileCheck}
            label="Read"
            permission="read"
            onClick={() => handleToolClick("read_file")}
            status={toolStatuses["read_file"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("read_file")}
          />
          <McpToolButton
            tool="write_code"
            icon={FilePen}
            label="Write"
            permission="write"
            onClick={() => handleToolClick("write_code")}
            status={toolStatuses["write_code"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("write_code")}
          />
          <McpToolButton
            tool="move_file"
            icon={ArrowRightLeft}
            label="Move"
            permission="write"
            onClick={() => handleToolClick("move_file")}
            status={toolStatuses["move_file"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("move_file")}
          />
          <McpToolButton
            tool="delete_file"
            icon={Trash2}
            label="Delete"
            permission="delete"
            onClick={() => handleToolClick("delete_file")}
            status={toolStatuses["delete_file"]}
            safeMode={safeMode}
            isExpanded={isExpanded}
            {...getToolAccessProps("delete_file")}
          />
          <McpToolButton
            tool="search_files"
            icon={FileSearchIcon}
            label="Search"
            permission="read"
            onClick={() => handleToolClick("search_files")}
            status={toolStatuses["search_files"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("search_files")}
          />
        </div>
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="Runtime" isExpanded={isExpanded}>
        <div className="flex gap-1.5">
          <McpToolButton
            tool="run"
            icon={Play}
            label="Execute"
            permission="execute"
            onClick={() => handleToolClick("run")}
            status={toolStatuses["run"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("run")}
          />
          <McpToolButton
            tool="project_overview"
            icon={ScanSearch}
            label="Scan"
            permission="read"
            onClick={() => handleToolClick("project_overview")}
            status={toolStatuses["project_overview"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("project_overview")}
          />
        </div>
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="Utilities" isExpanded={isExpanded}>
        <div className="flex gap-1.5 flex-wrap">
          <McpToolButton
            tool="calculate"
            icon={Calculator}
            label="Calc"
            permission="read"
            onClick={() => handleToolClick("calculate")}
            status={toolStatuses["calculate"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("calculate")}
          />
          <McpToolButton
            tool="get_current_time"
            icon={Clock}
            label="Time"
            permission="read"
            onClick={() => handleToolClick("get_current_time")}
            status={toolStatuses["get_current_time"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("get_current_time")}
          />
          <McpToolButton
            tool="generate_uuid"
            icon={Fingerprint}
            label="UUID"
            permission="read"
            onClick={() => handleToolClick("generate_uuid")}
            status={toolStatuses["generate_uuid"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("generate_uuid")}
          />
          <McpToolButton
            tool="hash_text"
            icon={Hash}
            label="Hash"
            permission="read"
            onClick={() => handleToolClick("hash_text")}
            status={toolStatuses["hash_text"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("hash_text")}
          />
          <McpToolButton
            tool="base64_encode"
            icon={Code2}
            label="B64+"
            permission="read"
            onClick={() => handleToolClick("base64_encode")}
            status={toolStatuses["base64_encode"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("base64_encode")}
          />
          <McpToolButton
            tool="base64_decode"
            icon={Code2}
            label="B64-"
            permission="read"
            onClick={() => handleToolClick("base64_decode")}
            status={toolStatuses["base64_decode"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("base64_decode")}
          />
          <McpToolButton
            tool="format_json"
            icon={FileJson}
            label="JSON"
            permission="read"
            onClick={() => handleToolClick("format_json")}
            status={toolStatuses["format_json"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("format_json")}
          />
          <McpToolButton
            tool="text_transform"
            icon={Type}
            label="Text"
            permission="read"
            onClick={() => handleToolClick("text_transform")}
            status={toolStatuses["text_transform"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("text_transform")}
          />
          <McpToolButton
            tool="generate_random"
            icon={Shuffle}
            label="Random"
            permission="read"
            onClick={() => handleToolClick("generate_random")}
            status={toolStatuses["generate_random"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("generate_random")}
          />
          <McpToolButton
            tool="color_converter"
            icon={Palette}
            label="Color"
            permission="read"
            onClick={() => handleToolClick("color_converter")}
            status={toolStatuses["color_converter"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("color_converter")}
          />
          <McpToolButton
            tool="unit_converter"
            icon={Ruler}
            label="Unit"
            permission="read"
            onClick={() => handleToolClick("unit_converter")}
            status={toolStatuses["unit_converter"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("unit_converter")}
          />
        </div>
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="Conversations" isExpanded={isExpanded}>
        <div className="flex gap-1.5">
          <McpToolButton
            tool="save_conversation"
            icon={Save}
            label="Save"
            permission="write"
            onClick={() => handleToolClick("save_conversation")}
            status={toolStatuses["save_conversation"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("save_conversation")}
          />
          <McpToolButton
            tool="load_conversation"
            icon={Download}
            label="Load"
            permission="read"
            onClick={() => handleToolClick("load_conversation")}
            status={toolStatuses["load_conversation"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("load_conversation")}
          />
          <McpToolButton
            tool="list_conversations"
            icon={List}
            label="List"
            permission="read"
            onClick={() => handleToolClick("list_conversations")}
            status={toolStatuses["list_conversations"]}
            isExpanded={isExpanded}
            {...getToolAccessProps("list_conversations")}
          />
          <McpToolButton
            tool="delete_conversation"
            icon={Trash2}
            label="Delete"
            permission="delete"
            onClick={() => handleToolClick("delete_conversation")}
            status={toolStatuses["delete_conversation"]}
            safeMode={safeMode}
            isExpanded={isExpanded}
            {...getToolAccessProps("delete_conversation")}
          />
        </div>
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="Safety" isExpanded={isExpanded}>
        {isExpanded ? (
          <div className="flex gap-1.5 px-1">
            {/* Safe Mode */}
            <button
              onClick={() => {
                sendAgentTelemetry({
                  location: "RibbonMcpTab.tsx:202",
                  message: "Safe Mode toggle clicked",
                  data: { currentMode: safeMode, newMode: !safeMode },
                  hypothesisId: "S",
                });
                setSafeMode(!safeMode);
              }}
              className={`flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-medium transition-all border shadow-sm min-h-[50px] min-w-[70px] ${
                safeMode
                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30"
                  : "bg-amber-600/20 border-amber-500/40 text-amber-400 hover:bg-amber-600/30"
              }`}
              title={
                safeMode
                  ? "Destructive actions require confirmation"
                  : "Safe mode disabled"
              }
            >
              {safeMode ? (
                <Lock strokeWidth={2} className="w-3.5 h-3.5" />
              ) : (
                <Unlock strokeWidth={2} className="w-3.5 h-3.5" />
              )}
              <span className="text-center leading-tight whitespace-nowrap">
                {safeMode ? "Safe" : "Unsafe"}
              </span>
            </button>

            {/* History */}
            <button
              onClick={() => {
                // #region agent log
                safeFetch(
                  `${API_BASE}/ingest/e36303ce-b8c8-4c86-ba1c-f20c8832334e`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      location: "RibbonMcpTab.tsx:214",
                      message: "Tool History button clicked",
                      data: {
                        historyCount: toolExecutionHistory.length,
                        history: toolExecutionHistory,
                      },
                      timestamp: Date.now(),
                      sessionId: "debug-session",
                      runId: "run1",
                      hypothesisId: "T",
                    }),
                  },
                ).catch(() => {});
                // #endregion
                onShowRibbonModal?.("toolHistory", { toolExecutionHistory });
              }}
              className="flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[10px] font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800/80 transition-all shadow-sm min-h-[50px] min-w-[70px]"
            >
              <History
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              />
              <div className="flex items-center gap-1">
                <span className="text-center leading-tight">History</span>
                <div className="bg-slate-700/80 text-slate-200 px-1 py-0.5 rounded text-[8px] font-semibold min-w-[16px] text-center">
                  {toolExecutionHistory.length}
                </div>
              </div>
            </button>

            {/* Chains */}
            <button
              onClick={() => {
                onShowRibbonModal?.("toolChains", { toolChains });
              }}
              className="flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[10px] font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800/80 transition-all shadow-sm min-h-[50px] min-w-[70px]"
            >
              <Zap
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              />
              <div className="flex items-center gap-1">
                <span className="text-center leading-tight">Chains</span>
                <div className="bg-slate-700/80 text-slate-200 px-1 py-0.5 rounded text-[8px] font-semibold min-w-[16px] text-center">
                  {toolChains.length}
                </div>
              </div>
            </button>

            {/* Manage Tools */}
            <button
              onClick={() =>
                onShowRibbonModal?.("toolManager", { customTools })
              }
              className="flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-blue-600/20 border border-blue-500/40 text-[10px] font-medium text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/60 transition-all shadow-sm min-h-[50px] min-w-[70px]"
            >
              <Settings strokeWidth={2} className="w-3.5 h-3.5" />
              <span className="text-center leading-tight whitespace-nowrap">
                Manage
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center px-1">
            <button
              onClick={() => {
                // #region agent log
                safeFetch(
                  `${API_BASE}/ingest/e36303ce-b8c8-4c86-ba1c-f20c8832334e`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      location: "RibbonMcpTab.tsx:202",
                      message: "Safe Mode toggle clicked",
                      data: { currentMode: safeMode, newMode: !safeMode },
                      timestamp: Date.now(),
                      sessionId: "debug-session",
                      runId: "run1",
                      hypothesisId: "S",
                    }),
                  },
                ).catch(() => {});
                // #endregion
                setSafeMode(!safeMode);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] transition-all border shadow-sm ${
                safeMode
                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                  : "bg-amber-600/20 border-amber-500/40 text-amber-400"
              }`}
              title={
                safeMode
                  ? "Destructive actions require confirmation"
                  : "Safe mode disabled"
              }
            >
              {safeMode ? (
                <Lock strokeWidth={1.5} className="w-3.5 h-3.5" />
              ) : (
                <Unlock strokeWidth={1.5} className="w-3.5 h-3.5" />
              )}
              <span>{safeMode ? "Safe" : "Unsafe"}</span>
            </button>
          </div>
        )}
      </RibbonGroup>
    </div>
  );
};
