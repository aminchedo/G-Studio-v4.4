/**
 * Modern General Settings Section
 * Enterprise-level layout with card-based design
 */

import React from 'react';
import { useSettingsStore } from '../settingsStore';
import { 
  SettingGroup, 
  SettingRow, 
  Select, 
  Input, 
  Toggle,
  Slider 
} from '../components/SettingControlsModern';

const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const general = settings.general;

  return (
    <div className="space-y-6">
      <SettingGroup 
        title="Language & Region" 
        description="Configure language and timezone preferences for localized experience"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        }
      >
        <SettingRow
          label="Display Language"
          description="Select your preferred language for the interface"
          badge="UI"
        >
          <Select
            value={general.language}
            onChange={(value) => updateSettings('general', { language: value })}
            options={[
              { value: 'en', label: '🇺🇸 English' },
              { value: 'es', label: '🇪🇸 Español' },
              { value: 'fr', label: '🇫🇷 Français' },
              { value: 'de', label: '🇩🇪 Deutsch' },
              { value: 'ja', label: '🇯🇵 日本語' },
              { value: 'zh', label: '🇨🇳 中文' },
              { value: 'ko', label: '🇰🇷 한국어' },
              { value: 'pt', label: '🇧🇷 Português' },
              { value: 'ru', label: '🇷🇺 Русский' },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Timezone"
          description="Configure timezone for accurate date and time display across the application"
        >
          <Select
            value={general.timezone}
            onChange={(value) => updateSettings('general', { timezone: value })}
            options={[
              { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
              { value: 'America/New_York', label: 'Eastern Time (New York)' },
              { value: 'America/Chicago', label: 'Central Time (Chicago)' },
              { value: 'America/Denver', label: 'Mountain Time (Denver)' },
              { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
              { value: 'Europe/London', label: 'GMT (London)' },
              { value: 'Europe/Paris', label: 'CET (Paris, Berlin)' },
              { value: 'Europe/Moscow', label: 'MSK (Moscow)' },
              { value: 'Asia/Dubai', label: 'GST (Dubai)' },
              { value: 'Asia/Shanghai', label: 'CST (Beijing, Shanghai)' },
              { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
              { value: 'Asia/Seoul', label: 'KST (Seoul)' },
              { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup 
        title="Workspace Configuration" 
        description="Manage your workspace and project settings"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        }
      >
        <SettingRow
          label="Default Workspace Path"
          description="The workspace directory to load automatically on application startup"
          badge="Startup"
        >
          <Input
            value={general.defaultWorkspace}
            onChange={(value) => updateSettings('general', { defaultWorkspace: value })}
            placeholder="C:\Projects\MyWorkspace"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup 
        title="Auto-Save Configuration" 
        description="Configure automatic saving behavior to prevent data loss"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        }
      >
        <SettingRow
          label="Enable Auto-Save"
          description="Automatically save changes periodically to prevent data loss"
          badge="Recommended"
        >
          <Toggle
            checked={general.autoSave}
            onChange={(checked) => updateSettings('general', { autoSave: checked })}
            size="md"
          />
        </SettingRow>

        {general.autoSave && (
          <SettingRow
            label="Auto-Save Interval"
            description="Time between automatic saves - shorter intervals provide better protection but may impact performance"
          >
            <div className="w-full max-w-md">
              <Slider
                value={general.autoSaveInterval}
                onChange={(value) => updateSettings('general', { autoSaveInterval: value })}
                min={10}
                max={300}
                step={10}
                unit=" sec"
              />
            </div>
          </SettingRow>
        )}
      </SettingGroup>

      {/* Info Card */}
      <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 dark:border-blue-900/60 dark:from-blue-900/20 dark:to-blue-800/20">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 dark:text-blue-100">Pro Tip</h4>
            <p className="mt-1 text-sm leading-relaxed text-blue-800 dark:text-blue-200">
              Configure your workspace path to a cloud-synced folder (like OneDrive or Dropbox) 
              to automatically back up your projects and access them from multiple devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
