/**
 * Local AI Tab - LM Studio Integration
 *
 * Features:
 * - LM Studio connection management
 * - Model listing and selection
 * - Connection testing
 * - Execution mode configuration
 * - Fallback settings
 */

import React, { useState, useCallback, useEffect } from "react";
import { AIConfig, ExecutionModeType } from "@/types";

// SVG Icons
const CpuIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M15 2v2" />
    <path d="M15 20v2" />
    <path d="M2 15h2" />
    <path d="M2 9h2" />
    <path d="M20 15h2" />
    <path d="M20 9h2" />
    <path d="M9 2v2" />
    <path d="M9 20v2" />
  </svg>
);

const ServerIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <line x1="6" x2="6.01" y1="6" y2="6" />
    <line x1="6" x2="6.01" y1="18" y2="18" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

const PlayIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const LoaderIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

const CloudIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

const HardDriveIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" x2="2" y1="12" y2="12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    <line x1="6" x2="6.01" y1="16" y2="16" />
    <line x1="10" x2="10.01" y1="16" y2="16" />
  </svg>
);

const ZapIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const CombineIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="8" height="8" x="2" y="2" rx="2" />
    <path d="M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
    <path d="M20 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
    <path d="M10 18H5c-1.7 0-3-1.3-3-3v-1" />
    <polyline points="7 21 10 18 7 15" />
    <rect width="8" height="8" x="14" y="14" rx="2" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DownloadIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

interface LocalAITabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

interface LMStudioModel {
  id: string;
  object: string;
  owned_by?: string;
}

type ConnectionStatus = "idle" | "checking" | "connected" | "disconnected";

const EXECUTION_MODES: Array<{
  id: ExecutionModeType;
  name: string;
  description: string;
  icon: React.FC;
}> = [
  {
    id: "auto" as ExecutionModeType,
    name: "Auto",
    description: "Smart routing based on task",
    icon: ZapIcon,
  },
  {
    id: "cloud-only" as ExecutionModeType,
    name: "Cloud Only",
    description: "Always use Gemini API",
    icon: CloudIcon,
  },
  {
    id: "local-only" as ExecutionModeType,
    name: "Local Only",
    description: "Always use local model",
    icon: HardDriveIcon,
  },
  {
    id: "hybrid",
    name: "Hybrid",
    description: "Local first, cloud fallback",
    icon: CombineIcon,
  },
];

