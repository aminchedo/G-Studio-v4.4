import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Key,
  Mic,
  UserCog,
  Zap,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Briefcase,
  Heart,
  GraduationCap,
  Palette,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { GeminiService } from "@/services/ai/geminiService";
import { ModelTestingService } from "@/services/ai/modelTestingService";
import { ModelValidationStore } from "@/services/ai/modelValidationStore";

interface AgentConfig {
  apiKey: string;
  voice: string;
  persona: string;
  language?: string;
}

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Either provide an initialTab (uncontrolled) or controlled activeTab + onTabChange
  initialTab?: "connection" | "voice" | "identity";
  activeTab?: "connection" | "voice" | "identity";
  onTabChange?: (tab: "connection" | "voice" | "identity") => void;
  config: AgentConfig;
  onSave: (config: AgentConfig) => void;
}

const AGENTS = [
  {
    id: "Professional",
    name: "Senior Engineer",
    description:
      "Production-ready code with strict adherence to best practices and minimal chatter.",
    icon: Briefcase,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    activeColor: "bg-purple-600",
  },
  {
    id: "Friendly",
    name: "Helpful Mentor",
    description:
      "Patient explanations and guided problem-solving. Perfect for learning new concepts.",
    icon: Heart,
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-200",
    activeColor: "bg-rose-500",
  },
  {
    id: "Academic",
    name: "Research Scientist",
    description:
      "Deep theoretical analysis, citation of algorithms, and focus on formal correctness.",
    icon: GraduationCap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    activeColor: "bg-amber-600",
  },
  {
    id: "Creative",
    name: "Product Designer",
    description:
      "Focus on UX/UI, creative solutions, and aesthetically pleasing code structures.",
    icon: Palette,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    activeColor: "bg-purple-600",
  },
];

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  activeTab: controlledActiveTab,
  onTabChange,
  config,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<
    "connection" | "voice" | "identity"
  >(controlledActiveTab ?? initialTab ?? "connection");

  // Keep controlled activeTab in sync when parent drives it
  useEffect(() => {
    if (controlledActiveTab !== undefined) {
      setActiveTab(controlledActiveTab);
    }
  }, [controlledActiveTab]);

  const handleSetTab = (tab: "connection" | "voice" | "identity") => {
    if (onTabChange) onTabChange(tab);
    else setActiveTab(tab);
  };
  // RUNTIME GUARD: Ensure all config values have defaults to prevent uncontrolled/controlled warnings
  const [localConfig, setLocalConfig] = useState<AgentConfig>({
    apiKey: config?.apiKey || "",
    voice: config?.voice || "default",
    persona: config?.persona || "default",
    language: config?.language || "en-US",
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "success" | "error" | "rate_limited"
  >("idle");
  const [testPhase, setTestPhase] = useState<
    "idle" | "discovering" | "completed"
  >("idle");
  const [candidateModelsCount, setCandidateModelsCount] = useState<number>(0);
  const [scannedModelsCount, setScannedModelsCount] = useState<number>(0);
  const [showKey, setShowKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelDetails, setModelDetails] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      inputTokenLimit: number | string;
      outputTokenLimit: number | string;
      tested: boolean;
    }>
  >([]);

  // Model Selection Ribbon State (for display only - Ribbon is source of truth)
  type ModelSeries = "default" | "pro" | "flash" | "all";
  const [selectedSeries, setSelectedSeries] = useState<ModelSeries>("default");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [openDropdown, setOpenDropdown] = useState<ModelSeries | null>(null);
  const [activeModel, setActiveModel] = useState<{
    id: string;
    label: string;
    family: string;
  } | null>(null);

  // Cooldown timer for rate-limited retries
  const [cooldown, setCooldown] = useState<number>(0);
  const COOLDOWN_SECONDS = 60; // 60 seconds cooldown after 429

  // Countdown timer effect - sync with global rate limit state
  useEffect(() => {
    if (cooldown <= 0) {
      // Check global state when local cooldown expires
      const checkGlobalState = async () => {
        const { RateLimitService } =
          await import("@/services/network/rateLimitService");
        if (RateLimitService.isRateLimited(localConfig.apiKey)) {
          const remaining = RateLimitService.getRemainingCooldown(
            localConfig.apiKey,
          );
          if (remaining > 0) {
            setCooldown(remaining);
          }
        }
      };
      checkGlobalState();
      return;
    }

    const intervalId = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [cooldown, localConfig.apiKey]);

  // Model Series Filtering Logic
  const modelSeries = useMemo(() => {
    const proModels = availableModels.filter((m) =>
      m.toLowerCase().includes("pro"),
    );
    const flashModels = availableModels.filter((m) =>
      m.toLowerCase().includes("flash"),
    );
    const allModels = availableModels;

    // Default: Best model (Pro > Flash > Others)
    let defaultModel = "";
    if (proModels.length > 0) {
      defaultModel = proModels[0];
    } else if (flashModels.length > 0) {
      defaultModel = flashModels[0];
    } else if (allModels.length > 0) {
      defaultModel = allModels[0];
    }

    return {
      default: defaultModel ? [defaultModel] : [],
      pro: proModels,
      flash: flashModels,
      all: allModels,
    };
  }, [availableModels]);

  // Get models for current series
  const currentSeriesModels = useMemo(() => {
    return modelSeries[selectedSeries] || [];
  }, [selectedSeries, modelSeries]);

  // Auto-select default model when models are discovered
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      const defaultModel = modelSeries.default[0];
      if (defaultModel) {
        setSelectedModel(defaultModel);
        setSelectedSeries("default");
        // Save to localStorage
        try {
          localStorage.setItem("gstudio_selected_model", defaultModel);
        } catch (e) {
          console.warn("Failed to save selected model:", e);
        }
      }
    }
  }, [availableModels, modelSeries.default, selectedModel]);

  // Validate selected model is still available
  useEffect(() => {
    if (selectedModel && !availableModels.includes(selectedModel)) {
      // Previously selected model is no longer available - re-run default selection
      const defaultModel = modelSeries.default[0];
      if (defaultModel) {
        setSelectedModel(defaultModel);
        setSelectedSeries("default");
        try {
          localStorage.setItem("gstudio_selected_model", defaultModel);
        } catch (e) {
          console.warn("Failed to save selected model:", e);
        }
      } else {
        setSelectedModel("");
      }
    }
  }, [availableModels, selectedModel, modelSeries.default]);

  useEffect(() => {
    if (isOpen) {
      handleSetTab(controlledActiveTab ?? initialTab ?? "connection");
      // RUNTIME GUARD: Ensure all config values have defaults
      setLocalConfig({
        apiKey: config?.apiKey || "",
        voice: config?.voice || "default",
        persona: config?.persona || "default",
        language: config?.language || "en-US",
      });
      setTestStatus("idle");
      setTestPhase("idle");
      setScannedModelsCount(0);
      setShowKey(false);
      setOpenDropdown(null);

      // Load previously selected model from localStorage
      try {
        const saved = localStorage.getItem("gstudio_selected_model");
        if (saved && availableModels.includes(saved)) {
          setSelectedModel(saved);
          // Determine series based on model name
          if (saved.toLowerCase().includes("pro")) {
            setSelectedSeries("pro");
          } else if (saved.toLowerCase().includes("flash")) {
            setSelectedSeries("flash");
          } else {
            setSelectedSeries("all");
          }
        }
      } catch (e) {
        console.warn("Failed to load selected model:", e);
      }

      // Sync cooldown with global rate limit state when modal opens
      if (config?.apiKey) {
        const syncCooldown = async () => {
          const { RateLimitService } =
            await import("@/services/network/rateLimitService");
          if (RateLimitService.isRateLimited(config.apiKey)) {
            const remaining = RateLimitService.getRemainingCooldown(
              config.apiKey,
            );
            if (remaining > 0) {
              setCooldown(remaining);
              setTestStatus("rate_limited");
            }
          }
        };
        syncCooldown();
      }
    }
  }, [isOpen, initialTab, config]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen || !openDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-model-ribbon]")) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, openDropdown]);

  // When model is selected in the modal: persist to localStorage AND sync to ModelSelectionService
  // so that chat actually uses this model (GeminiService reads from the store, not localStorage)
  useEffect(() => {
    if (!selectedModel) return;

    try {
      localStorage.setItem("gstudio_selected_model", selectedModel);
    } catch (e) {
      console.warn("Failed to save selected model:", e);
    }

    if (localConfig.apiKey?.trim()) {
      void (async () => {
        try {
          const { ModelSelectionService } =
            await import("@/services/ai/modelSelectionService");
          ModelSelectionService.setManualModel(
            localConfig.apiKey,
            selectedModel,
          );
        } catch (e) {
          console.warn(
            "[AgentModal] setManualModel failed (run Test Models first):",
            e,
          );
        }
      })();
    }
  }, [selectedModel, localConfig.apiKey]);

  // Keyboard Navigation for Agent Selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        if (openDropdown) {
          setOpenDropdown(null);
        } else {
          onClose();
        }
        return;
      }

      if (activeTab === "identity") {
        const currentIndex = AGENTS.findIndex(
          (a) => a.id === localConfig.persona,
        );
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          const nextIndex = (currentIndex + 1) % AGENTS.length;
          const newAgentId = AGENTS[nextIndex].id;
          const newConfig = { ...localConfig, persona: newAgentId };
          setLocalConfig(newConfig);
          onSave(newConfig); // Immediate update on keyboard nav
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          const prevIndex = (currentIndex - 1 + AGENTS.length) % AGENTS.length;
          const newAgentId = AGENTS[prevIndex].id;
          const newConfig = { ...localConfig, persona: newAgentId };
          setLocalConfig(newConfig);
          onSave(newConfig); // Immediate update on keyboard nav
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeTab, localConfig, onClose, onSave, openDropdown]);

  if (!isOpen) return null;

  // Test API - Connectivity check only (no model probing)
  // Tries UltimateGeminiTester first; falls back to simple fetch if that fails
  const handleTestAPI = async () => {
    if (!localConfig.apiKey) return;

    setIsTesting(true);
    setTestStatus("idle");
    setTestPhase("idle");

    try {
      try {
        const { UltimateGeminiTester } =
          await import("@/services/ultimateGeminiTester");
        const tester = new UltimateGeminiTester({
          apiKey: localConfig.apiKey,
          bypassMode: "auto",
          verbose: false,
        });
        await tester.initialize();
      } catch (testerError: any) {
        // Fallback: simple GET to models endpoint (same as GeminiService.validateApiKey)
        const isValid = await GeminiService.validateApiKey(localConfig.apiKey);
        if (!isValid) throw testerError;
      }
      setTestStatus("success");
      setTestPhase("completed");
    } catch (error: any) {
      console.error("[AgentModal] API connectivity test failed:", error);
      setTestStatus("error");
      setTestPhase("completed");
    } finally {
      setIsTesting(false);
    }
  };

  // Test Models - Full model discovery (probes all models)
  const handleTestModels = async () => {
    if (!localConfig.apiKey) return;

    // DOMAIN LOGIC: Cooldown is ONLY for runtime operations (chat/stream)
    // Discovery phase (model testing) should NOT be blocked by cooldown
    // Users should be able to retry discovery immediately

    setIsTesting(true);
    setTestStatus("idle");
    setTestPhase("discovering"); // Set to discovering immediately
    setAvailableModels([]);
    setModelDetails([]);

    try {
      // SINGLE SOURCE OF TRUTH: Test models using ModelTestingService
      // This is the ONLY place where models are probed
      console.log("[AgentModal] Testing models via ModelTestingService...");

      // Get candidate models (just the list, no testing)
      const candidateModels = await ModelTestingService.getCandidateModels(
        localConfig.apiKey,
      );

      if (candidateModels.length === 0) {
        setTestPhase("completed");
        setTestStatus("error");
        return;
      }

      // Store candidate count for UI display
      setCandidateModelsCount(candidateModels.length);

      // Test all models with progress callback
      // Discovery state is tracked internally by ModelTestingService
      // FULL SCAN: All candidate models MUST be probed (no early stopping)
      const testOutput = await ModelTestingService.testAllModels(
        localConfig.apiKey,
        candidateModels,
        (current, total, modelId) => {
          console.log(`[AgentModal] Testing ${current}/${total}: ${modelId}`);
          // Update UI with progress - discovery is ongoing until current === total
          setScannedModelsCount(current);
        },
      );

      // Mark phase as completed
      setTestPhase("completed");

      // DOMAIN LOGIC: Discovery is complete
      // Only show rate_limited if we found ZERO usable models AND discovery is complete
      // During discovery, we never show errors - only after completion
      if (
        testOutput.providerStatus === "rate_limited" &&
        testOutput.usableModels.length === 0
      ) {
        console.warn(
          `[AgentModal] Discovery complete: No usable models found due to rate limits`,
        );
        setTestStatus("rate_limited");
        setAvailableModels([]);
        setModelDetails([]);
        // In discovery phase, don't enforce cooldown - allow immediate retry
        // Cooldown is only for runtime operations
        return;
      }

      // Success: Found usable models
      // Get detailed model information for usable models
      const details = await GeminiService.getModelDetails(localConfig.apiKey);

      setAvailableModels(testOutput.usableModels);
      setModelDetails(details);
      setTestStatus("success");

      // Revalidate default model selection when discovery completes
      // This updates the ModelValidationStore and ensures Ribbon has correct active model
      const { ModelSelectionService } =
        await import("@/services/ai/modelSelectionService");
      ModelSelectionService.revalidateAgainstStore(localConfig.apiKey);

      // Get active model ID from service for display
      const activeModelId = ModelSelectionService.getActiveModel(
        localConfig.apiKey,
      );
      if (activeModelId) {
        // Find model info from validated models
        const { detectModelFamily, generateModelLabel } =
          await import("@/services/ai/modelInfo");
        const modelInfo = {
          id: activeModelId,
          label: generateModelLabel(activeModelId),
          family: detectModelFamily(activeModelId),
        };
        setActiveModel(modelInfo);
      }

      // Log structured test results
      // Filter out 429 errors from rejected models (they are noise, not errors)
      const realRejectedModels = testOutput.rejectedModels.filter(
        (r) => r.reason !== "rate_limited",
      );

      console.log(`[AgentModal] Test complete:`, {
        usableModels: testOutput.usableModels.length,
        rejectedModels: realRejectedModels.length,
        rateLimitedFiltered:
          testOutput.rejectedModels.length - realRejectedModels.length,
        providerStatus: testOutput.providerStatus,
      });

      if (testOutput.usableModels.length > 0) {
        console.log(
          `[AgentModal] ✅ Usable models: ${testOutput.usableModels.join(", ")}`,
        );
      }
      if (realRejectedModels.length > 0) {
        console.warn(
          `[AgentModal] ❌ Rejected models (429 filtered):`,
          realRejectedModels,
        );
      }

      // Cache validation result for network reliability service
      try {
        localStorage.setItem(
          "gstudio_api_key_validated",
          JSON.stringify({
            valid: true,
            apiKey: localConfig.apiKey,
            timestamp: Date.now(),
            availableModels: testOutput.usableModels, // Cache discovered models
          }),
        );
      } catch (e) {
        // Silently fail if localStorage is unavailable
        console.warn("Failed to cache API key validation:", e);
      }
    } catch (e) {
      console.error("[AgentModal] Test connection error:", e);
      setTestPhase("completed");
      setTestStatus("error");
      // Clear cache on error
      try {
        localStorage.removeItem("gstudio_api_key_validated");
      } catch (err) {
        // Silently fail
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleClearKey = () => {
    setLocalConfig((prev) => ({ ...prev, apiKey: "" }));
    setTestStatus("idle");
  };

  const tabs = [
    { id: "connection", label: "Connection", icon: Key },
    { id: "voice", label: "Voice & Audio", icon: Mic },
    { id: "identity", label: "Agent Persona", icon: UserCog },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-slate-50/95 backdrop-blur-md border border-slate-200/70 shadow-md rounded-lg w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center shadow-md">
              <ShieldCheck strokeWidth={1.5} className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Agent Config
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Global Settings
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
          >
            <X strokeWidth={1.5} className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-2 border-b border-slate-200/70 gap-2 bg-white/95 backdrop-blur-md sticky top-[96px] z-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSetTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-all duration-200 relative ${
                activeTab === tab.id
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-slate-600 hover:bg-slate-100/60 hover:text-slate-700"
              }`}
            >
              <tab.icon
                strokeWidth={2}
                className={`w-4 h-4 ${activeTab === tab.id ? "text-purple-600" : "text-slate-400"}`}
              />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px] bg-white overflow-y-auto">
          {activeTab === "connection" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  Gemini API Key
                  <span className="text-[9px] text-slate-400 font-medium normal-case tracking-normal bg-white px-2 py-0.5 rounded-full border border-slate-100">
                    Required for agent capabilities
                  </span>
                </label>
                <div className="relative group">
                  <input
                    type={showKey ? "text" : "password"}
                    value={localConfig.apiKey}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        apiKey: e.target.value,
                      }))
                    }
                    placeholder="Enter your API Key (sk-...)"
                    className="w-full pl-11 pr-24 py-4 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono text-sm shadow-sm transition-all duration-200"
                  />
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-100/60 rounded-lg transition-all duration-200"
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2 px-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    Your key is processed locally and sent directly to Google's
                    API. It is never stored on our servers.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      testStatus === "success"
                        ? "bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50"
                        : testStatus === "error"
                          ? "bg-red-50 text-red-600 ring-4 ring-red-50"
                          : testStatus === "rate_limited"
                            ? "bg-amber-50 text-amber-600 ring-4 ring-amber-50"
                            : testPhase === "discovering" && isTesting
                              ? "bg-blue-50 text-blue-600 ring-4 ring-blue-50"
                              : "bg-slate-50 text-purple-600"
                    }`}
                  >
                    {isTesting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Zap className="w-5 h-5" strokeWidth={2} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Connection Status
                    </div>
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${
                        testStatus === "success"
                          ? "text-emerald-600"
                          : testStatus === "error"
                            ? "text-burgundy-600"
                            : testStatus === "rate_limited"
                              ? "text-amber-600"
                              : testPhase === "discovering" && isTesting
                                ? "text-blue-600"
                                : "text-slate-400"
                      }`}
                    >
                      {testStatus === "success"
                        ? `Verified & Ready (${availableModels.length} models)`
                        : testStatus === "error"
                          ? "Validation Failed"
                          : testStatus === "rate_limited"
                            ? "Rate Limited - Try Again Later"
                            : testPhase === "discovering" && isTesting
                              ? "Scanning Models..."
                              : "Not Tested"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {localConfig.apiKey && (
                    <button
                      onClick={handleClearKey}
                      className="px-4 py-2.5 bg-burgundy-50 border border-burgundy-100 text-burgundy-600 rounded-xl text-xs font-bold hover:bg-burgundy-100 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                  {/* Two separate buttons: Test API (connectivity) and Test Models (discovery) - Distinct styles */}
                  <button
                    onClick={handleTestAPI}
                    disabled={isTesting || !localConfig.apiKey}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/30 active:scale-95 flex items-center gap-2 border border-blue-500/50"
                    aria-disabled={isTesting || !localConfig.apiKey}
                    title="Test API connectivity only (no model probing, no quota usage)"
                  >
                    {isTesting && testPhase === "idle" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Test API</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleTestModels}
                    disabled={isTesting || !localConfig.apiKey}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl text-xs font-bold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/40 active:scale-95 flex items-center gap-2 border border-purple-500/50 ring-1 ring-purple-400/30"
                    aria-disabled={isTesting || !localConfig.apiKey}
                    title="Test all models (full discovery, updates Ribbon)"
                  >
                    {isTesting && testPhase === "discovering" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing Models...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Test Models</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Model Discovery Results (Informational Only) */}
              {testStatus === "success" && availableModels.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-3">
                    Discovery Results
                  </label>

                  {/* Summary */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div className="text-sm font-bold text-emerald-800">
                        {availableModels.length} Model
                        {availableModels.length !== 1 ? "s" : ""} Discovered
                      </div>
                    </div>
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                      Models have been validated and are now available in the{" "}
                      <strong>Model Ribbon</strong>. Use the Ribbon to select
                      and switch between models during chat.
                    </p>
                  </div>

                  {/* Model Counts by Family */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {(["normal", "flash", "pro", "all"] as const).map(
                      (family) => {
                        const count =
                          family === "all"
                            ? availableModels.length
                            : availableModels.filter((m) => {
                                const lower = m.toLowerCase();
                                if (family === "flash")
                                  return lower.includes("flash");
                                if (family === "pro")
                                  return lower.includes("pro");
                                return (
                                  !lower.includes("flash") &&
                                  !lower.includes("pro")
                                );
                              }).length;

                        return (
                          <div
                            key={family}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center"
                          >
                            <div className="text-xs font-bold text-slate-700 capitalize">
                              {family === "all" ? "All" : family}
                            </div>
                            <div className="text-lg font-black text-slate-900">
                              {count}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>

                  {/* Active Model Info */}
                  {activeModel && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wide mb-1">
                            Active Model (from Ribbon)
                          </div>
                          <div className="text-sm font-bold text-slate-800 font-mono">
                            {activeModel.label}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {activeModel.family.charAt(0).toUpperCase() +
                              activeModel.family.slice(1)}{" "}
                            Model
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Message */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Models are now available in the{" "}
                      <strong>Model Ribbon</strong>. Use the Ribbon ComboBoxes
                      to select models during chat. The system automatically
                      selects the best default model for each family.
                    </p>
                  </div>
                </div>
              )}

              {/* Display Available Models */}
              {testStatus === "success" && availableModels.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div className="text-xs font-bold text-emerald-800">
                      Available Models ({availableModels.length})
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {modelDetails.length > 0
                      ? modelDetails.map((model) => (
                          <div
                            key={model.id}
                            className="bg-white rounded-lg p-3 border border-emerald-100"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-xs font-bold text-slate-800">
                                  {model.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {model.id}
                                </div>
                                {model.tested && (
                                  <div className="flex items-center gap-1 mt-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                    <span className="text-[10px] text-emerald-600 font-medium">
                                      Verified & Working
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      : availableModels.map((modelId) => (
                          <div
                            key={modelId}
                            className="bg-white rounded-lg p-3 border border-emerald-100"
                          >
                            <div className="text-xs font-bold text-slate-800 font-mono">
                              {modelId}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                              <span className="text-[10px] text-emerald-600 font-medium">
                                Available
                              </span>
                            </div>
                          </div>
                        ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                      ✓ These models have been tested and verified to work with
                      your API key. The system will automatically use them in
                      priority order.
                    </p>
                  </div>
                </div>
              )}

              {testStatus === "success" && availableModels.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs text-yellow-800">
                      API key is valid, but no models were discovered. Please
                      check your API key permissions.
                    </p>
                  </div>
                </div>
              )}

              {/* Discovery Phase: Show neutral informational status while scanning */}
              {/* CRITICAL: While isDiscovering === true, NEVER show errors, warnings, or conclusions */}
              {testPhase === "discovering" && isTesting && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <p className="text-xs font-bold text-blue-800">
                      Scanning models in the background…
                    </p>
                  </div>
                  <p className="text-xs text-blue-700 ml-6 leading-relaxed">
                    This process checks all available models
                    {candidateModelsCount > 0
                      ? ` (~${candidateModelsCount})`
                      : ""}
                    .
                    <br />
                    Temporary rate limits (429) are expected and normal.
                    <br />
                    The system is still identifying usable models.
                    {candidateModelsCount > 0 && scannedModelsCount > 0 && (
                      <span className="block mt-2 font-semibold">
                        Progress: {scannedModelsCount} / {candidateModelsCount}{" "}
                        models scanned
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Discovery Complete: No usable models found due to rate limits */}
              {/* Only show this AFTER discovery completes, never during */}
              {testStatus === "rate_limited" &&
                testPhase === "completed" &&
                !isTesting && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <p className="text-xs font-bold text-amber-800">
                        No usable models found
                      </p>
                    </div>
                    <p className="text-xs text-amber-700 ml-6 leading-relaxed">
                      The system encountered rate limits while scanning models
                      and couldn't identify any usable models. Your API key is
                      valid. Please try again in a moment.
                    </p>
                  </div>
                )}
            </div>
          )}

          {activeTab === "voice" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    Voice Model
                  </label>
                  <span className="text-[9px] text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">
                    Select preferred synthesis voice
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {["Kore", "Puck", "Charon", "Fenrir", "Zephyr"].map(
                    (voice) => (
                      <button
                        key={voice}
                        onClick={() =>
                          setLocalConfig((prev) => ({ ...prev, voice }))
                        }
                        className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all group ${
                          localConfig.voice === voice
                            ? "bg-white border-purple-200 shadow-md ring-1 ring-purple-50"
                            : "bg-white border-slate-200 hover:border-purple-200 hover:shadow-md transition-all duration-200"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                              localConfig.voice === voice
                                ? "bg-purple-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-all duration-200"
                            }`}
                          >
                            <Mic strokeWidth={1.5} className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <div
                              className={`text-sm font-semibold ${localConfig.voice === voice ? "text-white" : "text-slate-700"}`}
                            >
                              {voice}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Standard English (US)
                            </div>
                          </div>
                        </div>
                        {localConfig.voice === voice && (
                          <div className="w-3 h-3 rounded-full bg-white border-2 border-purple-600" />
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    Speech Recognition Language
                  </label>
                  <span className="text-[9px] text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">
                    For voice input (Chrome/Electron)
                  </span>
                </div>
                <select
                  value={localConfig.language || "en-US"}
                  onChange={(e) => {
                    const newConfig = {
                      ...localConfig,
                      language: e.target.value,
                    };
                    setLocalConfig(newConfig);
                    onSave(newConfig);
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="fa-IR">Persian (Farsi) - فارسی</option>
                  <option value="ar-SA">Arabic - العربية</option>
                  <option value="es-ES">Spanish - Español</option>
                  <option value="fr-FR">French - Français</option>
                  <option value="de-DE">German - Deutsch</option>
                  <option value="it-IT">Italian - Italiano</option>
                  <option value="pt-BR">Portuguese (Brazil) - Português</option>
                  <option value="ru-RU">Russian - Русский</option>
                  <option value="zh-CN">Chinese (Simplified) - 中文</option>
                  <option value="ja-JP">Japanese - 日本語</option>
                  <option value="ko-KR">Korean - 한국어</option>
                  <option value="tr-TR">Turkish - Türkçe</option>
                  <option value="hi-IN">Hindi - हिन्दी</option>
                </select>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Select the language for speech recognition. Works with Chrome
                  and Electron (Chromium-based browsers). Make sure microphone
                  permissions are granted.
                </p>
              </div>
            </div>
          )}

          {activeTab === "identity" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  Select Agent Persona
                </label>
                <span className="text-[9px] text-slate-400 font-medium bg-white border border-slate-100 px-2 py-1 rounded-md shadow-sm">
                  Use ↑ ↓ arrows to navigate
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {AGENTS.map((agent) => {
                  const isActive = localConfig.persona === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        const newConfig = { ...localConfig, persona: agent.id };
                        setLocalConfig(newConfig);
                        onSave(newConfig); // Immediate update on click
                      }}
                      className={`group relative flex items-start p-5 rounded-2xl border text-left transition-all duration-300 outline-none focus:ring-2 focus:ring-ocean-200 ${
                        isActive
                          ? "bg-white border-purple-200 shadow-md ring-1 ring-purple-50"
                          : "bg-white border-slate-200 hover:border-purple-200 hover:shadow-md transition-all duration-200"
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 mr-5 shadow-sm ${
                          isActive
                            ? `${agent.bg} ${agent.color} ring-1 ring-inset ring-black/5`
                            : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                        }`}
                      >
                        <agent.icon strokeWidth={1.5} className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-sm font-black tracking-tight ${isActive ? "text-slate-900" : "text-slate-700"}`}
                          >
                            {agent.name}
                          </span>
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-slate-50 text-slate-400 border-slate-100"
                            }`}
                          >
                            {isActive ? (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                                Active
                              </>
                            ) : (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />{" "}
                                Inactive
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          {agent.description}
                        </p>
                      </div>

                      {isActive && (
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${agent.activeColor}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex gap-3 items-start mt-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                  Switching agents immediately updates the system context for
                  new messages. Previous conversation history retains the
                  context of the agent active at that time.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all uppercase tracking-wide"
          >
            Close
          </button>
          {activeTab !== "identity" && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <Save className="w-4 h-4" />
              Save Config
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
