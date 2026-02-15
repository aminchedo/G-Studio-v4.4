/**
 * Models Tab - Model Selection & Parameters
 * 
 * Features:
 * - Auto/Manual selection mode
 * - Per-agent model assignment (Manual mode)
 * - Model family statistics
 * - Active model display
 * - Temperature, Max Tokens, Top-P sliders
 * - Streaming toggle
 * - Model performance metrics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Brain, Gauge, CheckCircle2, Clock, TrendingUp,
  Settings, Info, Briefcase, Heart, GraduationCap, Palette, User
} from 'lucide-react';
import { AIConfig } from '@/components/AISettingsHub/types';
import { ModelSelectionService } from '@/services/modelSelectionService';
import { ModelValidationStore } from '@/services/modelValidationStore';
import { ModelInfo } from '@/services/modelInfo';

interface ModelsTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

// Agent personas for model assignment
const AGENT_PERSONAS = [
  { id: 'Professional', name: 'Senior Engineer', icon: Briefcase, color: 'purple' },
  { id: 'Friendly', name: 'Helpful Mentor', icon: Heart, color: 'rose' },
  { id: 'Academic', name: 'Research Scientist', icon: GraduationCap, color: 'amber' },
  { id: 'Creative', name: 'Product Designer', icon: Palette, color: 'indigo' },
];

interface ModelsTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

export const ModelsTab: React.FC<ModelsTabProps> = ({ config, updateConfig }) => {
  const [validatedModels, setValidatedModels] = useState<ModelInfo[]>([]);
  const [activeModel, setActiveModel] = useState<ModelInfo | null>(null);
  const [modelsByFamily, setModelsByFamily] = useState<{
    flash: ModelInfo[];
    pro: ModelInfo[];
    normal: ModelInfo[];
    all: ModelInfo[];
  }>({ flash: [], pro: [], normal: [], all: [] });
  
  // Per-agent model assignments (for manual mode)
  const [agentModels, setAgentModels] = useState<Record<string, string>>({
    'Professional': '',
    'Friendly': '',
    'Academic': '',
    'Creative': '',
  });

  // Load models from store
  useEffect(() => {
    if (!config.apiKey) return;

    const models = ModelValidationStore.getValidatedModelInfos(config.apiKey);
    setValidatedModels(models);

    const families = ModelSelectionService.getModelsByFamily(config.apiKey);
    setModelsByFamily(families);

    const active = ModelValidationStore.getActiveModel(config.apiKey);
    setActiveModel(active);
  }, [config.apiKey]);

  // Load saved agent model assignments from localStorage
  useEffect(() => {
    const savedModels: Record<string, string> = {};
    AGENT_PERSONAS.forEach(agent => {
      const saved = localStorage.getItem(`agent_model_${agent.id}`);
      if (saved) {
        savedModels[agent.id] = saved;
      }
    });
    if (Object.keys(savedModels).length > 0) {
      setAgentModels(prev => ({ ...prev, ...savedModels }));
    }
  }, []);

  // Handle selection mode change
  const handleSelectionModeChange = (mode: 'auto' | 'manual') => {
    if (!config.apiKey) return;
    
    ModelSelectionService.setSelectionMode(config.apiKey, mode);
    updateConfig('selectionMode', mode);

    // Revalidate to select best model in auto mode
    if (mode === 'auto') {
      ModelSelectionService.revalidateAgainstStore(config.apiKey);
      const active = ModelValidationStore.getActiveModel(config.apiKey);
      setActiveModel(active);
    }
  };

  // Handle manual model selection
  const handleModelSelect = (modelId: string) => {
    if (!config.apiKey || config.selectionMode === 'auto') return;

    ModelSelectionService.setManualModel(config.apiKey, modelId);
    updateConfig('selectedModel', modelId);

    const active = ModelValidationStore.getActiveModel(config.apiKey);
    setActiveModel(active);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Selection Mode */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Selection Mode
        </label>
        
        <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl">
          <button
            onClick={() => handleSelectionModeChange('auto')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              config.selectionMode === 'auto'
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 border-purple-600 text-white shadow-lg'
                : 'bg-white border-slate-300 text-slate-700 hover:border-purple-400'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5" />
              <span className="font-bold">Auto Mode</span>
            </div>
            <p className="text-xs opacity-90">
              System selects the best model automatically based on performance and availability
            </p>
          </button>

          <button
            onClick={() => handleSelectionModeChange('manual')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              config.selectionMode === 'manual'
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 border-purple-600 text-white shadow-lg'
                : 'bg-white border-slate-300 text-slate-700 hover:border-purple-400'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Settings className="w-5 h-5" />
              <span className="font-bold">Manual Mode</span>
            </div>
            <p className="text-xs opacity-90">
              You choose which model to use for each request
            </p>
          </button>
        </div>
      </section>

      {/* Active Model Display */}
      {activeModel && (
        <section className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-slate-600 uppercase tracking-wide font-bold">Active Model</div>
                <div className="text-lg font-bold text-slate-900">{activeModel.label}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                activeModel.family === 'flash' ? 'bg-blue-100 text-blue-700' :
                activeModel.family === 'pro' ? 'bg-purple-100 text-purple-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {activeModel.family.toUpperCase()}
              </span>
              
              {config.selectionMode === 'auto' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  BEST
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <div className="text-xs text-slate-600 mb-1">Response Time</div>
              <div className="text-xl font-bold text-slate-900">
                {(activeModel as any).responseTime || '--'}ms
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <div className="text-xs text-slate-600 mb-1">Input Limit</div>
              <div className="text-xl font-bold text-slate-900">
                {activeModel.inputTokenLimit ? `${(activeModel.inputTokenLimit / 1000).toFixed(0)}K` : '--'}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <div className="text-xs text-slate-600 mb-1">Output Limit</div>
              <div className="text-xl font-bold text-slate-900">
                {activeModel.outputTokenLimit ? `${(activeModel.outputTokenLimit / 1000).toFixed(0)}K` : '--'}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Per-Agent Model Assignment (Manual Mode Only) */}
      {config.selectionMode === 'manual' && validatedModels.length > 0 && (
        <section>
          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
            <User className="w-5 h-5" />
            Assign Models to Agents
            <span className="ml-2 text-xs font-normal text-slate-500 normal-case">Choose which model each persona uses</span>
          </label>
          
          <div className="space-y-4">
            {AGENT_PERSONAS.map(agent => {
              const Icon = agent.icon;
              const assignedModelId = agentModels[agent.id];
              const assignedModel = validatedModels.find(m => m.id === assignedModelId);
              
              return (
                <div key={agent.id} className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-${agent.color}-600 to-${agent.color}-700 flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{agent.name}</h4>
                      <p className="text-xs text-slate-600">{agent.id} Persona</p>
                    </div>
                    {assignedModel && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        assignedModel.family === 'flash' ? 'bg-blue-100 text-blue-700' :
                        assignedModel.family === 'pro' ? 'bg-purple-100 text-purple-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {assignedModel.family.toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {validatedModels.slice(0, 6).map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setAgentModels(prev => ({ ...prev, [agent.id]: model.id }));
                          localStorage.setItem(`agent_model_${agent.id}`, model.id);
                        }}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          assignedModelId === model.id
                            ? `bg-gradient-to-br from-${agent.color}-600 to-${agent.color}-700 border-${agent.color}-600 text-white shadow-lg`
                            : 'bg-white border-slate-200 hover:border-slate-400 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm truncate">{model.label}</span>
                          {assignedModelId === model.id && (
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-90">
                          <span className="capitalize">{model.family}</span>
                          {model.inputTokenLimit && (
                            <>
                              <span>•</span>
                              <span>{(model.inputTokenLimit / 1000).toFixed(0)}K</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-4">
            <p className="text-xs text-blue-900">
              <strong>💡 Tip:</strong> Assign faster models (Flash) to simple tasks and powerful models (Pro) to complex reasoning. 
              Each agent will use its assigned model for all interactions.
            </p>
          </div>
        </section>
      )}

      {/* Model Family Statistics */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Available Models by Family
        </label>
        
        <div className="grid grid-cols-4 gap-4">
          {(['flash', 'pro', 'normal', 'all'] as const).map(family => {
            const count = modelsByFamily[family]?.length || 0;
            const Icon = family === 'flash' ? Gauge : family === 'pro' ? Brain : family === 'all' ? TrendingUp : Zap;
            const color = family === 'flash' ? 'blue' : family === 'pro' ? 'purple' : family === 'normal' ? 'emerald' : 'slate';
            
            return (
              <div key={family} className={`bg-gradient-to-br from-${color}-50 to-${color}-100 border-2 border-${color}-200 rounded-xl p-4 text-center`}>
                <Icon className={`w-8 h-8 text-${color}-600 mx-auto mb-2`} />
                <div className="text-2xl font-bold text-slate-900">{count}</div>
                <div className="text-xs text-slate-600 uppercase tracking-wide font-bold mt-1">
                  {family === 'all' ? 'Total' : family}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Manual Model Selection */}
      {config.selectionMode === 'manual' && validatedModels.length > 0 && (
        <section>
          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
            Select Model
          </label>
          
          <div className="space-y-2">
            {validatedModels.map(model => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  activeModel?.id === model.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-600 text-white shadow-lg'
                    : 'bg-white border-slate-200 hover:border-purple-400 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activeModel?.id === model.id ? 'bg-white/20' : 'bg-slate-100'
                    }`}>
                      {model.family === 'flash' ? <Gauge className="w-5 h-5" /> :
                       model.family === 'pro' ? <Brain className="w-5 h-5" /> :
                       <Zap className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-bold">{model.label}</div>
                      <div className={`text-xs ${activeModel?.id === model.id ? 'opacity-90' : 'text-slate-500'}`}>
                        {model.family.toUpperCase()} • {(model as any).responseTime || '--'}ms
                      </div>
                    </div>
                  </div>
                  
                  {activeModel?.id === model.id && (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Model Parameters */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          Model Parameters
        </label>
        
        <div className="space-y-4 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Temperature</label>
              <span className="text-sm font-mono font-bold text-purple-600">{config.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Precise (0)</span>
              <span>Balanced (1)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Max Tokens</label>
              <span className="text-sm font-mono font-bold text-purple-600">{config.maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="32000"
              step="256"
              value={config.maxTokens}
              onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>256</span>
              <span>16K</span>
              <span>32K</span>
            </div>
          </div>

          {/* Top P */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Top P</label>
              <span className="text-sm font-mono font-bold text-purple-600">{config.topP}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.topP}
              onChange={(e) => updateConfig('topP', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Focused (0)</span>
              <span>Diverse (1)</span>
            </div>
          </div>

          {/* Streaming Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-300">
            <div>
              <label className="text-sm font-medium text-slate-700">Enable Streaming</label>
              <p className="text-xs text-slate-500 mt-1">Stream responses in real-time for better UX</p>
            </div>
            <button
              onClick={() => updateConfig('enableStreaming', !config.enableStreaming)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enableStreaming ? 'bg-purple-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enableStreaming ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-bold mb-1">Model Selection Tips</p>
          <ul className="text-xs space-y-1 text-blue-800">
            <li>• <strong>Auto Mode:</strong> Best for most use cases - system picks optimal model</li>
            <li>• <strong>Manual Mode:</strong> Choose specific models for testing or special requirements</li>
            <li>• <strong>Temperature:</strong> Lower = more focused, Higher = more creative</li>
            <li>• <strong>Max Tokens:</strong> Limits response length (higher = longer responses)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
