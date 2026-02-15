/**
 * Voice Output Tab - Text-to-Speech Configuration
 * 
 * Features:
 * - Enable/Disable voice output
 * - Select from Google's available voices
 * - Voice customization (speed, pitch, volume)
 * - Test voice with sample text
 * - Language-specific voice filtering
 */

import React, { useState, useEffect } from 'react';
import { 
  Volume2, VolumeX, Play, Pause, Settings, 
  Globe, User, CheckCircle2, Gauge, Music
} from 'lucide-react';
import { AIConfig } from '@/components/AISettingsHub/types';

interface VoiceOutputTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

interface GoogleVoice {
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'neutral';
  localName: string;
}

// Google Cloud Text-to-Speech voices (most popular ones)
const GOOGLE_VOICES: GoogleVoice[] = [
  // English (US)
  { name: 'en-US-Neural2-A', lang: 'en-US', gender: 'male', localName: 'English (US) - Male A' },
  { name: 'en-US-Neural2-C', lang: 'en-US', gender: 'female', localName: 'English (US) - Female C' },
  { name: 'en-US-Neural2-D', lang: 'en-US', gender: 'male', localName: 'English (US) - Male D' },
  { name: 'en-US-Neural2-E', lang: 'en-US', gender: 'female', localName: 'English (US) - Female E' },
  { name: 'en-US-Neural2-F', lang: 'en-US', gender: 'female', localName: 'English (US) - Female F' },
  { name: 'en-US-Neural2-G', lang: 'en-US', gender: 'female', localName: 'English (US) - Female G' },
  { name: 'en-US-Neural2-H', lang: 'en-US', gender: 'female', localName: 'English (US) - Female H' },
  { name: 'en-US-Neural2-I', lang: 'en-US', gender: 'male', localName: 'English (US) - Male I' },
  { name: 'en-US-Neural2-J', lang: 'en-US', gender: 'male', localName: 'English (US) - Male J' },
  
  // English (UK)
  { name: 'en-GB-Neural2-A', lang: 'en-GB', gender: 'female', localName: 'English (UK) - Female A' },
  { name: 'en-GB-Neural2-B', lang: 'en-GB', gender: 'male', localName: 'English (UK) - Male B' },
  { name: 'en-GB-Neural2-C', lang: 'en-GB', gender: 'female', localName: 'English (UK) - Female C' },
  { name: 'en-GB-Neural2-D', lang: 'en-GB', gender: 'male', localName: 'English (UK) - Male D' },
  { name: 'en-GB-Neural2-F', lang: 'en-GB', gender: 'female', localName: 'English (UK) - Female F' },
  
  // Persian (Farsi)
  { name: 'fa-IR-Standard-A', lang: 'fa-IR', gender: 'female', localName: 'فارسی - زن A' },
  { name: 'fa-IR-Standard-B', lang: 'fa-IR', gender: 'male', localName: 'فارسی - مرد B' },
  { name: 'fa-IR-Standard-C', lang: 'fa-IR', gender: 'female', localName: 'فارسی - زن C' },
  { name: 'fa-IR-Standard-D', lang: 'fa-IR', gender: 'male', localName: 'فارسی - مرد D' },
  
  // Spanish
  { name: 'es-ES-Neural2-A', lang: 'es-ES', gender: 'female', localName: 'Español - Mujer A' },
  { name: 'es-ES-Neural2-B', lang: 'es-ES', gender: 'male', localName: 'Español - Hombre B' },
  { name: 'es-ES-Neural2-C', lang: 'es-ES', gender: 'female', localName: 'Español - Mujer C' },
  { name: 'es-ES-Neural2-D', lang: 'es-ES', gender: 'female', localName: 'Español - Mujer D' },
  
  // French
  { name: 'fr-FR-Neural2-A', lang: 'fr-FR', gender: 'female', localName: 'Français - Femme A' },
  { name: 'fr-FR-Neural2-B', lang: 'fr-FR', gender: 'male', localName: 'Français - Homme B' },
  { name: 'fr-FR-Neural2-C', lang: 'fr-FR', gender: 'female', localName: 'Français - Femme C' },
  { name: 'fr-FR-Neural2-D', lang: 'fr-FR', gender: 'male', localName: 'Français - Homme D' },
  
  // German
  { name: 'de-DE-Neural2-A', lang: 'de-DE', gender: 'female', localName: 'Deutsch - Frau A' },
  { name: 'de-DE-Neural2-B', lang: 'de-DE', gender: 'male', localName: 'Deutsch - Mann B' },
  { name: 'de-DE-Neural2-C', lang: 'de-DE', gender: 'female', localName: 'Deutsch - Frau C' },
  { name: 'de-DE-Neural2-D', lang: 'de-DE', gender: 'male', localName: 'Deutsch - Mann D' },
  
  // Japanese
  { name: 'ja-JP-Neural2-B', lang: 'ja-JP', gender: 'female', localName: '日本語 - 女性 B' },
  { name: 'ja-JP-Neural2-C', lang: 'ja-JP', gender: 'male', localName: '日本語 - 男性 C' },
  { name: 'ja-JP-Neural2-D', lang: 'ja-JP', gender: 'male', localName: '日本語 - 男性 D' },
  
  // Chinese (Mandarin)
  { name: 'cmn-CN-Standard-A', lang: 'cmn-CN', gender: 'female', localName: '中文 - 女 A' },
  { name: 'cmn-CN-Standard-B', lang: 'cmn-CN', gender: 'male', localName: '中文 - 男 B' },
  { name: 'cmn-CN-Standard-C', lang: 'cmn-CN', gender: 'male', localName: '中文 - 男 C' },
  { name: 'cmn-CN-Standard-D', lang: 'cmn-CN', gender: 'female', localName: '中文 - 女 D' },
  
  // Arabic
  { name: 'ar-XA-Standard-A', lang: 'ar-XA', gender: 'female', localName: 'العربية - أنثى A' },
  { name: 'ar-XA-Standard-B', lang: 'ar-XA', gender: 'male', localName: 'العربية - ذكر B' },
  { name: 'ar-XA-Standard-C', lang: 'ar-XA', gender: 'male', localName: 'العربية - ذكر C' },
  { name: 'ar-XA-Standard-D', lang: 'ar-XA', gender: 'female', localName: 'العربية - أنثى D' },
];