export const LocalAITab: React.FC<LocalAITabProps> = ({
  config,
  updateConfig,
}) => {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [availableModels, setAvailableModels] = useState<LMStudioModel[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency?: number;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Check LM Studio connection
  const checkConnection = useCallback(async () => {
    setConnectionStatus("checking");
    setErrorMessage("");
    setAvailableModels([]);

    try {
      const { McpService } = await import("@/services/mcpService");
      const data = await McpService.request(
        `${config.localEndpoint}/v1/models`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          timeout: 5000,
        },
      );

      setConnectionStatus("connected");

      if (data.data && Array.isArray(data.data)) {
        setAvailableModels(data.data);

        // Auto-select first model if none selected
        if (!config.localModel && data.data.length > 0) {
          updateConfig("localModel", data.data[0].id);
        }
      }
    } catch (error: any) {
      setConnectionStatus("disconnected");
      if (
        error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        error.status === 0
      ) {
        setErrorMessage("Connection timeout");
      } else if (error.message?.includes("Failed to fetch")) {
        setErrorMessage("LM Studio not running");
      } else {
        setErrorMessage(error.message || "Connection failed");
      }
    }
  }, [config.localEndpoint, config.localModel, updateConfig]);

  // Test model inference
  const testInference = useCallback(async () => {
    if (!config.localModel || connectionStatus !== "connected") return;

    setIsTesting(true);
    setTestResult(null);

    const startTime = Date.now();

    try {
      const { McpService } = await import("@/services/mcpService");
      const data = await McpService.request(
        `${config.localEndpoint}/v1/chat/completions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            model: config.localModel,
            messages: [{ role: "user", content: "Say hello in one word." }],
            max_tokens: 10,
            temperature: 0.1,
          },
          timeout: 30000,
        },
      );

      const latency = Date.now() - startTime;
      setTestResult({ success: true, latency });
    } catch (error) {
      setTestResult({ success: false });
    } finally {
      setIsTesting(false);
    }
  }, [config.localModel, config.localEndpoint, connectionStatus]);

  // Check connection when enabled
  useEffect(() => {
    if (config.localAIEnabled && connectionStatus === "idle") {
      checkConnection();
    }
  }, [config.localAIEnabled, connectionStatus, checkConnection]);

  return (
    <div className="space-y-2">
      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold text-white">
            Local AI (LM Studio)
          </h3>
          <button
            onClick={() => {
              const v = !config.localAIEnabled;
              updateConfig("localAIEnabled", v);
              if (v) setConnectionStatus("idle");
            }}
            className={`relative w-7 h-3.5 rounded-full transition-all ${config.localAIEnabled ? "bg-cyan-500" : "bg-slate-600"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${config.localAIEnabled ? "translate-x-3.5" : "translate-x-0"}`}
            />
          </button>
        </div>
        {config.localAIEnabled && (
          <div className="p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 w-14 shrink-0">
                Endpoint
              </label>
              <input
                type="text"
                value={config.localEndpoint}
                onChange={(e) => updateConfig("localEndpoint", e.target.value)}
                placeholder="http://localhost:1234"
                className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-[10px] font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                onClick={checkConnection}
                disabled={connectionStatus === "checking"}
                className="px-2 py-1 rounded text-[9px] font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 shrink-0"
              >
                {connectionStatus === "checking" ? (
                  <LoaderIcon />
                ) : (
                  <RefreshIcon />
                )}{" "}
                {connectionStatus === "checking" ? "…" : "Check"}
              </button>
            </div>
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] ${connectionStatus === "connected" ? "bg-emerald-500/10 text-emerald-400" : connectionStatus === "disconnected" ? "bg-red-500/10 text-red-400" : "bg-slate-800/60 text-slate-400"}`}
            >
              {connectionStatus === "checking" && <LoaderIcon />}
              {connectionStatus === "connected" && (
                <>
                  <CheckCircleIcon /> {availableModels.length} model(s)
                </>
              )}
              {connectionStatus === "disconnected" && (
                <>
                  <AlertCircleIcon /> {errorMessage || "Disconnected"}
                </>
              )}
              {connectionStatus === "idle" && "Check connection"}
            </div>
            {connectionStatus === "connected" && availableModels.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-400 w-14 shrink-0">
                  Model
                </label>
                <select
                  value={config.localModel}
                  onChange={(e) => updateConfig("localModel", e.target.value)}
                  className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">Select</option>
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </select>
                <button
                  onClick={testInference}
                  disabled={isTesting || !config.localModel}
                  className="px-2 py-1 rounded text-[9px] bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50"
                >
                  {isTesting ? <LoaderIcon /> : <PlayIcon />} Test
                </button>
              </div>
            )}
            {testResult && (
              <div
                className={`text-[10px] ${testResult.success ? "text-emerald-400" : "text-red-400"}`}
              >
                {testResult.success ? `OK (${testResult.latency}ms)` : "Failed"}
              </div>
            )}
            <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-700/50">
              <span className="text-[10px] text-slate-400">Mode</span>
              {EXECUTION_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => updateConfig("executionMode", mode.id)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${config.executionMode === mode.id ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-slate-800/60 text-slate-400 border border-transparent"}`}
                >
                  {mode.name}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[10px] text-slate-400">Cloud fallback</span>
              <button
                onClick={() =>
                  updateConfig("fallbackToCloud", !config.fallbackToCloud)
                }
                className={`relative w-7 h-3.5 rounded-full transition-all ${config.fallbackToCloud ? "bg-cyan-500" : "bg-slate-600"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${config.fallbackToCloud ? "translate-x-3.5" : "translate-x-0"}`}
                />
              </button>
            </div>
            {connectionStatus === "disconnected" && (
              <a
                href="https://lmstudio.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
              >
                <DownloadIcon /> LM Studio <ExternalLinkIcon />
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
