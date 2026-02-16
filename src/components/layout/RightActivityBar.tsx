/**
 * Right Activity Bar - Vertical tabs for right-side panels
 * Enhanced with better spacing, sizing, and quality
 */

import React from "react";
import { Eye, Activity, MessageSquare, Mic } from "lucide-react";

interface RightActivityBarProps {
  chatVisible: boolean;
  previewVisible: boolean;
  inspectorVisible: boolean;
  monitorVisible?: boolean;
  vcodeVisible?: boolean;
  onToggleChat: () => void;
  onTogglePreview: () => void;
  onToggleInspector: () => void;
  onToggleMonitor?: () => void;
  onToggleVcode?: () => void;
  onClosePreview?: () => void;
  onCloseInspector?: () => void;
  onCloseMonitor?: () => void;
  onCloseVcode?: () => void;
}

interface PanelTabProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}

const PanelTab: React.FC<PanelTabProps> = ({
  icon,
  label,
  active,
  onClick,
  tooltip,
}) => {
  return (
    <div className="relative group/panel flex flex-col shrink-0">
      <button
        onClick={onClick}
        title={tooltip}
        className={`
          flex flex-col items-center justify-center
          w-full py-4 px-2 rounded-lg my-1.5 mx-1
          transition-all duration-200 relative overflow-hidden cursor-pointer
          ${
            active
              ? "bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 shadow-lg shadow-sky-500/20"
              : "bg-slate-800/50 hover:bg-slate-700/60 border border-white/5 hover:border-white/10"
          }
        `}
      >
        {/* Icon with better quality */}
        <div
          className={`flex items-center justify-center mb-1.5 ${
            active
              ? "text-sky-400"
              : "text-slate-400 group-hover/panel:text-slate-200"
          }`}
          style={{ 
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
          }}
        >
          {icon}
        </div>
        
        {/* Label */}
        <span
          className={`
            text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap select-none
            ${active ? "text-sky-400" : "text-slate-400 group-hover/panel:text-slate-200"}
          `}
        >
          {label}
        </span>
      </button>

      {/* Enhanced Tooltip */}
      <div className="absolute right-full mr-3 px-3 py-2 bg-slate-800/95 backdrop-blur-md border border-white/10 text-white text-sm font-medium rounded-lg opacity-0 group-hover/panel:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 translate-x-2 group-hover/panel:translate-x-0 shadow-2xl">
        {tooltip}
        <div className="absolute top-1/2 -right-1 -mt-1 border-4 border-transparent border-l-slate-800/95" />
      </div>
    </div>
  );
};

export const RightActivityBar: React.FC<RightActivityBarProps> = ({
  chatVisible,
  previewVisible,
  inspectorVisible,
  monitorVisible = false,
  vcodeVisible = false,
  onToggleChat,
  onTogglePreview,
  onToggleInspector,
  onToggleMonitor,
  onToggleVcode,
}) => {
  return (
    <div className="fixed right-0 top-[200px] bottom-0 z-30 flex items-stretch">
      {/* Activity Bar with improved spacing */}
      <div className="w-16 bg-slate-900/95 backdrop-blur-md border-l border-white/5 flex flex-col py-4 shadow-2xl">
        <div className="flex flex-col gap-2">
          <PanelTab
            icon={
              <MessageSquare
                className="w-6 h-6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
            label="Chat"
            active={chatVisible}
            onClick={onToggleChat}
            tooltip="G Studio Assistant"
          />
          <PanelTab
            icon={
              <Eye
                className="w-6 h-6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
            label="Preview"
            active={previewVisible}
            onClick={onTogglePreview}
            tooltip="Live Preview"
          />
          <PanelTab
            icon={
              <Activity
                className="w-6 h-6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
            label="Inspector"
            active={inspectorVisible}
            onClick={onToggleInspector}
            tooltip="Code Inspector"
          />
          {onToggleVcode && (
            <PanelTab
              icon={
                <Mic
                  className="w-6 h-6"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              }
              label="Vcode"
              active={vcodeVisible}
              onClick={onToggleVcode}
              tooltip="Voice Coding"
            />
          )}
        </div>
      </div>
    </div>
  );
};
