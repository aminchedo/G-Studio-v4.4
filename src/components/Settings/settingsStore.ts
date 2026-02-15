/**
 * Settings Store - Zustand State Management
 * Persistent settings storage with localStorage sync
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from './types';

interface SettingsStore {
  settings: AppSettings;
  updateSettings: <T extends keyof AppSettings>(
    section: T,
    updates: Partial<AppSettings[T]>
  ) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (jsonString: string) => boolean;
}

const defaultSettings: AppSettings = {
  general: {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoSave: true,
    autoSaveInterval: 30,
    defaultWorkspace: 'default',
  },
  appearance: {
    theme: 'auto',
    primaryColor: '#3b82f6',
    fontSize: 'medium',
    fontFamily: 'Inter Variable, sans-serif',
    sidebarPosition: 'left',
    compactMode: false,
    animations: true,
    accentColor: '#8b5cf6',
  },
  apiKeys: {
    openai: '',
    anthropic: '',
    google: '',
    cohere: '',
    huggingface: '',
    customEndpoints: {},
  },
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    emailAddress: '',
    taskCompletionNotify: true,
    errorNotify: true,
    updateNotify: true,
  },
  privacy: {
    analyticsEnabled: false,
    crashReportsEnabled: true,
    telemetryEnabled: false,
    shareUsageData: false,
    dataRetentionDays: 30,
  },
  advanced: {
    developerMode: false,
    experimentalFeatures: false,
    maxConcurrentTasks: 5,
    cacheSize: 500,
    logLevel: 'info',
    customCSS: '',
    apiRateLimit: 60,
    enableBetaFeatures: false,
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      updateSettings: (section, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [section]: {
              ...state.settings[section],
              ...updates,
            },
          },
        }));
      },

      resetSettings: () => {
        set({ settings: defaultSettings });
      },

      exportSettings: () => {
        return JSON.stringify(get().settings, null, 2);
      },

      importSettings: (jsonString) => {
        try {
          const imported = JSON.parse(jsonString);
          set({ settings: { ...defaultSettings, ...imported } });
          return true;
        } catch (error) {
          console.error('Failed to import settings:', error);
          return false;
        }
      },
    }),
    {
      name: 'g-studio-settings',
      version: 1,
    }
  )
);
