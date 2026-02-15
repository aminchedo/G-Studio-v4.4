/**
 * useModelSelection - Refactored from class ModelSelectionService
 * 
 * Provides AI model selection and management via React hooks
 * Supports multiple providers and model filtering
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSecureStorage } from './useSecureStorage';

// Types
export interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  provider: 'gemini' | 'local' | 'openai' | 'anthropic';
  family: string;
  tier: 'pro' | 'flash' | 'lite' | 'standard';
  capabilities: ModelCapability[];
  maxTokens: {
    input: number;
    output: number;
  };
  costPer1kTokens?: {
    input: number;
    output: number;
  };
  isAvailable: boolean;
  isBeta?: boolean;
  description?: string;
}

export type ModelCapability = 
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'streaming'
  | 'function-calling'
  | 'code-execution'
  | 'grounding';

export interface ModelFilter {
  provider?: string;
  tier?: string;
  capabilities?: ModelCapability[];
  searchQuery?: string;
  onlyAvailable?: boolean;
}

export interface ModelSelectionState {
  selectedModel: string;
  fallbackModel: string | null;
  recentModels: string[];
  favoriteModels: string[];
}

export interface UseModelSelectionReturn {
  // State
  selectedModel: ModelInfo | null;
  availableModels: ModelInfo[];
  filteredModels: ModelInfo[];
  recentModels: ModelInfo[];
  favoriteModels: ModelInfo[];
  isLoading: boolean;
  error: Error | null;
  // Methods
  selectModel: (modelId: string) => void;
  setFallbackModel: (modelId: string | null) => void;
  toggleFavorite: (modelId: string) => void;
  applyFilter: (filter: ModelFilter) => void;
  clearFilter: () => void;
  refreshModels: () => Promise<void>;
  getModelById: (modelId: string) => ModelInfo | undefined;
  // Recommendations
  getRecommendedModel: (criteria: 'speed' | 'quality' | 'balance' | 'cost') => ModelInfo | null;
}

// Default models configuration
const DEFAULT_MODELS: ModelInfo[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    family: '2.0',
    tier: 'flash',
    capabilities: ['text', 'image', 'streaming', 'function-calling'],
    maxTokens: { input: 1000000, output: 8192 },
    isAvailable: true,
    description: 'Fast and efficient for most tasks',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'gemini-2.0-flash-lite',
    displayName: 'Gemini 2.0 Flash Lite',
    provider: 'gemini',
    family: '2.0',
    tier: 'lite',
    capabilities: ['text', 'streaming'],
    maxTokens: { input: 1000000, output: 8192 },
    isAvailable: true,
    description: 'Lightweight and fastest response times',
  },
  {
    id: 'gemini-1.5-flash-latest',
    name: 'gemini-1.5-flash-latest',
    displayName: 'Gemini 1.5 Flash',
    provider: 'gemini',
    family: '1.5',
    tier: 'flash',
    capabilities: ['text', 'image', 'video', 'audio', 'streaming', 'function-calling'],
    maxTokens: { input: 1000000, output: 8192 },
    isAvailable: true,
    description: 'Balanced performance and capability',
  },
  {
    id: 'gemini-1.5-pro-latest',
    name: 'gemini-1.5-pro-latest',
    displayName: 'Gemini 1.5 Pro',
    provider: 'gemini',
    family: '1.5',
    tier: 'pro',
    capabilities: ['text', 'image', 'video', 'audio', 'streaming', 'function-calling', 'code-execution'],
    maxTokens: { input: 2000000, output: 8192 },
    isAvailable: true,
    description: 'Most capable for complex reasoning',
  },
  {
    id: 'gemini-2.5-pro-preview',
    name: 'gemini-2.5-pro-preview',
    displayName: 'Gemini 2.5 Pro (Preview)',
    provider: 'gemini',
    family: '2.5',
    tier: 'pro',
    capabilities: ['text', 'image', 'video', 'audio', 'streaming', 'function-calling', 'code-execution', 'grounding'],
    maxTokens: { input: 2000000, output: 8192 },
    isAvailable: true,
    isBeta: true,
    description: 'Latest and most advanced features',
  },
  {
    id: 'gemini-2.5-flash-preview',
    name: 'gemini-2.5-flash-preview',
    displayName: 'Gemini 2.5 Flash (Preview)',
    provider: 'gemini',
    family: '2.5',
    tier: 'flash',
    capabilities: ['text', 'image', 'streaming', 'function-calling'],
    maxTokens: { input: 1000000, output: 8192 },
    isAvailable: true,
    isBeta: true,
    description: 'Fast with latest improvements',
  },
];

const STORAGE_KEY = 'model_selection_state';

const DEFAULT_STATE: ModelSelectionState = {
  selectedModel: 'gemini-1.5-flash-latest',
  fallbackModel: 'gemini-2.0-flash-lite',
  recentModels: [],
  favoriteModels: [],
};

/**
 * Hook for model selection and management
 */
