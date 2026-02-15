/**
 * G Studio - Component Showcase
 *
 * Demo page to preview all new UI components
 * Use this for testing, documentation, or design review
 */

import React, { useState } from "react";
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { ChatWelcome } from '@/components/chat/ChatWelcome';
import { Eye, Code2, Palette, Moon, Sun } from "lucide-react";

export const ComponentShowcase: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<
    "welcome" | "chat-with" | "chat-without"
  >("welcome");
  const [isDarkMode, setIsDarkMode] = useState(true);

  const components = [
    { id: "welcome" as const, name: "Welcome Screen", icon: Eye },
    { id: "chat-with" as const, name: "Chat (With API)", icon: Code2 },
    { id: "chat-without" as const, name: "Chat (No API)", icon: Palette },
  ];

  const demoCallbacks = {
    onNewFile: () => console.log("New File clicked"),
    onLoadDemo: () => console.log("Load Demo clicked"),
    onImportProject: () => console.log("Import Project clicked"),
    onOpenSettings: () => console.log("Open Settings clicked"),
    onOpenAISettings: () => console.log("Open AI Settings clicked"),
  };

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "bg-[#1A1D21]" : "bg-gray-50"}`}
    >
      {/* Header */}
      <div
        className={`border-b ${isDarkMode ? "border-gray-800 bg-[#23262B]" : "border-gray-200 bg-white"}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                G Studio Component Showcase
              </h1>
              <p
                className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Preview all new UI components and their states
              </p>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-3 rounded-lg transition-all ${
                isDarkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-yellow-400"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Component Selector */}
      <div
        className={`border-b ${isDarkMode ? "border-gray-800 bg-[#1E2126]" : "border-gray-200 bg-gray-50"}`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 py-4">
            {components.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setActiveComponent(comp.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeComponent === comp.id
                    ? isDarkMode
                      ? "bg-blue-500 text-white"
                      : "bg-blue-600 text-white"
                    : isDarkMode
                      ? "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                      : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800 border border-gray-200"
                }`}
              >
                <comp.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{comp.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Component Preview */}
      <div className="max-w-7xl mx-auto p-6">
        <div
          className={`rounded-2xl overflow-hidden shadow-2xl ${
            isDarkMode
              ? "bg-[#23262B] border border-gray-800"
              : "bg-white border border-gray-200"
          }`}
        >
          {/* Info Panel */}
          <div
            className={`px-6 py-4 border-b ${
              isDarkMode
                ? "border-gray-800 bg-[#1E2126]"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {activeComponent === "welcome" && "Welcome Screen Component"}
                  {activeComponent === "chat-with" &&
                    "Chat Welcome (With API Key)"}
                  {activeComponent === "chat-without" &&
                    "Chat Welcome (No API Key)"}
                </h2>
                <p
                  className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {activeComponent === "welcome" &&
                    "Shown when no files exist in the project"}
                  {activeComponent === "chat-with" &&
                    "Shown when chat is empty and API key is configured"}
                  {activeComponent === "chat-without" &&
                    "Shown when chat is empty and no API key is set"}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isDarkMode
                    ? "bg-green-500/20 text-green-400"
                    : "bg-green-100 text-green-700"
                }`}
              >
                Live Preview
              </div>
            </div>
          </div>

          {/* Component Display */}
          <div className="relative" style={{ minHeight: "600px" }}>
            {activeComponent === "welcome" && (
              <WelcomeScreen {...demoCallbacks} isDarkMode={isDarkMode} />
            )}

            {activeComponent === "chat-with" && (
              <div className="h-[600px]">
                <ChatWelcome
                  isDarkMode={isDarkMode}
                  hasApiKey={true}
                  onOpenSettings={demoCallbacks.onOpenAISettings}
                />
              </div>
            )}

            {activeComponent === "chat-without" && (
              <div className="h-[600px]">
                <ChatWelcome
                  isDarkMode={isDarkMode}
                  hasApiKey={false}
                  onOpenSettings={demoCallbacks.onOpenAISettings}
                />
              </div>
            )}
          </div>
        </div>

        {/* Component Details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Props */}
          <div
            className={`p-4 rounded-lg ${
              isDarkMode
                ? "bg-[#23262B] border border-gray-800"
                : "bg-white border border-gray-200"
            }`}
          >
            <h3
              className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              Props
            </h3>
            <div
              className={`space-y-2 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              {activeComponent === "welcome" && (
                <>
                  <div>• onNewFile: Function</div>
                  <div>• onLoadDemo: Function</div>
                  <div>• onImportProject: Function</div>
                  <div>• onOpenSettings: Function</div>
                  <div>• onOpenAISettings: Function</div>
                  <div>• isDarkMode: boolean</div>
                </>
              )}
              {(activeComponent === "chat-with" ||
                activeComponent === "chat-without") && (
                <>
                  <div>• isDarkMode: boolean</div>
                  <div>• hasApiKey: boolean</div>
                  <div>• onOpenSettings: Function</div>
                </>
              )}
            </div>
          </div>

          {/* Features */}
          <div
            className={`p-4 rounded-lg ${
              isDarkMode
                ? "bg-[#23262B] border border-gray-800"
                : "bg-white border border-gray-200"
            }`}
          >
            <h3
              className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              Features
            </h3>
            <div
              className={`space-y-2 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              <div>✨ Smooth animations</div>
              <div>🎨 Gradient backgrounds</div>
              <div>📱 Fully responsive</div>
              <div>🌓 Dark/light theme</div>
              <div>♿ Accessible</div>
              <div>⚡ GPU-accelerated</div>
            </div>
          </div>

          {/* File Location */}
          <div
            className={`p-4 rounded-lg ${
              isDarkMode
                ? "bg-[#23262B] border border-gray-800"
                : "bg-white border border-gray-200"
            }`}
          >
            <h3
              className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              File Location
            </h3>
            <div
              className={`space-y-2 text-xs font-mono ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
            >
              {activeComponent === "welcome" && (
                <div>src/components/welcome/WelcomeScreen.tsx</div>
              )}
              {(activeComponent === "chat-with" ||
                activeComponent === "chat-without") && (
                <div>src/components/chat/ChatWelcome.tsx</div>
              )}
            </div>
            <div
              className={`mt-4 pt-4 border-t ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}
            >
              <h4
                className={`text-xs font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                Styles
              </h4>
              <div
                className={`text-xs font-mono ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
              >
                src/styles/welcome.css
              </div>
            </div>
          </div>
        </div>

        {/* Usage Example */}
        <div
          className={`mt-6 p-6 rounded-lg ${
            isDarkMode
              ? "bg-[#23262B] border border-gray-800"
              : "bg-white border border-gray-200"
          }`}
        >
          <h3
            className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            Usage Example
          </h3>
          <pre
            className={`text-xs overflow-x-auto p-4 rounded ${
              isDarkMode
                ? "bg-[#1A1D21] text-gray-300"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {activeComponent === "welcome" &&
              `<WelcomeScreen
  onNewFile={() => handleNewFile()}
  onLoadDemo={() => handleLoadDemo()}
  onImportProject={() => handleImportProject()}
  onOpenSettings={() => setIsSettingsOpen(true)}
  onOpenAISettings={() => setIsAISettingsHubOpen(true)}
  isDarkMode={theme === "dark"}
/>`}
            {(activeComponent === "chat-with" ||
              activeComponent === "chat-without") &&
              `<ChatWelcome
  isDarkMode={theme === "dark"}
  hasApiKey={!!agentConfig.apiKey}
  onOpenSettings={() => setIsAISettingsHubOpen(true)}
/>`}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div
        className={`mt-12 border-t ${isDarkMode ? "border-gray-800 bg-[#23262B]" : "border-gray-200 bg-white"}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <p
              className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              G Studio Component Showcase • Check the browser console for
              interaction logs
            </p>
            <p
              className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
            >
              Toggle theme with the button above • All components are fully
              interactive
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentShowcase;
