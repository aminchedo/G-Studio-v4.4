/**
 * Chat panel header – Morpheus Glass style, larger logo & text, attractive gradient.
 */

import React from "react";
import { Sparkles, Loader2, MessageCircle } from "lucide-react";

interface ChatPanelHeaderProps {
  agentConnected?: boolean;
  mcpToolsCount?: number;
  currentAIMode?: string;
  isProcessing?: boolean;
  isListening?: boolean;
  onAgentDialog?: () => void;
  onVoiceToggle?: () => void;
}

export const ChatPanelHeader: React.FC<ChatPanelHeaderProps> = ({
  isProcessing = false,
  isListening = false,
  onVoiceToggle,
}) => {
  return (
    <header className="chat-header-bar shrink-0 w-full px-3 sm:px-4 py-3 sm:py-4 border-b border-white/5 bg-transparent">
      <div className="chat-header-morpheus w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl min-h-[3.5rem]">
        {/* Left: G Studio – larger logo & text */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400/90 to-sky-600/90 flex items-center justify-center shrink-0 border border-white/25 shadow-lg shadow-sky-500/20">
            <Sparkles className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-white truncate text-lg tracking-tight">
            G Studio
          </span>
        </div>

        {/* Right: processing + chat (voice) */}
        <div className="flex items-center gap-2 shrink-0">
          {isProcessing && (
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30">
              <Loader2
                className="w-4 h-4 text-blue-400 animate-spin"
                strokeWidth={2}
              />
            </div>
          )}
          {onVoiceToggle && (
            <button
              type="button"
              onClick={onVoiceToggle}
              className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 active:scale-95 voice-header-btn ${
                isListening
                  ? "bg-teal-500/35 border-teal-400/50 text-teal-100 shadow-md shadow-teal-500/20 voice-mic-listening"
                  : "bg-white/5 border-white/10 text-teal-400/90 hover:bg-teal-500/15 hover:text-teal-200 hover:border-teal-400/25 voice-mic-idle"
              }`}
              title="Voice / Speech to text"
            >
              <MessageCircle
                className="w-5 h-5 voice-mic-icon"
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
