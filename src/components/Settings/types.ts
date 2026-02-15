/**
 * Settings Module Types
 * Modern, fully-typed settings configuration
 */

export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  apiKeys: APIKeysSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
}

export interface GeneralSettings {
  language: string;
  timezone: string;
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  defaultWorkspace: string;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  sidebarPosition: 'left' | 'right';
  compactMode: boolean;
  animations: boolean;
  accentColor: string;
}

export interface APIKeysSettings {
  openai: string;
  anthropic: string;
  google: string;
  cohere: string;
  huggingface: string;
  customEndpoints: Record<string, string>;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  emailAddress: string;
  taskCompletionNotify: boolean;
  errorNotify: boolean;
  updateNotify: boolean;
}

export interface PrivacySettings {
  analyticsEnabled: boolean;
  crashReportsEnabled: boolean;
  telemetryEnabled: boolean;
  shareUsageData: boolean;
  dataRetentionDays: number;
}

export interface AdvancedSettings {
  developerMode: boolean;
  experimentalFeatures: boolean;
  maxConcurrentTasks: number;
  cacheSize: number; // in MB
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  customCSS: string;
  apiRateLimit: number;
  enableBetaFeatures: boolean;
}

export type SettingsSection = keyof AppSettings;

export interface SettingsTab {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}
