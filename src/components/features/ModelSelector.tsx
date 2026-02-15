/**
 * Model Selector Component
 * Shows discovered models and allows user to select active model
 */

import React, { useState, useEffect } from 'react';
import { ModelValidationStore } from '@/services/modelValidationStore';
import { ModelInfo } from '@/services/ai/modelInfo';
import { useSettingsStore } from '@/components/Settings/settingsStore';

interface ModelSelectorProps {
  onModelChange?: (model: ModelInfo) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange }) => {
  const { settings } = useSettingsStore();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeModel, setActiveModelState] = useState<ModelInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'auto' | 'manual'>('auto');

  // Load models and active model
  useEffect(() => {
    const apiKey = settings.apiKeys.google;
    if (apiKey) {
      const discoveredModels = ModelValidationStore.getValidatedModelInfos(apiKey);
      setModels(discoveredModels);
      
      const active = ModelValidationStore.getActiveModel(apiKey);
      setActiveModelState(active);
      
      const mode = ModelValidationStore.getSelectionMode(apiKey);
      setSelectionMode(mode);
    }
  }, [settings.apiKeys.google]);

  const handleModelSelect = (model: ModelInfo) => {
    const apiKey = settings.apiKeys.google;
    if (apiKey) {
      ModelValidationStore.setActiveModel(apiKey, model);
      ModelValidationStore.setSelectionMode(apiKey, 'manual');
      setActiveModelState(model);
      setSelectionMode('manual');
      setIsOpen(false);
      
      if (onModelChange) {
        onModelChange(model);
      }
    }
  };

  const handleModeToggle = () => {
    const apiKey = settings.apiKeys.google;
    if (!apiKey) return;

    const newMode = selectionMode === 'auto' ? 'manual' : 'auto';
    ModelValidationStore.setSelectionMode(apiKey, newMode);
    setSelectionMode(newMode);

    if (newMode === 'auto') {
      // Reset to best default
      const active = ModelValidationStore.getActiveModel(apiKey);
      setActiveModelState(active);
    }
  };

  const getFamilyColor = (family: string) => {
    switch (family) {
      case 'flash':
        return 'from-blue-500 to-blue-600';
      case 'pro':
        return 'from-purple-500 to-purple-600';
      case 'normal':
        return 'from-green-500 to-green-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getFamilyBadge = (family: string) => {
    switch (family) {
      case 'flash':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case 'pro':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
      case 'normal':
        return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300';
    }
  };

  if (!activeModel || models.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-900/20">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          No models available. Please add Google API key in settings.
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selected Model Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getFamilyColor(activeModel.family)} text-white shadow-md`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                {activeModel.label}
              </span>
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getFamilyBadge(activeModel.family)}`}>
                {activeModel.family}
              </span>
              {selectionMode === 'auto' && (
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Auto
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              {activeModel.maxInputTokens && (
                <span>{(activeModel.maxInputTokens / 1000).toFixed(0)}K input tokens</span>
              )}
              {activeModel.responseTime && (
                <span className="ml-2">~{activeModel.responseTime}ms</span>
              )}
            </div>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          {/* Mode Toggle */}
          <div className="border-b border-gray-200 p-3 dark:border-gray-800">
            <button
              onClick={handleModeToggle}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selection Mode
                </span>
              </div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {selectionMode === 'auto' ? 'Auto (Best)' : 'Manual'}
              </span>
            </button>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {selectionMode === 'auto'
                ? 'Automatically selects the best available model'
                : 'You manually select which model to use'}
            </p>
          </div>

          {/* Model List */}
          <div className="p-2">
            {models.map((model) => {
              const isActive = model.id === activeModel.id;
              return (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all ${
                    isActive
                      ? 'bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-900/30 dark:ring-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getFamilyColor(model.family)} text-white shadow-sm`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                        {model.label}
                      </span>
                      <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${getFamilyBadge(model.family)}`}>
                        {model.family}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                      {model.maxInputTokens && (
                        <span>{(model.maxInputTokens / 1000).toFixed(0)}K tokens</span>
                      )}
                      {model.responseTime && (
                        <span>~{model.responseTime}ms</span>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Models Count */}
          <div className="border-t border-gray-200 p-3 dark:border-gray-800">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {models.length} model{models.length !== 1 ? 's' : ''} available
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
