/**
 * Notification Settings Section
 */

import React from 'react';
import { useSettingsStore } from '../settingsStore';
import { SettingGroup, SettingRow, Toggle, Input } from '../components/SettingControls';

const NotificationSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const notifications = settings.notifications;

  return (
    <div className="space-y-6">
      <SettingGroup title="Notification Channels" description="Choose how you want to be notified">
        <SettingRow
          label="Enable Notifications"
          description="Master toggle for all notifications"
        >
          <Toggle
            checked={notifications.enabled}
            onChange={(checked) => updateSettings('notifications', { enabled: checked })}
          />
        </SettingRow>

        {notifications.enabled && (
          <>
            <SettingRow
              label="Sound Notifications"
              description="Play sound when notifications appear"
            >
              <Toggle
                checked={notifications.sound}
                onChange={(checked) => updateSettings('notifications', { sound: checked })}
              />
            </SettingRow>

            <SettingRow
              label="Desktop Notifications"
              description="Show browser/system notifications"
            >
              <Toggle
                checked={notifications.desktop}
                onChange={(checked) => updateSettings('notifications', { desktop: checked })}
              />
            </SettingRow>

            <SettingRow
              label="Email Notifications"
              description="Receive notifications via email"
            >
              <Toggle
                checked={notifications.email}
                onChange={(checked) => updateSettings('notifications', { email: checked })}
              />
            </SettingRow>

            {notifications.email && (
              <SettingRow
                label="Email Address"
                description="Email address for notifications"
              >
                <Input
                  type="email"
                  value={notifications.emailAddress}
                  onChange={(value) => updateSettings('notifications', { emailAddress: value })}
                  placeholder="user@example.com"
                />
              </SettingRow>
            )}
          </>
        )}
      </SettingGroup>

      <SettingGroup title="Notification Types" description="Select which events trigger notifications">
        <SettingRow
          label="Task Completion"
          description="Notify when tasks are completed"
        >
          <Toggle
            checked={notifications.taskCompletionNotify}
            onChange={(checked) => updateSettings('notifications', { taskCompletionNotify: checked })}
            disabled={!notifications.enabled}
          />
        </SettingRow>

        <SettingRow
          label="Errors & Warnings"
          description="Notify when errors or warnings occur"
        >
          <Toggle
            checked={notifications.errorNotify}
            onChange={(checked) => updateSettings('notifications', { errorNotify: checked })}
            disabled={!notifications.enabled}
          />
        </SettingRow>

        <SettingRow
          label="Updates Available"
          description="Notify when new updates are available"
        >
          <Toggle
            checked={notifications.updateNotify}
            onChange={(checked) => updateSettings('notifications', { updateNotify: checked })}
            disabled={!notifications.enabled}
          />
        </SettingRow>
      </SettingGroup>
    </div>
  );
};

export default NotificationSettings;
