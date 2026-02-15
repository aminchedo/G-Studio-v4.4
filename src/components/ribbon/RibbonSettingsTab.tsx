import React, { useState, useEffect, useMemo } from "react";
import {
  Key,
  Mic,
  UserCog,
  Trash2,
  BrainCircuit,
  Gauge,
  Zap,
  FlaskConical,
  Clock,
  CheckCircle2,
  TrendingUp,
  Globe,
  Bell,
  ChevronDown,
} from "lucide-react";
import { ModelId } from "@/types";
import { SUPPORTED_MODELS } from "@/constants";
import { SecurityIcon } from "@/components/icons";
import {
  RibbonGroup,
  RibbonDivider,
  RibbonButton,
  AgentTile,
} from "./RibbonComponents";
import { ModelValidationStore } from "@/services/modelValidationStore";
import { ModelSelectionService } from "@/services/modelSelectionService";
import {
  ModelInfo,
  ModelFamily,
  selectBestDefaultModel,
} from "@/services/modelInfo";
// Removed: import GeminiTesterPro from '../ultimate-gemini-tester';

/**
 * Get family badge configuration for visual display
 */
function getFamilyBadge(
  family: ModelFamily,
): { label: string; className: string } | null {
  switch (family) {
    case "flash":
      return { label: "FLASH", className: "badge badge-flash" };
    case "pro":
      return { label: "PRO", className: "badge badge-pro" };
    case "normal":
      return { label: "NORMAL", className: "badge badge-normal" };
    default:
      return null;
  }
}

interface RibbonSettingsTabProps {
  isExpanded: boolean;
  selectedModel: ModelId;
  onSelectModel: (id: ModelId) => void;
  onManageApiKey: () => void;
  onChangeVoice: () => void;
  onChangePersonality: () => void;
  onClearChat: () => void;
  onTriggerTool: (action: string) => void;
  agentConfig?: { apiKey: string; voice: string; persona: string };
  onOpenGeminiTester?: () => void; // Add this prop
}

