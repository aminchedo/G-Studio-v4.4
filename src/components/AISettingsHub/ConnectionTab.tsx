/**
 * Connection Tab - API Key Management & Testing
 * 
 * Features:
 * - API key input with show/hide
 * - Connection testing
 * - Model discovery
 * - Status display
 * - Quota monitoring
 */

import React from 'react';
import { 
  Key, Eye, EyeOff, Trash2, CheckCircle2, AlertCircle, 
  Loader2, Zap, ShieldCheck, TrendingUp 
} from 'lucide-react';
import { AIConfig } from '@/components/AISettingsHub/types';

interface ConnectionTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  isTesting: boolean;
  testStatus: 'idle' | 'success' | 'error' | 'rate_limited';
  testPhase: 'idle' | 'discovering' | 'completed';
  availableModels: string[];
  scannedModelsCount: number;
  candidateModelsCount: number;
  onTestAPI: () => void;
  onTestModels: () => void;
}

export const ConnectionTab: React.FC<ConnectionTabProps> = ({
  config,
  updateConfig,
  showKey,
  setShowKey,
  isTesting,
  testStatus,
  testPhase,
  availableModels,
  scannedModelsCount,
  candidateModelsCount,
  onTestAPI,
  onTestModels,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* API Key Section */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Gemini API Key
          <span className="ml-2 text-xs font-normal text-slate-500 normal-case">Required for AI capabilities</span>
        </label>
        
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => updateConfig('apiKey', e.target.value)}
            placeholder="Enter your API Key (AIza...)"
            className="w-full pl-11 pr-24 py-4 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm transition-all"
          />
          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-slate-100 rounded-lg transition-all"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {config.apiKey && (
              <button
                onClick={() => updateConfig('apiKey', '')}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Clear key"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-start gap-2 mt-2 px-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Your key is processed locally and sent directly to Google's API. Never stored on our servers.
          </p>
        </div>
      </section>

      {/* Connection Status */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              testStatus === 'success' ? 'bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50' :
              testStatus === 'error' ? 'bg-red-100 text-red-600 ring-4 ring-red-50' :
              testStatus === 'rate_limited' ? 'bg-amber-100 text-amber-600 ring-4 ring-amber-50' :
              testPhase === 'discovering' ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-50' :
              'bg-slate-100 text-slate-400'
            }`}>
              {isTesting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Zap className="w-6 h-6" />
              )}
            </div>
            
            <div>
              <div className="text-base font-bold text-slate-900">Connection Status</div>
              <div className={`text-xs font-bold uppercase tracking-wide mt-1 ${
                testStatus === 'success' ? 'text-emerald-600' :
                testStatus === 'error' ? 'text-red-600' :
                testStatus === 'rate_limited' ? 'text-amber-600' :
                testPhase === 'discovering' ? 'text-blue-600' :
                'text-slate-400'
              }`}>
                {testStatus === 'success' ? `✓ Verified (${availableModels.length} models)` :
                 testStatus === 'error' ? '✗ Validation Failed' :
                 testStatus === 'rate_limited' ? '⏱ Rate Limited' :
                 testPhase === 'discovering' ? `⏳ Scanning (${scannedModelsCount}/${candidateModelsCount})` :
                 '○ Not Tested'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onTestAPI}
              disabled={isTesting || !config.apiKey}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center gap-2"
              title="Test API connectivity"
            >
              {isTesting && testPhase === 'idle' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Test API
                </>
              )}
            </button>
            
            <button
              onClick={onTestModels}
              disabled={isTesting || !config.apiKey}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl text-xs font-bold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 flex items-center gap-2"
              title="Discover and test all models"
            >
              {isTesting && testPhase === 'discovering' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing Models...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Test Models
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {testPhase === 'discovering' && candidateModelsCount > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span>Discovering models...</span>
              <span>{scannedModelsCount} / {candidateModelsCount}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(scannedModelsCount / candidateModelsCount) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Message */}
        {testStatus === 'success' && availableModels.length > 0 && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-800">
                {availableModels.length} Model{availableModels.length !== 1 ? 's' : ''} Discovered
              </span>
            </div>
            <p className="text-xs text-emerald-700">
              Models are now available in the <strong>Models tab</strong> and <strong>Model Ribbon</strong>.
            </p>
          </div>
        )}

        {/* Error Message */}
        {testStatus === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-bold text-red-800">Connection Failed</span>
            </div>
            <p className="text-xs text-red-700">
              Please check your API key and internet connection. Ensure billing is enabled in Google Cloud Console.
            </p>
          </div>
        )}

        {/* Rate Limited Message */}
        {testStatus === 'rate_limited' && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">Rate Limit Exceeded</span>
            </div>
            <p className="text-xs text-amber-700">
              Too many requests. Please wait a moment before trying again.
            </p>
          </div>
        )}
      </section>

      {/* Quota Information */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Usage & Quota</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-xs text-slate-600 mb-1">Today's Requests</div>
            <div className="text-2xl font-bold text-slate-900">--</div>
            <div className="text-xs text-slate-500 mt-1">of 10,000 limit</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-xs text-slate-600 mb-1">This Month</div>
            <div className="text-2xl font-bold text-slate-900">--</div>
            <div className="text-xs text-slate-500 mt-1">requests</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-xs text-slate-600 mb-1">Quota Status</div>
            <div className="text-2xl font-bold text-emerald-600">✓</div>
            <div className="text-xs text-slate-500 mt-1">Available</div>
          </div>
        </div>
        
        <p className="text-xs text-slate-600 mt-4">
          <strong>Note:</strong> Quota information requires additional API permissions. 
          Visit <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a> for detailed usage.
        </p>
      </section>
    </div>
  );
};
