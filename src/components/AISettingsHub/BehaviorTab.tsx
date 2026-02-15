/**
 * Behavior Tab - Agent Persona & Preferences
 * 
 * Features:
 * - Agent persona selection (Professional, Mentor, Scientist, Designer)
 * - Response style configuration
 * - Code style preferences
 * - Voice selection for each persona (gender, accent, speed, pitch)
 * - Auto-format toggle
 */

import React, { useState } from 'react';
import { Briefcase, Heart, GraduationCap, Palette, CheckCircle2, Code2, Volume2, Mic, User, Globe } from 'lucide-react';
import { AIConfig } from '@/components/AISettingsHub/types';

interface BehaviorTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

// Available voices for selection
const AVAILABLE_VOICES = [
  // Male Voices
  { id: 'male-us-1', name: 'David', gender: 'Male', accent: 'American', description: 'Professional and clear' },
  { id: 'male-us-2', name: 'Michael', gender: 'Male', accent: 'American', description: 'Warm and friendly' },
  { id: 'male-uk-1', name: 'James', gender: 'Male', accent: 'British', description: 'Sophisticated and formal' },
  { id: 'male-au-1', name: 'Oliver', gender: 'Male', accent: 'Australian', description: 'Casual and energetic' },
  
  // Female Voices
  { id: 'female-us-1', name: 'Sarah', gender: 'Female', accent: 'American', description: 'Clear and confident' },
  { id: 'female-us-2', name: 'Emma', gender: 'Female', accent: 'American', description: 'Friendly and supportive' },
  { id: 'female-uk-1', name: 'Emily', gender: 'Female', accent: 'British', description: 'Elegant and precise' },
  { id: 'female-fr-1', name: 'Sophie', gender: 'Female', accent: 'French', description: 'Creative and expressive' },
  
  // Neutral/AI Voices
  { id: 'ai-neutral-1', name: 'Nova', gender: 'Neutral', accent: 'AI', description: 'Modern AI voice' },
  { id: 'ai-neutral-2', name: 'Echo', gender: 'Neutral', accent: 'AI', description: 'Futuristic and smooth' },
];

interface BehaviorTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

const AGENT_PERSONAS = [
  {
    id: 'Professional',
    name: 'Senior Engineer',
    description: 'Production-ready code with strict adherence to best practices and minimal chatter.',
    icon: Briefcase,
    color: 'purple',
    traits: ['Concise', 'Best Practices', 'Production-Ready', 'Efficient'],
  },
  {
    id: 'Friendly',
    name: 'Helpful Mentor',
    description: 'Patient explanations and guided problem-solving. Perfect for learning new concepts.',
    icon: Heart,
    color: 'rose',
    traits: ['Patient', 'Explanatory', 'Educational', 'Supportive'],
  },
  {
    id: 'Academic',
    name: 'Research Scientist',
    description: 'Deep theoretical analysis, citation of algorithms, and focus on formal correctness.',
    icon: GraduationCap,
    color: 'amber',
    traits: ['Analytical', 'Theoretical', 'Formal', 'Detailed'],
  },
  {
    id: 'Creative',
    name: 'Product Designer',
    description: 'Focus on UX/UI, creative solutions, and aesthetically pleasing code structures.',
    icon: Palette,
    color: 'indigo',
    traits: ['Creative', 'UX-Focused', 'Aesthetic', 'Innovative'],
  },
];

const RESPONSE_STYLES = [
  { value: 'Concise', label: 'Concise', description: 'Brief, to-the-point responses' },
  { value: 'Detailed', label: 'Detailed', description: 'Comprehensive explanations' },
  { value: 'Balanced', label: 'Balanced', description: 'Mix of brevity and detail' },
];

const CODE_STYLES = [
  { value: 'Modern ES6+', label: 'Modern ES6+', description: 'Latest JavaScript features' },
  { value: 'TypeScript', label: 'TypeScript', description: 'Type-safe code' },
  { value: 'Functional', label: 'Functional', description: 'Functional programming style' },
  { value: 'Object-Oriented', label: 'Object-Oriented', description: 'OOP patterns' },
];