export const RibbonSettingsTab: React.FC<RibbonSettingsTabProps> = ({
  isExpanded,
  selectedModel,
  onSelectModel,
  onManageApiKey,
  onChangeVoice,
  onChangePersonality,
  onClearChat,
  onTriggerTool,
  agentConfig,
  onOpenGeminiTester, // Add this
}) => {
  // Get discovered usable models (SINGLE SOURCE OF TRUTH)
  const [validatedModels, setValidatedModels] = useState<ModelInfo[]>([]);
  const [activeModel, setActiveModel] = useState<ModelInfo | null>(null);
  const [selectionMode, setSelectionMode] = useState<"auto" | "manual">("auto");
  // Remove local state - use parent's state via callback
  // const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [settings, setSettings] = useState({
    language: "English",
    notifications: true,
  });

  // Refresh models and active model from store
  const refreshFromStore = () => {
    if (!agentConfig?.apiKey) return;

    const models = ModelValidationStore.getValidatedModelInfos(
      agentConfig.apiKey,
    );
    setValidatedModels(models);

    // Get active model ID from service (CONTRACT API)
    const activeModelId = ModelSelectionService.getActiveModel(
      agentConfig.apiKey,
    );
    if (activeModelId) {
      const model = models.find((m) => m.id === activeModelId);
      setActiveModel(model || null);
    } else {
      setActiveModel(null);
    }

    // Get selection mode from service (CONTRACT API)
    const mode = ModelSelectionService.getSelectionMode(agentConfig.apiKey);
    setSelectionMode(mode);
  };

  useEffect(() => {
    refreshFromStore();

    // Initialize active model if defaults are loaded but no active model is set
    if (agentConfig?.apiKey) {
      const models = ModelValidationStore.getValidatedModelInfos(
        agentConfig.apiKey,
      );
      const activeModelId = ModelSelectionService.getActiveModel(
        agentConfig.apiKey,
      );

      // If we have default models but no active model, initialize it
      if (models.length > 0 && !activeModelId) {
        ModelSelectionService.revalidateAgainstStore(agentConfig.apiKey);
      }
    }

    // Listen for store updates (when models are discovered)
    const interval = setInterval(() => {
      refreshFromStore();
    }, 1000); // Poll every second for updates

    // Load settings from localStorage
    try {
      const savedSettings = localStorage.getItem("gstudio_app_settings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.warn("Failed to load settings:", e);
    }

    return () => clearInterval(interval);
  }, [agentConfig?.apiKey]);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      localStorage.setItem("gstudio_app_settings", JSON.stringify(newSettings));
    } catch (e) {
      console.warn("Failed to save settings:", e);
    }
  };

  // Categorize models by family (4 fixed categories: Flash, Pro, Normal, Others)
  // Use contract method getModelsByFamily for consistency
  // CONTRACT GUARANTEE: Service always returns initialized arrays, never undefined
  const modelCategories = useMemo(() => {
    // Initialize with guaranteed shape (prevents undefined during initialization)
    const defaultShape = {
      flash: [] as ModelInfo[],
      pro: [] as ModelInfo[],
      normal: [] as ModelInfo[],
      others: [] as ModelInfo[],
      all: [] as ModelInfo[],
    };

    if (!agentConfig?.apiKey) {
      // Return guaranteed shape even without API key
      return defaultShape;
    }

    try {
      const families = ModelSelectionService.getModelsByFamily(
        agentConfig.apiKey,
      );
      // Service contract guarantees all keys exist and are arrays
      // Map 'all' to 'others' for UI compatibility (others is not in contract, but UI uses it)
      return {
        flash: families.flash || [],
        pro: families.pro || [],
        normal: families.normal || [],
        others: (families.all || []).filter((m) => m.family === "others"),
        all: families.all || [],
      };
    } catch (error) {
      // If service call fails, return guaranteed shape (never undefined)
      console.warn(
        "[RibbonSettingsTab] Failed to get models by family:",
        error,
      );
      return defaultShape;
    }
  }, [validatedModels, agentConfig?.apiKey]);

  // Get best default model for each family
  // CONTRACT GUARANTEE: modelCategories[family] is always an array (never undefined)
  const getBestModelForFamily = (family: ModelFamily): ModelInfo | null => {
    // Service contract guarantees this is always an array
    const models = modelCategories[family] || [];
    if (models.length === 0) return null;

    // In auto mode, use scoring to find best
    if (selectionMode === "auto") {
      return selectBestDefaultModel(models);
    }

    // In manual mode, return first model (user will select)
    return models[0];
  };

  const handleModelSelect = (family: ModelFamily, modelId: string) => {
    if (!agentConfig?.apiKey) return;

    // Only allow manual selection in manual mode
    if (selectionMode === "auto") {
      console.warn("[RibbonSettingsTab] Model selection disabled in auto mode");
      return;
    }

    const model = validatedModels.find((m) => m.id === modelId);
    if (!model) return;

    // Save via ModelSelectionService (CONTRACT API - SINGLE SOURCE OF TRUTH)
    ModelSelectionService.setManualModel(agentConfig.apiKey, modelId);
    setActiveModel(model);

    // Also call parent callback for compatibility
    onSelectModel(model.id as ModelId);

    sendAgentTelemetry({
      location: "RibbonSettingsTab",
      message: "Model selected",
      data: { modelId: model.id, family: model.family, mode: "manual" },
      hypothesisId: "V",
    });
  };

  const handleSelectionModeChange = (mode: "auto" | "manual") => {
    if (!agentConfig?.apiKey) return;

    // Use ModelSelectionService (CONTRACT API - SINGLE SOURCE OF TRUTH)
    ModelSelectionService.setSelectionMode(agentConfig.apiKey, mode);
    setSelectionMode(mode);

    // Refresh active model after mode change
    const activeModelId = ModelSelectionService.getActiveModel(
      agentConfig.apiKey,
    );
    if (activeModelId) {
      const model = validatedModels.find((m) => m.id === activeModelId);
      if (model) {
        setActiveModel(model);
      }
    }
  };

  return (
    <div className="flex items-center h-full animate-fade-in gap-10">
      <RibbonGroup label="Model" isExpanded={isExpanded}>
        <div
          className={`${!isExpanded ? "hidden" : ""} w-[260px] overflow-hidden`}
        >
          {/* Model Selector Group: 2x2 Grid + Toggle */}
          <div className="flex items-start gap-2.5 mb-2">
            {/* 2x2 Grid of Model ComboBoxes: Flash, Pro, Normal, Others */}
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              {(["flash", "pro", "normal", "others"] as const).map((family) => {
                // CONTRACT GUARANTEE: Service always returns initialized arrays
                // Defensive check only for safety during initialization
                const models = modelCategories[family] || [];
                const bestModel = getBestModelForFamily(family);
                const defaultValue =
                  selectionMode === "auto" && bestModel
                    ? bestModel.id
                    : activeModel && models.find((m) => m.id === activeModel.id)
                      ? activeModel.id
                      : "";

                // Get icon and family color for visual distinction
                const Icon =
                  family === "pro"
                    ? BrainCircuit
                    : family === "flash"
                      ? Gauge
                      : Zap;
                const familyColor =
                  family === "flash"
                    ? "text-blue-400"
                    : family === "pro"
                      ? "text-purple-400"
                      : family === "normal"
                        ? "text-emerald-400"
                        : family === "others"
                          ? "text-amber-400"
                          : "text-slate-300";

                return (
                  <div key={family} className="relative">
                    <select
                      value={defaultValue}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleModelSelect(family, e.target.value);
                        }
                      }}
                      disabled={selectionMode === "auto" || models.length === 0}
                      className={`w-full pl-6 pr-2 py-1.5 text-[9px] font-semibold rounded-md border transition-all duration-200 appearance-none ${
                        selectionMode === "auto" || models.length === 0
                          ? "bg-slate-700/50 border-slate-600/50 text-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-slate-700/90 to-slate-800/90 border-slate-600/60 text-slate-50 hover:border-purple-400/70 hover:from-slate-700 hover:to-slate-800 hover:text-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-400/50 focus:border-purple-400/80 shadow-sm"
                      }`}
                      style={{
                        maxHeight: "120px",
                        overflowY: "auto",
                      }}
                      title={
                        selectionMode === "auto"
                          ? "Switch to Manual mode to select a model"
                          : models.length === 0
                            ? "No models available"
                            : `Select ${family} model`
                      }
                    >
                      <option
                        value=""
                        className="bg-slate-800 text-slate-100 font-medium text-[9px]"
                      >
                        {models.length === 0
                          ? `No ${family}`
                          : selectionMode === "auto" && bestModel
                            ? bestModel.label.length > 18
                              ? bestModel.label.substring(0, 15) + "..."
                              : bestModel.label
                            : `${family === "others" ? "Others" : family.charAt(0).toUpperCase() + family.slice(1)}`}
                      </option>
                      {models.map((model) => {
                        const isSelected = activeModel?.id === model.id;
                        return (
                          <option
                            key={model.id}
                            value={model.id}
                            className={`${
                              isSelected
                                ? "bg-purple-600 text-white font-bold"
                                : "bg-slate-800 text-slate-50 font-medium hover:bg-slate-700 hover:text-white"
                            }`}
                            style={{
                              // High contrast, larger font for readability
                              color: isSelected ? "#ffffff" : "#f1f5f9",
                              fontWeight: isSelected ? "700" : "600",
                              fontSize: "9px",
                              padding: "6px 8px",
                            }}
                          >
                            {model.label}
                          </option>
                        );
                      })}
                    </select>
                    {/* Icon overlay - family-colored when enabled for visual distinction */}
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Icon
                        className={`w-2.5 h-2.5 transition-colors duration-200 ${
                          selectionMode === "auto" || models.length === 0
                            ? "text-slate-500"
                            : familyColor
                        }`}
                      />
                    </div>
                    {/* Count badge - high contrast and visible */}
                    {models.length > 0 && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[7px] text-slate-200 font-bold">
                        {models.length}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Auto/Manual Toggle - Single Switch (Slider-style) */}
            <div className="flex items-center gap-2 self-center">
              <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-wide">
                {selectionMode === "auto" ? "Auto" : "Manual"}
              </span>
              <button
                onClick={() =>
                  handleSelectionModeChange(
                    selectionMode === "auto" ? "manual" : "auto",
                  )
                }
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                  selectionMode === "auto"
                    ? "bg-gradient-to-r from-purple-500 to-purple-600"
                    : "bg-slate-600"
                }`}
                title={
                  selectionMode === "auto"
                    ? "Auto mode: system selects best model"
                    : "Manual mode: select model manually"
                }
                role="switch"
                aria-checked={selectionMode === "auto"}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${
                    selectionMode === "auto"
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Active Model Indicator - Enhanced with Performance Metrics */}
          {activeModel && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-r from-purple-500/10 via-purple-600/10 to-blue-500/10 border border-purple-400/30 rounded-lg text-[8px] shadow-md max-w-full overflow-hidden group relative">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Zap className="w-3 h-3 text-purple-400 flex-shrink-0 animate-pulse" />
                <span
                  className="font-bold text-purple-200 truncate"
                  title={activeModel.label}
                >
                  {activeModel.label}
                </span>
              </div>
              {/* Performance Badge - Show response time if available */}
              {(() => {
                // Try to get performance metrics from validation store
                const modelInfo = validatedModels.find(
                  (m) => m.id === activeModel.id,
                );
                const responseTime =
                  (modelInfo as any)?.responseTime ||
                  (modelInfo as any)?.avgResponseTime;
                if (responseTime) {
                  const isFast = responseTime < 1000; // < 1s is fast
                  const isMedium = responseTime < 2000; // < 2s is medium
                  return (
                    <div
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-bold ${
                        isFast
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : isMedium
                            ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                            : "bg-slate-500/20 text-slate-300 border border-slate-400/30"
                      }`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>{responseTime}ms</span>
                    </div>
                  );
                }
                return null;
              })()}
              {/* Best Model Badge - Show if this is the best model in its family */}
              {(() => {
                const family = activeModel.family;
                const bestModel = getBestModelForFamily(family);
                if (
                  bestModel &&
                  bestModel.id === activeModel.id &&
                  selectionMode === "auto"
                ) {
                  return (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-bold bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-200 border border-emerald-400/40">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Best</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Access" isExpanded={isExpanded}>
        <div
          className={`flex h-full items-center ${!isExpanded && "hidden"}`}
          style={{ pointerEvents: "auto", zIndex: 50 }}
        >
          <AgentTile
            icon={Key}
            label="API Key"
            value={agentConfig?.apiKey ? "Active" : "Missing"}
            theme="emerald"
            active={true}
            onClick={onManageApiKey}
          />
        </div>
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Voice" isExpanded={isExpanded}>
        <div className={`flex h-full items-center ${!isExpanded && "hidden"}`}>
          <AgentTile
            icon={Mic}
            label="Voice"
            value={agentConfig?.voice || "Default"}
            theme="ocean"
            active={true}
            onClick={onChangeVoice}
          />
        </div>
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Agent" isExpanded={isExpanded}>
        <div className={`flex h-full items-center ${!isExpanded && "hidden"}`}>
          <AgentTile
            icon={UserCog}
            label="Persona"
            value={agentConfig?.persona || "Default"}
            theme="indigo"
            active={true}
            onClick={onChangePersonality}
          />
        </div>
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="System" isExpanded={isExpanded}>
        <div className={`flex gap-1.5 items-center ${!isExpanded && "hidden"}`}>
          <RibbonButton
            icon={Trash2}
            label="Reset"
            onClick={onClearChat}
            color="text-burgundy-600"
            isExpanded={isExpanded}
          />
          <RibbonButton
            icon={SecurityIcon}
            label="Security"
            onClick={() => onTriggerTool("bugs")}
            color="text-ocean-900/60"
            isExpanded={isExpanded}
          />
          <RibbonButton
            icon={FlaskConical}
            label="Test Models"
            onClick={onOpenGeminiTester}
            color="text-purple-400"
            isExpanded={isExpanded}
          />
        </div>
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Preferences" isExpanded={isExpanded}>
        {isExpanded && (
          <div className="flex gap-2.5 items-center px-1">
            {/* Language Selection */}
            <div className="flex-1 relative">
              <select
                value={settings.language}
                onChange={(e) =>
                  handleSettingChange("language", e.target.value)
                }
                className="w-full pl-8 pr-7 py-2 bg-slate-800/50 border border-slate-700/60 rounded-lg text-xs font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/70 transition-all appearance-none cursor-pointer hover:border-slate-600/80 hover:bg-slate-800/70"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
              <Globe
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none"
              />
              <ChevronDown
                strokeWidth={2}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
              />
            </div>

            {/* Notifications Toggle - Icon Only (Ribbon Style) */}
            <button
              onClick={() =>
                handleSettingChange("notifications", !settings.notifications)
              }
              className={`relative flex items-center justify-center p-2.5 rounded-lg transition-all duration-200 min-w-[40px] min-h-[40px] overflow-hidden ${
                settings.notifications
                  ? "bg-emerald-600 shadow-md"
                  : "bg-transparent"
              }`}
              title={
                settings.notifications
                  ? "Notifications enabled - Click to disable"
                  : "Notifications disabled - Click to enable"
              }
            >
              {/* Active gradient overlay */}
              {settings.notifications && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              )}

              {/* Icon container */}
              <div className="relative z-30 transition-transform duration-200 hover:scale-110">
                <Bell
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-white transition-all duration-200"
                />
              </div>
            </button>
          </div>
        )}
      </RibbonGroup>

      {/* Remove local modal - use parent's modal */}
      {/* <GeminiTesterPro 
        isOpen={isTesterOpen} 
        onClose={() => setIsTesterOpen(false)} 
      /> */}
    </div>
  );
};
