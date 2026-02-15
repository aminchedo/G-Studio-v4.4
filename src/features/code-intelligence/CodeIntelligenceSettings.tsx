/**
 * Code Intelligence Settings Panel
 * Configuration interface for code intelligence features
 */

import React from 'react';
import {
  Settings,
  RefreshCw,
  Zap,
  Filter,
  Download,
  RotateCcw,
} from 'lucide-react';
import {
  useCodeIntelligenceSettings,
  useCodeIntelligenceActions,
  CodeIntelligenceSettings as SettingsType,
} from '@/stores/codeIntelligenceStore';

interface CodeIntelligenceSettingsProps {
  onClose?: () => void;
}

export const CodeIntelligenceSettings: React.FC<CodeIntelligenceSettingsProps> = ({
  onClose,
}) => {
  const settings = useCodeIntelligenceSettings();
  const { updateSettings, resetSettings } = useCodeIntelligenceActions();

  const handleToggle = (key: keyof SettingsType) => {
    updateSettings({ [key]: !settings[key] });
  };

  const handleNumberChange = (key: keyof SettingsType, value: number) => {
    updateSettings({ [key]: value });
  };

  const handleArrayChange = (key: keyof SettingsType, value: string) => {
    const array = value.split(',').map((s) => s.trim()).filter(Boolean);
    updateSettings({ [key]: array });
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      resetSettings();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Code Intelligence Settings</h2>
              <p className="text-sm text-indigo-100">
                Configure analysis behavior and preferences
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Auto-Refresh Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <RefreshCw className="w-5 h-5" />
            Auto-Refresh
          </div>

          <div className="space-y-3 pl-7">
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Enable Auto-Refresh
              </span>
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={() => handleToggle('autoRefresh')}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {settings.autoRefresh && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={settings.refreshInterval}
                  onChange={(e) => handleNumberChange('refreshInterval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Recommended: 30-60 seconds
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Real-Time Analysis */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Zap className="w-5 h-5" />
            Real-Time Analysis
          </div>

          <div className="pl-7">
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                  Enable Real-Time Analysis
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Analyze code as you type (may impact performance)
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableRealTime}
                onChange={() => handleToggle('enableRealTime')}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* File Patterns */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Filter className="w-5 h-5" />
            File Patterns
          </div>

          <div className="space-y-3 pl-7">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Include Patterns
              </label>
              <input
                type="text"
                value={settings.filePatterns.join(', ')}
                onChange={(e) => handleArrayChange('filePatterns', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="**/*.ts, **/*.tsx"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Comma-separated glob patterns
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Exclude Patterns
              </label>
              <input
                type="text"
                value={settings.excludePatterns.join(', ')}
                onChange={(e) => handleArrayChange('excludePatterns', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="**/node_modules/**, **/dist/**"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Comma-separated glob patterns
              </p>
            </div>
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Settings className="w-5 h-5" />
            Display Options
          </div>

          <div className="space-y-2 pl-7">
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Show Metrics
              </span>
              <input
                type="checkbox"
                checked={settings.showMetrics}
                onChange={() => handleToggle('showMetrics')}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Show Suggestions
              </span>
              <input
                type="checkbox"
                checked={settings.showSuggestions}
                onChange={() => handleToggle('showSuggestions')}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Show Timeline
              </span>
              <input
                type="checkbox"
                checked={settings.showTimeline}
                onChange={() => handleToggle('showTimeline')}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Export Format */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Download className="w-5 h-5" />
            Export Format
          </div>

          <div className="pl-7">
            <select
              value={settings.exportFormat}
              onChange={(e) => updateSettings({ exportFormat: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
            </select>
          </div>
        </div>
      </div>

      {/* Footer */}
      {onClose && (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Save & Close
          </button>
        </div>
      )}
    </div>
  );
};
