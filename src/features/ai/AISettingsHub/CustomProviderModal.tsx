/**
 * Custom Provider Modal
 * 
 * Modal for adding/editing custom AI providers.
 * Supports OpenAI-compatible APIs with flexible authentication.
 */

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Loader } from 'lucide-react';
import { ProviderStorage } from '@/services/aiProviders/storage';
import { CustomProviderConfig, AuthType, RequestFormat } from '@/services/aiProviders/types';
import { CustomProvider } from '@/services/aiProviders/custom';

interface CustomProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProviderId: string | null;
}

export const CustomProviderModal: React.FC<CustomProviderModalProps> = ({
  isOpen,
  onClose,
  editingProviderId,
}) => {
  const [formData, setFormData] = useState<Partial<CustomProviderConfig>>({
    id: '',
    name: '',
    apiKey: '',
    baseUrl: '',
    authType: 'bearer',
    requestFormat: 'openai',
    models: [],
    temperature: 0.7,
    maxTokens: 4096,
  });

  const [modelsInput, setModelsInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing provider data if editing
  useEffect(() => {
    if (editingProviderId) {
      const config = ProviderStorage.getProviderConfig(editingProviderId);
      if (config && 'authType' in config) {
        setFormData(config as CustomProviderConfig);
        setModelsInput(config.models?.join(', ') || '');
      }
    }
  }, [editingProviderId]);

  const handleChange = (field: keyof CustomProviderConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = async () => {
    if (!formData.baseUrl || !formData.apiKey) {
      setTestResult({ success: false, message: 'Please fill in API endpoint and key' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const testConfig: CustomProviderConfig = {
        id: formData.id || 'test',
        name: formData.name || 'Test',
        apiKey: formData.apiKey,
        baseUrl: formData.baseUrl,
        authType: formData.authType || 'bearer',
        requestFormat: formData.requestFormat || 'openai',
        models: modelsInput.split(',').map((m) => m.trim()).filter(Boolean),
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
      };

      const provider = new CustomProvider(testConfig, 'test');
      
      const startTime = Date.now();
      const result = await provider.createChatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 10,
      });
      const responseTime = Date.now() - startTime;

      if (result.choices?.[0]?.message?.content) {
        setTestResult({
          success: true,
          message: `Connection successful! Response time: ${responseTime}ms`,
        });
      } else {
        setTestResult({
          success: false,
          message: 'Connection succeeded but no response received',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    // Validation
    if (!formData.name || !formData.baseUrl || !formData.apiKey) {
      alert('Please fill in all required fields');
      return;
    }

    const models = modelsInput.split(',').map((m) => m.trim()).filter(Boolean);
    if (models.length === 0) {
      alert('Please specify at least one model');
      return;
    }

    const config: CustomProviderConfig = {
      id: formData.id || `custom-${Date.now()}`,
      name: formData.name,
      apiKey: formData.apiKey,
      baseUrl: formData.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      authType: formData.authType || 'bearer',
      requestFormat: formData.requestFormat || 'openai',
      models,
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      customHeaders: formData.customHeaders,
    };

    ProviderStorage.addCustomProvider(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">
            {editingProviderId ? 'Edit Custom Provider' : 'Add Custom Provider'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            {/* Provider Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Provider Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="My Custom Provider"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* API Endpoint */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                API Endpoint *
              </label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={(e) => handleChange('baseUrl', e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                API Key *
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Authentication Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Authentication Type
              </label>
              <select
                value={formData.authType}
                onChange={(e) => handleChange('authType', e.target.value as AuthType)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="bearer">Bearer Token</option>
                <option value="api-key">API Key Header</option>
                <option value="basic">Basic Auth</option>
                <option value="none">No Authentication</option>
              </select>
            </div>

            {/* Request Format */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Request Format
              </label>
              <select
                value={formData.requestFormat}
                onChange={(e) => handleChange('requestFormat', e.target.value as RequestFormat)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="openai">OpenAI Compatible</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Models */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Available Models * (comma-separated)
              </label>
              <input
                type="text"
                value={modelsInput}
                onChange={(e) => setModelsInput(e.target.value)}
                placeholder="model-1, model-2, model-3"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Test Connection */}
            <div>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors font-semibold disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Test Connection
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {testResult.success ? (
                    <Check size={16} className="text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-red-600 mt-0.5" />
                  )}
                  <span
                    className={`text-sm ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {testResult.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            {editingProviderId ? 'Save Changes' : 'Add Provider'}
          </button>
        </div>
      </div>
    </div>
  );
};
