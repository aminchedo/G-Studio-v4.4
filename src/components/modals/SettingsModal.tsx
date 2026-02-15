import React, { useEffect } from "react";
import {
  X,
  Check,
  Cpu,
  Zap,
  Shield,
  Sparkles,
  ChevronRight,
  Settings,
  Activity,
  RotateCcw,
} from "lucide-react";
import { ModelId, ModelOption } from "@/types";
import { SUPPORTED_MODELS } from "@/constants";
import { LocalAISettings } from "@/components/ai/LocalAISettings";
import { LocalAITestPanel } from "@/components/ai/LocalAITestPanel";
import { SystemStatusPanel } from "@/components/panels/SystemStatusPanel";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel?: ModelId;
  onSelectModel?: (id: ModelId) => void;
  theme?: 'dark' | 'light';
  onThemeChange?: (theme: 'dark' | 'light') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  theme,
  onThemeChange,
}) => {
  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 backdrop-blur-md bg-black/50"
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />
      <div
        className="relative rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10 w-full max-w-2xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1E1E2E",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          animation:
            "fadeIn 0.2s ease-out, slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md"
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                boxShadow: "0 4px 14px rgba(167, 139, 250, 0.4)",
              }}
            >
              <Cpu strokeWidth={1.5} className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">System Config</h2>
              <p className="text-[10px] text-slate-400">
                Environment & model settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X strokeWidth={1.5} className="w-5 h-5" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(148, 163, 184, 0.2) transparent",
          }}
        >
          <section className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles strokeWidth={1.5} className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Model Selection
                  </h3>
                  <p className="text-xs text-slate-400">Choose your AI model</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {SUPPORTED_MODELS.map((model: ModelOption) => (
                <button
                  key={model.id}
                  onClick={() => onSelectModel && onSelectModel(model.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    selectedModel === model.id
                      ? "bg-purple-500/10 border-purple-500/40 ring-1 ring-purple-500/20"
                      : "bg-slate-800/80 border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedModel === model.id ? "bg-purple-600 border-purple-500 text-white" : "bg-slate-700 border-slate-600"}`}
                  >
                    {selectedModel === model.id && (
                      <Check strokeWidth={3} className="w-2.5 h-2.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm font-medium block truncate ${selectedModel === model.id ? "text-purple-300" : "text-slate-200"}`}
                    >
                      {model.name}
                    </span>
                    <p className="text-xs text-slate-400 truncate">
                      {model.description}
                    </p>
                  </div>
                  {selectedModel === model.id && (
                    <span className="text-[9px] bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/40 shrink-0">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Settings strokeWidth={1.5} className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Advanced</h3>
                  <p className="text-xs text-slate-400">Local AI & options</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <LocalAISettings />
            </div>
          </section>

          <section className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Cpu strokeWidth={1.5} className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Test Local Model
                  </h3>
                  <p className="text-xs text-slate-400">
                    LM Studio & inference
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <LocalAITestPanel />
            </div>
          </section>

          <section className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Activity strokeWidth={1.5} className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    System Status
                  </h3>
                  <p className="text-xs text-slate-400">Environment health</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <SystemStatusPanel />
            </div>
          </section>

          <section className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Zap strokeWidth={1.5} className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Secure Context
                  </h3>
                  <p className="text-xs text-slate-400">Privacy & encryption</p>
                </div>
              </div>
            </div>
            <div className="p-4 relative">
              <div className="absolute -top-4 -right-4 opacity-[0.06]">
                <Shield
                  strokeWidth={0.5}
                  className="w-24 h-24 text-slate-300"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed relative z-10">
                Your workspace data is processed locally within the browser
                context. Communications with the Gemini API are secured via
                industry-standard encryption. No session data persists after
                environment reset.
              </p>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-slate-900/50 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              Apply Changes
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
};