export function useModelSelection(
  customModels?: ModelInfo[]
): UseModelSelectionReturn {
  // Persisted state
  const {
    value: state,
    setValue: setState,
    isLoading: isStorageLoading,
  } = useSecureStorage<ModelSelectionState>(STORAGE_KEY, DEFAULT_STATE);

  // Local state
  const [models, setModels] = useState<ModelInfo[]>(customModels || DEFAULT_MODELS);
  const [filter, setFilter] = useState<ModelFilter>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Merge custom models with defaults
  useEffect(() => {
    if (customModels) {
      const merged = [...DEFAULT_MODELS];
      customModels.forEach((custom) => {
        const existingIndex = merged.findIndex((m) => m.id === custom.id);
        if (existingIndex >= 0) {
          merged[existingIndex] = { ...merged[existingIndex], ...custom };
        } else {
          merged.push(custom);
        }
      });
      setModels(merged);
    }
  }, [customModels]);

  // Get model by ID
  const getModelById = useCallback(
    (modelId: string): ModelInfo | undefined => {
      return models.find((m) => m.id === modelId || m.name === modelId);
    },
    [models]
  );

  // Selected model object
  const selectedModel = useMemo(
    () => getModelById(state.selectedModel) || null,
    [state.selectedModel, getModelById]
  );

  // Available models (only those marked as available)
  const availableModels = useMemo(
    () => models.filter((m) => m.isAvailable),
    [models]
  );

  // Filtered models
  const filteredModels = useMemo(() => {
    let result = filter.onlyAvailable !== false ? availableModels : models;

    if (filter.provider) {
      result = result.filter((m) => m.provider === filter.provider);
    }

    if (filter.tier) {
      result = result.filter((m) => m.tier === filter.tier);
    }

    if (filter.capabilities?.length) {
      result = result.filter((m) =>
        filter.capabilities!.every((cap) => m.capabilities.includes(cap))
      );
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.displayName.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [models, availableModels, filter]);

  // Recent models
  const recentModels = useMemo(
    () => state.recentModels.map(getModelById).filter(Boolean) as ModelInfo[],
    [state.recentModels, getModelById]
  );

  // Favorite models
  const favoriteModels = useMemo(
    () => state.favoriteModels.map(getModelById).filter(Boolean) as ModelInfo[],
    [state.favoriteModels, getModelById]
  );

  // Select model
  const selectModel = useCallback(
    (modelId: string) => {
      const model = getModelById(modelId);
      if (!model) {
        console.warn(`[ModelSelection] Model not found: ${modelId}`);
        return;
      }

      setState({
        ...state,
        selectedModel: modelId,
        recentModels: [
          modelId,
          ...state.recentModels.filter((id) => id !== modelId),
        ].slice(0, 10),
      });
    },
    [state, setState, getModelById]
  );

  // Set fallback model
  const setFallbackModel = useCallback(
    (modelId: string | null) => {
      setState({
        ...state,
        fallbackModel: modelId,
      });
    },
    [state, setState]
  );

  // Toggle favorite
  const toggleFavorite = useCallback(
    (modelId: string) => {
      const isFavorite = state.favoriteModels.includes(modelId);
      setState({
        ...state,
        favoriteModels: isFavorite
          ? state.favoriteModels.filter((id) => id !== modelId)
          : [...state.favoriteModels, modelId],
      });
    },
    [state, setState]
  );

  // Apply filter
  const applyFilter = useCallback((newFilter: ModelFilter) => {
    setFilter(newFilter);
  }, []);

  // Clear filter
  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  // Refresh models (could fetch from API)
  const refreshModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, this would fetch from an API
      // For now, just reset to defaults
      setModels(customModels || DEFAULT_MODELS);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [customModels]);

  // Get recommended model
  const getRecommendedModel = useCallback(
    (criteria: 'speed' | 'quality' | 'balance' | 'cost'): ModelInfo | null => {
      const available = availableModels;
      if (available.length === 0) return null;

      switch (criteria) {
        case 'speed':
          return (
            available.find((m) => m.tier === 'lite') ||
            available.find((m) => m.tier === 'flash') ||
            available[0]
          );
        case 'quality':
          return (
            available.find((m) => m.tier === 'pro' && m.family === '2.5') ||
            available.find((m) => m.tier === 'pro') ||
            available[0]
          );
        case 'balance':
          return (
            available.find((m) => m.tier === 'flash' && m.family >= '2.0') ||
            available.find((m) => m.tier === 'flash') ||
            available[0]
          );
        case 'cost':
          return (
            available.find((m) => m.tier === 'lite') ||
            available.find((m) => m.tier === 'flash') ||
            available[0]
          );
        default:
          return available[0];
      }
    },
    [availableModels]
  );

  return {
    selectedModel,
    availableModels,
    filteredModels,
    recentModels,
    favoriteModels,
    isLoading: isLoading || isStorageLoading,
    error,
    selectModel,
    setFallbackModel,
    toggleFavorite,
    applyFilter,
    clearFilter,
    refreshModels,
    getModelById,
    getRecommendedModel,
  };
}

// Context for app-wide model selection
import React, { createContext, useContext, ReactNode } from 'react';

const ModelSelectionContext = createContext<UseModelSelectionReturn | null>(null);

interface ModelSelectionProviderProps {
  children: ReactNode;
  customModels?: ModelInfo[];
}

export const ModelSelectionProvider: React.FC<ModelSelectionProviderProps> = ({
  children,
  customModels,
}) => {
  const modelSelection = useModelSelection(customModels);

  return (
    <ModelSelectionContext.Provider value={modelSelection}>
      {children}
    </ModelSelectionContext.Provider>
  );
};

export const useModelSelectionContext = (): UseModelSelectionReturn => {
  const context = useContext(ModelSelectionContext);
  if (!context) {
    throw new Error(
      'useModelSelectionContext must be used within a ModelSelectionProvider'
    );
  }
  return context;
};

export default useModelSelection;
