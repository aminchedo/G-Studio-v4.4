import React from "react";
import {
  Layers,
  Code2,
  Shield,
  Bug,
  FileText,
  Sparkles,
  Activity,
} from "lucide-react";
import { Agent } from "@/services/multiAgentService";
import { McpConnectionStatus } from "@/components/McpConnectionStatus";

interface MultiAgentStatusProps {
  activeAgents?: Agent[];
  agents?: Agent[];
  currentAgent?: Agent | null;
  isProcessing?: boolean;
  onAgentClick?: () => void;
}

const getAgentIcon = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    Layers: <Layers size={16} />,
    Code2: <Code2 size={16} />,
    Shield: <Shield size={16} />,
    Bug: <Bug size={16} />,
    FileText: <FileText size={16} />,
  };
  return icons[iconName] || <Sparkles size={16} />;
};

const getAgentColor = (color: string): string => {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-300",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
    amber: "bg-amber-100 text-amber-700 border-amber-300",
    red: "bg-red-100 text-red-700 border-red-300",
    purple: "bg-purple-100 text-purple-700 border-purple-300",
  };
  return colors[color] || "bg-gray-100 text-gray-700 border-gray-300";
};

export const MultiAgentStatus: React.FC<MultiAgentStatusProps> = ({
  activeAgents: activeAgentsProp,
  agents,
  currentAgent,
  isProcessing = false,
}) => {
  const activeAgents = activeAgentsProp ?? agents ?? [];
  if (!activeAgents.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100 border-y border-slate-200">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <Activity
          size={14}
          className={isProcessing ? "animate-pulse text-emerald-600" : ""}
        />
        <span>Active Agents:</span>
      </div>

      <div className="flex items-center gap-1.5">
        {activeAgents.map((agent) => {
          const isActive = currentAgent?.id === agent.id;
          const colorClass = getAgentColor(agent.color);

          return (
            <div
              key={agent.id}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold
                border transition-all duration-200
                ${colorClass}
                ${isActive ? "ring-2 ring-offset-1 scale-105 shadow-sm" : "opacity-60 hover:opacity-100"}
                ${isProcessing && isActive ? "animate-pulse" : ""}
              `}
              title={`${agent.name} - ${agent.role}`}
            >
              {getAgentIcon(agent.icon)}
              <span>{agent.name}</span>
              {isActive && isProcessing && (
                <div className="ml-1 flex gap-0.5">
                  <div
                    className="w-1 h-1 bg-current rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-1 h-1 bg-current rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-1 h-1 bg-current rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isProcessing && currentAgent && (
        <div className="ml-auto text-xs font-medium text-slate-600 italic animate-pulse">
          {currentAgent.name} is working...
        </div>
      )}
    </div>
  );
};

/**
 * Combined Status Component - Shows both Agents and MCP Connections
 */
export const CombinedStatus: React.FC<MultiAgentStatusProps> = (props) => {
  return (
    <>
      <MultiAgentStatus {...props} />
      <McpConnectionStatus compact={true} />
    </>
  );
};
