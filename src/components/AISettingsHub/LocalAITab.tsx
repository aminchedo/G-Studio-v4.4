/**
 * Local AI Tab - Local Model Configuration
 * 
 * Features:
 * - LM Studio integration
 * - Local model management
 * - Offline mode configuration
 * - Fallback to cloud toggle
 * - Prompt improvement settings
 */

import React, { useState, useEffect } from 'react';
import { 
  Cpu, Download, Play, Pause, CheckCircle2, AlertCircle, 
  Loader2, HardDrive, Cloud, Zap, Settings as SettingsIcon 
} from 'lucide-react';
import { AIConfig } from '@/components/AISettingsHub/types';

interface LocalAITabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

const OFFLINE_MODES = [
  { value: 'auto', label: 'Auto', description: 'Intelligently choose between cloud and local', icon: Zap },
  { value: 'cloud', label: 'Cloud Only', description: 'Always use cloud AI (requires internet)', icon: Cloud },
  { value: 'local', label: 'Local Only', description: 'Always use local AI (works offline)', icon: HardDrive },
  { value: 'hybrid', label: 'Hybrid', description: 'Use both based on task complexity', icon: Cpu },
];

export const LocalAITab: React.FC<LocalAITabProps> = ({ config, updateConfig }) => {
  const [modelStatus, setModelStatus] = useState<'not_installed' | 'unloaded' | 'loading' | 'ready' | 'error'>('not_installed');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Simulate model status check
  useEffect(() => {
    // In real implementation, check actual model status
    // For now, simulate based on config
    if (config.localAIEnabled && config.localModel) {
      setModelStatus('ready');
    } else {
      setModelStatus('not_installed');
    }
  }, [config.localAIEnabled, config.localModel]);

  const handleDownloadModel = () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          setModelStatus('ready');
          updateConfig('localModel', 'llama-2-7b-chat');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleLoadModel = () => {
    setModelStatus('loading');
    setTimeout(() => {
      setModelStatus('ready');
      updateConfig('localAIEnabled', true);
    }, 2000);
  };

  const handleUnloadModel = () => {
    setModelStatus('unloaded');
    updateConfig('localAIEnabled', false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Local AI Status */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              modelStatus === 'ready' ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' :
              modelStatus === 'loading' ? 'bg-gradient-to-br from-blue-600 to-blue-700' :
              modelStatus === 'error' ? 'bg-gradient-to-br from-red-600 to-red-700' :
              'bg-slate-300'
            }`}>
              {modelStatus === 'loading' ? (
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              ) : (
                <Cpu className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <label className="text-base font-bold text-slate-700 block mb-1">Local AI Model</label>
              <p className="text-sm text-slate-600">
                {modelStatus === 'ready' ? 'Model loaded and ready' :
                 modelStatus === 'loading' ? 'Loading model...' :
                 modelStatus === 'unloaded' ? 'Model available but not loaded' :
                 modelStatus === 'error' ? 'Error loading model' :
                 'No model installed'}
              </p>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-full text-sm font-bold ${
            modelStatus === 'ready' ? 'bg-emerald-100 text-emerald-700' :
            modelStatus === 'loading' ? 'bg-blue-100 text-blue-700' :
            modelStatus === 'error' ? 'bg-red-100 text-red-700' :
            'bg-slate-200 text-slate-600'
          }`}>
            {modelStatus === 'ready' ? '✓ Ready' :
             modelStatus === 'loading' ? '⏳ Loading' :
             modelStatus === 'unloaded' ? '○ Unloaded' :
             modelStatus === 'error' ? '✗ Error' :
             '○ Not Installed'}
          </div>
        </div>

        {/* Download Progress */}
        {isDownloading && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>Downloading model...</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {modelStatus === 'not_installed' && (
            <button
              onClick={handleDownloadModel}
              disabled={isDownloading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Model
            </button>
          )}
          
          {modelStatus === 'unloaded' && (
            <button
              onClick={handleLoadModel}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Load Model
            </button>
          )}
          
          {modelStatus === 'ready' && (
            <button
              onClick={handleUnloadModel}
              className="flex-1 px-4 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <Pause className="w-5 h-5" />
              Unload Model
            </button>
          )}
        </div>
      </section>

      {/* LM Studio Connection */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          LM Studio Integration
        </label>
        
        <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-bold text-slate-900">LM Studio</div>
                <div className="text-xs text-slate-500">Local model server</div>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
              ✓ Connected
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span className="text-slate-600">Server URL:</span>
              <span className="font-mono text-slate-900">http://localhost:1234</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span className="text-slate-600">Model:</span>
              <span className="font-mono text-slate-900">{config.localModel || 'None'}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span className="text-slate-600">Status:</span>
              <span className="font-bold text-emerald-600">Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Offline Mode Selection */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          AI Mode Preference
        </label>
        
        <div className="grid grid-cols-2 gap-4">
          {OFFLINE_MODES.map(mode => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                onClick={() => updateConfig('offlineMode', mode.value as any)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  config.offlineMode === mode.value
                    ? 'bg-gradient-to-br from-purple-600 to-purple-700 border-purple-600 text-white shadow-lg'
                    : 'bg-white border-slate-200 hover:border-purple-400 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${config.offlineMode === mode.value ? 'text-white' : 'text-purple-600'}`} />
                  <span className="font-bold">{mode.label}</span>
                  {config.offlineMode === mode.value && (
                    <CheckCircle2 className="w-5 h-5 ml-auto" />
                  )}
                </div>
                <p className={`text-xs ${config.offlineMode === mode.value ? 'opacity-90' : 'text-slate-500'}`}>
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Fallback to Cloud */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-1">Fallback to Cloud</label>
            <p className="text-xs text-slate-600">
              Use cloud AI when local model is unavailable or overloaded
            </p>
          </div>
          <button
            onClick={() => updateConfig('fallbackToCloud', !config.fallbackToCloud)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              config.fallbackToCloud ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                config.fallbackToCloud ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Prompt Improvement */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Prompt Improvement
        </label>
        
        <div className="bg-white border-2 border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1">Enable Prompt Improvement</label>
              <p className="text-xs text-slate-600">
                Automatically enhance prompts for better results
              </p>
            </div>
            <button
              onClick={() => updateConfig('promptImprovement', !config.promptImprovement)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                config.promptImprovement ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                  config.promptImprovement ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {config.promptImprovement && (
            <div className="pt-4 border-t border-slate-200">
              <label className="text-sm font-medium text-slate-700 block mb-3">Improvement Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateConfig('promptMode', 'deterministic')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    config.promptMode === 'deterministic'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 hover:border-blue-400 text-slate-700'
                  }`}
                >
                  <div className="font-bold mb-1">Deterministic</div>
                  <p className="text-xs opacity-90">Preserve exact meaning</p>
                </button>
                <button
                  onClick={() => updateConfig('promptMode', 'creative')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    config.promptMode === 'creative'
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-slate-200 hover:border-purple-400 text-slate-700'
                  }`}
                >
                  <div className="font-bold mb-1">Creative</div>
                  <p className="text-xs opacity-90">Enhance clarity</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-bold mb-1">Local AI Benefits</p>
          <ul className="text-xs space-y-1 text-blue-800">
            <li>• <strong>Privacy:</strong> Your data never leaves your device</li>
            <li>• <strong>Speed:</strong> No network latency for faster responses</li>
            <li>• <strong>Offline:</strong> Works without internet connection</li>
            <li>• <strong>Cost:</strong> No API usage fees</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
