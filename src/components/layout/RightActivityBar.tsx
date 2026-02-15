/**
 * Right Activity Bar - Vertical tabs for right-side panels
 * Includes: G Studio (Chat), Preview, Inspector, Vcode (Speak to Write Code)
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
  isLast?: boolean;
}

const PanelTab: React.FC<PanelTabProps> = ({
  icon,
  label,
  active,
  onClick,
  tooltip,
  isLast = false,
}) => {
  return (
    <div className="relative group/panel flex-1 min-h-0 flex flex-col shrink-0">
      <button
        onClick={onClick}
        title={tooltip}
        className={`
          flex flex-col items-center justify-center
          w-full flex-1 min-h-[52px] rounded-none
          transition-all duration-200 relative overflow-hidden cursor-pointer
          border-l border-white/[0.06]
          ${!isLast ? "border-b border-white/[0.04]" : ""}
          ${
            active
              ? "bg-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "bg-slate-900/95 hover:bg-slate-800/80 border-transparent hover:border-white/[0.05]"
          }
        `}
      >
        {/* Icon + label with padding, crisp white when active */}
        <div
          className="flex items-center justify-center gap-2 flex-shrink-0 px-3 py-2.5 transition-transform duration-200 group-hover/panel:scale-[1.02]"
          style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
        >
          <div
            className={`flex-shrink-0 [stroke-linecap:round] [stroke-linejoin:round] ${
              active
                ? "text-white"
                : "text-slate-400 group-hover/panel:text-slate-200"
            }`}
          >
            {icon}
          </div>
          <span
            className={`
              text-xs font-semibold uppercase tracking-widest whitespace-nowrap select-none flex-shrink-0
              antialiased
              ${active ? "text-white" : "text-slate-400 group-hover/panel:text-slate-200"}
            `}
          >
            {label}
          </span>
        </div>
      </button>

      {/* Tooltip */}
      <div className="absolute right-full mr-2 px-2.5 py-1.5 bg-slate-800/95 backdrop-blur-sm border border-white/[0.08] text-white text-xs font-medium rounded-md opacity-0 group-hover/panel:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 translate-x-[8px] group-hover/panel:translate-x-0 shadow-xl">
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
    <div className="fixed right-0 top-[150px] h-[calc(100%-150px)] z-30 flex items-start">
      {/* Activity Bar – compact padding, consistent with left sidebar */}
      <div className="w-11 bg-slate-900/95 backdrop-blur-md border-l border-white/[0.06] flex flex-col items-stretch shrink-0 h-full">
        <div className="flex flex-col flex-1 min-h-0">
          <PanelTab
            icon={
              <MessageSquare
                className="w-5 h-5"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
            label="G STUDIO"
            active={chatVisible}
            onClick={onToggleChat}
            tooltip="G Studio Assistant"
            isLast={false}
          />
          <PanelTab
            icon={
              <Eye
                className="w-5 h-5"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
            label="PREVIEW"
            active={previewVisible}
            onClick={onTogglePreview}
            tooltip="Live Preview"
            isLast={false}
          />
          <PanelTab
            icon={
              <Activity
                className="w-5 h-5"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
            label="INSPECTOR"
            active={inspectorVisible}
            onClick={onToggleInspector}
            tooltip="Code Inspector"
            isLast={false}
          />
          {onToggleVcode && (
            <PanelTab
              icon={
                <Mic
                  className="w-5 h-5"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              }
              label="VCODE"
              active={vcodeVisible}
              onClick={onToggleVcode}
              tooltip="Speak to write code – voice + Gemini"
              isLast
            />
          )}
        </div>
      </div>
    </div>
  );
};
