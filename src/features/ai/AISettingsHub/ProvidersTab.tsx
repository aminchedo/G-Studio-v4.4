/**
 * Providers Tab - AI Provider Management
 * 
 * Allows users to:
 * - View and configure built-in providers (Gemini, OpenAI, Anthropic)
 * - Add custom providers with OpenAI-compatible APIs
 * - Enable/disable providers
 * - Set active provider
 * - Test provider connections
 */

import React, { useState, useEffect } from 'react';
import { Plus, Check, Settings, Trash2, Zap, AlertCircle } from 'lucide-react';
import { ProviderStorage } from '@/services/aiProviders/storage';
import { StoredProviders } from '@/services/aiProviders/types';
import { CustomProviderModal } from './CustomProviderModal';

interface ProvidersTabProps {
  config: any;
  updateConfig: (key: string, value: any) => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({ config, updateConfig }) => {
  const [providers, setProviders] = useState<StoredProviders>(ProviderStorage.load());
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  // Reload providers when modal closes
  useEffect(() => {
    if (!showCustomModal) {
      setProviders(ProviderStorage.load());
    }
  }, [showCustomModal]);

  const handleToggleProvider = (providerId: string, enabled: boolean) => {
    ProviderStorage.toggleProvider(providerId, enabled);
    setProviders(ProviderStorage.load());
  };

  const handleSetActive = (providerId: string) => {
    ProviderStorage.setActiveProvider(providerId);
    setProviders(ProviderStorage.load());
  };

  const handleDeleteCustom = (providerId: string) => {
    if (confirm('Are you sure you want to delete this provider?')) {
      ProviderStorage.removeCustomProvider(providerId);
      setProviders(ProviderStorage.load());
    }
  };

  const handleEditCustom = (providerId: string) => {
    setEditingProvider(providerId);
    setShowCustomModal(true);
  };

  const handleAddCustom = () => {
    setEditingProvider(null);
    setShowCustomModal(true);
  };

  // Built-in provider info
  const builtInProviders = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Google\'s latest AI models with multimodal capabilities',
      icon: '🔷',
      models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-4 and GPT-3.5 models from OpenAI',
      icon: '🤖',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Claude models with advanced reasoning',
      icon: '🧠',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">AI Providers</h3>
        <p className="text-sm text-slate-600">
          Manage AI providers and configure custom endpoints
        </p>
      </div>

      {/* Built-in Providers */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Built-in Providers</h4>
        <div className="space-y-3">
          {builtInProviders.map((provider) => {
            const isEnabled = providers.builtIn[provider.id as keyof typeof providers.builtIn]?.enabled || false;
            const isActive = providers.activeProvider === provider.id;

            return (
              <div
                key={provider.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : isEnabled
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{provider.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-slate-800">{provider.name}</h5>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs font-bold rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{provider.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {provider.models.slice(0, 3).map((model) => (
                          <span
                            key={model}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEnabled && !isActive && (
                      <button
                        onClick={() => handleSetActive(provider.id)}
                        className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="Set as active"
                      >
                        <Zap size={16} className="text-indigo-600" />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleProvider(provider.id, !isEnabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isEnabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Providers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">Custom Providers</h4>
          <button
            onClick={handleAddCustom}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
          >
            <Plus size={16} />
            Add Custom
          </button>
        </div>

        {providers.custom.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <div className="text-slate-400 mb-2">
              <AlertCircle size={32} className="mx-auto" />
            </div>
            <p className="text-sm text-slate-600 mb-3">No custom providers yet</p>
            <button
              onClick={handleAddCustom}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Add your first custom provider
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {providers.custom.map((provider) => {
              const isActive = providers.activeProvider === provider.id;

              return (
                <div
                  key={provider.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-purple-500 bg-purple-50'
                      : provider.enabled
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-slate-800">{provider.name}</h5>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{provider.config.baseUrl}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {provider.config.models?.slice(0, 3).map((model) => (
                          <span
                            key={model}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.enabled && !isActive && (
                        <button
                          onClick={() => handleSetActive(provider.id)}
                          className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Set as active"
                        >
                          <Zap size={16} className="text-purple-600" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditCustom(provider.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Settings size={16} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustom(provider.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                      <button
                        onClick={() => handleToggleProvider(provider.id, !provider.enabled)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          provider.enabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Provider Modal */}
      {showCustomModal && (
        <CustomProviderModal
          isOpen={showCustomModal}
          onClose={() => {
            setShowCustomModal(false);
            setEditingProvider(null);
          }}
          editingProviderId={editingProvider}
        />
      )}
    </div>
  );
};