export const BehaviorTab: React.FC<BehaviorTabProps> = ({ config, updateConfig }) => {
  const [selectedVoice, setSelectedVoice] = useState(config.voiceModel || 'male-us-1');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Agent Persona Selection */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Agent Persona
          <span className="ml-2 text-xs font-normal text-slate-500 normal-case">Choose your AI assistant's personality</span>
        </label>
        
        <div className="grid grid-cols-2 gap-4">
          {AGENT_PERSONAS.map(persona => {
            const Icon = persona.icon;
            const isSelected = config.persona === persona.id;
            
            return (
              <button
                key={persona.id}
                onClick={() => updateConfig('persona', persona.id)}
                className={`p-6 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                  isSelected
                    ? `bg-gradient-to-br from-${persona.color}-600 to-${persona.color}-700 border-${persona.color}-600 text-white shadow-lg`
                    : `bg-white border-slate-200 hover:border-${persona.color}-400 text-slate-700`
                }`}
              >
                {/* Background Pattern */}
                {isSelected && (
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }} />
                  </div>
                )}
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-white/20' : `bg-${persona.color}-50`
                    }`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : `text-${persona.color}-600`}`} />
                    </div>
                    
                    {isSelected && (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2">{persona.name}</h3>
                  <p className={`text-sm mb-3 ${isSelected ? 'opacity-90' : 'text-slate-600'}`}>
                    {persona.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {persona.traits.map(trait => (
                      <span
                        key={trait}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : `bg-${persona.color}-100 text-${persona.color}-700`
                        }`}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Response Style */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Response Style
        </label>
        
        <div className="grid grid-cols-3 gap-4">
          {RESPONSE_STYLES.map(style => (
            <button
              key={style.value}
              onClick={() => updateConfig('responseStyle', style.value)}
              className={`p-4 rounded-xl border-2 transition-all ${
                config.responseStyle === style.value
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 text-white shadow-lg'
                  : 'bg-white border-slate-200 hover:border-blue-400 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">{style.label}</span>
                {config.responseStyle === style.value && (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <p className={`text-xs ${config.responseStyle === style.value ? 'opacity-90' : 'text-slate-500'}`}>
                {style.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Code Style */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Code Style Preference
        </label>
        
        <div className="grid grid-cols-2 gap-4">
          {CODE_STYLES.map(style => (
            <button
              key={style.value}
              onClick={() => updateConfig('codeStyle', style.value)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                config.codeStyle === style.value
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-600 text-white shadow-lg'
                  : 'bg-white border-slate-200 hover:border-emerald-400 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  <span className="font-bold">{style.label}</span>
                </div>
                {config.codeStyle === style.value && (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <p className={`text-xs ${config.codeStyle === style.value ? 'opacity-90' : 'text-slate-500'}`}>
                {style.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Auto-Format Toggle */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-1">Auto-Format Code</label>
            <p className="text-xs text-slate-600">
              Automatically format generated code using Prettier
            </p>
          </div>
          <button
            onClick={() => updateConfig('autoFormat', !config.autoFormat)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              config.autoFormat ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                config.autoFormat ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Voice Settings for Selected Persona */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Voice Settings
          <span className="ml-2 text-xs font-normal text-slate-500 normal-case">Choose AI voice for all personas</span>
        </label>
        
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 space-y-4">
          
          {/* Voice Enable Toggle */}
          <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-indigo-100">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1">Enable Voice Output</label>
              <p className="text-xs text-slate-600">
                AI will speak responses using selected voice
              </p>
            </div>
            <button
              onClick={() => updateConfig('voiceEnabled', !config.voiceEnabled)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                config.voiceEnabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                  config.voiceEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Voice Selection */}
          {config.voiceEnabled && (
            <div className="bg-white rounded-lg p-4 border border-indigo-100 space-y-4 animate-fade-in">
              <label className="text-sm font-bold text-slate-700 block">Select Voice</label>
              
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_VOICES.map(voice => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      setSelectedVoice(voice.id);
                      updateConfig('voiceModel', voice.id);
                    }}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      selectedVoice === voice.id
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                        : 'bg-slate-50 border-slate-200 hover:border-indigo-400 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4" />
                      <span className="font-bold text-sm">{voice.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs opacity-90">
                      <span>{voice.gender}</span>
                      <span>•</span>
                      <span>{voice.accent}</span>
                    </div>
                    <p className={`text-xs mt-1 ${selectedVoice === voice.id ? 'opacity-90' : 'text-slate-500'}`}>
                      {voice.description}
                    </p>
                  </button>
                ))}
              </div>
              
              {/* Voice Customization */}
              <div className="space-y-3 pt-3 border-t border-indigo-100">
                <label className="text-sm font-bold text-slate-700 block">Customize Voice</label>
                
                {/* Speed Control */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-600">Speed</span>
                    <span className="text-xs font-bold text-slate-900">{voiceSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Slow</span>
                    <span>Normal</span>
                    <span>Fast</span>
                  </div>
                </div>
                
                {/* Pitch Control */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-600">Pitch</span>
                    <span className="text-xs font-bold text-slate-900">{voicePitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voicePitch}
                    onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Low</span>
                    <span>Normal</span>
                    <span>High</span>
                  </div>
                </div>
                
                {/* Test Voice Button */}
                <button
                  onClick={() => {
                    // Test voice functionality
                    if ('speechSynthesis' in window) {
                      const utterance = new SpeechSynthesisUtterance('Hello! This is how I will sound.');
                      utterance.rate = voiceSpeed;
                      utterance.pitch = voicePitch;
                      window.speechSynthesis.speak(utterance);
                    }
                  }}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Volume2 className="w-4 h-4" />
                  Test Voice
                </button>
              </div>
            </div>
          )}
          
          {/* Info Box */}
          <div className="bg-indigo-100 border border-indigo-200 rounded-lg p-4">
            <p className="text-xs text-indigo-900">
              <strong>💡 Tip:</strong> The selected voice will be used for all AI personas. 
              You can customize speed and pitch to match your preference!
            </p>
          </div>
        </div>
      </section>

      {/* Preview Box */}
      <section className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Current Configuration Preview
        </h3>
        
        <div className="bg-white rounded-lg p-4 border border-purple-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Persona:</span>
            <span className="text-sm font-bold text-slate-900">{config.persona}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Response Style:</span>
            <span className="text-sm font-bold text-slate-900">{config.responseStyle}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Code Style:</span>
            <span className="text-sm font-bold text-slate-900">{config.codeStyle}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Voice Output:</span>
            <span className={`text-sm font-bold ${config.voiceEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>
              {config.voiceEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Auto-Format:</span>
            <span className={`text-sm font-bold ${config.autoFormat ? 'text-emerald-600' : 'text-slate-400'}`}>
              {config.autoFormat ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
        
        <p className="text-xs text-slate-600 mt-4">
          These settings will be applied to all AI interactions. You can change them anytime.
        </p>
      </section>
    </div>
  );
};
