// MultiAgentStatus.tsx
import React, { Component, ReactNode } from "react";
import {
  Layers,
  Code2,
  Shield,
  Bug,
  FileText,
  Sparkles,
  Activity,
} from "lucide-react";
import { Agent } from "@/mcp/runtime/types";
import { McpConnectionStatus } from "./McpConnectionStatus";

interface MultiAgentStatusProps {
  activeAgents?: Agent[];
  agents?: Agent[];
  currentAgent?: Agent | null;
  isProcessing?: boolean;
  onAgentClick?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary wrapper for MultiAgentStatus
 */
class MultiAgentStatusErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[MultiAgentStatus Error]", error, info);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 bg-red-100 text-red-700 rounded-md border border-red-300">
          <p className="font-semibold">Error displaying agents</p>
          <p className="text-xs">{this.state.error?.message}</p>
          <button
            onClick={this.resetError}
            className="mt-2 px-2 py-1 bg-red-700 text-white rounded text-xs hover:bg-red-800 transition"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Returns a React icon component based on the agent's icon name
 */
const getAgentIcon = (iconName?: string) => {
  const icons: Record<string, React.ReactNode> = {
    Layers: <Layers size={16} />,
    Code2: <Code2 size={16} />,
    Shield: <Shield size={16} />,
    Bug: <Bug size={16} />,
    FileText: <FileText size={16} />,
  };
  return iconName && icons[iconName] ? icons[iconName] : <Sparkles size={16} />;
};

/**
 * Returns Tailwind CSS classes for agent color styling
 */
const getAgentColor = (color?: string): string => {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-300",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
    amber: "bg-amber-100 text-amber-700 border-amber-300",
    red: "bg-red-100 text-red-700 border-red-300",
    purple: "bg-purple-100 text-purple-700 border-purple-300",
  };
  return color && colors[color]
    ? colors[color]
    : "bg-gray-100 text-gray-700 border-gray-300";
};

/**
 * Core MultiAgentStatus Component
 */
const MultiAgentStatusInner: React.FC<MultiAgentStatusProps> = ({
  activeAgents = [],
  currentAgent,
  isProcessing = false,
}) => {
  if (!Array.isArray(activeAgents) || activeAgents.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100 border-y border-slate-200">
      {/* Status Label */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <Activity
          size={14}
          className={isProcessing ? "animate-pulse text-emerald-600" : ""}
        />
        <span>Active Agents:</span>
      </div>

      {/* Active Agents */}
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

              {/* Processing indicator */}
              {isActive && isProcessing && (
                <div className="ml-1 flex gap-0.5">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-1 h-1 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current agent processing text */}
      {isProcessing && currentAgent && (
        <div className="ml-auto text-xs font-medium text-slate-600 italic animate-pulse">
          {currentAgent.name} is working...
        </div>
      )}
    </div>
  );
};

/**
 * Public MultiAgentStatus Component with built-in ErrorBoundary
 */
export const MultiAgentStatus: React.FC<MultiAgentStatusProps> = (props) => {
  return (
    <MultiAgentStatusErrorBoundary>
      <MultiAgentStatusInner {...props} />
    </MultiAgentStatusErrorBoundary>
  );
};

/**
 * Combined Status Component - MultiAgent + MCP
 */
export const CombinedStatus: React.FC<MultiAgentStatusProps> = (props) => {
  return (
    <MultiAgentStatusErrorBoundary>
      <div className="flex flex-col gap-1">
        <MultiAgentStatusInner {...props} />
        <McpConnectionStatus compact={true} />
      </div>
    </MultiAgentStatusErrorBoundary>
  );
};
