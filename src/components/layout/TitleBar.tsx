/**
 * Custom title bar - Figma-style minimal branding and window controls.
 * Window controls only active in Electron; in browser they are no-ops.
 */

import React from "react";
import { Sparkles, Minus, Square, X } from "lucide-react";

declare global {
  interface Window {
    electron?: {
      minimize?: () => void;
      maximize?: () => void;
      close?: () => void;
    };
  }
}

export const TitleBar: React.FC = () => {
  const handleMinimize = () => window.electron?.minimize?.();
  const handleMaximize = () => window.electron?.maximize?.();
  const handleClose = () => window.electron?.close?.();

  const isElectron = typeof window !== "undefined" && !!window.electron;

  return (
    <div
      className="h-11 bg-gradient-to-b from-[#36393F] to-[#2C2F33] border-b border-[#3D4349] flex items-center justify-between px-4 select-none shrink-0"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* App Brand - logo and name only */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B8DEF] to-[#4A7ADE] flex items-center justify-center shadow-lg shrink-0">
          <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-[#DCDDDE] tracking-tight">
          J Studio
        </span>
      </div>

      {/* Window Controls - only in Electron */}
      {isElectron && (
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={handleMinimize}
            className="w-12 h-8 flex items-center justify-center hover:bg-white/5 transition-colors rounded"
            title="Minimize"
          >
            <Minus className="w-4 h-4 text-[#96989D]" />
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            className="w-12 h-8 flex items-center justify-center hover:bg-white/5 transition-colors rounded"
            title="Maximize"
          >
            <Square className="w-3.5 h-3.5 text-[#96989D]" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-12 h-8 flex items-center justify-center hover:bg-red-500/90 hover:text-white transition-colors rounded"
            title="Close"
          >
            <X className="w-4 h-4 text-[#96989D]" />
          </button>
        </div>
      )}
    </div>
  );
};
