/**
 * Modern API Keys Settings Section
 * Secure credential management with enterprise-level UI
 */

import React, { useState } from 'react';
import { useSettingsStore } from '../settingsStore';
import { 
  SettingGroup, 
  SettingRow, 
  SecretInput,
  Input
} from '../components/SettingControlsModern';

interface APIStatus {
  [key: string]: {
    valid: boolean;
    lastChecked?: Date;
  };
}

const APIKeysSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const apiKeys = settings.apiKeys;
  const [apiStatus, setApiStatus] = useState<APIStatus>({});

  const handleAPIKeyChange = (provider: keyof typeof apiKeys, value: string) => {
    if (typeof apiKeys[provider] === 'string') {
      updateSettings('apiKeys', { [provider]: value });
      // Reset status when key changes
      setApiStatus(prev => ({
        ...prev,
        [provider]: { valid: false }
      }));
    }
  };

  const providers = [
    {
      id: 'openai' as const,
      name: 'OpenAI',
      description: 'GPT-4, GPT-3.5, DALL-E, Whisper, and Embeddings',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
        </svg>
      ),
      placeholder: 'sk-...',
      docs: 'https://platform.openai.com/api-keys'
    },
    {
      id: 'anthropic' as const,
      name: 'Anthropic',
      description: 'Claude 3 Opus, Sonnet, and Haiku models',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      placeholder: 'sk-ant-...',
      docs: 'https://console.anthropic.com/settings/keys'
    },
    {
      id: 'google' as const,
      name: 'Google AI',
      description: 'Gemini Pro, PaLM 2, and other Google models',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
        </svg>
      ),
      placeholder: 'AIza...',
      docs: 'https://makersuite.google.com/app/apikey'
    },
    {
      id: 'cohere' as const,
      name: 'Cohere',
      description: 'Command, Embed, and Rerank models',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      placeholder: 'co-...',
      docs: 'https://dashboard.cohere.com/api-keys'
    },
    {
      id: 'huggingface' as const,
      name: 'Hugging Face',
      description: 'Access thousands of open-source models',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      placeholder: 'hf_...',
      docs: 'https://huggingface.co/settings/tokens'
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Security Notice */}
      <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-100/50 p-6 dark:border-amber-900/60 dark:from-amber-900/20 dark:to-amber-800/20">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-amber-900 dark:text-amber-100">Security Notice</h4>
            <p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              API keys are stored securely in your local browser storage using encryption. 
              Never share your API keys publicly or commit them to version control. 
              Keep them confidential to prevent unauthorized access to your accounts.
            </p>
          </div>
        </div>
      </div>

      {/* API Providers */}
      {providers.map((provider) => (
        <SettingGroup 
          key={provider.id}
          title={provider.name}
          description={provider.description}
          icon={provider.icon}
        >
          <SettingRow
            label="API Key"
            description={
              <span className="flex items-center gap-2">
                Securely stored credential for authentication
                <a 
                  href={provider.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                >
                  Get API Key
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </span>
            }
          >
            <SecretInput
              value={apiKeys[provider.id] as string}
              onChange={(value) => handleAPIKeyChange(provider.id, value)}
              placeholder={provider.placeholder}
            />
          </SettingRow>
        </SettingGroup>
      ))}

      {/* Custom Endpoints */}
      <SettingGroup 
        title="Custom Endpoints" 
        description="Configure custom API endpoints for self-hosted or enterprise deployments"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        }
      >
        <SettingRow
          label="Custom API Endpoint"
          description="Enter a custom API endpoint URL for enterprise or self-hosted deployments"
          badge="Advanced"
        >
          <Input
            value={apiKeys.customEndpoints['default'] || ''}
            onChange={(value) => updateSettings('apiKeys', { 
              customEndpoints: { ...apiKeys.customEndpoints, default: value }
            })}
            placeholder="https://api.your-domain.com/v1"
            type="url"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            }
          />
        </SettingRow>
      </SettingGroup>

      {/* Help Card */}
      <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 dark:border-blue-900/60 dark:from-blue-900/20 dark:to-blue-800/20">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 dark:text-blue-100">Need Help?</h4>
            <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>API keys are encrypted before storage</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Keys never leave your browser or local storage</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>You can revoke keys anytime from the provider's dashboard</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIKeysSettings;
