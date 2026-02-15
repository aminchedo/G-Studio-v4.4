/**
 * Privacy Settings Section
 */

import React from 'react';
import { useSettingsStore } from '../settingsStore';
import { SettingGroup, SettingRow, Toggle, Input } from '../components/SettingControls';

const PrivacySettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const privacy = settings.privacy;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-900/20">
        <p className="text-sm text-purple-800 dark:text-purple-300">
          <strong>Your Privacy Matters:</strong> We're committed to protecting your data. Review and customize your privacy settings below.
        </p>
      </div>

      <SettingGroup title="Data Collection" description="Control what data is collected">
        <SettingRow
          label="Usage Analytics"
          description="Help improve the app by sharing anonymous usage data"
        >
          <Toggle
            checked={privacy.analyticsEnabled}
            onChange={(checked) => updateSettings('privacy', { analyticsEnabled: checked })}
          />
        </SettingRow>

        <SettingRow
          label="Crash Reports"
          description="Automatically send crash reports to help fix bugs"
        >
          <Toggle
            checked={privacy.crashReportsEnabled}
            onChange={(checked) => updateSettings('privacy', { crashReportsEnabled: checked })}
          />
        </SettingRow>

        <SettingRow
          label="Telemetry"
          description="Share performance and feature usage telemetry"
        >
          <Toggle
            checked={privacy.telemetryEnabled}
            onChange={(checked) => updateSettings('privacy', { telemetryEnabled: checked })}
          />
        </SettingRow>

        <SettingRow
          label="Share Usage Data"
          description="Allow sharing usage patterns for product improvement"
        >
          <Toggle
            checked={privacy.shareUsageData}
            onChange={(checked) => updateSettings('privacy', { shareUsageData: checked })}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Data Retention" description="Manage how long data is stored">
        <SettingRow
          label="Data Retention Period"
          description="Number of days to keep local data before deletion"
        >
          <Input
            type="number"
            value={privacy.dataRetentionDays.toString()}
            onChange={(value) => updateSettings('privacy', { dataRetentionDays: parseInt(value) || 30 })}
            min={1}
            max={365}
            suffix="days"
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Data Management" description="Export or delete your data">
        <div className="space-y-3">
          <button
            className="w-full rounded-lg border border-blue-600 bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Export My Data</div>
                <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Download all your data in JSON format
                </div>
              </div>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          </button>

          <button
            className="w-full rounded-lg border border-red-600 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-500 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Delete All My Data</div>
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Permanently delete all stored data
                </div>
              </div>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </button>
        </div>
      </SettingGroup>
    </div>
  );
};

export default PrivacySettings;
