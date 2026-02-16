/**
 * G Studio - Chat Welcome Component
 * Clean and minimal design
 */

import React, { useState } from "react";
import {
  Sparkles,
  MessageCircle,
  Code2,
  Lightbulb,
  Bug,
  Wand2,
  Settings,
  ArrowRight,
} from "lucide-react";

export interface ChatWelcomeProps {
  isDarkMode?: boolean;
  hasApiKey?: boolean;
  onOpenSettings?: () => void;
  onSendMessage?: (message: string) => void;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  isDarkMode = true,
  hasApiKey = true,
  onOpenSettings,
  onSendMessage,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const suggestions = [
    {
      icon: Code2,
      text: "Create a React component",
      prompt: "Create a modern React component with TypeScript and Tailwind CSS",
    },
    {
      icon: Bug,
      text: "Help debug my code",
      prompt: "Help me debug and fix issues in my code",
    },
    {
      icon: Lightbulb,
      text: "Suggest improvements",
      prompt: "Analyze my code and suggest improvements for better quality and performance",
    },
    {
      icon: Wand2,
      text: "Refactor this function",
      prompt: "Refactor my code to make it cleaner, more maintainable, and efficient",
    },
  ];

  const handleSuggestionClick = (prompt: string) => {
    if (onSendMessage) {
      onSendMessage(prompt);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-8">
          <div className="relative">
            <div
              className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-2xl ${
                isDarkMode
                  ? "bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30"
                  : "bg-gradient-to-br from-red-100 to-orange-100 border border-red-200"
              }`}
            >
              <Settings
                className={`w-10 h-10 ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                style={{ animation: "spin 3s linear infinite" }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3
              className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              Welcome to G Studio
            </h3>
            <p
              className={`text-base leading-relaxed ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}
            >
              Configure your API key to unlock AI-assisted development
            </p>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className={`group w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 shadow-xl ${
                isDarkMode
                  ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white focus:ring-red-500/50 shadow-red-500/20"
                  : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white focus:ring-red-500/50 shadow-red-500/30"
              }`}
            >
              <span className="flex items-center justify-center gap-3">
                Configure API Key
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex items-center justify-center p-6 overflow-y-auto ${
        isDarkMode
          ? "bg-gradient-to-b from-transparent via-slate-900/10 to-slate-900/20"
          : "bg-gradient-to-b from-transparent via-gray-50/30 to-gray-50/50"
      }`}
    >
      <div className="text-center max-w-2xl w-full space-y-6">
        {/* Hero - Clean, no lightning bolt */}
        <div className="space-y-3">
          <div
            className={`relative w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-xl ${
              isDarkMode
                ? "bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30"
                : "bg-gradient-to-br from-sky-100 to-blue-100 border border-sky-200"
            }`}
          >
            <Sparkles
              className={`w-8 h-8 ${isDarkMode ? "text-sky-400" : "text-sky-600"}`}
            />
          </div>

          <h2
            className={`text-2xl font-bold tracking-tight ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Welcome to G Studio
          </h2>

          <p
            className={`text-sm leading-relaxed max-w-lg mx-auto ${
              isDarkMode ? "text-slate-400" : "text-gray-600"
            }`}
          >
            Your intelligent AI coding companion
          </p>
        </div>

        {/* Minimal Suggestions - Simple list without icons */}
        <div className="space-y-2">
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}
          >
            Quick Start
          </p>
          <div className="space-y-1.5">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion.prompt)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                  isDarkMode
                    ? "bg-white/5 hover:bg-white/10 border border-white/5"
                    : "bg-gray-100 hover:bg-gray-200 border border-gray-200"
                }`}
              >
                <span
                  className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}
                >
                  {suggestion.text}
                </span>
                <ArrowRight
                  className={`w-3.5 h-3.5 transition-all ${
                    hoveredIndex === index
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-1 opacity-0"
                  } ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
            isDarkMode
              ? "bg-white/5 border border-white/10 text-slate-400"
              : "bg-gray-100 border border-gray-200 text-gray-600"
          }`}
        >
          <MessageCircle className="w-3 h-3 opacity-70" />
          <span>Start typing or click a suggestion</span>
        </div>
      </div>
    </div>
  );
};

export default ChatWelcome;
