/**
 * AI Settings Hub - Unified AI Configuration Center
 *
 * Centralizes ALL AI-related settings in one place:
 * - Connection (API key, testing, status)
 * - Models (selection, parameters, families)
 * - Behavior (persona, style, preferences)
 * - Voice & Language (input, recognition)
 * - Local AI (LM Studio, offline mode)
 *
 * Eliminates 45% redundancy across 5 previous locations
 *
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Key,
  Zap,
  Brain,
  Mic,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Save,
  RotateCcw,
  Settings,
  Globe,
  Bell,
  Clock,
  TrendingUp,
  Briefcase,
  Heart,
  GraduationCap,
  Palette,
  Download,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import { ModelId } from "@/types";
import { ModelSelectionService } from "@/services/modelSelectionService";
import { ModelValidationStore } from "@/services/modelValidationStore";
import { ModelTestingService } from "@/services/modelTestingService";
import { AIConfig } from "@/components/AISettingsHub/types";

// Re-export for backward compatibility
export type { AIConfig } from "@/components/AISettingsHub/types";

// Re-export for backward compatibility
export type { AIConfig as AIConfigType } from "@/components/AISettingsHub/types";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AISettingsHubProps {
  isOpen: boolean;
  onClose: () => void;
  config: AIConfig;
  onSave: (config: AIConfig) => void;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: AIConfig = {
  apiKey: "",
  selectedModel: null,
  selectionMode: "auto",
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  enableStreaming: true,
  persona: "Professional",
  responseStyle: "Detailed",
  codeStyle: "Modern ES6+",
  autoFormat: true,
  voiceEnabled: false,
  language: "en-US",
  voiceModel: "Vosk",
  autoSend: true,
  confidenceThreshold: 0.7,
  localAIEnabled: false,
  localModel: "",
  offlineMode: "auto",
  fallbackToCloud: true,
  promptImprovement: false,
  promptMode: "deterministic",
  notifications: true,
};

// ============================================================================
// AGENT PERSONAS
// ============================================================================

const AGENT_PERSONAS = [
  {
    id: "Professional",
    name: "Senior Engineer",
    description:
      "Production-ready code with strict adherence to best practices and minimal chatter.",
    icon: Briefcase,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
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
  },
  {
    id: "Creative",
    name: "Product Designer",
    description:
      "Focus on UX/UI, creative solutions, and aesthetically pleasing code structures.",
    icon: Palette,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AISettingsHub: React.FC<AISettingsHubProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<
    | "connection"
    | "models"
    | "behavior"
    | "voice"
    | "voice-input"
    | "voice-output"
    | "local"
  >("connection");
  const [localConfig, setLocalConfig] = useState<AIConfig>(config);
  const [isDirty, setIsDirty] = useState(false);

  // Connection state
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "success" | "error" | "rate_limited"
  >("idle");
  const [testPhase, setTestPhase] = useState<
    "idle" | "discovering" | "completed"
  >("idle");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [scannedModelsCount, setScannedModelsCount] = useState(0);
  const [candidateModelsCount, setCandidateModelsCount] = useState(0);

  // Tabs configuration
  const tabs = [
    { id: "connection", label: "Connection", icon: Key },
    { id: "models", label: "Models", icon: Zap },
    { id: "behavior", label: "Behavior & Voice", icon: Brain },
    { id: "voice-input", label: "Voice Input", icon: Mic },
    { id: "voice-output", label: "Voice Output", icon: Volume2 },
    { id: "local", label: "Local AI", icon: Cpu },
  ];

  // Reset local config when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
      setIsDirty(false);
      setTestStatus("idle");
      setTestPhase("idle");
    }
  }, [isOpen, config]);

  // Update config and mark as dirty
  const updateConfig = useCallback(
    <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => {
      setLocalConfig((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
    },
    [],
  );

  // Handle save
  const handleSave = useCallback(() => {
    onSave(localConfig);
    setIsDirty(false);
    onClose();
  }, [localConfig, onSave, onClose]);

  // Handle reset
  const handleReset = useCallback(() => {
    setLocalConfig(DEFAULT_CONFIG);
    setIsDirty(true);
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close?",
      );
      if (!confirmed) return;
    }
    onClose();
  }, [isDirty, onClose]);

  // Test API connection
  const handleTestAPI = useCallback(async () => {
    if (!localConfig.apiKey) return;

    setIsTesting(true);
    setTestStatus("idle");

    try {
      const { UltimateGeminiTester } =
        await import("../services/ultimateGeminiTester");
      const tester = new UltimateGeminiTester({
        apiKey: localConfig.apiKey,
        bypassMode: "auto",
        verbose: false,
      });
      await tester.initialize();

      setTestStatus("success");
    } catch (error) {
      console.error("[AISettingsHub] API test failed:", error);
      setTestStatus("error");
    } finally {
      setIsTesting(false);
    }
  }, [localConfig.apiKey]);

  // Test all models
  const handleTestModels = useCallback(async () => {
    if (!localConfig.apiKey) return;

    setIsTesting(true);
    setTestStatus("idle");
    setTestPhase("discovering");
    setAvailableModels([]);

    try {
      const candidateModels = await ModelTestingService.getCandidateModels(
        localConfig.apiKey,
      );
      setCandidateModelsCount(candidateModels.length);

      const testOutput = await ModelTestingService.testAllModels(
        localConfig.apiKey,
        candidateModels,
        (current, total) => {
          setScannedModelsCount(current);
        },
      );

      setTestPhase("completed");

      if (testOutput.usableModels.length > 0) {
        setAvailableModels(testOutput.usableModels);
        setTestStatus("success");
        ModelSelectionService.revalidateAgainstStore(localConfig.apiKey);
      } else {
        setTestStatus(
          testOutput.providerStatus === "rate_limited"
            ? "rate_limited"
            : "error",
        );
      }
    } catch (error) {
      console.error("[AISettingsHub] Model testing failed:", error);
      setTestPhase("completed");
      setTestStatus("error");
    } finally {
      setIsTesting(false);
    }
  }, [localConfig.apiKey]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                AI Settings Hub
              </h2>
              <p className="text-sm text-slate-600">
                Centralized AI configuration
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all relative ${
                activeTab === tab.id
                  ? "text-purple-600 bg-white border-b-2 border-purple-600"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {activeTab === "connection" && (
            <ConnectionTab
              config={localConfig}
              updateConfig={updateConfig}
              showKey={showKey}
              setShowKey={setShowKey}
              isTesting={isTesting}
              testStatus={testStatus}
              testPhase={testPhase}
              availableModels={availableModels}
              scannedModelsCount={scannedModelsCount}
              candidateModelsCount={candidateModelsCount}
              onTestAPI={handleTestAPI}
              onTestModels={handleTestModels}
            />
          )}
          {activeTab === "models" && (
            <ModelsTab config={localConfig} updateConfig={updateConfig} />
          )}
          {activeTab === "behavior" && (
            <BehaviorTab config={localConfig} updateConfig={updateConfig} />
          )}
          {activeTab === "voice-input" && (
            <VoiceTab config={localConfig} updateConfig={updateConfig} />
          )}
          {activeTab === "voice-output" && (
            <VoiceOutputTab config={localConfig} updateConfig={updateConfig} />
          )}
          {activeTab === "local" && (
            <LocalAITab config={localConfig} updateConfig={updateConfig} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                isDirty
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS (Import from separate files)
// ============================================================================

import { ConnectionTab } from "./AISettingsHub/ConnectionTab";
import { ModelsTab } from "./AISettingsHub/ModelsTab";
import { BehaviorTab } from "./AISettingsHub/BehaviorTab";
import { VoiceTab } from "./AISettingsHub/VoiceTab";
import { VoiceOutputTab } from "./AISettingsHub/VoiceOutputTab";
import { LocalAITab } from "./AISettingsHub/LocalAITab";
