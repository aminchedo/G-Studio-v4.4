/**
 * AI Settings Hub - Unified AI Configuration Center
 *
 * A polished, dark-themed settings panel with 7 tabs:
 * - Connection: API key and connection testing
 * - Models: Model selection and parameters
 * - API Test: Model discovery and benchmarking
 * - Behavior: AI persona and response style
 * - Voice Input: Speech recognition settings
 * - Voice Output: Text-to-speech settings
 * - Local AI: LM Studio integration
 *
 * @version 2.2.0
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

// High-quality Colorful SVG Icons
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
    <path
      d="M9 3h6"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
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
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-all duration-300"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const XIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-all duration-300"
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
    className="transition-all duration-300"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const RotateCcwIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-all duration-300"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-all duration-300 ${className || ""}`}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

interface AISettingsHubProps {
  isOpen: boolean;
  onClose: () => void;
  config?: Partial<AIConfig>;
  onSave?: (config: AIConfig) => void;
  /** Optional convenience: prefill apiKey */
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

  // Load saved config from localStorage on mount
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && config) {
      setLocalConfig((prev) => ({ ...prev, ...config }));
      setIsDirty(false);
      setSaveError(null);
    }
  }, [isOpen, config]);

  // Update config
  const updateConfig = useCallback(
    (key: keyof AIConfig, value: AIConfig[keyof AIConfig]) => {
      setLocalConfig((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
    },
    [],
  );

  // Save handler (with validation: prevent invalid API key submission)
  const handleSave = useCallback(async () => {
    setSaveError(null);
    const key = normalizeGeminiApiKey(localConfig.apiKey);
    if (key.length > 0 && !isLikelyGeminiApiKey(key)) {
      setSaveError(
        "API key format looks invalid. It should look like `AIza...`. Please paste a valid Google AI Studio key.",
      );
      return;
    }
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      onSave({ ...localConfig, apiKey: key });
      localStorage.setItem(
        "gstudio_ai_config",
        JSON.stringify({ ...localConfig, apiKey: key }),
      );
      setIsDirty(false);
      onClose();
    } catch (error) {
      console.error("Failed to save config:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to save. Try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [localConfig, onSave, onClose]);

  // Reset handler
  const handleReset = useCallback(() => {
    if (window.confirm("Reset all settings to defaults?")) {
      setLocalConfig(DEFAULT_CONFIG);
      setIsDirty(true);
    }
  }, []);

  // Cancel handler - No confirmation dialog
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleCancel, handleSave, isDirty]);

  if (!isOpen) return null;

  // Tab color schemes - distinct colors for each tab
  const tabColors: Record<
    TabId,
    { gradient: string; text: string; bg: string; border: string; glow: string }
  > = {
    connection: {
      gradient: "from-blue-500 to-cyan-600",
      text: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      glow: "shadow-blue-500/20",
    },
    models: {
      gradient: "from-violet-500 to-purple-600",
      text: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/30",
      glow: "shadow-violet-500/20",
    },
    providers: {
      gradient: "from-pink-500 to-rose-600",
      text: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "border-pink-500/30",
      glow: "shadow-pink-500/20",
    },
    "api-test": {
      gradient: "from-emerald-500 to-teal-600",
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      glow: "shadow-emerald-500/20",
    },
    behavior: {
      gradient: "from-amber-500 to-orange-600",
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      glow: "shadow-amber-500/20",
    },
    "voice-input": {
      gradient: "from-rose-500 to-pink-600",
      text: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      glow: "shadow-rose-500/20",
    },
    "voice-output": {
      gradient: "from-indigo-500 to-blue-600",
      text: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      glow: "shadow-indigo-500/20",
    },
    local: {
      gradient: "from-cyan-500 to-sky-600",
      text: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      glow: "shadow-cyan-500/20",
    },
  };

  const currentTabColor = tabColors[activeTab];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dark Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md bg-black/50"
        onClick={handleCancel}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />

      {/* Modal - minimal (features/ai AISettingsHub) */}
      <div
        data-component="ai-settings-hub"
        data-version="compact"
        className="relative rounded-lg shadow-xl flex overflow-hidden border border-white/10"
        style={{
          width: "720px",
          height: "520px",
          background: "#1E1E2E",
          animation:
            "fadeIn 0.2s ease-out, slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Sidebar - minimal */}
        <div className="w-32 bg-slate-900/90 border-r border-white/10 flex flex-col shrink-0">
          <div className="px-2 py-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded flex items-center justify-center text-white bg-gradient-to-br from-violet-500 to-purple-600">
                <SettingsIcon />
              </div>
              <span className="text-[10px] font-bold text-white">
                AI Settings
              </span>
            </div>
          </div>
          <nav className="flex-1 p-1 space-y-0.5 overflow-y-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const c = tabColors[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-all duration-200 group relative border-l-2 ${
                    isActive
                      ? `${c.bg} ${c.border}`
                      : "border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all ${
                      isActive
                        ? `bg-gradient-to-br ${c.gradient} text-white`
                        : "bg-slate-700/50 text-slate-400 group-hover:opacity-90"
                    }`}
                  >
                    <tab.icon />
                  </div>
                  <span
                    className={`text-[10px] font-medium truncate ${isActive ? c.text : "text-slate-300"}`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="p-2 border-t border-white/10">
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-md text-[10px] font-medium"
            >
              <RotateCcwIcon />
              Reset
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1E1E2E]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <h3 className={`text-xs font-semibold ${currentTabColor.text}`}>
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
            >
              <XIcon />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden p-2.5"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(148, 163, 184, 0.2) transparent",
              minHeight: 0,
            }}
          >
            <div
              key={activeTab}
              style={{
                animation: "fadeInContent 0.2s ease-out",
              }}
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

          <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-slate-900/50">
            <span className="text-[10px]">
              {isDirty ? (
                <span className="text-amber-400 font-medium">Unsaved</span>
              ) : (
                <span className="text-emerald-400/80">Saved</span>
              )}
            </span>
            {saveError && (
              <p
                className="text-[10px] text-amber-400 absolute left-3"
                role="alert"
              >
                {saveError}
              </p>
            )}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-2.5 py-1 text-[10px] font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-semibold transition-all ${
                  isDirty && !isSaving
                    ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-purple-500/20"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                }`}
              >
                {isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.97); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        @keyframes fadeInContent {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        /* Minimal scrollbar */
        div::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 2px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
    </div>
  );
};

export default AISettingsHub;
