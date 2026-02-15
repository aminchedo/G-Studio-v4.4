/**
 * API Keys Settings Section
 */

import React, { useState } from 'react';
import { useSettingsStore } from '../settingsStore';
import { SettingGroup, SettingRow, SecretInput } from '../components/SettingControls';

const APIKeysSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const apiKeys = settings.apiKeys;
  const [customEndpointKey, setCustomEndpointKey] = useState('');
  const [customEndpointValue, setCustomEndpointValue] = useState('');

  const handleAddCustomEndpoint = () => {
    if (customEndpointKey && customEndpointValue) {
      updateSettings('apiKeys', {
        customEndpoints: {
          ...apiKeys.customEndpoints,
          [customEndpointKey]: customEndpointValue,
        },
      });
      setCustomEndpointKey('');
      setCustomEndpointValue('');
    }
  };

  const handleRemoveCustomEndpoint = (key: string) => {
    const { [key]: _, ...rest } = apiKeys.customEndpoints;
    updateSettings('apiKeys', { customEndpoints: rest });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Security Notice:</strong> API keys are stored locally and encrypted. Never share your keys publicly.
        </p>
      </div>

      <SettingGroup title="AI Provider Keys" description="Configure API keys for AI services">
        <SettingRow
          label="OpenAI API Key"
          description="Used for GPT models and embeddings"
        >
          <SecretInput
            value={apiKeys.openai}
            onChange={(value) => updateSettings('apiKeys', { openai: value })}
            placeholder="sk-..."
          />
        </SettingRow>

        <SettingRow
          label="Anthropic API Key"
          description="Used for Claude models"
        >
          <SecretInput
            value={apiKeys.anthropic}
            onChange={(value) => updateSettings('apiKeys', { anthropic: value })}
            placeholder="sk-ant-..."
          />
        </SettingRow>

        <SettingRow
          label="Google AI API Key"
          description="Used for Gemini models"
        >
          <SecretInput
            value={apiKeys.google}
            onChange={(value) => updateSettings('apiKeys', { google: value })}
            placeholder="AIza..."
          />
        </SettingRow>

        <SettingRow
          label="Cohere API Key"
          description="Used for Cohere models"
        >
          <SecretInput
            value={apiKeys.cohere}
            onChange={(value) => updateSettings('apiKeys', { cohere: value })}
            placeholder="co-..."
          />
        </SettingRow>

        <SettingRow
          label="Hugging Face Token"
          description="Used for Hugging Face models and spaces"
        >
          <SecretInput
            value={apiKeys.huggingface}
            onChange={(value) => updateSettings('apiKeys', { huggingface: value })}
            placeholder="hf_..."
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Custom Endpoints" description="Add custom API endpoints">
        <div className="space-y-4">
          {/* Add new endpoint */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="mb-3 font-medium text-gray-900 dark:text-white">Add New Endpoint</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={customEndpointKey}
                onChange={(e) => setCustomEndpointKey(e.target.value)}
                placeholder="Endpoint Name (e.g., custom-llm)"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <input
                type="text"
                value={customEndpointValue}
                onChange={(e) => setCustomEndpointValue(e.target.value)}
                placeholder="API Key or Endpoint URL"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                onClick={handleAddCustomEndpoint}
                disabled={!customEndpointKey || !customEndpointValue}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Add Endpoint
              </button>
            </div>
          </div>

          {/* List of custom endpoints */}
          {Object.keys(apiKeys.customEndpoints).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">Configured Endpoints</h4>
              {Object.entries(apiKeys.customEndpoints).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{key}</div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {value.substring(0, 20)}...
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCustomEndpoint(key)}
                    className="ml-4 rounded-lg px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingGroup>
    </div>
  );
};

export default APIKeysSettings;
