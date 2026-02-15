/**
 * G Studio - Modern Welcome Screen
 *
 * Beautiful, engaging entry-level page with quick actions and feature highlights
 */

import React, { useState } from "react";
import {
  Sparkles,
  Rocket,
  Code2,
  FolderOpen,
  FileCode,
  Zap,
  BookOpen,
  Settings,
  ChevronRight,
  Play,
  Bot,
  Cpu,
  Palette,
  Terminal,
  GitBranch,
  Globe,
  Star,
  TrendingUp,
} from "lucide-react";

export interface WelcomeScreenProps {
  onNewFile: () => void;
  onLoadDemo: () => void;
  onImportProject: () => void;
  onOpenSettings: () => void;
  onOpenAISettings: () => void;
  isDarkMode?: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onNewFile,
  onLoadDemo,
  onImportProject,
  onOpenSettings,
  onOpenAISettings,
  isDarkMode = true,
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const quickActions = [
    {
      id: "new-file",
      icon: FileCode,
      title: "New File",
      description: "Start with a blank canvas",
      gradient: "from-blue-500 to-cyan-500",
      onClick: onNewFile,
    },
    {
      id: "load-demo",
      icon: Rocket,
      title: "Load Demo",
      description: "Try a sample project",
      gradient: "from-purple-500 to-pink-500",
      onClick: onLoadDemo,
    },
    {
      id: "import-project",
      icon: FolderOpen,
      title: "Import Project",
      description: "Open existing folder",
      gradient: "from-green-500 to-teal-500",
      onClick: onImportProject,
    },
    {
      id: "ai-settings",
      icon: Bot,
      title: "AI Settings",
      description: "Configure your AI assistant",
      gradient: "from-orange-500 to-red-500",
      onClick: onOpenAISettings,
    },
  ];

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Coding",
      description: "Get intelligent code suggestions and completions",
    },
    {
      icon: Zap,
      title: "Live Preview",
      description: "See your changes in real-time",
    },
    {
      icon: Cpu,
      title: "Multi-Agent System",
      description: "Collaborate with specialized AI agents",
    },
    {
      icon: Palette,
      title: "Modern UI",
      description: "Beautiful, customizable interface",
    },
    {
      icon: Terminal,
      title: "Integrated Tools",
      description: "Everything you need in one place",
    },
    {
      icon: Globe,
      title: "Full Stack Support",
      description: "Build web apps with ease",
    },
  ];

  return (
    <div
      className={`flex-1 overflow-y-auto ${isDarkMode ? "bg-[#1A1D21]" : "bg-gray-50"}`}
    >
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Logo & Title */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-xl opacity-50 animate-pulse" />
              <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-2xl">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          <h1
            className={`text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent`}
          >
            Welcome to G Studio
          </h1>

          <p
            className={`text-xl ${isDarkMode ? "text-gray-400" : "text-gray-600"} max-w-2xl mx-auto`}
          >
            Your AI-powered development environment. Build faster, smarter, and
            better.
          </p>

          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div
              className={`flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium">AI-Powered</span>
            </div>
            <div
              className={`flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Fast & Modern</span>
            </div>
            <div
              className={`flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              <Zap className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">Live Preview</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-16">
          <h2
            className={`text-2xl font-bold mb-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                onMouseEnter={() => setHoveredCard(action.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                  isDarkMode
                    ? "bg-[#23262B] hover:bg-[#2A2D33] border border-gray-800 hover:border-gray-700"
                    : "bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
                } ${hoveredCard === action.id ? "scale-105 shadow-2xl" : "shadow-lg"}`}
              >
                {/* Gradient Background on Hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                {/* Icon */}
                <div
                  className={`relative mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br ${action.gradient}`}
                >
                  <action.icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <div className="relative">
                  <h3
                    className={`text-lg font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {action.title}
                  </h3>
                  <p
                    className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    {action.description}
                  </p>
                </div>

                {/* Arrow Icon */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight
                    className={`w-5 h-5 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2
            className={`text-2xl font-bold mb-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            Powerful Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode
                    ? "bg-[#23262B] border border-gray-800 hover:border-gray-700"
                    : "bg-white border border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`inline-flex p-2 rounded-lg mb-4 ${
                    isDarkMode ? "bg-blue-500/10" : "bg-blue-100"
                  }`}
                >
                  <feature.icon
                    className={`w-6 h-6 ${
                      isDarkMode ? "text-blue-400" : "text-blue-600"
                    }`}
                  />
                </div>
                <h3
                  className={`text-lg font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {feature.title}
                </h3>
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Getting Started Section */}
        <div
          className={`rounded-2xl p-8 ${
            isDarkMode
              ? "bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20"
              : "bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200"
          }`}
        >
          <div className="flex items-start gap-6">
            <div
              className={`p-4 rounded-xl ${
                isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
              }`}
            >
              <BookOpen
                className={`w-8 h-8 ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              />
            </div>
            <div className="flex-1">
              <h3
                className={`text-xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                Getting Started
              </h3>
              <p
                className={`mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                New to G Studio? Here's how to get started:
              </p>
              <ol
                className={`space-y-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                <li className="flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDarkMode
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    1
                  </span>
                  <span>
                    Configure your AI settings to connect with Gemini API
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDarkMode
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    2
                  </span>
                  <span>
                    Create a new file or load our demo project to see G Studio
                    in action
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDarkMode
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    3
                  </span>
                  <span>
                    Start coding and let our AI assistant help you build amazing
                    projects
                  </span>
                </li>
              </ol>
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={onOpenAISettings}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Configure AI
                </button>
                <button
                  onClick={onLoadDemo}
                  className={`px-6 py-2.5 font-medium rounded-lg transition-all flex items-center gap-2 ${
                    isDarkMode
                      ? "bg-gray-800 text-white hover:bg-gray-700"
                      : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                  }`}
                >
                  <Play className="w-4 h-4" />
                  Try Demo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-12 text-center">
          <p
            className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
          >
            💡 Pro tip: Press{" "}
            <kbd
              className={`px-2 py-1 rounded text-xs font-mono ${
                isDarkMode
                  ? "bg-gray-800 text-gray-300"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Ctrl+N
            </kbd>{" "}
            to create a new file or{" "}
            <kbd
              className={`px-2 py-1 rounded text-xs font-mono ${
                isDarkMode
                  ? "bg-gray-800 text-gray-300"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Ctrl+B
            </kbd>{" "}
            to toggle the sidebar
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