const LANGUAGES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'fa-IR', name: 'فارسی', flag: '🇮🇷' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'cmn-CN', name: '中文', flag: '🇨🇳' },
  { code: 'ar-XA', name: 'العربية', flag: '🇸🇦' },
];

export const VoiceOutputTab: React.FC<VoiceOutputTabProps> = ({ config, updateConfig }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-Neural2-C');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [voicePitch, setVoicePitch] = useState<number>(1.0);
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);

  // Filter voices by selected language
  const filteredVoices = GOOGLE_VOICES.filter(voice => voice.lang === selectedLanguage);

  // Group voices by gender
  const voicesByGender = {
    male: filteredVoices.filter(v => v.gender === 'male'),
    female: filteredVoices.filter(v => v.gender === 'female'),
    neutral: filteredVoices.filter(v => v.gender === 'neutral'),
  };

  // Test voice with sample text
  const testVoice = async () => {
    setIsTestingVoice(true);
    
    try {
      // Sample texts in different languages
      const sampleTexts: Record<string, string> = {
        'en-US': 'Hello! This is a test of the selected voice. How do I sound?',
        'en-GB': 'Hello! This is a test of the selected voice. How do I sound?',
        'fa-IR': 'سلام! این یک تست از صدای انتخاب شده است. چطور به نظر می‌رسم؟',
        'es-ES': '¡Hola! Esta es una prueba de la voz seleccionada. ¿Cómo sueno?',
        'fr-FR': 'Bonjour! Ceci est un test de la voix sélectionnée. Comment est-ce que je sonne?',
        'de-DE': 'Hallo! Dies ist ein Test der ausgewählten Stimme. Wie klinge ich?',
        'ja-JP': 'こんにちは！これは選択された音声のテストです。どう聞こえますか？',
        'cmn-CN': '你好！这是所选语音的测试。我听起来怎么样？',
        'ar-XA': 'مرحبا! هذا اختبار للصوت المحدد. كيف أبدو؟',
      };

      const text = sampleTexts[selectedLanguage] || sampleTexts['en-US'];

      // Note: This is a placeholder for Google Cloud TTS API call
      // In production, you would call your backend API that uses Google Cloud TTS
      console.log('Testing voice:', {
        voice: selectedVoice,
        text,
        speed: voiceSpeed,
        pitch: voicePitch,
        volume: voiceVolume,
      });

      // For now, use Web Speech API as fallback for testing
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = voiceSpeed;
        utterance.pitch = voicePitch;
        utterance.volume = voiceVolume;
        
        // Try to find a matching voice
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => v.lang.startsWith(selectedLanguage.split('-')[0]));
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
        
        window.speechSynthesis.speak(utterance);
      }

      // Show success notification
      if (typeof window !== 'undefined' && (window as any).showSuccess) {
        (window as any).showSuccess('Voice test started! Listen to the sample.');
      }
    } catch (error) {
      console.error('Voice test failed:', error);
      if (typeof window !== 'undefined' && (window as any).showError) {
        (window as any).showError('Voice test failed. Please try again.');
      }
    } finally {
      setTimeout(() => setIsTestingVoice(false), 2000);
    }
  };

  // Save voice settings to config
  useEffect(() => {
    // Update config when voice settings change
    // This will be used by the TTS service
    const voiceConfig = {
      enabled: voiceOutputEnabled,
      voice: selectedVoice,
      language: selectedLanguage,
      speed: voiceSpeed,
      pitch: voicePitch,
      volume: voiceVolume,
    };
    
    // Save to localStorage
    try {
      localStorage.setItem('voice_output_config', JSON.stringify(voiceConfig));
    } catch (e) {
      console.warn('Failed to save voice output config:', e);
    }
  }, [voiceOutputEnabled, selectedVoice, selectedLanguage, voiceSpeed, voicePitch, voiceVolume]);

  // Load saved settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voice_output_config');
      if (saved) {
        const config = JSON.parse(saved);
        setVoiceOutputEnabled(config.enabled || false);
        setSelectedVoice(config.voice || 'en-US-Neural2-C');
        setSelectedLanguage(config.language || 'en-US');
        setVoiceSpeed(config.speed || 1.0);
        setVoicePitch(config.pitch || 1.0);
        setVoiceVolume(config.volume || 1.0);
      }
    } catch (e) {
      console.warn('Failed to load voice output config:', e);
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enable Voice Output */}
      <section className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              voiceOutputEnabled 
                ? 'bg-gradient-to-br from-purple-600 to-blue-600' 
                : 'bg-slate-300'
            }`}>
              {voiceOutputEnabled ? (
                <Volume2 className="w-6 h-6 text-white" />
              ) : (
                <VolumeX className="w-6 h-6 text-slate-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Voice Output</h3>
              <p className="text-sm text-slate-600">
                {voiceOutputEnabled 
                  ? 'AI responses will be spoken aloud' 
                  : 'Enable to hear AI responses'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setVoiceOutputEnabled(!voiceOutputEnabled)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              voiceOutputEnabled ? 'bg-purple-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                voiceOutputEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Language Selection */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Select Language
        </label>
        
        <div className="grid grid-cols-3 gap-3">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setSelectedLanguage(lang.code);
                // Auto-select first voice of new language
                const firstVoice = GOOGLE_VOICES.find(v => v.lang === lang.code);
                if (firstVoice) {
                  setSelectedVoice(firstVoice.name);
                }
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedLanguage === lang.code
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 border-purple-600 text-white shadow-lg'
                  : 'bg-white border-slate-200 hover:border-purple-400 text-slate-700'
              }`}
            >
              <div className="text-3xl mb-2">{lang.flag}</div>
              <div className="text-sm font-bold">{lang.name}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Voice Selection by Gender */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
          <User className="w-5 h-5" />
          Select Voice
        </label>

        {/* Male Voices */}
        {voicesByGender.male.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Male Voices
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {voicesByGender.male.map(voice => (
                <button
                  key={voice.name}
                  onClick={() => setSelectedVoice(voice.name)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedVoice === voice.name
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 text-white shadow-lg'
                      : 'bg-white border-slate-200 hover:border-blue-400 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">{voice.localName}</span>
                    {selectedVoice === voice.name && (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Female Voices */}
        {voicesByGender.female.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              Female Voices
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {voicesByGender.female.map(voice => (
                <button
                  key={voice.name}
                  onClick={() => setSelectedVoice(voice.name)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedVoice === voice.name
                      ? 'bg-gradient-to-br from-pink-600 to-pink-700 border-pink-600 text-white shadow-lg'
                      : 'bg-white border-slate-200 hover:border-pink-400 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">{voice.localName}</span>
                    {selectedVoice === voice.name && (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Neutral Voices */}
        {voicesByGender.neutral.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Neutral Voices
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {voicesByGender.neutral.map(voice => (
                <button
                  key={voice.name}
                  onClick={() => setSelectedVoice(voice.name)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedVoice === voice.name
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 border-purple-600 text-white shadow-lg'
                      : 'bg-white border-slate-200 hover:border-purple-400 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">{voice.localName}</span>
                    {selectedVoice === voice.name && (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Voice Customization */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Voice Customization
        </label>
        
        <div className="space-y-4 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
          {/* Speed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Speed
              </label>
              <span className="text-sm font-mono font-bold text-purple-600">{voiceSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Slow (0.5x)</span>
              <span>Normal (1.0x)</span>
              <span>Fast (2.0x)</span>
            </div>
          </div>

          {/* Pitch */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Music className="w-4 h-4" />
                Pitch
              </label>
              <span className="text-sm font-mono font-bold text-purple-600">{voicePitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voicePitch}
              onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Low (0.5)</span>
              <span>Normal (1.0)</span>
              <span>High (2.0)</span>
            </div>
          </div>

          {/* Volume */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Volume
              </label>
              <span className="text-sm font-mono font-bold text-purple-600">{Math.round(voiceVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={voiceVolume}
              onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Mute (0%)</span>
              <span>Half (50%)</span>
              <span>Max (100%)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Test Voice Button */}
      <section>
        <button
          onClick={testVoice}
          disabled={isTestingVoice || !voiceOutputEnabled}
          className="w-full px-6 py-4 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isTestingVoice ? (
            <>
              <Pause className="w-6 h-6 animate-pulse" />
              <span>Playing...</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              <span>Test Voice</span>
            </>
          )}
        </button>
        
        {!voiceOutputEnabled && (
          <p className="text-xs text-slate-500 text-center mt-2">
            Enable voice output to test
          </p>
        )}
      </section>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-900">
          <strong className="font-bold">💡 About Google Cloud Text-to-Speech:</strong>
        </p>
        <ul className="text-xs space-y-1 text-blue-800 mt-2">
          <li>• <strong>Neural2 voices:</strong> Most natural and human-like quality</li>
          <li>• <strong>Standard voices:</strong> Good quality, lower cost</li>
          <li>• <strong>WaveNet voices:</strong> Premium quality (if available)</li>
          <li>• Voice output works with all AI responses in chat</li>
          <li>• Customize speed, pitch, and volume to your preference</li>
        </ul>
      </div>
    </div>
  );
};
