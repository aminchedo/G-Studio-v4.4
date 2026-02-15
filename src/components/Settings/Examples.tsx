/**
 * Settings Module Example Usage
 * Demonstrates how to integrate and use the Settings component
 */

import React, { useState } from 'react';
import { Settings, useSettingsStore } from './components/Settings';

/**
 * Example: Simple Integration
 * Shows the most basic way to add settings to your app
 */
export function SimpleExample() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsSettingsOpen(true)}>
        Open Settings
      </button>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

/**
 * Example: With Keyboard Shortcut
 * Opens settings with Ctrl+, or Cmd+, keyboard shortcut
 */
export function KeyboardShortcutExample() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div>
      <p>Press Ctrl+, (or Cmd+, on Mac) to open settings</p>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

/**
 * Example: With Menu Bar Integration
 * Shows settings in a dropdown menu
 */
export function MenuBarExample() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="rounded-lg px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        Menu
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg dark:bg-gray-900">
          <button
            onClick={() => {
              setIsSettingsOpen(true);
              setIsMenuOpen(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Settings
          </button>
        </div>
      )}

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

/**
 * Example: With Default Tab
 * Opens settings to a specific section
 */
export function DefaultTabExample() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'general' | 'appearance' | 'apiKeys' | 'notifications' | 'privacy' | 'advanced'>('general');

  return (
    <div className="space-y-2">
      <button
        onClick={() => {
          setDefaultTab('general');
          setIsSettingsOpen(true);
        }}
      >
        General Settings
      </button>

      <button
        onClick={() => {
          setDefaultTab('appearance');
          setIsSettingsOpen(true);
        }}
      >
        Appearance Settings
      </button>

      <button
        onClick={() => {
          setDefaultTab('apiKeys');
          setIsSettingsOpen(true);
        }}
      >
        API Keys
      </button>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultTab={defaultTab}
      />
    </div>
  );
}

/**
 * Example: Reading Settings Values
 * Shows how to access settings in your components
 */
export function ReadSettingsExample() {
  const { settings } = useSettingsStore();

  return (
    <div className="space-y-2">
      <p>Current Theme: {settings.appearance.theme}</p>
      <p>Language: {settings.general.language}</p>
      <p>Auto-Save: {settings.general.autoSave ? 'Enabled' : 'Disabled'}</p>
      <p>Developer Mode: {settings.advanced.developerMode ? 'On' : 'Off'}</p>
    </div>
  );
}

/**
 * Example: Updating Settings Programmatically
 * Shows how to update settings from code
 */
export function UpdateSettingsExample() {
  const { settings, updateSettings } = useSettingsStore();

  const toggleDarkMode = () => {
    updateSettings('appearance', {
      theme: settings.appearance.theme === 'dark' ? 'light' : 'dark',
    });
  };

  const enableDeveloperMode = () => {
    updateSettings('advanced', {
      developerMode: true,
    });
  };

  return (
    <div className="space-y-2">
      <button onClick={toggleDarkMode}>
        Toggle Dark Mode (Current: {settings.appearance.theme})
      </button>

      <button onClick={enableDeveloperMode}>
        Enable Developer Mode
      </button>
    </div>
  );
}

/**
 * Example: React to Settings Changes
 * Shows how to respond when settings change
 */
export function ReactToSettingsExample() {
  const { settings } = useSettingsStore();

  // Apply theme to document
  React.useEffect(() => {
    if (settings.appearance.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.appearance.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Auto mode - use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, [settings.appearance.theme]);

  // Apply font family
  React.useEffect(() => {
    document.documentElement.style.fontFamily = settings.appearance.fontFamily;
  }, [settings.appearance.fontFamily]);

  // Apply custom CSS
  React.useEffect(() => {
    const styleElement = document.getElementById('custom-css') || document.createElement('style');
    styleElement.id = 'custom-css';
    styleElement.textContent = settings.advanced.customCSS;
    if (!styleElement.parentNode) {
      document.head.appendChild(styleElement);
    }
  }, [settings.advanced.customCSS]);

  return (
    <div>
      <p>Settings are being applied to the page automatically!</p>
    </div>
  );
}

/**
 * Complete App Example
 * Full integration example with all features
 */
export function CompleteAppExample() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings } = useSettingsStore();

  // Apply theme
  React.useEffect(() => {
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

  // Keyboard shortcut
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            G-Studio
          </h1>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Settings
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Welcome to G-Studio
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Press <kbd className="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-800">Ctrl+,</kbd> to open settings
          </p>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current Settings:
            </p>
            <ul className="space-y-1 text-sm">
              <li>Theme: <strong>{settings.appearance.theme}</strong></li>
              <li>Language: <strong>{settings.general.language}</strong></li>
              <li>Font Size: <strong>{settings.appearance.fontSize}</strong></li>
            </ul>
          </div>
        </div>
      </main>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
