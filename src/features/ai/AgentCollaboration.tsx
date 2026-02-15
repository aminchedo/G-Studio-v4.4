import React, { useState, useEffect } from "react";
import {
  Code2,
  Shield,
  Layers,
  Briefcase,
  Check,
  Loader2,
  MessageSquare,
  Clock,
  Sparkles,
  Users,
  Zap,
  Activity,
} from "lucide-react";
import { Agent } from "@/mcp/runtime/types";

const AgentWorkflowRole = {
  ARCHITECT: "architect",
  CODER: "coder",
  REVIEWER: "reviewer",
  DEBUGGER: "debugger",
  DOCUMENTER: "documenter",
} as const;
type AgentWorkflowRole =
  (typeof AgentWorkflowRole)[keyof typeof AgentWorkflowRole];

interface AgentCollaborationProps {
  onAgentsChange?: (roles: AgentWorkflowRole[]) => void;
  activeAgents?: AgentWorkflowRole[];
  isOpen?: boolean;
  onClose?: () => void;
}

export const AgentCollaboration: React.FC<AgentCollaborationProps> = ({
  onAgentsChange,
  activeAgents = [],
}) => {
  const [agents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<AgentWorkflowRole>>(
    new Set(activeAgents),
  );
  const [conversationCount, setConversationCount] = useState(0);

  useEffect(() => {
    onAgentsChange?.(Array.from(selectedAgents));
  }, [selectedAgents, onAgentsChange]);

  const toggleAgent = (role: AgentWorkflowRole) => {
    setSelectedAgents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedAgents(new Set(agents.map((a) => a.id as AgentWorkflowRole)));
  };

  const selectNone = () => {
    setSelectedAgents(new Set());
  };

  const getAgentIcon = (iconName: string) => {
    switch (iconName) {
      case "Code2":
        return <Code2 size={20} />;
      case "Shield":
        return <Shield size={20} />;
      case "Layers":
        return <Layers size={20} />;
      case "Briefcase":
        return <Briefcase size={20} />;
      default:
        return <Users size={20} />;
    }
  };

  const getWorkflowOrder = () => {
    const order: Agent[] = [];

    if (selectedAgents.has(AgentWorkflowRole.ARCHITECT)) {
      order.push(agents.find((a) => a.id === AgentWorkflowRole.ARCHITECT)!);
    }
    if (selectedAgents.has(AgentWorkflowRole.CODER)) {
      order.push(agents.find((a) => a.id === AgentWorkflowRole.CODER)!);
    }
    if (selectedAgents.has(AgentWorkflowRole.REVIEWER)) {
      order.push(agents.find((a) => a.id === AgentWorkflowRole.REVIEWER)!);
    }
    if (selectedAgents.has(AgentWorkflowRole.DEBUGGER)) {
      order.push(agents.find((a) => a.id === AgentWorkflowRole.DEBUGGER)!);
    }
    if (selectedAgents.has(AgentWorkflowRole.DOCUMENTER)) {
      order.push(agents.find((a) => a.id === AgentWorkflowRole.DOCUMENTER)!);
    }

    return order;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="p-6 bg-slate-950 border-b border-slate-800/60 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg text-slate-100 tracking-tight">
                Agent Collaboration
              </h2>
              <p className="text-sm text-slate-400">
                Select AI agents to work together
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs text-purple-300 bg-purple-900/30 hover:bg-purple-900/50 rounded-lg transition-colors border border-purple-700/40"
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-700/60"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg">
            <Activity size={16} className="text-purple-400" />
            <span className="text-sm text-slate-200">
              {selectedAgents.size} Active
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg">
            <MessageSquare size={16} className="text-blue-400" />
            <span className="text-sm text-slate-200">
              {conversationCount} Conversations
            </span>
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="flex-1 overflow-auto p-6 bg-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {agents.map((agent) => {
            const isSelected = selectedAgents.has(
              agent.id as AgentWorkflowRole,
            );

            return (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id as AgentWorkflowRole)}
                className={`relative group p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                  isSelected
                    ? "bg-gradient-to-br from-purple-600/40 to-blue-600/40 border-purple-500/60 text-white shadow-lg scale-105"
                    : "border-slate-700/60 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800/80 text-slate-300"
                }`}
              >
                {/* Selection Indicator */}
                <div
                  className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-emerald-500 border-white shadow-lg"
                      : "border-slate-600 bg-slate-700/60"
                  }`}
                >
                  {isSelected && (
                    <Check size={14} className="text-white" strokeWidth={3} />
                  )}
                </div>

                {/* Agent Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all ${
                    isSelected
                      ? "bg-white/20 shadow-lg scale-110"
                      : "bg-slate-700/60 group-hover:bg-slate-700/80"
                  }`}
                >
                  <div className={isSelected ? "text-white" : "text-slate-300"}>
                    {getAgentIcon(agent.icon)}
                  </div>
                </div>

                {/* Agent Info */}
                <h3
                  className={`text-lg mb-1 ${isSelected ? "text-white" : "text-slate-200"}`}
                >
                  {agent.name}
                </h3>
                <p
                  className={`text-sm mb-3 ${isSelected ? "text-white/90" : "text-slate-400"}`}
                >
                  {agent?.role ?? ""}
                </p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.slice(0, 3).map((capability) => (
                    <span
                      key={capability}
                      className={`px-2 py-1 rounded-md text-xs transition-all ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-700/60 text-slate-300"
                      }`}
                    >
                      {capability}
                    </span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="px-2 py-1 rounded-md text-xs bg-slate-700/60 text-slate-400">
                      +{agent.capabilities.length - 3}
                    </span>
                  )}
                </div>

                {/* Active Indicator */}
                {isSelected && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-t-2xl" />
                )}
              </button>
            );
          })}
        </div>

        {/* Workflow Visualization */}
        {selectedAgents.size > 0 && (
          <div className="mt-6 p-6 bg-slate-800/60 rounded-2xl border border-slate-700/60 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-yellow-400" />
              <h3 className="text-sm text-slate-200">Workflow Order</h3>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {getWorkflowOrder().map((agent, index) => (
                <React.Fragment key={agent.id}>
                  <div className="flex flex-col items-center gap-2 min-w-[120px]">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg bg-slate-700/60">
                      <div className="text-purple-400">
                        {getAgentIcon(agent.icon)}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-200">{agent.name}</p>
                      <p className="text-[10px] text-slate-400">
                        Step {index + 1}
                      </p>
                    </div>
                  </div>

                  {index < getWorkflowOrder().length - 1 && (
                    <div className="flex items-center">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-slate-600 to-slate-500" />
                      <div className="w-2 h-2 rounded-full bg-slate-500 -ml-1" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-4 p-4 bg-slate-800/40 rounded-xl border border-purple-700/40">
              <div className="flex items-start gap-3">
                <Sparkles
                  size={16}
                  className="text-purple-400 mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-sm text-purple-300 mb-1">
                    Collaborative AI Workflow
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedAgents.size === 1
                      ? "Single agent will handle all tasks independently"
                      : `${selectedAgents.size} agents will work together, each contributing their expertise`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {selectedAgents.size === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Users size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg text-slate-200 mb-2">No Agents Selected</h3>
            <p className="text-sm text-slate-400 max-w-sm">
              Select one or more AI agents to enable collaborative development.
              Each agent brings unique expertise to your project.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-slate-950 border-t border-slate-800/60">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>Agents remember conversation history</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={14} />
            <span>Real-time collaboration enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
