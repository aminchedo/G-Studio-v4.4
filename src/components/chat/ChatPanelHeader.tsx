/**
 * Chat Panel Header – Clean and minimal design
 */

import React from "react";
import { Sparkles, Loader2, MessageCircle, Mic } from "lucide-react";

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
  agentConnected = false,
  currentAIMode,
}) => {
  return (
    <header className="chat-header-bar shrink-0 w-full px-3 sm:px-4 py-3 sm:py-4 border-b border-white/5 bg-transparent">
      <div className="chat-header-morpheus w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl min-h-[3.5rem] relative overflow-hidden">
        {/* Animated Background Gradient */}
        <div 
          className="absolute inset-0 opacity-50" 
          style={{
            background: 'linear-gradient(90deg, rgba(14,165,233,0.1) 0%, rgba(168,85,247,0.1) 50%, rgba(236,72,153,0.1) 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradient-x 8s ease infinite'
          }}
        />
        
        {/* Left: G Studio */}
        <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400/90 via-sky-500/90 to-sky-600/90 flex items-center justify-center shrink-0 border border-white/25 shadow-2xl shadow-sky-500/30 transform hover:scale-105 transition-all duration-300">
              <Sparkles 
                className="w-6 h-6 text-white" 
                strokeWidth={2.5}
                style={{ animation: 'pulse 2s ease-in-out infinite' }}
              />
            </div>
            {agentConnected && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="font-bold text-white text-lg tracking-tight leading-tight">
              G Studio
            </span>
            {currentAIMode && (
              <span className="text-xs text-slate-400 font-medium">
                {currentAIMode}
              </span>
            )}
          </div>
        </div>

        {/* Right: Status */}
        <div className="flex items-center gap-2 shrink-0 relative z-10">
          {isProcessing && (
            <div className="group relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-lg blur-md" />
              <div className="relative p-2.5 rounded-lg bg-blue-500/20 border border-blue-400/40 backdrop-blur-sm">
                <Loader2
                  className="w-4 h-4 text-blue-300 animate-spin"
                  strokeWidth={2.5}
                />
              </div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
            </div>
          )}
          
          {onVoiceToggle && (
            <button
              type="button"
              onClick={onVoiceToggle}
              className={`relative flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-400/50 ${
                isListening
                  ? "bg-gradient-to-br from-teal-500/40 to-emerald-500/40 border-teal-400/60 text-teal-100 shadow-xl shadow-teal-500/30"
                  : "bg-white/5 border-white/10 text-teal-400/90 hover:bg-teal-500/15 hover:text-teal-200 hover:border-teal-400/30 hover:shadow-lg"
              }`}
              title="Voice / Speech to text"
            >
              {isListening ? (
                <>
                  <Mic className="w-5 h-5" strokeWidth={2.5} style={{ animation: 'pulse 1s ease-in-out infinite' }} />
                  <div className="absolute inset-0 rounded-xl border-2 border-teal-400/50 animate-ping" />
                </>
              ) : (
                <MessageCircle className="w-5 h-5" strokeWidth={2} />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default ChatPanelHeader;
