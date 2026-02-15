import React, { useState, useEffect } from "react";
import {
  Check,
  Layers,
  Code2,
  Shield,
  Briefcase,
  X,
  Zap,
  Users,
} from "lucide-react";
import { Agent } from "@/mcp/runtime/types";

interface AgentSelectorProps {
  selectedAgents: string[];
  onChange: (agentIds: string[]) => void;
  onClose?: () => void;
}

const getIcon = (iconName: string) => {
  const iconMap: Record<string, any> = {
    Layers,
    Code2,
    Shield,
    Briefcase,
  };
  return iconMap[iconName] || Code2;
};

const getColorClasses = (color: string, isSelected: boolean) => {
  const colors: Record<
    string,
    {
      bg: string;
      border: string;
      text: string;
      hover: string;
      selected: string;
    }
  > = {
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      text: "text-indigo-700",
      hover: "hover:border-indigo-400",
      selected: "bg-indigo-600 border-indigo-600 text-white",
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      hover: "hover:border-emerald-400",
      selected: "bg-emerald-600 border-emerald-600 text-white",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      hover: "hover:border-amber-400",
      selected: "bg-amber-600 border-amber-600 text-white",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      hover: "hover:border-red-400",
      selected: "bg-red-600 border-red-600 text-white",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      hover: "hover:border-purple-400",
      selected: "bg-purple-600 border-purple-600 text-white",
    },
  };

  const colorSet = colors[color] || colors["indigo"];
  return isSelected
    ? colorSet.selected
    : `${colorSet.bg} ${colorSet.border} ${colorSet.text} ${colorSet.hover}`;
};

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgents,
  onChange,
  onClose,
}) => {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const allAgents: Agent[] = [];

  // ESC key handler
  useEffect(() => {
    if (!onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleAgent = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      // Don't allow deselecting if it's the last one
      if (selectedAgents.length === 1) return;
      onChange(selectedAgents.filter((id) => id !== agentId));
    } else {
      onChange([...selectedAgents, agentId]);
    }
  };

  const selectAll = () => {
    onChange(allAgents.map((a) => a.id));
  };

  const selectNone = () => {
    onChange(["coder"]); // Always keep at least coder
  };

  const selectPreset = (preset: "solo" | "pair" | "team" | "full") => {
    switch (preset) {
      case "solo":
        onChange(["coder"]);
        break;
      case "pair":
        onChange(["architect", "coder"]);
        break;
      case "team":
        onChange(["architect", "coder", "reviewer"]);
        break;
      case "full":
        onChange(allAgents.map((a) => a.id));
        break;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose || undefined}
    >
      <div
        className="bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-800/80 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl text-slate-100">AI Agent Team</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select which AI agents will collaborate on your tasks
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Presets */}
        <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider">
              Quick Select:
            </span>
            <button
              onClick={() => selectPreset("solo")}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:border-purple-500/60 hover:bg-purple-900/30 transition-all"
            >
              Solo (1)
            </button>
            <button
              onClick={() => selectPreset("pair")}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:border-purple-500/60 hover:bg-purple-900/30 transition-all"
            >
              Pair (2)
            </button>
            <button
              onClick={() => selectPreset("team")}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:border-purple-500/60 hover:bg-purple-900/30 transition-all"
            >
              Team (3)
            </button>
            <button
              onClick={() => selectPreset("full")}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:border-purple-500/60 hover:bg-purple-900/30 transition-all"
            >
              Full Team (4)
            </button>
            <div className="flex-1" />
            <button
              onClick={selectNone}
              className="px-3 py-1.5 text-xs rounded-lg text-slate-400 hover:bg-slate-800/60 transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAgents.map((agent) => {
              const isSelected = selectedAgents.includes(agent.id);
              const IconComponent = getIcon(agent.icon);
              const isHovered = hoveredAgent === agent.id;

              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  onMouseEnter={() => setHoveredAgent(agent.id)}
                  onMouseLeave={() => setHoveredAgent(null)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                    isSelected
                      ? "bg-gradient-to-br from-purple-600/40 to-blue-600/40 border-purple-500/60 text-white shadow-lg"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/80"
                  } ${isHovered ? "scale-105 shadow-xl" : "shadow-md"}`}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shadow-lg border border-white/30">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      isSelected ? "bg-white/20" : "bg-slate-700/60"
                    }`}
                  >
                    <IconComponent
                      className={`w-6 h-6 ${
                        isSelected ? "text-white" : "text-slate-300"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <h3
                    className={`text-base mb-1 ${
                      isSelected ? "text-white" : "text-slate-200"
                    }`}
                  >
                    {agent.name}
                  </h3>
                  <p
                    className={`text-xs mb-2 ${
                      isSelected ? "text-white/90" : "text-slate-400"
                    }`}
                  >
                    {agent.role}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {agent.capabilities.slice(0, 3).map((cap, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-700/60 text-slate-300"
                        }`}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  {/* Hover Effect */}
                  {isHovered && !isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800/60 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400">
              <span className="text-slate-200">{selectedAgents.length}</span>{" "}
              agent(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                Apply Selection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
