/**
 * G Studio - Chat Welcome Component
 *
 * Modern welcome message for the AI assistant chat panel
 */

import React from "react";
import {
  Sparkles,
  MessageCircle,
  Code2,
  Lightbulb,
  Zap,
  Bug,
  Wand2,
} from "lucide-react";

export interface ChatWelcomeProps {
  isDarkMode?: boolean;
  hasApiKey?: boolean;
  onOpenSettings?: () => void;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  isDarkMode = true,
  hasApiKey = true,
  onOpenSettings,
}) => {
  const suggestions = [
    {
      icon: Code2,
      text: "Create a React component",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Bug,
      text: "Help debug my code",
      gradient: "from-red-500 to-orange-500",
    },
    {
      icon: Lightbulb,
      text: "Suggest improvements",
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      icon: Wand2,
      text: "Refactor this function",
      gradient: "from-purple-500 to-pink-500",
    },
  ];

  if (!hasApiKey) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm space-y-6">
          <div className="relative">
            <div
              className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
                isDarkMode
                  ? "bg-red-500/20 border border-red-500/40"
                  : "bg-red-100 border border-red-200"
              }`}
            >
              <Sparkles
                className={`w-8 h-8 ${isDarkMode ? "text-red-400" : "text-red-600"}`}
              />
            </div>
          </div>
          <h3
            className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            API Key Required
          </h3>
          <p
            className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}
          >
            Add your Gemini API key to use the assistant
          </p>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-full py-3 px-5 rounded-xl font-medium border-2 border-red-500/50 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              Configure API Key
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
          ? "bg-gradient-to-b from-transparent to-slate-900/20"
          : "bg-gradient-to-b from-transparent to-gray-50/50"
      }`}
    >
      <div className="text-center max-w-xl w-full space-y-6">
        {/* Hero */}
        <div
          className={`relative w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
            isDarkMode
              ? "bg-slate-800/60 backdrop-blur-sm border border-white/10 shadow-lg"
              : "bg-white border border-gray-200"
          }`}
        >
          <Sparkles
            className={`w-8 h-8 ${isDarkMode ? "text-sky-400" : "text-purple-600"}`}
          />
        </div>

        <h2
          className={`text-xl font-semibold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Welcome to G Studio!
        </h2>

        <p
          className={`text-sm leading-relaxed ${
            isDarkMode ? "text-slate-400" : "text-gray-600"
          }`}
        >
          Your AI coding companion. Request features, debug, or get suggestions.
        </p>

        {/* Capabilities - compact grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {[
            {
              icon: Code2,
              title: "Code",
              sub: "Components & functions",
              darkBg: "bg-blue-500/20",
              lightBg: "bg-blue-100",
              darkText: "text-blue-400",
              lightText: "text-blue-600",
            },
            {
              icon: Bug,
              title: "Debug",
              sub: "Find and fix issues",
              darkBg: "bg-purple-500/20",
              lightBg: "bg-purple-100",
              darkText: "text-purple-400",
              lightText: "text-purple-600",
            },
            {
              icon: Lightbulb,
              title: "Suggest",
              sub: "Improve quality",
              darkBg: "bg-green-500/20",
              lightBg: "bg-green-100",
              darkText: "text-green-400",
              lightText: "text-green-600",
            },
            {
              icon: Zap,
              title: "Refactor",
              sub: "Clean & optimize",
              darkBg: "bg-orange-500/20",
              lightBg: "bg-orange-100",
              darkText: "text-orange-400",
              lightText: "text-orange-600",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl text-left border ${
                isDarkMode
                  ? "bg-slate-800/60 border-slate-700/80"
                  : "bg-white border-gray-200"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${isDarkMode ? item.darkBg : item.lightBg}`}
              >
                <item.icon
                  className={`w-3.5 h-3.5 ${isDarkMode ? item.darkText : item.lightText}`}
                />
              </div>
              <h4
                className={`text-xs font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {item.title}
              </h4>
              <p
                className={`text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-600"}`}
              >
                {item.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Example prompts - stronger buttons */}
        <div className="space-y-3">
          <p
            className={`text-xs font-medium ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}
          >
            Try:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-600/80 hover:border-slate-500 text-slate-200 hover:text-white focus:ring-purple-500/50"
                    : "bg-white border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 focus:ring-purple-400"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br ${suggestion.gradient}`}
                >
                  <suggestion.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span>{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}
        >
          <MessageCircle className="w-3.5 h-3.5 opacity-70" />
          <span>Type below to start</span>
        </div>
      </div>
    </div>
  );
};

export default ChatWelcome;
