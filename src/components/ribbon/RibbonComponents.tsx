import React, { useState, useEffect } from "react";
import { sendAgentTelemetry } from "@/utils/agentTelemetry";

// RibbonGroup Component
interface RibbonGroupProps {
  label: string;
  isExpanded: boolean;
  children: React.ReactNode;
}

export const RibbonGroup: React.FC<RibbonGroupProps> = ({
  label,
  children,
  isExpanded,
}) => {
  return (
    <div
      className={`flex flex-col items-start gap-2 rounded-lg px-2.5 py-2 ${!isExpanded ? "items-center py-2.5" : ""}`}
    >
      <div
        className={`flex justify-center w-full min-h-[14px] ${!isExpanded ? "hidden" : ""}`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
          {label}
        </span>
      </div>
      <div
        className={`flex items-center justify-center gap-2 ${!isExpanded ? "hidden" : ""}`}
      >
        {children}
      </div>
    </div>
  );
};

// RibbonDivider Component – distinct vertical separator
export const RibbonDivider = () => (
  <div className="relative h-12 w-px shrink-0 self-center flex items-center justify-center">
    <div className="absolute inset-0 w-px bg-gradient-to-b from-transparent via-slate-600/60 to-transparent" />
    <div className="absolute inset-0 w-px bg-slate-600/40" />
  </div>
);

// RibbonButton Component
interface RibbonButtonProps {
  icon: any;
  label: string;
  onClick?: () => void;
  color?: string;
  active?: boolean;
  inactive?: boolean;
  isExpanded: boolean;
  title?: string;
  dataAction?: string; // For runtime verification
}

export const RibbonButton: React.FC<RibbonButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  color = "text-ocean-900/80",
  active,
  inactive = false,
  isExpanded,
  title,
  dataAction,
}) => {
  // Generate accessible aria-label from label and state
  const ariaLabel = inactive
    ? `${label} (disabled)`
    : active
      ? `${label} (active)`
      : label;
  const [isPressed, setIsPressed] = useState(false);
  const isEnabled = !inactive;

  // Determine if button should have special enabled effect (like Save button with emerald color)
  const hasEnabledEffect = isEnabled && !active && color?.includes("emerald");

  const iconProps = {
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `transition-all duration-200 w-5 h-5 ${inactive ? "text-slate-400" : "text-white"}`,
  };

  const handleClick = (e: React.MouseEvent) => {
    // #region agent log
    sendAgentTelemetry({
      location: "RibbonComponents.tsx:64",
      message: "RibbonButton clicked",
      data: { label, inactive, active },
      hypothesisId: "J",
    });
    // #endregion
    if (inactive || !onClick) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsPressed(true);
    onClick();
    setTimeout(() => setIsPressed(false), 150);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={active ? "true" : "false"}
      aria-disabled={inactive ? "true" : "false"}
      data-action={dataAction}
      title={
        title ||
        (isExpanded
          ? label
          : inactive
            ? "Inactive - Set API key first"
            : active
              ? "Active - Click to stop"
              : "Ready - Click to start")
      }
      className={`relative flex items-center justify-center p-2 rounded-xl transition-all duration-200 group/btn min-w-[38px] min-h-[38px] overflow-hidden ${
        inactive || !onClick
          ? "opacity-80 cursor-not-allowed bg-slate-800/30"
          : "cursor-pointer"
      } ${
        inactive || !onClick
          ? ""
          : active
            ? "bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-900/40"
            : hasEnabledEffect
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg shadow-emerald-900/30"
              : isPressed
                ? "scale-95 bg-slate-700/60"
                : "bg-slate-800/40 hover:bg-slate-700/50"
      }`}
      style={{
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        pointerEvents: inactive || !onClick ? "none" : "auto",
      }}
    >
      {(active || hasEnabledEffect) && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      {isPressed && !active && !hasEnabledEffect && (
        <div className="absolute inset-0 bg-slate-600/30 rounded-xl pointer-events-none" />
      )}
      <div
        className="relative z-30 transition-transform duration-200 group-hover/btn:scale-105"
        style={{
          filter:
            "drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 0 1px rgba(255,255,255,0.12))",
        }}
      >
        <Icon {...iconProps} />
      </div>
    </button>
  );
};

// McpToolButton Component
interface McpToolButtonProps {
  tool: string;
  icon: any;
  label: string;
  permission: "read" | "write" | "execute" | "delete";
  onClick: () => void;
  status?: "running" | "success" | "error";
  safeMode?: boolean;
  isExpanded: boolean;
  enabled?: boolean;
  onToggleAccess?: () => void;
}

export const McpToolButton: React.FC<McpToolButtonProps> = ({
  tool,
  icon: Icon,
  label,
  permission,
  onClick,
  status,
  safeMode,
  isExpanded,
  enabled = true,
  onToggleAccess,
}) => {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (confirming) {
      const t = setTimeout(() => setConfirming(false), 3000);
      return () => clearTimeout(t);
    }
  }, [confirming]);

  const handleClick = (e: React.MouseEvent) => {
    // #region agent log
    sendAgentTelemetry({
      location: "RibbonComponents.tsx:144",
      message: "McpToolButton clicked",
      data: { tool, label, enabled, permission, safeMode, confirming },
      hypothesisId: "K",
    });
    // #endregion
    // If tool is disabled, just toggle access (فعال کردن)
    if (!enabled) {
      e.preventDefault();
      onToggleAccess?.();
      return;
    }

    // If tool is enabled, execute it
    if (safeMode && permission === "delete") {
      if (!confirming) {
        setConfirming(true);
        return;
      }
    }
    onClick();
    setConfirming(false);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Right click to toggle access
    onToggleAccess?.();
  };

  const getColors = () => {
    if (confirming) return "bg-red-600 text-white shadow-md";
    if (status === "success") return "bg-emerald-600 text-white shadow-md";
    if (status === "error") return "bg-red-600 text-white shadow-md";

    if (!enabled) {
      return "bg-slate-800/30 border-slate-700/40 text-slate-400 opacity-85";
    }
    return "text-white";
  };

  return (
    <div className="relative group/tool">
      <button
        onClick={handleClick}
        onContextMenu={handleRightClick}
        title={
          enabled
            ? `${label} (Right-click to disable)`
            : `${label} (Click to enable)`
        }
        className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl transition-all relative overflow-hidden duration-200 min-w-[40px] ${getColors()} ${
          enabled && !status && !confirming
            ? "bg-slate-800/40 hover:bg-slate-700/50"
            : ""
        }`}
      >
        {status && (
          <div
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full transition-all duration-300 z-10 ring-2 ring-slate-900/80 ${
              status === "running"
                ? "bg-amber-500 animate-ping"
                : status === "success"
                  ? "bg-emerald-500"
                  : status === "error"
                    ? "bg-red-500"
                    : "bg-transparent"
            }`}
          />
        )}

        <div
          className="relative z-10 flex items-center justify-center transition-transform duration-200 group-hover/tool:scale-105"
          style={{
            filter:
              "drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 0 1px rgba(255,255,255,0.12))",
          }}
        >
          <Icon
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-5 h-5 transition-all duration-200 ${enabled && !confirming && !status ? "text-white" : "text-slate-300"}`}
          />
        </div>

        {/* Label - hidden when not expanded */}
        {isExpanded && (
          <span
            className={`relative z-10 text-[10px] leading-none mt-0.5 ${confirming || status ? "block" : "hidden"}`}
          >
            {confirming ? "Confirm?" : status ? label : label}
          </span>
        )}

        {/* Tooltip - Only show if not expanded (since label is hidden) */}
        {!isExpanded && (
          <div className="absolute -bottom-11 opacity-0 group-hover/tool:opacity-100 transition-opacity bg-slate-700 border border-slate-600 text-slate-200 text-[10px] px-3 py-2 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50 font-medium tracking-wide translate-y-2 group-hover/tool:translate-y-0 duration-200">
            {tool} • {permission.toUpperCase()}
          </div>
        )}
      </button>
    </div>
  );
};

// AgentTile Component
interface AgentTileProps {
  icon: any;
  label: string;
  value: string;
  theme: "emerald" | "ocean" | "indigo" | "slate";
  onClick: () => void;
  active?: boolean;
}

export const AgentTile: React.FC<AgentTileProps> = ({
  icon: Icon,
  label,
  value,
  theme,
  onClick,
  active,
}) => {
  const getColor = () => {
    if (theme === "emerald") return "from-emerald-600/40 to-green-600/40";
    if (theme === "ocean") return "from-purple-600/40 to-blue-600/40";
    if (theme === "indigo") return "from-indigo-600/40 to-purple-600/40";
    return "from-slate-600/40 to-slate-700/40";
  };

  const getBorderColor = () => {
    if (theme === "emerald") return "border-emerald-500/40";
    if (theme === "ocean") return "border-purple-500/40";
    if (theme === "indigo") return "border-indigo-500/40";
    return "border-slate-500/40";
  };

  const getShadowColor = () => {
    if (theme === "emerald") return "shadow-emerald-500/20";
    if (theme === "ocean") return "shadow-purple-500/20";
    if (theme === "indigo") return "shadow-indigo-500/20";
    return "shadow-slate-500/20";
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        sendAgentTelemetry({
          location: "RibbonComponents.tsx:262",
          message: "AgentTile clicked",
          data: { label, value, theme, active },
          hypothesisId: "L",
        });
        onClick();
      }}
      title={`${label}: ${value}`}
      className={`relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200 group/btn min-w-[42px] overflow-hidden cursor-pointer ${
        active
          ? `shadow-lg ${getShadowColor()} bg-gradient-to-br ${getColor()}`
          : "bg-slate-800/30 hover:bg-slate-700/50 active:scale-95"
      }`}
      style={{
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        pointerEvents: "auto",
      }}
    >
      {active && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      <div
        className="relative z-10 transition-transform duration-200 group-hover/btn:scale-105"
        style={{
          filter:
            "drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 0 1px rgba(255,255,255,0.12))",
        }}
      >
        <Icon
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-5 h-5 transition-all duration-200 ${active ? "text-white" : "text-slate-200"}`}
        />
      </div>
    </button>
  );
};
