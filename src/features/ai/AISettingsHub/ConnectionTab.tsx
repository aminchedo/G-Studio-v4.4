/**
 * Connection Tab - API Key Management and Connection Testing
 *
 * Features:
 * - Secure API key input with show/hide toggle
 * - Connection testing with status indicator
 * - Model discovery with progress
 * - API quota information
 */

import React, { useState, useCallback } from "react";
import type { AIConfig } from "./types";
import { ModelTestingService } from "@/services/ai/modelTestingService";
import { ModelValidationStore } from "@/services/ai/modelValidationStore";
import { ModelSelectionService } from "@/services/ai/modelSelectionService";
import {
  isLikelyGeminiApiKey,
  normalizeGeminiApiKey,
} from "../../../utils/geminiApiKey";

// SVG Icons as components
const KeyIcon = () => (
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
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const EyeIcon = () => (
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
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
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
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
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

const SearchIcon = () => (
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
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
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

const CopyIcon = () => (
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
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

interface ConnectionTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

type ConnectionState = "idle" | "testing" | "connected" | "error";
type DiscoveryState = "idle" | "discovering" | "completed" | "error";

export const ConnectionTab: React.FC<ConnectionTabProps> = ({
  config,
  updateConfig,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>("idle");
  const [discoveryProgress, setDiscoveryProgress] = useState({
    current: 0,
    total: 0,
  });
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [latency, setLatency] = useState<number | null>(null);
  const discoveryCancelledRef = React.useRef(false);
  const DISCOVERY_TIMEOUT_MS = 90000; // 90s max so scan never gets stuck

  const CONNECTION_STATUS_KEY = "gstudio_connection_status";
  const CONNECTION_STATUS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Restore connection status and discovered models from localStorage on mount
  React.useEffect(() => {
    const apiKey = normalizeGeminiApiKey(config.apiKey);
    if (apiKey?.trim()) {
      try {
        const saved = localStorage.getItem(CONNECTION_STATUS_KEY);
        if (saved) {
          const data = JSON.parse(saved) as {
            status: "connected" | "error";
            latency?: number;
            testedAt: number;
          };
          if (
            data.testedAt &&
            Date.now() - data.testedAt < CONNECTION_STATUS_MAX_AGE_MS
          ) {
            setConnectionState(data.status);
            if (data.latency != null) setLatency(data.latency);
          }
        }
      } catch {
        // ignore
      }
      try {
        const modelsJson = localStorage.getItem("discovered_models");
        if (modelsJson) {
          const list = JSON.parse(modelsJson) as string[];
          if (Array.isArray(list) && list.length > 0) {
            setDiscoveredModels(list);
            setDiscoveryState("completed");
          }
        }
      } catch {
        // ignore
      }
    }
  }, [config.apiKey]);

  // Persist connection status when test succeeds or fails
  const persistConnectionStatus = useCallback(
    (status: "connected" | "error", latencyMs: number | null) => {
      try {
        localStorage.setItem(
          CONNECTION_STATUS_KEY,
          JSON.stringify({
            status,
            latency: latencyMs ?? undefined,
            testedAt: Date.now(),
          }),
        );
      } catch {
        // ignore
      }
    },
    [],
  );

  // Test API connection
  const testConnection = useCallback(async () => {
    const apiKey = normalizeGeminiApiKey(config.apiKey);
    if (!apiKey) {
      setErrorMessage("Please enter an API key first");
      setConnectionState("error");
      return;
    }
    if (!isLikelyGeminiApiKey(apiKey)) {
      setErrorMessage("API key format looks invalid (expected `AIza...`).");
      setConnectionState("error");
      return;
    }

    setConnectionState("testing");
    setErrorMessage("");
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?key=" +
          encodeURIComponent(apiKey),
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        },
      );
      window.clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      setLatency(responseTime);
      if (response.status === 200) {
        setConnectionState("connected");
        persistConnectionStatus("connected", responseTime);
      } else {
        setConnectionState("error");
        persistConnectionStatus("error", responseTime);
        if (response.status === 401 || response.status === 403) {
          setErrorMessage("Invalid API key");
        } else if (response.status === 429) {
          setErrorMessage("Rate limited - please wait");
        } else {
          setErrorMessage(`Error: HTTP ${response.status}`);
        }
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      setLatency(responseTime);
      setConnectionState("error");
      persistConnectionStatus("error", responseTime);
      if (
        error.name === "TimeoutError" ||
        error.name === "AbortError" ||
        error.status === 0
      ) {
        setErrorMessage("Connection timeout");
      } else if (error.status === 401 || error.status === 403) {
        setErrorMessage("Invalid API key");
      } else if (error.status === 429) {
        setErrorMessage("Rate limited - please wait");
      } else {
        setErrorMessage(error.message || "Connection failed");
      }
    }
  }, [config.apiKey, persistConnectionStatus]);

  // Discover available models via fast list API (same as simple HTML checker — 1–3s, no per-model probe)
  const discoverModels = useCallback(async () => {
    const apiKey = normalizeGeminiApiKey(config.apiKey);
    if (!apiKey) {
      setErrorMessage("Please enter an API key first");
      return;
    }
    if (!isLikelyGeminiApiKey(apiKey)) {
      setErrorMessage("API key format looks invalid (expected `AIza...`).");
      setDiscoveryState("error");
      return;
    }

    discoveryCancelledRef.current = false;
    setDiscoveryState("discovering");
    setDiscoveredModels([]);
    setErrorMessage("");
    setDiscoveryProgress({ current: 1, total: 1 });

    try {
      const result = await ModelTestingService.quickListModels(apiKey);
      if (discoveryCancelledRef.current) return;

      if (!result.valid || !result.modelIds) {
        setDiscoveryState("error");
        setErrorMessage(result.error || "Failed to list models");
        return;
      }

      ModelTestingService.setValidatedModelsFromList(apiKey, result.modelIds);

      try {
        ModelSelectionService.revalidateAgainstStore(apiKey);
      } catch {
        // Best-effort only
      }

      setDiscoveredModels(result.modelIds);
      setDiscoveryState("completed");
      setDiscoveryProgress({ current: 1, total: 1 });

      localStorage.setItem(
        "discovered_models",
        JSON.stringify(result.modelIds),
      );
      localStorage.setItem("models_discovered_at", Date.now().toString());

      if (result.modelIds.length === 0) {
        setErrorMessage("No generateContent models found for this key.");
      }
    } catch (error: any) {
      if (discoveryCancelledRef.current) return;
      setDiscoveryState("error");
      setErrorMessage(error.message || "Discovery failed");
    }
  }, [config.apiKey]);

  const cancelDiscovery = useCallback(() => {
    discoveryCancelledRef.current = true;
    setDiscoveryState("idle");
    setDiscoveryProgress({ current: 0, total: 0 });
  }, []);

  // Mask API key for display
  const maskApiKey = (key: string) => {
    if (!key) return "";
    if (key.length <= 8) return "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢";
    return key.slice(0, 4) + "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" + key.slice(-4);
  };

  // Copy API key
  const copyApiKey = useCallback(() => {
    if (config.apiKey) {
      navigator.clipboard.writeText(config.apiKey);
    }
  }, [config.apiKey]);

  return (
    <div className="space-y-2">
      {/* API Key + Connection + Discovery: one column, compact */}
      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold text-white">API Key</h3>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
          >
            Get key <ExternalLinkIcon />
          </a>
        </div>
        <div className="p-2 relative">
          <input
            type={showKey ? "text" : "password"}
            value={config.apiKey}
            onChange={(e) => updateConfig("apiKey", e.target.value)}
            placeholder="Paste API key..."
            autoComplete="off"
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 pr-14 text-[11px] font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            style={{ color: "#f1f5f9" }}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button
              onClick={copyApiKey}
              className="p-1 text-slate-400 hover:text-purple-400 rounded"
              title="Copy"
            >
              <CopyIcon />
            </button>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-1 text-slate-400 hover:text-purple-400 rounded"
              title={showKey ? "Hide" : "Show"}
            >
              {showKey ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
      </section>

      {/* Connection Status + Test + Discover row */}
      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold text-white">
            Connection &amp; discovery
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={testConnection}
              disabled={connectionState === "testing" || !config.apiKey}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium ${
                connectionState === "testing" || !config.apiKey
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-500"
              }`}
            >
              {connectionState === "testing" ? <LoaderIcon /> : <PlayIcon />}
              Test
            </button>
            {discoveryState === "discovering" && (
              <button
                onClick={cancelDiscovery}
                className="px-2 py-1 rounded text-[9px] bg-slate-600 text-slate-200"
              >
                Cancel
              </button>
            )}
            <button
              onClick={discoverModels}
              disabled={discoveryState === "discovering" || !config.apiKey}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium ${
                discoveryState === "discovering" || !config.apiKey
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {discoveryState === "discovering" ? (
                <LoaderIcon />
              ) : (
                <SearchIcon />
              )}
              {discoveryState === "discovering" ? "Scanning…" : "Discover"}
            </button>
          </div>
        </div>
        <div className="p-2 space-y-1.5">
          <div
            className={`flex items-center gap-2 px-2 py-1.5 rounded border text-[10px] ${
              connectionState === "connected"
                ? "bg-emerald-500/10 border-emerald-500/30"
                : connectionState === "error"
                  ? "bg-red-500/10 border-red-500/30"
                  : connectionState === "testing"
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-slate-800/80 border-slate-600/50"
            }`}
          >
            <span
              className={`shrink-0 ${connectionState === "connected" ? "text-emerald-400" : connectionState === "error" ? "text-red-400" : connectionState === "testing" ? "text-purple-400" : "text-slate-400"}`}
            >
              {connectionState === "testing" && <LoaderIcon />}
              {connectionState === "connected" && "✓ Verified"}
              {connectionState === "error" && "✗ Failed"}
              {connectionState === "idle" && "○ Not tested"}
            </span>
            <span className="text-slate-400 truncate">
              {connectionState === "connected" &&
                latency != null &&
                `Latency: ${latency}ms`}
              {connectionState === "error" && errorMessage}
              {connectionState === "idle" && "Test to verify key"}
            </span>
          </div>
          {/* Model count + list after discovery */}
          {(discoveryState === "completed" || discoveryState === "idle") &&
            discoveredModels.length > 0 && (
              <div className="rounded border border-slate-600/50 bg-slate-800/60 px-2 py-1.5">
                <div className="text-[10px] text-emerald-400 font-medium mb-1 flex items-center gap-1">
                  <CheckCircleIcon /> {discoveredModels.length} model
                  {discoveredModels.length !== 1 ? "s" : ""} found
                </div>
                <div
                  className="grid grid-cols-3 gap-1 max-h-20 overflow-y-auto"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {discoveredModels.slice(0, 15).map((m) => (
                    <div
                      key={m}
                      className="px-1.5 py-0.5 bg-slate-900 rounded text-[9px] text-slate-300 truncate font-mono"
                    >
                      {m}
                    </div>
                  ))}
                </div>
                {discoveredModels.length > 15 && (
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    +{discoveredModels.length - 15} more
                  </p>
                )}
              </div>
            )}
          {discoveryState === "discovering" && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <LoaderIcon /> Scanning API for models…
            </div>
          )}
          {discoveryState === "error" && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400">
              <AlertCircleIcon /> {errorMessage}
            </div>
          )}
          {discoveryState === "idle" && discoveredModels.length === 0 && (
            <p className="text-[10px] text-slate-500">
              Click Discover to list models for your key.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
