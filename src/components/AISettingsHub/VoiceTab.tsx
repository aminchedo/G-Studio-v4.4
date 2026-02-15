/**
 * Voice & Language Tab - Voice Input Configuration
 * 
 * Features:
 * - Voice input enable/disable
 * - Language selection
 * - Voice model configuration
 * - Auto-send toggle
 * - Confidence threshold
 * - Microphone testing
 */

import React, { useState } from 'react';
import { Mic, Globe, Volume2, CheckCircle2, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import { AIConfig } from '@/components/AISettingsHub/types';

interface VoiceTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

const LANGUAGES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'fa-IR', name: 'Persian (Farsi)', flag: '🇮🇷' },
  { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦' },
];

const VOICE_MODELS = [
  { value: 'Vosk', label: 'Vosk', description: 'Offline speech recognition' },
  { value: 'Web Speech API', label: 'Web Speech API', description: 'Browser-based recognition' },
  { value: 'Google Cloud', label: 'Google Cloud', description: 'Cloud-based recognition' },
];

export const VoiceTab: React.FC<VoiceTabProps> = ({ config, updateConfig }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTestMicrophone = async () => {
    setIsTesting(true);
    setTestStatus('idle');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setTestStatus('success');
      
      // Stop the stream after testing
      stream.getTracks().forEach(track => track.stop());
      
      setTimeout(() => {
        setTestStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Microphone test failed:', error);
      setTestStatus('error');
      
      setTimeout(() => {
        setTestStatus('idle');
      }, 3000);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Voice Input Toggle */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              config.voiceEnabled ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' : 'bg-slate-300'
            }`}>
              <Mic className="w-7 h-7 text-white" />
            </div>
            <div>
              <label className="text-base font-bold text-slate-700 block mb-1">Voice Input</label>
              <p className="text-sm text-slate-600">
                {config.voiceEnabled ? 'Voice commands are enabled' : 'Enable voice commands for hands-free interaction'}
              </p>
            </div>
          </div>
          <button
            onClick={() => updateConfig('voiceEnabled', !config.voiceEnabled)}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              config.voiceEnabled ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md ${
                config.voiceEnabled ? 'translate-x-9' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Language Selection */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Language
          <span className="ml-2 text-xs font-normal text-slate-500 normal-case">Select your preferred language</span>
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => updateConfig('language', lang.code)}
              disabled={!config.voiceEnabled}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                config.language === lang.code
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 text-white shadow-lg'
                  : config.voiceEnabled
                  ? 'bg-white border-slate-200 hover:border-blue-400 text-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </div>
                {config.language === lang.code && (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Voice Model Selection */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Voice Recognition Model
        </label>
        
        <div className="space-y-3">
          {VOICE_MODELS.map(model => (
            <button
              key={model.value}
              onClick={() => updateConfig('voiceModel', model.value)}
              disabled={!config.voiceEnabled}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                config.voiceModel === model.value
                  ? 'bg-gradient-to-br from-purple-600 to-purple-700 border-purple-600 text-white shadow-lg'
                  : config.voiceEnabled
                  ? 'bg-white border-slate-200 hover:border-purple-400 text-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold mb-1">{model.label}</div>
                  <p className={`text-sm ${config.voiceModel === model.value ? 'opacity-90' : 'text-slate-500'}`}>
                    {model.description}
                  </p>
                </div>
                {config.voiceModel === model.value && (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Auto-Send Toggle */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-1">Auto-Send Voice Commands</label>
            <p className="text-xs text-slate-600">
              Automatically send voice input when you stop speaking
            </p>
          </div>
          <button
            onClick={() => updateConfig('autoSend', !config.autoSend)}
            disabled={!config.voiceEnabled}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              config.autoSend && config.voiceEnabled ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                config.autoSend ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Confidence Threshold */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Confidence Threshold
          <span className="ml-2 text-xs font-normal text-slate-500 normal-case">Minimum confidence for voice recognition</span>
        </label>
        
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">Threshold</span>
            <span className="text-lg font-mono font-bold text-purple-600">{(config.confidenceThreshold * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.confidenceThreshold}
            onChange={(e) => updateConfig('confidenceThreshold', parseFloat(e.target.value))}
            disabled={!config.voiceEnabled}
            className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Low (0%)</span>
            <span>Medium (50%)</span>
            <span>High (100%)</span>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Lower threshold = more sensitive (may include errors)<br />
            Higher threshold = more accurate (may miss some commands)
          </p>
        </div>
      </section>

      {/* Microphone Test */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-1">Microphone Test</h3>
            <p className="text-xs text-slate-600">Test your microphone and voice recognition</p>
          </div>
          <button
            onClick={handleTestMicrophone}
            disabled={isTesting || !config.voiceEnabled}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <Volume2 className="w-4 h-4 animate-pulse" />
                Testing...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Test Microphone
              </>
            )}
          </button>
        </div>

        {testStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">Microphone is working correctly!</span>
          </div>
        )}

        {testStatus === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Microphone access denied or not available</span>
          </div>
        )}
      </section>

      {/* Keyboard Shortcuts Info */}
      <section className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon className="w-5 h-5 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Keyboard Shortcuts</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-sm text-slate-700">Start/Stop Voice Input</span>
            <kbd className="px-3 py-1 bg-slate-200 text-slate-700 rounded font-mono text-xs font-bold">Ctrl + Shift + V</kbd>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-sm text-slate-700">Toggle Auto-Send</span>
            <kbd className="px-3 py-1 bg-slate-200 text-slate-700 rounded font-mono text-xs font-bold">Ctrl + Shift + A</kbd>
          </div>
        </div>
      </section>
    </div>
  );
};
