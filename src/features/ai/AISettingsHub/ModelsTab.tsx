/**
 * Models Tab - Model Selection and Parameters
 *
 * Features:
 * - Auto/Manual model selection mode
 * - Model list with family grouping
 * - Temperature, max tokens, and other parameters
 * - Per-agent model assignment
 */

import React, { useState, useEffect, useCallback } from "react";
import type { AIConfig } from "./types";
import { ModelSelectionService } from "@/services/ai/modelSelectionService";
import { ModelValidationStore } from "@/services/ai/modelValidationStore";
import type { ModelInfo as ValidatedModelInfo } from "@/services/ai/modelInfo";

// High-Quality SVG Icons
const ZapIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const SparklesIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const SlidersIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" x2="4" y1="21" y2="14" />
    <line x1="4" x2="4" y1="10" y2="3" />
    <line x1="12" x2="12" y1="21" y2="12" />
    <line x1="12" x2="12" y1="8" y2="3" />
    <line x1="20" x2="20" y1="21" y2="16" />
    <line x1="20" x2="20" y1="12" y2="3" />
    <line x1="2" x2="6" y1="14" y2="14" />
    <line x1="10" x2="14" y1="8" y2="8" />
    <line x1="18" x2="22" y1="16" y2="16" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const BrainIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54Z" />
  </svg>
);

const CodeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const SearchCodeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 9-2 2 2 2" />
    <path d="m13 13 2-2-2-2" />
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const PaletteIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

interface ModelsTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

/**
 * Model list is sourced from `ModelValidationStore` (single source of truth).
 * Run the API Model Test first to populate validated models for this API key.
 */

const AGENTS = [
  {
    id: "coder",
    name: "Coder Agent",
    description: "Code generation",
    color: "from-violet-500 to-purple-600",
    Icon: CodeIcon,
  },
  {
    id: "reviewer",
    name: "Reviewer Agent",
    description: "Code review",
    color: "from-blue-500 to-cyan-600",
    Icon: SearchCodeIcon,
  },
  {
    id: "tester",
    name: "Tester Agent",
    description: "Test generation",
    color: "from-amber-500 to-orange-600",
    Icon: BrainIcon,
  },
  {
    id: "creative",
    name: "Creative Agent",
    description: "UI/UX design",
    color: "from-rose-500 to-pink-600",
    Icon: PaletteIcon,
  },
];

