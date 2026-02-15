/**
 * AISettingsTab - Simplified AI Settings Component
 * 
 * Focuses only on essential model settings:
 * - Model selection
 * - API key management
 * - Basic AI behavior settings
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Key, Settings, Zap, Brain } from 'lucide-react';

export interface AISettingsState {
  temperature: number;
  maxTokens: number;
  enableStreaming: boolean;
}

export interface AISettingsTabProps {
  initialSettings?: Partial<AISettingsState>;
  onSettingsChange?: (settings: AISettingsState) => void;
  onSave?: (settings: AISettingsState) => void;
}

const DEFAULT_SETTINGS: AISettingsState = {
  temperature: 0.7,
  maxTokens: 2048,
  enableStreaming: true,
};

/**
 * AISettingsTab Component - Simplified
 */
export const AISettingsTab: React.FC<AISettingsTabProps> = React.memo(({
  initialSettings,
  onSettingsChange,
  onSave,
}) => {
  const [settings, setSettings] = useState<AISettingsState>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [isDirty, setIsDirty] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('ai_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load AI settings:', e);
      }
    }
  }, []);

  // Update setting
  const updateSetting = useCallback(<K extends keyof AISettingsState>(
    key: K,
    value: AISettingsState[K]
  ) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      onSettingsChange?.(updated);
      return updated;
    });
    setIsDirty(true);
  }, [onSettingsChange]);

  // Save settings
  const handleSave = useCallback(() => {
    localStorage.setItem('ai_settings', JSON.stringify(settings));
    setIsDirty(false);
    onSave?.(settings);
  }, [settings, onSave]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setIsDirty(true);
  }, []);

  return (
    <div className="flex items-center h-full gap-6 px-4">
      {/* Temperature Control */}
      <div className="flex items-center gap-3">
        <Zap className="w-4 h-4 text-purple-400" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">Temperature</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
              className="w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400 w-8">{settings.temperature}</span>
          </div>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="flex items-center gap-3">
        <Brain className="w-4 h-4 text-blue-400" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">Max Tokens</label>
          <input
            type="number"
            value={settings.maxTokens}
            onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value) || 2048)}
            min="1"
            max="32000"
            className="w-24 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Streaming Toggle */}
      <div className="flex items-center gap-3">
        <Settings className="w-4 h-4 text-emerald-400" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enableStreaming}
            onChange={(e) => updateSetting('enableStreaming', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-slate-800 border-slate-700 rounded focus:ring-purple-500"
          />
          <span className="text-xs font-medium text-slate-300">Enable Streaming</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={`px-3 py-1.5 text-xs font-medium text-white rounded transition-colors ${
            isDirty
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-slate-700 cursor-not-allowed opacity-50'
          }`}
        >
          Save
        </button>
      </div>
    </div>
  );
});

AISettingsTab.displayName = 'AISettingsTab';

export default AISettingsTab;
