/**
 * General Settings Section
 */

import React from 'react';
import { useSettingsStore } from '../settingsStore';
import { SettingGroup, SettingRow, Select, Input, Toggle } from '../components/SettingControls';

const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const general = settings.general;

  return (
    <div className="space-y-6">
      <SettingGroup title="Language & Region" description="Configure language and timezone settings">
        <SettingRow
          label="Language"
          description="Choose your preferred language"
        >
          <Select
            value={general.language}
            onChange={(value) => updateSettings('general', { language: value })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' },
              { value: 'ja', label: '日本語' },
              { value: 'zh', label: '中文' },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Timezone"
          description="Select your timezone for accurate time display"
        >
          <Select
            value={general.timezone}
            onChange={(value) => updateSettings('general', { timezone: value })}
            options={[
              { value: 'UTC', label: 'UTC' },
              { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
              { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
              { value: 'Europe/London', label: 'London' },
              { value: 'Europe/Paris', label: 'Paris' },
              { value: 'Asia/Tokyo', label: 'Tokyo' },
              { value: 'Asia/Shanghai', label: 'Beijing' },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Workspace" description="Manage workspace and project settings">
        <SettingRow
          label="Default Workspace"
          description="The workspace to load on startup"
        >
          <Input
            value={general.defaultWorkspace}
            onChange={(value) => updateSettings('general', { defaultWorkspace: value })}
            placeholder="default"
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Auto-Save" description="Configure automatic saving behavior">
        <SettingRow
          label="Enable Auto-Save"
          description="Automatically save changes periodically"
        >
          <Toggle
            checked={general.autoSave}
            onChange={(checked) => updateSettings('general', { autoSave: checked })}
          />
        </SettingRow>

        {general.autoSave && (
          <SettingRow
            label="Auto-Save Interval"
            description="Time between auto-saves (in seconds)"
          >
            <Input
              type="number"
              value={general.autoSaveInterval.toString()}
              onChange={(value) => updateSettings('general', { autoSaveInterval: parseInt(value) || 30 })}
              min={10}
              max={300}
              suffix="seconds"
            />
          </SettingRow>
        )}
      </SettingGroup>
    </div>
  );
};

export default GeneralSettings;
