/**
 * Enhanced Settings Panel - Improved UI for AI Settings
 * Provides better visual hierarchy, organization, and user experience
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, X, Save, RotateCcw, AlertCircle, Check,
  ChevronRight, Copy, Check as CheckIcon
} from 'lucide-react';
import { AIConfig } from './AISettingsHub/types';

interface EnhancedSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: Partial<AIConfig>;
  onSave: (config: AIConfig) => void;
  isDarkMode?: boolean;
}

export const EnhancedSettingsPanel: React.FC<EnhancedSettingsPanelProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  isDarkMode = true
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('connection');
  const [localConfig, setLocalConfig] = useState<Partial<AIConfig>>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const updateConfig = useCallback(<K extends keyof AIConfig>(key: K, value: AIConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  if (!isOpen) return null;

  const bgClass = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const textClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const inputBgClass = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300';
  const borderClass = isDarkMode ? 'border-slate-700' : 'border-slate-300';

  return (
    <div className={`fixed inset-y-0 right-0 w-96 ${bgClass} ${textClass} shadow-2xl border-l ${borderClass} overflow-hidden flex flex-col z-50 animate-in slide-in-from-right duration-300`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-6 border-b ${borderClass}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Settings</h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
              Customize your AI experience
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'hover:bg-slate-800'
              : 'hover:bg-slate-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Connection Section */}
        <div className={`border-b ${borderClass}`}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'connection' ? null : 'connection')}
            className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
              isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-blue-500">🔑</div>
              <div className="text-left">
                <h3 className="font-semibold">Connection</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  API key and endpoint
                </p>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 transition-transform ${
                expandedSection === 'connection' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {expandedSection === 'connection' && (
            <div className={`px-6 py-4 border-t ${borderClass} bg-opacity-50`}>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">API Key</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="password"
                      value={localConfig.apiKey || ''}
                      onChange={(e) => updateConfig('apiKey', e.target.value)}
                      placeholder="Enter your Gemini API key"
                      className={`flex-1 px-3 py-2.5 rounded-lg border ${inputBgClass} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    <button
                      onClick={() => copyToClipboard(localConfig.apiKey || '')}
                      className="p-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                      title="Copy API key"
                    >
                      {copied ? (
                        <CheckIcon className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Model Settings Section */}
        <div className={`border-b ${borderClass}`}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'models' ? null : 'models')}
            className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
              isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-purple-500">⚡</div>
              <div className="text-left">
                <h3 className="font-semibold">Model Settings</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Temperature, tokens, streaming
                </p>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 transition-transform ${
                expandedSection === 'models' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {expandedSection === 'models' && (
            <div className={`px-6 py-4 border-t ${borderClass} space-y-4`}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Temperature: {localConfig.temperature?.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={localConfig.temperature || 0.7}
                  onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                  className="w-full mt-2 accent-purple-600"
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Controls randomness (0=deterministic, 2=creative)
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Max Tokens: {localConfig.maxTokens}
                </label>
                <input
                  type="number"
                  min="1"
                  max="32000"
                  value={localConfig.maxTokens || 2048}
                  onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
                  className={`w-full mt-2 px-3 py-2.5 rounded-lg border ${inputBgClass} text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.enableStreaming || false}
                  onChange={(e) => updateConfig('enableStreaming', e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm font-medium">Enable Streaming</span>
              </label>
            </div>
          )}
        </div>

        {/* Behavior Section */}
        <div className={`border-b ${borderClass}`}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'behavior' ? null : 'behavior')}
            className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
              isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-amber-500">🧠</div>
              <div className="text-left">
                <h3 className="font-semibold">Behavior</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Persona and response style
                </p>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 transition-transform ${
                expandedSection === 'behavior' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {expandedSection === 'behavior' && (
            <div className={`px-6 py-4 border-t ${borderClass} space-y-4`}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Persona</label>
                <select
                  value={localConfig.persona || 'professional'}
                  onChange={(e) => updateConfig('persona', e.target.value as any)}
                  className={`w-full mt-2 px-3 py-2.5 rounded-lg border ${inputBgClass} text-sm focus:outline-none focus:ring-2 focus:ring-amber-500`}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="concise">Concise</option>
                  <option value="creative">Creative</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Response Style</label>
                <select
                  value={localConfig.responseStyle || 'detailed'}
                  onChange={(e) => updateConfig('responseStyle', e.target.value as any)}
                  className={`w-full mt-2 px-3 py-2.5 rounded-lg border ${inputBgClass} text-sm focus:outline-none focus:ring-2 focus:ring-amber-500`}
                >
                  <option value="detailed">Detailed</option>
                  <option value="concise">Concise</option>
                  <option value="step-by-step">Step-by-step</option>
                  <option value="conversational">Conversational</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between gap-3 p-6 border-t ${borderClass} bg-opacity-50`}>
        <button
          onClick={onClose}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            isDarkMode
              ? 'bg-slate-800 hover:bg-slate-700'
              : 'bg-slate-100 hover:bg-slate-200'
          }`}
        >
          Close
        </button>
        <button
          onClick={() => {
            onSave(localConfig as AIConfig);
            onClose();
          }}
          className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save & Close
        </button>
      </div>
    </div>
  );
};

export default EnhancedSettingsPanel;
