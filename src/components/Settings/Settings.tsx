/**
 * Settings Component - Modern, Minimalist Settings Panel
 * Features: Tabbed interface, search, import/export, responsive design
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
    description: "Basic application settings and preferences",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: AppearanceIcon,
    description: "Customize the look and feel",
  },
  {
    id: "apiKeys",
    label: "API Keys",
    icon: APIIcon,
    description: "Manage API credentials and endpoints",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: NotificationIcon,
    description: "Configure notification preferences",
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: PrivacyIcon,
    description: "Privacy and data management settings",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: AdvancedIcon,
    description: "Advanced configuration and developer options",
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
            alert("Settings imported successfully!");
          } else {
            alert("Failed to import settings. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      resetSettings();
      alert("Settings have been reset to defaults.");
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative flex h-[85vh] w-[92vw] max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Sidebar - compact */}
        <div className="flex w-56 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="border-b border-gray-200 px-3 py-3 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Settings
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Application preferences
            </p>
          </div>
          <div className="px-2 py-2">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white py-1.5 pl-8 pr-2 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-1">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon
                    className={`shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}
                    size={16}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {tab.label}
                    </div>
                    <div
                      className={`truncate text-[10px] ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}`}
                    >
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 px-2 py-2 dark:border-gray-800">
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={handleExport}
                className="flex flex-col items-center justify-center rounded border border-gray-300 py-1.5 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                title="Export"
              >
                <DownloadIcon size={14} />
                <span className="text-[10px]">Export</span>
              </button>
              <button
                onClick={handleImport}
                className="flex flex-col items-center justify-center rounded border border-gray-300 py-1.5 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                title="Import"
              >
                <UploadIcon size={14} />
                <span className="text-[10px]">Import</span>
              </button>
              <button
                onClick={handleReset}
                className="flex flex-col items-center justify-center rounded border border-red-300 py-1.5 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                title="Reset"
              >
                <ResetIcon size={14} />
                <span className="text-[10px]">Reset</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-gray-800">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {SETTINGS_TABS.find((t) => t.id === activeTab)?.label}
              </h3>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {SETTINGS_TABS.find((t) => t.id === activeTab)?.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Close"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
