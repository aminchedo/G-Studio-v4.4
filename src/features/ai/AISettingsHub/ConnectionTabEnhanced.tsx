/**
 * Connection Tab - Enhanced Modern UI
 *
 * Premium features:
 * - Glassmorphism card design
 * - Smooth gradient accents
 * - Enhanced visual hierarchy
 * - Polished micro-interactions
 * - Professional color scheme
 */

import React, { useState, useCallback } from "react";
import type { AIConfig } from "./types";
import { ModelTestingService } from "@/services/ai/modelTestingService";
import { ModelValidationStore } from "@/services/ai/modelValidationStore";
import { ModelSelectionService } from "@/services/ai/modelSelectionService";
import { isLikelyGeminiApiKey, normalizeGeminiApiKey } from "../../../utils/geminiApiKey";

// Premium SVG Icons
const KeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const CheckCircle2Icon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const Loader2Icon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const PlayCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const XCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" x2="9" y1="9" y2="15" />
    <line x1="9" x2="15" y1="9" y2="15" />
  </svg>
);

interface ConnectionTabEnhancedProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

type ConnectionState = "idle" | "testing" | "connected" | "error";
type DiscoveryState = "idle" | "discovering" | "completed" | "error";

export const ConnectionTabEnhanced: React.FC<ConnectionTabEnhancedProps> = ({ config, updateConfig }) => {
  const [showKey, setShowKey] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>("idle");
  const [discoveryProgress, setDiscoveryProgress] = useState({ current: 0, total: 0 });
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [latency, setLatency] = useState<number | null>(null);
  const discoveryCancelledRef = React.useRef(false);

  const CONNECTION_STATUS_KEY = "gstudio_connection_status";
  const CONNECTION_STATUS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Restore connection status and discovered models from localStorage on mount
  React.useEffect(() => {
    const apiKey = normalizeGeminiApiKey(config.apiKey);
    if (apiKey?.trim()) {
      try {
        const saved = localStorage.getItem(CONNECTION_STATUS_KEY);
        if (saved) {
          const data = JSON.parse(saved) as { status: "connected" | "error"; latency?: number; testedAt: number };
          if (data.testedAt && Date.now() - data.testedAt < CONNECTION_STATUS_MAX_AGE_MS) {
            setConnectionState(data.status);
            if (data.latency != null) setLatency(data.latency);
          }
        }
      } catch {}
      try {
        const modelsJson = localStorage.getItem("discovered_models");
        if (modelsJson) {
          const list = JSON.parse(modelsJson) as string[];
          if (Array.isArray(list) && list.length > 0) {
            setDiscoveredModels(list);
            setDiscoveryState("completed");
          }
        }
      } catch {}
    }
  }, [config.apiKey]);

  const persistConnectionStatus = useCallback((status: "connected" | "error", latencyMs: number | null) => {
    try {
      localStorage.setItem(CONNECTION_STATUS_KEY, JSON.stringify({ status, latency: latencyMs ?? undefined, testedAt: Date.now() }));
    } catch {}
  }, []);

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
        "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(apiKey),
        { method: "GET", headers: { "Content-Type": "application/json" }, signal: controller.signal }
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
      if (error.name === "TimeoutError" || error.name === "AbortError" || error.status === 0) {
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
      } catch {}

      setDiscoveredModels(result.modelIds);
      setDiscoveryState("completed");
      setDiscoveryProgress({ current: 1, total: 1 });

      localStorage.setItem("discovered_models", JSON.stringify(result.modelIds));
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

  const copyApiKey = useCallback(() => {
    if (config.apiKey) {
      navigator.clipboard.writeText(config.apiKey);
    }
  }, [config.apiKey]);

  return (
    <div className="space-y-5">
      {/* API Key Card - Premium Design */}
      <div className="group relative bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-800/60 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
        {/* Animated Gradient Border */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" style={{ animationDuration: "3s" }} />
        
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900/50 to-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/30">
              <KeyIcon />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">API Key</h3>
              <p className="text-xs text-slate-400">Your Google AI Studio API key</p>
            </div>
          </div>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-all duration-200 border border-purple-500/20"
          >
            <span>Get API key</span>
            <ExternalLinkIcon />
          </a>
        </div>

        {/* Input Section */}
        <div className="relative p-5">
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={config.apiKey}
              onChange={(e) => updateConfig("apiKey", e.target.value)}
              placeholder="Paste your API key here..."
              autoComplete="off"
              className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-5 py-3.5 pr-24 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 backdrop-blur-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={copyApiKey}
                disabled={!config.apiKey}
                className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Copy API key"
              >
                <CopyIcon />
              </button>
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all duration-200"
                title={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status Card - Premium Design */}
      <div className="relative bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-800/60 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900/50 to-slate-800/50">
          <div>
            <h3 className="text-sm font-bold text-white">Connection Status</h3>
            <p className="text-xs text-slate-400">Click "Test Connection" to verify your API key</p>
          </div>
          <button
            onClick={testConnection}
            disabled={connectionState === "testing" || !config.apiKey}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              connectionState === "testing" || !config.apiKey
                ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105"
            }`}
          >
            {connectionState === "testing" ? (
              <>
                <Loader2Icon />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <PlayCircleIcon />
                <span>Test Connection</span>
              </>
            )}
          </button>
        </div>

        {/* Status Display */}
        <div className="p-5">
          <div
            className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-all duration-300 ${
              connectionState === "connected"
                ? "bg-emerald-500/10 border-emerald-500/30"
                : connectionState === "error"
                  ? "bg-red-500/10 border-red-500/30"
                  : connectionState === "testing"
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-slate-800/60 border-slate-600/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  connectionState === "connected"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : connectionState === "error"
                      ? "bg-red-500/20 text-red-400"
                      : connectionState === "testing"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-slate-700/50 text-slate-400"
                }`}
              >
                {connectionState === "testing" && <Loader2Icon />}
                {connectionState === "connected" && <CheckCircle2Icon />}
                {connectionState === "error" && <AlertCircleIcon />}
                {connectionState === "idle" && <div className="w-3 h-3 rounded-full bg-slate-500 animate-pulse" />}
              </div>
              <div>
                <div
                  className={`text-sm font-bold ${
                    connectionState === "connected"
                      ? "text-emerald-400"
                      : connectionState === "error"
                        ? "text-red-400"
                        : connectionState === "testing"
                          ? "text-purple-400"
                          : "text-slate-400"
                  }`}
                >
                  {connectionState === "connected" && "Connected Successfully"}
                  {connectionState === "error" && "Connection Failed"}
                  {connectionState === "testing" && "Testing Connection"}
                  {connectionState === "idle" && "Not tested"}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {connectionState === "connected" && latency != null && `Response time: ${latency}ms`}
                  {connectionState === "error" && errorMessage}
                  {connectionState === "idle" && "Click Test Connection to verify your API key"}
                  {connectionState === "testing" && "Verifying API key..."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Discovery Card - Premium Design */}
      <div className="relative bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-800/60 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900/50 to-slate-800/50">
          <div>
            <h3 className="text-sm font-bold text-white">Model Discovery</h3>
            <p className="text-xs text-slate-400">Find available models for your API key</p>
          </div>
          <div className="flex items-center gap-2">
            {discoveryState === "discovering" && (
              <button
                onClick={cancelDiscovery}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all duration-200"
              >
                <XCircleIcon />
                <span>Cancel</span>
              </button>
            )}
            <button
              onClick={discoverModels}
              disabled={discoveryState === "discovering" || !config.apiKey}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                discoveryState === "discovering" || !config.apiKey
                  ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105"
              }`}
            >
              {discoveryState === "discovering" ? (
                <>
                  <Loader2Icon />
                  <span>Discovering...</span>
                </>
              ) : (
                <>
                  <SearchIcon />
                  <span>Discover Models</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Discovery Results */}
        <div className="p-5 space-y-3">
          {(discoveryState === "completed" || discoveryState === "idle") && discoveredModels.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
              <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2Icon />
                <span className="text-sm font-bold text-emerald-400">
                  {discoveredModels.length} model{discoveredModels.length !== 1 ? "s" : ""} found
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {discoveredModels.map((m) => (
                    <div
                      key={m}
                      className="px-3 py-2 bg-slate-900/80 rounded-lg text-xs text-slate-300 font-mono border border-slate-600/30 hover:border-emerald-500/30 transition-all duration-200"
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {discoveryState === "discovering" && (
            <div className="flex items-center gap-3 px-4 py-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Loader2Icon />
              <span className="text-sm text-purple-400 font-medium">Scanning API for available models...</span>
            </div>
          )}

          {discoveryState === "error" && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertCircleIcon />
              <span className="text-sm text-red-400 font-medium">{errorMessage}</span>
            </div>
          )}

          {discoveryState === "idle" && discoveredModels.length === 0 && (
            <div className="text-center py-6 text-slate-400">
              <p className="text-sm">Click <span className="font-semibold text-emerald-400">Discover Models</span> to scan for available models</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.6), rgba(5, 150, 105, 0.6));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.8));
        }
      `}</style>
    </div>
  );
};
