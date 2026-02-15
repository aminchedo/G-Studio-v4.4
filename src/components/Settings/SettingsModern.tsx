/**
 * Modern Enterprise Settings Component
 * Features: Card-based layout, improved space utilization, professional design
 */

import React, { useState } from "react";
import { useSettingsStore } from "./settingsStore";
import {
  GeneralIcon,
  AppearanceIcon,
  APIIcon,
  NotificationIcon,
  PrivacyIcon,
  AdvancedIcon,
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  ResetIcon,
  CloseIcon,
  CheckIcon,
} from "./Icons";
import type { SettingsSection, SettingsTab } from "./types";
import GeneralSettings from "./sections/GeneralSettings";
import AppearanceSettings from "./sections/AppearanceSettings";
import APIKeysSettings from "./sections/APIKeysSettings";
import NotificationSettings from "./sections/NotificationSettings";
import PrivacySettings from "./sections/PrivacySettings";
import AdvancedSettings from "./sections/AdvancedSettings";

const SETTINGS_TABS: SettingsTab[] = [
  {
    id: "general",
    label: "General",
    icon: GeneralIcon,
    description: "Basic application settings",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: AppearanceIcon,
    description: "Visual customization",
  },
  {
    id: "apiKeys",
    label: "API Keys",
    icon: APIIcon,
    description: "Integration credentials",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: NotificationIcon,
    description: "Alert preferences",
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: PrivacyIcon,
    description: "Data & security",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: AdvancedIcon,
    description: "Developer options",
  },
];

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: SettingsSection;
}

export const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  defaultTab = "general",
}) => {
  const [activeTab, setActiveTab] = useState<SettingsSection>(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const { resetSettings, exportSettings, importSettings } = useSettingsStore();

  const handleExport = () => {
    const data = exportSettings();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `g-studio-settings-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccessMessage();
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (importSettings(content)) {
            showSuccessMessage();
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm("Reset all settings to default values? This cannot be undone.")) {
      resetSettings();
      showSuccessMessage();
    }
  };

  const showSuccessMessage = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const renderSectionContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "apiKeys":
        return <APIKeysSettings />;
      case "notifications":
        return <NotificationSettings />;
      case "privacy":
        return <PrivacySettings />;
      case "advanced":
        return <AdvancedSettings />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const filteredTabs = SETTINGS_TABS.filter(
    (tab) =>
      tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeTabInfo = SETTINGS_TABS.find((t) => t.id === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-[95vw] max-w-7xl overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl dark:from-gray-900 dark:to-gray-950">
        
        {/* Modern Sidebar */}
        <div className="flex w-72 flex-col border-r border-gray-200/50 bg-white/80 backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/80">
          
          {/* Header */}
          <div className="border-b border-gray-200/50 px-6 py-6 dark:border-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
                  Settings
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configure G-Studio
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-4">
            <div className="relative group">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 dark:from-blue-600 dark:to-blue-700"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                    isActive
                      ? "bg-white/20"
                      : "bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-800 dark:group-hover:bg-gray-700"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {tab.label}
                    </div>
                    <div className={`truncate text-xs ${
                      isActive ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {tab.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute right-3 h-2 w-2 rounded-full bg-white"></div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="border-t border-gray-200/50 px-3 py-4 dark:border-gray-800/50">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleExport}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-3 text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                title="Export Settings"
              >
                <DownloadIcon size={16} />
                <span className="text-[10px] font-medium">Export</span>
              </button>
              <button
                onClick={handleImport}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-3 text-gray-700 transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:border-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400"
                title="Import Settings"
              >
                <UploadIcon size={16} />
                <span className="text-[10px] font-medium">Import</span>
              </button>
              <button
                onClick={handleReset}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white py-3 text-red-600 transition-all hover:border-red-500 hover:bg-red-50 hover:shadow-md dark:border-red-900 dark:bg-gray-800/50 dark:text-red-400 dark:hover:border-red-700 dark:hover:bg-red-900/20"
                title="Reset to Defaults"
              >
                <ResetIcon size={16} />
                <span className="text-[10px] font-medium">Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col min-w-0 bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-950/50 dark:to-gray-900/50">
          
          {/* Content Header */}
          <div className="border-b border-gray-200/50 bg-white/60 px-8 py-6 backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/60">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  {activeTabInfo && <activeTabInfo.icon className="h-6 w-6 text-white" />}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeTabInfo?.label}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {activeTabInfo?.description}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-800 dark:hover:border-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Close Settings"
              >
                <CloseIcon size={20} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="mx-auto max-w-5xl">
              {renderSectionContent()}
            </div>
          </div>

          {/* Success Toast */}
          {showSuccess && (
            <div className="fixed bottom-8 right-8 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-6 py-4 shadow-lg dark:border-green-900 dark:bg-green-900/30">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500">
                <CheckIcon size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Success!</p>
                <p className="text-sm text-green-700 dark:text-green-300">Settings have been updated</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
