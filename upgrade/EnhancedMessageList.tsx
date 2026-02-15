import React, { useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";

interface Message {
  id: string;
  role: "user" | "model" | "assistant";
  content: string;
  timestamp: number;
  isLoading?: boolean;
  toolCalls?: any[];
  image?: string;
  error?: boolean;
}

interface EnhancedMessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onRetry?: () => void;
  onRegenerate?: () => void;
}

export const EnhancedMessageList: React.FC<EnhancedMessageListProps> = ({
  messages,
  isLoading = false,
  onRetry,
  onRegenerate,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center chat-empty-state">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Welcome Header */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-br from-purple-600/20 to-cyan-600/20 rounded-3xl blur-2xl -z-10" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white">
              Welcome to G-Studio AI
            </h2>
            <p className="text-slate-400 text-lg">
              Your intelligent coding assistant powered by advanced AI
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/20 hover:border-blue-500/40 transition-all group cursor-pointer chat-empty-card">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-600/20 group-hover:bg-blue-600/30 transition-colors">
                  <svg
                    className="w-6 h-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Write Code
                  </h3>
                  <p className="text-xs text-slate-400">
                    Generate any code in seconds
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-green-600/10 to-emerald-600/10 border border-green-500/20 hover:border-green-500/40 transition-all group cursor-pointer chat-empty-card">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-600/20 group-hover:bg-green-600/30 transition-colors">
                  <svg
                    className="w-6 h-6 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Explain Code
                  </h3>
                  <p className="text-xs text-slate-400">
                    Understand any codebase
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/20 hover:border-orange-500/40 transition-all group cursor-pointer chat-empty-card">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-600/20 group-hover:bg-orange-600/30 transition-colors">
                  <svg
                    className="w-6 h-6 text-orange-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Fix Bugs
                  </h3>
                  <p className="text-xs text-slate-400">
                    Debug and resolve errors
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group cursor-pointer chat-empty-card">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-600/20 group-hover:bg-purple-600/30 transition-colors">
                  <svg
                    className="w-6 h-6 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Optimize
                  </h3>
                  <p className="text-xs text-slate-400">Improve performance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Start Prompt */}
          <div className="mt-8 p-6 rounded-xl bg-slate-800/30 border border-white/10">
            <p className="text-sm text-slate-400 mb-3">Try asking:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-white/10 rounded-lg text-xs text-slate-300 transition-colors">
                "Write a React component"
              </button>
              <button className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-white/10 rounded-lg text-xs text-slate-300 transition-colors">
                "Explain this algorithm"
              </button>
              <button className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-white/10 rounded-lg text-xs text-slate-300 transition-colors">
                "Fix my TypeScript errors"
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto chat-scrollbar chat-message-list smooth-scroll"
    >
      <div className="max-w-4xl mx-auto space-y-1">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLatest={index === messages.length - 1}
            onRetry={onRetry}
            onRegenerate={onRegenerate}
            isLastAssistant={
              index === messages.length - 1 &&
              (message.role === "model" || message.role === "assistant")
            }
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
