/**
 * Appearance Settings Section
 */

import React from 'react';
import { useSettingsStore } from '../settingsStore';
import { SettingGroup, SettingRow, Select, ColorPicker, Toggle, RadioGroup } from '../components/SettingControls';

const AppearanceSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const appearance = settings.appearance;

  return (
    <div className="space-y-6">
      <SettingGroup title="Theme" description="Customize the visual theme">
        <SettingRow
          label="Color Mode"
          description="Choose between light, dark, or automatic theme"
        >
          <RadioGroup
            value={appearance.theme}
            onChange={(value) => updateSettings('appearance', { theme: value as 'light' | 'dark' | 'auto' })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto' },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Primary Color"
          description="Main accent color for the interface"
        >
          <ColorPicker
            value={appearance.primaryColor}
            onChange={(value) => updateSettings('appearance', { primaryColor: value })}
          />
        </SettingRow>

        <SettingRow
          label="Accent Color"
          description="Secondary accent color"
        >
          <ColorPicker
            value={appearance.accentColor}
            onChange={(value) => updateSettings('appearance', { accentColor: value })}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Typography" description="Adjust text appearance">
        <SettingRow
          label="Font Size"
          description="Base font size for the interface"
        >
          <Select
            value={appearance.fontSize}
            onChange={(value) => updateSettings('appearance', { fontSize: value as 'small' | 'medium' | 'large' })}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Font Family"
          description="Choose the font used in the interface"
        >
          <Select
            value={appearance.fontFamily}
            onChange={(value) => updateSettings('appearance', { fontFamily: value })}
            options={[
              { value: 'Inter Variable, sans-serif', label: 'Inter' },
              { value: 'system-ui, sans-serif', label: 'System' },
              { value: 'Georgia, serif', label: 'Georgia' },
              { value: '"Courier New", monospace', label: 'Courier New' },
              { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Layout" description="Customize interface layout">
        <SettingRow
          label="Sidebar Position"
          description="Position of the main sidebar"
        >
          <RadioGroup
            value={appearance.sidebarPosition}
            onChange={(value) => updateSettings('appearance', { sidebarPosition: value as 'left' | 'right' })}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Compact Mode"
          description="Reduce spacing for a denser layout"
        >
          <Toggle
            checked={appearance.compactMode}
            onChange={(checked) => updateSettings('appearance', { compactMode: checked })}
          />
        </SettingRow>

        <SettingRow
          label="Animations"
          description="Enable smooth animations and transitions"
        >
          <Toggle
            checked={appearance.animations}
            onChange={(checked) => updateSettings('appearance', { animations: checked })}
          />
        </SettingRow>
      </SettingGroup>
    </div>
  );
};

export default AppearanceSettings;
