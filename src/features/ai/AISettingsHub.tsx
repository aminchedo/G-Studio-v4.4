/**
 * AI Settings Hub - Enhanced Modern UI
 *
 * A stunning, modern settings panel with premium design:
 * - Glassmorphism effects and smooth gradients
 * - Refined animations and micro-interactions
 * - Professional color palette with depth
 * - Responsive and accessible
 *
 * @version 3.0.0 - Enhanced Modern UI
 */

import React, { useState, useEffect, useCallback } from "react";
import { AIConfig, DEFAULT_CONFIG, ModelInfo } from "./AISettingsHub/types";
import { ConnectionTab } from "./AISettingsHub/ConnectionTab";
import { ModelsTab } from "./AISettingsHub/ModelsTab";
import { APITestTab } from "./AISettingsHub/APITestTab";
import { BehaviorTab } from "./AISettingsHub/BehaviorTab";
import { VoiceInputTab } from "./AISettingsHub/VoiceInputTab";
import { VoiceOutputTab } from "./AISettingsHub/VoiceOutputTab";
import { LocalAITab } from "./AISettingsHub/LocalAITab";
import { ProvidersTab } from "./AISettingsHub/ProvidersTab";
import {
  isLikelyGeminiApiKey,
  normalizeGeminiApiKey,
} from "../../utils/geminiApiKey";

export type { AIConfig } from "./AISettingsHub/types";

// Premium SVG Icons
const KeyIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ZapIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FlaskIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 3h6v7l5 9a2 2 0 0 1-1.8 3H5.8a2 2 0 0 1-1.8-3l5-9V3Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BrainIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MicIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Volume2Icon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11 5 6 9H2v6h4l5 4V5z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CpuIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="4"
      y="4"
      width="16"
      height="16"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <rect
      x="9"
      y="9"
      width="6"
      height="6"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <path
      d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const XIcon = () => (
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
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

const SaveIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const RotateCcwIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

interface AISettingsHubProps {
  isOpen: boolean;
  onClose: () => void;
  config?: Partial<AIConfig>;
  onSave?: (config: AIConfig) => void;
  apiKey?: string;
}

type TabId =
  | "connection"
  | "models"
  | "providers"
  | "api-test"
  | "behavior"
  | "voice-input"
  | "voice-output"
  | "local";

const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.FC;
  description: string;
}> = [
  {
    id: "connection",
    label: "Connection",
    icon: KeyIcon,
    description: "API key and status",
  },
  {
    id: "models",
    label: "Models",
    icon: ZapIcon,
    description: "Model selection",
  },
  {
    id: "providers",
    label: "Providers",
    icon: SettingsIcon,
    description: "AI providers",
  },
  {
    id: "api-test",
    label: "API Test",
    icon: FlaskIcon,
    description: "Discover models",
  },
  {
    id: "behavior",
    label: "Behavior",
    icon: BrainIcon,
    description: "AI persona",
  },
  {
    id: "voice-input",
    label: "Voice In",
    icon: MicIcon,
    description: "Speech recognition",
  },
  {
    id: "voice-output",
    label: "Voice Out",
    icon: Volume2Icon,
    description: "Text to speech",
  },
  { id: "local", label: "Local AI", icon: CpuIcon, description: "LM Studio" },
];

