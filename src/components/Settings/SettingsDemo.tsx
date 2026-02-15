/**
 * Settings Module Demo Page
 * Interactive demonstration of all settings features
 */

import React, { useState, useEffect } from 'react';
import { Settings, useSettingsStore } from './index';

const SettingsDemo: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<any>('general');
  const { settings, updateSettings, resetSettings, exportSettings, importSettings } = useSettingsStore();

  // Apply theme
  useEffect(() => {
    const applyTheme = () => {
      if (settings.appearance.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.appearance.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    };

    applyTheme();

    if (settings.appearance.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [settings.appearance.theme]);

  // Apply animations
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--transition-speed',
      settings.appearance.animations ? '200ms' : '0ms'
    );
  }, [settings.appearance.animations]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      if (e.key === 'Escape' && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSettingsOpen]);

  const quickActions = [
    {
      label: 'Toggle Theme',
      action: () => {
        const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
        const currentIndex = themes.indexOf(settings.appearance.theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        updateSettings('appearance', { theme: nextTheme });
      },
    },
    {
      label: 'Toggle Developer Mode',
      action: () => {
        updateSettings('advanced', { developerMode: !settings.advanced.developerMode });
      },
    },
    {
      label: 'Toggle Animations',
      action: () => {
        updateSettings('appearance', { animations: !settings.appearance.animations });
      },
    },
    {
      label: 'Reset All Settings',
      action: () => {
        if (confirm('Reset all settings to defaults?')) {
          resetSettings();
        }
      },
    },
  ];

  const settingsSections = [
    { id: 'general', label: 'General', description: 'Language, timezone, auto-save' },
    { id: 'appearance', label: 'Appearance', description: 'Theme, colors, typography' },
    { id: 'apiKeys', label: 'API Keys', description: 'AI provider credentials' },
    { id: 'notifications', label: 'Notifications', description: 'Alerts and updates' },
    { id: 'privacy', label: 'Privacy', description: 'Data collection and retention' },
    { id: 'advanced', label: 'Advanced', description: 'Developer options' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/50 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Settings Module Demo
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Interactive demonstration of the G-Studio settings system
              </p>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Open Settings
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Current Settings Display */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Current Theme
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mode:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {settings.appearance.theme}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Primary:</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-700"
                    style={{ backgroundColor: settings.appearance.primaryColor }}
                  />
                  <span className="font-mono text-xs">{settings.appearance.primaryColor}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Font Size:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {settings.appearance.fontSize}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              General Settings
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Language:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {settings.general.language}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Auto-Save:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {settings.general.autoSave ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Interval:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {settings.general.autoSaveInterval}s
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Advanced Settings
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Developer Mode:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {settings.advanced.developerMode ? 'On' : 'Off'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Log Level:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {settings.advanced.logLevel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cache:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {settings.advanced.cacheSize} MB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Open to Specific Tab */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Open Specific Section
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setDefaultTab(section.id);
                  setIsSettingsOpen(true);
                }}
                className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <div className="font-medium text-gray-900 dark:text-white">{section.label}</div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {section.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="rounded-xl bg-blue-50 p-6 dark:bg-blue-900/20">
          <h3 className="mb-4 text-lg font-semibold text-blue-900 dark:text-blue-300">
            Keyboard Shortcuts
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800 dark:text-blue-400">Open Settings:</span>
              <kbd className="rounded bg-white px-3 py-1 font-mono text-sm text-blue-900 shadow-sm dark:bg-blue-900 dark:text-blue-300">
                Ctrl + ,
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800 dark:text-blue-400">Close Settings:</span>
              <kbd className="rounded bg-white px-3 py-1 font-mono text-sm text-blue-900 shadow-sm dark:bg-blue-900 dark:text-blue-300">
                Esc
              </kbd>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultTab={defaultTab}
      />
    </div>
  );
};

export default SettingsDemo;
