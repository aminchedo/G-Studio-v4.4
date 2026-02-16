/**
 * Providers Tab - AI Provider Management (Dark, Compact)
 */

import React, { useState, useEffect } from 'react';
import { ProviderStorage } from '@/services/aiProviders/storage';
import { StoredProviders } from '@/services/aiProviders/types';
import { CustomProviderModal } from './CustomProviderModal';

// Icons
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
  </svg>
);

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

interface ProvidersTabProps {
  config: any;
  updateConfig: (key: string, value: any) => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({ config, updateConfig }) => {
  const [providers, setProviders] = useState<StoredProviders>(ProviderStorage.load());
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

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
    if (confirm('Delete this provider?')) {
      ProviderStorage.removeCustomProvider(providerId);
      setProviders(ProviderStorage.load());
    }
  };

  const builtInProviders = [
    { id: 'gemini', name: 'Gemini', icon: '🔷', models: ['2.0-flash', '1.5-pro'] },
    { id: 'openai', name: 'OpenAI', icon: '🤖', models: ['gpt-4', 'gpt-3.5'] },
    { id: 'anthropic', name: 'Claude', icon: '🧠', models: ['opus', 'sonnet'] },
  ];

  return (
    <div className="space-y-2">
      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60">
          <h3 className="text-[10px] font-semibold text-white">Built-in</h3>
        </div>
        <div className="p-2 space-y-1">
          {builtInProviders.map((provider) => {
            const isEnabled = providers.builtIn[provider.id as keyof typeof providers.builtIn]?.enabled || false;
            const isActive = providers.activeProvider === provider.id;

            return (
              <div
                key={provider.id}
                className={`flex items-center gap-2 p-2 rounded-lg border ${
                  isActive
                    ? 'bg-violet-500/20 border-violet-500/40'
                    : isEnabled
                    ? 'bg-slate-800/60 border-slate-600/50'
                    : 'bg-slate-900/60 border-slate-700/40 opacity-50'
                }`}
              >
                <span className="text-lg">{provider.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-slate-200">{provider.name}</span>
                    {isActive && (
                      <span className="px-1 py-0.5 bg-violet-500 text-white text-[8px] font-bold rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    {provider.models.map((m) => (
                      <span key={m} className="text-[8px] text-slate-500">{m}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isEnabled && !isActive && (
                    <button
                      onClick={() => handleSetActive(provider.id)}
                      className="p-1 hover:bg-violet-500/20 rounded"
                      title="Set active"
                    >
                      <ZapIcon />
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleProvider(provider.id, !isEnabled)}
                    className={`relative w-6 h-3 rounded-full transition-all ${isEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-3' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold text-white">Custom</h3>
          <button
            onClick={() => {
              setEditingProvider(null);
              setShowCustomModal(true);
            }}
            className="p-1 hover:bg-violet-500/20 rounded"
          >
            <PlusIcon />
          </button>
        </div>
        {providers.custom.length === 0 ? (
          <div className="p-3 text-center">
            <p className="text-[10px] text-slate-500">No custom providers</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {providers.custom.map((provider) => {
              const isActive = providers.activeProvider === provider.id;

              return (
                <div
                  key={provider.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    isActive
                      ? 'bg-purple-500/20 border-purple-500/40'
                      : provider.enabled
                      ? 'bg-slate-800/60 border-slate-600/50'
                      : 'bg-slate-900/60 border-slate-700/40 opacity-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-slate-200 truncate">{provider.name}</span>
                      {isActive && (
                        <span className="px-1 py-0.5 bg-purple-500 text-white text-[8px] font-bold rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] text-slate-500 truncate block">{provider.config.baseUrl}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {provider.enabled && !isActive && (
                      <button
                        onClick={() => handleSetActive(provider.id)}
                        className="p-1 hover:bg-purple-500/20 rounded"
                        title="Set active"
                      >
                        <ZapIcon />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingProvider(provider.id);
                        setShowCustomModal(true);
                      }}
                      className="p-1 hover:bg-slate-700 rounded"
                      title="Edit"
                    >
                      <SettingsIcon />
                    </button>
                    <button
                      onClick={() => handleDeleteCustom(provider.id)}
                      className="p-1 hover:bg-red-500/20 rounded"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                    <button
                      onClick={() => handleToggleProvider(provider.id, !provider.enabled)}
                      className={`relative w-6 h-3 rounded-full transition-all ${provider.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full transition-transform ${provider.enabled ? 'translate-x-3' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