export const AISettingsHub: React.FC<AISettingsHubProps> = ({
  isOpen,
  onClose,
  config = {},
  onSave = () => {},
  apiKey,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("connection");
  const [localConfig, setLocalConfig] = useState<AIConfig>({
    ...DEFAULT_CONFIG,
    ...config,
    ...(apiKey ? { apiKey } : {}),
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem("gstudio_ai_config");
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig) as Partial<AIConfig>;
        setLocalConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn("Failed to load saved config");
    }
  }, []);

  useEffect(() => {
    if (isOpen && config) {
      setLocalConfig((prev) => ({ ...prev, ...config }));
      setIsDirty(false);
      setSaveError(null);
    }
  }, [isOpen, config]);

  const updateConfig = useCallback(
    (key: keyof AIConfig, value: AIConfig[keyof AIConfig]) => {
      setLocalConfig((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaveError(null);
    const key = normalizeGeminiApiKey(localConfig.apiKey);
    if (key.length > 0 && !isLikelyGeminiApiKey(key)) {
      setSaveError(
        "API key format looks invalid. It should look like `AIza...`. Please paste a valid Google AI Studio key."
      );
      return;
    }
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      onSave({ ...localConfig, apiKey: key });
      localStorage.setItem(
        "gstudio_ai_config",
        JSON.stringify({ ...localConfig, apiKey: key })
      );
      setIsDirty(false);
      onClose();
    } catch (error) {
      console.error("Failed to save config:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to save. Try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [localConfig, onSave, onClose]);

  const handleReset = useCallback(() => {
    if (window.confirm("Reset all settings to defaults?")) {
      setLocalConfig(DEFAULT_CONFIG);
      setIsDirty(true);
    }
  }, []);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
      else if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleCancel, handleSave, isDirty]);

  if (!isOpen) return null;

  const tabColors: Record<
    TabId,
    { gradient: string; text: string; bg: string; border: string; glow: string }
  > = {
    connection: {
      gradient: "from-blue-500 via-blue-600 to-cyan-500",
      text: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/40",
      glow: "shadow-blue-500/25",
    },
    models: {
      gradient: "from-violet-500 via-purple-600 to-fuchsia-500",
      text: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/40",
      glow: "shadow-violet-500/25",
    },
    providers: {
      gradient: "from-pink-500 via-rose-600 to-red-500",
      text: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "border-pink-500/40",
      glow: "shadow-pink-500/25",
    },
    "api-test": {
      gradient: "from-emerald-500 via-teal-600 to-cyan-500",
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/40",
      glow: "shadow-emerald-500/25",
    },
    behavior: {
      gradient: "from-amber-500 via-orange-600 to-red-500",
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/40",
      glow: "shadow-amber-500/25",
    },
    "voice-input": {
      gradient: "from-rose-500 via-pink-600 to-purple-500",
      text: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/40",
      glow: "shadow-rose-500/25",
    },
    "voice-output": {
      gradient: "from-indigo-500 via-blue-600 to-cyan-500",
      text: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/40",
      glow: "shadow-indigo-500/25",
    },
    local: {
      gradient: "from-cyan-500 via-sky-600 to-blue-500",
      text: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/40",
      glow: "shadow-cyan-500/25",
    },
  };

  const currentTabColor = tabColors[activeTab];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Premium Backdrop with Blur */}
      <div
        className="absolute inset-0 backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95"
        onClick={handleCancel}
        style={{ animation: "modalFadeIn 0.3s ease-out" }}
      />

      {/* Premium Modal Container */}
      <div
        data-component="ai-settings-hub-enhanced"
        className="relative rounded-2xl shadow-2xl flex overflow-hidden border"
        style={{
          width: "900px",
          height: "640px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          borderColor: "rgba(139, 92, 246, 0.2)",
          animation: "modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 60px -15px rgba(139, 92, 246, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Enhanced Sidebar */}
        <div className="w-64 bg-gradient-to-b from-slate-900/95 via-slate-800/90 to-slate-900/95 border-r border-white/10 flex flex-col shrink-0 backdrop-blur-sm">
          {/* Header with Logo */}
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/30">
                <SettingsIcon />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">AI Settings</h2>
                <p className="text-xs text-slate-400">Configure your AI</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const c = tabColors[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group relative overflow-hidden ${
                    isActive
                      ? `${c.bg} border-l-4 ${c.border}`
                      : "border-l-4 border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {/* Animated Background Gradient */}
                  {isActive && (
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${c.gradient} opacity-10 animate-pulse`}
                      style={{ animationDuration: "3s" }}
                    />
                  )}

                  {/* Icon Container */}
                  <div
                    className={`relative z-10 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-br ${c.gradient} text-white shadow-lg ${c.glow}`
                        : "bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:scale-105"
                    }`}
                  >
                    <tab.icon />
                  </div>

                  {/* Label Container */}
                  <div className="relative z-10 flex-1 min-w-0">
                    <div
                      className={`text-sm font-semibold truncate transition-colors ${isActive ? c.text : "text-slate-300 group-hover:text-white"}`}
                    >
                      {tab.label}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {tab.description}
                    </div>
                  </div>

                  {/* Active Indicator */}
                  {isActive && (
                    <div
                      className={`relative z-10 w-2 h-2 rounded-full bg-gradient-to-br ${c.gradient} shadow-lg ${c.glow} animate-pulse`}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer with Reset Button */}
          <div className="p-3 border-t border-white/10">
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-all duration-200 group"
            >
              <RotateCcwIcon />
              <span>Reset All</span>
            </button>
          </div>
        </div>

        {/* Enhanced Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-slate-900/50 to-slate-800/50">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${currentTabColor.gradient} shadow-lg ${currentTabColor.glow}`}
              >
                {TABS.find((t) => t.id === activeTab)?.icon &&
                  React.createElement(
                    TABS.find((t) => t.id === activeTab)!.icon
                  )}
              </div>
              <div>
                <h3 className={`text-base font-bold ${currentTabColor.text}`}>
                  {TABS.find((t) => t.id === activeTab)?.label}
                </h3>
                <p className="text-xs text-slate-400">
                  {TABS.find((t) => t.id === activeTab)?.description}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all duration-200 group"
            >
              <XIcon />
            </button>
          </div>

          {/* Scrollable Content */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar"
            style={{ minHeight: 0 }}
          >
            <div
              key={activeTab}
              style={{ animation: "contentFadeIn 0.3s ease-out" }}
            >
              {activeTab === "connection" && (
                <ConnectionTab
                  config={localConfig}
                  updateConfig={updateConfig}
                />
              )}
              {activeTab === "models" && (
                <ModelsTab config={localConfig} updateConfig={updateConfig} />
              )}
              {activeTab === "providers" && (
                <ProvidersTab
                  config={localConfig}
                  updateConfig={updateConfig}
                />
              )}
              {activeTab === "api-test" && (
                <APITestTab config={localConfig} updateConfig={updateConfig} />
              )}
              {activeTab === "behavior" && (
                <BehaviorTab config={localConfig} updateConfig={updateConfig} />
              )}
              {activeTab === "voice-input" && (
                <VoiceInputTab
                  config={localConfig}
                  updateConfig={updateConfig}
                />
              )}
              {activeTab === "voice-output" && (
                <VoiceOutputTab
                  config={localConfig}
                  updateConfig={updateConfig}
                />
              )}
              {activeTab === "local" && (
                <LocalAITab config={localConfig} updateConfig={updateConfig} />
              )}
            </div>
          </div>

          {/* Enhanced Footer with Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${isDirty ? "bg-yellow-400 shadow-lg shadow-yellow-400/50" : "bg-emerald-400 shadow-lg shadow-emerald-400/50"}`}
              />
              <span
                className={`text-sm font-medium ${isDirty ? "text-yellow-400" : "text-emerald-400"}`}
              >
                {isDirty ? "Unsaved changes" : "All changes saved"}
              </span>
            </div>

            {/* Error Message */}
            {saveError && (
              <p
                className="text-sm text-red-400 absolute left-1/2 -translate-x-1/2"
                role="alert"
              >
                {saveError}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  isDirty && !isSaving
                    ? "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <SaveIcon />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CSS Animations and Styles */}
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
          from { 
            opacity: 0; 
            transform: translateY(30px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        
        @keyframes contentFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Custom Scrollbar Styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.6), rgba(167, 139, 250, 0.6));
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.8), rgba(167, 139, 250, 0.8));
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.6) rgba(15, 23, 42, 0.3);
        }
      `}</style>
    </div>
  );
};

export default AISettingsHub;
