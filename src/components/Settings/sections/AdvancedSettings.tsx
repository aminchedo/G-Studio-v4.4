/**
 * Advanced Settings Section
 */

import React from 'react';
import { useSettingsStore } from '../settingsStore';
import { SettingGroup, SettingRow, Toggle, Input, Select, TextArea } from '../components/SettingControls';

const AdvancedSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const advanced = settings.advanced;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          <strong>Caution:</strong> These settings are for advanced users. Changing them may affect app performance or stability.
        </p>
      </div>

      <SettingGroup title="Developer Options" description="Advanced features for developers">
        <SettingRow
          label="Developer Mode"
          description="Enable developer tools and debug features"
        >
          <Toggle
            checked={advanced.developerMode}
            onChange={(checked) => updateSettings('advanced', { developerMode: checked })}
          />
        </SettingRow>

        <SettingRow
          label="Experimental Features"
          description="Enable experimental and beta features"
        >
          <Toggle
            checked={advanced.experimentalFeatures}
            onChange={(checked) => updateSettings('advanced', { experimentalFeatures: checked })}
          />
        </SettingRow>

        <SettingRow
          label="Beta Features"
          description="Access features currently in beta testing"
        >
          <Toggle
            checked={advanced.enableBetaFeatures}
            onChange={(checked) => updateSettings('advanced', { enableBetaFeatures: checked })}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Performance" description="Configure performance settings">
        <SettingRow
          label="Max Concurrent Tasks"
          description="Maximum number of tasks running simultaneously"
        >
          <Input
            type="number"
            value={advanced.maxConcurrentTasks.toString()}
            onChange={(value) => updateSettings('advanced', { maxConcurrentTasks: parseInt(value) || 5 })}
            min={1}
            max={20}
          />
        </SettingRow>

        <SettingRow
          label="Cache Size"
          description="Maximum size for local cache storage"
        >
          <Input
            type="number"
            value={advanced.cacheSize.toString()}
            onChange={(value) => updateSettings('advanced', { cacheSize: parseInt(value) || 500 })}
            min={100}
            max={5000}
            suffix="MB"
          />
        </SettingRow>

        <SettingRow
          label="API Rate Limit"
          description="Maximum API requests per minute"
        >
          <Input
            type="number"
            value={advanced.apiRateLimit.toString()}
            onChange={(value) => updateSettings('advanced', { apiRateLimit: parseInt(value) || 60 })}
            min={10}
            max={1000}
            suffix="req/min"
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Logging" description="Configure logging and debugging">
        <SettingRow
          label="Log Level"
          description="Minimum severity level for logs"
        >
          <Select
            value={advanced.logLevel}
            onChange={(value) => updateSettings('advanced', { logLevel: value as 'error' | 'warn' | 'info' | 'debug' })}
            options={[
              { value: 'error', label: 'Error Only' },
              { value: 'warn', label: 'Warnings & Errors' },
              { value: 'info', label: 'Info, Warnings & Errors' },
              { value: 'debug', label: 'Debug (All Logs)' },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Custom Styling" description="Add custom CSS for advanced customization">
        <SettingRow
          label="Custom CSS"
          description="Add your own CSS to customize the interface"
        >
          <TextArea
            value={advanced.customCSS}
            onChange={(value) => updateSettings('advanced', { customCSS: value })}
            placeholder="/* Add your custom CSS here */\n.example {\n  color: red;\n}"
            rows={8}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="System Information" description="View system details">
        <div className="space-y-2 rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <div className="flex justify-between">
            <span className="text-gray-500">User Agent:</span>
            <span className="text-right">{navigator.userAgent.substring(0, 50)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Platform:</span>
            <span>{navigator.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Language:</span>
            <span>{navigator.language}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Online:</span>
            <span>{navigator.onLine ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </SettingGroup>
    </div>
  );
};

export default AdvancedSettings;
