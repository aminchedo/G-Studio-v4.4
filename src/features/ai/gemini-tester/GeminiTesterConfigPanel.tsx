/**
 * GeminiTesterConfigPanel - Configuration UI
 * 
 * Component for API key management and settings configuration
 */

import React, { useState } from 'react';
import { Key, Eye, EyeOff, Plus, Trash2, CheckCircle2, AlertCircle, Globe, Database } from 'lucide-react';
import { useConfig, useGeminiTester } from './GeminiTesterContext';

export const GeminiTesterConfigPanel: React.FC = React.memo(() => {
  const { apiKeys, showApiKeys, useCache, setApiKeys, setShowApiKeys, setUseCache } = useConfig();
  const { regionInfo, testing } = useGeminiTester();
  const [validationStatus, setValidationStatus] = useState<Record<number, 'valid' | 'invalid' | 'checking' | null>>({});

  /**
   * Add new API key input
   */
  const handleAddKey = () => {
    setApiKeys([...apiKeys, '']);
    setShowApiKeys([...showApiKeys, false]);
  };

  /**
   * Remove API key input
   */
  const handleRemoveKey = (index: number) => {
    if (apiKeys.length === 1) return; // Keep at least one
    setApiKeys(apiKeys.filter((_, i) => i !== index));
    setShowApiKeys(showApiKeys.filter((_, i) => i !== index));
  };

  /**
   * Update API key value
   */
  const handleKeyChange = (index: number, value: string) => {
    const newKeys = [...apiKeys];
    newKeys[index] = value;
    setApiKeys(newKeys);
    
    // Reset validation status
    setValidationStatus({ ...validationStatus, [index]: null });
  };

  /**
   * Toggle API key visibility
   */
  const handleToggleVisibility = (index: number) => {
    const newShow = [...showApiKeys];
    newShow[index] = !newShow[index];
    setShowApiKeys(newShow);
  };

  /**
   * Quick validate API key format
   */
  const validateKeyFormat = (key: string): boolean => {
    if (!key || key.length < 20) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(key)) return false;
    return true;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Configuration</h2>
        <p className="text-sm text-slate-400">
          Configure your API keys and testing preferences
        </p>
      </div>

      {/* API Keys Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-medium text-white">API Keys</h3>
          </div>
          <button
            onClick={handleAddKey}
            disabled={testing || apiKeys.length >= 5}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            title="Add another API key"
          >
            <Plus className="w-4 h-4" />
            Add Key
          </button>
        </div>

        {/* API Key Inputs */}
        <div className="space-y-3">
          {apiKeys.map((key, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKeys[index] ? 'text' : 'password'}
                    value={key}
                    onChange={(e) => handleKeyChange(index, e.target.value)}
                    disabled={testing}
                    placeholder="Enter your Gemini API key (AIza...)"
                    className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                  />
                  
                  {/* Validation Indicator */}
                  {key && (
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                      {validateKeyFormat(key) ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                  
                  {/* Toggle Visibility Button */}
                  <button
                    onClick={() => handleToggleVisibility(index)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    title={showApiKeys[index] ? 'Hide key' : 'Show key'}
                  >
                    {showApiKeys[index] ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Remove Button */}
                {apiKeys.length > 1 && (
                  <button
                    onClick={() => handleRemoveKey(index)}
                    disabled={testing}
                    className="p-3 bg-slate-800 hover:bg-red-900/50 border border-slate-700 hover:border-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove this key"
                  >
                    <Trash2 className="w-5 h-5 text-slate-400 hover:text-red-400" />
                  </button>
                )}
              </div>

              {/* Validation Message */}
              {key && !validateKeyFormat(key) && (
                <p className="text-xs text-red-400 ml-1">
                  Invalid format. Key should be at least 20 characters and contain only alphanumeric characters, hyphens, and underscores.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* API Key Help */}
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
          <p className="text-sm text-blue-300 mb-2">
            <strong>How to get an API key:</strong>
          </p>
          <ol className="text-sm text-blue-200 space-y-1 ml-4 list-decimal">
            <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-100">Google AI Studio</a></li>
            <li>Click "Get API Key" or "Create API Key"</li>
            <li>Copy the key and paste it above</li>
            <li>Make sure billing is enabled for your project</li>
          </ol>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-medium text-white">Settings</h3>
        </div>

        {/* Cache Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Use Cache</span>
            </div>
            <p className="text-xs text-slate-400">
              Cache model information to speed up subsequent tests (24 hour TTL)
            </p>
          </div>
          <button
            onClick={() => setUseCache(!useCache)}
            disabled={testing}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              useCache ? 'bg-blue-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useCache ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Region Info */}
      {regionInfo && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-medium text-white">Region Information</h3>
          </div>

          <div className={`p-4 rounded-lg border ${
            regionInfo.allowed 
              ? 'bg-green-900/20 border-green-800/30' 
              : 'bg-red-900/20 border-red-800/30'
          }`}>
            <div className="flex items-start gap-3">
              {regionInfo.allowed ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium mb-1 ${
                  regionInfo.allowed ? 'text-green-300' : 'text-red-300'
                }`}>
                  Region: {regionInfo.region}
                </p>
                <p className={`text-xs ${
                  regionInfo.allowed ? 'text-green-200' : 'text-red-200'
                }`}>
                  {regionInfo.message || (regionInfo.allowed 
                    ? 'API access is available in your region' 
                    : 'API access may be restricted in your region'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <p className="text-sm text-slate-300 mb-2">
          <strong>💡 Tips:</strong>
        </p>
        <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
          <li>Multiple API keys allow testing with different accounts</li>
          <li>Cache speeds up repeated tests significantly</li>
          <li>Your API key is stored locally and never sent to our servers</li>
          <li>Make sure your API key has Generative Language API enabled</li>
        </ul>
      </div>
    </div>
  );
});

GeminiTesterConfigPanel.displayName = 'GeminiTesterConfigPanel';