export const ModelsTab: React.FC<ModelsTabProps> = ({
  config,
  updateConfig,
}) => {
  const [agentModels, setAgentModels] = useState<Record<string, string>>({});
  const [availableModels, setAvailableModels] = useState<ValidatedModelInfo[]>(
    [],
  );

  // Load validated models for this API key
  useEffect(() => {
    const apiKey = config.apiKey?.trim() ?? "";
    if (!apiKey) {
      setAvailableModels([]);
      return;
    }
    try {
      setAvailableModels(ModelValidationStore.getValidatedModelInfos(apiKey));
    } catch (e) {
      console.warn("[ModelsTab] Failed to load validated models:", e);
      setAvailableModels([]);
    }
  }, [config.apiKey]);

  const handleSelectionModeChange = useCallback(
    (mode: "auto" | "manual") => {
      updateConfig("selectionMode", mode);
      const apiKey = config.apiKey?.trim() ?? "";
      if (!apiKey) return;
      try {
        ModelSelectionService.setSelectionMode(apiKey, mode);
      } catch (e) {
        console.warn("[ModelsTab] Failed to set selection mode:", e);
      }
    },
    [config.apiKey, updateConfig],
  );

  const handleManualModelSelect = useCallback(
    (modelId: string) => {
      updateConfig("selectedModel", modelId as any);
      const apiKey = config.apiKey?.trim() ?? "";
      if (!apiKey) return;
      try {
        ModelSelectionService.setManualModel(apiKey, modelId);
      } catch (e) {
        console.warn("[ModelsTab] Failed to set manual model:", e);
      }
    },
    [config.apiKey, updateConfig],
  );

  // Load agent model assignments from localStorage
  useEffect(() => {
    const saved: Record<string, string> = {};
    AGENTS.forEach((agent) => {
      const model = localStorage.getItem(`agent_model_${agent.id}`);
      if (model) saved[agent.id] = model;
    });
    setAgentModels(saved);
  }, []);

  // Handle agent model change
  const handleAgentModelChange = useCallback(
    (agentId: string, modelId: string) => {
      setAgentModels((prev) => ({ ...prev, [agentId]: modelId }));
      localStorage.setItem(`agent_model_${agentId}`, modelId);
    },
    [],
  );

  // Get family badge color
  const getFamilyColor = (family: string) => {
    switch (family) {
      case "flash":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white";
      case "pro":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
      case "lite":
        return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white";
      case "normal":
        return "bg-gradient-to-r from-amber-500 to-orange-500 text-white";
      case "others":
      case "experimental":
        return "bg-gradient-to-r from-amber-500 to-orange-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  return (
    <div className="space-y-2">
      {/* Selection Mode - compact dark */}
      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60">
          <h3 className="text-[10px] font-semibold text-white">
            Selection mode
          </h3>
        </div>
        <div className="p-2 grid grid-cols-2 gap-1.5">
          <button
            onClick={() => handleSelectionModeChange("auto")}
            className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
              config.selectionMode === "auto"
                ? "bg-violet-500/20 border-violet-500/40"
                : "bg-slate-800/60 border-slate-600/50 hover:border-slate-500"
            }`}
          >
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${config.selectionMode === "auto" ? "bg-violet-500 text-white" : "bg-slate-700 text-slate-400"}`}
            >
              <ZapIcon />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-slate-200">Auto</div>
              <div className="text-[9px] text-slate-500 truncate">
                Best model per task
              </div>
            </div>
            {config.selectionMode === "auto" && (
              <div className="w-3.5 h-3.5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                <CheckIcon />
              </div>
            )}
          </button>
          <button
            onClick={() => handleSelectionModeChange("manual")}
            className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
              config.selectionMode === "manual"
                ? "bg-violet-500/20 border-violet-500/40"
                : "bg-slate-800/60 border-slate-600/50 hover:border-slate-500"
            }`}
          >
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${config.selectionMode === "manual" ? "bg-violet-500 text-white" : "bg-slate-700 text-slate-400"}`}
            >
              <SlidersIcon />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-slate-200">
                Manual
              </div>
              <div className="text-[9px] text-slate-500 truncate">
                Choose model
              </div>
            </div>
            {config.selectionMode === "manual" && (
              <div className="w-3.5 h-3.5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                <CheckIcon />
              </div>
            )}
          </button>
        </div>
      </section>

      {config.selectionMode === "manual" && (
        <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-slate-700/60">
            <h3 className="text-[10px] font-semibold text-white">Model</h3>
          </div>
          <div className="p-2">
            {availableModels.length === 0 ? (
              <p className="text-[10px] text-slate-500">
                Run API Test first to list models.
              </p>
            ) : (
              <select
                value={config.selectedModel ?? ""}
                onChange={(e) => handleManualModelSelect(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>
      )}

      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60">
          <h3 className="text-[10px] font-semibold text-white">Agents</h3>
        </div>
        <div className="p-2 space-y-1">
          {AGENTS.map((agent) => (
            <div key={agent.id} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded bg-gradient-to-br ${agent.color} flex items-center justify-center text-white shrink-0`}
              >
                <agent.Icon />
              </div>
              <span className="text-[10px] text-slate-300 w-20 truncate">
                {agent.name}
              </span>
              <select
                value={agentModels[agent.id] || ""}
                onChange={(e) =>
                  handleAgentModelChange(agent.id, e.target.value)
                }
                className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-[9px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="">Auto</option>
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60">
          <h3 className="text-[10px] font-semibold text-white">Parameters</h3>
        </div>
        <div className="p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-400 w-16 shrink-0">
              Temp
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature ?? 0.7}
              onChange={(e) =>
                updateConfig("temperature", parseFloat(e.target.value))
              }
              className="flex-1 h-1.5 rounded accent-violet-500 bg-slate-700"
            />
            <span className="text-[9px] text-slate-400 w-6">
              {(config.temperature ?? 0.7).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-400 w-16 shrink-0">
              Max tokens
            </label>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={config.maxTokens ?? 2048}
              onChange={(e) =>
                updateConfig("maxTokens", parseInt(e.target.value))
              }
              className="flex-1 h-1.5 rounded accent-violet-500 bg-slate-700"
            />
            <span className="text-[9px] text-slate-400 w-8">
              {(config.maxTokens ?? 2048).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-400 w-16 shrink-0">
              Top P
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.topP ?? 1.0}
              onChange={(e) => updateConfig("topP", parseFloat(e.target.value))}
              className="flex-1 h-1.5 rounded accent-violet-500 bg-slate-700"
            />
            <span className="text-[9px] text-slate-400 w-6">
              {(config.topP ?? 1.0).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] text-slate-400">Streaming</span>
            <button
              onClick={() =>
                updateConfig("enableStreaming", !config.enableStreaming)
              }
              className={`relative w-8 h-4 rounded-full transition-all ${config.enableStreaming ? "bg-violet-500" : "bg-slate-600"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${config.enableStreaming ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
